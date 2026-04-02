import { WORLDS } from '../data/worlds.js'
import { hasTalent, getEquippedPogs } from './state.js'
import { KINIS } from '../data/kinis.js'
import { updateMission } from './economy.js'

// ── Calcule le nombre de flips par attaque ──
export function calcFlips(state) {
  const kini = getActiveKini(state)
  const world = WORLDS[state.activeWorld - 1]
  const farmingPenalty = state.activeWorld < state.currentWorld ? 0.6 : 1

  let base = kini.power * (1 + (state.kiniLevels[state.selectedKini] - 1) * 0.12)
  let resist = world.resistanceBase * (1 + state.currentFloor * 0.05)

  getEquippedPogs(state).forEach(p => {
    if (!p?.effect) return
    if (p.effect.startsWith('flips+'))   base    += parseFloat(p.effect.split('+')[1])
    if (p.effect.startsWith('resist-'))  resist  -= parseFloat(p.effect.split('-')[1])
    if (p.effect === 'all+0.1')          base    *= 1.1
    if (p.effect === 'all+0.3')          base    *= 1.3
    if (p.effect === 'master')           base    *= 2
  })

  if (hasTalent(state, 't3')) resist *= 0.8
  if (kini.bonusEffect === 'ignore_resist') resist = 0.1

  const flips = Math.max(1, Math.floor((base / Math.max(0.1, resist)) * farmingPenalty))
  return flips
}

// ── Calcule la chance de critique ──
export function calcCrit(state) {
  const kini = getActiveKini(state)
  let crit = kini.chance
  if (hasTalent(state, 't2')) crit += 0.1
  getEquippedPogs(state).forEach(p => {
    if (p?.effect?.startsWith('crit+')) crit += parseFloat(p.effect.split('+')[1])
  })
  return Math.min(0.95, crit)
}

// ── Calcule la vitesse d'attaque ──
export function calcSpeed(state) {
  const kini = getActiveKini(state)
  let speed = kini.speed
  if (hasTalent(state, 't1')) speed *= 1.1
  getEquippedPogs(state).forEach(p => {
    if (p?.effect?.startsWith('speed+')) speed += parseFloat(p.effect.split('+')[1])
  })
  return Math.min(4.0, speed)
}

// ── Calcule l'intervalle d'attaque en ms ──
export function calcInterval(state) {
  return Math.max(300, Math.floor(1200 / calcSpeed(state)))
}

// ── Effectue une attaque et retourne le résultat ──
export function doAttack(state, enemyPile) {
  const isCrit = Math.random() < calcCrit(state)
  let flips = calcFlips(state)
  if (isCrit) flips = Math.floor(flips * 2)

  // Bonus kini exclusif : min_flips
  const kini = getActiveKini(state)
  if (kini.bonusEffect === 'min_flips+3') flips = Math.max(3, flips)

  // Bonus kini exclusif : double_flip
  if (kini.bonusEffect === 'double_flip+0.2' && Math.random() < 0.2) flips *= 2

  const remaining = enemyPile.filter(p => !p.flipped)
  const toFlip = remaining.slice(0, Math.min(flips, remaining.length))

  toFlip.forEach(p => { p.flipped = true })

  state.totalFlips += toFlip.length
  updateMission(state, 'flips', toFlip.length)

  return {
    flipped: toFlip.length,
    isCrit,
    done: enemyPile.every(p => p.flipped),
  }
}

// ── Génère une pile ennemie pour une vague ──
export function generateEnemyPile(state) {
  const world = WORLDS[state.activeWorld - 1]
  const { min, max } = world.enemyCount
  const count = Math.floor(Math.random() * (max - min + 1)) + min
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    flipped: false,
    worldId: state.activeWorld,
  }))
}

// ── Calcule les récompenses d'une vague terminée ──
export function calcWaveReward(state) {
  const world = WORLDS[state.activeWorld - 1]
  const farmingMult = state.activeWorld < state.currentWorld ? 0.4 : 1
  const baseGold = (30 + state.currentFloor * 10) * world.goldMultiplier

  let goldMult = farmingMult
  getEquippedPogs(state).forEach(p => {
    if (!p?.effect) return
    if (p.effect.startsWith('gold+')) goldMult += parseFloat(p.effect.split('+')[1])
    if (p.effect === 'master') goldMult *= 2
  })
  if (hasTalent(state, 't4')) goldMult += 0.15

  const gold = Math.floor(baseGold * goldMult)
  const fragments = (2 + (hasTalent(state, 't6') ? 2 : 0)) * (farmingMult < 1 ? 0.5 : 1)
  const gems = hasTalent(state, 't7') ? 1 : 0
  const accountXP = Math.floor((10 + state.currentFloor * 2) * farmingMult)

  return {
    gold: Math.floor(gold),
    fragments: Math.floor(fragments),
    gems,
    accountXP,
  }
}

// ── Avance la progression après une vague ──
export function advanceFloor(state) {
  // On ne fait progresser le currentFloor que si on joue le monde actif
  if (state.activeWorld === state.currentWorld) {
    state.currentFloor++
    if (state.currentFloor > 11) state.currentFloor = 11
  }
}

// ── Vérifie si c'est une vague de boss ──
export function isBossWave(state) {
  return state.currentFloor === 11 && state.activeWorld === state.currentWorld
}

// ── Récompense de boss et déverrouillage du monde suivant ──
export function defeatBoss(state, worldId) {
  if (state.bossesDefeated.includes(`w${worldId}`)) return null

  const world = WORLDS[worldId - 1]
  state.bossesDefeated.push(`w${worldId}`)

  // Pog unique
  if (!state.worldPogs.includes(world.boss.reward.pog)) {
    state.collection.push({ id: world.boss.reward.pog, rarity: 'L' })
    state.worldPogs.push(world.boss.reward.pog)
  }

  // Kini exclusif
  if (!state.worldKinis.includes(world.boss.reward.kini)) {
    state.worldKinis.push(world.boss.reward.kini)
  }

  // Déverrouille le monde suivant
  const nextWorld = worldId + 1
  if (nextWorld <= 7 && !state.unlockedWorlds.includes(nextWorld)) {
    state.unlockedWorlds.push(nextWorld)
    state.currentWorld = nextWorld
    state.currentFloor = 1
  }

  return {
    pog: world.boss.reward.pog,
    kini: world.boss.reward.kini,
    packType: world.boss.reward.packType,
    nextWorld,
  }
}

// ── Gain d'XP pour un kini ──
export function gainKiniXP(state, kiniIndex, amount) {
  state.kiniXP[kiniIndex] += amount
  const level = state.kiniLevels[kiniIndex]
  const needed = level * 60
  if (state.kiniXP[kiniIndex] >= needed && level < 10) {
    state.kiniXP[kiniIndex] -= needed
    state.kiniLevels[kiniIndex]++
    return true // level up
  }
  return false
}

// ── Gain d'XP de compte ──
export function gainAccountXP(state, amount) {
  state.accountXP += amount
  const level = state.accountLevel
  const needed = (level + 1) * 100
  if (state.accountXP >= needed && level < 5) {
    state.accountXP -= needed
    state.accountLevel++
    state.talentPoints++
    return true // level up
  }
  return false
}

// ── Retourne le kini actif avec ses stats calculées ──
export function getActiveKini(state) {
  const allKinis = [...KINIS]
  const base = allKinis[state.selectedKini] || allKinis[0]
  return { ...base }
}