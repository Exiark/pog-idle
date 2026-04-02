import { MISSIONS_DEFAULT } from './economy.js'

const SAVE_KEY = 'pog_idle_v1'

export const DEFAULT_STATE = {
  version: '1.0.0',
  prestigeLevel: 0,

  gold: 250,
  gems: 15,
  fragments: 0,
  tokens: 0,

  currentWorld: 1,
  currentFloor: 1,
  activeWorld: 1,
  unlockedWorlds: [1],
  bossesDefeated: [],
  worldKinis: [],
  worldPogs: [],

  collection: [],
  equippedPogs: Array(10).fill(null),
  selectedKini: 0,

  pityE: 0,
  pityL: 0,
  totalPulls: 0,

  talentPoints: 0,
  talentsUnlocked: [],

  accountXP: 0,
  accountLevel: 0,

  lastSeen: Date.now(),
  dailyClaimed: false,
  dailyDay: 0,
  missions: [],

  stripeCustomerId: null,
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return initState()
    const saved = JSON.parse(raw)
    return Object.assign({}, DEFAULT_STATE, saved)
  } catch (e) {
    console.warn('Sauvegarde corrompue.', e)
    return initState()
  }
}

function initState() {
  const state = JSON.parse(JSON.stringify(DEFAULT_STATE))
  state.lastSeen = Date.now()
  state.missions = JSON.parse(JSON.stringify(MISSIONS_DEFAULT))
  return state
}

export function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Erreur de sauvegarde.', e)
  }
}

export function resetState() {
  localStorage.removeItem(SAVE_KEY)
  return initState()
}

export function hasTalent(state, id) {
  return state.talentsUnlocked.includes(id)
}

export function getEquippedPogs(state) {
  return state.equippedPogs.filter(Boolean)
}

export function calcIdleRate(state) {
  let rate = 0
  getEquippedPogs(state).forEach(p => {
    if (p.effect?.startsWith('idle+')) rate += parseFloat(p.effect.split('+')[1])
    if (p.effect === 'master') rate *= 2
  })
  return Math.round(rate * 10) / 10
}

export function calcOfflineGold(state) {
  const rate = calcIdleRate(state)
  if (rate <= 0) return 0
  const elapsed = (Date.now() - state.lastSeen) / 1000
  const capped  = Math.min(elapsed, 8 * 3600)
  return Math.floor(rate * capped)
}