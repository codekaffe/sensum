import appRoot from 'app-root-path';
import { Snowflake } from 'discord.js';
import { cosmiconfigSync } from 'cosmiconfig';

import { defaultPermissionLevels, IPermissionLevel } from '../permissions/permissions';
import { messages } from '../i18n/messages';

export interface IConfig {
  prefix: string;
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
  defaultProfile: {
    [key: string]: any;
  };
  permLevels?: IPermissionLevel[];
  messages?: Record<string, string>;
  helpCategoryEmotes?: {
    [key: string]: string;
  };
}

export const configSearch = cosmiconfigSync('sensum').search();

export const defaultConfig: IConfig = {
  name: appRoot.require('./package.json')?.name ?? 'Bot',
  prefix: '!',
  defaultProfile: {},
  token: process.env.TOKEN!,
  useTypescript: false,
  root: appRoot.toString(),
  admins: [],
  support: [],
  ownerId: '',
  debug: false,
  messages,
  permLevels: defaultPermissionLevels,
};
