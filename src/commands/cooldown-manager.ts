import Collection from '@discordjs/collection';
import { Snowflake } from 'discord.js';

import { IBotClient } from '../interfaces';

export class CooldownManager extends Collection<string, Collection<Snowflake, number>> {
  bot: IBotClient;

  constructor(bot: IBotClient) {
    super();
    if (!bot) throw new Error('CooldownManager needs a client.');
    this.bot = bot;
  }

  loadCommands(commands: IBotClient['commands']) {
    commands.forEach((cmd) => {
      super.set(cmd.name.toLowerCase(), new Collection());
    });
  }

  updateTimeLeft(commandName: string, userId: Snowflake) {
    if (!this.bot.commands.has(commandName)) {
      throw new Error(`Could not update cooldown because command ${commandName} was not found.`);
    }
    const now = Date.now();
    const timestamps = super.get(commandName);
    if (timestamps) {
      timestamps.set(userId, now);
    } else {
      throw new Error(
        `Could not update cooldown because there was no collection for the command ${commandName}.`,
      );
    }
  }

  getTimeLeft(commandName: string, userId: Snowflake): number {
    if (!this.bot.commands.has(commandName)) {
      throw new Error(
        `Could not get cooldown left for user ${userId} because "${commandName}" was not in the bot.commands collection.`,
      );
    }
    const cmd = this.bot.commands.get(commandName)!;
    const now = Date.now();
    const cooldownAmount = (cmd.cooldown ?? 3) * 1000;

    const timestamps = super.get(commandName);
    if (!timestamps) {
      throw new Error(
        `Could not get cooldown left for user ${userId} because there was no timestamps collection for the command ${commandName}.`,
      );
    }
    if (timestamps.has(userId)) {
      const expirationTime = timestamps.get(userId)! + cooldownAmount;
      if (now < expirationTime) {
        // Return seconds left
        return Number(((expirationTime - now) / 1000).toFixed(1));
      }
      return 0;
    }
    // User haven't used the command yet, add them to the collection
    this.updateTimeLeft(commandName, userId);
    setTimeout(() => timestamps.delete(userId), cooldownAmount);
    return 0;
  }
}
