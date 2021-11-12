import { IBotMessage } from '../interfaces';
import { Snowflake } from 'discord.js';
import appRoot from 'app-root-path';
import { TextHelpers } from './helpers';

export interface ILevelPerm {
  level: number;
  name: string;
  check: (message: IBotMessage) => boolean | undefined;
  guildOnly?: boolean;
}

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
  ownerID: Snowflake;
  admins?: Snowflake[];
  support?: Snowflake[];
  token: string;
  debug?: boolean;
  defaultSettings: IGuildDefaultSettings;
  defaultProfile: {
    [key: string]: any;
  };
  permLevels?: ILevelPerm[];
  messages?: {
    COOLDOWN?: string;
    USAGE?: string;
    COMMAND_FEEDBACK_SERVER_ONLY?: string;
    COMMAND_FEEDBACK_DM_ONLY?: string;
    COMMAND_FEEDBACK_MISSING_PERMISSION?: string;
    COMMAND_FEEDBACK_MISSING_ARGS_SINGULAR?: string;
    COMMAND_FEEDBACK_MISSING_ARGS_PLURAL?: string;
  };
  helpCategoryEmotes?: {
    [key: string]: string;
  };
}

export const defaultConfig: IConfig = {
  name: appRoot.require('./package.json').name,
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
  ownerID: '',
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
  },
  permLevels: [
    // This is the lowest permisison level, this is for non-roled users.
    {
      level: 0,
      name: 'User',
      // Don't bother checking, just return true which allows them to execute any command their
      // level allows them to.
      check: () => true,
    },

    {
      level: 2,
      name: 'Manage Messages',
      check: (message: IBotMessage) => {
        try {
          return message.guild?.member(message.author)?.hasPermission('MANAGE_MESSAGES');
        } catch (ex) {
          return false;
        }
      },
    },

    {
      level: 3,
      name: 'Manage Roles',
      check: (message: IBotMessage) => {
        try {
          return message.guild?.member(message.author)?.hasPermission('MANAGE_ROLES');
        } catch (ex) {
          return false;
        }
      },
    },

    {
      level: 4,
      name: 'Manage Guild',
      check: (message: IBotMessage) => {
        try {
          return message.guild?.member(message.author)?.hasPermission('MANAGE_GUILD');
        } catch (ex) {
          return false;
        }
      },
    },

    // This is the server owner.
    {
      level: 5,
      name: 'Server Owner',
      // Simple check, if the guild owner id matches the message author's ID, then it will return true.
      // Otherwise it will return false.
      check: (message: IBotMessage) =>
        message.channel.type === 'text'
          ? message.guild?.ownerID === message.author.id
            ? true
            : false
          : false,
    },

    // Bot Support is a special inbetween level that has the equivalent of server owner access
    // to any server they joins, in order to help troubleshoot the bot on behalf of owners.
    {
      level: 8,
      name: 'Bot Support',
      // The check is by reading if an ID is part of this array. Yes, this means you need to
      // change this and reboot the bot to add a support user. Make it better yourself!
      check: (message: IBotMessage) => message.client.config.support!.includes(message.author.id),
    },

    // Bot Admin has some limited access like rebooting the bot or reloading commands.
    {
      level: 9,
      name: 'Bot Admin',
      check: (message: IBotMessage) => {
        return message.client.config.admins!.includes(message.author.id);
      },
    },

    // This is the bot owner, this should be the highest permission level available.
    // The reason this should be the highest level is because of dangerous commands such as eval
    // or exec (if the owner has that).
    {
      level: 10,
      name: 'Bot Owner',
      // Another simple check, compares the message author id to the one stored in the config file.
      check: (message: IBotMessage) => message.client.config.ownerID === message.author.id,
    },
  ],
};
