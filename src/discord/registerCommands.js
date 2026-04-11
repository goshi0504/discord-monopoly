import { REST, Routes } from 'discord.js';
import 'dotenv/config';

const commands = [
  { name: 'startgame', description: 'Start a new game' },
  { name: 'join', description: 'Join the game' },
  { name: 'roll', description: 'Roll the dice' }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering commands...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('Commands registered!');
  } catch (error) {
    console.error(error);
  }
})();