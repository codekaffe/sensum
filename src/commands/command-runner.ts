import { handlePromise } from '@refabric/extend';
import { BotClient } from '../client/bot-client';
import { lines } from '../client/helpers/text-helpers';

import { SensumSchemaError } from '../errors';
import { IBotMessage, IBotClient, ICommandContext, CombinedContext } from '../interfaces';
import { IPermissionLevel } from '../permissions/permissions';
import { time } from '../util';
import formatString from '../util/format-string';
import { buildCommandContext } from './command';
import { makeCommandErrorHandler, sendErrorMessage } from './command-runner-helpers';

interface IPermissionError {
  userPermissionLevel: IPermissionLevel;
  requiredPermissionLevel: IPermissionLevel;
}

export type IPrefixChecker = (bot: BotClient, message: IBotMessage) => string | boolean;
export type IContextExtender = <T>(context: CombinedContext<T>) => void | Promise<void>;

export interface ICommandExtenders {
  prefixCheckers: IPrefixChecker[];
  contextExtenders: IContextExtender[];
}

export class CommandRunner {
  bot: IBotClient;
  extensions: ICommandExtenders;

  constructor(bot: IBotClient, extensions: ICommandExtenders) {
    this.bot = bot;
    this.extensions = extensions;
  }

  makeRunner() {
    return this.run.bind(this);
  }

  async applyContextExtenders(
    extenders: IContextExtender[],
    context: ICommandContext,
    message: IBotMessage,
  ) {
    const handleExtenderError = (err: Error) => {
      err.message = 'A context extension function threw an error.\n\n' + err.message;
      message.client.emit('error', err);
    };
    for (const extension of extenders) {
      await handlePromise(() => extension(context), handleExtenderError);
    }
  }

  async run(message: IBotMessage): Promise<void> {
    // Don't answer to bots
    if (Conditions.isBot(message)) return;

    const prefix = await Conditions.hasCorrectPrefix(message, this.extensions.prefixCheckers);

    // Ignore any message that does not start with the prefix
    if (!prefix) {
      return;
    }

    // Parses the command and gets useful data
    const context = buildCommandContext(this.bot, message, prefix);

    if (this.extensions.contextExtenders.length) {
      await this.applyContextExtenders(this.extensions.contextExtenders, context, message);
    }

    // If the member on a guild is invisible or not cached, fetch them.
    if (Conditions.shouldFetchMember(message, context)) {
      await message.guild?.members.fetch({ user: message.author });
    }

    // Check whether the command, or alias, has been registered
    if (!context.command) return;

    // Some commands may not be useable in nsfw channels
    if (Conditions.isUnsafeNSFWCommand(message, context)) {
      await sendErrorMessage(
        message,
        formatString(this.bot.config.messages!.COMMAND_FEEDBACK_SERVER_ONLY),
      );
      return;
    }

    // Some commands may not be useable in DMs. This check prevents those commands from running
    // and return a friendly error message.
    if (Conditions.isForbiddenServerOnly(context)) {
      await sendErrorMessage(
        message,
        formatString(this.bot.config.messages!.COMMAND_FEEDBACK_SERVER_ONLY, context.commandName),
      );
      return;
    }

    // And some commands are only usable in DMs
    if (Conditions.isForbiddenDMOnly(context)) {
      await sendErrorMessage(
        message,
        formatString(this.bot.config.messages!.COMMAND_FEEDBACK_DM_ONLY, context.commandName),
      );
    }

    const permissionLevelResult = Conditions.meetsPermissionLevel(message, context);

    if (permissionLevelResult instanceof Error) {
      this.bot.emit('error', permissionLevelResult);
      return;
    }

    if (permissionLevelResult !== true) {
      if (!context.command.hidden) {
        await sendErrorMessage(
          message,
          formatString(
            this.bot.config.messages!.COMMAND_FEEDBACK_MISSING_PERMISSION,
            context.permLevel,
            permissionLevelResult.userPermissionLevel.name,
            permissionLevelResult.requiredPermissionLevel.level,
            permissionLevelResult.requiredPermissionLevel.name,
          ),
        );
      }
      return;
    }

    if (context.validationErrors) {
      await sendErrorMessage(
        message,
        formatString(
          context.validationErrors.length > 1
            ? this.bot.config.messages!.COMMAND_FEEDBACK_MISSING_ARGS_PLURAL
            : this.bot.config.messages!.COMMAND_FEEDBACK_MISSING_ARGS_SINGULAR,
          lines(
            ...context.validationErrors.map(
              (err) => `**${err.field}** (${err.type}): ${err.message}`,
            ),
          ),
        ),
      );
      return;
    }

    const cooldownLeft = this.bot.cooldowns.getTimeLeft(context.commandName!, context.userId);

    if (cooldownLeft > 0) {
      await sendErrorMessage(
        message,
        formatString(
          this.bot.config.messages!.COOLDOWN,
          time.secondsToHumanReadable(cooldownLeft),
          context.commandName,
        ),
      );
      return;
    }

    this.bot.cooldowns.updateTimeLeft(context.commandName!, context.userId);

    if (context.command.delete) {
      await message.delete().catch(() => {});
    }

    // Log the command usage
    this.bot.emit('command', context);

    const commandErrorHandler = makeCommandErrorHandler(context);

    // If the command exists, **AND** the user has permission, run it.
    await handlePromise(
      () => context.command?.run(this.bot as BotClient, message, context),
      commandErrorHandler,
    );
  }
}

export class Conditions {
  static isBot(message: IBotMessage): boolean {
    return message.author.bot;
  }

  static async hasCorrectPrefix(
    message: IBotMessage,
    prefixCheckingExtensions: IPrefixChecker[],
  ): Promise<string | false> {
    let correctPrefix: string | false = false;
    if (prefixCheckingExtensions.length) {
      correctPrefix = await this._matchesAllCustomPrefixCheckers(message, prefixCheckingExtensions);
    } else {
      correctPrefix = await this._matchesDefaultPrefix(
        message,
        message.client.config.defaultSettings.prefix,
      );
    }

    return correctPrefix;
  }

  static shouldFetchMember(message: IBotMessage, context: ICommandContext): boolean {
    return !context.isDM && !message.member;
  }

  static isForbiddenServerOnly(context: ICommandContext): boolean {
    return context.isDM && !context.command!.runIn?.includes('dm');
  }

  static isForbiddenDMOnly(context: ICommandContext): boolean {
    return (
      !context.isDM &&
      !(context.command!.runIn?.includes('text') || context.command!.runIn?.includes('guild'))
    );
  }

  static isUnsafeNSFWCommand(message: IBotMessage, context: ICommandContext): boolean {
    if (!context.command!.nsfwOnly) return false;
    return !((message.channel as any).nsfw as boolean) ?? true;
  }

  static meetsPermissionLevel(
    message: IBotMessage,
    context: ICommandContext,
  ): true | IPermissionError | SensumSchemaError {
    const requiredPermissionLevel = message.client.config.permLevels!.find(
      (l: IPermissionLevel) => l.level === context.command!.permission,
    )!;
    const userPermissionLevel = message.client.config.permLevels!.find(
      (l: IPermissionLevel) => l.level === context.permLevel,
    )!;
    if (context.permLevel < context.command!.permission) {
      if (!requiredPermissionLevel) {
        return new SensumSchemaError(
          `Permission level ${context.command!.permission} in command ${
            context.command!.name
          } not found in the config!`,
        );
      }

      return {
        userPermissionLevel,
        requiredPermissionLevel,
      };
    }
    return true;
  }

  private static async _matchesDefaultPrefix(
    message: IBotMessage,
    defaultPrefix: string,
  ): Promise<string | false> {
    return this._validatePrefix(message, defaultPrefix);
  }

  private static async _matchesAllCustomPrefixCheckers(
    message: IBotMessage,
    prefixCheckingExtensions: IPrefixChecker[],
  ): Promise<string | false> {
    let hasError = false;
    const handleExtenderError = (err: Error) => {
      err.message = 'A prefix check function threw an error.\n\n' + err.message;
      message.client.emit('error', err);
      hasError = true;
    };
    for (const check of prefixCheckingExtensions) {
      const correctPrefix =
        ((await handlePromise(
          () => check(message.client as BotClient, message) as string | boolean,
          handleExtenderError,
        )) as string | false) ?? false;

      if (hasError) return false;
      if (correctPrefix === false) continue;
      return correctPrefix;
    }
    return false;
  }

  static _validatePrefix(
    message: IBotMessage,
    defaultPrefix: string,
    guildPrefixes?: Map<string, any>,
  ): string | false {
    const content = message.content.trim().toLowerCase().replace(/\s\s+/g, ' ');

    // return truthy if no guildPrefixes map provided and command starts with prefix
    if (!guildPrefixes) {
      return content.startsWith(defaultPrefix) ? defaultPrefix : false;
    }

    const guildId = message.guild?.id;
    // If guild prefix equals default prefix that should not be treated as a custom prefix.
    const customPrefix =
      guildPrefixes.get(guildId!)?.prefix === defaultPrefix
        ? false
        : guildPrefixes.get(guildId!)?.prefix;

    // do not run command with normal prefix if a custom prefix is set
    if (customPrefix && content.startsWith(defaultPrefix)) {
      return false;
    }

    // has custom prefix and command starts with it
    if (customPrefix && content.startsWith(customPrefix)) {
      return customPrefix;
    }

    // does not have custom prefix and command starts with default prefix
    if (!customPrefix && content.startsWith(defaultPrefix)) {
      return defaultPrefix;
    }

    // false if doesn't start with correct prefix
    return false;
  }
}
