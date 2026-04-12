/**
 * boardRenderer.js
 *
 * Install:
 *   npm install @napi-rs/canvas gif-encoder-2
 *
 * gif-encoder-2 is a pure-JS GIF encoder with no native dependencies.
 * @napi-rs/canvas ships prebuilt binaries — no compilation needed.
 */

import { createCanvas, loadImage } from '@napi-rs/canvas';
import GIFEncoder                  from 'gif-encoder-2';
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
const CORNERS   = new Set([0, 10, 20, 30]);

function ownershipBarRect(tileIdx) {
  if (CORNERS.has(tileIdx)) return null;
  const [cx, cy] = TILE_CENTERS[tileIdx];
  if (tileIdx >= 1  && tileIdx <= 9)  { const w = REG_W * BAR_COVER; return { x: cx - w/2, y: BOARD_H - BAR_THICK, w, h: BAR_THICK }; }
  if (tileIdx >= 11 && tileIdx <= 19) { const h = REG_H * BAR_COVER; return { x: 0, y: cy - h/2, w: BAR_THICK, h }; }
  if (tileIdx >= 21 && tileIdx <= 29) { const w = REG_W * BAR_COVER; return { x: cx - w/2, y: 0, w, h: BAR_THICK }; }
  if (tileIdx >= 31 && tileIdx <= 39) { const h = REG_H * BAR_COVER; return { x: BOARD_W - BAR_THICK, y: cy - h/2, w: BAR_THICK, h }; }
  return null;
}

// ── Player colours ───────────────────────────────────────────────────────────
export const PLAYER_COLOURS = ['#FF4444', '#44AAFF', '#44FF88', '#FFD700', '#FF44FF'];

// ── Token layout ─────────────────────────────────────────────────────────────
const TOKEN_R = 12;
const OFFSETS = [
  [[0, 0]],
  [[-13, 0], [13, 0]],
  [[-13, -10], [13, -10], [0, 10]],
  [[-13, -10], [13, -10], [-13, 10], [13, 10]],
  [[-13, -10], [13, -10], [-13, 10], [13, 10], [0, 0]],
];

// ── Draw a full board frame onto ctx ─────────────────────────────────────────
function drawFrame(ctx, boardImg, players, properties, playerIdToIdx, highlightPos = null) {
  ctx.drawImage(boardImg, 0, 0, BOARD_W, BOARD_H);

  // Ownership bars
  for (const [key, ownerId] of Object.entries(properties)) {
    const rect = ownershipBarRect(parseInt(key, 10));
    if (!rect) continue;
    const idx = playerIdToIdx.get(ownerId);
    if (idx === undefined) continue;
    ctx.fillStyle = PLAYER_COLOURS[idx % PLAYER_COLOURS.length];
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  // Highlight glow on current tile
  if (highlightPos !== null) {
    const [cx, cy] = TILE_CENTERS[highlightPos];
    ctx.beginPath();
    ctx.arc(cx, cy, TOKEN_R + 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,200,0.4)';
    ctx.fill();
  }

  // Tokens grouped by tile
  const byTile = new Map();
  players.forEach((p, idx) => {
    if (!byTile.has(p.position)) byTile.set(p.position, []);
    byTile.get(p.position).push(idx);
  });

  for (const [tileIdx, idxList] of byTile) {
    const [cx, cy] = TILE_CENTERS[tileIdx] ?? [BOARD_W / 2, BOARD_H / 2];
    const offsets  = OFFSETS[Math.min(idxList.length, 5) - 1];
    idxList.forEach((pIdx, slot) => {
      const [ox, oy] = offsets[slot] ?? [0, 0];
      const tx = cx + ox, ty = cy + oy;
      const col = PLAYER_COLOURS[pIdx % PLAYER_COLOURS.length];

      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 6; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
      ctx.beginPath(); ctx.arc(tx, ty, TOKEN_R, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();

      ctx.font = 'bold 11px Arial'; ctx.fillStyle = 'white';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 3;
      ctx.fillText(String(pIdx + 1), tx, ty);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    });
  }
}

// ── Step path (handles wrap-around) ──────────────────────────────────────────
function buildPath(from, to, boardLength) {
  const steps = [];
  let pos = from;
  while (pos !== to) { pos = (pos + 1) % boardLength; steps.push(pos); }
  return steps;
}

// ── Collect GIF encoder output into a Buffer ─────────────────────────────────
function encoderToBuffer(encoder) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    encoder.on('data',  c => chunks.push(c));
    encoder.on('end',   () => resolve(Buffer.concat(chunks)));
    encoder.on('error', reject);
  });
}

// ── Public: static PNG ───────────────────────────────────────────────────────
export async function renderBoard(players, properties = {}) {
  const boardImg      = await loadImage(BOARD_PATH);
  const canvas        = createCanvas(BOARD_W, BOARD_H);
  const ctx           = canvas.getContext('2d');
  const playerIdToIdx = new Map(players.map((p, i) => [p.id, i]));
  drawFrame(ctx, boardImg, players, properties, playerIdToIdx);
  return canvas.toBuffer('image/png');
}

// ── Public: animated GIF ─────────────────────────────────────────────────────
export async function renderMoveGif(
  players, properties = {},
  movingPlayerIdx, fromPos, toPos,
  boardLength = 40,
) {
  const boardImg      = await loadImage(BOARD_PATH);
  const canvas        = createCanvas(BOARD_W, BOARD_H);
  const ctx           = canvas.getContext('2d');
  const playerIdToIdx = new Map(players.map((p, i) => [p.id, i]));
  const snapshots     = players.map(p => ({ ...p }));
  const steps         = buildPath(fromPos, toPos, boardLength);

  // gif-encoder-2 setup
  const encoder = new GIFEncoder(BOARD_W, BOARD_H, 'neuquant', true);
  encoder.setRepeat(0);    // 0 = play once, -1 = loop forever
  encoder.setQuality(20);  // 1–30, higher = faster encode / lower quality
  encoder.setDelay(130);
  encoder.start();

  const bufPromise = encoderToBuffer(encoder);

  // Frame 0 — start tile (300ms)
  encoder.setDelay(300);
  snapshots[movingPlayerIdx].position = fromPos;
  drawFrame(ctx, boardImg, snapshots, properties, playerIdToIdx, fromPos);
  encoder.addFrame(ctx.canvas);

  // Intermediate hops — 130ms each
  encoder.setDelay(130);
  for (const stepPos of steps.slice(0, -1)) {
    snapshots[movingPlayerIdx].position = stepPos;
    drawFrame(ctx, boardImg, snapshots, properties, playerIdToIdx, stepPos);
    encoder.addFrame(ctx.canvas);
  }

  // Final frame — long freeze so player can read the tile (1800ms)
  encoder.setDelay(1800);
  snapshots[movingPlayerIdx].position = toPos;
  drawFrame(ctx, boardImg, snapshots, properties, playerIdToIdx, toPos);
  encoder.addFrame(ctx.canvas);

  encoder.finish();
  return bufPromise;
}