// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/data/kinis.js
// ══════════════════════════════════════════════════════════════

// Les kinis boostent les stats de toute l'équipe joueur.
// power  = bonus d'attaque de base (ref: 10)
// speed  = multiplicateur de vitesse
// chance = bonus de critique
// bonusEffect = effet spécial exclusif (boss uniquement)

export const KINIS = [
  // ── 5 kinis de base ──────────────────────────────────────
  {
    id: 'k1', name: 'Léger',    emoji: '🌬️',
    power: 8,  speed: 1.2, chance: 0,
    desc: 'Rapide et agile, parfait pour l\'esquive.',
    exclusive: false,
  },
  {
    id: 'k2', name: 'Lourd',    emoji: '🪨',
    power: 20, speed: 0.6, chance: 0,
    desc: 'Lent mais dévastateur. Brise les défenses.',
    exclusive: false,
  },
  {
    id: 'k3', name: 'Équilibré',emoji: '⚖️',
    power: 13, speed: 0.9, chance: 0,
    desc: 'Équilibre parfait entre force et vitesse.',
    exclusive: false,
  },
  {
    id: 'k4', name: 'Rapide',   emoji: '⚡',
    power: 7,  speed: 1.8, chance: 0,
    desc: 'Le plus rapide. Frappe avant l\'ennemi.',
    exclusive: false,
  },
  {
    id: 'k5', name: 'Spécial',  emoji: '🎯',
    power: 11, speed: 1.0, chance: 0.35,
    desc: 'Maître du coup critique. Frappe là où ça fait mal.',
    exclusive: false,
  },

  // ── 7 kinis exclusifs boss ────────────────────────────────
  {
    id: 'ke1', name: 'Pogmaster', emoji: '🎭',
    power: 14, speed: 1.1, chance: 0.1,
    bonusEffect: '+15% or/vague',
    desc: 'Le kini légendaire de La Rue des Pogs.',
    exclusive: true,
  },
  {
    id: 'ke2', name: 'Abyssal',  emoji: '🦑',
    power: 16, speed: 1.0, chance: 0.1,
    bonusEffect: 'Ignore 20% de la défense ennemie',
    desc: 'Né des profondeurs, il ne connaît pas la pitié.',
    exclusive: true,
  },
  {
    id: 'ke3', name: 'Pyro',     emoji: '🌋',
    power: 22, speed: 0.9, chance: 0.15,
    bonusEffect: 'Dégâts de feu +25%',
    desc: 'La chaleur du volcan coule dans ses veines.',
    exclusive: true,
  },
  {
    id: 'ke4', name: 'Stellaire',emoji: '⭐',
    power: 18, speed: 1.2, chance: 0.12,
    bonusEffect: '+1 slot équipement',
    desc: 'La sagesse des étoiles guide chaque frappe.',
    exclusive: true,
  },
  {
    id: 'ke5', name: 'Nexus',    emoji: '🌌',
    power: 20, speed: 1.3, chance: 0.20,
    bonusEffect: '+50% récompenses idle',
    desc: 'Le tisserand du cosmos. Tout est connecté.',
    exclusive: true,
  },
  {
    id: 'ke6', name: 'Olympien', emoji: '⚡',
    power: 25, speed: 1.1, chance: 0.15,
    bonusEffect: '+30% puissance critique',
    desc: 'Béni par les dieux de l\'Olympe.',
    exclusive: true,
  },
  {
    id: 'ke7', name: 'L\'Ultime',emoji: '♾️',
    power: 30, speed: 1.5, chance: 0.30,
    bonusEffect: 'Toutes les capacités combinées',
    desc: 'La perfection incarnée. L\'alpha et l\'oméga.',
    exclusive: true,
  },
];