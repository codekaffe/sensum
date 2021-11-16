import { handlePromise } from '@refabric/extend';
import { TextChannel } from 'discord.js';
import { promisify } from 'util';
import { lines } from '../client/helpers/text-helpers';
import { IBotMessage, ICommandContext } from '../interfaces';

export const wait = promisify(setTimeout);

export const sendErrorMessage = async (message: IBotMessage, error: string) => {
  await handlePromise(
    async () => {
      const sentMessage = await message.channel.send(error);
      await wait(5000);
      await sentMessage.delete();
    },
    () => {},
  );
};

export function makeCommandErrorHandler(context: ICommandContext) {
  const { message } = context;
  return (err: Error) => {
    const channelName = (message.channel as TextChannel).name;
    const channelId = message.channel.id;
    const guildName = context.guild?.name;
    const guildId = context.guild?.id;
    const errorMsg = err.stack?.replace(new RegExp(`${__dirname}/`, 'g'), './');
    err.stack =
      `An error ocurred in the ${context.commandName} command.\n` +
      lines(
        `Channel: ${channelName} (${channelId})`,
        `Guild: ${guildName} (${guildId})`,
        `DM: ${context.isDM}`,
        errorMsg!,
      ) +
      err.stack;
    message.client.emit('error', err);
  };
}
