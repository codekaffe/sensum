import { BotClient } from '../client/bot-client';
import { IBotMessage } from '../interfaces';

export default (bot: BotClient, message: IBotMessage) => {
  bot.channelWatchers.forEach((watcher) => {
    const channel = message.channel;
    if (channel.id !== watcher.channelId) return;
    watcher._channelEventHappened('messageReactionRemoveAll', { channel, message });
  });
};
