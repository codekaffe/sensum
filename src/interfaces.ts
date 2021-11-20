import {
  Client,
  Guild,
  Snowflake,
  Message,
  MessageEditOptions,
  ClientEvents,
  MessagePayload,
} from 'discord.js';
import Collection from '@discordjs/collection';
import { ValidationSchema, ValidationError } from 'fastest-validator';
import { Argv } from 'mri';
import { Job } from 'node-schedule';

import { IConfig } from './client/bot.config';
import { BotClient } from './client/bot-client';
import { Command } from './commands/command';
import { Listener, ListenerIgnoreList, ListenerRunner } from './listeners/listener';
import { Schedule } from './tasks/tasks';
import { CooldownManager } from './commands/cooldown-manager';
import { CommandRunner } from './commands/command-runner';

export type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
export type OmitPropertiesOfType<T, U> = { [K in keyof T]: T[K] extends U ? K : never }[keyof T];
export type FunctionPropertyNames<T> = OmitPropertiesOfType<T, Function>;
export type NonFunction<T> = Omit<T, FunctionPropertyNames<T>>;

interface ExtendedClient {
  // Base
  config: IConfig;

  // Overwrites
  emit<K extends keyof IBotEvents>(event: K, ...args: IBotEvents[K]): boolean;

  // Info
  memory: {
    bot: number;
    free: number;
    total: number;
  };
  version: string;
  userCount: number;
  serverCount: number;

  // Stores
  commands: Collection<string, Command>;
  commandRunner: CommandRunner;
  aliases: Collection<string, string>;
  cooldowns: CooldownManager;
  botListeners: Overwrite<
    Collection<string, Listener>,
    {
      ignored: ListenerIgnoreList;
    }
  >;
  _listenerRunner: ListenerRunner;
  schedule: Schedule;

  // Utility methods
  permlevel(message: IBotMessage): number;
  clean(text: string): Promise<string>;

  loadCommand(command: Command): void;
  // unloadCommand(commandName: string): Promise<void>;

  // A cache of client permissions for pretty perm names in commands.
  permLevelCache: {
    [key: string]: number;
  };
}

export interface IBotClient extends Overwrite<Client, ExtendedClient> {}

export interface IBotEvents
  extends Overwrite<
    ClientEvents,
    {
      command: [ICommandContext];
      listener: [Listener, ICommandContext];
      vote: [Object];
    }
  > {}

export interface IBotMessage
  extends Overwrite<
    Message,
    {
      client: IBotClient;
      edit(content: string | MessageEditOptions | MessagePayload): Promise<IBotMessage>;
    }
  > {}

export type CombinedContext<T> = ICommandContext & T;

export interface IListenerOptions<T> {
  /**
   * Words to watch for. (regex syntax)
   */
  words: string | string[];
  /**
   * Listener will not trigger for a user based on this cooldown.
   */
  cooldown: number;
  /**
   * The category this listener belongs to.
   */
  category?: string;
  /**
   * Lower priority means the listener runs earlier.
   */
  priority?: number;
  /**
   * Cooldown that applies to all users.
   */
  globalCooldown?: number;
  /**
   * Messages with lengths above this will not be processed.
   */
  maxMessageLength?: number;
  /**
   * The method that will be run when the listener is triggered.
   */
  run(bot: IBotClient, message: IBotMessage, context: CombinedContext<T>): any;
  /**
   * This function is called when the listener is loaded
   */
  init?(bot: BotClient): any;

  _cooldowns: Map<string, number>;
}

export interface ICommandOptions<T> {
  /**
   * The command name.
   */
  name: string;
  /**
   * The command description.
   */
  description: string;
  /**
   * How to use the command. Will appear as (prefix)(command name)(usage). Ex: !hello [name] if usage is "[name]"
   */
  usage?: string;
  /**
   * Examples of the command being used.
   */
  examples?: string[];
  /**
   * The text displayed when the user uses (prefix)help [command name]
   */
  help?: string;
  /**
   * The category of this command.
   */
  category?: string;
  /**
   * Alternative names for this command.
   */
  aliases?: string[];
  /**
   * The permission level required to use this command.
   * TODO: Implement this
   */
  permission: number;
  /**
   * How long in seconds an user has to wait to use this command again.
   */
  cooldown?: number;
  /**
   * Where this command can be run. Possible values: "text", "dm".
   */
  runIn?: ('text' | 'dm' | 'guild')[];
  /**
   * If true only super users can use this command.
   */
  hidden?: boolean;
  /**
   * List of required arguments. The length of this array will be the number of required arguments and the values will be the arg names.
   */
  args?: ValidationSchema;
  /**
   * Wether the message that called this command should be deleted. Note: bot needs the appropriate permissions.
   */
  delete?: boolean;
  /**
   * If true, the command will not be available in channels that are not nsfw.
   */
  nsfwOnly?: boolean;
  /**
   * The function that will be executed when the command is called.
   * @param {IBotClient} bot The bot client.
   * @param {IBotMessage} message The message that called this command.
   * @param {string[]} args The args this command was called with.
   * @param {number} level The permission level.
   */
  run(bot: BotClient, message: IBotMessage, context: CombinedContext<T>): any;
  /**
   * The init function will be called when the command is loaded.
   */
  init?(bot: IBotClient): void;
  /**
   * The shutdown function will be called when the command is unloaded.
   */
  shutdown?(bot: IBotClient): void;
}

export interface ICommandContext {
  /**
   * The id of the user that called the command.
   */
  userId: Snowflake;
  /**
   * The user's tag.
   * Ex: ExamplePerson#5555
   */
  tag: string | null;
  /**
   * The username of the user.
   * Ex: ExamplePerson
   */
  username: string;
  /**
   * The user's nickname in this guild if they have one.
   */
  nickname: string | null;
  /**
   * The guild this message was sent to.
   */
  guild: Guild | null;
  /**
   * The command that was called.
   */
  command: Command | null;
  /**
   * The name of the command called.
   */
  commandName: string | null;
  /**
   * The prefix used to call this command.
   */
  prefix: string | false;
  /**
   * The content after the command name. Or after the last argument if the command expects arguments.
   * If the command was "!hello there my friend" and the command expects 1 argument content will be "my friend"
   */
  content: string;
  /**
   * Same as content but with args included.
   */
  contentFull: string;
  /**
   * The arguments the command was called with.
   */
  args: Record<string, unknown>;
  /**
   * The arguments the command was called with in CLI format.
   */
  cliArgs: Argv;
  /**
   * The first missing argument if not enough arguments.
   */
  validationErrors: ValidationError[];
  /**
   * Was the command called from a dm?
   */
  isDM: boolean;
  /**
   * Permission level of the user that called the command.
   */
  permLevel: number;
  /**
   * Was the command called through an alias?
   */
  calledByAlias: boolean;
  /**
   * The message associated with this call.
   */
  message: IBotMessage;
  /**
   * When the command was called.
   */
  time: Date;
}

export type IEventHandler = ((bot: IBotClient) => void) | ((bot: IBotClient) => Promise<void>);
export type ITaskHandler =
  | ((bot: IBotClient, fireDate: Date) => void)
  | ((bot: IBotClient, fireDate: Date) => Promise<void>);

export interface ITask {
  name: string;
  time: string | Date;
  run: ITaskHandler;
  job: Job;
}
