// ── SHELTER SURVIVOR — Économie ──

export const MISSIONS_DEFAULT = [
  { id: 'm1', name: 'Terminer 3 vagues',    type: 'waves',            target: 3,   progress: 0, done: false, reward: { capsules: 80 } },
  { id: 'm2', name: 'Ouvrir 1 signal',      type: 'signals',          target: 1,   progress: 0, done: false, reward: { radium: 5 } },
  { id: 'm3', name: 'Éliminer 20 ennemis',  type: 'kills',            target: 20,  progress: 0, done: false, reward: { tokens: 2 } },
  { id: 'm4', name: 'Gagner 500 capsules',  type: 'capsules_earned',  target: 500, progress: 0, done: false, reward: { dna: 10 } },
]

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
    cost: 100,
    weights: { D: 60, E: 30, L: 10 },
  },
  urgent: {
    name: 'Signal Urgent',
    count: 3,
    currency: 'capsules',
    cost: 300,
    weights: { D: 25, E: 55, L: 20 },
  },
  premium: {
    name: 'Signal Premium',
    count: 5,
    currency: 'radium',
    cost: 20,
    weights: { D: 5, E: 50, L: 45 },
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
      m.done = true
      applyReward(state, m.reward)
      logs.push(`Mission : ${m.name}`)
    }
  })
  return logs
}

export function claimDaily(state) {
  if (state.dailyClaimed) return null
  const day = state.dailyDay % 7
  const reward = DAILY_REWARDS[day]
  applyReward(state, reward)
  state.dailyClaimed = true
  state.dailyDay++
  return reward
}

export function collectOffline(state, multiplier = 1) {
  let rate = 0
  if (state.team) {
    state.team.forEach(s => {
      if (!s?.effect) return
      if (s.effect.startsWith('idle+')) rate += parseFloat(s.effect.split('+')[1])
    })
  }
  if (rate <= 0) return 0
  const elapsed = (Date.now() - state.lastSeen) / 1000
  const capped  = Math.min(elapsed, 8 * 3600)
  const earned  = Math.floor(rate * capped * multiplier)
  state.capsules += earned
  state.lastSeen  = Date.now()
  return earned
}
