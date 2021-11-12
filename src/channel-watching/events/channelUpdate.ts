import { BotClient } from '../../client/bot-client';

export default (bot: BotClient, oldChannel: any, newChannel: any) => {
  bot.channelWatchers.forEach((watcher: any) => {
    if (oldChannel.id !== watcher.channelId) return;
    watcher._channelEventHappened('channelUpdate', { oldChannel, newChannel });
  });
};
