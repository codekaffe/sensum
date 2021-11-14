import { TextChannel } from 'discord.js';

import { formatString, isObject, time } from '../util';
import { CombinedMeta, IBotMessage } from '../interfaces';
import { BotClient, ILevelPerm } from '..';
import { validatePrefix, buildCommandMetadata } from './command';

export type IPrefixChecker = (bot: BotClient, message: IBotMessage) => string | false;
export type IMetaExtender = <T>(meta: CombinedMeta<T>) => void | Promise<void>;

export interface ICommandExtenders {
  prefixCheckers: IPrefixChecker[];
  metaExtenders: IMetaExtender[];
}

export const makeCommandRunner =
  (extensions: ICommandExtenders, bot: BotClient) => async (message: IBotMessage) => {
    // Command handling

    // Don't answer to bots
    if (message.author.bot) return;

    let prefix: string | false = false;
    if (extensions.prefixCheckers.length) {
      for (const check of extensions.prefixCheckers) {
        try {
          prefix = check(bot, message);
          if ((prefix as any) instanceof Promise) {
            // await in for..of loop because this must be sequential
            prefix = await prefix;
          }
        } catch (err) {
          (err as Error).message =
            'A prefix check function threw an error.\n\n' + (err as Error).message;
          bot.emit('error', err as Error);
          return;
        }
        if (!prefix) return;
      }
    } else {
      prefix = validatePrefix(message, bot.config.defaultSettings.prefix);
    }

    // Also good practice to ignore any message that does not start with our prefix,
    // which is set in the configuration file.
    if (!prefix) {
      return;
    }

    // Parses the command and gets useful data
    const meta = buildCommandMetadata(bot, message, prefix);

    if (extensions.metaExtenders.length) {
      for (const extension of extensions.metaExtenders) {
        try {
          const extended = extension(meta);
          if (extended instanceof Promise) {
            // await in for..of loop because this must be sequential
            await extended;
          }
        } catch (err) {
          (err as Error).message =
            'A meta extension function threw an error.\n\n' + (err as Error).message;
          bot.emit('error', err as Error);
          return;
        }
      }
    }

    // If the member on a guild is invisible or not cached, fetch them.
    if (!meta.isDM && !message.member) await message.guild?.members.fetch({ user: message.author });

    // Check whether the command, or alias, exist in the collections defined in bot-client.ts
    if (!meta.command) return;

    // Some commands may not be useable in DMs. This check prevents those commands from running
    // and return a friendly error message.
    if (meta.isDM && !meta.command.runIn?.includes('dm')) {
      try {
        await message.channel
          .send(formatString(bot.config.messages!.COMMAND_FEEDBACK_SERVER_ONLY, meta.commandName))
          .then(async (msg) => {
            await wait(5000);
            await msg.delete().catch(() => {});
          });
        return;
      } catch {
        /* This is fine. */
      }
    }

    // And some commands are only usable in DMs
    if (
      !meta.isDM &&
      !(meta.command.runIn?.includes('text') || meta.command.runIn?.includes('guild'))
    ) {
      try {
        await message.channel
          .send(formatString(bot.config.messages!.COMMAND_FEEDBACK_DM_ONLY, meta.commandName))
          .then(async (msg) => {
            await wait(5000);
            await msg.delete().catch(() => {});
          });
        return;
      } catch {
        /* This is fine. */
      }
    }

    const requiredPermLevel = bot.config.permLevels!.find(
      (l: ILevelPerm) => l.level === meta.command!.permission,
    )!;
    const userPermLevel = bot.config.permLevels!.find(
      (l: ILevelPerm) => l.level === meta.permLevel,
    )!;
    if (meta.permLevel < meta.command.permission!) {
      if (!requiredPermLevel) {
        bot.emit(
          'error',
          new Error(
            `Permission level ${meta.command.permission} in command ${meta.command.name} not found in the config!`,
          ),
        );
        return;
      }
      const sendNoPermissionMessage = async () => {
        try {
          await message.channel
            .send(
              formatString(
                bot.config.messages!.COMMAND_FEEDBACK_MISSING_PERMISSION,
                meta.permLevel,
                userPermLevel.name,
                requiredPermLevel.level,
                requiredPermLevel.name,
              ),
            )
            .then(async (msg) => {
              await wait(5000);
              await msg.delete().catch(() => {});
            });
        } catch {
          /* This is fine. */
        }
      };
      return (
        // Don`t send message if command is hidden
        meta.command.hidden ?? sendNoPermissionMessage()
      );
    }

    if (meta.validationErrors) {
      await message.channel
        .send(
          formatString(
            meta.validationErrors.length > 1
              ? bot.config.messages!.COMMAND_FEEDBACK_MISSING_ARGS_PLURAL
              : bot.config.messages!.COMMAND_FEEDBACK_MISSING_ARGS_SINGULAR,
            bot.lines(
              ...meta.validationErrors.map(
                (err) => `**${err.field}** (${err.type}): ${err.message}`,
              ),
            ),
          ),
        )
        .then(async (msg) => {
          await wait(5000);
          await msg.delete().catch(() => {});
        });
      return;
    }

    const cooldownLeft = bot.cooldowns.getTimeLeft(meta.commandName!, meta.userId);

    if (cooldownLeft > 0) {
      try {
        await message.channel
          .send(
            formatString(
              bot.config.messages!.COOLDOWN,
              time.secondsToHumanReadable(cooldownLeft),
              meta.commandName,
            ),
          )
          .then(async (cdMessage) => {
            await wait(5000);
            await cdMessage.delete().catch(() => {});
          });
      } catch {
        /* This is fine. */
      }
      return;
    }

    bot.cooldowns.updateTimeLeft(meta.commandName!, meta.userId);

    if (meta.command.delete) {
      await message.delete().catch(() => {});
    }

    const safeSend = (...args: any): Promise<void | IBotMessage> => {
      const lines = [...args];
      const lastArg = lines.pop();
      const msg = bot.helpers.lines(...lines, typeof lastArg === 'string' ? lastArg : '');

      return message.channel
        .send(isObject(lastArg) ? { ...lastArg, content: msg } : msg)
        .catch((err) => {
          const channelName = (message.channel as TextChannel).name;
          const channelId = message.channel.id;
          const guildName = meta.guild?.name;
          const guildId = meta.guild?.id;
          bot.emit(
            'warn',
            bot.helpers.lines(
              `Could not send message.`,
              `Channel: ${channelName} (${channelId})`,
              `Guild: ${guildName} (${guildId})`,
              `DM: ${meta.isDM}`,
              `Error: ${err.message}`,
            ),
          );
        }) as Promise<void | IBotMessage>;
    };

    meta.command.send = safeSend;

    // Log the command usage
    bot.emit('command', meta);

    // This is to support regular functions and async functions as the run property
    const safelyRun = (subject: () => void | Promise<any>, errorHandler: (err: Error) => void) => {
      try {
        (subject() as Promise<any>).catch(errorHandler);
      } catch (err) {
        if (err instanceof TypeError && /catch/.test(err.message)) {
          // This error is from running .catch() in a normal function. We can ignore.
        } else {
          errorHandler(err as Error);
        }
      }
    };

    const errorHandler = (err: Error) => {
      const channelName = (message.channel as TextChannel).name;
      const channelId = message.channel.id;
      const guildName = meta.guild?.name;
      const guildId = meta.guild?.id;
      const errorMsg = err.stack?.replace(new RegExp(`${__dirname}/`, 'g'), './');
      err.stack =
        `An error ocurred in the ${meta.commandName} command.\n` +
        bot.helpers.lines(
          `Could not send message.`,
          `Channel: ${channelName} (${channelId})`,
          `Guild: ${guildName} (${guildId})`,
          `DM: ${meta.isDM}`,
          errorMsg!,
        ) +
        err.stack;
      bot.emit('error', err);
    };

    // If the command exists, **AND** the user has permission, run it.
    safelyRun(() => meta.command?.run(bot, message, meta), errorHandler);
  };

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
