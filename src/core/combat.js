import { WORLDS }  from '../data/worlds.js'
import { POGS }    from '../data/pogs.js'
import { KINIS }   from '../data/kinis.js'
import { hasTalent, getEquippedPogs } from './state.js'
import { updateMission } from './economy.js'

export const PHASE = {
  SELECTION: 'selection',
  COMBAT:    'combat',
  RESULT:    'result',
}

const TEAM_SIZE = 6

// ── Récupère les stats complètes d'un pog champion ──
export function getChampionStats(pogId, bonuses = {}) {
  const pog = POGS.find(p => p.id === pogId)
  if (!pog) return null
  return {
    ...pog,
    currentHp: Math.round(pog.hp * (1 + (bonuses.hp || 0))),
    maxHp:     Math.round(pog.hp * (1 + (bonuses.hp || 0))),
    currentAtk: Math.round(pog.atk * (1 + (bonuses.atk || 0))),
    currentDef: Math.round(pog.def * (1 + (bonuses.def || 0))),
    currentSpd: Math.round(pog.spd * (1 + (bonuses.spd || 0)) * 10) / 10,
    isAlive:   true,
    passiveTriggered: false,
  }
}

// ── Calcule les bonus d'équipe depuis les passifs et talents ──
export function calcTeamBonuses(state) {
  const bonuses = { hp: 0, atk: 0, def: 0, spd: 0, crit: 0, gold: 0, idle: 0 }

  getEquippedPogs(state).forEach(p => {
    if (!p?.passive) return
    const e = p.passive
    if (e.startsWith('atk+'))  bonuses.atk  += parseFloat(e.split('+')[1])
    if (e.startsWith('def+'))  bonuses.def  += parseFloat(e.split('+')[1])
    if (e.startsWith('hp+'))   bonuses.hp   += parseFloat(e.split('+')[1])
    if (e.startsWith('spd+'))  bonuses.spd  += parseFloat(e.split('+')[1])
    if (e.startsWith('crit+')) bonuses.crit += parseFloat(e.split('+')[1])
    if (e.startsWith('gold+')) bonuses.gold += parseFloat(e.split('+')[1])
    if (e.startsWith('idle+')) bonuses.idle += parseFloat(e.split('+')[1])
    if (e === 'all+0.1') { bonuses.atk += 0.1; bonuses.def += 0.1; bonuses.hp += 0.1 }
    if (e === 'all+0.3') { bonuses.atk += 0.3; bonuses.def += 0.3; bonuses.hp += 0.3 }
    if (e === 'master')  { bonuses.atk += 0.5; bonuses.def += 0.5; bonuses.hp += 0.5; bonuses.gold += 1 }
  })

  // Kini bonus
  const kini = KINIS[state.selectedKini] || KINIS[0]
  bonuses.atk  += (kini.power - 10) * 0.02
  bonuses.crit += kini.chance

  // Talents
  if (hasTalent(state, 't2')) bonuses.crit += 0.1
  if (hasTalent(state, 't4')) bonuses.gold += 0.15
  if (hasTalent(state, 't5')) bonuses.idle += bonuses.idle * 0.5

  return bonuses
}

// ── Génère l'équipe du joueur (6 premiers pogs équipés) ──
export function buildPlayerTeam(state) {
  const bonuses = calcTeamBonuses(state)
  const farming = state.activeWorld < state.currentWorld ? 0.7 : 1

  return getEquippedPogs(state).slice(0, TEAM_SIZE).map(p => {
    const champ = getChampionStats(p.id, {
      atk: bonuses.atk * farming,
      def: bonuses.def * farming,
      hp:  bonuses.hp  * farming,
      spd: bonuses.spd,
    })
    return champ
  }).filter(Boolean)
}

// ── Génère l'équipe ennemie selon le monde et la vague ──
export function buildEnemyTeam(state) {
  const world  = WORLDS[state.activeWorld - 1]
  const floor  = state.currentFloor
  const resist = world.resistanceBase * (1 + floor * 0.1)

  // Pioche dans les pogs normaux pour créer des ennemis thématiques
  const enemyPool = POGS.filter(p => !p.boss).slice(0, 15)
  const count     = Math.min(TEAM_SIZE, 3 + Math.floor(floor / 2))

  return Array.from({ length: count }, (_, i) => {
    const base = enemyPool[i % enemyPool.length]
    const mult = resist
    return {
      ...base,
      id:         `enemy_${i}`,
      name:       `${base.name} Ennemi`,
      currentHp:  Math.round(base.hp  * mult),
      maxHp:      Math.round(base.hp  * mult),
      currentAtk: Math.round(base.atk * mult),
      currentDef: Math.round(base.def * mult),
      currentSpd: base.spd,
      isAlive:    true,
      isEnemy:    true,
    }
  })
}

// ── Simule un combat complet et retourne le log ──
export function simulateCombat(playerTeam, enemyTeam, bonuses = {}) {
  const pTeam = playerTeam.map(p => ({ ...p, currentHp: p.currentHp, isAlive: true }))
  const eTeam = enemyTeam.map(e  => ({ ...e, currentHp: e.currentHp, isAlive: true }))
  const log   = []
  const critChance = Math.min(0.95, 0.1 + (bonuses.crit || 0))
  let round = 0

  while (round < 30) {
    round++
    const roundLog = { round, actions: [] }

    // Tous les combattants triés par SPD (décroissant)
    const allFighters = [
      ...pTeam.filter(p => p.isAlive).map(p => ({ ...p, side: 'player' })),
      ...eTeam.filter(e => e.isAlive).map(e => ({ ...e, side: 'enemy' })),
    ].sort((a, b) => b.currentSpd - a.currentSpd)

    for (const fighter of allFighters) {
      if (!fighter.isAlive) continue

      const targets = fighter.side === 'player'
        ? eTeam.filter(e => e.isAlive)
        : pTeam.filter(p => p.isAlive)

      if (targets.length === 0) break

      // Cible le premier vivant
      const target  = targets[0]
      const isCrit  = Math.random() < (fighter.side === 'player' ? critChance : 0.08)
      const rawDmg  = Math.max(1, fighter.currentAtk - Math.floor(target.currentDef * 0.4))
      const damage  = isCrit ? Math.floor(rawDmg * 2) : rawDmg

      target.currentHp = Math.max(0, target.currentHp - damage)
      if (target.currentHp <= 0) target.isAlive = false

      roundLog.actions.push({
        attackerId:   fighter.id,
        attackerName: fighter.name,
        attackerSide: fighter.side,
        targetId:     target.id,
        targetName:   target.name,
        damage,
        isCrit,
        targetHp:     target.currentHp,
        targetMaxHp:  target.maxHp,
        targetDead:   !target.isAlive,
      })
    }

    log.push(roundLog)

    const playerAlive = pTeam.some(p => p.isAlive)
    const enemyAlive  = eTeam.some(e => e.isAlive)
    if (!playerAlive || !enemyAlive) break
  }

  const victory = eTeam.every(e => !e.isAlive)
  return { victory, log, rounds: round, playerTeam: pTeam, enemyTeam: eTeam }
}

// ── Calcule la vitesse d'attaque du kini (pour l'idle) ──
export function calcInterval(state) {
  const kini  = KINIS[state.selectedKini] || KINIS[0]
  let speed   = kini.speed
  if (hasTalent(state, 't1')) speed *= 1.1
  getEquippedPogs(state).forEach(p => {
    if (p?.passive?.startsWith('spd+')) speed += parseFloat(p.passive.split('+')[1]) * 0.1
  })
  return Math.max(300, Math.floor(1200 / Math.min(4, speed)))
}

// ── Récompenses de vague ──
export function calcWaveReward(state, bonuses = {}) {
  const world    = WORLDS[state.activeWorld - 1]
  const farming  = state.activeWorld < state.currentWorld ? 0.4 : 1
  const baseGold = (15 + state.currentFloor * 5) * world.goldMultiplier
  const goldMult = 1 + (bonuses.gold || 0)

  return {
    gold:      Math.floor(baseGold * goldMult * farming),
    fragments: Math.floor((2 + (hasTalent(state, 't6') ? 2 : 0)) * farming),
    gems:      hasTalent(state, 't7') ? 1 : 0,
    accountXP: Math.floor((10 + state.currentFloor * 2) * farming),
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
  const needed = (state.accountLevel + 1) * 100
  if (state.accountXP >= needed && state.accountLevel < 5) {
    state.accountXP   -= needed
    state.accountLevel++
    state.talentPoints++
    return true
  }
  return false
}