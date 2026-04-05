// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/data/worlds.js
// ══════════════════════════════════════════════════════════════

export const WORLDS = [
  {
    id: 'w1', num: 1, name: 'La Rue des Pogs',
    icon: '🏙️', bgColor: 'rgba(30,80,120,0.3)',
    bossName: 'Le Grand Retourneur', bossHP: 300,
    desc: 'Les rues de la ville, berceau des pogs.',
  },
  {
    id: 'w2', num: 2, name: 'Les Abysses Froides',
    icon: '🌊', bgColor: 'rgba(0,60,120,0.4)',
    bossName: 'Kraken de Pogs', bossHP: 500,
    desc: 'Les profondeurs glacées de l\'océan.',
  },
  {
    id: 'w3', num: 3, name: 'La Forge Volcanique',
    icon: '🌋', bgColor: 'rgba(120,30,0,0.4)',
    bossName: 'Pyroflip', bossHP: 800,
    desc: 'Les entrailles de la terre en fusion.',
  },
  {
    id: 'w4', num: 4, name: 'Les Ruines Stellaires',
    icon: '⭐', bgColor: 'rgba(60,0,120,0.4)',
    bossName: 'Le Titan Mécanique', bossHP: 1200,
    desc: 'Les vestiges d\'une civilisation perdue.',
  },
  {
    id: 'w5', num: 5, name: 'Le Cosmos Brisé',
    icon: '🌌', bgColor: 'rgba(0,0,80,0.5)',
    bossName: 'La Singularité', bossHP: 1800,
    desc: 'Au-delà des étoiles, là où l\'espace se fracture.',
  },
  {
    id: 'w6', num: 6, name: 'L\'Olympe des Pogs',
    icon: '⚡', bgColor: 'rgba(60,60,0,0.4)',
    bossName: 'Zeus Pogadon', bossHP: 2500,
    desc: 'Le domaine des dieux du Pog.',
  },
  {
    id: 'w7', num: 7, name: 'Le Néant Céleste',
    icon: '🌑', bgColor: 'rgba(0,0,0,0.6)',
    bossName: 'L\'Infini Corrompu', bossHP: 4000,
    desc: 'La fin de tout. L\'ultime épreuve.',
  },
];

// Packs thématiques débloqués par monde
export const PACKS_WORLD = {
  w1: { name: 'Pack de Rue', emoji: '🏙️' },
  w2: { name: 'Pack Abyssal', emoji: '🌊' },
  w3: { name: 'Pack Volcanique', emoji: '🌋' },
  w4: { name: 'Pack Stellaire', emoji: '⭐' },
  w5: { name: 'Pack Cosmique', emoji: '🌌' },
  w6: { name: 'Pack Olympien', emoji: '⚡' },
  w7: { name: 'Pack du Néant', emoji: '🌑' },
};