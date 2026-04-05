// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/data/pogs.js
//  Chaque pog est un CHAMPION visible en combat
//  emoji = avatar affiché dans l'arène
//  role  = Attaque / Défense / Vitesse / Support / Critique
// ══════════════════════════════════════════════════════════════

export const RARITY = { C: 'C', R: 'R', E: 'E', L: 'L', M: 'M' };
export const RARITY_ORDER = ['C', 'R', 'E', 'L', 'M'];

export const RARITY_NAMES = {
  C: 'Commun', R: 'Rare', E: 'Épique', L: 'Légendaire', M: 'Mythique'
};

export const RARITY_MULTIPLIER = { C: 1, R: 1.4, E: 2, L: 3.2, M: 5 };

// ─── BASE STATS PAR RARETÉ ───────────────────────────────────
// hp  = points de vie du champion en combat
// atk = dégâts de base par attaque
// spd = vitesse d'attaque (1.0 = normal, 2.0 = double vitesse)
// crit= chance de coup critique (0–1)
// def = réduction de dégâts reçus (0–1)

const BASE = {
  C: { hp: 80,  atk: 12, spd: 1.0, crit: 0.05, def: 0.0  },
  R: { hp: 120, atk: 18, spd: 1.1, crit: 0.10, def: 0.05 },
  E: { hp: 180, atk: 28, spd: 1.2, crit: 0.15, def: 0.10 },
  L: { hp: 280, atk: 45, spd: 1.4, crit: 0.20, def: 0.15 },
  M: { hp: 450, atk: 75, spd: 1.6, crit: 0.30, def: 0.25 },
};

// ─── 30 POGS NORMAUX (gacha) ─────────────────────────────────
export const POGS = [

  // ── COMMUNS (8) ──────────────────────────────────────────
  {
    id: 'p01', name: 'Slugger',  rarity: 'C', emoji: '🥊',
    role: 'Attaque',
    effect: { type: 'gold+', value: 5 },
    effectDesc: '+5 or par vague',
    lore: 'Un puncheur de rue sans finesse, mais avec un cœur en or.',
    ...BASE.C
  },
  {
    id: 'p02', name: 'Bouclier', rarity: 'C', emoji: '🛡️',
    role: 'Défense',
    effect: { type: 'resist-', value: 10 },
    effectDesc: '-10% dégâts reçus',
    lore: 'Aussi solide que du béton armé.',
    ...BASE.C, def: 0.1
  },
  {
    id: 'p03', name: 'Rapido',   rarity: 'C', emoji: '💨',
    role: 'Vitesse',
    effect: { type: 'speed+', value: 0.1 },
    effectDesc: '+10% vitesse équipe',
    lore: 'Plus rapide que son ombre.',
    ...BASE.C, spd: 1.3
  },
  {
    id: 'p04', name: 'Punchito', rarity: 'C', emoji: '👊',
    role: 'Attaque',
    effect: { type: 'flips+', value: 1 },
    effectDesc: '+1 flip par manche',
    lore: 'Petit gabarit, grande hargne.',
    ...BASE.C
  },
  {
    id: 'p05', name: 'Tombeur',  rarity: 'C', emoji: '🪨',
    role: 'Attaque',
    effect: { type: 'gold+', value: 8 },
    effectDesc: '+8 or par victoire',
    lore: 'Lourd et inébranlable.',
    ...BASE.C, atk: 15, hp: 60
  },
  {
    id: 'p06', name: 'Filou',    rarity: 'C', emoji: '🃏',
    role: 'Support',
    effect: { type: 'idle+', value: 0.05 },
    effectDesc: '+5% or idle',
    lore: 'Toujours un tour dans sa manche.',
    ...BASE.C
  },
  {
    id: 'p07', name: 'Guérisseur', rarity: 'C', emoji: '💚',
    role: 'Support',
    effect: { type: 'idle+', value: 0.08 },
    effectDesc: '+8% or idle',
    lore: 'Garde ses alliés en forme.',
    ...BASE.C, atk: 8, hp: 100
  },
  {
    id: 'p08', name: 'Frappeur', rarity: 'C', emoji: '🤛',
    role: 'Attaque',
    effect: { type: 'flips+', value: 2 },
    effectDesc: '+2 flips par manche',
    lore: 'Direct et efficace.',
    ...BASE.C
  },

  // ── RARES (8) ────────────────────────────────────────────
  {
    id: 'p09', name: 'Volt',     rarity: 'R', emoji: '⚡',
    role: 'Vitesse',
    effect: { type: 'speed+', value: 0.2 },
    effectDesc: '+20% vitesse équipe',
    lore: 'Se déplace à la vitesse de l\'éclair.',
    ...BASE.R, spd: 1.6
  },
  {
    id: 'p10', name: 'Flamme',   rarity: 'R', emoji: '🔥',
    role: 'Attaque',
    effect: { type: 'crit+', value: 0.08 },
    effectDesc: '+8% chance critique',
    lore: 'Sa colère brûle comme le feu.',
    ...BASE.R, crit: 0.18
  },
  {
    id: 'p11', name: 'Glacieur', rarity: 'R', emoji: '❄️',
    role: 'Défense',
    effect: { type: 'resist-', value: 15 },
    effectDesc: '-15% dégâts reçus',
    lore: 'Froid comme la glace, dur comme l\'acier.',
    ...BASE.R, def: 0.15
  },
  {
    id: 'p12', name: 'Cobra',    rarity: 'R', emoji: '🐍',
    role: 'Critique',
    effect: { type: 'crit+', value: 0.12 },
    effectDesc: '+12% chance critique',
    lore: 'Frappe vite et sans prévenir.',
    ...BASE.R, crit: 0.22, atk: 22, hp: 90
  },
  {
    id: 'p13', name: 'Titan',    rarity: 'R', emoji: '🗿',
    role: 'Défense',
    effect: { type: 'resist-', value: 20 },
    effectDesc: '-20% dégâts reçus',
    lore: 'Un mur vivant sur le terrain.',
    ...BASE.R, def: 0.2, hp: 180, atk: 12
  },
  {
    id: 'p14', name: 'Shadow',   rarity: 'R', emoji: '🌑',
    role: 'Critique',
    effect: { type: 'steal+', value: 5 },
    effectDesc: 'Vole 5 or après KO',
    lore: 'Invisible jusqu\'au dernier instant.',
    ...BASE.R, crit: 0.20
  },
  {
    id: 'p15', name: 'Arachno',  rarity: 'R', emoji: '🕷️',
    role: 'Support',
    effect: { type: 'chain+', value: 1 },
    effectDesc: 'Attaque en chaîne +1',
    lore: 'Tisse des pièges invisibles.',
    ...BASE.R
  },
  {
    id: 'p16', name: 'Tonnerre', rarity: 'R', emoji: '🌩️',
    role: 'Attaque',
    effect: { type: 'all+', value: 5 },
    effectDesc: '+5% toutes stats',
    lore: 'La puissance de l\'orage dans ses poings.',
    ...BASE.R
  },

  // ── ÉPIQUES (7) ──────────────────────────────────────────
  {
    id: 'p17', name: 'Dragoon',  rarity: 'E', emoji: '🐲',
    role: 'Attaque',
    effect: { type: 'all+', value: 10 },
    effectDesc: '+10% toutes stats équipe',
    lore: 'La légende du dragon coule dans ses veines.',
    ...BASE.E
  },
  {
    id: 'p18', name: 'Phénix',   rarity: 'E', emoji: '🦅',
    role: 'Support',
    effect: { type: 'revive', value: 1 },
    effectDesc: 'Ressuscite 1 allié une fois',
    lore: 'Renaît de ses cendres, encore et encore.',
    ...BASE.E, hp: 140, atk: 20
  },
  {
    id: 'p19', name: 'Maître',   rarity: 'E', emoji: '🥋',
    role: 'Critique',
    effect: { type: 'crit+', value: 0.20 },
    effectDesc: '+20% chance critique',
    lore: 'Vingt ans de discipline. Une frappe parfaite.',
    ...BASE.E, crit: 0.35, atk: 35, hp: 140
  },
  {
    id: 'p20', name: 'Vortex',   rarity: 'E', emoji: '🌀',
    role: 'Vitesse',
    effect: { type: 'speed+', value: 0.3 },
    effectDesc: '+30% vitesse équipe',
    lore: 'La tornade en personne.',
    ...BASE.E, spd: 1.7, atk: 22
  },
  {
    id: 'p21', name: 'Guerrière',rarity: 'E', emoji: '⚔️',
    role: 'Attaque',
    effect: { type: 'flips+', value: 3 },
    effectDesc: '+3 flips par manche',
    lore: 'Née pour le combat, vit pour la victoire.',
    ...BASE.E
  },
  {
    id: 'p22', name: 'Sanctus',  rarity: 'E', emoji: '✨',
    role: 'Support',
    effect: { type: 'idle+', value: 0.25 },
    effectDesc: '+25% or idle',
    lore: 'Sa présence seule inspire l\'équipe.',
    ...BASE.E, atk: 18, hp: 220
  },
  {
    id: 'p23', name: 'Méca',     rarity: 'E', emoji: '🤖',
    role: 'Défense',
    effect: { type: 'protect', value: 1 },
    effectDesc: 'Protège l\'allié le plus faible',
    lore: 'L\'armure parfaite, froide et calculée.',
    ...BASE.E, def: 0.2, hp: 260
  },

  // ── LÉGENDAIRES (5) ──────────────────────────────────────
  {
    id: 'p24', name: 'Ryü',      rarity: 'L', emoji: '🐉',
    role: 'Attaque',
    effect: { type: 'all+', value: 20 },
    effectDesc: '+20% toutes stats équipe',
    lore: 'Le dragon originel. Sa flamme ne s\'éteint jamais.',
    ...BASE.L
  },
  {
    id: 'p25', name: 'Athéna',   rarity: 'L', emoji: '🦉',
    role: 'Support',
    effect: { type: 'idle+', value: 0.5 },
    effectDesc: '+50% or idle',
    lore: 'Sagesse et stratégie. Elle voit tout.',
    ...BASE.L, atk: 30, hp: 360
  },
  {
    id: 'p26', name: 'Shogun',   rarity: 'L', emoji: '⛩️',
    role: 'Défense',
    effect: { type: 'reflect+', value: 20 },
    effectDesc: 'Renvoie 20% des dégâts',
    lore: 'Le seigneur de guerre. Impassible et redoutable.',
    ...BASE.L, def: 0.25, hp: 400
  },
  {
    id: 'p27', name: 'Lux',      rarity: 'L', emoji: '☀️',
    role: 'Critique',
    effect: { type: 'crit+', value: 0.25 },
    effectDesc: '+25% chance critique',
    lore: 'La lumière aveuglante de la perfection.',
    ...BASE.L, crit: 0.45, atk: 60, hp: 200
  },
  {
    id: 'p28', name: 'Spectre',  rarity: 'L', emoji: '👻',
    role: 'Vitesse',
    effect: { type: 'speed+', value: 0.4 },
    effectDesc: '+40% vitesse équipe',
    lore: 'Intouchable. Insaisissable. Légendaire.',
    ...BASE.L, spd: 2.0, atk: 38
  },

  // ── MYTHIQUES (2) ────────────────────────────────────────
  {
    id: 'p29', name: 'Omega',    rarity: 'M', emoji: '🌌',
    role: 'Maître',
    effect: { type: 'master', value: 1 },
    effectDesc: '+20% toutes stats + crit ×2',
    lore: 'La fin et le commencement. Nul ne l\'a vu deux fois.',
    ...BASE.M
  },
  {
    id: 'p30', name: 'Nyx',      rarity: 'M', emoji: '🌑',
    role: 'Maître',
    effect: { type: 'master', value: 1 },
    effectDesc: '+15% stats + vole HP à chaque attaque',
    lore: 'La nuit éternelle. Ses ennemis disparaissent dans l\'ombre.',
    ...BASE.M, spd: 1.8, crit: 0.4
  },
];

// ─── 7 POGS BOSS UNIQUES (non-gacha, boss:true) ──────────────
export const POGS_BOSS = [
  {
    id: 'bw1', name: 'Le Retourneur', rarity: 'L', emoji: '🎭',
    role: 'Maître', boss: true,
    effect: { type: 'all+', value: 15 },
    effectDesc: '+15% toutes stats',
    lore: 'Le grand maître de la Rue des Pogs.',
    ...BASE.L, hp: 300, atk: 50
  },
  {
    id: 'bw2', name: 'Kraken',  rarity: 'L', emoji: '🦑',
    role: 'Défense', boss: true,
    effect: { type: 'resist-', value: 30 },
    effectDesc: '-30% dégâts reçus',
    lore: 'Gardien des Abysses Froides.',
    ...BASE.L, hp: 500, def: 0.3
  },
  {
    id: 'bw3', name: 'Pyroflip', rarity: 'L', emoji: '🌋',
    role: 'Attaque', boss: true,
    effect: { type: 'crit+', value: 0.30 },
    effectDesc: '+30% chance critique',
    lore: 'Né du magma de la Forge Volcanique.',
    ...BASE.L, hp: 800, atk: 80, crit: 0.50
  },
  {
    id: 'bw4', name: 'Titan-Mech', rarity: 'M', emoji: '🤖',
    role: 'Maître', boss: true,
    effect: { type: 'all+', value: 20 },
    effectDesc: '+20% toutes stats',
    lore: 'L\'IA des Ruines Stellaires.',
    ...BASE.M, hp: 1200
  },
  {
    id: 'bw5', name: 'Singularité', rarity: 'M', emoji: '🕳️',
    role: 'Maître', boss: true,
    effect: { type: 'master', value: 1 },
    effectDesc: 'Absorbe les pouvoirs ennemis',
    lore: 'Le point de non-retour du Cosmos Brisé.',
    ...BASE.M, hp: 1800, atk: 100
  },
  {
    id: 'bw6', name: 'Zeus Pogadon', rarity: 'M', emoji: '⚡',
    role: 'Attaque', boss: true,
    effect: { type: 'all+', value: 25 },
    effectDesc: '+25% toutes stats équipe',
    lore: 'Dieu de l\'Olympe des Pogs.',
    ...BASE.M, hp: 2500, atk: 120
  },
  {
    id: 'bw7', name: 'L\'Infini', rarity: 'M', emoji: '♾️',
    role: 'Maître', boss: true,
    effect: { type: 'master', value: 1 },
    effectDesc: 'Toutes les capacités en une',
    lore: 'La fin de tout. Le début de rien.',
    ...BASE.M, hp: 4000, atk: 150, crit: 0.5, spd: 2.0, def: 0.3
  },
];

// ─── HELPERS ─────────────────────────────────────────────────
export function getPogById(id) {
  return [...POGS, ...POGS_BOSS].find(p => p.id === id) || null;
}

export function getAllPogs() {
  return [...POGS, ...POGS_BOSS];
}

/** Retourne les stats réelles d'un pog en tenant compte de la rareté */
export function getChampionStats(pog) {
  const mult = RARITY_MULTIPLIER[pog.rarity] || 1;
  return {
    hp:   Math.round(pog.hp   * mult),
    atk:  Math.round(pog.atk  * mult),
    spd:  pog.spd,
    crit: pog.crit,
    def:  pog.def,
  };
}