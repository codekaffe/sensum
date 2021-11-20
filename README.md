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

const bot = new BotClient({ ownerId: '12344321', prefix: '!', token: 'abc.DefGhijkLmn123', root: __dirname });

// These are optional. (eval, repeat, botInvite, help, info, ping)
defaultCommands.forEach(cmd => bot.loadCommand(cmd));

bot.login();

```

## Examples

### Simple Command

To create a command create a file that ends in `.command.js` or `.command.ts` and export a Sensum `Command` from it. Sensum will load them automatically.

```typescript
// my-commands-folder/howdy.command.ts
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

To create an event create a file that ends in `.event.js` or `.event.ts` and export a Sensum `EventHandler` from it. Sensum will load them automatically.

Bot is ready.

```typescript
// my-events-folder/bot-ready.event.ts
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
// my-events-folder/message.event.ts
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
// my-events-folder/error-handler.event.ts
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
-   [x] Event Handlers
-   [x] Scheduled Tasks
-   [ ] Prompter
-   [ ] Slash Commands
-   [ ] Buttons, Menus and Other Interactions

# Disclaimer

Currently (v1) the library is under heavy WIP therefore the current public API may change. When v2 is released the public API will be stable.
