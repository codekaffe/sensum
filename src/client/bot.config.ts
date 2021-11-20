import { Snowflake } from 'discord.js';
import appRoot from 'app-root-path';

import { TextHelpers } from './helpers';
import { defaultPermissionLevels, IPermissionLevel } from '../permissions/permissions';

export interface IGuildDefaultSettings {
  prefix: string;
  modRole: string;
  adminRole: string;
}

export interface IConfig {
  root?: string;
  ignorePattern?: string;
  skipFileLoading?: boolean;
  name?: string;
  useTypescript?: boolean;
  ownerId: Snowflake;
  admins?: Snowflake[];
  support?: Snowflake[];
  token: string;
  debug?: boolean;
  defaultSettings: IGuildDefaultSettings;
  defaultProfile: {
    [key: string]: any;
  };
  permLevels?: IPermissionLevel[];
  messages?: {
    COOLDOWN?: string;
    USAGE?: string;
    COMMAND_FEEDBACK_SERVER_ONLY?: string;
    COMMAND_FEEDBACK_DM_ONLY?: string;
    COMMAND_FEEDBACK_MISSING_PERMISSION?: string;
    COMMAND_FEEDBACK_MISSING_ARGS_SINGULAR?: string;
    COMMAND_FEEDBACK_MISSING_ARGS_PLURAL?: string;
    COMMAND_FEEDBACK_NSFW_ONLY?: string;
  };
  helpCategoryEmotes?: {
    [key: string]: string;
  };
}

export const defaultConfig: IConfig = {
  name: appRoot.require('./package.json')?.name ?? 'Bot',
  defaultSettings: {
    prefix: '!',
    adminRole: 'Admin',
    modRole: 'Moderator',
  },
  defaultProfile: {},
  token: process.env.TOKEN!,
  useTypescript: false,
  root: appRoot.toString(),
  admins: [],
  support: [],
  ownerId: '',
  debug: false,
  messages: {
    COOLDOWN: 'Please wait **{0}** before using the {1} command again.',
    USAGE: "You're missing the **{0}** argument! \nUsage: {1}",
    COMMAND_FEEDBACK_SERVER_ONLY:
      'The {0} command is unavailable via private message. Please run it in a server.',
    COMMAND_FEEDBACK_DM_ONLY:
      'The {0} command is only available via private message. Please run it in the DMs.',
    COMMAND_FEEDBACK_MISSING_PERMISSION: TextHelpers.lines(
      'You do not have permission to use this command.',
      `Your permission level is {0} ({1})`,
      `This command requires level {2} ({3})`,
    ),
    COMMAND_FEEDBACK_MISSING_ARGS_SINGULAR: TextHelpers.lines(
      `Looks like you have a problem with your args.`,
      '{0}',
    ),
    COMMAND_FEEDBACK_MISSING_ARGS_PLURAL: TextHelpers.lines(
      `Looks like you have a few problems with your args.`,
      '{0}',
    ),
    COMMAND_FEEDBACK_NSFW_ONLY: 'This command can only be used in NSFW channels.',
  },
  permLevels: defaultPermissionLevels,
};
