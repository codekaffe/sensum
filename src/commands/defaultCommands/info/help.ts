import { MessageEmbed } from 'discord.js';

import { lines } from '../../../client/helpers/text-helpers';
import { Permission } from '../../../permissions/permissions';
import { Command } from '../../command';

// const { CATEGORY_EMOJIS } = require('../../util/constants.js');

export default new Command({
  name: 'help',
  description: 'Let me help you!',
  category: 'info',
  permission: Permission.USER,
  runIn: ['text', 'dm'],
  usage: '[command name]',
  args: {
    command: {
      type: 'string',
      lowercase: true,
      optional: true,
    },
  },
  examples: [' ', 'info', 'ping'],
  run(bot, message, context) {
    const { args } = context;
    // return help about specific command
    if (args.command) {
      const search = args.command as string;
      const command = bot.commands.get(search) || bot.commands.get(bot.aliases.get(search) || '');
      if (!command || (command.hidden && bot.permlevel(message) < 8)) {
        return message.channel.send(`I could not find the ${search} command.`);
      }
      // gather data and send it to same channel
      const embed = new MessageEmbed({
        author: {
          name: command.name.toUpperCase(),
          iconURL: message.author.avatarURL() ?? undefined,
        },
        footer: {
          text: `Version ${bot.version} <3`,
          iconURL: bot.user?.avatarURL() || undefined,
        },
      });

      embed.addField(':blue_book: Description', command.description);
      if (command.aliases?.length ?? 0 > 0) {
        embed.addField(
          ':books: Aliases',
          command.aliases!.reduce((acc, cur) => `${acc} \`${cur}\``, ''),
        );
      }
      if (command.usage) {
        embed.addField(
          ':book: Usage',
          `\`\`\`${context.prefix}${command.name} ${command.usage}\`\`\`` +
            '```python\n' +
            '# Remove the brackets.\n' +
            '# {} = Required arguments\n' +
            '# [] = Optional arguments.```',
          true,
        );
      }
      if (command.args && Object.keys(command.args).length) {
        embed.addField(
          '🛠 Argments',
          lines(
            ...Object.entries(command.args).map(([arg, val]) => `**${arg}** ${val.type ?? val}`),
          ),
          true,
        );
      }
      const addExamples = (exampleType: string) => {
        const start = `${bot.config.prefix}${command.name} `;
        const example = (command as any)[exampleType];
        const isArr = Array.isArray(example);
        const examples = isArr
          ? example.reduce((acc: string, cur: string) => `${acc} \`\`\`${start}${cur}\`\`\``, '')
          : `\`\`\`${start}${example}\`\`\``;
        embed.addField(':ledger: Example', examples);
      };
      if (command.examples?.length) {
        addExamples('examples');
      }
      return message.channel.send({ embeds: [embed] });
    }

    const botName = bot.user?.username ?? 'Bot';

    // return a list of commands separated by category
    const embed = new MessageEmbed({
      author: {
        name: `${botName} Help`,
        iconURL: message.author.avatarURL() ?? undefined,
      },
      footer: {
        text: `Version ${bot.version} <3`,
        icon_url: bot.user?.avatarURL() ?? undefined,
      },
      description:
        `These are the commands available for ${botName}.\n` +
        'To learn more about a command use `' +
        context.prefix +
        'help {command name}`',
    });

    const commandList = {};

    bot.commands.forEach((c) => {
      (commandList as any)[c.category || 'other'] = [
        ...((commandList as any)[c.category || 'other'] || []),
        c,
      ];
    });

    const cats = Object.keys(commandList);
    cats.sort((a, b) => a.localeCompare(b));
    cats.forEach((category) => {
      if (!(commandList as any)[category]?.length) return;
      if (!(commandList as any)[category].filter((c: Command) => !c.hidden).length) return;

      embed.addField(
        `${
          (bot.config.helpCategoryEmotes || ({} as any))[category] || ':page_facing_up:'
        } ${category}`,
        '>' +
          (commandList as any)[category]
            .filter((c: Command) => !c.hidden)
            .sort((a: Command, b: Command) => a < b)
            .reduce((acc: string, cur: Command) => `${acc} \`${cur.name}\``, ''),
      );
    });
    return message.channel.send({ embeds: [embed] });
  },
});
