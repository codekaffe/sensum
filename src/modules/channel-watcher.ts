import { EventEmitter } from 'events';
import {
  Snowflake,
  Channel,
  DMChannel,
  TextChannel,
  GuildChannel,
  MessageReaction,
  User,
} from 'discord.js';

import Collection from '@discordjs/collection';
import { diff } from 'deep-object-diff';
import StrictEventEmitter from 'strict-event-emitter-types';

import { NonFunction, IBotMessage } from '../interfaces';
import { BotClient } from '../bot-client';

export interface IChannelWatcherEvents {
  deleted: { channel: Channel };
  pins: { oldPins: Collection<string, IBotMessage>; newPins: Collection<string, IBotMessage> };
  update: ChannelDiff;
  'message-delete': { channel: TextChannel | DMChannel; message: IBotMessage };
  'message-delete-bulk': {
    channel: TextChannel | DMChannel;
    messages: Collection<Snowflake, IBotMessage>;
  };
  'reaction-add': {
    channel: DMChannel | TextChannel;
    message: IBotMessage;
    reaction: MessageReaction;
  };
  'reaction-remove': {
    channel: DMChannel | TextChannel;
    message: IBotMessage;
    reaction: MessageReaction;
  };
  'reaction-remove-all': { channel: DMChannel | TextChannel; message: IBotMessage };
  message: { channel: TextChannel | DMChannel; message: IBotMessage };
  typing: { channel: TextChannel | DMChannel; user: User };
  ready: void;
}

type WatchedChannel = DMChannel & GuildChannel;

export type ChannelDiff = Partial<NonFunction<WatchedChannel>>;

type ChannelWatcherEmitter = StrictEventEmitter<EventEmitter, IChannelWatcherEvents>;

export class ChannelWatcher extends (EventEmitter as { new (): ChannelWatcherEmitter }) {
  bot: BotClient;
  guildId: Snowflake;
  channelId: Snowflake;
  type?: keyof typeof ChannelType;
  latestState?: Channel;
  private oldPins?: Collection<string, IBotMessage>;
  private ready: boolean;

  constructor(bot: BotClient, guildId: Snowflake, channelId: Snowflake) {
    // super({ captureRejections: true });
    super();
    this.bot = bot;
    this.guildId = guildId;
    this.channelId = channelId;

    this.ready = false;

    this.fetchChannel();
  }

  async _channelEventHappened(event: string, data: any) {
    try {
      switch (event) {
        case 'channelDelete':
          this.emit('deleted', { channel: data.channel });
          this.destroy();
          break;
        case 'channelPinsUpdate':
          const channel: DMChannel | TextChannel = data.channel;
          const newPins = (await channel.messages.fetchPinned()) as unknown as Collection<
            string,
            IBotMessage
          >;
          this.emit('pins', { oldPins: this.oldPins ?? new Collection(), newPins });
          this.latestState = data.channel;
          this.oldPins = newPins as unknown as Collection<string, IBotMessage>;
          break;
        case 'channelUpdate':
          const difference: ChannelDiff = diff(data.oldChannel, data.newChannel);
          this.emit('update', difference);
          break;
        case 'messageDelete':
          this.emit('message-delete', data);
          break;
        case 'messageDeleteBulk':
          this.emit('message-delete', data);
          break;
        case 'messageReactionAdd':
          this.emit('reaction-add', data);
          break;
        case 'messageReactionRemove':
          this.emit('reaction-remove', data);
          break;
        case 'messageReactionRemoveAll':
          this.emit('reaction-remove-all', data);
          break;
        case 'message':
          this.emit('message', data);
          break;
        case 'typingStart':
          this.emit('typing', data);
          break;
        default:
          // uhhhh?????
          this.bot.emit(
            'warn',
            `Weird event sent to _channelEventHappened of ${this.guildId}:${this.channelId} => ${event}`,
          );
          return;
      }
    } catch (err) {
      const errorMsg = (err as Error).stack?.replace(
        new RegExp(`${this.bot.config.root ?? __dirname}/`, 'g'),
        './',
      );
      (err as Error).stack =
        `Channel watcher error.\n` +
        this.bot.helpers.lines(
          `Could not send message.`,
          `Channel: ${this.channelId}`,
          `Guild: ${this.guildId}`,
          `Event: ${event}`,
          'Data:',
          JSON.stringify(data, null, 2),
          errorMsg!,
        ) +
        (err as Error).stack;
      this.bot.emit('error', err as Error);
    }
  }

  async fetchChannel() {
    const channel = await this.bot.channels.fetch(this.channelId);
    if (!channel) {
      throw new Error(`Channel ${this.channelId} of guild ${this.guildId} not found`);
    }
    this.latestState = channel;
    this.type = channel.type;
    this.oldPins =
      // This is to make it work even if it has no pinned messages
      (await ((channel as DMChannel | TextChannel).messages?.fetchPinned() as unknown as Promise<
        Collection<string, IBotMessage>
      >)) ?? Promise.resolve(undefined);
    if (!this.ready) {
      this.ready = true;
      this.emit('ready');
    }
  }

  destroy() {
    this.bot.channelWatchers.delete(`${this.guildId}:${this.channelId}`);
    this.removeAllListeners();
  }
}
