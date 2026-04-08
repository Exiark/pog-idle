// ── SHELTER SURVIVOR — Économie ──
import { SURVIVORS } from '../data/survivors.js'

// Missions quotidiennes (pool rotatif — 4 tirées chaque jour)
const MISSION_POOL = [
  { id: 'm_waves_3',    name: '3 missions de terrain',    type: 'waves',           target: 3,    reward: { capsules: 80 } },
  { id: 'm_waves_5',    name: '5 vagues remportées',      type: 'waves',           target: 5,    reward: { capsules: 150, dna: 5 } },
  { id: 'm_waves_10',   name: '10 vagues remportées',     type: 'waves',           target: 10,   reward: { capsules: 300, dna: 10 } },
  { id: 'm_signals_1',  name: 'Envoyer 1 signal',         type: 'signals',         target: 1,    reward: { radium: 5 } },
  { id: 'm_signals_3',  name: 'Envoyer 3 signaux',        type: 'signals',         target: 3,    reward: { radium: 10, dna: 5 } },
  { id: 'm_kills_15',   name: 'Éliminer 15 ennemis',      type: 'kills',           target: 15,   reward: { capsules: 60, dna: 3 } },
  { id: 'm_kills_30',   name: 'Éliminer 30 ennemis',      type: 'kills',           target: 30,   reward: { dna: 10 } },
  { id: 'm_kills_50',   name: 'Éliminer 50 ennemis',      type: 'kills',           target: 50,   reward: { dna: 20, radium: 5 } },
  { id: 'm_caps_500',   name: 'Gagner 500 capsules',      type: 'capsules_earned', target: 500,  reward: { dna: 8 } },
  { id: 'm_caps_1000',  name: 'Gagner 1000 capsules',     type: 'capsules_earned', target: 1000, reward: { dna: 15, radium: 3 } },
]

export const MISSIONS_DEFAULT = MISSION_POOL.slice(0, 4).map(m => ({ ...m, progress: 0, done: false }))

export function refreshMissions(state) {
  // Tire 4 missions aléatoires différentes chaque jour
  const shuffled = [...MISSION_POOL].sort(() => Math.random() - 0.5)
  state.missions = shuffled.slice(0, 4).map(m => ({ ...m, progress: 0, done: false }))
  state.missionsDay = getTodayKey()
}

export function checkMissionsReset(state) {
  const today = getTodayKey()
  if (state.missionsDay !== today) {
    refreshMissions(state)
  }
}

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export const DAILY_REWARDS = [
  { day: 1, capsules: 100 },
  { day: 2, capsules: 200 },
  { day: 3, radium: 5 },
  { day: 4, capsules: 300, dna: 5 },
  { day: 5, radium: 10 },
  { day: 6, capsules: 400 },
  { day: 7, capsules: 500, radium: 15, dna: 10 },
]

// ── Signaux de détresse (gacha) ──
export const SIGNAL_CONFIG = {
  basic: {
    name: 'Signal Basique',
    count: 3,
    currency: 'capsules',
    cost: 300,
    weights: { D: 82, E: 15, L: 3 },
  },
  urgent: {
    name: 'Signal Urgent',
    count: 3,
    currency: 'capsules',
    cost: 800,
    weights: { D: 65, E: 30, L: 5 },
  },
  premium: {
    name: 'Signal Premium',
    count: 5,
    currency: 'radium',
    cost: 35,
    weights: { D: 35, E: 50, L: 15 },
  },
}

export const RADIUM_PACKS = [
  { id: 'rad_80',   radium: 80,   price: 0.99,  label: 'Dose',    bonus: null },
  { id: 'rad_500',  radium: 500,  price: 4.99,  label: 'Réserve', bonus: '+50 bonus' },
  { id: 'rad_1200', radium: 1200, price: 9.99,  label: 'Arsenal', bonus: '+200 bonus' },
  { id: 'rad_2800', radium: 2800, price: 19.99, label: 'Légende', bonus: '+800 bonus' },
]

export function applyReward(state, reward) {
  if (reward.capsules) state.capsules += reward.capsules
  if (reward.radium)   state.radium   += reward.radium
  if (reward.dna)      state.dna      += reward.dna
  if (reward.tokens)   state.tokens   += reward.tokens
  return state
}

export function updateMission(state, type, amount) {
  const logs = []
  if (!state.missions) return logs
  state.missions.forEach(m => {
    if (m.done || m.type !== type) return
    m.progress = Math.min(m.target, m.progress + amount)
    if (m.progress >= m.target) {
      m.done    = true
      m.claimed = false   // attente de réclamation manuelle
      logs.push(`Mission : ${m.name}`)
    }
  })
  return logs
}

// Réclame une mission individuelle — applique la récompense manuellement
export function claimMission(state, missionId) {
  if (!state.missions) return null
  const m = state.missions.find(x => x.id === missionId)
  if (!m || !m.done || m.claimed) return null
  m.claimed = true
  applyReward(state, m.reward)
  return m.reward
}

export function claimDaily(state) {
  const today = getTodayKey()
  // Reset automatique si nouveau jour
  if (state.dailyClaimedDay && state.dailyClaimedDay !== today) {
    state.dailyClaimed = false
  }
  if (state.dailyClaimed) return null
  const day    = state.dailyDay % 7
  const reward = { ...DAILY_REWARDS[day] }

  // Gestion du streak (jours consécutifs)
  const yesterday = getYesterdayKey()
  if (state.lastDailyDate === yesterday) {
    state.dailyStreak = (state.dailyStreak || 0) + 1
  } else if (state.lastDailyDate !== today) {
    state.dailyStreak = 1
  }

  // Bonus streak au 7e jour consécutif
  let streakBonus = null
  if (state.dailyStreak > 0 && state.dailyStreak % 7 === 0) {
    streakBonus = { capsules: 500, radium: 10 }
    reward.capsules = (reward.capsules || 0) + streakBonus.capsules
    reward.radium   = (reward.radium   || 0) + streakBonus.radium
  }

  applyReward(state, reward)
  state.dailyClaimed    = true
  state.dailyClaimedDay = today
  state.lastDailyDate   = today
  state.dailyDay++
  return { reward, streak: state.dailyStreak, streakBonus }
}

function getYesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// ── Upgrade survivant (ADN) ──
// Coût : niveau 1→5 : 10 / 25 / 50 / 100 / 200 ADN
export const UPGRADE_COST = [10, 25, 50, 100, 200]
export const UPGRADE_MAX  = 5

export function upgradeSurvivor(state, survivorId) {
  const upgrades = state.survivorUpgrades || {}
  const current  = upgrades[survivorId] || 0
  if (current >= UPGRADE_MAX) return { error: 'Niveau maximum atteint' }

  const cost = UPGRADE_COST[current]
  if (state.dna < cost) return { error: `ADN insuffisant (${cost} requis)` }

  state.dna -= cost
  state.survivorUpgrades = { ...upgrades, [survivorId]: current + 1 }
  return { newLevel: current + 1, cost }
}

// ── Recyclage de doublons ──
// Taux : 3× D → 10 ADN | 3× E → 30 ADN | 3× L → 100 ADN
// Ou bien : 5× D → 1× E (fusion spéciale)
const RECYCLE_DNA = { D: 10, E: 30, L: 100 }

export function getRecyclableStacks(state) {
  // Regroupe les copies par id et retourne ceux avec ≥ 3 copies
  const counts = {}
  state.collection.forEach(p => { counts[p.id] = (counts[p.id] || 0) + 1 })
  return Object.entries(counts)
    .filter(([, n]) => n >= 3)
    .map(([id, count]) => {
      const sv = SURVIVORS.find(x => x.id === id)
      if (!sv) return null
      const stacks = Math.floor(count / 3)
      return { id, name: sv.name, rarity: sv.rarity, count, stacks, dnaGain: stacks * RECYCLE_DNA[sv.rarity] }
    })
    .filter(Boolean)
}

export function recycleSurvivor(state, survivorId, stacks = 1) {
  const sv = SURVIVORS.find(x => x.id === survivorId)
  if (!sv) return { error: 'Survivant inconnu' }

  const copies = state.collection.filter(p => p.id === survivorId).length
  const needed = stacks * 3
  if (copies < needed) return { error: `Pas assez de copies (${copies}/${needed})` }

  // Retire les copies
  let removed = 0
  state.collection = state.collection.filter(p => {
    if (p.id === survivorId && removed < needed) { removed++; return false }
    return true
  })

  const dna = stacks * RECYCLE_DNA[sv.rarity]
  state.dna += dna
  return { dna, stacks, survivorName: sv.name }
}

// ── Maîtrise répétable (points de talent excédentaires) ──
export function unlockMastery(state) {
  const rank = state.masteryRank || 0
  const cost = 1 + Math.floor(rank / 3)
  if (state.talentPoints < cost) return { error: `${cost} point(s) requis` }
  state.talentPoints -= cost
  state.masteryRank   = rank + 1
  return { newRank: rank + 1 }
}

export function collectOffline(state, multiplier = 1) {
  const IDLE_RATE_BY_RARITY = { D: 0.05, E: 0.15, L: 0.4 }
  let rate = 0
  const uniqueIds = [...new Set((state.collection || []).map(p => p.id))]
  uniqueIds.forEach(id => {
    const sv = SURVIVORS.find(x => x.id === id)
    if (sv && !sv.boss) rate += IDLE_RATE_BY_RARITY[sv.rarity] || 0
  })
  if (state.talentsUnlocked?.includes('t5')) rate *= 1.5
  rate += (state.masteryRank || 0) * 0.02
  rate *= 1 + (state.prestigeLevel || 0) * 0.1

  if (rate <= 0) return 0
  const elapsed = (Date.now() - state.lastSeen) / 1000
  const capped  = Math.min(elapsed, 8 * 3600)
  const earned  = Math.floor(rate * capped * multiplier)
  state.capsules += earned
  state.lastSeen  = Date.now()
  return earned
}
