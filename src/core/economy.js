// ── Missions journalières par défaut ──
export const MISSIONS_DEFAULT = [
  {
    id: 'm1',
    name: 'Flipper 20 pogs',
    type: 'flips',
    target: 20,
    progress: 0,
    done: false,
    reward: { gold: 50 },
  },
  {
    id: 'm2',
    name: 'Ouvrir 1 pack',
    type: 'packs',
    target: 1,
    progress: 0,
    done: false,
    reward: { gems: 5 },
  },
  {
    id: 'm3',
    name: 'Terminer 3 vagues',
    type: 'waves',
    target: 3,
    progress: 0,
    done: false,
    reward: { tokens: 2 },
  },
  {
    id: 'm4',
    name: 'Gagner 500 or',
    type: 'gold_earned',
    target: 500,
    progress: 0,
    done: false,
    reward: { fragments: 10 },
  },
]

// ── Récompenses de connexion journalière (cycle de 7 jours) ──
export const DAILY_REWARDS = [
  { day: 1, gold: 100 },
  { day: 2, gold: 200 },
  { day: 3, gems: 5 },
  { day: 4, gold: 300, fragments: 5 },
  { day: 5, gems: 10 },
  { day: 6, gold: 400 },
  { day: 7, gold: 500, gems: 15, fragments: 10 },
]

// ── Configuration des packs gacha ──
export const PACK_CONFIG = {
  basic: {
    name: 'Pack Basique',
    count: 3,
    currency: 'gold',
    cost: 50,
    weights: { C: 60, R: 28, E: 9, L: 2, M: 1 },
  },
  rare: {
    name: 'Pack Rare',
    count: 3,
    currency: 'gold',
    cost: 150,
    weights: { C: 30, R: 42, E: 19, L: 7, M: 2 },
  },
  premium: {
    name: 'Pack Premium',
    count: 5,
    currency: 'gems',
    cost: 20,
    weights: { C: 15, R: 33, E: 30, L: 17, M: 5 },
  },
}

// ── Boutique de gemmes (Stripe) ──
export const GEM_PACKS = [
  { id: 'gems_80',   gems: 80,   price: 0.99,  label: 'Starter',  bonus: null },
  { id: 'gems_500',  gems: 500,  price: 4.99,  label: 'Aventurier', bonus: '+50 bonus' },
  { id: 'gems_1200', gems: 1200, price: 9.99,  label: 'Héros',    bonus: '+200 bonus' },
  { id: 'gems_2800', gems: 2800, price: 19.99, label: 'Légende',  bonus: '+800 bonus' },
]

// ── Utilitaires économiques ──

// Applique une récompense à l'état
export function applyReward(state, reward) {
  if (reward.gold)      state.gold      += reward.gold
  if (reward.gems)      state.gems      += reward.gems
  if (reward.fragments) state.fragments += reward.fragments
  if (reward.tokens)    state.tokens    += reward.tokens
  return state
}

// Met à jour la progression d'une mission
export function updateMission(state, type, amount) {
  const logs = []
  state.missions.forEach(m => {
    if (m.done || m.type !== type) return
    m.progress = Math.min(m.target, m.progress + amount)
    if (m.progress >= m.target) {
      m.done = true
      applyReward(state, m.reward)
      logs.push(`Mission accomplie : ${m.name}`)
    }
  })
  return logs
}

// Réclame la récompense journalière
export function claimDaily(state) {
  if (state.dailyClaimed) return null
  const day = state.dailyDay % 7
  const reward = DAILY_REWARDS[day]
  applyReward(state, reward)
  state.dailyClaimed = true
  state.dailyDay++
  return reward
}

// Calcule le multiplicateur d'or selon les pogs équipés et talents
export function calcGoldMult(state, hasTalentFn) {
  let mult = 1
  if (hasTalentFn(state, 't4')) mult += 0.15
  state.equippedPogs.forEach(p => {
    if (!p) return
    if (p.effect?.startsWith('gold+')) mult += parseFloat(p.effect.split('+')[1])
    if (p.effect === 'master') mult *= 2
  })
  return mult
}

// Calcule les gains offline et met à jour lastSeen
export function collectOffline(state, multiplier = 1) {
  const rate = calcIdleRateRaw(state)
  if (rate <= 0) return 0
  const elapsed = (Date.now() - state.lastSeen) / 1000
  const capped = Math.min(elapsed, 8 * 3600)
  const earned = Math.floor(rate * capped * multiplier)
  state.gold += earned
  state.lastSeen = Date.now()
  return earned
}

function calcIdleRateRaw(state) {
  let rate = 0
  state.equippedPogs.forEach(p => {
    if (!p) return
    if (p.effect?.startsWith('idle+')) rate += parseFloat(p.effect.split('+')[1])
    if (p.effect === 'master') rate *= 2
  })
  return rate
}