// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/core/economy.js
//  Récompenses, missions, packs, gemmes
// ══════════════════════════════════════════════════════════════

// ─── RÉCOMPENSES PAR VAGUE ───────────────────────────────────
// gold   = or gagné à la victoire
// frags  = fragments
// xp     = XP compte
// farming (monde non-frontier) → ×0.4

export function getWaveRewards(world, floor) {
  const isBoss   = floor >= 11;
  const baseGold = Math.floor(50 * Math.pow(1.35, (world - 1))) * (isBoss ? 5 : 1);
  const baseFrags = (isBoss ? 15 : 2) + (world - 1) * (isBoss ? 5 : 1);
  const baseXP   = (isBoss ? 100 : 20) + (world - 1) * 10;

  return {
    gold:  Math.round(baseGold  * (floor / 10)),
    frags: Math.round(baseFrags),
    xp:    Math.round(baseXP),
  };
}

export function getFarmingRewards(world, floor) {
  const r = getWaveRewards(world, floor);
  return {
    gold:  Math.round(r.gold  * 0.4),
    frags: Math.round(r.frags * 0.4),
    xp:    Math.round(r.xp   * 0.4),
  };
}

// ─── IDLE RATE ───────────────────────────────────────────────
// or par seconde en idle, basé sur le monde débloqué + talents
export function calcIdleRate(currentWorld, talentsUnlocked) {
  const base    = 0.1 * Math.pow(1.5, currentWorld - 1);
  const bonus   = talentsUnlocked.includes('t5') ? 0.5 : 0;
  return Math.round((base * (1 + bonus)) * 100) / 100;
}

// ─── PACKS ───────────────────────────────────────────────────
export const PACK_CONFIG = {
  basic: {
    id:    'basic',
    name:  'Pack Commun',
    emoji: '📦',
    desc:  '3 Champions — idéal pour débuter',
    cost:  { type: 'gold', amount: 100 },
    count: 3,
    rates: { C: 60, R: 28, E: 9, L: 2, M: 1 },
  },
  rare: {
    id:    'rare',
    name:  'Pack Rare',
    emoji: '🎁',
    desc:  '3 Champions — meilleures chances de raretés',
    cost:  { type: 'gold', amount: 300 },
    count: 3,
    rates: { C: 30, R: 42, E: 19, L: 7, M: 2 },
  },
  premium: {
    id:    'premium',
    name:  'Pack Premium',
    emoji: '💎',
    desc:  '5 Champions — le meilleur ratio qualité/coût',
    cost:  { type: 'gems', amount: 20 },
    count: 5,
    rates: { C: 15, R: 33, E: 30, L: 17, M: 5 },
  },
};

// Pity : épique garanti /10 pulls, légendaire garanti /50 pulls
export const PITY_EPIC      = 10;
export const PITY_LEGENDARY = 50;

// ─── BOUTIQUE GEMMES (Stripe) ─────────────────────────────────
export const GEM_PACKS = [
  { id: 'g1', gems: 60,   price: 0.99,  bonus: '',      emoji: '💎' },
  { id: 'g2', gems: 160,  price: 1.99,  bonus: '+15%',  emoji: '💎💎' },
  { id: 'g3', gems: 340,  price: 3.99,  bonus: '+20%',  emoji: '💎💎💎' },
  { id: 'g4', gems: 900,  price: 9.99,  bonus: '+50%',  emoji: '🌟' },
  { id: 'g5', gems: 2000, price: 19.99, bonus: '+100%', emoji: '🏆' },
];

// ─── RÉCOMPENSES JOURNALIÈRES (cycle 7 jours) ─────────────────
export const DAILY_REWARDS = [
  { day: 1, icon: '🪙', reward: { gold: 100 },   label: '100 Or' },
  { day: 2, icon: '🔩', reward: { frags: 10 },   label: '10 Fragments' },
  { day: 3, icon: '🪙', reward: { gold: 250 },   label: '250 Or' },
  { day: 4, icon: '💎', reward: { gems: 5 },     label: '5 Gemmes' },
  { day: 5, icon: '🔩', reward: { frags: 25 },   label: '25 Fragments' },
  { day: 6, icon: '🪙', reward: { gold: 500 },   label: '500 Or' },
  { day: 7, icon: '🎁', reward: { gems: 15, gold: 500 }, label: '15 Gemmes + 500 Or' },
];

// ─── MISSIONS ────────────────────────────────────────────────
export const MISSIONS_DEFAULT = [
  { id: 'm1', type: 'flips',      target: 20,  reward: { tokens: 10, gold: 50 },  icon: '🥏', name: 'Flipper 20 fois' },
  { id: 'm2', type: 'packs',      target: 1,   reward: { tokens: 15, gems: 2 },   icon: '🎁', name: 'Ouvrir 1 pack' },
  { id: 'm3', type: 'waves',      target: 3,   reward: { tokens: 20, gold: 150 }, icon: '⚔️', name: 'Gagner 3 vagues' },
  { id: 'm4', type: 'gold_earned',target: 500, reward: { tokens: 10, frags: 5 },  icon: '🪙', name: 'Gagner 500 or' },
];

// ─── FUSION ──────────────────────────────────────────────────
// 3 copies d'un même pog → 1 pog rareté supérieure + 10 fragments
export const FUSION_COST   = 3;
export const FUSION_FRAGS  = 10;
export const FUSION_RARITY = { C: 'R', R: 'E', E: 'L', L: 'M', M: 'M' };

// ─── IDLE OFFLINE ─────────────────────────────────────────────
export const OFFLINE_MAX_HOURS = 8;
export const OFFLINE_DOUBLE_COST_GEMS = 5;