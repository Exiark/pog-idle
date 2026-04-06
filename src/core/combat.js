import { ZONES }      from '../data/zones.js'
import { SURVIVORS }  from '../data/survivors.js'
import { hasTalent, getTeam } from './state.js'
import { updateMission } from './economy.js'

export const PHASE = {
  IDLE:       'idle',       // au camp, sélection équipe
  FIGHTING:   'fighting',   // combat auto en cours
  RESULT:     'result',     // résultat affiché
}

// ── Retourne les stats complètes d'un survivant (depuis collection) ──
export function survivorCombatStats(survivorId) {
  const s = SURVIVORS.find(x => x.id === survivorId)
  if (!s) return { id: survivorId, name: '?', icon: '?', rarity: 'D', hp: 10, atk: 5, def: 3, spd: 10, maxHp: 10 }
  return {
    id:     s.id,
    name:   s.name,
    role:   s.role,
    icon:   s.icon,
    rarity: s.rarity,
    hp:     s.hp,
    maxHp:  s.hp,
    atk:    s.atk,
    def:    s.def,
    spd:    s.spd,
    effect: s.effect,
  }
}

// ── Génère l'escouade ennemie (zombies génériques) ──
export function generateEnemySquad(state) {
  const zone    = ZONES[state.activeZone - 1]
  const count   = Math.floor(Math.random() * (zone.enemyCount.max - zone.enemyCount.min + 1)) + zone.enemyCount.min
  const scaling = zone.resistanceBase * (1 + state.currentWave * 0.08)

  return Array.from({ length: count }, (_, i) => {
    const hp = Math.round((20 + scaling * 15) * (1 + Math.random() * 0.3))
    return {
      id:      i,
      name:    randomZombieName(),
      icon:    randomZombieIcon(),
      hp,
      maxHp:   hp,
      atk:     Math.round((8 + scaling * 4)  * (1 + Math.random() * 0.3)),
      def:     Math.round((4 + scaling * 2)  * (1 + Math.random() * 0.2)),
      spd:     Math.round((10 + scaling * 3) * (1 + Math.random() * 0.2)),
      alive:   true,
      effects: [],  // statuts : poison, bleed, stun...
    }
  })
}

const ZOMBIE_NAMES = ['Rôdeur','Grognard','Charognard','Mutant','Infecté','Zombie','Ravageur','Déviant']
const ZOMBIE_ICONS = ['🧟','💀','🦷','🩸','☣','🕷','🦴','👁']
function randomZombieName() { return ZOMBIE_NAMES[Math.floor(Math.random() * ZOMBIE_NAMES.length)] }
function randomZombieIcon() { return ZOMBIE_ICONS[Math.floor(Math.random() * ZOMBIE_ICONS.length)] }

// ── Calcule la vitesse d'attaque globale de l'équipe ──
export function calcTeamSpeed(state) {
  const team = getTeam(state)
  if (team.length === 0) return 1.0
  let totalSpd = team.reduce((sum, s) => {
    const sv = SURVIVORS.find(x => x.id === s.id)
    return sum + (sv ? sv.spd : 10)
  }, 0)
  const avgSpd = totalSpd / team.length
  // SPD 10 = 1200ms, SPD 75 = 300ms (Blitz)
  const speed = 0.5 + (avgSpd / 75) * 1.5
  if (hasTalent(state, 't1')) return Math.min(4.0, speed * 1.1)
  return Math.min(4.0, speed)
}

export function calcInterval(state) {
  return Math.max(300, Math.floor(1200 / calcTeamSpeed(state)))
}

// ── Un tour de combat complet (6 survivants vs escouade ennemie) ──
export function doFightTurn(playerTeam, enemySquad) {
  const logs = []

  // Ordre d'attaque : tous les vivants triés par SPD décroissant
  const allCombatants = [
    ...playerTeam.filter(s => s.hp > 0).map(s => ({ ...s, side: 'player' })),
    ...enemySquad.filter(e => e.alive).map(e => ({ ...e, side: 'enemy' })),
  ].sort((a, b) => b.spd - a.spd)

  for (const actor of allCombatants) {
    // Vérifie que le combat n'est pas terminé
    if (playerTeam.every(s => s.hp <= 0)) break
    if (enemySquad.every(e => !e.alive))  break

    if (actor.side === 'player') {
      const log = playerAttack(actor, enemySquad)
      if (log) logs.push(log)
    } else {
      const log = enemyAttack(actor, playerTeam)
      if (log) logs.push(log)
    }
  }

  // Tick des effets persistants (poison, saignement, HoT)
  tickEffects(playerTeam, enemySquad, logs)

  return logs
}

// ── Attaque d'un survivant joueur ──
function playerAttack(survivor, enemySquad) {
  const alive = enemySquad.filter(e => e.alive)
  if (alive.length === 0) return null

  // Cible : priorité → ennemi le plus dangereux (ATK max), sinon premier vivant
  const hasPriority = survivor.effect?.includes('priority')
  const target = hasPriority
    ? alive.reduce((a, b) => b.atk > a.atk ? b : a)
    : alive[0]

  const isCrit    = Math.random() < critChance(survivor)
  const isSnipe   = survivor.effect?.includes('snipe') && isCrit
  const dmgMult   = isSnipe ? 3 : isCrit ? 2 : 1
  const pierce    = survivor.effect?.includes('pierce') ? 0.5 : 0        // ignore % DEF
  const effective = Math.max(1, Math.round(
    (survivor.atk - target.def * (1 - pierce)) * dmgMult
  ))

  target.hp -= effective
  if (target.hp <= 0) { target.hp = 0; target.alive = false }

  // AoE : splash sur 1 ennemi adjacent
  if (survivor.effect?.includes('aoe') && alive.length > 1) {
    const splash = alive.find(e => e !== target && e.alive)
    if (splash) {
      const splashDmg = Math.max(1, Math.round(effective * 0.5))
      splash.hp -= splashDmg
      if (splash.hp <= 0) { splash.hp = 0; splash.alive = false }
    }
  }

  // Saignement
  if (survivor.effect?.includes('bleed') && Math.random() < 0.6) {
    target.effects = target.effects || []
    target.effects.push({ type: 'bleed', dmg: Math.round(survivor.atk * 0.3), turns: 3 })
  }

  // Stun
  const stunChance = extractVal(survivor.effect, 'stun+')
  if (stunChance && Math.random() < stunChance) {
    target.effects = target.effects || []
    target.effects.push({ type: 'stun', turns: 1 })
  }

  // Multi-cible (Lame)
  const multiChance = extractVal(survivor.effect, 'multi+')
  if (multiChance && Math.random() < multiChance) {
    const second = alive.find(e => e !== target && e.alive)
    if (second) {
      const dmg2 = Math.max(1, Math.round(survivor.atk * 0.7))
      second.hp -= dmg2
      if (second.hp <= 0) { second.hp = 0; second.alive = false }
    }
  }

  return {
    side:   'player',
    actor:  survivor.name,
    target: target.name,
    dmg:    effective,
    isCrit,
    isSnipe,
    killed: !target.alive,
  }
}

// ── Attaque d'un ennemi ──
function enemyAttack(enemy, playerTeam) {
  if (enemy.effects?.some(e => e.type === 'stun')) return null

  const alive = playerTeam.filter(s => s.hp > 0)
  if (alive.length === 0) return null

  // Cible le Bouclier/Blindé en priorité (taunt)
  const tank = alive.find(s => s.effect?.includes('taunt'))
  const target = tank || alive[Math.floor(Math.random() * alive.length)]

  // Esquive (Ombre)
  const dodge = extractVal(target.effect, 'dodge+')
  if (dodge && Math.random() < dodge) {
    return { side: 'enemy', actor: enemy.name, target: target.name, dmg: 0, dodged: true }
  }

  // Armure (Blindé)
  const armor = extractVal(target.effect, 'armor+')
  const dmgReduction = armor || 0
  const raw  = Math.max(1, enemy.atk - Math.floor(target.def * 0.5))
  const dmg  = Math.max(1, Math.round(raw * (1 - dmgReduction)))

  target.hp -= dmg
  if (target.hp < 0) target.hp = 0

  return {
    side:   'enemy',
    actor:  enemy.name,
    target: target.name,
    dmg,
    dodged: false,
    killed: target.hp <= 0,
  }
}

// ── Tick des effets persistants ──
function tickEffects(playerTeam, enemySquad, logs) {
  // Soins (Médic / Biologiste)
  playerTeam.filter(s => s.hp > 0).forEach(s => {
    const healAmt = extractVal(s.effect, 'heal+')
    if (healAmt) {
      const target = playerTeam.filter(x => x.hp > 0 && x.hp < x.maxHp)
        .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0]
      if (target) {
        target.hp = Math.min(target.maxHp, target.hp + healAmt)
        logs.push({ side: 'heal', actor: s.name, target: target.name, amount: healAmt })
      }
    }
  })

  // HoT global (Biologiste)
  playerTeam.filter(s => s.hp > 0).forEach(s => {
    const hot = extractVal(s.effect, 'hot+')
    if (hot) {
      playerTeam.filter(x => x.hp > 0).forEach(ally => {
        ally.hp = Math.min(ally.maxHp, ally.hp + hot)
      })
      logs.push({ side: 'hot', actor: s.name, amount: hot })
    }
  })

  // Tourelle (Ingénieur)
  playerTeam.filter(s => s.hp > 0).forEach(s => {
    const turret = extractVal(s.effect, 'turret+')
    if (turret) {
      const target = enemySquad.filter(e => e.alive)[0]
      if (target) {
        target.hp -= turret
        if (target.hp <= 0) { target.hp = 0; target.alive = false }
        logs.push({ side: 'turret', actor: s.name, target: target.name, dmg: turret })
      }
    }
  })

  // Saignement / poison ennemis
  enemySquad.filter(e => e.alive && e.effects?.length).forEach(e => {
    e.effects = e.effects.filter(ef => {
      if (ef.type === 'bleed') {
        e.hp -= ef.dmg
        if (e.hp <= 0) { e.hp = 0; e.alive = false }
        ef.turns--
        return ef.turns > 0
      }
      if (ef.type === 'stun') {
        ef.turns--
        return ef.turns > 0
      }
      return true
    })
  })
}

// ── Chance critique d'un survivant ──
function critChance(survivor) {
  let base = 0.1
  const c = extractVal(survivor.effect, 'crit+')
  if (c) base += c
  return Math.min(0.95, base)
}

// ── Extrait une valeur numérique d'un effet (ex: 'crit+0.2' → 0.2) ──
function extractVal(effect, prefix) {
  if (!effect || !effect.includes(prefix)) return null
  const part = effect.split(prefix)[1]
  return parseFloat(part)
}

// ── Simule un combat complet jusqu'au bout (résultat synchrone) ──
export function simulateFight(playerTeamIds, enemySquad, state) {
  // Instancie les stats des survivants
  const playerTeam = playerTeamIds.map(id => {
    const stats = survivorCombatStats(id)
    return { ...stats }
  })

  const enemies = enemySquad.map(e => ({ ...e }))
  const allLogs = []
  let turns = 0
  const MAX_TURNS = 50

  while (turns < MAX_TURNS) {
    turns++
    const turnLogs = doFightTurn(playerTeam, enemies)
    allLogs.push({ turn: turns, actions: turnLogs })

    if (playerTeam.every(s => s.hp <= 0)) break
    if (enemies.every(e => !e.alive))     break
  }

  const victory     = enemies.every(e => !e.alive)
  const survived    = playerTeam.filter(s => s.hp > 0).length
  const killCount   = enemySquad.filter(e => !e.alive).length

  if (victory) updateMission(state, 'waves', 1)
  updateMission(state, 'kills', killCount)

  const playerMaxHp = playerTeamIds.reduce((s, id) => {
    const sv = SURVIVORS.find(x => x.id === id)
    return s + (sv ? sv.hp : 10)
  }, 0)
  const enemyMaxHp = enemySquad.reduce((s, e) => s + e.maxHp, 0)

  return { victory, turns: allLogs, survived, totalTurns: turns, playerMaxHp, enemyMaxHp }
}

// ── Récompense de vague ──
export function calcWaveReward(state) {
  const zone    = ZONES[state.activeZone - 1]
  const farming = state.activeZone < state.currentZone ? 0.4 : 1
  const baseCap = (15 + state.currentWave * 5) * zone.capsuleMultiplier
  let capMult   = farming

  if (hasTalent(state, 't4')) capMult += 0.15

  return {
    capsules:  Math.floor(baseCap * capMult),
    dna:       Math.floor((2 + (hasTalent(state, 't6') ? 2 : 0)) * farming),
    radium:    hasTalent(state, 't7') ? 1 : 0,
    accountXP: Math.floor((10 + state.currentWave * 2) * farming),
  }
}

// ── Avance la vague ──
export function advanceWave(state) {
  if (state.activeZone === state.currentZone) {
    state.currentWave++
    if (state.currentWave > 11) state.currentWave = 11
  }
}

// ── Vérifie si c'est la vague boss ──
export function isBossWave(state) {
  return state.currentWave === 11 && state.activeZone === state.currentZone
}

// ── Défaite du boss de zone ──
export function defeatBoss(state, zoneId) {
  if (state.bossesDefeated.includes(`z${zoneId}`)) return null
  const zone = ZONES[zoneId - 1]
  state.bossesDefeated.push(`z${zoneId}`)

  if (!state.zoneSurvivors.includes(zone.boss.reward.survivor)) {
    state.collection.push({ id: zone.boss.reward.survivor, rarity: 'E' })
    state.zoneSurvivors.push(zone.boss.reward.survivor)
  }

  const nextZone = zoneId + 1
  if (nextZone <= 7 && !state.unlockedZones.includes(nextZone)) {
    state.unlockedZones.push(nextZone)
    state.currentZone = nextZone
    state.currentWave = 1
  }

  return { survivor: zone.boss.reward.survivor, nextZone }
}

// ── XP de compte ──
export function gainAccountXP(state, amount) {
  state.accountXP += amount
  const level  = state.accountLevel
  const needed = (level + 1) * 100
  if (state.accountXP >= needed && level < 5) {
    state.accountXP   -= needed
    state.accountLevel++
    state.talentPoints++
    return true
  }
  return false
}
