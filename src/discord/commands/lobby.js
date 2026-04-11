
import { getGame, addPlayer, startGame, MAX_PLAYERS } from '../../engine/gameManager.js';
import { getLobbyButtons }                            from '../components/lobbyButtons.js';
import { getRollButton }                              from '../components/turnButtons.js';
import { buildLobbyContent }                          from './play.js';

export async function handleLobbyJoin(interaction) {
  const { guildId, user } = interaction;
  const game = getGame(guildId);

  if (!game) {
    return interaction.reply({ content: '❌ No game found.', ephemeral: true });
  }
  if (game.started) {
    return interaction.reply({ content: '❌ Game already started.', ephemeral: true });
  }
  if (game.players.some(p => p.id === user.id)) {
    return interaction.reply({ content: '⚠️ You\'re already in the game.', ephemeral: true });
  }
  if (game.players.length >= MAX_PLAYERS) {
    return interaction.reply({
      content:   `❌ Game is full (${MAX_PLAYERS} players max).`,
      ephemeral: true,
    });
  }

  addPlayer(game, user.id);

  // Edit the existing lobby message directly — no interaction token needed
  await game.lobbyMessage.edit({
    content:    buildLobbyContent(game),
    components: getLobbyButtons(),
  });

  // Acknowledge the button press silently (required by Discord within 3s)
  await interaction.deferUpdate();
}

export async function handleLobbyStart(interaction) {
  const { guildId, user } = interaction;
  const game = getGame(guildId);

  if (!game) {
    return interaction.reply({ content: '❌ No game found.', ephemeral: true });
  }
  if (game.started) {
    return interaction.reply({ content: '⚠️ Game already started.', ephemeral: true });
  }
  if (user.id !== game.hostId) {
    return interaction.reply({
      content:   '❌ Only the host can start the game.',
      ephemeral: true,
    });
  }
  if (game.players.length < 2) {
    return interaction.reply({
      content:   '❌ Need at least 2 players to start.',
      ephemeral: true,
    });
  }

  startGame(game);
  const first = game.players[0];

  // Acknowledge the button press first
  await interaction.deferUpdate();

  // Edit the lobby message into the first turn message via the Message object directly
  await game.lobbyMessage.edit({
    content:
      `🎮 **Inferno** has started!\n` +
      `👥 Players: ${game.players.map(p => `<@${p.id}>`).join(', ')}\n\n` +
      `🎰 <@${first.id}>'s turn — press Roll when ready!`,
    components: getRollButton(first.id),
  });

  game.turnMessage  = game.lobbyMessage;  // already a real Message with .edit() + .channel
  game.lobbyMessage = null;
}