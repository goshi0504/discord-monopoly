import { getGame, deleteGame, getRichestPlayer } from '../../engine/gameManager.js';

export async function handleExit(interaction) {
  const game = getGame(interaction.guildId);

  if (!game) {
    return interaction.reply({ content: "❌ No game running.", ephemeral: true });
  }

  const winner = game.started ? getRichestPlayer(game) : null;
  deleteGame(interaction.guildId);

  const ending = winner
    ? `🏆 <@${winner.id}> ends the game with the most reputation (${winner.reputation})!`
    : "Game disbanded before it started.";

  return interaction.reply({ content: `🛑 Game ended.\n${ending}` });
}