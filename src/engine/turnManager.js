import { getRollButton }              from '../discord/components/turnButtons.js';
import { getRichestPlayer, deleteGame } from './gameManager.js';

/**
 * Advance to the next player.
 * Posts a NEW turn message with the Roll button tagged to the next player.
 * Stores the message on game.turnMessage so roll.js can edit it in place.
 *
 * If `bankruptPlayer` is provided the game ends immediately.
 */
export async function advanceTurn(interaction, game, bankruptPlayer = null) {
  if (bankruptPlayer) {
    const winner  = getRichestPlayer(game);
    deleteGame(interaction.guildId);
    return interaction.followUp({
      content:
        `💀 <@${bankruptPlayer.id}> has gone **bankrupt** — game over!\n` +
        `🏆 <@${winner.id}> wins with **${winner.reputation}** reputation!`,
      components: [],
    });
  }

  game.currentTurn = (game.currentTurn + 1) % game.players.length;
  const next = game.players[game.currentTurn];

  // Post the persistent turn message and store a reference for roll.js to edit
  const msg = await interaction.followUp({
    content:    `🎰 <@${next.id}>'s turn — press Roll when ready!`,
    components: getRollButton(next.id),
    fetchReply: true,
  });

  game.turnMessage = msg;
}