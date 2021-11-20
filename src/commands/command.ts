import mri from 'mri';
import Validator, { ValidationError } from 'fastest-validator';

import { ICommandOptions, IBotMessage, ICommandContext, IBotClient } from '../interfaces';
import { SensumSchemaError } from '../errors';

const validator = new Validator();

/**
 * Represents a command.
 * @example
 * module.exports = new Command({
 *   name: 'hello',
 *   description: 'Says hello back to you.',
 *   category: 'greeting',
 *   aliases: ['hi'],
 *   run(message, args, context) {
 *     message.channel.send(`Hello ${message.author}!`);
 *   },
 * });
 */
export class Command<T = { [key: string]: any }> implements ICommandOptions<T> {
  name: ICommandOptions<T>['name'] = '';
  description: ICommandOptions<T>['description'] = '';
  usage: ICommandOptions<T>['usage'] = '';
  run: ICommandOptions<T>['run'] = () => {};
  aliases: ICommandOptions<T>['aliases'] = [];
  permission: ICommandOptions<T>['permission'] = 0;
  cooldown: ICommandOptions<T>['cooldown'] = 3;
  runIn: ICommandOptions<T>['runIn'] = ['text'];
  hidden: ICommandOptions<T>['hidden'] = false;
  args: ICommandOptions<T>['args'] = {};
  examples: ICommandOptions<T>['examples'] = [];
  category: ICommandOptions<T>['category'] = 'other';
  delete: ICommandOptions<T>['delete'] = false;
  nsfwOnly: ICommandOptions<T>['nsfwOnly'] = false;
  init: ICommandOptions<T>['init'] = () => {};
  shutdown: ICommandOptions<T>['shutdown'] = () => {};

  /**
   * @param {ICommandOptions<T>} options={} The options for this command.
   */
  constructor(options: ICommandOptions<T>) {
    if (!('name' in options)) {
      throw new SensumSchemaError('A command must have a name.');
    }
    if (!('description' in options)) {
      throw new SensumSchemaError('A command must have a description.');
    }
    if (!('run' in options)) {
      throw new SensumSchemaError('A command must have a handler function.');
    }
    if (options.args) {
      try {
        validator.validate({}, options.args);
      } catch (err) {
        throw new SensumSchemaError(
          `Looks like you have a problem with your args schema in the "${options.name}" command. You can read more about how the validator works here: https://github.com/icebob/fastest-validator`,
        );
      }
    }
    Object.assign(this, options);
  }
}

/**
 * Splits a command call into the command name and its arguments.
 * @param {string} content The message's content.
 * @param {string} prefix The prefix used.
 * @example
 * splitArguments('!hello there friend', '!'); -> {command: 'hello', args: ['there', 'friend']}
 */
export const splitCommandAndArguments = (
  content: string,
  prefix: string,
): { command: string | undefined; args: string[] } => {
  const args = content
    .trim()
    .substr(prefix.length)
    // collapse spaces
    .replace(/(\s\s+|\n)/g, ' ')
    .split(/ +/);
  const command = args.shift()?.trim().toLowerCase();
  return {
    command,
    args,
  };
};

export const buildCommandContext = (
  bot: IBotClient,
  message: IBotMessage,
  prefix: string,
): ICommandContext => {
  const context = {} as ICommandContext;

  // Known props
  context.isDM = message.channel.type === 'DM';
  context.userId = message.author.id;
  context.tag = message.author.tag;
  context.username = message.author.username;
  context.nickname = message.member?.nickname ?? null;
  context.guild = message.guild;
  context.message = message;
  context.time = new Date();
  context.permLevel = bot.permlevel(message);

  const { command, args } = splitCommandAndArguments(message.content, prefix);

  let cmd = bot.commands.get(command!);
  let isAlias = false;
  if (!cmd && bot.aliases.has(command!)) {
    isAlias = true;
    cmd = bot.commands.get(bot.aliases.get(command!)!);
  }

  context.command = cmd ?? null;
  context.commandName = cmd?.name ?? null;
  context.calledByAlias = isAlias;
  context.args = {};
  context.cliArgs = mri(args);

  const requiredArgsInOrder = cmd?.args ? Object.keys(cmd?.args) : [];

  context.content = args
    .slice(requiredArgsInOrder.length ?? 0)
    .join(' ')
    .trim(); // slice to skip required args
  context.contentFull = args.join(' ').trim();

  if (cmd?.args) {
    const params: Record<string, unknown> = {};
    for (const [i, param] of Object.keys(cmd.args).entries()) {
      params[param] = args[i];
    }
    try {
      const validationResult = validator.validate(params, cmd.args);
      if (validationResult === true) {
        context.args = params;
      } else {
        // alternative validation with cli style args
        const paramsAlt = Object.assign({}, params, context.cliArgs);
        const validationResultAlt = validator.validate(paramsAlt, cmd.args);
        if (validationResultAlt === true) {
          context.args = paramsAlt;
          delete context.args._;
        } else {
          context.validationErrors = validationResult as ValidationError[];
        }
      }
    } catch (err) {
      if (!(err as Error).message.match(/Invalid '.+?' type in validator schema/)) {
        throw err;
      }
      bot.emit(
        'error',
        new Error(
          `Looks like you have a problem with your args schema in the "${context.commandName}" command.`,
        ),
      );
    }
  }

  context.prefix = prefix;

  return context;
};
