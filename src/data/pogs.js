export const POGS = [
  // ── COMMUNS ──
  { id: 'p01', name: 'Disc de Pierre',    rarity: 'C', icon: '🪨', effect: 'flips+1',     desc: '+1 flip par attaque' },
  { id: 'p02', name: 'Disque Solaire',    rarity: 'C', icon: '☀',  effect: 'gold+0.1',    desc: '+10% or par vague' },
  { id: 'p03', name: 'Tourbillon',        rarity: 'C', icon: '🌀', effect: 'speed+0.05',  desc: '+5% vitesse kini' },
  { id: 'p04', name: 'Bouclier',          rarity: 'C', icon: '🛡',  effect: 'resist-0.1',  desc: '-10% résistance ennemie' },
  { id: 'p05', name: 'Étoile Filante',    rarity: 'C', icon: '✦',  effect: 'crit+0.05',   desc: '+5% chance critique' },

  // ── RARES ──
  { id: 'p06', name: 'Lune Argentée',     rarity: 'R', icon: '◎',  effect: 'idle+0.5',    desc: '+0.5 or/s en idle' },
  { id: 'p07', name: 'Foudre',            rarity: 'R', icon: '⚡',  effect: 'flips+2',     desc: '+2 flips par attaque' },
  { id: 'p08', name: 'Vortex',            rarity: 'R', icon: '〇',  effect: 'multi+0.1',   desc: '10% de toucher plusieurs piles' },
  { id: 'p09', name: 'Cristal Bleu',      rarity: 'R', icon: '◇',  effect: 'gold+0.25',   desc: '+25% or gagné' },
  { id: 'p10', name: 'Flamme Rouge',      rarity: 'R', icon: '△',  effect: 'crit+0.15',   desc: '+15% critique' },
  { id: 'p11', name: 'Spectre Vert',      rarity: 'R', icon: '◈',  effect: 'steal+0.1',   desc: '10% de voler un pog ennemi' },

  // ── ÉPIQUES ──
  { id: 'p12', name: 'Arc-en-ciel',       rarity: 'E', icon: '◉',  effect: 'all+0.1',     desc: '+10% à toutes les stats' },
  { id: 'p13', name: 'Titan Noir',        rarity: 'E', icon: '⬟',  effect: 'flips+4',     desc: '+4 flips par attaque' },
  { id: 'p14', name: 'Cœur de Feu',       rarity: 'E', icon: '❖',  effect: 'gold+0.5',    desc: '+50% or gagné' },
  { id: 'p15', name: 'Œil du Cyclone',    rarity: 'E', icon: '◯',  effect: 'speed+0.2',   desc: '+20% vitesse kini' },
  { id: 'p16', name: 'Miroir Brisé',      rarity: 'E', icon: '⟐',  effect: 'reflect+0.15',desc: '15% de refléter une attaque' },
  { id: 'p17', name: 'Ancre Cosmique',    rarity: 'E', icon: '⚓',  effect: 'resist-0.25', desc: '-25% résistance ennemie' },
  { id: 'p18', name: 'Pog Fantôme',       rarity: 'E', icon: '☆',  effect: 'idle+2',      desc: '+2 or/s offline' },

  // ── LÉGENDAIRES ──
  { id: 'p19', name: 'Dieu du Flip',      rarity: 'L', icon: '✸',  effect: 'flips+6',     desc: '+6 flips garantis' },
  { id: 'p20', name: 'Nova Dorée',        rarity: 'L', icon: '✤',  effect: 'gold+1',      desc: 'or ×2 après chaque vague' },
  { id: 'p21', name: 'Chaîne Stellaire',  rarity: 'L', icon: '⬡',  effect: 'chain+0.3',   desc: '30% de chaîner 2 attaques' },
  { id: 'p22', name: 'Larme de Dragon',   rarity: 'L', icon: '◆',  effect: 'crit+0.4',    desc: '+40% critique, dégâts ×3' },
  { id: 'p23', name: 'Gardien Éternel',   rarity: 'L', icon: '⊕',  effect: 'protect',     desc: 'Protège 2 pogs alliés' },
  { id: 'p24', name: 'Sablier Infini',    rarity: 'L', icon: '⧖',  effect: 'speed+0.4',   desc: '+40% vitesse, idle ×2' },

  // ── MYTHIQUES ──
  { id: 'p25', name: 'Omega Noir',        rarity: 'M', icon: 'Ω',  effect: 'flips+10',    desc: '+10 flips, ignore résistance' },
  { id: 'p26', name: 'Singularité',       rarity: 'M', icon: '⊗',  effect: 'all+0.3',     desc: '+30% tout, synergies ×2' },
  { id: 'p27', name: 'Éclipse Totale',    rarity: 'M', icon: '◍',  effect: 'steal+0.5',   desc: '50% vol de pog + bonus or' },
  { id: 'p28', name: 'Tisserand',         rarity: 'M', icon: '⊞',  effect: 'chain+1',     desc: 'Attaques chaînées garanties' },
  { id: 'p29', name: 'Phénix Originel',   rarity: 'M', icon: '✧',  effect: 'revive',      desc: 'Se régénère 1x par vague' },
  { id: 'p30', name: 'Grand Pog Ancien',  rarity: 'M', icon: '✺',  effect: 'master',      desc: 'Double tous les gains' },

  // ── POGS BOSS UNIQUES (non obtenables en gacha) ──
  { id: 'b01', name: 'Âme du Retourneur', rarity: 'L', icon: '🏆', effect: 'flips+5',     desc: 'Boss Monde 1 — +5 flips', boss: true },
  { id: 'b02', name: 'Larme du Kraken',   rarity: 'L', icon: '🌊', effect: 'idle+5',      desc: 'Boss Monde 2 — +5 or/s',  boss: true },
  { id: 'b03', name: 'Cœur Volcanique',   rarity: 'L', icon: '🌋', effect: 'crit+0.5',    desc: 'Boss Monde 3 — +50% crit', boss: true },
  { id: 'b04', name: 'Âme du Titan',      rarity: 'M', icon: '⚙',  effect: 'flips+8',     desc: 'Boss Monde 4 — +8 flips',  boss: true },
  { id: 'b05', name: 'Fragment Cosmique', rarity: 'M', icon: '🌌', effect: 'all+0.2',     desc: 'Boss Monde 5 — +20% tout', boss: true },
  { id: 'b06', name: 'Écaille d\'Olympe', rarity: 'M', icon: '⚡',  effect: 'gold+2',      desc: 'Boss Monde 6 — or ×3',    boss: true },
  { id: 'b07', name: 'Éclat du Néant',    rarity: 'M', icon: '🌑', effect: 'master',      desc: 'Boss Monde 7 — maître',    boss: true },
]

export const RARITY = {
  C: { label: 'Commun',      color: '#B4B2A9', bg: '#F1EFE8', text: '#2C2C2A' },
  R: { label: 'Rare',        color: '#378ADD', bg: '#E6F1FB', text: '#042C53' },
  E: { label: 'Épique',      color: '#7F77DD', bg: '#EEEDFE', text: '#26215C' },
  L: { label: 'Légendaire',  color: '#EF9F27', bg: '#FAEEDA', text: '#412402' },
  M: { label: 'Mythique',    color: '#D4537E', bg: '#FBEAF0', text: '#4B1528' },
}

export const RARITY_ORDER = ['C', 'R', 'E', 'L', 'M']