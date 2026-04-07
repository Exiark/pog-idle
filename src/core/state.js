import { MISSIONS_DEFAULT } from './economy.js'
import { SURVIVORS } from '../data/survivors.js'

// Capsules/s générées par un survivant au repos selon sa rareté
const IDLE_RATE_BY_RARITY = { D: 0.05, E: 0.15, L: 0.4 }

const SAVE_KEY = 'shelter_survivor_v1'

export const DEFAULT_STATE = {
  version: '1.0.0',
  prestigeLevel: 0,

  // ── Devises ──
  capsules: 250,   // était: gold
  radium:   15,    // était: gems
  dna:      0,     // était: fragments (ADN mutant)
  tokens:   0,

  // ── Progression zones ──
  currentZone:     1,   // était: currentWorld
  currentWave:     1,   // était: currentFloor
  activeZone:      1,   // était: activeWorld
  unlockedZones:   [1], // était: unlockedWorlds
  bossesDefeated:  [],
  zoneSurvivors:   [],  // survivants boss obtenus (était: worldPogs)

  // ── Collection & équipe ──
  collection:   [],              // { id, rarity }
  team:         Array(6).fill(null), // 6 slots (était: equippedPogs x10)

  // ── Gacha pity ──
  pityE: 0,   // pity Expert
  pityL: 0,   // pity Légende
  totalPulls: 0,

  // ── Talents ──
  talentPoints:    0,
  talentsUnlocked: [],

  // ── Compte ──
  accountXP:    0,
  accountLevel: 0,

  // ── Temps / daily ──
  lastSeen:     Date.now(),
  dailyClaimed: false,
  dailyDay:     0,
  missions:     [],

  stripeCustomerId: null,
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return initState()
    const saved = JSON.parse(raw)
    // Migration depuis pog_idle_v1
    const migrated = migrateLegacy(saved)
    return Object.assign({}, DEFAULT_STATE, migrated)
  } catch (e) {
    console.warn('Sauvegarde corrompue.', e)
    return initState()
  }
}

// ── Migration depuis l'ancienne clé pog_idle_v1 ──
function migrateLegacy(saved) {
  const out = { ...saved }
  if ('gold'          in saved && !('capsules'       in saved)) out.capsules      = saved.gold
  if ('gems'          in saved && !('radium'         in saved)) out.radium         = saved.gems
  if ('fragments'     in saved && !('dna'            in saved)) out.dna            = saved.fragments
  if ('currentWorld'  in saved && !('currentZone'    in saved)) out.currentZone    = saved.currentWorld
  if ('currentFloor'  in saved && !('currentWave'    in saved)) out.currentWave    = saved.currentFloor
  if ('activeWorld'   in saved && !('activeZone'     in saved)) out.activeZone     = saved.activeWorld
  if ('unlockedWorlds'in saved && !('unlockedZones'  in saved)) out.unlockedZones  = saved.unlockedWorlds
  if ('worldPogs'     in saved && !('zoneSurvivors'  in saved)) out.zoneSurvivors  = saved.worldPogs
  if ('equippedPogs'  in saved && !('team'           in saved)) {
    // On prend les 6 premiers slots non-nuls
    const equipped = saved.equippedPogs.filter(Boolean).slice(0, 6)
    out.team = [...equipped, ...Array(6 - equipped.length).fill(null)]
  }
  return out
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

// ── Retourne les survivants actifs dans l'équipe ──
export function getTeam(state) {
  return state.team.filter(Boolean)
}

// ── Calcul du taux idle (capsules/s) ──
// Tous les survivants en collection génèrent des capsules au repos.
// Les survivants en équipe (Médic/Biologiste avec hot+) ajoutent un bonus.
export function calcIdleRate(state) {
  let rate = 0

  // Base : chaque survivant possédé génère selon sa rareté
  const uniqueIds = [...new Set((state.collection || []).map(p => p.id))]
  uniqueIds.forEach(id => {
    const sv = SURVIVORS.find(x => x.id === id)
    if (sv && !sv.boss) rate += IDLE_RATE_BY_RARITY[sv.rarity] || 0
  })

  // Bonus d'équipe : talents et effets passifs
  if (hasTalent(state, 't5')) rate *= 1.5

  return Math.round(rate * 10) / 10
}

// ── Calcul des capsules gagnées hors-ligne ──
export function calcOfflineCapsules(state) {
  const rate = calcIdleRate(state)
  if (rate <= 0) return 0
  const elapsed = (Date.now() - state.lastSeen) / 1000
  const capped  = Math.min(elapsed, 8 * 3600)
  return Math.floor(rate * capped)
}
