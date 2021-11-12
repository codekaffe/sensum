import { Snowflake } from 'discord.js';
import Collection from '@discordjs/collection';

import { BotClient } from '../client/bot-client';
import { IBotMessage } from '../interfaces';

export default (bot: BotClient, messages: Collection<Snowflake, IBotMessage>) => {
  const channel = messages.first()!.channel;
  bot.channelWatchers.forEach((watcher) => {
    if (watcher.channelId === channel.id) {
      watcher._channelEventHappened('messageDelete', { messages, channel });
    }
  });
};
