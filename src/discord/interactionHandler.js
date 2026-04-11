import { handlePlay }                        from './commands/play.js';
import { handleLobbyJoin, handleLobbyStart } from './commands/lobby.js';
import { handleStart }                       from './commands/start.js';
import { handleRoll }                        from './commands/roll.js';
import { handleBuy, handleSkip }             from './commands/propertyActions.js';
import { handleStatus }                      from './commands/status.js';
import { handleExit }                        from './commands/exit.js';
import { handleVote }                        from './commands/eventHandler.js';

export async function handleInteraction(interaction) {
  // ── Slash commands ──────────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    switch (interaction.commandName) {
      case 'play':   return handlePlay(interaction);
      case 'start':  return handleStart(interaction);
      case 'status': return handleStatus(interaction);
      case 'exit':   return handleExit(interaction);
    }
  }

  // ── Button interactions ─────────────────────────────────────────────────
  if (interaction.isButton()) {
    const { customId } = interaction;

    if (customId === 'lobby_join')          return handleLobbyJoin(interaction);
    if (customId === 'lobby_start')         return handleLobbyStart(interaction);
    if (customId.startsWith('roll_'))       return handleRoll(interaction);
    if (customId.startsWith('buy_'))        return handleBuy(interaction);
    if (customId.startsWith('skip_'))       return handleSkip(interaction);
    if (customId.startsWith('vote_'))       return handleVote(interaction);
  }
}