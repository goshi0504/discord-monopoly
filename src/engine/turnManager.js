import { AttachmentBuilder }           from 'discord.js';
import { getRollButton }               from '../discord/components/turnButtons.js';
import { getRichestPlayer, deleteGame } from './gameManager.js';
import { renderBoard }                  from '../systems/boardRenderer.js';

/**
 * Render the board as a Discord attachment.
 * Returns null (and logs) if rendering fails so the game never crashes.
 */
async function makeBoardAttachment(players) {
  try {
    const buf = await renderBoard(players);
    return new AttachmentBuilder(buf, { name: 'board.png' });
  } catch (err) {
    console.error('[boardRenderer] failed to render board:', err.message);
    return null;
  }
}

/**
 * Advance to the next player.
 * Posts a new turn message via channel.send() — never touches an interaction token.
 * Attaches a fresh board render showing all player positions.
 */
export async function advanceTurn(interaction, game, bankruptPlayer = null) {
  const channel = game.turnMessage?.channel;

  if (bankruptPlayer) {
    const winner  = getRichestPlayer(game);
    deleteGame(interaction.guildId);
    const content =
      `💀 <@${bankruptPlayer.id}> has gone **bankrupt** — game over!\n` +
      `🏆 <@${winner.id}> wins with **${winner.reputation}** reputation!`;

    const file = await makeBoardAttachment(game.players);
    const payload = { content, components: [], files: file ? [file] : [] };
    if (channel) return channel.send(payload);
    return interaction.followUp(payload);
  }

  game.currentTurn = (game.currentTurn + 1) % game.players.length;
  const next = game.players[game.currentTurn];

  if (!channel) {
    console.error('[advanceTurn] game.turnMessage.channel is missing.');
    return;
  }

  const file = await makeBoardAttachment(game.players);
  const msg  = await channel.send({
    content:    `🎰 <@${next.id}>'s turn — press Roll when ready!`,
    components: getRollButton(next.id),
    files:      file ? [file] : [],
  });

  game.turnMessage = msg;
}