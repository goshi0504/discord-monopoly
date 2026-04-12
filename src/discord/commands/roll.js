import {
  getGame,
  movePlayer,
  teleportToJail,
  isBankrupt,
  buildSinOMeter,
  deleteGame,
}                                              from '../../engine/gameManager.js';
import { board, JAIL_POSITION }               from '../../engine/board.js';
import { rollDice }                           from '../../engine/dice.js';
import { advanceTurn }                        from '../../engine/turnManager.js';
import { runEventFlow }                       from './eventHandler.js';
import { getPropertyButtons }                 from '../components/propertyButtons.js';
import { getSlotButtons }                     from '../components/slotButtons.js';
import { TILE_TYPES }                         from '../../types/Tile.js';
import { JAIL_FINE, MAX_ROTATIONS }           from '../../config/constants.js';

function fmtDelta(delta) {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '±0';
}

/**
 * Check if any player has completed MAX_ROTATIONS laps.
 * If so, post the SIN-O-METER leaderboard, delete the game and return true.
 */
async function checkGameOver(interaction, game) {
  const finisher = game.players.find(p => p.rotations >= MAX_ROTATIONS);
  if (!finisher) return false;

  const sinOMeter = buildSinOMeter(game, board);
  deleteGame(interaction.guildId);

  await game.turnMessage.edit({ content: `🏁 <@${finisher.id}> has completed **${MAX_ROTATIONS} laps** — the Inferno is over!\n\n${sinOMeter}`, components: [] });
  return true;
}

export async function handleRoll(interaction) {
  const game   = getGame(interaction.guildId);
  const player = game?.players[game.currentTurn];

  if (!game?.started) {
    return interaction.reply({ content: '❌ No active game.', ephemeral: true });
  }
  if (interaction.user.id !== player.id) {
    return interaction.reply({ content: "⏳ It's not your turn!", ephemeral: true });
  }

  // Acknowledge silently — we edit game.turnMessage directly throughout
  await interaction.reply({ content: '🎲 Rolling…', ephemeral: true });

  // ── Roll dice & move ────────────────────────────────────────────────────
  const { d1, d2, total }             = rollDice();
  const { passedGO, landedOnGO, goAwarded } = movePlayer(player, total, board.length);
  const tile                          = board[player.position];

  // Build the top line shown on every tile result
  let rollLine = `🎲 <@${player.id}> rolled **${d1} + ${d2} = ${total}**`;
  if (goAwarded > 0) {
    if (landedOnGO) {
      rollLine += `  🏁 *Landed on GO! +$${goAwarded}*`;
    } else {
      rollLine += `  ✨ *Passed GO! +$${goAwarded}*`;
    }
  }
  const header = `${rollLine}\n📍 Landed on: **${tile.name}**`;

  // ── Tile dispatch ───────────────────────────────────────────────────────

  // GO — bonus already applied by movePlayer; just announce and advance
  if (tile.type === TILE_TYPES.START) {
    await game.turnMessage.edit({
      content:    `${header}\n💼 Balance: **${player.reputation}**`,
      components: [],
    });
    if (await checkGameOver(interaction, game)) return;
    return advanceTurn(interaction, game);
  }

  // JAIL — pay the fine, stay put (just visiting costs you)
  if (tile.type === TILE_TYPES.JAIL) {
    player.reputation -= JAIL_FINE;
    await game.turnMessage.edit({
      content:
        `${header}\n` +
        `🔒 Landed on **Jail**! Pay the fine: **-$${JAIL_FINE}**\n` +
        `💼 Balance: **${player.reputation}**`,
      components: [],
    });
    if (await checkGameOver(interaction, game)) return;
    return advanceTurn(interaction, game, isBankrupt(player) ? player : null);
  }

  // GO TO JAIL — teleport, no fine here (fine applies when you land on the Jail tile)
  if (tile.type === TILE_TYPES.GO_TO_JAIL) {
    teleportToJail(player, JAIL_POSITION);
    await game.turnMessage.edit({
      content:    `${header}\n🚔 Busted! Sent directly to Jail.\n💼 Balance: **${player.reputation}**`,
      components: [],
    });
    return advanceTurn(interaction, game);
  }

  // FREE PARKING — nothing happens
  if (tile.type === TILE_TYPES.FREE_PARKING) {
    await game.turnMessage.edit({
      content:    `${header}\n🅿️ Free Parking! Kick back — nothing happens.\n💼 Balance: **${player.reputation}**`,
      components: [],
    });
    if (await checkGameOver(interaction, game)) return;
    return advanceTurn(interaction, game);
  }

  // SLOT MACHINE — show Spin/Skip buttons; actual spin handled in slotActions.js
  if (tile.type === TILE_TYPES.SLOT) {
    game.pendingSlot = player.id;
    game.slotHeader  = header;   // saved so slotActions can include the roll info
    await game.turnMessage.edit({
      content:
        `${header}\n` +
        `🎰 **Slot Machine!** Spin for **$150** or skip.\n` +
        `💼 Balance: **${player.reputation}**`,
      components: getSlotButtons(player.id),
    });
    // Turn advances inside slotActions.js after the player chooses
    return;
  }

  // EVENT
  if (tile.type === TILE_TYPES.EVENT) {
    return runEventFlow(interaction, game, player, header);
  }

  // PROPERTY
  if (tile.type === TILE_TYPES.PROPERTY) {
    const ownerId = game.properties[player.position];

    // Unowned → offer to buy
    if (!ownerId) {
      await game.turnMessage.edit({
        content:
          `${header}\n` +
          `💰 **${tile.name}** is for sale!\n` +
          `  Price: **$${tile.price}**  |  Rent: **$${tile.rent}**\n` +
          `💼 Your balance: **${player.reputation}**`,
        components: getPropertyButtons(player.position),
      });
      return;
    }

    // Owned by self → free
    if (ownerId === player.id) {
      await game.turnMessage.edit({
        content:    `${header}\n🏠 You own **${tile.name}**. Nothing to pay.\n💼 Balance: **${player.reputation}**`,
        components: [],
      });
      if (await checkGameOver(interaction, game)) return;
      return advanceTurn(interaction, game);
    }

    // Owned by someone else → pay rent
    const owner = game.players.find(p => p.id === ownerId);
    player.reputation -= tile.rent;
    owner.reputation  += tile.rent;

    const ownerColour = game.propertyColors[player.position] ?? '';
    await game.turnMessage.edit({
      content:
        `${header}\n` +
        `💸 Paid **$${tile.rent}** rent to ${ownerColour} <@${owner.id}>\n` +
        `💼 Balance: **${player.reputation}**`,
      components: [],
    });

    if (await checkGameOver(interaction, game)) return;
    return advanceTurn(interaction, game, isBankrupt(player) ? player : null);
  }

  // Fallback
  await game.turnMessage.edit({ content: header, components: [] });
  if (await checkGameOver(interaction, game)) return;
  return advanceTurn(interaction, game);
}
