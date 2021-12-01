const { Intents } = require('discord.js');
const { BotClient } = require('../dist');

const bot = new BotClient({
  intents: [Intents.FLAGS.GUILD_MESSAGES],
});

bot.on('messageCreate', (message) => {
  console.log('message: ', message);
  if (message.content === 'ping') {
    message.channel.send('pong');
  }
});

bot.on('messageCreate', (message) => {
  console.log('message: ', message);
  if (message.content === 'ping') {
    message.channel.send('pong');
  }
});

bot.on('ready', () => {
  console.log('Bot ready', bot.user.tag);
});

bot.on('error', console.log);

bot.login();
