import { ZONES }      from '../data/zones.js'
import { SURVIVORS }  from '../data/survivors.js'
import { hasTalent, getTeam } from './state.js'
import { updateMission } from './economy.js'
import { MASTERY_BONUS_PER_RANK } from '../data/talents.js'

export const PHASE = {
  IDLE:     'idle',
  FIGHTING: 'fighting',
  RESULT:   'result',
}

// ── Rôles assassin / médecin pour comportements spéciaux ──
const ASSASSIN_ROLES = ['Ombre', 'Pistard']
const MEDECIN_ROLES  = ['Médic', 'Biologiste']

// ── Retourne les stats complètes d'un survivant ──
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

// ── Génère l'escouade ennemie ──
export function generateEnemySquad(state) {
  const zone    = ZONES[state.activeZone - 1]
  const count   = Math.floor(Math.random() * (zone.enemyCount.max - zone.enemyCount.min + 1)) + zone.enemyCount.min
  const scaling = zone.resistanceBase * (1 + state.currentWave * 0.20) * (1 + (state.activeZone - 1) * 0.15)

  return Array.from({ length: count }, (_, i) => {
    const type = randomZombieType()
    const hp   = Math.round((25 + scaling * 18) * (1 + Math.random() * 0.25))
    return {
      id:        i,
      name:      type.name,
      icon:      type.icon,
      spriteUrl: type.sprite,
      hp,
      maxHp:   hp,
      atk:     Math.round((10 + scaling * 5)   * (1 + Math.random() * 0.25)),
      def:     Math.round((5  + scaling * 2.5) * (1 + Math.random() * 0.2)),
      spd:     Math.round((12 + scaling * 3)   * (1 + Math.random() * 0.2)),
      alive:   true,
      effects: [],
    }
  })
}

// Chaque type d'ennemi a un nom, une icône et un sprite cohérents
const ZOMBIE_TYPES = [
  { name: 'Rôdeur',    icon: '🧟', sprite: 'assets/sprites/enemies/walker.png'  },
  { name: 'Infecté',   icon: '🧟', sprite: 'assets/sprites/enemies/walker.png'  },
  { name: 'Zombie',    icon: '💀', sprite: 'assets/sprites/enemies/walker.png'  },
  { name: 'Grognard',  icon: '🦴', sprite: 'assets/sprites/enemies/brute.png'   },
  { name: 'Ravageur',  icon: '🩸', sprite: 'assets/sprites/enemies/brute.png'   },
  { name: 'Déviant',   icon: '🕷', sprite: 'assets/sprites/enemies/brute.png'   },
  { name: 'Mutant',    icon: '☣',  sprite: 'assets/sprites/enemies/soldier.png' },
  { name: 'Charognard',icon: '👁', sprite: 'assets/sprites/enemies/soldier.png' },
]
function randomZombieType() { return ZOMBIE_TYPES[Math.floor(Math.random() * ZOMBIE_TYPES.length)] }

// ── Vitesse équipe ──
export function calcTeamSpeed(state) {
  const team = getTeam(state)
  if (team.length === 0) return 1.0
  const avgSpd = team.reduce((sum, s) => {
    const sv = SURVIVORS.find(x => x.id === s.id)
    return sum + (sv ? sv.spd : 10)
  }, 0) / team.length
  const speed = 0.5 + (avgSpd / 75) * 1.5
  if (hasTalent(state, 't1')) return Math.min(4.0, speed * 1.1)
  return Math.min(4.0, speed)
}

export function calcInterval(state) {
  return Math.max(300, Math.floor(1200 / calcTeamSpeed(state)))
}

// ── Un tour de combat : chaque combattant agit selon son SPD ──
export function doFightTurn(playerTeam, enemySquad, bonuses = {}) {
  const logs = []

  // Ordre d'attaque trié par SPD décroissant
  const allCombatants = [
    ...playerTeam.filter(s => s.hp > 0).map(s => ({ ...s, side: 'player' })),
    ...enemySquad.filter(e => e.alive).map(e => ({ ...e, side: 'enemy' })),
  ].sort((a, b) => b.spd - a.spd)

  for (const actor of allCombatants) {
    if (playerTeam.every(s => s.hp <= 0)) break
    if (enemySquad.every(e => !e.alive))  break

    if (actor.side === 'player') {
      const log = playerAttack(actor, enemySquad, bonuses, playerTeam)
      if (log) logs.push(log)
    } else {
      const log = enemyAttack(actor, playerTeam)
      if (log) logs.push(log)
      // boss_order : double attaque
      if (actor._doubleAttack && playerTeam.some(s => s.hp > 0)) {
        const log2 = enemyAttack(actor, playerTeam)
        if (log2) logs.push({ ...log2, isDoubleAttack: true })
      }
    }
  }
  // Nettoyer les flags de double attaque après le tour
  enemySquad.forEach(e => { e._doubleAttack = false })

  tickEffects(playerTeam, enemySquad, logs)
  return logs
}

// ── Attaque / action d'un survivant joueur ──
function playerAttack(survivor, enemySquad, bonuses = {}, playerTeam = []) {
  const alive = enemySquad.filter(e => e.alive)

  // ── MÉDECIN : soigne l'allié le plus bas si quelqu'un est en danger ──
  const healAmt = extractVal(survivor.effect, 'heal+')
  if (healAmt && MEDECIN_ROLES.includes(survivor.role)) {
    const critAllies = playerTeam
      .filter(s => s.hp > 0 && s.hp < s.maxHp * 0.5)
      .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))
    const target = critAllies[0]
    if (target) {
      target.hp = Math.min(target.maxHp, target.hp + healAmt)
      return { side: 'heal', actor: survivor.name, target: target.name, amount: healAmt }
    }
  }

  if (alive.length === 0) return null

  // ── CIBLAGE selon le rôle ──
  const isAssassin = ASSASSIN_ROLES.includes(survivor.role)
  const hasPriority = survivor.effect?.includes('priority')
  let target
  if (isAssassin) {
    // Assassin : cible l'ennemi le plus faible (finisher)
    target = alive.reduce((a, b) => b.hp < a.hp ? b : a)
  } else if (hasPriority) {
    // Tireur : cible l'ennemi le plus dangereux (ATK max)
    target = alive.reduce((a, b) => b.atk > a.atk ? b : a)
  } else {
    target = alive[0]
  }

  // ── BONUS D'ATK selon l'effet ──
  // Rage (Berserk) : +15% ATK si HP < 50%
  const hasRage    = survivor.effect?.includes('rage')
  const rageBonus  = hasRage && survivor.hp < survivor.maxHp * 0.5 ? 0.15 : 0
  // Synergie (Tacticien) : +5% ATK par allié vivant
  const hasSynergy  = survivor.effect?.includes('synergy')
  const aliveAllies = playerTeam.filter(s => s.hp > 0 && s.id !== survivor.id).length
  const synergyBonus = hasSynergy ? aliveAllies * 0.05 : 0

  // ── Esquive boss_swarm ──
  const swarmEffect = target.effects?.find(ef => ef.type === 'swarm')
  if (swarmEffect && Math.random() < swarmEffect.dodge) {
    return { side: 'player', actor: survivor.name, target: target.name, dmg: 0, dodged: true }
  }

  // ── CALCUL DES DÉGÂTS ──
  const isCrit      = Math.random() < critChance(survivor, bonuses)
  const isSnipe     = survivor.effect?.includes('snipe') && isCrit
  const isDeathCrit = survivor.effect?.includes('deathcrit') && target.hp < target.maxHp * 0.2
  const dmgMult     = isDeathCrit ? 4 : isSnipe ? 3 : isCrit ? 2 : 1
  const pierce      = survivor.effect?.includes('pierce') ? 0.5 : 0
  const atkMult     = 1 + (bonuses.atkMult || 0) + rageBonus + synergyBonus
  const effective   = Math.max(1, Math.round(
    (survivor.atk * atkMult - target.def * (1 - pierce)) * dmgMult
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
    side:       'player',
    actor:      survivor.name,
    actorRole:  survivor.role,
    target:     target.name,
    dmg:        effective,
    isCrit,
    isSnipe,
    isDeathCrit,
    killed:     !target.alive,
  }
}

// ── Attaque d'un ennemi ──
function enemyAttack(enemy, playerTeam) {
  if (enemy.effects?.some(e => e.type === 'stun')) return null
  // Esquive boss_swarm : 30% chance que l'attaque du joueur rate (géré côté joueur via enemy.effects)
  // Ici on vérifie si l'ennemi a le flag de double attaque et on le laisse agir une deuxième fois (géré dans doFightTurn)

  const alive = playerTeam.filter(s => s.hp > 0)
  if (alive.length === 0) return null

  // Taunt : cibler le Tank en priorité
  const tank   = alive.find(s => s.effect?.includes('taunt'))
  const target = tank || alive[Math.floor(Math.random() * alive.length)]

  // Esquive (Ombre / Pistard)
  const dodge = extractVal(target.effect, 'dodge+')
  if (dodge && Math.random() < dodge) {
    return { side: 'enemy', actor: enemy.name, target: target.name, dmg: 0, dodged: true }
  }

  // Armure (Blindé)
  const armor        = extractVal(target.effect, 'armor+') || 0
  const raw          = Math.max(1, enemy.atk - Math.floor(target.def * 0.5))
  let   dmg          = Math.max(1, Math.round(raw * (1 - armor)))

  // Bouclier (Bastion) : absorbe 30% des dégâts sur un allié
  const shield = alive.find(s => s !== target && s.shield && s.hp > 0)
  if (shield) {
    const absorbed = Math.round(dmg * 0.3)
    shield.hp = Math.max(0, shield.hp - absorbed)
    dmg = dmg - absorbed
  }

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

// ── Effets persistants (HoT, tourelle, saignement) ──
function tickEffects(playerTeam, enemySquad, logs) {
  // HoT global (Biologiste uniquement — heal+ est géré dans playerAttack)
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

  // Saignement / stun ennemis
  enemySquad.filter(e => e.alive && e.effects?.length).forEach(e => {
    e.effects = e.effects.filter(ef => {
      if (ef.type === 'bleed') {
        e.hp -= ef.dmg
        if (e.hp <= 0) { e.hp = 0; e.alive = false }
        return --ef.turns > 0
      }
      if (ef.type === 'stun') return --ef.turns > 0
      return true
    })
  })
}

// ── Chance critique ──
function critChance(survivor, bonuses = {}) {
  let base = 0.1
  const c = extractVal(survivor.effect, 'crit+')
  if (c)            base += c
  if (bonuses.crit) base += bonuses.crit
  return Math.min(0.95, base)
}

// ── Extrait valeur d'un effet (ex: 'crit+0.2' → 0.2) ──
function extractVal(effect, prefix) {
  if (!effect || !effect.includes(prefix)) return null
  const part = effect.split(prefix)[1]
  return parseFloat(part)
}

// ── Bonus de talents ──
export function calcTalentBonuses(state) {
  const rank = state.masteryRank || 0
  const m    = MASTERY_BONUS_PER_RANK
  return {
    crit:    hasTalent(state, 't2') ? 0.10 : 0,
    atkMult: (hasTalent(state, 't2') ? 0.10 : 0) + rank * m.atkMult,
    defMult: (hasTalent(state, 't7') ? 0.20 : 0) + rank * m.defMult,
    hpMult:  rank * m.hpMult,
    synergy: hasTalent(state, 't8') ? 0.20 : 0,
    resist:  hasTalent(state, 't3') ? 0.20 : 0,
    speed:   hasTalent(state, 't1') ? 0.10 : 0,
    idleFlat: rank * m.idleFlat,
  }
}

// ── Effets de boss — applique le modificateur de boss à chaque tour ──
function applyBossEffect(boss, enemies, playerTeam, turn, logs) {
  if (!boss?.effect) return

  switch (boss.effect) {
    case 'boss_poison':
      // Applique poison au tour 1 et tous les 3 tours : -8 HP à chaque allié vivant
      if (turn === 1 || turn % 3 === 0) {
        playerTeam.filter(s => s.hp > 0).forEach(s => {
          const dmg = 8
          s.hp = Math.max(0, s.hp - dmg)
          logs.push({ side: 'boss_effect', actor: boss.name, target: s.name, dmg, effect: 'poison' })
        })
      }
      break

    case 'boss_radiation':
      // Réduit la DEF de l'équipe de 30% au tour 1 (une seule fois)
      if (turn === 1) {
        playerTeam.forEach(s => { s.def = Math.round(s.def * 0.7) })
        logs.push({ side: 'boss_effect', actor: boss.name, effect: 'radiation', msg: 'Radiation — DEF équipe -30%' })
      }
      break

    case 'boss_mutate':
      // Gagne +5% DEF par tour
      enemies.filter(e => e.alive).forEach(e => {
        e.def = Math.round(e.def * 1.05)
      })
      if (turn <= 3) logs.push({ side: 'boss_effect', actor: boss.name, effect: 'mutate', msg: `Mutation — DEF boss +5%` })
      break

    case 'boss_apocalypse':
      // Régénère 50 HP par tour
      enemies.filter(e => e.alive).forEach(e => {
        if (e.hp < e.maxHp) {
          const regen = Math.min(50, e.maxHp - e.hp)
          e.hp += regen
          logs.push({ side: 'boss_effect', actor: e.name, effect: 'regen', amount: regen })
        }
      })
      break

    case 'boss_order':
      // Ennemi attaque une deuxième fois (géré dans doFightTurn via flag)
      // On marque les ennemis vivants pour double attaque
      enemies.filter(e => e.alive).forEach(e => { e._doubleAttack = true })
      break

    case 'boss_swarm':
      // 30% d'esquive sur le boss (appliqué via effet sur l'ennemi)
      enemies.filter(e => e.alive).forEach(e => {
        if (!e.effects) e.effects = []
        if (!e.effects.some(ef => ef.type === 'swarm')) {
          e.effects.push({ type: 'swarm', dodge: 0.30 })
        }
      })
      break

    case 'boss_horde':
      // Au tour 3 : invoque un ennemi supplémentaire (Rôdeur faible)
      if (turn === 3) {
        const spawn = {
          id:      enemies.length,
          name:    'Rôdeur Invoqué',
          icon:    '🧟',
          spriteUrl: 'assets/sprites/enemies/walker.png',
          hp:      60, maxHp: 60,
          atk:     20, def: 5, spd: 30,
          alive:   true, effects: [],
        }
        enemies.push(spawn)
        logs.push({ side: 'boss_effect', actor: boss.name, effect: 'horde', msg: 'Horde — Un Rôdeur invoqué !' })
      }
      break
  }
}

// ── Simule un combat complet ──
export function simulateFight(playerTeamIds, enemySquad, state) {
  const bonuses  = calcTalentBonuses(state)
  // Détecte si c'est un combat de boss (vague 11 sur la zone active courante)
  const isBoss   = state.currentWave === 11 && state.activeZone === state.currentZone
  const zone     = isBoss ? ZONES[state.activeZone - 1] : null
  const bossData = isBoss && zone ? zone.boss : null

  const roles = new Set(playerTeamIds.map(id => {
    const sv = SURVIVORS.find(x => x.id === id)
    return sv ? sv.role : ''
  }))
  if (bonuses.synergy && roles.size >= 3) bonuses.atkMult += bonuses.synergy

  const playerTeam = playerTeamIds.map(id => {
    const stats   = survivorCombatStats(id)
    const upLevel = (state.survivorUpgrades || {})[id] || 0
    const upMult  = 1 + upLevel * 0.15
    const hpBonus = extractVal(stats.effect, 'hp+')
    const hpMult  = hpBonus ? (1 + hpBonus) : 1
    const maxHp   = Math.round(stats.maxHp * hpMult * upMult * (1 + bonuses.hpMult))
    return {
      ...stats,
      hp:    maxHp,
      maxHp,
      atk:   Math.round(stats.atk * upMult),
      def:   Math.round(stats.def * upMult * (1 + bonuses.defMult)),
      shield: stats.effect?.includes('taunt+shield'),
      upLevel,
    }
  })

  const enemies = enemySquad.map(e => ({
    ...e,
    atk: Math.round(e.atk * (1 - bonuses.resist)),
  }))

  const allLogs   = []
  let turns       = 0
  let dmgDealt    = 0
  let dmgReceived = 0
  const MAX_TURNS = 60

  while (turns < MAX_TURNS) {
    turns++
    // Effets de boss avant le tour
    const bossEffectLogs = []
    if (bossData) applyBossEffect(bossData, enemies, playerTeam, turns, bossEffectLogs)

    const turnLogs = [...bossEffectLogs, ...doFightTurn(playerTeam, enemies, bonuses)]
    allLogs.push({ turn: turns, actions: turnLogs })

    turnLogs.forEach(a => {
      if (!a) return
      if (a.side === 'player' || a.side === 'turret') dmgDealt    += a.dmg || 0
      if (a.side === 'enemy' && !a.dodged)            dmgReceived += a.dmg || 0
    })

    if (playerTeam.every(s => s.hp <= 0)) break
    if (enemies.every(e => !e.alive))     break
  }

  const victory   = enemies.every(e => !e.alive)
  const survived  = playerTeam.filter(s => s.hp > 0).length
  const fallen    = playerTeam.filter(s => s.hp <= 0).map(s => s.name)
  const killCount = enemies.filter(e => !e.alive).length

  if (victory) updateMission(state, 'waves', 1)
  updateMission(state, 'kills', killCount)

  // ── Calcul des étoiles (basé sur les survivants restants) ──
  let stars = 0
  if (victory) {
    const pct = survived / playerTeam.length
    if (pct > 0.65)      stars = 3
    else if (pct > 0.32) stars = 2
    else                  stars = 1
  }

  return {
    victory, survived, fallen,
    totalTurns: turns, turns: allLogs,
    dmgDealt, dmgReceived,
    killCount, stars,
    playerMaxHp: playerTeam.reduce((s, sv) => s + sv.maxHp, 0),
    enemyMaxHp:  enemySquad.reduce((s, e)  => s + e.maxHp,  0),
    playerTeam,   // équipe avec stats upgradées + HP mutés après simulation
    enemyTeam: enemies, // ennemis avec HP mutés
  }
}

// ── Récompense de vague ──
export function calcWaveReward(state) {
  const zone    = ZONES[state.activeZone - 1]
  const farming = state.activeZone < state.currentZone ? 0.4 : 1
  const baseCap = (15 + state.currentWave * 5) * zone.capsuleMultiplier
  let capMult   = farming
  if (hasTalent(state, 't4')) capMult += 0.15
  const baseDna = 1 + Math.floor(state.currentWave / 3)
  return {
    capsules:  Math.floor(baseCap * capMult),
    dna:       Math.floor((baseDna + (hasTalent(state, 't6') ? 2 : 0)) * farming),
    radium:    hasTalent(state, 't7') ? 1 : 0,
    accountXP: Math.floor((10 + state.currentWave * 2) * farming),
  }
}

export function advanceWave(state) {
  if (state.activeZone === state.currentZone) {
    state.currentWave++
    if (state.currentWave > 11) state.currentWave = 11
  }
}

export function isBossWave(state) {
  return state.currentWave === 11 && state.activeZone === state.currentZone
}

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

export function canPrestige(state) {
  return state.bossesDefeated.includes('z7') || state.bossesDefeated.length >= 7
}

export function doPrestige(state) {
  if (!canPrestige(state)) return false
  state.prestigeLevel = (state.prestigeLevel || 0) + 1
  state.capsules     = 250
  state.radium       = 5
  state.dna          = 0
  state.collection   = []
  state.team         = Array(6).fill(null)
  state.currentZone  = 1
  state.currentWave  = 1
  state.activeZone   = 1
  state.unlockedZones  = [1]
  state.bossesDefeated = []
  state.zoneSurvivors  = []
  state.pityE = 0
  state.pityL = 0
  return true
}

export function gainAccountXP(state, amount) {
  state.accountXP += amount
  const level  = state.accountLevel
  const needed = (level + 1) * 100
  if (state.accountXP >= needed) {
    state.accountXP   -= needed
    state.accountLevel++
    state.talentPoints++
    return true
  }
  return false
}
