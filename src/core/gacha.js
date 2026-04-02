import { POGS, RARITY_ORDER } from '../data/pogs.js'
import { PACK_CONFIG } from './economy.js'
import { updateMission } from './economy.js'

// ── Tire une rareté selon les poids ──
function rollRarity(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (const [key, val] of Object.entries(weights)) {
    r -= val
    if (r <= 0) return key
  }
  return 'C'
}

// ── Tire un pog aléatoire d'une rareté donnée (hors pogs boss) ──
function rollPog(rarity) {
  const pool = POGS.filter(p => p.rarity === rarity && !p.boss)
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── Ouvre un pack et retourne les pogs obtenus ──
export function openPack(state, packType) {
  const cfg = PACK_CONFIG[packType]
  if (!cfg) return { error: 'Pack inconnu' }

  // Vérifie la devise
  if (cfg.currency === 'gold' && state.gold < cfg.cost) {
    return { error: 'Pas assez d\'or' }
  }
  if (cfg.currency === 'gems' && state.gems < cfg.cost) {
    return { error: 'Pas assez de gemmes' }
  }

  // Débite
  if (cfg.currency === 'gold') state.gold -= cfg.cost
  else state.gems -= cfg.cost

  const obtained = []
  const fusionLogs = []

  for (let i = 0; i < cfg.count; i++) {
    state.pityE++
    state.pityL++
    state.totalPulls++

    let rarity = rollRarity(cfg.weights)

    // Pity épique : garanti tous les 10 pulls
    if (state.pityE >= 10 && RARITY_ORDER.indexOf(rarity) < 2) {
      rarity = 'E'
      state.pityE = 0
    }

    // Pity légendaire : garanti tous les 50 pulls
    if (state.pityL >= 50 && RARITY_ORDER.indexOf(rarity) < 3) {
      rarity = 'L'
      state.pityL = 0
    }

    // Reset pity si rareté haute obtenue naturellement
    if (rarity === 'E') state.pityE = 0
    if (rarity === 'L' || rarity === 'M') state.pityL = 0

    const pog = rollPog(rarity)
    if (!pog) continue

    state.collection.push({ id: pog.id, rarity: pog.rarity })
    obtained.push(pog)

    // Vérifie fusion
    const fusion = checkFusion(state, pog.id)
    if (fusion) fusionLogs.push(fusion)
  }

  updateMission(state, 'packs', 1)

  return { obtained, fusionLogs }
}

// ── Vérifie et applique une fusion (3 copies → upgrade) ──
export function checkFusion(state, pogId) {
  const copies = state.collection.filter(p => p.id === pogId).length
  if (copies < 3) return null

  // Retire les 3 copies
  let removed = 0
  state.collection = state.collection.filter(p => {
    if (p.id === pogId && removed < 3) { removed++; return false }
    return true
  })

  // Donne des fragments bonus
  state.fragments += 10

  // Tire un pog de rareté supérieure
  const pog = POGS.find(x => x.id === pogId)
  const currentRarIdx = RARITY_ORDER.indexOf(pog.rarity)
  const nextRarity = RARITY_ORDER[Math.min(currentRarIdx + 1, RARITY_ORDER.length - 1)]
  const fused = rollPog(nextRarity)

  if (fused) {
    state.collection.push({ id: fused.id, rarity: fused.rarity })
    return {
      from: pog,
      to: fused,
      message: `FUSION ! ${pog.name} ×3 → ${fused.name} (${nextRarity})`,
    }
  }

  return null
}

// ── Retourne les statistiques de la collection ──
export function getCollectionStats(state) {
  const total = POGS.filter(p => !p.boss).length
  const unique = new Set(state.collection.map(p => p.id)).size
  const byRarity = {}
  RARITY_ORDER.forEach(r => {
    const have = new Set(
      state.collection.filter(p => {
        const pg = POGS.find(x => x.id === p.id)
        return pg && pg.rarity === r && !pg.boss
      }).map(p => p.id)
    ).size
    const tot = POGS.filter(p => p.rarity === r && !p.boss).length
    byRarity[r] = { have, total: tot }
  })
  return { unique, total, byRarity }
}

// ── Retourne les copies d'un pog dans la collection ──
export function getPogCopies(state, pogId) {
  return state.collection.filter(p => p.id === pogId).length
}

// ── Équipe ou déséquipe un pog ──
export function toggleEquip(state, pogId, maxSlots = 10) {
  const equippedIndex = state.equippedPogs.findIndex(e => e && e.id === pogId)

  if (equippedIndex >= 0) {
    // Déséquipe
    state.equippedPogs[equippedIndex] = null
    return { action: 'unequipped' }
  }

  // Vérifie si le joueur possède ce pog
  const owned = state.collection.some(p => p.id === pogId)
  if (!owned) return { error: 'Pog non possédé' }

  // Cherche un slot libre
  const emptySlot = state.equippedPogs.findIndex(e => !e)
  const equipped = state.equippedPogs.filter(Boolean).length
  if (emptySlot < 0 || equipped >= maxSlots) {
    return { error: 'Équipe pleine' }
  }

  const pog = POGS.find(x => x.id === pogId)
  state.equippedPogs[emptySlot] = { id: pogId, rarity: pog.rarity, effect: pog.effect }
  return { action: 'equipped', slot: emptySlot }
}