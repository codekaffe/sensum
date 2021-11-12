import { BotClient } from '../../client/bot-client';
import { IBotMessage } from '../../interfaces';

export default (bot: BotClient, message: IBotMessage) => {
  bot.channelWatchers.forEach((watcher: any) => {
    if (watcher.channelId === message.channel.id) {
      watcher._channelEventHappened('messageDelete', { message, channel: message.channel });
    }
  });
};
