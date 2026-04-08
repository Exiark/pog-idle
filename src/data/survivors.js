// ── SHELTER SURVIVOR — Données des survivants ──
// 36 survivants (12 classes × 3 raretés) + 7 boss de zone
// Raretés : D=Débutant ×1 · E=Expert ×2 · L=Légende ×5

// Stats de base par classe (tier Débutant ×1)
const BASE = {
  bouclier:   { hp: 120, atk: 30,  def: 65, spd: 15 },
  blinde:     { hp: 110, atk: 40,  def: 60, spd: 20 },
  berserk:    { hp: 70,  atk: 80,  def: 20, spd: 40 },
  lame:       { hp: 65,  atk: 65,  def: 25, spd: 50 },
  tireur:     { hp: 55,  atk: 60,  def: 20, spd: 45 },
  artificier: { hp: 60,  atk: 55,  def: 20, spd: 30 },
  medic:      { hp: 75,  atk: 15,  def: 35, spd: 40 },
  biologiste: { hp: 80,  atk: 20,  def: 40, spd: 35 },
  ingenieur:  { hp: 70,  atk: 35,  def: 45, spd: 30 },
  tacticien:  { hp: 70,  atk: 30,  def: 30, spd: 45 },
  ombre:      { hp: 50,  atk: 70,  def: 15, spd: 60 },
  pistard:    { hp: 50,  atk: 55,  def: 15, spd: 75 },
}

const MULT = { D: 1, E: 2, L: 5 }

function s(classe, rarity) {
  const b = BASE[classe]
  const m = MULT[rarity]
  return {
    hp:  Math.round(b.hp  * m),
    atk: Math.round(b.atk * m),
    def: Math.round(b.def * m),
    spd: Math.round(b.spd * m),
  }
}

export const SURVIVORS = [
  // ── BOUCLIER (TANK) — Taunt / HP / DEF ──
  {
    id: 's01', name: 'Marcus',    role: 'Bouclier',   rarity: 'D', icon: '🛡',
    ...s('bouclier', 'D'),
    effect: 'taunt',        desc: 'Attire les attaques ennemies sur lui',
  },
  {
    id: 's02', name: 'Fort Knox', role: 'Bouclier',   rarity: 'E', icon: '🏰',
    ...s('bouclier', 'E'),
    effect: 'taunt+hp+0.2', desc: 'Taunt + 20% HP max en bonus',
  },
  {
    id: 's03', name: 'Bastion',   role: 'Bouclier',   rarity: 'L', icon: '⛩',
    ...s('bouclier', 'L'),
    effect: 'taunt+shield',  desc: 'Taunt + bouclier absorbant 30% des dégâts subis',
  },

  // ── BLINDÉ (TANK) — Armure / Contre-attaque ──
  {
    id: 's04', name: 'Rouille',   role: 'Blindé',     rarity: 'D', icon: '⚙',
    ...s('blinde', 'D'),
    effect: 'armor+0.1',    desc: 'Réduit les dégâts reçus de 10%',
  },
  {
    id: 's05', name: 'Titan',     role: 'Blindé',     rarity: 'E', icon: '🤖',
    ...s('blinde', 'E'),
    effect: 'armor+counter', desc: 'Armure renforcée + contre-attaque à 20%',
  },
  {
    id: 's06', name: 'Ferro',     role: 'Blindé',     rarity: 'L', icon: '🦾',
    ...s('blinde', 'L'),
    effect: 'armor+0.3+counter+0.4', desc: '-30% dégâts reçus, contre-attaque 40%',
  },

  // ── BERSERK (MÊLÉE) — ATK max / Rage / Ignore DEF ──
  {
    id: 's07', name: 'Rage',      role: 'Berserk',    rarity: 'D', icon: '😤',
    ...s('berserk', 'D'),
    effect: 'rage',          desc: 'ATK +15% quand HP < 50%',
  },
  {
    id: 's08', name: 'Knuckles',  role: 'Berserk',    rarity: 'E', icon: '👊',
    ...s('berserk', 'E'),
    effect: 'rage+pierce',   desc: 'Rage + ignore 20% de la DEF ennemie',
  },
  {
    id: 's09', name: 'Carnage',   role: 'Berserk',    rarity: 'L', icon: '🔥',
    ...s('berserk', 'L'),
    effect: 'rage+pierce+aoe', desc: 'Rage extrême + ignore DEF + frappe 2 cibles',
  },

  // ── LAME (MÊLÉE) — Saignement / Multi-cibles ──
  {
    id: 's10', name: 'Cutter',    role: 'Lame',       rarity: 'D', icon: '🗡',
    ...s('lame', 'D'),
    effect: 'bleed',         desc: 'Inflige saignement (2 dégâts/tour pendant 3 tours)',
  },
  {
    id: 's11', name: 'Shiv',      role: 'Lame',       rarity: 'E', icon: '⚔',
    ...s('lame', 'E'),
    effect: 'bleed+multi+0.2', desc: 'Saignement + 20% chance de frapper 2 cibles',
  },
  {
    id: 's12', name: 'Viper',     role: 'Lame',       rarity: 'L', icon: '🐍',
    ...s('lame', 'L'),
    effect: 'bleed+multi+0.4+poison', desc: 'Saignement × 2, multi-cible 40% + poison',
  },

  // ── TIREUR (DISTANCE) — Crit / Cible prioritaire ──
  {
    id: 's13', name: 'Dusty',     role: 'Tireur',     rarity: 'D', icon: '🎯',
    ...s('tireur', 'D'),
    effect: 'crit+0.1',     desc: '+10% chance critique',
  },
  {
    id: 's14', name: 'Cross',     role: 'Tireur',     rarity: 'E', icon: '🔭',
    ...s('tireur', 'E'),
    effect: 'crit+0.2+priority', desc: '+20% crit + cible l\'ennemi le plus dangereux',
  },
  {
    id: 's15', name: 'Apex',      role: 'Tireur',     rarity: 'L', icon: '🏹',
    ...s('tireur', 'L'),
    effect: 'crit+0.4+priority+snipe', desc: '+40% crit + priorité + tir de précision (×3 crit)',
  },

  // ── ARTIFICIER (DISTANCE) — AoE / Stun ──
  {
    id: 's16', name: 'Boom',      role: 'Artificier', rarity: 'D', icon: '💣',
    ...s('artificier', 'D'),
    effect: 'aoe',           desc: 'Explose sur 2 cibles adjacentes',
  },
  {
    id: 's17', name: 'Grenade',   role: 'Artificier', rarity: 'E', icon: '🧨',
    ...s('artificier', 'E'),
    effect: 'aoe+stun+0.2',  desc: 'AoE + 20% chance de stun (1 tour)',
  },
  {
    id: 's18', name: 'Kaboom',    role: 'Artificier', rarity: 'L', icon: '💥',
    ...s('artificier', 'L'),
    effect: 'aoe+stun+0.4+chain', desc: 'AoE puissant, stun 40%, réaction en chaîne',
  },

  // ── MÉDIC (MÉDECIN) — Soin direct / Réanimation ──
  {
    id: 's19', name: 'Doc',       role: 'Médic',      rarity: 'D', icon: '🩺',
    ...s('medic', 'D'),
    effect: 'heal+10',       desc: 'Soigne 10 HP à un allié par tour',
  },
  {
    id: 's20', name: 'Patch',     role: 'Médic',      rarity: 'E', icon: '🏥',
    ...s('medic', 'E'),
    effect: 'heal+25+revive+0.2', desc: 'Soigne 25 HP + 20% chance de réanimer un allié',
  },
  {
    id: 's21', name: 'Lazarus',   role: 'Médic',      rarity: 'L', icon: '✝',
    ...s('medic', 'L'),
    effect: 'heal+60+revive+0.5', desc: 'Soin massif + réanimation garantie 1x par combat',
  },

  // ── BIOLOGISTE (MÉDECIN) — HoT / Anti-poison ──
  {
    id: 's22', name: 'Sera',      role: 'Biologiste', rarity: 'D', icon: '🧬',
    ...s('biologiste', 'D'),
    effect: 'hot+5',         desc: 'Régénère 5 HP/tour à toute l\'équipe',
  },
  {
    id: 's23', name: 'Antidote',  role: 'Biologiste', rarity: 'E', icon: '💉',
    ...s('biologiste', 'E'),
    effect: 'hot+12+cleanse', desc: '+12 HP/tour + supprime poisons et saignements',
  },
  {
    id: 's24', name: 'Genome',    role: 'Biologiste', rarity: 'L', icon: '🔬',
    ...s('biologiste', 'L'),
    effect: 'hot+30+cleanse+mutation', desc: 'HoT élevé + nettoyage + mutation ADN (buff aléatoire)',
  },

  // ── INGÉNIEUR (SOUTIEN) — Tourelle / Buff équipe ──
  {
    id: 's25', name: 'Sparks',    role: 'Ingénieur',  rarity: 'D', icon: '🔧',
    ...s('ingenieur', 'D'),
    effect: 'turret+15',     desc: 'Déploie une tourelle qui inflige 15 dégâts/tour',
  },
  {
    id: 's26', name: 'Gadget',    role: 'Ingénieur',  rarity: 'E', icon: '⚡',
    ...s('ingenieur', 'E'),
    effect: 'turret+30+buff+0.1', desc: 'Tourelle 30 dégâts + +10% ATK à l\'équipe',
  },
  {
    id: 's27', name: 'Nexus',     role: 'Ingénieur',  rarity: 'L', icon: '🛸',
    ...s('ingenieur', 'L'),
    effect: 'turret+60+buff+0.25+shield', desc: 'Tourelle puissante + 25% ATK équipe + bouclier',
  },

  // ── TACTICIEN (SOUTIEN) — Synergie / Combo ──
  {
    id: 's28', name: 'Atlas',     role: 'Tacticien',  rarity: 'D', icon: '🗺',
    ...s('tacticien', 'D'),
    effect: 'synergy',       desc: '+5% ATK par survivant allié vivant',
  },
  {
    id: 's29', name: 'Oracle',    role: 'Tacticien',  rarity: 'E', icon: '🔮',
    ...s('tacticien', 'E'),
    effect: 'synergy+combo',  desc: 'Synergie + combo (2e attaque consécutive = +30% ATK)',
  },
  {
    id: 's30', name: 'Strategos', role: 'Tacticien',  rarity: 'L', icon: '♟',
    ...s('tacticien', 'L'),
    effect: 'synergy+combo+order', desc: 'Synergie max + combo + ordre de frappe optimisé',
  },

  // ── OMBRE (ASSASSIN) — Crit mortel / Esquive ──
  {
    id: 's31', name: 'Ghost',     role: 'Ombre',      rarity: 'D', icon: '👻',
    ...s('ombre', 'D'),
    effect: 'dodge+0.15',    desc: '15% d\'esquiver une attaque',
  },
  {
    id: 's32', name: 'Wraith',    role: 'Ombre',      rarity: 'E', icon: '🌑',
    ...s('ombre', 'E'),
    effect: 'dodge+0.3+deathcrit', desc: 'Esquive 30% + critique mortel (×4 si HP ennemi < 20%)',
  },
  {
    id: 's33', name: 'Spectre',   role: 'Ombre',      rarity: 'L', icon: '🕸',
    ...s('ombre', 'L'),
    effect: 'dodge+0.5+deathcrit+invisible', desc: 'Esquive 50%, crit mortel, invincibilité 1er tour',
  },

  // ── PISTARD (ASSASSIN) — SPD max / Chaîne ──
  {
    id: 's34', name: 'Flash',     role: 'Pistard',    rarity: 'D', icon: '⚡',
    ...s('pistard', 'D'),
    effect: 'spd+0.2',      desc: '+20% vitesse, attaque en premier',
  },
  {
    id: 's35', name: 'Bolt',      role: 'Pistard',    rarity: 'E', icon: '🏃',
    ...s('pistard', 'E'),
    effect: 'spd+0.4+chain+0.3', desc: '+40% SPD + 30% de chaîner une 2e attaque',
  },
  {
    id: 's36', name: 'Blitz',     role: 'Pistard',    rarity: 'L', icon: '🌩',
    ...s('pistard', 'L'),
    effect: 'spd+0.6+chain+0.6+first', desc: '+60% SPD, chaîne 60%, toujours en premier',
  },

  // ── BOSS DE ZONE (non obtenables en gacha) ──
  {
    id: 'b01', name: 'Le Berger',        role: 'Boss',  rarity: 'E', icon: '🐑',
    hp: 300,  atk: 45, def: 30, spd: 20,
    effect: 'boss_horde',   desc: 'Zone 1 — invoque des zombies de renfort', boss: true,
  },
  {
    id: 'b02', name: 'Docteur Zéro',     role: 'Boss',  rarity: 'E', icon: '🩻',
    hp: 500,  atk: 55, def: 40, spd: 25,
    effect: 'boss_poison',  desc: 'Zone 2 — inflige poison à toute l\'équipe', boss: true,
  },
  {
    id: 'b03', name: 'Le Réacteur',      role: 'Boss',  rarity: 'L', icon: '☢',
    hp: 800,  atk: 80, def: 60, spd: 20,
    effect: 'boss_radiation', desc: 'Zone 3 — irradiation (DEF -20% cumul)', boss: true,
  },
  {
    id: 'b04', name: 'Le Général X',     role: 'Boss',  rarity: 'L', icon: '🎖',
    hp: 1200, atk: 110, def: 80, spd: 35,
    effect: 'boss_order',   desc: 'Zone 4 — ordonne un assaut (×2 ATK 1 tour)', boss: true,
  },
  {
    id: 'b05', name: 'La Nuée',          role: 'Boss',  rarity: 'L', icon: '🦟',
    hp: 1800, atk: 90, def: 50, spd: 60,
    effect: 'boss_swarm',   desc: 'Zone 5 — essaim (frappe toute l\'équipe chaque tour)', boss: true,
  },
  {
    id: 'b06', name: 'Chimère-09',       role: 'Boss',  rarity: 'L', icon: '🧫',
    hp: 2500, atk: 140, def: 100, spd: 40,
    effect: 'boss_mutate',  desc: 'Zone 6 — mutation aléatoire chaque tour', boss: true,
  },
  {
    id: 'b07', name: 'Patient Zéro',     role: 'Boss',  rarity: 'L', icon: '🧟',
    hp: 4000, atk: 180, def: 120, spd: 30,
    effect: 'boss_apocalypse', desc: 'Zone 7 — source de l\'infection, régénère 50 HP/tour', boss: true,
  },
]

export const RARITY = {
  D: { label: 'Débutant', color: '#8A8880', bg: '#2A2820', text: '#C8C4BC' },
  E: { label: 'Expert',   color: '#378ADD', bg: '#0E2035', text: '#7AC0F5' },
  L: { label: 'Légende',  color: '#EF9F27', bg: '#2A1A05', text: '#F0C060' },
}

export const RARITY_ORDER = ['D', 'E', 'L']

// ── Méta des rôles (icône de classe + catégorie globale) ──
// classIconUrl pointe vers assets/icons/class-{slug}.png (pixel art custom)
// classIcon est le fallback emoji si l'image est absente
const CLASS_ICON = {
  'Tank':     { url: 'assets/icons/class-tank.png',     emoji: '🛡', color: '#4A8FE0' },
  'Mêlée':   { url: 'assets/icons/class-melee.png',    emoji: '👊', color: '#E05A4A' },
  'Distance': { url: 'assets/icons/class-distance.png', emoji: '🏹', color: '#E0C44A' },
  'Médecin':  { url: 'assets/icons/class-medic.png',    emoji: '✚',  color: '#5AE05A' },
  'Soutien':  { url: 'assets/icons/class-support.png',  emoji: '🔧', color: '#C8A0FF' },
  'Assassin': { url: 'assets/icons/class-assassin.png', emoji: '🗡', color: '#A0C8FF' },
}

export const ROLE_META = {
  'Bouclier':   { globalClass: 'Tank',      classIcon: '🛡', classColor: '#4A8FE0', classIconUrl: CLASS_ICON['Tank'].url },
  'Blindé':     { globalClass: 'Tank',      classIcon: '🛡', classColor: '#4A8FE0', classIconUrl: CLASS_ICON['Tank'].url },
  'Berserk':    { globalClass: 'Mêlée',     classIcon: '👊', classColor: '#E05A4A', classIconUrl: CLASS_ICON['Mêlée'].url },
  'Lame':       { globalClass: 'Mêlée',     classIcon: '👊', classColor: '#E05A4A', classIconUrl: CLASS_ICON['Mêlée'].url },
  'Tireur':     { globalClass: 'Distance',  classIcon: '🏹', classColor: '#E0C44A', classIconUrl: CLASS_ICON['Distance'].url },
  'Artificier': { globalClass: 'Distance',  classIcon: '🏹', classColor: '#E0C44A', classIconUrl: CLASS_ICON['Distance'].url },
  'Médic':      { globalClass: 'Médecin',   classIcon: '✚',  classColor: '#5AE05A', classIconUrl: CLASS_ICON['Médecin'].url },
  'Biologiste': { globalClass: 'Médecin',   classIcon: '✚',  classColor: '#5AE05A', classIconUrl: CLASS_ICON['Médecin'].url },
  'Ingénieur':  { globalClass: 'Soutien',   classIcon: '🔧', classColor: '#C8A0FF', classIconUrl: CLASS_ICON['Soutien'].url },
  'Tacticien':  { globalClass: 'Soutien',   classIcon: '🔧', classColor: '#C8A0FF', classIconUrl: CLASS_ICON['Soutien'].url },
  'Ombre':      { globalClass: 'Assassin',  classIcon: '🗡', classColor: '#A0C8FF', classIconUrl: CLASS_ICON['Assassin'].url },
  'Pistard':    { globalClass: 'Assassin',  classIcon: '🗡', classColor: '#A0C8FF', classIconUrl: CLASS_ICON['Assassin'].url },
}

// Helper : renvoie le HTML d'une icône de classe (img custom ou emoji fallback)
export function classIconHtml(meta, size = 28, color) {
  if (!meta) return ''
  const c = color || meta.classColor || '#888'
  if (meta.classIconUrl) {
    return `<img class="class-icon-img" src="${meta.classIconUrl}" alt="${meta.globalClass}"
      style="width:${size}px;height:${size}px;image-rendering:pixelated;filter:drop-shadow(0 0 2px ${c}44)"
      onerror="this.style.display='none';this.nextSibling&&(this.nextSibling.style.display='block')">`
      + `<span class="class-icon-fallback" style="display:none;color:${c};font-size:${size * 0.6}px">${meta.classIcon}</span>`
  }
  return `<span style="color:${c};font-size:${size * 0.6}px">${meta.classIcon}</span>`
}

// ── Sprite mapping (6 classes × 3 raretés) ──
const GLOBAL_CLASS_TO_SPRITE = {
  'Tank':     'tank',
  'Mêlée':   'melee',
  'Distance': 'sniper',
  'Médecin':  'medic',
  'Soutien':  'engineer',
  'Assassin': 'assassin',
}

export function getSpriteUrl(survivor) {
  if (survivor.boss) return null
  const meta = ROLE_META[survivor.role]
  if (!meta) return null
  const key = GLOBAL_CLASS_TO_SPRITE[meta.globalClass]
  if (!key) return null
  return `assets/sprites/${survivor.rarity.toLowerCase()}/${key}.png`
}

// ── Helpers ──
export function getSurvivorById(id) {
  return SURVIVORS.find(s => s.id === id) || null
}

export function getSurvivorsByRarity(rarity) {
  return SURVIVORS.filter(s => s.rarity === rarity && !s.boss)
}

export function getSurvivorsByRole(role) {
  return SURVIVORS.filter(s => s.role === role && !s.boss)
}
