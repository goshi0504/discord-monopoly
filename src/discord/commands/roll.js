import { getGame, movePlayer, teleportToJail, isBankrupt } from '../../engine/gameManager.js';
import { board, JAIL_POSITION }                            from '../../engine/board.js';
import { rollDice }                                        from '../../engine/dice.js';
import { advanceTurn }                                     from '../../engine/turnManager.js';
import { spinSlot }                                        from '../../systems/slotSystem.js';
import { runEventFlow }                                    from './eventHandler.js';
import { getPropertyButtons }                              from '../components/propertyButtons.js';
import { TILE_TYPES }                                      from '../../types/Tile.js';

function fmtDelta(delta) {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '±0';
}

const delay = ms => new Promise(r => setTimeout(r, ms));

const SPIN_REELS = ['🍒','🍋','🍊','🍇','⭐','💎','7️⃣','🔔'];
const rand       = () => SPIN_REELS[Math.floor(Math.random() * SPIN_REELS.length)];

async function animateSlot(game, result, header) {
  for (let i = 0; i < 4; i++) {
    await delay(550);
    const isLast  = i === 3;
    const reelStr = isLast
      ? `**[ ${result.reels[0]} | ${result.reels[1]} | ${result.reels[2]} ]**`
      : `[ ${rand()} | ${rand()} | ${rand()} ]`;
    await game.turnMessage.edit({
      content:
        `${header}\n🎰 ${isLast ? '' : 'Spinning... '}${reelStr}` +
        (isLast ? `\n${result.msg}\n💼 ${fmtDelta(result.delta)} rep  •  Balance: ${result.balance}` : ''),
      components: [],
    });
  }
}

export async function handleRoll(interaction) {
  const game   = getGame(interaction.guildId);
  const player = game?.players[game.currentTurn];

  if (!game?.started) {
    return interaction.reply({ content: '❌ No active game.', ephemeral: true });
  }
  if (interaction.user.id !== player.id) {
    return interaction.reply({ content: '⏳ It\'s not your turn!', ephemeral: true });
  }

  // Acknowledge the button click silently so Discord doesn't show a failure state.
  // We do NOT deferUpdate because we're editing game.turnMessage directly — 
  // deferUpdate would expect us to later call interaction.editReply() which we never do.
  await interaction.reply({ content: '🎲 Rolling…', ephemeral: true });

  // ── roll & move ──
  const { d1, d2, total } = rollDice();
  const passedGO          = movePlayer(player, total, board.length);
  const tile              = board[player.position];

  const rollLine =
    `🎲 <@${player.id}> rolled **${d1} + ${d2} = ${total}**` +
    (passedGO ? '  ✨ *Passed GO! +200 rep*' : '');
  const header = `${rollLine}\n📍 Landed on: **${tile.name}**`;

  // ── tile dispatch ──────────────────────────────────────────────────────────

  if (tile.type === TILE_TYPES.START) {
    await game.turnMessage.edit({
      content:    `${header}\n✨ Landed on GO! +200 rep  •  Balance: ${player.reputation}`,
      components: [],
    });
    return advanceTurn(interaction, game);
  }

  if (tile.type === TILE_TYPES.JAIL) {
    await game.turnMessage.edit({
      content:    `${header}\n🔒 Just visiting Jail. Safe for now.`,
      components: [],
    });
    return advanceTurn(interaction, game);
  }

  if (tile.type === TILE_TYPES.GO_TO_JAIL) {
    teleportToJail(player, JAIL_POSITION);
    await game.turnMessage.edit({
      content:    `${header}\n🚔 Busted! Sent directly to Jail.`,
      components: [],
    });
    return advanceTurn(interaction, game);
  }

  if (tile.type === TILE_TYPES.FREE_PARKING) {
    await game.turnMessage.edit({
      content:    `${header}\n🅿️ Free Parking! Kick back and relax — nothing happens.`,
      components: [],
    });
    return advanceTurn(interaction, game);
  }

  if (tile.type === TILE_TYPES.SLOT) {
    const result   = spinSlot(player);
    result.balance = player.reputation;
    await animateSlot(game, result, header);
    return advanceTurn(interaction, game, isBankrupt(player) ? player : null);
  }

  if (tile.type === TILE_TYPES.EVENT) {
    return runEventFlow(interaction, game, player, header);
  }

  if (tile.type === TILE_TYPES.PROPERTY) {
    const ownerId = game.properties[player.position];

    if (!ownerId) {
      await game.turnMessage.edit({
        content:
          `${header}\n` +
          `💰 **For sale:** ${tile.price} rep  |  Rent: ${tile.rent} rep\n` +
          `💼 Your balance: ${player.reputation}`,
        components: getPropertyButtons(player.position),
      });
      return;
    }

    if (ownerId === player.id) {
      await game.turnMessage.edit({
        content:    `${header}\n🏠 You own **${tile.name}**. Nothing to pay.`,
        components: [],
      });
      return advanceTurn(interaction, game);
    }

    const owner = game.players.find(p => p.id === ownerId);
    player.reputation -= tile.rent;
    owner.reputation  += tile.rent;

    await game.turnMessage.edit({
      content:
        `${header}\n` +
        `💸 Paid **${tile.rent} rep** rent to <@${owner.id}>\n` +
        `💼 Balance: ${player.reputation}`,
      components: [],
    });

    return advanceTurn(interaction, game, isBankrupt(player) ? player : null);
  }

  // Fallback
  await game.turnMessage.edit({ content: header, components: [] });
  return advanceTurn(interaction, game);
}
