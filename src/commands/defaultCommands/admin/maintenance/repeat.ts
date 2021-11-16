import { Command } from '../../../command';
import { Permission } from '../../../../permissions/permissions';

export default new Command({
  name: 'repeat',
  description: 'Repeats stuff like a robot',
  category: 'maintenance',
  permission: Permission.BOT_SUPPORT,
  delete: true,
  run(bot, message, context) {
    const name = context.nickname || context.username;
    const msg = name + ' said ' + context.content;
    message.channel.send(msg);
    bot.emit('debug', 'REPEAT COMMAND: ' + msg);
  },
});
