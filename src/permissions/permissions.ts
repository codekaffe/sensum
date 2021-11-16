import { IBotMessage } from '../interfaces';

// eslint-disable-next-line no-shadow
export enum Permission {
  USER = 0,
  MANAGE_MESSAGES = 2,
  MANAGE_ROLES = 3,
  MANAGE_GUILD = 4,
  SERVER_OWNER = 5,
  BOT_SUPPORT = 8,
  BOT_ADMIN = 9,
  BOT_OWNER = 10,
}

export interface IPermissionLevel {
  level: number;
  name: string;
  check(message: IBotMessage): boolean;
}

export const defaultPermissionLevels: IPermissionLevel[] = [
  // This is the lowest permission level, this is for non-roled users.
  {
    level: Permission.USER,
    name: 'User',
    // Don't bother checking, just return true which allows them to execute any command their
    // level allows them to.
    check: () => true,
  },

  {
    level: Permission.MANAGE_MESSAGES,
    name: 'Manage Messages',
    check: (message: IBotMessage) => {
      return (
        message.guild?.members.cache.get(message.author.id)?.permissions.has('MANAGE_MESSAGES') ??
        false
      );
    },
  },

  {
    level: Permission.MANAGE_ROLES,
    name: 'Manage Roles',
    check: (message: IBotMessage) => {
      return (
        message.guild?.members.cache.get(message.author.id)?.permissions.has('MANAGE_ROLES') ??
        false
      );
    },
  },

  {
    level: Permission.MANAGE_GUILD,
    name: 'Manage Guild',
    check: (message: IBotMessage) => {
      return (
        message.guild?.members.cache.get(message.author.id)?.permissions.has('MANAGE_GUILD') ??
        false
      );
    },
  },

  {
    level: Permission.SERVER_OWNER,
    name: 'Server Owner',
    check: (message: IBotMessage) => {
      if (message.channel.type !== 'GUILD_TEXT') {
        return false;
      }
      if (message.guild?.ownerId === message.author.id) {
        return true;
      }
      return false;
    },
  },

  // Bot Support is a special inbetween level that has the equivalent of server owner access
  // to any server they joins, in order to help troubleshoot the bot on behalf of owners.
  {
    level: Permission.BOT_SUPPORT,
    name: 'Bot Support',
    check: (message: IBotMessage) =>
      message.client.config.support?.includes(message.author.id) ?? false,
  },

  // Bot Admin has some limited access like rebooting the bot or reloading commands.
  {
    level: Permission.BOT_ADMIN,
    name: 'Bot Admin',
    check: (message: IBotMessage) => {
      return message.client.config.admins?.includes(message.author.id) ?? false;
    },
  },

  // This is the bot owner, this should be the highest permission level available.
  // The reason this should be the highest level is because of dangerous commands such as eval
  // or exec (if the owner has that).
  {
    level: Permission.BOT_OWNER,
    name: 'Bot Owner',
    // Another simple check, compares the message author id to the one stored in the config file.
    check: (message: IBotMessage) => message.client.config.ownerId === message.author.id,
  },
];
