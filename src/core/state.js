import { MISSIONS_DEFAULT } from './economy.js'

const SAVE_KEY = 'pog_idle_v1'

export const DEFAULT_STATE = {
  // ── Meta ──
  version: '1.0.0',
  prestigeLevel: 0,

  // ── Ressources ──
  gold: 250,
  gems: 15,
  fragments: 0,
  tokens: 0,

  // ── Progression tour ──
  currentWorld: 1,
  currentFloor: 1,
  activeWorld: 1,
  unlockedWorlds: [1],
  bossesDefeated: [],
  worldKinis: [],
  worldPogs: [],

  // ── Collection ──
  collection: [],
  equippedPogs: Array(10).fill(null),
  selectedKini: 0,

  // ── Kinis ──
  kiniLevels: [1, 1, 1, 1, 1],
  kiniXP: [0, 0, 0, 0, 0],

  // ── Gacha ──
  pityE: 0,
  pityL: 0,
  totalPulls: 0,

  // ── Talents ──
  talentPoints: 0,
  talentsUnlocked: [],

  // ── Compte ──
  accountXP: 0,
  accountLevel: 0,

  // ── Économie ──
  lastSeen: Date.now(),
  dailyClaimed: false,
  dailyDay: 0,
  missions: [],

  // ── Stripe ──
  stripeCustomerId: null,
}

// ── Charge la sauvegarde depuis localStorage ──
export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return initState()
    const saved = JSON.parse(raw)
    // Fusionne avec DEFAULT_STATE pour ajouter les nouvelles clés
    // si le joueur a une ancienne sauvegarde
    return Object.assign({}, DEFAULT_STATE, saved)
  } catch (e) {
    console.warn('Sauvegarde corrompue, réinitialisation.', e)
    return initState()
  }
}

// ── Initialise un état tout neuf ──
function initState() {
  const state = JSON.parse(JSON.stringify(DEFAULT_STATE))
  state.lastSeen = Date.now()
  state.missions = JSON.parse(JSON.stringify(MISSIONS_DEFAULT))
  return state
}

// ── Sauvegarde l'état dans localStorage ──
export function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Erreur de sauvegarde.', e)
  }
}

// ── Réinitialise complètement la partie ──
export function resetState() {
  localStorage.removeItem(SAVE_KEY)
  return initState()
}

// ── Getters utilitaires ──

export function hasTalent(state, id) {
  return state.talentsUnlocked.includes(id)
}

export function getEquippedPogs(state) {
  return state.equippedPogs.filter(Boolean)
}

export function getUnlockedKinis(state) {
  return [
    ...Array(5).fill(null).map((_, i) => i),
    ...state.worldKinis,
  ]
}

export function calcIdleRate(state) {
  let rate = 0
  const idleMult = 1 + (hasTalent(state, 't5') ? 0.5 : 0)
  getEquippedPogs(state).forEach(p => {
    if (p.effect?.startsWith('idle+')) {
      rate += parseFloat(p.effect.split('+')[1])
    }
    if (p.effect === 'master') rate *= 2
    if (p.effect === 'speed+0.4') rate *= 2
  })
  return Math.round(rate * idleMult * 10) / 10
}

export function calcOfflineGold(state) {
  const rate = calcIdleRate(state)
  if (rate <= 0) return 0
  const elapsed = (Date.now() - state.lastSeen) / 1000
  const capped = Math.min(elapsed, 8 * 3600) // max 8h
  return Math.floor(rate * capped)
}