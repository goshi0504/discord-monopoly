import { getGame, movePlayer, teleportToJail, isBankrupt } from '../../engine/gameManager.js';
import { board, JAIL_POSITION }                            from '../../engine/board.js';
import { rollDice }                                        from '../../engine/dice.js';
import { advanceTurn }                                     from '../../engine/turnManager.js';
import { spinSlot }                                        from '../../systems/slotSystem.js';
import { drawEvent }                                       from '../../systems/eventSystem.js';
import { getPropertyButtons }                              from '../components/propertyButtons.js';
import { TILE_TYPES }                                      from '../../types/Tile.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDelta(delta) {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return "±0";
}

/**
 * Edit the stored turn message in place.
 * Falls back to interaction.update if turnMessage isn't available.
 */
async function editTurnMessage(interaction, game, data) {
  try {
    if (game.turnMessage) {
      return await game.turnMessage.edit(data);
    }
    return await interaction.update(data);
  } catch {
    return await interaction.update(data);
  }
}

// ─── slot animation ───────────────────────────────────────────────────────────

const SPIN_REELS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣", "🔔"];
const rand       = () => SPIN_REELS[Math.floor(Math.random() * SPIN_REELS.length)];
const delay      = ms => new Promise(r => setTimeout(r, ms));

async function animateSlot(game, interaction, result, header) {
  const frames = 4;

  // First acknowledge the button (removes the spinner on Discord's end)
  await interaction.deferUpdate();

  for (let i = 0; i < frames; i++) {
    await delay(550);
    const isLast = i === frames - 1;
    const reelStr = isLast
      ? `**[ ${result.reels[0]} | ${result.reels[1]} | ${result.reels[2]} ]**`
      : `[ ${rand()} | ${rand()} | ${rand()} ]`;

    await game.turnMessage.edit({
      content:
        `${header}\n` +
        `🎰 ${isLast ? '' : 'Spinning... '}${reelStr}\n` +
        (isLast ? `${result.msg}\n💼 ${fmtDelta(result.delta)} rep  •  Balance: ${result.balance}` : ''),
      components: [],
    });
  }
}

// ─── main handler ─────────────────────────────────────────────────────────────

export async function handleRoll(interaction) {
  const game   = getGame(interaction.guildId);
  const player = game?.players[game.currentTurn];

  if (!game?.started) {
    return interaction.reply({ content: "❌ No active game.", ephemeral: true });
  }
  if (interaction.user.id !== player.id) {
    return interaction.reply({ content: "⏳ It's not your turn!", ephemeral: true });
  }

  // ── roll dice & move ──
  const { d1, d2, total } = rollDice();
  const passedGO          = movePlayer(player, total, board.length);
  const tile              = board[player.position];

  const rollLine =
    `🎲 <@${player.id}> rolled **${d1} + ${d2} = ${total}**` +
    (passedGO ? "  ✨ *Passed GO! +200 rep*" : "");

  const header = `${rollLine}\n📍 Landed on: **${tile.name}**`;

  // ── tile dispatch ──────────────────────────────────────────────────────────

  // START
  if (tile.type === TILE_TYPES.START) {
    await editTurnMessage(interaction, game, {
      content:    `${header}\n✨ Landed on GO! +200 rep  •  Balance: ${player.reputation}`,
      components: [],
    });
    return advanceTurn(interaction, game);
  }

  // JAIL (visiting)
  if (tile.type === TILE_TYPES.JAIL) {
    await editTurnMessage(interaction, game, {
      content:    `${header}\n🔒 Just visiting Jail. Nothing happens.`,
      components: [],
    });
    return advanceTurn(interaction, game);
  }

  // GO TO JAIL
  if (tile.type === TILE_TYPES.GO_TO_JAIL) {
    teleportToJail(player, JAIL_POSITION);
    await editTurnMessage(interaction, game, {
      content:    `${header}\n🚔 Sent to Jail!`,
      components: [],
    });
    return advanceTurn(interaction, game);
  }

  // SLOT MACHINE
  if (tile.type === TILE_TYPES.SLOT) {
    const result    = spinSlot(player);
    result.balance  = player.reputation;
    await animateSlot(game, interaction, result, header);
    const bankrupt  = isBankrupt(player) ? player : null;
    return advanceTurn(interaction, game, bankrupt);
  }

  // EVENT
  if (tile.type === TILE_TYPES.EVENT) {
    const card = drawEvent(player);
    const sign = card.delta >= 0 ? "💚" : "🔴";
    await editTurnMessage(interaction, game, {
      content:
        `${header}\n\n` +
        `${card.emoji} **${card.title}**\n` +
        `_${card.description}_\n` +
        `${sign} **${fmtDelta(card.delta)} rep**  •  Balance: ${player.reputation}`,
      components: [],
    });
    const bankrupt = isBankrupt(player) ? player : null;
    return advanceTurn(interaction, game, bankrupt);
  }

  // PROPERTY
  if (tile.type === TILE_TYPES.PROPERTY) {
    const ownerId = game.properties[player.position];

    // Unowned — offer buy/skip
    if (!ownerId) {
      await editTurnMessage(interaction, game, {
        content:
          `${header}\n` +
          `💰 **For sale:** ${tile.price} rep  |  Rent: ${tile.rent} rep\n` +
          `💼 Your balance: ${player.reputation}`,
        components: getPropertyButtons(player.position),
      });
      return; // wait for buy/skip button
    }

    // Own property
    if (ownerId === player.id) {
      await editTurnMessage(interaction, game, {
        content:    `${header}\n🏠 You own **${tile.name}**. Nothing to pay.`,
        components: [],
      });
      return advanceTurn(interaction, game);
    }

    // Someone else's — pay rent
    const owner = game.players.find(p => p.id === ownerId);
    player.reputation -= tile.rent;
    owner.reputation  += tile.rent;

    await editTurnMessage(interaction, game, {
      content:
        `${header}\n` +
        `💸 Paid **${tile.rent} rep** rent to <@${owner.id}>\n` +
        `💼 Balance: ${player.reputation}`,
      components: [],
    });

    const bankrupt = isBankrupt(player) ? player : null;
    return advanceTurn(interaction, game, bankrupt);
  }

  // Fallback
  await editTurnMessage(interaction, game, { content: header, components: [] });
  return advanceTurn(interaction, game);
}