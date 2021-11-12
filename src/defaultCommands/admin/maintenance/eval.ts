import { Command } from '../../../commands/command';

export default new Command({
  name: 'eval',
  description: 'Troubleshooting command.',
  permission: Command.Permission.BOT_OWNER,
  hidden: true,
  category: 'maintenance',
  async run(bot, message, meta) {
    const { content } = meta;
    try {
      const evaled = eval(content);
      const clean = await bot.clean(evaled);
      message.channel.send(`\`\`\`js\n${clean}\n\`\`\``, { split: true });
    } catch (err) {
      message.channel.send(`\`ERROR\` \`\`\`xl\n${await bot.clean(err as any)}\n\`\`\``, {
        split: true,
      });
    }
  },
});
