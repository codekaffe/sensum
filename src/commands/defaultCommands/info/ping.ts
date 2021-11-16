import { Permission } from '../../../permissions/permissions';
import { Command } from '../../command';

export default new Command({
  name: 'ping',
  description: 'Am I working?',
  permission: Permission.USER,
  category: 'info',
  runIn: ['guild', 'dm'],
  async run(bot, message) {
    message.channel.send('Pong!');
  },
});
