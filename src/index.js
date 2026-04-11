import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';
import { handleCommand } from './discord/commands.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  await handleCommand(interaction);
});

client.login(process.env.DISCORD_TOKEN);