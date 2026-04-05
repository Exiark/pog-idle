export const RARITY = {
  C: { label: 'Commun',     color: '#B4B2A9', bg: '#F1EFE8', text: '#2C2C2A' },
  R: { label: 'Rare',       color: '#378ADD', bg: '#E6F1FB', text: '#042C53' },
  E: { label: 'Épique',     color: '#7F77DD', bg: '#EEEDFE', text: '#26215C' },
  L: { label: 'Légendaire', color: '#EF9F27', bg: '#FAEEDA', text: '#412402' },
  M: { label: 'Mythique',   color: '#D4537E', bg: '#FBEAF0', text: '#4B1528' },
}

export const RARITY_ORDER = ['C', 'R', 'E', 'L', 'M']

// Classe de champion
export const CLASSES = {
  ATK: { label: 'Attaquant', color: '#D85A30', icon: '⚔' },
  DEF: { label: 'Défenseur', color: '#378ADD', icon: '🛡' },
  SPT: { label: 'Support',   color: '#3B6D11', icon: '✦' },
  TNK: { label: 'Tank',      color: '#534AB7', icon: '⬟' },
}

// Stats de base par rareté
const BASE = {
  C: { hp: 30,  atk: 8,  def: 5,  spd: 1.0 },
  R: { hp: 55,  atk: 14, def: 9,  spd: 1.1 },
  E: { hp: 90,  atk: 22, def: 15, spd: 1.2 },
  L: { hp: 140, atk: 35, def: 24, spd: 1.3 },
  M: { hp: 220, atk: 55, def: 38, spd: 1.5 },
}

// Multiplicateurs par classe
const CLASS_MULT = {
  ATK: { hp: 0.8,  atk: 1.5, def: 0.7,  spd: 1.2 },
  DEF: { hp: 1.0,  atk: 0.8, def: 1.6,  spd: 0.9 },
  SPT: { hp: 0.9,  atk: 1.0, def: 1.0,  spd: 1.3 },
  TNK: { hp: 1.6,  atk: 0.7, def: 1.4,  spd: 0.7 },
}

function stats(rarity, cls) {
  const b = BASE[rarity]
  const m = CLASS_MULT[cls]
  return {
    hp:  Math.round(b.hp  * m.hp),
    atk: Math.round(b.atk * m.atk),
    def: Math.round(b.def * m.def),
    spd: Math.round(b.spd * m.spd * 10) / 10,
  }
}

export const POGS = [
  // ── COMMUNS ──
  {
    id: 'p01', name: 'Flint', rarity: 'C', cls: 'ATK',
    icon: '🪨', passive: 'crit+0.05',
    desc: '+5% chance de critique',
    lore: 'Un disc de pierre taillé par les anciens.',
    ...stats('C', 'ATK'),
  },
  {
    id: 'p02', name: 'Solarus', rarity: 'C', cls: 'SPT',
    icon: '☀', passive: 'gold+0.1',
    desc: '+10% or gagné',
    lore: 'Béni par la lumière du matin.',
    ...stats('C', 'SPT'),
  },
  {
    id: 'p03', name: 'Vortex', rarity: 'C', cls: 'ATK',
    icon: '🌀', passive: 'spd+0.1',
    desc: '+10% vitesse d\'attaque',
    lore: 'Tourne si vite qu\'on le voit à peine.',
    ...stats('C', 'ATK'),
  },
  {
    id: 'p04', name: 'Aegis', rarity: 'C', cls: 'DEF',
    icon: '🛡', passive: 'def+0.1',
    desc: '+10% défense de l\'équipe',
    lore: 'Protège ses alliés sans fléchir.',
    ...stats('C', 'DEF'),
  },
  {
    id: 'p05', name: 'Lucky', rarity: 'C', cls: 'SPT',
    icon: '✦', passive: 'crit+0.05',
    desc: '+5% critique, +5% loot',
    lore: 'La chance lui sourit toujours.',
    ...stats('C', 'SPT'),
  },
  // ── RARES ──
  {
    id: 'p06', name: 'Luna', rarity: 'R', cls: 'SPT',
    icon: '◎', passive: 'idle+0.5',
    desc: '+0.5 or/s passif',
    lore: 'Veille sur le groupe même la nuit.',
    ...stats('R', 'SPT'),
  },
  {
    id: 'p07', name: 'Bolt', rarity: 'R', cls: 'ATK',
    icon: '⚡', passive: 'atk+0.15',
    desc: '+15% ATK',
    lore: 'Frappe comme la foudre.',
    ...stats('R', 'ATK'),
  },
  {
    id: 'p08', name: 'Cyclone', rarity: 'R', cls: 'ATK',
    icon: '〇', passive: 'multi+0.1',
    desc: '10% de frapper 2 ennemis',
    lore: 'Son souffle balaye tout sur son passage.',
    ...stats('R', 'ATK'),
  },
  {
    id: 'p09', name: 'Saphyr', rarity: 'R', cls: 'DEF',
    icon: '◇', passive: 'gold+0.25',
    desc: '+25% or gagné',
    lore: 'Sa brillance attire les richesses.',
    ...stats('R', 'DEF'),
  },
  {
    id: 'p10', name: 'Ember', rarity: 'R', cls: 'ATK',
    icon: '△', passive: 'crit+0.15',
    desc: '+15% critique',
    lore: 'Une flamme qui ne s\'éteint jamais.',
    ...stats('R', 'ATK'),
  },
  {
    id: 'p11', name: 'Specter', rarity: 'R', cls: 'SPT',
    icon: '◈', passive: 'steal+0.1',
    desc: '10% de voler HP ennemi',
    lore: 'Passe à travers les défenses.',
    ...stats('R', 'SPT'),
  },
  // ── ÉPIQUES ──
  {
    id: 'p12', name: 'Prism', rarity: 'E', cls: 'SPT',
    icon: '◉', passive: 'all+0.1',
    desc: '+10% toutes stats équipe',
    lore: 'Amplifie la force de tous ses alliés.',
    ...stats('E', 'SPT'),
  },
  {
    id: 'p13', name: 'Titan', rarity: 'E', cls: 'TNK',
    icon: '⬟', passive: 'hp+0.2',
    desc: '+20% HP équipe',
    lore: 'Une montagne de muscles et d\'acier.',
    ...stats('E', 'TNK'),
  },
  {
    id: 'p14', name: 'Ignis', rarity: 'E', cls: 'ATK',
    icon: '❖', passive: 'atk+0.2',
    desc: '+20% ATK, brûle les ennemis',
    lore: 'Le feu est son langage.',
    ...stats('E', 'ATK'),
  },
  {
    id: 'p15', name: 'Zephyr', rarity: 'E', cls: 'ATK',
    icon: '◯', passive: 'spd+0.2',
    desc: '+20% vitesse équipe',
    lore: 'Plus rapide que le vent.',
    ...stats('E', 'ATK'),
  },
  {
    id: 'p16', name: 'Mirror', rarity: 'E', cls: 'DEF',
    icon: '⟐', passive: 'reflect+0.15',
    desc: '15% de réfléchir les dégâts',
    lore: 'Ce qu\'il reçoit, il le renvoie.',
    ...stats('E', 'DEF'),
  },
  {
    id: 'p17', name: 'Anchor', rarity: 'E', cls: 'TNK',
    icon: '⚓', passive: 'def+0.25',
    desc: '+25% DEF équipe',
    lore: 'Rien ne le fait bouger.',
    ...stats('E', 'TNK'),
  },
  {
    id: 'p18', name: 'Phantom', rarity: 'E', cls: 'SPT',
    icon: '☆', passive: 'idle+2',
    desc: '+2 or/s passif',
    lore: 'Génère des ressources même absent.',
    ...stats('E', 'SPT'),
  },
  // ── LÉGENDAIRES ──
  {
    id: 'p19', name: 'Godflip', rarity: 'L', cls: 'ATK',
    icon: '✸', passive: 'atk+0.35',
    desc: '+35% ATK, critique garanti 1x/combat',
    lore: 'Le retournement parfait.',
    ...stats('L', 'ATK'),
  },
  {
    id: 'p20', name: 'Nova', rarity: 'L', cls: 'SPT',
    icon: '✤', passive: 'gold+1',
    desc: 'Or ×2 après victoire',
    lore: 'Une explosion de richesse.',
    ...stats('L', 'SPT'),
  },
  {
    id: 'p21', name: 'Chainsaw', rarity: 'L', cls: 'ATK',
    icon: '⬡', passive: 'chain+0.3',
    desc: '30% de frapper encore',
    lore: 'Ne s\'arrête jamais.',
    ...stats('L', 'ATK'),
  },
  {
    id: 'p22', name: 'Draco', rarity: 'L', cls: 'ATK',
    icon: '◆', passive: 'crit+0.4',
    desc: '+40% crit, dégâts crit ×3',
    lore: 'La larme d\'un dragon légendaire.',
    ...stats('L', 'ATK'),
  },
  {
    id: 'p23', name: 'Guardian', rarity: 'L', cls: 'DEF',
    icon: '⊕', passive: 'protect',
    desc: 'Protège 2 alliés des KO',
    lore: 'Mourrait pour ses compagnons.',
    ...stats('L', 'DEF'),
  },
  {
    id: 'p24', name: 'Hourglass', rarity: 'L', cls: 'SPT',
    icon: '⧖', passive: 'spd+0.4',
    desc: '+40% vitesse, idle ×2',
    lore: 'Maître du temps.',
    ...stats('L', 'SPT'),
  },
  // ── MYTHIQUES ──
  {
    id: 'p25', name: 'Omega', rarity: 'M', cls: 'ATK',
    icon: 'Ω', passive: 'atk+0.5',
    desc: '+50% ATK, ignore DEF ennemie',
    lore: 'La fin de toutes choses.',
    ...stats('M', 'ATK'),
  },
  {
    id: 'p26', name: 'Singularity', rarity: 'M', cls: 'SPT',
    icon: '⊗', passive: 'all+0.3',
    desc: '+30% toutes stats, synergies ×2',
    lore: 'Un point de non-retour.',
    ...stats('M', 'SPT'),
  },
  {
    id: 'p27', name: 'Eclipse', rarity: 'M', cls: 'ATK',
    icon: '◍', passive: 'steal+0.5',
    desc: '50% vol HP + or bonus',
    lore: 'Obscurcit tout sur son passage.',
    ...stats('M', 'ATK'),
  },
  {
    id: 'p28', name: 'Weaver', rarity: 'M', cls: 'SPT',
    icon: '⊞', passive: 'chain+1',
    desc: 'Attaques chaînées garanties',
    lore: 'Tisse le destin de l\'équipe.',
    ...stats('M', 'SPT'),
  },
  {
    id: 'p29', name: 'Phoenix', rarity: 'M', cls: 'DEF',
    icon: '✧', passive: 'revive',
    desc: 'Revient à la vie 1x/combat',
    lore: 'Impossible à tuer.',
    ...stats('M', 'DEF'),
  },
  {
    id: 'p30', name: 'Ancient', rarity: 'M', cls: 'TNK',
    icon: '✺', passive: 'master',
    desc: 'Double tous les gains',
    lore: 'Le Grand Pog Ancien.',
    ...stats('M', 'TNK'),
  },
  // ── BOSS UNIQUES ──
  {
    id: 'b01', name: 'Flipper Soul', rarity: 'L', cls: 'ATK',
    icon: '🏆', passive: 'atk+0.3', boss: true,
    desc: 'Boss W1 — +30% ATK',
    lore: 'L\'âme du Grand Retourneur.',
    ...stats('L', 'ATK'),
  },
  {
    id: 'b02', name: 'Kraken Tear', rarity: 'L', cls: 'TNK',
    icon: '🌊', passive: 'idle+5', boss: true,
    desc: 'Boss W2 — +5 or/s',
    lore: 'Une larme des abysses.',
    ...stats('L', 'TNK'),
  },
  {
    id: 'b03', name: 'Magma Heart', rarity: 'L', cls: 'ATK',
    icon: '🌋', passive: 'crit+0.5', boss: true,
    desc: 'Boss W3 — +50% crit',
    lore: 'Forgé dans le magma.',
    ...stats('L', 'ATK'),
  },
  {
    id: 'b04', name: 'Titan Soul', rarity: 'M', cls: 'TNK',
    icon: '⚙', passive: 'atk+0.4', boss: true,
    desc: 'Boss W4 — +40% ATK',
    lore: 'L\'âme du titan mécanique.',
    ...stats('M', 'TNK'),
  },
  {
    id: 'b05', name: 'Cosmos Shard', rarity: 'M', cls: 'SPT',
    icon: '🌌', passive: 'all+0.2', boss: true,
    desc: 'Boss W5 — +20% tout',
    lore: 'Un fragment de cosmos.',
    ...stats('M', 'SPT'),
  },
  {
    id: 'b06', name: 'Olympus Scale', rarity: 'M', cls: 'DEF',
    icon: '⚡', passive: 'gold+2', boss: true,
    desc: 'Boss W6 — or ×3',
    lore: 'Une écaille d\'Olympe.',
    ...stats('M', 'DEF'),
  },
  {
    id: 'b07', name: 'Void Shard', rarity: 'M', cls: 'ATK',
    icon: '🌑', passive: 'master', boss: true,
    desc: 'Boss W7 — maître absolu',
    lore: 'Un éclat du néant.',
    ...stats('M', 'ATK'),
  },
]