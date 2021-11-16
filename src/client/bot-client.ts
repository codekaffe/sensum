import { Client, ClientOptions } from 'discord.js';
import Collection from '@discordjs/collection';
import merge from 'lodash.merge';

import { inspect } from 'util';
import os from 'os';

import { IBotClient, IBotMessage } from '../interfaces';
import { Command } from '../commands/command';
import { Schedule, Task } from '../tasks/tasks';
import { EventHandler, wrapEventHandler } from '../events/event-handler';
import { Listener, ListenerIgnoreList, ListenerRunner } from '../listeners/listener';
import * as FileLoader from '../modules/file-loader';
import {
  CommandRunner,
  ICommandExtenders,
  IContextExtender as IContextExtender,
  IPrefixChecker,
} from '../commands/command-runner';
import { CooldownManager } from '../commands/cooldown-manager';
import { defaultConfig, IConfig } from './bot.config';

export class BotClient extends Client implements IBotClient {
  config: IBotClient['config'];
  commands: IBotClient['commands'];
  commandRunner: IBotClient['commandRunner'];
  botListeners: IBotClient['botListeners'];
  _listenerRunner: IBotClient['_listenerRunner'];
  aliases: IBotClient['aliases'];
  permLevelCache: IBotClient['permLevelCache'];
  cooldowns: IBotClient['cooldowns'];
  extensions: ICommandExtenders;
  emit!: IBotClient['emit'];
  schedule: IBotClient['schedule'];

  constructor(
    config: IConfig,
    options: ClientOptions = {
      allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
      intents: [],
    },
  ) {
    super(options);

    // Config
    this.config = merge({}, defaultConfig, config);

    // Command stuff
    this.commands = new Collection();
    this.aliases = new Collection();
    this.cooldowns = new CooldownManager(this);
    this.botListeners = new Collection() as unknown as IBotClient['botListeners'];
    this._listenerRunner = undefined as unknown as IBotClient['_listenerRunner'];
    this.schedule = new Schedule(this, []);

    const permLevelCache: { [key: string]: number } = {};
    for (let i = 0; i < this.config?.permLevels!.length; i++) {
      const thisLevel = this.config.permLevels![i];
      permLevelCache[thisLevel.name as string] = thisLevel.level;
    }
    this.permLevelCache = permLevelCache;

    this.extensions = {
      contextExtenders: [],
      prefixCheckers: [],
    };

    this.commandRunner = new CommandRunner(this, this.extensions);
  }

  /*
  MESSAGE CLEAN FUNCTION
  "Clean" removes @everyone pings, as well as tokens, and makes code blocks
  escaped so they're shown more easily. As a bonus it resolves promises
  and stringifies objects!
  This is mostly only used by the Eval and Exec commands.
  */
  clean = async (text: string) => {
    if (text && text.constructor.name == 'Promise') text = await text;
    if (typeof text !== 'string') text = inspect(text, { depth: 1 });

    text = text
      .replace(/`/g, '`' + String.fromCharCode(8203))
      .replace(/@/g, '@' + String.fromCharCode(8203))
      .replace(this.config.token, 'mfa.VkO_2G4Qv3T--NO--lWetW_tjND--TOKEN--QFTm6YGtzq9PH--4U--tG0');

    return text;
  };

  /*
  PERMISSION LEVEL FUNCTION
  This is a very basic permission system for commands which uses "levels"
  "spaces" are intentionally left black so you can add them if you want.
  NEVER GIVE ANYONE BUT OWNER THE LEVEL 10! By default this can run any
  command including the VERY DANGEROUS `eval` and `exec` commands!
  */
  permlevel(message: IBotMessage): number {
    let permissionLevel = 0;

    const permOrder = this.config.permLevels!.slice(0).sort((p, c) => (p.level < c.level ? 1 : -1));

    while (permOrder.length) {
      const currentLevel = permOrder.shift();
      if (currentLevel!.check(message)) {
        permissionLevel = currentLevel!.level;
        break;
      }
    }
    return permissionLevel;
  }

  get memory() {
    const bot = Math.trunc(process.memoryUsage().heapUsed);
    const free = os.freemem();
    const total = os.totalmem();

    return {
      bot,
      free,
      total,
      percent: (total - free) / total,
    };
  }

  get userCount() {
    return this.guilds.cache.map((g) => g.memberCount).reduce((a, b) => a + b, 0);
  }

  get serverCount() {
    return this.guilds.cache.size;
  }

  get version() {
    return process.env.npm_package_version!;
  }

  loadCommand(command: Command) {
    if (!command) return;
    if (!(command instanceof Command)) return;
    try {
      this.emit('debug', `Loading Command: ${command.name}`);
      if (command.init) {
        command.init(this as any);
      }
      this.commands.set(command.name, command);
      this.cooldowns.set(command.name.toLowerCase(), new Collection());
      command.aliases?.forEach((alias) => {
        this.aliases.set(alias, command.name);
      });
    } catch (e) {
      this.emit('error', new Error(`Unable to load command ${command?.name}: ${e}`));
    }
  }

  extend = {
    prefixChecking: (checker: IPrefixChecker) => {
      this.extensions.prefixCheckers.push(checker);
    },
    contextParsing: (extender: IContextExtender) => {
      this.extensions.contextExtenders.push(extender);
    },
  };

  private async _loadSensumObjects() {
    const { root, ignorePattern } = this.config;
    const models: FileLoader.IModelDescription[] = [
      {
        name: 'commands',
        regex: /\.command\.(js|ts)$/,
        importClass: Command,
      },
      {
        name: 'tasks',
        regex: /\.task\.(js|ts)$/,
        importClass: Task,
      },
      {
        name: 'events',
        regex: /\.event\.(js|ts)$/,
        importClass: EventHandler,
      },
      {
        name: 'listeners',
        regex: /\.listener\.(js|ts)$/,
        importClass: Listener,
      },
    ];
    const projectFiles = await FileLoader.readAllFiles({ root, ignorePattern });
    const { commands, tasks, events, listeners } = await FileLoader.requireSensumObjects(
      root,
      projectFiles,
      models,
    );

    (commands as Command[]).forEach((cmd) => this.loadCommand(cmd));
    this.cooldowns.loadCommands(this.commands);

    this.schedule = new Schedule(this, tasks as Task[]);

    // Load events into client.
    (events as EventHandler<any>[]).forEach((event) =>
      this.on(event.name, wrapEventHandler(this, event)),
    );

    // Load listeners into client.
    const mappedListeners = (listeners as Listener[]).map((listener) => [
      listener.makeName(),
      Object.assign(listener, { name: listener.makeName() }),
    ]);

    this.botListeners = new Collection<string, Listener>(mappedListeners as any) as any;
    this.botListeners.ignored = new ListenerIgnoreList(this);
    this._listenerRunner = new ListenerRunner(this, {});
    this._listenerRunner.listen(this.extensions);
  }

  async login(token?: string) {
    if (!this.config.skipFileLoading) {
      await this._loadSensumObjects();
    }

    const runner = this.commandRunner.makeRunner();

    // Listen to commands
    this.on('messageCreate', runner as any);
    this.on('messageUpdate', (_, message) => runner(message as unknown as IBotMessage));

    return super.login(token ?? this.config.token);
  }
}
