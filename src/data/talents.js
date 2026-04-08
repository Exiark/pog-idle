export const TALENTS = [
  // ── RANGÉE 1 — Combat ──
  {
    id: 't1',
    name: 'Réflexes',
    desc: '+10% vitesse d\'attaque de l\'équipe',
    icon: '⚡',
    cost: 1,
    row: 1,
    requires: null,
  },
  {
    id: 't2',
    name: 'Coup Précis',
    desc: '+10% chance critique et +10% ATK',
    icon: '🎯',
    cost: 1,
    row: 1,
    requires: null,
  },
  {
    id: 't3',
    name: 'Briseur',
    desc: '-20% ATK ennemie reçue',
    icon: '🛡',
    cost: 1,
    row: 1,
    requires: null,
  },

  // ── RANGÉE 2 — Économie ──
  {
    id: 't4',
    name: 'Pilleur',
    desc: '+15% capsules par vague',
    icon: '💊',
    cost: 2,
    row: 2,
    requires: 't1',
  },
  {
    id: 't5',
    name: 'Veilleur',
    desc: '+50% gains idle au repos',
    icon: '🌙',
    cost: 2,
    row: 2,
    requires: 't2',
  },
  {
    id: 't6',
    name: 'Biologiste',
    desc: '+2 ADN par vague remportée',
    icon: '🧬',
    cost: 2,
    row: 2,
    requires: 't3',
  },

  // ── RANGÉE 3 — Maîtrise ──
  {
    id: 't7',
    name: 'Collectionneur',
    desc: '+1 radium par vague · +20% DEF équipe',
    icon: '☢',
    cost: 3,
    row: 3,
    requires: 't4',
  },
  {
    id: 't8',
    name: 'Synergiste',
    desc: '+20% ATK si ≥3 rôles différents',
    icon: '🔗',
    cost: 3,
    row: 3,
    requires: 't5',
  },
  {
    id: 't9',
    name: 'Chercheur',
    desc: '+50% ADN issu des fusions',
    icon: '🔬',
    cost: 3,
    row: 3,
    requires: 't6',
  },
]

// ── Coût et bonus des rangs de Maîtrise (répétables) ──
export function masteryCost(rank) {
  return 1 + Math.floor(rank / 3)   // 1pt rangs 0-2, 2pts rangs 3-5, etc.
}

// Bonus cumulés par rang (appliqués dans calcTalentBonuses)
export const MASTERY_BONUS_PER_RANK = {
  atkMult:  0.01,   // +1% ATK
  defMult:  0.01,   // +1% DEF
  hpMult:   0.01,   // +1% HP max
  idleFlat: 0.02,   // +0.02 caps/s idle
}
