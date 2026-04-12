/**
 * boardRenderer.js
 * ----------------
 * Draws coloured player tokens onto the Inferno board image.
 * Returns a PNG Buffer that can be sent as a Discord attachment.
 *
 * Usage:
 *   import { renderBoard } from '../systems/boardRenderer.js';
 *   const buf = await renderBoard(game.players);
 *   // attach as: new AttachmentBuilder(buf, { name: 'board.png' })
 *
 * Requires:  npm install canvas
 * Board image must be at:  <project root>/board.png
 */

import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath }           from 'url';
import path                        from 'path';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const BOARD_PATH  = path.resolve(__dirname, '../../board.png');

// ── Board geometry (derived from 944×940 image) ─────────────────────────────
const BOARD_W  = 944;
const BOARD_H  = 940;
const CORNER   = 130;                          // corner tile size in px
const REG_W    = (BOARD_W - 2 * CORNER) / 9;  // ~76px  per regular tile (horizontal)
const REG_H    = (BOARD_H - 2 * CORNER) / 9;  // ~75.6px per regular tile (vertical)

/**
 * Pre-computed center of every tile (index 0–39).
 * Order matches board.js exactly.
 */
function buildTileCenters() {
  const c = {};

  // ── Bottom row: 0 (GO, bottom-right) → 10 (JAIL, bottom-left) ──
  c[0] = [BOARD_W - CORNER / 2, BOARD_H - CORNER / 2];          // GO
  for (let i = 1; i <= 9; i++) {
    c[i] = [BOARD_W - CORNER - (i - 0.5) * REG_W, BOARD_H - CORNER / 2];
  }
  c[10] = [CORNER / 2, BOARD_H - CORNER / 2];                   // JAIL

  // ── Left column: 11 (Bellagio) → 19 (Wynn), bottom→top ──────
  for (let i = 11; i <= 19; i++) {
    const j = i - 11;
    c[i] = [CORNER / 2, BOARD_H - CORNER - (j + 0.5) * REG_H];
  }
  c[20] = [CORNER / 2, CORNER / 2];                             // FREE PARKING

  // ── Top row: 21 (Encore) → 29 (Fenchurch), left→right ───────
  for (let i = 21; i <= 29; i++) {
    const j = i - 21;
    c[i] = [CORNER + (j + 0.5) * REG_W, CORNER / 2];
  }
  c[30] = [BOARD_W - CORNER / 2, CORNER / 2];                   // GO TO JAIL

  // ── Right column: 31 → 39, top→bottom ────────────────────────
  for (let i = 31; i <= 39; i++) {
    const j = i - 31;
    c[i] = [BOARD_W - CORNER / 2, CORNER + (j + 0.5) * REG_H];
  }

  return c;
}

const TILE_CENTERS = buildTileCenters();

// ── Token appearance ─────────────────────────────────────────────────────────

/** One colour per player slot (up to 5). */
const PLAYER_COLOURS = ['#FF4444', '#44AAFF', '#44FF88', '#FFD700', '#FF44FF'];

const TOKEN_RADIUS   = 12;   // px — radius of each token circle
const TOKEN_FONT     = 'bold 11px Arial';

/**
 * Up to 5 tokens per tile are laid out in a tight cross pattern
 * so they don't overlap:
 *
 *   1 token  →  centre
 *   2 tokens →  left, right
 *   3 tokens →  top-left, top-right, bottom-centre
 *   4 tokens →  corners
 *   5 tokens →  corners + centre
 */
const OFFSETS = [
  [[0, 0]],                                           // 1
  [[-13, 0], [13, 0]],                                // 2
  [[-13, -10], [13, -10], [0, 10]],                   // 3
  [[-13, -10], [13, -10], [-13, 10], [13, 10]],       // 4
  [[-13, -10], [13, -10], [-13, 10], [13, 10], [0, 0]], // 5
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {Array<{ id: string, position: number, reputation: number }>} players
 * @returns {Promise<Buffer>}  PNG image buffer
 */
export async function renderBoard(players) {
  const boardImg = await loadImage(BOARD_PATH);
  const canvas   = createCanvas(BOARD_W, BOARD_H);
  const ctx      = canvas.getContext('2d');

  // Draw the base board
  ctx.drawImage(boardImg, 0, 0, BOARD_W, BOARD_H);

  // Group players by tile position
  /** @type {Map<number, number[]>} position → array of playerIndexes */
  const byTile = new Map();
  players.forEach((p, idx) => {
    if (!byTile.has(p.position)) byTile.set(p.position, []);
    byTile.get(p.position).push(idx);
  });

  // Draw tokens
  for (const [tileIdx, playerIndexes] of byTile) {
    const [cx, cy] = TILE_CENTERS[tileIdx] ?? [BOARD_W / 2, BOARD_H / 2];
    const count    = playerIndexes.length;
    const offsets  = OFFSETS[Math.min(count, 5) - 1];

    playerIndexes.forEach((playerIdx, slot) => {
      const [ox, oy] = offsets[slot] ?? [0, 0];
      const tx = cx + ox;
      const ty = cy + oy;
      const colour = PLAYER_COLOURS[playerIdx % PLAYER_COLOURS.length];

      // Token shadow
      ctx.shadowColor   = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur    = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Token circle
      ctx.beginPath();
      ctx.arc(tx, ty, TOKEN_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.fill();

      // White border
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'white';
      ctx.lineWidth   = 2;
      ctx.stroke();

      // Player number label (1-based)
      ctx.font         = TOKEN_FONT;
      ctx.fillStyle    = 'white';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor  = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur   = 3;
      ctx.fillText(String(playerIdx + 1), tx, ty);

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur  = 0;
    });
  }

  return canvas.toBuffer('image/png');
}