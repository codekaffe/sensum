# Sensum

Sensum is a framework that aims to speed up discord bot development by offering tools that allow you to quickly create commands.

## Why Sensum?

-   Object-oriented
-   Flexible
-   100% Promise-based
-   Typescript. The auto completions will save you a lot of time.

## Your first Sensum Bot

```typescript
import { BotClient, defaultCommands } from 'sensum';

const bot = new BotClient({ ownerId: '12344321', prefix: '!', token: 'abc.DefGhijkLmn123' });

// These are optional. (eval, repeat, botInvite, help, info, ping)
defaultCommands.forEach(cmd => bot.loadCommand(cmd));

bot.login();

```

## Examples

### Simple Command

```typescript
import { Command } from 'sensum';

export default new Command({
  name: 'howdy',
  description: 'Greetings!',
  aliases: ['yeehaw'],
  delete: true,
  category: 'funny',
  async run(bot, message, context) {
    // Yeeeeeeeeeeeeeeeeeeeehaw! 🐄
    const msg = await message.channel.send('Yeehaw!');
    await msg.react('🤠').catch(() => {});
  },
});
```

### Event Handlers

Bot is ready.

```typescript
import { EventHandler } from 'sensum';

// Here, "name" and "message" are fully typed, go nuts. ;)
export default new EventHandler({
  name: 'ready',
  enabled: true,
  run(bot, message) {
    console.log(`${bot.user.username} is ready!`);
  },
});
```

Someone sent a message.

```typescript
import { EventHandler } from 'sensum';

export default new EventHandler({
  name: 'messageCreate',
  enabled: true,
  async run(bot, message) {
    await message.react('♥');
  },
});
```

An error ocurred somewhere.

```typescript
import { EventHandler } from 'sensum';

export default new EventHandler({
  name: 'error',
  enabled: true,
  run(bot, error) {
    console.log('Oh no, something bad happened!', error);
  },
});
```

# Roadmap

-   [x] Commands
-   [x] Listeners
-   [x] Scheduled Tasks
-   [ ] Prompter
-   [ ] Slash Commands
-   [ ] Buttons, Menus and Other Interactions

# Disclaimer

Currently (v1) the library is under heavy WIP therefore the current public API may change. When v2 is released the public API will be stable.
