# Sensum

Sensum is a framework that aims to speed up discord bot development by offering tools that allow you to quickly create commands.

# Features

- [x] Commands
- [x] Listeners
- [x] Scheduled Tasks

# Command Example

```javascript
const { Command } = require('sensum');

module.exports = new Command({
  name: 'howdy',
  description: 'Greetings!',
  aliases: ['yeehaw'],
  delete: true,
  category: 'funny',
  async run(message, args, context) {
    // Yeeeeeeeeeeeeeeeeeeeehaw! 🐄
    const msg = await message.channel.send('Yeehaw!');
    msg.react('🤠').catch(() => {});
  },
});
```

# Disclaimer

Currently (pre v1.0) the library is under heavy WIP therefore the current public API may change.
