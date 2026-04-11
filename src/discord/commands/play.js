import { createGame, getGame } from '../../engine/gameManager.js';

export async function handlePlay(interaction) {
  const { guildId, user } = interaction;

  if (getGame(guildId)) {
    return interaction.reply({
      content:   "⚠️ A game is already running in this server. Use `/exit` to end it first.",
      ephemeral: true,
    });
  }

  createGame(guildId);
  const game = getGame(guildId);

  // Creator auto-joins
  game.players.push({ id: user.id, position: 0, reputation: 1500, inJail: false });

  return interaction.reply({
    content:
      `🎰 **Inferno** has been created by <@${user.id}>!\n` +
      `Use \`/join\` to enter the game (up to 5 players).\n` +
      `The host can type \`/start\` when everyone is ready.`,
  });
}