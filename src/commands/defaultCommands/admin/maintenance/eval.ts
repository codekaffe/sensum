import { Command } from '../../../command';
import { Permission } from '../../../../permissions/permissions';

export default new Command({
  name: 'eval',
  description: 'Troubleshooting command.',
  permission: Permission.BOT_OWNER,
  hidden: true,
  category: 'maintenance',
  async run(bot, message, context) {
    const { content } = context;
    try {
      const evaled = eval(content);
      const clean = await bot.clean(evaled);
      message.channel.send({ content: `\`\`\`js\n${clean}\n\`\`\`` });
    } catch (err) {
      message.channel.send(`\`ERROR\` \`\`\`xl\n${await bot.clean(err as any)}\n\`\`\``);
    }
  },
});
