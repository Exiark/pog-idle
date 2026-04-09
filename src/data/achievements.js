// ── SHELTER 7 — Achèvements ──

export const ACHIEVEMENTS = [
  {
    id: 'ach_first_blood',
    name: 'Premier Sang',
    desc: 'Remporter votre première vague',
    icon: '⚔',
    condition: s => (s.stats?.totalWaves || 0) >= 1,
    reward: { capsules: 100 },
  },
  {
    id: 'ach_slayer_100',
    name: 'Exterminateur',
    desc: 'Éliminer 100 ennemis',
    icon: '💀',
    condition: s => (s.stats?.totalKills || 0) >= 100,
    reward: { dna: 15 },
  },
  {
    id: 'ach_slayer_500',
    name: 'Machine à tuer',
    desc: 'Éliminer 500 ennemis',
    icon: '☠',
    condition: s => (s.stats?.totalKills || 0) >= 500,
    reward: { dna: 50, radium: 5 },
  },
  {
    id: 'ach_first_expert',
    name: 'Recrue d\'élite',
    desc: 'Recruter un survivant Expert',
    icon: '🎯',
    condition: s => s.collection?.some(p => p.rarity === 'E'),
    reward: { capsules: 300 },
  },
  {
    id: 'ach_first_legend',
    name: 'Légende vivante',
    desc: 'Recruter un survivant Légendaire',
    icon: '⭐',
    condition: s => s.collection?.some(p => p.rarity === 'L'),
    reward: { radium: 20 },
  },
  {
    id: 'ach_first_boss',
    name: 'Chasseur de boss',
    desc: 'Vaincre votre premier boss de zone',
    icon: '🏆',
    condition: s => (s.bossesDefeated?.length || 0) >= 1,
    reward: { capsules: 500, dna: 20 },
  },
  {
    id: 'ach_zone_3',
    name: 'Zone dangereuse',
    desc: 'Atteindre la Zone 3',
    icon: '☢',
    condition: s => (s.currentZone || 1) >= 3,
    reward: { radium: 10 },
  },
  {
    id: 'ach_full_team',
    name: 'Force de frappe',
    desc: 'Assembler une équipe complète de 6',
    icon: '👥',
    condition: s => s.team?.filter(Boolean).length >= 6,
    reward: { capsules: 200 },
  },
  {
    id: 'ach_first_fusion',
    name: 'Alchimiste',
    desc: 'Réaliser votre première fusion',
    icon: '⚡',
    condition: s => (s.stats?.totalFusions || 0) >= 1,
    reward: { dna: 25 },
  },
  {
    id: 'ach_signals_10',
    name: 'Opérateur radio',
    desc: 'Envoyer 10 signaux de détresse',
    icon: '📡',
    condition: s => (s.stats?.totalSignals || 0) >= 10,
    reward: { capsules: 400, radium: 5 },
  },
  {
    id: 'ach_prestige',
    name: 'Renaître de ses cendres',
    desc: 'Effectuer votre premier prestige',
    icon: '🔄',
    condition: s => (s.stats?.totalPrestige || 0) >= 1,
    reward: { radium: 30 },
  },
  {
    id: 'ach_all_zones',
    name: 'La Fin du Monde',
    desc: 'Sécuriser toutes les zones',
    icon: '🌍',
    condition: s => (s.bossesDefeated?.length || 0) >= 7,
    reward: { radium: 50, dna: 100 },
  },
]

export function checkAchievements(state) {
  if (!state.achievements) state.achievements = {}
  const newlyUnlocked = []

  ACHIEVEMENTS.forEach(ach => {
    if (state.achievements[ach.id]) return
    if (ach.condition(state)) {
      state.achievements[ach.id] = Date.now()
      // Appliquer la récompense
      if (ach.reward.capsules) state.capsules += ach.reward.capsules
      if (ach.reward.dna)      state.dna      += ach.reward.dna
      if (ach.reward.radium)   state.radium   += ach.reward.radium
      newlyUnlocked.push(ach)
    }
  })

  return newlyUnlocked
}
