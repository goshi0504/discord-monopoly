/**
 * boardRenderer.js
 *
 * Install:  npm install @napi-rs/canvas
 *
 * Key fixes vs previous version:
 *   1. Board image is loaded ONCE at startup and cached — no per-render disk I/O
 *   2. canvas.encode('png') used instead of canvas.toBuffer() — async, non-blocking
 *   3. GIF rendering removed (was causing hangs) — static PNG only for now
 */

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { fileURLToPath }           from 'url';
import path                        from 'path';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const BOARD_PATH = path.resolve(__dirname, '../../board.png');

// ── Board geometry (944×940) ─────────────────────────────────────────────────
const BOARD_W = 944;
const BOARD_H = 940;
const CORNER  = 130;
const REG_W   = (BOARD_W - 2 * CORNER) / 9;
const REG_H   = (BOARD_H - 2 * CORNER) / 9;

// ── Cached board image — loaded once, reused forever ─────────────────────────
let _boardImg = null;
async function getBoardImage() {
  if (!_boardImg) {
    _boardImg = await loadImage(BOARD_PATH);
  }
  return _boardImg;
}

// ── Tile centers ─────────────────────────────────────────────────────────────
function buildTileCenters() {
  const c = {};
  c[0] = [BOARD_W - CORNER / 2, BOARD_H - CORNER / 2];
  for (let i = 1; i <= 9; i++)
    c[i] = [BOARD_W - CORNER - (i - 0.5) * REG_W, BOARD_H - CORNER / 2];
  c[10] = [CORNER / 2, BOARD_H - CORNER / 2];
  for (let i = 11; i <= 19; i++)
    c[i] = [CORNER / 2, BOARD_H - CORNER - (i - 11 + 0.5) * REG_H];
  c[20] = [CORNER / 2, CORNER / 2];
  for (let i = 21; i <= 29; i++)
    c[i] = [CORNER + (i - 21 + 0.5) * REG_W, CORNER / 2];
  c[30] = [BOARD_W - CORNER / 2, CORNER / 2];
  for (let i = 31; i <= 39; i++)
    c[i] = [BOARD_W - CORNER / 2, CORNER + (i - 31 + 0.5) * REG_H];
  return c;
}
const TILE_CENTERS = buildTileCenters();

// ── Ownership bar geometry ───────────────────────────────────────────────────
const BAR_THICK = 8;
const BAR_COVER = 0.80;
const CORNER_TILES = new Set([0, 10, 20, 30]);

function ownershipBarRect(tileIdx) {
  if (CORNER_TILES.has(tileIdx)) return null;
  const [cx, cy] = TILE_CENTERS[tileIdx];
  if (tileIdx >= 1  && tileIdx <= 9)  { const w = REG_W * BAR_COVER; return { x: cx - w/2, y: BOARD_H - BAR_THICK, w, h: BAR_THICK }; }
  if (tileIdx >= 11 && tileIdx <= 19) { const h = REG_H * BAR_COVER; return { x: 0, y: cy - h/2, w: BAR_THICK, h }; }
  if (tileIdx >= 21 && tileIdx <= 29) { const w = REG_W * BAR_COVER; return { x: cx - w/2, y: 0, w, h: BAR_THICK }; }
  if (tileIdx >= 31 && tileIdx <= 39) { const h = REG_H * BAR_COVER; return { x: BOARD_W - BAR_THICK, y: cy - h/2, w: BAR_THICK, h }; }
  return null;
}

// ── Player colours ───────────────────────────────────────────────────────────
export const PLAYER_COLOURS = ['#FF4444', '#44AAFF', '#44FF88', '#FFD700', '#FF44FF'];

// ── Token layout offsets ─────────────────────────────────────────────────────
const TOKEN_R = 12;
const OFFSETS = [
  [[0, 0]],
  [[-13, 0], [13, 0]],
  [[-13, -10], [13, -10], [0, 10]],
  [[-13, -10], [13, -10], [-13, 10], [13, 10]],
  [[-13, -10], [13, -10], [-13, 10], [13, 10], [0, 0]],
];

// ── Core draw ────────────────────────────────────────────────────────────────
function drawBoard(ctx, boardImg, players, properties, playerIdToIdx) {
  // Base board image
  ctx.drawImage(boardImg, 0, 0, BOARD_W, BOARD_H);

  // Ownership colour bars on outer tile edges
  for (const [key, ownerId] of Object.entries(properties)) {
    const rect = ownershipBarRect(parseInt(key, 10));
    if (!rect) continue;
    const idx = playerIdToIdx.get(ownerId);
    if (idx === undefined) continue;
    ctx.fillStyle = PLAYER_COLOURS[idx % PLAYER_COLOURS.length];
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  // Player tokens
  const byTile = new Map();
  players.forEach((p, idx) => {
    if (!byTile.has(p.position)) byTile.set(p.position, []);
    byTile.get(p.position).push(idx);
  });

  for (const [tileIdx, idxList] of byTile) {
    const center  = TILE_CENTERS[tileIdx];
    if (!center) continue;                          // guard against invalid position
    const [cx, cy] = center;
    const offsets  = OFFSETS[Math.min(idxList.length, 5) - 1];

    idxList.forEach((pIdx, slot) => {
      const [ox, oy] = offsets[slot] ?? [0, 0];
      const tx = cx + ox;
      const ty = cy + oy;
      const col = PLAYER_COLOURS[pIdx % PLAYER_COLOURS.length];

      // Drop shadow
      ctx.shadowColor   = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur    = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Token circle
      ctx.beginPath();
      ctx.arc(tx, ty, TOKEN_R, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();

      // White border
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'white';
      ctx.lineWidth   = 2;
      ctx.stroke();

      // Number label
      ctx.font         = 'bold 11px Arial';
      ctx.fillStyle    = 'white';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor  = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur   = 3;
      ctx.fillText(String(pIdx + 1), tx, ty);

      // Reset shadow
      ctx.shadowColor  = 'transparent';
      ctx.shadowBlur   = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Render the current board state as a PNG buffer.
 * Uses cached board image and async encode to avoid blocking the event loop.
 *
 * @param {object[]} players     - array of { id, position }
 * @param {object}   properties  - { [tileIndex]: playerId }
 * @returns {Promise<Buffer>}
 */
export async function renderBoard(players, properties = {}) {
  const boardImg      = await getBoardImage();
  const canvas        = createCanvas(BOARD_W, BOARD_H);
  const ctx           = canvas.getContext('2d');
  const playerIdToIdx = new Map(players.map((p, i) => [p.id, i]));

  drawBoard(ctx, boardImg, players, properties, playerIdToIdx);

  // encode() is async and non-blocking — toBuffer() is sync and blocks the event loop
  return canvas.encode('png');
}