import { MessageEmbed } from 'discord.js';
import 'moment-duration-format';
import moment from 'moment';

import { Command } from '../../command';
import { Permission } from '../../../interfaces';

export default new Command({
  name: 'info',
  description: 'Shows some info about Hrmny.',
  permission: Permission.USER,
  category: 'info',
  aliases: ['stats', 'version'],
  run(bot) {
    const guilds = bot.guilds.cache.size;
    const users = bot.userCount;
    const ping = Math.trunc(bot.ws.ping);
    const version = bot.version;
    const uptime = moment
      .duration(bot.uptime ?? 0)
      .format(' D [days], H [hrs], m [mins], s [secs]');

    const embedData = {
      color: bot.colorInt('#00ff00'),
      footer: {
        text: `Version ${version} - ${moment().format('YYYY-MM-DD HH:mm:ss')}`,
      },
      thumbnail: {
        url: bot.user?.avatarURL() ?? undefined,
      },
      author: {
        name: (bot.config.name ?? 'Bot') + ' Stats 🍃',
      },
    };

    const embed = new MessageEmbed(embedData);

    embed.addField('Servers', String(guilds), true);
    embed.addField('Users', String(users), true);
    embed.addField('Uptime', uptime, false);
    embed.addField('Ping', ping + 'ms', true);

    this.send!({ embed });
  },
});
