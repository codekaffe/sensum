import { Command } from '../../command';
import { Permission } from '../../../interfaces';
import { Permissions } from 'discord.js';

export default new Command({
  name: 'invite',
  description: 'Generates an invite for Hrmny.',
  aliases: ['inviteme'],
  category: 'info',
  permission: Permission.USER,
  async run(bot) {
    const invite = await bot.generateInvite({
      permissions: Permissions.FLAGS.SEND_MESSAGES,
      scopes: ['bot'],
    });
    this.send!("I'm so happy you want to invite me c:", invite);
  },
});
