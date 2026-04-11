/**
 * Slot Machine System
 * -------------------
 * Uses a weighted tier table to determine outcome.
 * Returns a result object that roll.js uses to update the player and compose a message.
 *
 * Tiers (probability weights, must sum to 100):
 *   JACKPOT   5%   +300
 *   BIG_WIN  10%   +150
 *   WIN      20%   +75
 *   PUSH     25%    0   (break even)
 *   LOSS     25%   -75
 *   BIG_LOSS 15%   -150
 */

const REELS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣", "🔔"];

const TIERS = [
  { label: "JACKPOT",  weight: 5,  delta: 300,  reels: ["💎","💎","💎"], msg: "💎 **JACKPOT!** Triple diamonds! You're rolling in it!" },
  { label: "BIG_WIN",  weight: 10, delta: 150,  reels: ["7️⃣","7️⃣","7️⃣"], msg: "7️⃣ **Big Win!** Triple sevens pay out big!" },
  { label: "WIN",      weight: 20, delta: 75,   reels: null,              msg: "⭐ **Winner!** Two of a kind — not bad!" },
  { label: "PUSH",     weight: 25, delta: 0,    reels: null,              msg: "🔔 **Push.** The house lets this one slide." },
  { label: "LOSS",     weight: 25, delta: -75,  reels: null,              msg: "🍋 **No luck.** The machine swallows your coins." },
  { label: "BIG_LOSS", weight: 15, delta: -150, reels: null,              msg: "💸 **House wins!** The Strip takes its cut." },
];

function weightedRandom(tiers) {
  const total = tiers.reduce((s, t) => s + t.weight, 0);
  let roll    = Math.random() * total;
  for (const tier of tiers) {
    roll -= tier.weight;
    if (roll <= 0) return tier;
  }
  return tiers[tiers.length - 1];
}

function randomReel() {
  return REELS[Math.floor(Math.random() * REELS.length)];
}

function buildReelDisplay(tier) {
  if (tier.reels) return tier.reels;
  // WIN  → two matching + one random different
  if (tier.label === "WIN") {
    const match = randomReel();
    let   other = randomReel();
    while (other === match) other = randomReel();
    return [match, match, other];
  }
  // All other tiers → three distinct random symbols
  const r = [randomReel(), randomReel(), randomReel()];
  // ensure no accidental jackpot display
  while (new Set(r).size === 1) r[2] = randomReel();
  return r;
}

/**
 * Spin the slot machine for a player.
 * Mutates player.reputation.
 * @returns {{ reels: string[], tier: string, delta: number, msg: string }}
 */
export function spinSlot(player) {
  const tier  = weightedRandom(TIERS);
  const reels = buildReelDisplay(tier);
  player.reputation += tier.delta;
  return {
    reels,
    tier:  tier.label,
    delta: tier.delta,
    msg:   tier.msg,
  };
}