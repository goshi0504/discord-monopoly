/**
 * Event System
 * ------------
 * When a player lands on an EVENT tile a random card is drawn.
 * Each card has flavour text and a delta applied to reputation.
 * Positive delta  → player collects from bank.
 * Negative delta  → player pays to bank (no other player involved).
 */

const EVENT_CARDS = [
  // ── LOSSES ───────────────────────────────────────────────────────────────
  {
    title: "Hush Money",
    description:
      "A witness saw something they shouldn't have at The Flamingo. " +
      "Buy their silence.",
    delta: -100,
    emoji: "🤫",
  },
  {
    title: 'The "Desert Ride" Fee',
    description:
      "You were taken for a one-way ride to the outskirts of town to discuss your debts. " +
      "You survived, but they took your jewelry.",
    delta: -200,
    emoji: "🚗",
  },
  {
    title: "Bad Tip",
    description:
      "You loudly bragged about a hot stock tip at the Peppermill. " +
      "The tip was cold. Very cold.",
    delta: -125,
    emoji: "📉",
  },
  {
    title: "Broken Slot",
    description:
      "You found a glitchy slot machine — and so did security. " +
      "Pay a fine before they call the feds.",
    delta: -75,
    emoji: "🚨",
  },
  {
    title: "Tab at the Bellagio Bar",
    description:
      "You don't remember ordering that much, but the receipt says otherwise. " +
      "Settle up.",
    delta: -90,
    emoji: "🍸",
  },

  // ── GAINS ────────────────────────────────────────────────────────────────
  {
    title: "Smuggling Bonus",
    description:
      "You utilised a hidden tunnel under the Strip to move illicit goods past the police.",
    delta: 150,
    emoji: "🕳️",
  },
  {
    title: "Elvis Presley Look-Alike Contest Winner!",
    description:
      "Your performance at the Vegas Chapel was legendary. The crowd threw tips! " +
      "Collect from the bank.",
    delta: 50,
    emoji: "🎸",
  },
  {
    title: 'Lucky "Black 22"!',
    description:
      "Your last-minute bet on the roulette wheel at Rio pays off. " +
      "Collect from the bank.",
    delta: 175,
    emoji: "🎡",
  },
  {
    title: "Comp Room Upgrade",
    description:
      "The pit boss owes you a favour. Your penthouse suite is comped for the weekend. " +
      "Collect the saved cash.",
    delta: 100,
    emoji: "🏨",
  },
  {
    title: "Card Counting Windfall",
    description:
      "You kept your sunglasses on and your counting discreet. " +
      "The blackjack table pays out handsomely before the eye-in-the-sky catches on.",
    delta: 200,
    emoji: "🃏",
  },
  {
    title: "Vintage Coin Find",
    description:
      "You found a forgotten silver dollar wedged in a vintage slot machine at Fremont Street. " +
      "The collector's value is surprisingly high.",
    delta: 60,
    emoji: "🪙",
  },

  // ── NEUTRAL / TWIST ──────────────────────────────────────────────────────
  {
    title: "The Pit Boss Shuffle",
    description:
      "The casino reshuffles its loyalty tiers. " +
      "Your status resets but you're handed a consolation voucher.",
    delta: 0,
    emoji: "🔀",
  },
];

/**
 * Draw a random event card and apply it to the player.
 * Mutates player.reputation.
 * @returns {{ title, description, delta, emoji }}
 */
export function drawEvent(player) {
  const card = EVENT_CARDS[Math.floor(Math.random() * EVENT_CARDS.length)];
  player.reputation += card.delta;
  return card;
}