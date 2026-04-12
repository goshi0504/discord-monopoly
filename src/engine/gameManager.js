import { games } from '../state/gameStore.js';

const MAX_PLAYERS = 5;
const STARTING_REP = 1500;
const GO_BONUS = 50; // collected when passing or landing on GO

export function createGame(guildId) {
  games[guildId] = {
    players:     [],
    currentTurn: 0,
    properties:  {},
    started:     false,
  };
}

export function getGame(guildId) {
  return games[guildId] ?? null;
}

export function deleteGame(guildId) {
  delete games[guildId];
}

export function addPlayer(game, userId) {
  if (game.players.length >= MAX_PLAYERS) return false;
  if (game.players.some(p => p.id === userId)) return false;
  game.players.push({
    id:         userId,
    position:   0,
    reputation: STARTING_REP,
    inJail:     false,
  });
  return true;
}

export function startGame(game) {
  game.started     = true;
  game.currentTurn = 0;
}

/**
 * Move a player by `steps` tiles.
 * Returns true if the player passed GO (and awards the bonus).
 */
export function movePlayer(player, steps, boardLength) {
  const newPos  = player.position + steps;
  const passedGO = newPos >= boardLength;
  player.position = newPos % boardLength;
  if (passedGO) {
    player.reputation += GO_BONUS;
  }
  return passedGO;
}

export function teleportToJail(player, jailIndex) {
  player.position = jailIndex;
  player.inJail   = true;
}

export function releaseFromJail(player) {
  player.inJail = false;
}

/**
 * Check if a player is bankrupt (reputation ≤ 0).
 */
export function isBankrupt(player) {
  return player.reputation <= 0;
}

/**
 * Return the player with the highest reputation.
 * Ties are broken by the earliest join order.
 */
export function getRichestPlayer(game) {
  return game.players.reduce((best, p) =>
    p.reputation > best.reputation ? p : best
  );
}

export { MAX_PLAYERS, STARTING_REP, GO_BONUS };