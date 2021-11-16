import { Permissions } from 'discord.js';

import { Command } from '../../command';
import { Permission } from '../../../permissions/permissions';

export default new Command({
  name: 'invite',
  description: 'Generates an invite for Hrmny.',
  aliases: ['inviteme'],
  category: 'info',
  permission: Permission.USER,
  async run(bot, message) {
    const invite = await bot.generateInvite({
      permissions: Permissions.FLAGS.SEND_MESSAGES,
      scopes: ['bot'],
    });
    message.channel.send("I'm so happy you want to invite me c:\n" + invite);
  },
});
