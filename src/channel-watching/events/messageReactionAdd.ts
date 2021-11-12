import { MessageReaction, User } from 'discord.js';

import { BotClient } from '../../client/bot-client';

export default (bot: BotClient, reaction: MessageReaction, user: User) => {
  bot.channelWatchers.forEach((watcher) => {
    const channel = reaction.message.channel;
    if (channel.id !== watcher.channelId) return;
    watcher._channelEventHappened('messageReactionAdd', { channel, reaction, user });
  });
};
