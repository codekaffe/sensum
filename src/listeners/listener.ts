/* eslint-disable no-console */
import Collection from '@discordjs/collection';
import { Snowflake } from 'discord.js';
import { IBotMessage, IListenerOptions, CombinedMeta } from '../interfaces';
import { BotClient } from '../bot-client';
import { isObject } from '../util';
import { SensumSchemaError } from '../errors';
import { buildCommandMetadata } from '../commands/command';
import { ICommandExtenders } from '../commands/message';

export const COMMON_EXPRESSIONS = {
  // TODO: find a way to add "me" in here
  me: "i('m|m|'ve|'ll|ll|mma)*",
  action: '(want|wanna|gonna|going to|will)',
  yes: '(y|yes|ye|yeah|yep|indeed|correct|mhm|sure|ok|okay|alright|alrighty|why not)',
  no: '(no|na|nah|not really|nope)',
  be: "(i'm|am|was|will be|are|were|is|be)",
};

export const stringMatch = (message: IBotMessage, words: string | string[]) => {
  // replace placeholder with command word
  function commonWord(placeholder: string[] | string): string | string[] {
    if (Array.isArray(placeholder)) {
      return placeholder;
    }
    const w = placeholder ? `${placeholder.replace(/(\{|\})/g, '').trim()}` : '';
    if ((COMMON_EXPRESSIONS as any)[w]) {
      return COMMON_EXPRESSIONS[w as 'me' | 'action' | 'yes' | 'no' | 'be'];
    }
    return placeholder;
  }
  // get the content of the message, remove punctuation and lower case it.
  const content = (message.content || '')
    // eslint-disable-next-line no-useless-escape
    .replace(/[\.,\/#!$%\^&\*;:\{\}=\-_`~()\?]/g, '')
    .replace(/\s{2,}/g, ' ')
    .toLowerCase();

  // regular expression to check if string contains a word
  const makeRegex = (w: string | string[]) => {
    return new RegExp(`(\\s+${w}\\s+|\\s+${w}$|^${w}\\s+|^${w}$)`);
  };
  const wordRegex = makeRegex(commonWord(words));

  // if the words variable is an array check if all of its words are in content
  if (Array.isArray(words)) {
    return words.map(commonWord).every((w) => content.match(makeRegex(w)));
  }

  // if words is not an array check if it is in content
  return content.match(wordRegex);
};

export class Listener<T = { [key: string]: any }> implements IListenerOptions<T> {
  words: IListenerOptions<T>['words'];
  cooldown: IListenerOptions<T>['cooldown'];
  category: IListenerOptions<T>['category'];
  priority: IListenerOptions<T>['priority'];
  globalCooldown: IListenerOptions<T>['globalCooldown'];
  maxMessageLength: IListenerOptions<T>['maxMessageLength'];
  run: IListenerOptions<T>['run'];
  init: IListenerOptions<T>['init'];
  _cooldowns: IListenerOptions<T>['_cooldowns'];
  send: any;

  constructor({
    words,
    cooldown,
    category,
    globalCooldown,
    maxMessageLength,
    priority,
    run,
  }: IListenerOptions<T>) {
    if (!words || (!cooldown && cooldown !== 0) || !run) {
      throw new SensumSchemaError('A listener requires words, cooldown and a run function.');
    }
    this.words = words;
    this.category = category;
    this.cooldown = cooldown;
    this._cooldowns = new Map();
    this.globalCooldown = globalCooldown || undefined;
    this.maxMessageLength = Math.abs(maxMessageLength || Infinity);
    this.priority = Number(priority) || 0;
    this.run = run;
  }

  evaluate(message: IBotMessage, meta: CombinedMeta<T>) {
    const { author } = message;
    const guildId = message.guild?.id;
    if (author.bot) return null;
    if (guildId) {
      if (this.globalCooldown && Date.now() - (this._cooldowns.get(`GUILD_${guildId}`) || NaN) < 0)
        return null;
    }
    // if no records for this user or if off cooldown
    if (!this._cooldowns.get(author.id) || Date.now() - this._cooldowns.get(author.id)! > 0) {
      if (stringMatch(message, this.words)) {
        if (message.client.botListeners.ignored.guilds.has(message.guild?.id as any)) return;
        if (message.client.botListeners.ignored.channels.has(message.channel.id)) return;
        const result = this.run(message.client, message, meta);
        // set cooldown
        this._cooldowns.set(author.id, Date.now() + this.cooldown * 1000);
        if (guildId && this.globalCooldown) {
          this._cooldowns.set(`GUILD_${guildId}`, Date.now() + this.globalCooldown * 1000);
        }
        return result;
      }
    }
    return null;
  }

  makeName(): string {
    return Array.isArray(this.words) ? this.words.join(' ') : this.words;
  }

  toString() {
    return `Listener [${this.makeName()} / ${this.category}]`;
  }

  [Symbol.toStringTag] = 'Listener';
}

interface IgnoreSettings {
  start: number;
  duration: number;
  timeout: NodeJS.Timer | null;
}

export class ListenerIgnoreList {
  bot: BotClient;
  guilds: Collection<Snowflake, IgnoreSettings>;
  channels: Collection<Snowflake, IgnoreSettings>;

  constructor(bot: BotClient) {
    this.bot = bot;
    this.guilds = new Collection();
    this.channels = new Collection();
  }

  /**
   * Clears all timeouts then clears the lists.
   *
   * @memberof ListenerIgnoreList
   */
  clear() {
    const clearTimeout = (ignored: IgnoreSettings) =>
      ignored.timeout ? this.bot.clearTimeout(ignored.timeout) : null;
    this.guilds.forEach(clearTimeout);
    this.guilds.clear();
    this.channels.forEach(clearTimeout);
    this.channels.clear();
  }

  /**
   * Adds a channel to the ignore list.
   *
   * @param {string|string[]} id
   * @param {number} [duration=0]
   * @returns
   * @memberof ListenerIgnoreList
   */
  ignoreChannel(id: Snowflake, duration = 0) {
    if (Array.isArray(id)) {
      id.forEach((i) => this.ignoreChannel(i, duration));
      return;
    }
    if (this.channels.get(id)?.timeout) {
      this.bot.clearTimeout(this.channels.get(id)!.timeout!);
    }
    this.channels.set(id, {
      start: Date.now(),
      duration,
      timeout: duration ? this.bot.setTimeout(() => this.channels.delete(id), duration) : null,
    });
  }

  /**
   * Adds a guild to the ignore list.
   *
   * @param {string|string[]} id
   * @param {number} [duration=0]
   * @returns
   * @memberof ListenerIgnoreList
   */
  ignoreGuild(id: Snowflake, duration = 0) {
    if (Array.isArray(id)) {
      id.forEach((i) => this.ignoreGuild(i, duration));
      return;
    }
    if (this.guilds.get(id)?.timeout) {
      this.bot.clearTimeout(this.guilds.get(id)!.timeout!);
    }
    this.guilds.set(id, {
      start: Date.now(),
      duration,
      timeout: duration ? this.bot.setTimeout(() => this.guilds.delete(id), duration) : null,
    });
  }

  /**
   * Removes a channel from the ignore list.
   *
   * @param {string|string[]} id
   * @memberof ListenerIgnoreList
   */
  listenChannel(id: Snowflake) {
    if (Array.isArray(id)) {
      id.forEach(this.listenChannel);
    }
    if (this.channels.has(id)) {
      const { timeout } = this.channels.get(id)!;
      if (timeout) this.bot.clearTimeout(timeout);
      this.channels.delete(id);
    }
  }

  /**
   * Removes a guild from the ignore list.
   *
   * @param {string|string[]} id
   * @memberof ListenerIgnoreList
   */
  listenGuild(id: Snowflake) {
    if (Array.isArray(id)) {
      id.forEach(this.listenGuild);
    }
    if (this.guilds.has(id)) {
      const { timeout } = this.guilds.get(id)!;
      if (timeout) this.bot.clearTimeout(timeout);
      this.guilds.delete(id);
    }
  }
}

export class ListenerRunner {
  bot: BotClient;
  mappedListeners: {
    [key: string]: Listener[];
  };
  options: { [key: string]: any };

  constructor(bot: BotClient, options: { [key: string]: any }) {
    this.bot = bot;
    this.options = options;

    this.mappedListeners = {};
    this.bot.botListeners.forEach((l: Listener) => {
      const c = l.category || 'other';
      this.mappedListeners[c] = [...(this.mappedListeners[c] || []), l];
      this.mappedListeners[c].sort((a: Listener, b: Listener) => a.priority! - b.priority!);
    });
  }

  /**
   * Makes the bot start listening for trigger messages.
   * @memberof ListenerRunner
   */
  listen(extensions: ICommandExtenders) {
    this.bot.on('message', async (message) => {
      const bot = this.bot;
      const channel = () => message.channel;
      if (message.author.bot) return;

      // When she first joins a server there may not be a guild object yet.
      if (!message.guild) {
        return;
      }
      if (bot.botListeners.ignored.guilds.has(message.guild.id)) return;
      if (bot.botListeners.ignored.channels.has(message.channel.id)) return;

      if (!bot.botListeners.size) return;

      function safeSend(...args: any) {
        const lines = [...args];
        const lastArg = isObject(lines[lines.length - 1]) ? lines.pop() : undefined;
        const msg = bot.lines(...lines, typeof lastArg === 'string' ? lastArg : '');

        return channel()
          .send(msg, lastArg)
          .then((sentMessage) => {
            if ((bot as any)?.logger! && sentMessage?.guild?.name) {
              (bot as any)?.logger.debug(
                'Sending listener message to guild:',
                sentMessage.guild.name,
              );
            }
          })
          .catch((err) => {
            err.stack += `\n\nGuild: ${message.guild?.name}\n`;
            err.stack += `Channel: ${message.channel?.id}\n`;
            bot.emit('error', err);
          });
      }

      const entries = Object.entries(this.mappedListeners);

      const meta = buildCommandMetadata(bot, message as unknown as IBotMessage, '');
      if (extensions.metaExtenders.length) {
        for (const extension of extensions.metaExtenders) {
          try {
            const extended = extension(meta);
            if (extended instanceof Promise) {
              // await in for..of loop because this must be sequential
              await extended;
            }
          } catch (err) {
            err.message = 'A meta extension function threw an error.\n\n' + err.message;
            bot.emit('error', err);
            return;
          }
        }
      }

      const runListenersInCategory = async (listenersInThisCategory: Listener[]) => {
        for (const listener of listenersInThisCategory) {
          if (message.content.length > listener.maxMessageLength!) {
            continue;
          }
          // inject safe send
          listener.send = (...args: any) => safeSend(...args);
          let result;
          try {
            const evaluation = listener.evaluate(message as unknown as IBotMessage, meta);
            // eslint-disable-next-line no-await-in-loop
            result = evaluation instanceof Promise ? await evaluation : evaluation;
          } catch (e) {
            this.bot.emit('error', e);
            break;
          }
          if (result === true || result === false) {
            this.bot.emit('listener', listener, meta);
          }
          if (result === true) {
            break;
          }
        }
      };

      const runAllListeners = () => {
        for (const [category, listenersInThisCategory] of entries) {
          runListenersInCategory(listenersInThisCategory).catch((err) => {
            err.category = category;
            bot.emit('error', err);
          });
        }
      };

      runAllListeners();
    });
  }
}
