import { User, TextChannel, DMChannel } from 'discord.js';

import { BotClient } from '../client/bot-client';

export default (bot: BotClient, channel: TextChannel | DMChannel, user: User) => {
  bot.channelWatchers.forEach((watcher) => {
    if (channel.id !== watcher.channelId) return;
    watcher._channelEventHappened('message', { channel, user });
  });
};
