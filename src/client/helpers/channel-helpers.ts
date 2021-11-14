import { GuildChannel } from 'discord.js';
import { IBotMessage } from '../../interfaces';

export function getMentionedChannels(message: IBotMessage): GuildChannel[] {
  const channelRegex = /(?<=<#)(\d+?)(?=>)/g;
  const channelsInMessage = message.content.match(channelRegex) || [];

  if (!message.guild) return [];
  if (channelsInMessage.length === 0) return [];

  const channelsInGuild = message.guild.channels.cache.filter((c) => c.type === 'GUILD_TEXT');

  const channels = channelsInMessage
    // remove duplicates
    .filter((v, i, a) => a.indexOf(v) === i)
    // get the channels
    .map((c) => channelsInGuild.get(c))
    // remove falsy values
    .filter((c) => c !== undefined) as GuildChannel[];

  return channels;
}
