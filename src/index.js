// 1. БҮХ IMPORT-УУД ХАМГИЙН ДЭЭД ТАЛД БАЙНА
import http from 'http';
import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';
import { handleInteraction } from './discord/interactionHandler.js';

// 2. ВЭБ ХУУРАХ КОД (UPTIMEROBOT-Д ЗОРИУЛСАН)
const server = http.createServer((req, res) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    if (req.method === 'GET') res.write('Bot is online!');
    res.end();
  } else {
    res.writeHead(501);
    res.end();
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Keep-alive server running on port ${PORT}`);
});

// 3. ҮНДСЭН БОТЫН КОД
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
    try {
        await handleInteraction(interaction);
    } catch (err) {
        console.error(err);
    }
});

client.login(process.env.DISCORD_TOKEN);
