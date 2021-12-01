import { handlePromise } from '@refabric/extend';
import { ICommandContext, IPermissionLevel, SensumSchemaError } from '..';

import { BotClient } from '../client/bot-client';
import { IBotMessage } from '../interfaces';
import { IPrefixChecker } from './command-runner';

export function isBot(message: IBotMessage): boolean {
  return message.author.bot;
}

export async function hasCorrectPrefix(
  message: IBotMessage,
  prefixCheckingExtensions: IPrefixChecker[],
): Promise<string | false> {
  let correctPrefix: string | false = false;
  if (prefixCheckingExtensions.length) {
    correctPrefix = await _matchesAllCustomPrefixCheckers(message, prefixCheckingExtensions);
  } else {
    correctPrefix = await _matchesDefaultPrefix(
      message,
      message.client.config.prefix,
    );
  }

  return correctPrefix;
}

export function shouldFetchMember(message: IBotMessage, context: ICommandContext): boolean {
  return !context.isDM && !message.member;
}

export function isForbiddenServerOnly(context: ICommandContext): boolean {
  return context.isDM && !context.command!.runIn?.includes('dm');
}

export function isForbiddenDMOnly(context: ICommandContext): boolean {
  return (
    !context.isDM &&
    !(context.command!.runIn?.includes('text') || context.command!.runIn?.includes('guild'))
  );
}

interface IPermissionError {
  userPermissionLevel: IPermissionLevel;
  requiredPermissionLevel: IPermissionLevel;
}

export function meetsPermissionLevel(
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

async function _matchesDefaultPrefix(
  message: IBotMessage,
  defaultPrefix: string,
): Promise<string | false> {
  return _validatePrefix(message, defaultPrefix);
}

async function _matchesAllCustomPrefixCheckers(
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

export function _validatePrefix(
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
