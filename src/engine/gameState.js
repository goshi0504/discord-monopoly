export const games = {};

export function createGame(guildId) {
  games[guildId] = {
    players: {},
    turnOrder: [],
    currentTurn: 0,
    started: true
  };
}

export function getGame(guildId) {
  return games[guildId];
}