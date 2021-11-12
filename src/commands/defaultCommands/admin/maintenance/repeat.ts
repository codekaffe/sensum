import { Command } from '../../../command';
import { Permission } from '../../../../interfaces';

export default new Command({
  name: 'repeat',
  description: 'Repeats stuff like a robot',
  category: 'maintenance',
  permission: Permission.BOT_SUPPORT,
  delete: true,
  run(bot, message, meta) {
    const name = meta.nickname || meta.username;
    const msg = name + ' said ' + meta.content; 
    this.send!(msg);
    bot.emit('debug', 'REPEAT COMMAND: ' + msg);
  },
});
