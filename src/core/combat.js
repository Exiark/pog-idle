import { WORLDS } from '../data/worlds.js'
import { POGS }   from '../data/pogs.js'
import { KINIS }  from '../data/kinis.js'
import { hasTalent, getEquippedPogs } from './state.js'
import { updateMission } from './economy.js'

// ── Machine à états du combat ──
export const PHASE = {
  FLIPPING:    'flipping',    // Le kini retourne des pogs
  CALCULATING: 'calculating', // Calcul des scores
  BATTLING:    'battling',    // Combat pogs vs bot
  RESULT:      'result',      // Victoire ou défaite
}

// ── Stats d'un pog pour le combat ──
function pogCombatStats(pogId, level) {
  const pog = POGS.find(p => p.id === pogId)
  if (!pog) return { attack: 1, defense: 1, hp: 5 }

  const rarityBonus = { C: 1, R: 1.5, E: 2.5, L: 4, M: 7 }
  const mult = rarityBonus[pog.rarity] || 1

  return {
    id:      pogId,
    name:    pog.name,
    icon:    pog.icon,
    rarity:  pog.rarity,
    attack:  Math.round(2 * mult),
    defense: Math.round(1.5 * mult),
    hp:      Math.round(5 * mult),
    effect:  pog.effect,
  }
}

// ── Génère les pogs du bot pour une vague ──
export function generateBotPogs(state) {
  const world  = WORLDS[state.activeWorld - 1]
  const count  = Math.floor(Math.random() * (world.enemyCount.max - world.enemyCount.min + 1)) + world.enemyCount.min
  const resist = world.resistanceBase * (1 + state.currentFloor * 0.08)

  return Array.from({ length: count }, (_, i) => ({
    id:      i,
    flipped: false,
    attack:  Math.round((1 + resist) * (1 + Math.random() * 0.3)),
    defense: Math.round((0.8 + resist * 0.6) * (1 + Math.random() * 0.2)),
    hp:      Math.round((3 + resist * 2) * (1 + Math.random() * 0.4)),
    maxHp:   0,
  })).map(p => ({ ...p, maxHp: p.hp }))
}

// ── Génère la pile de pogs ennemis (visuel) ──
export function generateEnemyPile(state) {
  const world = WORLDS[state.activeWorld - 1]
  const count = Math.floor(Math.random() * (world.enemyCount.max - world.enemyCount.min + 1)) + world.enemyCount.min
  return Array.from({ length: count }, (_, i) => ({ id: i, flipped: false }))
}

// ── Calcule le nombre de flips par attaque ──
export function calcFlips(state) {
  const kini   = KINIS[state.selectedKini] || KINIS[0]
  const world  = WORLDS[state.activeWorld - 1]
  const farming = state.activeWorld < state.currentWorld ? 0.6 : 1

  let base   = kini.power
  let resist = world.resistanceBase * (1 + state.currentFloor * 0.12)

  getEquippedPogs(state).forEach(p => {
    if (!p?.effect) return
    if (p.effect.startsWith('flips+'))  base   += parseFloat(p.effect.split('+')[1])
    if (p.effect.startsWith('resist-')) resist -= parseFloat(p.effect.split('-')[1])
    if (p.effect === 'all+0.1')         base   *= 1.1
    if (p.effect === 'all+0.3')         base   *= 1.3
    if (p.effect === 'master')          base   *= 2
  })

  if (hasTalent(state, 't3')) resist *= 0.8
  if (kini.bonusEffect === 'ignore_resist') resist = 0.1

  return Math.max(1, Math.floor((base / Math.max(0.1, resist)) * farming))
}

// ── Calcule la chance de critique ──
export function calcCrit(state) {
  const kini = KINIS[state.selectedKini] || KINIS[0]
  let crit = kini.chance
  if (hasTalent(state, 't2')) crit += 0.1
  getEquippedPogs(state).forEach(p => {
    if (p?.effect?.startsWith('crit+')) crit += parseFloat(p.effect.split('+')[1])
  })
  return Math.min(0.95, crit)
}

// ── Calcule la vitesse d'attaque ──
export function calcSpeed(state) {
  const kini = KINIS[state.selectedKini] || KINIS[0]
  let speed = kini.speed
  if (hasTalent(state, 't1')) speed *= 1.1
  getEquippedPogs(state).forEach(p => {
    if (p?.effect?.startsWith('speed+')) speed += parseFloat(p.effect.split('+')[1])
  })
  return Math.min(4.0, speed)
}

export function calcInterval(state) {
  return Math.max(300, Math.floor(1200 / calcSpeed(state)))
}

// ── Effectue une attaque de retournement ──
export function doAttack(state, enemyPile) {
  const isCrit = Math.random() < calcCrit(state)
  let flips    = calcFlips(state)
  if (isCrit) flips = Math.floor(flips * 2)

  const kini = KINIS[state.selectedKini] || KINIS[0]
  if (kini.bonusEffect === 'min_flips+3')    flips = Math.max(3, flips)
  if (kini.bonusEffect === 'double_flip+0.2' && Math.random() < 0.2) flips *= 2

  const remaining = enemyPile.filter(p => !p.flipped)
  const toFlip    = remaining.slice(0, Math.min(flips, remaining.length))
  toFlip.forEach(p => { p.flipped = true })

  state.totalFlips += toFlip.length
  updateMission(state, 'flips', toFlip.length)

  return {
    flipped: toFlip.length,
    isCrit,
    done: enemyPile.every(p => p.flipped),
  }
}

// ── Phase de calcul : score joueur vs bot ──
export function calculateScores(state, playerFlipped, botPogs) {
  const kini         = KINIS[state.selectedKini] || KINIS[0]
  const equippedPogs = getEquippedPogs(state)
  const farming      = state.activeWorld < state.currentWorld ? 0.4 : 1

  // Score joueur = somme des stats de pogs retournés × bonus
  let playerAttack  = 0
  let playerDefense = 0
  let playerHp      = 0

  playerFlipped.forEach(p => {
    const eq = equippedPogs.find(e => e?.id === p.id)
    if (eq) {
      const stats = pogCombatStats(eq.id)
      playerAttack  += stats.attack
      playerDefense += stats.defense
      playerHp      += stats.hp
    }
  })

  // Bonus kini
  playerAttack  *= (1 + (kini.power - 10) * 0.02)
  playerDefense *= (1 + kini.accuracy * 0.5)

  // Bonus pogs passifs équipés
  equippedPogs.forEach(p => {
    if (!p?.effect) return
    if (p.effect.startsWith('gold+'))  {}
    if (p.effect === 'all+0.1')        { playerAttack *= 1.1; playerDefense *= 1.1 }
    if (p.effect === 'all+0.3')        { playerAttack *= 1.3; playerDefense *= 1.3 }
    if (p.effect === 'master')         { playerAttack *= 2;   playerDefense *= 2 }
  })

  // Talents
  if (hasTalent(state, 't2')) playerAttack  *= 1.1
  if (hasTalent(state, 't7')) playerDefense *= 1.2

  // Score bot = somme des stats de pogs retournés
  const botFlipped  = botPogs.filter(p => p.flipped)
  let botAttack  = botFlipped.reduce((s, p) => s + p.attack,  0)
  let botDefense = botFlipped.reduce((s, p) => s + p.defense, 0)
  let botHp      = botFlipped.reduce((s, p) => s + p.hp,      0)

  return {
    player: {
      attack:  Math.round(playerAttack  * farming),
      defense: Math.round(playerDefense * farming),
      hp:      Math.round(Math.max(10, playerHp)),
      count:   playerFlipped.length,
    },
    bot: {
      attack:  Math.round(botAttack),
      defense: Math.round(botDefense),
      hp:      Math.round(Math.max(10, botHp)),
      count:   botFlipped.length,
    },
  }
}

// ── Simule le combat tour par tour ──
export function simulateBattle(scores) {
  let pHp = scores.player.hp
  let bHp = scores.bot.hp
  const log = []
  let turn  = 0

  while (pHp > 0 && bHp > 0 && turn < 20) {
    turn++
    const pDmg = Math.max(1, scores.player.attack - scores.bot.defense)
    const bDmg = Math.max(1, scores.bot.attack - scores.player.defense)

    const pCrit = Math.random() < 0.15
    const bCrit = Math.random() < 0.15

    const finalPDmg = pCrit ? Math.floor(pDmg * 2) : pDmg
    const finalBDmg = bCrit ? Math.floor(bDmg * 2) : bDmg

    bHp -= finalPDmg
    pHp -= finalBDmg

    log.push({
      turn,
      playerDmg:  finalPDmg,
      botDmg:     finalBDmg,
      playerCrit: pCrit,
      botCrit:    bCrit,
      playerHp:   Math.max(0, pHp),
      botHp:      Math.max(0, bHp),
    })
  }

  return {
    victory: pHp > 0,
    turns:   log,
    finalPlayerHp: Math.max(0, pHp),
    finalBotHp:    Math.max(0, bHp),
  }
}

// ── Calcule les récompenses de vague ──
export function calcWaveReward(state) {
  const world      = WORLDS[state.activeWorld - 1]
  const farming    = state.activeWorld < state.currentWorld ? 0.4 : 1
  const baseGold   = (15 + state.currentFloor * 5) * world.goldMultiplier
  let goldMult     = farming

  getEquippedPogs(state).forEach(p => {
    if (!p?.effect) return
    if (p.effect.startsWith('gold+')) goldMult += parseFloat(p.effect.split('+')[1])
    if (p.effect === 'master')        goldMult *= 2
  })
  if (hasTalent(state, 't4')) goldMult += 0.15

  return {
    gold:       Math.floor(baseGold * goldMult),
    fragments:  Math.floor((2 + (hasTalent(state, 't6') ? 2 : 0)) * farming),
    gems:       hasTalent(state, 't7') ? 1 : 0,
    accountXP:  Math.floor((10 + state.currentFloor * 2) * farming),
  }
}

export function advanceFloor(state) {
  if (state.activeWorld === state.currentWorld) {
    state.currentFloor++
    if (state.currentFloor > 11) state.currentFloor = 11
  }
}

export function isBossWave(state) {
  return state.currentFloor === 11 && state.activeWorld === state.currentWorld
}

export function defeatBoss(state, worldId) {
  if (state.bossesDefeated.includes(`w${worldId}`)) return null
  const world = WORLDS[worldId - 1]
  state.bossesDefeated.push(`w${worldId}`)

  if (!state.worldPogs.includes(world.boss.reward.pog)) {
    state.collection.push({ id: world.boss.reward.pog, rarity: 'L' })
    state.worldPogs.push(world.boss.reward.pog)
  }
  if (!state.worldKinis.includes(world.boss.reward.kini)) {
    state.worldKinis.push(world.boss.reward.kini)
  }

  const nextWorld = worldId + 1
  if (nextWorld <= 7 && !state.unlockedWorlds.includes(nextWorld)) {
    state.unlockedWorlds.push(nextWorld)
    state.currentWorld = nextWorld
    state.currentFloor = 1
  }

  return { pog: world.boss.reward.pog, kini: world.boss.reward.kini, nextWorld }
}

export function gainAccountXP(state, amount) {
  state.accountXP += amount
  const level  = state.accountLevel
  const needed = (level + 1) * 100
  if (state.accountXP >= needed && level < 5) {
    state.accountXP  -= needed
    state.accountLevel++
    state.talentPoints++
    return true
  }
  return false
}