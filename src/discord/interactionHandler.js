import { handlePlay } from './commands/play.js';
import { handleJoin } from './commands/join.js';
import { handleStart } from './commands/start.js';
import { handleRoll } from './commands/roll.js';
import { handleBuy, handleSkip } from './commands/propertyActions.js';
import { handleStatus } from './commands/status.js';

export async function handleInteraction(interaction) {
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    if (commandName === 'play') return handlePlay(interaction);
    if (commandName === 'join') return handleJoin(interaction);
    if (commandName === 'start') return handleStart(interaction);
    if (commandName === 'status') return handleStatus(interaction);
  }

  if (interaction.isButton()) {
    const { customId } = interaction;

    if (customId.startsWith("roll_")) return handleRoll(interaction);
    if (customId.startsWith("buy_")) return handleBuy(interaction);
    if (customId.startsWith("skip_")) return handleSkip(interaction);
  }
}