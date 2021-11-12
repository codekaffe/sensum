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
    const invite = await bot.generateInvite(Permissions.ALL);
    this.send!("I'm so happy you want to invite me c:", invite);
  },
});
