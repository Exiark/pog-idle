import { SURVIVORS, RARITY_ORDER } from '../data/survivors.js'
import { SIGNAL_CONFIG, updateMission } from './economy.js'

function rollRarity(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (const [key, val] of Object.entries(weights)) {
    r -= val
    if (r <= 0) return key
  }
  return 'D'
}

function rollSurvivor(rarity) {
  const pool = SURVIVORS.filter(s => s.rarity === rarity && !s.boss)
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

export function openSignal(state, signalType) {
  const cfg = SIGNAL_CONFIG[signalType]
  if (!cfg) return { error: 'Signal inconnu' }

  if (cfg.currency === 'capsules' && state.capsules < cfg.cost) return { error: 'Pas assez de capsules' }
  if (cfg.currency === 'radium'   && state.radium   < cfg.cost) return { error: 'Pas assez de radium' }

  if (cfg.currency === 'capsules') state.capsules -= cfg.cost
  else                             state.radium   -= cfg.cost

  const obtained   = []
  const fusionLogs = []

  for (let i = 0; i < cfg.count; i++) {
    state.pityE++
    state.pityL++
    state.totalPulls++

    let rarity = rollRarity(cfg.weights)

    // Pity Expert garanti tous les 10 pulls
    if (state.pityE >= 10 && RARITY_ORDER.indexOf(rarity) < 1) {
      rarity = 'E'; state.pityE = 0
    }
    // Pity Légende garanti tous les 50 pulls
    if (state.pityL >= 50 && RARITY_ORDER.indexOf(rarity) < 2) {
      rarity = 'L'; state.pityL = 0
    }
    if (rarity === 'E') state.pityE = 0
    if (rarity === 'L') state.pityL = 0

    const survivor = rollSurvivor(rarity)
    if (!survivor) continue

    state.collection.push({ id: survivor.id, rarity: survivor.rarity })
    obtained.push(survivor)

    const fusion = checkFusion(state, survivor.id)
    if (fusion) fusionLogs.push(fusion)
  }

  updateMission(state, 'signals', 1)
  return { obtained, fusionLogs }
}

export function checkFusion(state, survivorId) {
  const copies = state.collection.filter(p => p.id === survivorId).length
  if (copies < 3) return null

  let removed = 0
  state.collection = state.collection.filter(p => {
    if (p.id === survivorId && removed < 3) { removed++; return false }
    return true
  })

  state.dna += 10

  const survivor     = SURVIVORS.find(x => x.id === survivorId)
  const currentIdx   = RARITY_ORDER.indexOf(survivor.rarity)
  if (currentIdx >= RARITY_ORDER.length - 1) return null

  const nextRarity = RARITY_ORDER[currentIdx + 1]
  const fused      = rollSurvivor(nextRarity)

  if (fused) {
    state.collection.push({ id: fused.id, rarity: fused.rarity })
    return {
      from: survivor,
      to: fused,
      message: `FUSION ! ${survivor.name} ×3 → ${fused.name} (${nextRarity})`,
    }
  }
  return null
}

export function getCollectionStats(state) {
  const total  = SURVIVORS.filter(s => !s.boss).length
  const unique = new Set(state.collection.map(p => p.id)).size
  const byRarity = {}
  RARITY_ORDER.forEach(r => {
    const have = new Set(
      state.collection.filter(p => {
        const sv = SURVIVORS.find(x => x.id === p.id)
        return sv && sv.rarity === r && !sv.boss
      }).map(p => p.id)
    ).size
    const tot = SURVIVORS.filter(s => s.rarity === r && !s.boss).length
    byRarity[r] = { have, total: tot }
  })
  return { unique, total, byRarity }
}

export function getSurvivorCopies(state, survivorId) {
  return state.collection.filter(p => p.id === survivorId).length
}

export function toggleTeam(state, survivorId) {
  const teamIndex = state.team.findIndex(e => e && e.id === survivorId)
  if (teamIndex >= 0) {
    state.team[teamIndex] = null
    return { action: 'removed' }
  }

  const owned = state.collection.some(p => p.id === survivorId)
  if (!owned) return { error: 'Survivant non possédé' }

  const emptySlot = state.team.findIndex(e => !e)
  const count     = state.team.filter(Boolean).length
  if (emptySlot < 0 || count >= 6) return { error: 'Équipe pleine (6 max)' }

  const survivor = SURVIVORS.find(x => x.id === survivorId)
  state.team[emptySlot] = { id: survivorId, rarity: survivor.rarity, effect: survivor.effect }
  return { action: 'added', slot: emptySlot }
}
