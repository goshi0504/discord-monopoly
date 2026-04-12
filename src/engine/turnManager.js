import { AttachmentBuilder }                       from 'discord.js';
import { getRollButton }                           from '../discord/components/turnButtons.js';
import { getJailButtons }                          from '../discord/components/jailButtons.js';
import { getRichestPlayer, deleteGame, MAX_LAPS }  from './gameManager.js';
import { renderBoard }                             from '../systems/boardRenderer.js';
import { buildLeaderboard }                        from '../systems/leaderboard.js';

async function makeBoardAttachment(players, properties) {
  try {
    const buf = await renderBoard(players, properties);
    return new AttachmentBuilder(buf, { name: 'board.png' });
  } catch (err) {
    console.error('[boardRenderer] static render failed:', err.message);
    return null;
  }
}

async function sendGameOver(channel, game, reason) {
  const board   = await import('../engine/board.js').then(m => m.board);
  const content = buildLeaderboard(game.players, game.properties, reason);
  const file    = await makeBoardAttachment(game.players, game.properties);
  deleteGame(channel.guildId ?? channel.guild?.id);
  return channel.send({ content, files: file ? [file] : [], components: [] });
}

export async function advanceTurn(interaction, game, bankruptPlayer = null) {
  const channel = game.turnMessage?.channel;

  // ── Bankruptcy end ──────────────────────────────────────────────────────────
  if (bankruptPlayer) {
    const reason = `💀 <@${bankruptPlayer.id}> has gone **bankrupt** — the Inferno claims another soul!`;
    if (channel) return sendGameOver(channel, game, reason);
    return interaction.followUp({ content: reason });
  }

  // ── Lap limit end ───────────────────────────────────────────────────────────
  const lapLeader = game.players.find(p => p.laps >= MAX_LAPS);
  if (lapLeader) {
    const reason = `🏁 <@${lapLeader.id}> completed **${MAX_LAPS} laps** — the game is over!`;
    if (channel) return sendGameOver(channel, game, reason);
    return interaction.followUp({ content: reason });
  }

  // ── Advance turn ────────────────────────────────────────────────────────────
  game.currentTurn = (game.currentTurn + 1) % game.players.length;
  const next = game.players[game.currentTurn];

  if (!channel) {
    console.error('[advanceTurn] game.turnMessage.channel is missing.');
    return;
  }

  const file = await makeBoardAttachment(game.players, game.properties);

  let content, components;
  if (next.inJail) {
    content    = `🔒 <@${next.id}>'s turn — you're in **Jail!**\nPay **150 rep** to escape or roll doubles.`;
    components = getJailButtons(next.id);
  } else {
    content    = `🎰 <@${next.id}>'s turn — press Roll when ready!`;
    components = getRollButton(next.id);
  }

  const msg = await channel.send({
    content,
    components,
    files: file ? [file] : [],
  });

  game.turnMessage = msg;
}