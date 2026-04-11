import { createGame, getGame } from '../engine/gameState.js';
import { board } from '../engine/board.js';

export async function handleCommand(interaction) {
  const { commandName, guildId, user } = interaction;

  // START GAME
  if (commandName === 'startgame') {
    createGame(guildId);

    return interaction.reply(
      '🎰 New Sin City game created! Use /join to enter.'
    );
  }

  // JOIN GAME
  if (commandName === 'join') {
    const game = getGame(guildId);

    if (!game) {
      return interaction.reply('No game found. Use /startgame');
    }

    if (game.players[user.id]) {
      return interaction.reply('You already joined!');
    }

    game.players[user.id] = {
      id: user.id,
      position: 0,
      chips: 1000
    };

    game.turnOrder.push(user.id);

    return interaction.reply(`🙋 <@${user.id}> joined the game!`);
  }

  // ROLL
  if (commandName === 'roll') {
    const game = getGame(guildId);

    if (!game) {
      return interaction.reply('No game running!');
    }

    const currentPlayer = game.turnOrder[game.currentTurn];

    if (currentPlayer !== user.id) {
      return interaction.reply('Not your turn!');
    }

    const player = game.players[user.id];

    const roll = Math.floor(Math.random() * 6) + 1;
    player.position = (player.position + roll) % board.length;

    const tile = board[player.position];

    game.currentTurn =
      (game.currentTurn + 1) % game.turnOrder.length;

    let message =
      `🎲 <@${user.id}> rolled ${roll}\n` +
      `📍 Landed on: **${tile}** (tile ${player.position})`;

    if (tile === 'poker') {
      message += '\n🃏 Poker system coming soon...';
    }

    if (tile === 'event') {
      message += '\n⚡ Event system coming soon...';
    }

    return interaction.reply(message);
  }
}