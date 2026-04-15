// ── SHELTER 7 — Arène de combat ──
import { SURVIVORS, RARITY, ROLE_META, getSpriteUrl, classIconHtml } from '../data/survivors.js'
import { ZONES } from '../data/zones.js'
import { calcWaveReward } from '../core/combat.js'

let combatSkipped = false
let combatSpeed   = 1   // 1 = normal, 2 = ×2, 4 = ×4

// ══════════════════════════════
// PRÉ-COMBAT
// ══════════════════════════════
export function renderPreCombat(state) {
  const panel = document.getElementById('precombat-panel')
  if (!panel) return

  const zone = ZONES[state.activeZone - 1]
  const team = state.team.filter(Boolean)

  panel.innerHTML = `
    <img class="zone-combat-bg"
      src="assets/backgrounds/zone${state.activeZone}.png"
      alt="${zone.name}"
      onerror="this.style.display='none'">

    <div class="precombat-zone">
      <div class="precombat-zone-icon">☣</div>
      <div>
        <div class="precombat-zone-name">Zone ${state.activeZone} — ${zone.name}</div>
        <div class="precombat-zone-sub">Vague ${state.currentWave}/11 · Boss: ${zone.boss.name}</div>
      </div>
    </div>

    ${team.length === 0 ? `
      <div class="precombat-warning">
        Aucun survivant dans l'équipe !<br>
        <button onclick="window.setTab('survivors')" style="margin-top:8px">Recruter des survivants</button>
      </div>` : `
      ${precombatTeamPreview(team)}
      ${state.activeZone < state.currentZone ? `
        <div class="precombat-farming-warning">
          ⚠ Mode farming — Zone ${state.activeZone} (déjà sécurisée)<br>
          <span>Récompenses ×0.6 · Passez en Zone ${state.currentZone} pour le plein tarif</span>
        </div>` : ''}
      ${precombatRewardPreview(state)}
      <button class="btn-danger launch-btn" onclick="window.startCombat()">
        ☣ Partir en mission
      </button>`}

    ${nextObjective(state)}
  `
}

function precombatTeamPreview(team) {
  return `
    <div class="precombat-team">
      ${team.map(s => {
        const sv   = SURVIVORS.find(x => x.id === s.id)
        if (!sv) return ''
        const r    = RARITY[sv.rarity] || RARITY['D']
        const meta = ROLE_META[sv.role] || {}
        const sp   = getSpriteUrl(sv)
        return `
          <div class="pct-slot" style="border-color:${r.color};background:${r.bg}">
            ${sp
              ? `<img class="pct-sprite" src="${sp}" alt="${sv.name}">`
              : `<div class="pct-icon">${classIconHtml(meta, 28, meta.classColor || r.color)}</div>`}
            <div class="pct-name" style="color:${r.text}">${sv.name}</div>
          </div>`
      }).join('')}
    </div>`
}

function effectBadge(effect) {
  if (!effect) return ''
  if (effect.includes('taunt'))    return `<div class="fighter-effect-badge">🛡 Taunt</div>`
  if (effect.includes('heal+'))    return `<div class="fighter-effect-badge">💊 Heal</div>`
  if (effect.includes('hot+'))     return `<div class="fighter-effect-badge">🧬 HoT</div>`
  if (effect.includes('turret+'))  return `<div class="fighter-effect-badge">🔧 Tourelle</div>`
  if (effect.includes('rage'))     return `<div class="fighter-effect-badge">😤 Rage</div>`
  if (effect.includes('snipe'))    return `<div class="fighter-effect-badge">🎯 Snipe</div>`
  if (effect.includes('dodge+'))   return `<div class="fighter-effect-badge">💨 Esquive</div>`
  if (effect.includes('synergy'))  return `<div class="fighter-effect-badge">⚡ Synergy</div>`
  if (effect.includes('armor+'))   return `<div class="fighter-effect-badge">🦾 Armure</div>`
  if (effect.includes('aoe'))      return `<div class="fighter-effect-badge">💥 AoE</div>`
  if (effect.includes('bleed'))    return `<div class="fighter-effect-badge">🩸 Saignement</div>`
  return ''
}

const BOSS_EFFECT_LABELS = {
  boss_horde:      '💀 Invoque des renforts au tour 3',
  boss_poison:     '☣ Empoisonne votre équipe chaque 3 tours',
  boss_radiation:  '☢ Réduit la DEF de votre équipe de 30%',
  boss_order:      '⚔ Attaque deux fois par tour',
  boss_swarm:      '🌪 30% d\'esquive sur vos attaques',
  boss_mutate:     '🧬 Gagne +5% DEF à chaque tour',
  boss_apocalypse: '💚 Régénère 50 PV par tour',
}

function precombatRewardPreview(state) {
  const reward   = calcWaveReward(state)
  const isBoss   = state.currentWave === 11
  const diffLabel = state.currentWave <= 3 ? 'Facile'
                  : state.currentWave <= 7 ? 'Modérée'
                  : state.currentWave <= 10 ? 'Difficile'
                  : '☠ Boss'
  const diffColor = state.currentWave <= 3 ? '#5AE05A'
                  : state.currentWave <= 7 ? '#E0C44A'
                  : state.currentWave <= 10 ? '#E08A4A'
                  : '#E05A4A'

  const bossEffect = isBoss ? ZONES[state.activeZone - 1]?.boss?.effect : null
  const bossEffectLabel = bossEffect ? BOSS_EFFECT_LABELS[bossEffect] : null

  return `
    <div class="precombat-reward-card">
      <div class="pcr-header">
        <span class="pcr-diff" style="color:${diffColor}">${diffLabel}</span>
        <span class="pcr-label">Récompenses estimées</span>
      </div>
      ${bossEffectLabel ? `<div class="pcr-boss-effect">⚠ Effet spécial : ${bossEffectLabel}</div>` : ''}
      <div class="pcr-rewards">
        <div class="pcr-item"><img class="res-icon" src="assets/icons/res-capsule.png" alt="💊"> ~${reward.capsules}</div>
        <div class="pcr-item"><img class="res-icon" src="assets/icons/res-dna.png" alt="🧬"> ~${reward.dna} ADN</div>
        <div class="pcr-item">⭐ ~${reward.accountXP} XP</div>
        ${isBoss ? '<div class="pcr-item pcr-boss">☠ Nouveau survivant possible !</div>' : ''}
      </div>
    </div>`
}

function nextObjective(state) {
  const team = state.team.filter(Boolean)
  if (team.length === 0) return ''
  let text = ''
  if (state.currentWave < 11)
    text = `Prochain objectif : Vague ${state.currentWave + 1}/11`
  else if (!state.bossesDefeated?.includes(`z${state.activeZone}`))
    text = `Prochain objectif : Vaincre le boss de Zone ${state.activeZone}`
  else if (state.currentZone < 7)
    text = `Prochain objectif : Débloquer Zone ${state.currentZone + 1}`
  else
    text = `Toutes les zones sont sécurisées — pensez au Prestige !`
  return `<div class="precombat-objective">${text}</div>`
}

// ══════════════════════════════
// COMBAT PANEL — TOUR PAR TOUR
// ══════════════════════════════
export function renderCombatPanel(state, playerTeam, enemySquad, result, onDone) {
  const panel = document.getElementById('combat-panel')
  if (!panel) return
  combatSkipped = false

  panel.innerHTML = `
    <div class="combat-header">
      <div class="combat-title">Combat — Zone ${state.activeZone} · Vague ${state.currentWave}</div>
      <div class="combat-turn" id="combat-turn">Initialisation...</div>
    </div>

    <div class="combat-sides">
      <div class="combat-side player-side">
        <div class="combat-side-label">Votre équipe</div>
        <div class="combat-fighters" id="player-fighters">
          ${playerTeam.map(s => {
            const r      = RARITY[s.rarity] || RARITY['D']
            const sv     = SURVIVORS.find(x => x.id === s.id)
            const meta   = ROLE_META[sv?.role] || {}
            const sprite = sv ? getSpriteUrl(sv) : null
            return `
              <div class="fighter-card" id="fighter-${s.id}"
                style="background:${r.bg};border-color:${r.color}">
                <div class="fighter-icon">
                  ${sprite
                    ? `<img src="${sprite}" style="height:36px;image-rendering:pixelated;object-fit:contain" onerror="this.style.display='none'">`
                    : classIconHtml(meta, 32, r.color) || s.icon}
                </div>
                <div class="fighter-name">${s.name}</div>
                <div class="fighter-role-badge" style="color:${meta.classColor||r.color}">${meta.globalClass||s.role}</div>
              ${effectBadge(s.effect)}
                <div class="fighter-hp-bar">
                  <div class="fighter-hp-fill" id="hp-${s.id}" style="width:100%;background:${r.color}"></div>
                </div>
                <div class="fighter-hp-text" id="hpv-${s.id}">${s.maxHp}</div>
              </div>`
          }).join('')}
        </div>
      </div>

      <div class="combat-vs">VS</div>

      <div class="combat-side enemy-side">
        <div class="combat-side-label">Ennemis</div>
        <div class="combat-fighters" id="enemy-fighters">
          ${enemySquad.map(e => `
            <div class="fighter-card enemy" id="enemy-${e.id}">
              <div class="fighter-icon">
                ${e.spriteUrl
                  ? `<img src="${e.spriteUrl}" style="height:36px;image-rendering:pixelated;object-fit:contain" onerror="this.outerHTML='<span>${e.icon}</span>'">`
                  : e.icon}
              </div>
              <div class="fighter-name">${e.name}</div>
              <div class="fighter-hp-bar">
                <div class="fighter-hp-fill" id="ehp-${e.id}" style="width:100%;background:#D85A30"></div>
              </div>
              <div class="fighter-hp-text" id="ehpv-${e.id}">${e.hp}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="combat-log" id="combat-log"></div>
    <div class="combat-speed-row">
      <button class="speed-btn active" id="spd-1" onclick="window._setCombatSpeed(1)">×1</button>
      <button class="speed-btn" id="spd-2" onclick="window._setCombatSpeed(2)">×2</button>
      <button class="speed-btn" id="spd-4" onclick="window._setCombatSpeed(4)">×4</button>
      <button class="speed-btn skip-btn" onclick="window._skipCombat()">⏩ Passer</button>
    </div>
  `

  window._setCombatSpeed = (spd) => {
    combatSpeed = spd
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'))
    document.getElementById('spd-' + spd)?.classList.add('active')
  }
  window._skipCombat = () => {
    combatSkipped = true
    applyAllFinalStates(result, playerTeam, enemySquad)
    setTimeout(onDone, 300)
  }

  animateCombat(result, playerTeam, enemySquad, onDone)
}

// ══════════════════════════════
// ANIMATION ACTION PAR ACTION
// ══════════════════════════════
function animateCombat(result, playerTeam, enemySquad, onDone) {
  // Remet les HP à leur valeur initiale (maxHp) pour l'animation
  playerTeam.forEach(s => { s._animHp = s.maxHp })
  enemySquad.forEach(e => { e._animHp = e.maxHp })

  // Aplatir tous les tours en une séquence d'actions individuelles
  const seq = []
  result.turns.forEach(t => {
    t.actions.forEach(a => { if (a) seq.push({ ...a, turnNum: t.turn, totalTurns: result.totalTurns }) })
  })

  const log    = document.getElementById('combat-log')
  const turnEl = document.getElementById('combat-turn')
  let idx = 0

  function getDelay(a) {
    let base
    if (a.isDeathCrit)              base = 1300
    else if (a.isCrit || a.killed)  base = 1000
    else if (a.side === 'heal')     base = 750
    else if (a.side === 'turret' || a.side === 'hot') base = 350
    else                            base = 750
    return Math.round(base / combatSpeed)
  }

  function playNext() {
    if (combatSkipped || idx >= seq.length) {
      if (!combatSkipped) {
        combatSkipped = true  // empêche le bouton "Passer" de déclencher un 2e onDone
        setTimeout(onDone, 500)
      }
      return
    }
    const a = seq[idx++]
    playAction(a, playerTeam, enemySquad, log, turnEl)
    setTimeout(playNext, getDelay(a))
  }

  setTimeout(playNext, 400)
}

// ── Joue une action individuelle ──
function playAction(a, playerTeam, enemySquad, log, turnEl) {
  // Mise à jour de l'indicateur de tour
  if (turnEl) {
    const who = a.side === 'player' ? `⚔ ${a.actor}`
               : a.side === 'heal'   ? `💊 ${a.actor}`
               : a.side === 'turret' ? `🔧 Tourelle`
               : `🧟 ${a.actor}`
    turnEl.textContent = `${who} — Tour ${a.turnNum}/${a.totalTurns}`
  }

  if (a.side === 'player') {
    // Highlight de l'attaquant
    const actorSv = playerTeam.find(s => s.name === a.actor)
    if (actorSv) setActing(document.getElementById('fighter-' + actorSv.id), 'player')

    // Dégâts sur l'ennemi ciblé
    const enemy = enemySquad.find(e => e.name === a.target)
    if (enemy) {
      if (!a.dodged) enemy._animHp = Math.max(0, (enemy._animHp ?? enemy.maxHp) - (a.dmg || 0))
      const card = document.getElementById('enemy-' + enemy.id)
      updateHP('ehp-' + enemy.id, 'ehpv-' + enemy.id, enemy._animHp, enemy.maxHp)
      if (card && a.dmg && !a.dodged) {
        flashHit(card)
        spawnDmgFloat(card, a.dmg, a.isCrit || a.isDeathCrit)
        if (window.playHitSound) window.playHitSound()
      }
      if (enemy._animHp <= 0 && card) animateDeath(card)
    }

  } else if (a.side === 'heal') {
    const actorSv = playerTeam.find(s => s.name === a.actor)
    if (actorSv) setActing(document.getElementById('fighter-' + actorSv.id), 'heal')

    const target = playerTeam.find(s => s.name === a.target)
    if (target) {
      target._animHp = Math.min(target.maxHp, (target._animHp ?? target.maxHp) + (a.amount || 0))
      const card = document.getElementById('fighter-' + target.id)
      updateHP('hp-' + target.id, 'hpv-' + target.id, target._animHp, target.maxHp)
      if (card) {
        card.classList.add('healing')
        setTimeout(() => card.classList.remove('healing'), 600)
        spawnDmgFloat(card, a.amount, false, false, true)
      }
    }

  } else if (a.side === 'enemy') {
    const actorEnemy = enemySquad.find(e => e.name === a.actor)
    if (actorEnemy) setActing(document.getElementById('enemy-' + actorEnemy.id), 'enemy')

    const ally = playerTeam.find(s => s.name === a.target)
    if (ally) {
      if (!a.dodged) ally._animHp = Math.max(0, (ally._animHp ?? ally.maxHp) - (a.dmg || 0))
      const card = document.getElementById('fighter-' + ally.id)
      updateHP('hp-' + ally.id, 'hpv-' + ally.id, ally._animHp, ally.maxHp)
      if (card && a.dmg && !a.dodged) {
        flashHit(card, true)
        spawnDmgFloat(card, a.dmg, false, true)
      }
      if (ally._animHp <= 0 && card) animateDeath(card)
    }

  } else if (a.side === 'turret') {
    const enemy = enemySquad.find(e => e.name === a.target)
    if (enemy) {
      enemy._animHp = Math.max(0, (enemy._animHp ?? enemy.maxHp) - (a.dmg || 0))
      const card = document.getElementById('enemy-' + enemy.id)
      updateHP('ehp-' + enemy.id, 'ehpv-' + enemy.id, enemy._animHp, enemy.maxHp)
      if (card && a.dmg) {
        flashHit(card)
        spawnDmgFloat(card, a.dmg, false, false, false, true)
      }
      if (enemy._animHp <= 0 && card) card.classList.add('dead')
    }
  }

  // Effets boss — mise à jour HP si poison/regen
  if (a.side === 'boss_effect') {
    if (a.dmg && a.target) {
      const ally = playerTeam.find(s => s.name === a.target)
      if (ally) {
        ally._animHp = Math.max(0, (ally._animHp ?? ally.maxHp) - a.dmg)
        const card = document.getElementById('fighter-' + ally.id)
        updateHP('hp-' + ally.id, 'hpv-' + ally.id, ally._animHp, ally.maxHp)
        if (ally._animHp <= 0 && card) animateDeath(card)
        if (card) spawnDmgFloat(card, a.dmg, false, true)
      }
    }
    if (a.amount && a.actor) {
      const enemy = enemySquad.find(e => e.name === a.actor)
      if (enemy) {
        enemy._animHp = Math.min(enemy.maxHp, (enemy._animHp ?? enemy.maxHp) + a.amount)
        updateHP('ehp-' + enemy.id, 'ehpv-' + enemy.id, enemy._animHp, enemy.maxHp)
      }
    }
  }

  // Log de combat
  if (log) {
    const div = document.createElement('div')
    if (a.side === 'boss_effect') {
      div.className   = 'combat-log-entry boss-fx'
      div.textContent = a.msg
        || (a.effect === 'poison'   ? `☣ ${a.actor} empoisonne ${a.target} — ${a.dmg} dégâts !`
          : a.effect === 'regen'    ? `💚 ${a.actor} régénère +${a.amount} PV`
          : a.effect === 'mutate'   ? `🧬 ${a.actor} mute — DEF renforcée !`
          : a.effect === 'horde'    ? `💀 ${a.actor} invoque des renforts !`
          : a.effect === 'radiation'? `☢ Radiation — DEF équipe affaiblie !`
          : '')
    } else if (a.side === 'heal') {
      div.className   = 'combat-log-entry heal'
      div.textContent = `💊 ${a.actor} soigne ${a.target} +${a.amount} PV`
    } else if (a.dodged) {
      div.className   = 'combat-log-entry'
      div.textContent = `${a.target} esquive l'attaque de ${a.actor} !`
    } else if (a.isDeathCrit) {
      div.className   = 'combat-log-entry crit atk'
      div.textContent = `☠ EXÉCUTION — ${a.actor} → ${a.target} : ${a.dmg} dégâts !`
    } else if (a.isCrit) {
      div.className   = 'combat-log-entry crit ' + (a.side === 'player' ? 'atk' : 'dmg')
      div.textContent = `★ CRITIQUE — ${a.actor} → ${a.target} : ${a.dmg} dégâts !`
    } else if (a.side === 'turret') {
      div.className   = 'combat-log-entry atk'
      div.textContent = `🔧 Tourelle → ${a.target} : ${a.dmg} dégâts`
    } else if (a.side === 'hot') {
      div.className   = 'combat-log-entry heal'
      div.textContent = `🧬 Régénération +${a.amount} PV à l'équipe`
    } else {
      div.className   = 'combat-log-entry ' + (a.side === 'player' ? 'atk' : 'dmg')
      div.textContent = `${a.actor} → ${a.target} : ${a.dmg} dégâts${a.killed ? ' ☠' : ''}`
    }
    log.insertBefore(div, log.firstChild)
    while (log.children.length > 8) log.removeChild(log.lastChild)
  }
}

// ── Applique les états finaux HP en cas de skip ──
function applyAllFinalStates(result, playerTeam, enemySquad) {
  // Affiche directement les HP finaux post-simulation (stockés dans les objets mutés)
  playerTeam.forEach(s => {
    updateHP('hp-' + s.id, 'hpv-' + s.id, Math.max(0, s.hp), s.maxHp)
    if (s.hp <= 0) document.getElementById('fighter-' + s.id)?.classList.add('dead')
  })
  enemySquad.forEach(e => {
    updateHP('ehp-' + e.id, 'ehpv-' + e.id, Math.max(0, e.hp), e.maxHp)
    if (!e.alive) { const c = document.getElementById('enemy-' + e.id); if (c) c.classList.add('dead') }
  })
}

// ── Helpers visuels ──
function updateHP(barId, valId, hp, maxHp) {
  const bar = document.getElementById(barId)
  const val = document.getElementById(valId)
  const pct = Math.round(Math.max(0, hp) / maxHp * 100)
  if (bar) {
    bar.style.width = pct + '%'
    // Couleur dynamique selon % HP
    bar.style.background = pct > 60 ? '#5AE05A' : pct > 30 ? '#E0C44A' : '#E05A4A'
  }
  if (val) val.textContent = Math.max(0, hp)
}

function setActing(card, type = 'player') {
  if (!card) return
  card.classList.remove('acting', 'acting-enemy', 'acting-heal')
  card.classList.add(type === 'enemy' ? 'acting-enemy' : type === 'heal' ? 'acting-heal' : 'acting')
  setTimeout(() => card.classList.remove('acting', 'acting-enemy', 'acting-heal'), 650)
}

function flashHit(card, isAlly = false) {
  card.classList.remove('hit-flash', 'hit-flash-ally')
  void card.offsetWidth
  card.classList.add(isAlly ? 'hit-flash-ally' : 'hit-flash')
  setTimeout(() => card.classList.remove('hit-flash', 'hit-flash-ally'), 300)
}

function animateDeath(card) {
  if (!card || card.classList.contains('dead')) return
  card.classList.add('dying')
  setTimeout(() => {
    card.classList.remove('dying')
    card.classList.add('dead')
  }, 500)
}

function spawnDmgFloat(card, dmg, isCrit = false, isAlly = false, isHeal = false, isTurret = false) {
  const el = document.createElement('div')
  el.className = 'dmg-float'
  if (isCrit)   el.classList.add('crit')
  if (isAlly)   el.classList.add('ally')
  if (isHeal)   el.classList.add('heal-float')
  if (isTurret) el.classList.add('turret-float')
  el.textContent = (isHeal ? '+' : '-') + dmg
  card.style.position = 'relative'
  card.appendChild(el)
  setTimeout(() => el.remove(), 800)
}

// ══════════════════════════════
// RÉSULTAT
// ══════════════════════════════
export function renderResult(state, result, reward) {
  const panel = document.getElementById('result-panel')
  if (!panel) return

  const teamSize  = state.team.filter(Boolean).length
  const fallenStr = result.fallen?.length
    ? result.fallen.map(n => `<span class="result-fallen-name">${n}</span>`).join('')
    : ''

  // Étoiles obtenues
  const stars     = result.stars || 0
  const starsHtml = Array.from({ length: 3 }, (_, i) =>
    `<div class="result-star ${i < stars ? 'filled' : ''}">★</div>`
  ).join('')

  panel.innerHTML = `
    <div class="result-stars ${result.victory ? 'anim' : ''}">
      ${result.victory ? starsHtml : '<div class="result-skull">☠</div>'}
    </div>
    <div class="result-title ${result.victory ? 'win' : 'lose'}">
      ${result.victory ? 'Mission réussie !' : 'Équipe éliminée...'}
    </div>

    <div class="result-stats">
      <div class="result-stat">
        <div class="result-stat-val">${result.survived}/${teamSize}</div>
        <div class="result-stat-label">Survivants</div>
      </div>
      <div class="result-stat">
        <div class="result-stat-val">${result.killCount ?? 0}</div>
        <div class="result-stat-label">Ennemis tués</div>
      </div>
      <div class="result-stat">
        <div class="result-stat-val" style="color:#E05A4A">${result.dmgDealt ?? 0}</div>
        <div class="result-stat-label">Dégâts infligés</div>
      </div>
      <div class="result-stat">
        <div class="result-stat-val" style="color:#4A8FE0">${result.dmgReceived ?? 0}</div>
        <div class="result-stat-label">Dégâts reçus</div>
      </div>
      <div class="result-stat">
        <div class="result-stat-val">${result.totalTurns}</div>
        <div class="result-stat-label">Tours</div>
      </div>
    </div>

    ${fallenStr ? `<div class="result-fallen">☠ Tombés : ${fallenStr}</div>` : ''}

    ${result.victory && reward?.capsules ? `
      <div class="result-reward" id="result-reward-row">
        <span id="rr-caps">💊 +0</span>
        <span id="rr-dna">🧬 +0</span>
        <span id="rr-xp">⭐ +0 XP</span>
        ${reward.radium > 0 ? `<span id="rr-rad">☢ +0</span>` : ''}
      </div>` : ''}

    ${!result.victory ? `<div class="result-tip">Conseil : ${getTip(result)}</div>` : ''}

    <button class="btn-danger result-btn" id="result-btn">
      ${result.victory
        ? (window._isBossWave ? '☠ Affronter le Boss !' : 'Vague suivante →')
        : 'Réessayer'}
    </button>
  `
}

function animateCounter(elId, target, suffix = '', prefix = '+', duration = 800) {
  const el = document.getElementById(elId)
  if (!el || !target) return
  const steps = 20
  const step  = target / steps
  let current = 0
  const interval = setInterval(() => {
    current = Math.min(current + step, target)
    el.textContent = el.textContent.split(' ')[0] + ` ${prefix}${Math.round(current)}${suffix}`
    if (current >= target) clearInterval(interval)
  }, duration / steps)
}

function getTip(result) {
  const state = window._state
  if (!state) return 'Améliorez vos survivants ou ouvrez des signaux.'

  const team = state.team.filter(Boolean)
  const roles = team.map(s => {
    const sv = (window._SURVIVORS || []).find(x => x.id === s.id)
    return sv?.role || ''
  })

  const hasTank    = roles.some(r => ['Bouclier','Blindé'].includes(r))
  const hasHealer  = roles.some(r => ['Médic','Biologiste'].includes(r))
  const hasDPS     = roles.some(r => ['Berserk','Lame','Ombre','Pistard','Tireur','Artificier'].includes(r))
  const hasSupport = roles.some(r => ['Tacticien','Ingénieur'].includes(r))

  // Diagnostic basé sur ce qui s'est passé
  if (result.totalTurns >= 50)
    return hasDPS
      ? 'Améliorez l\'ATK de vos combattants ou ouvrez des signaux pour des recrues E/L.'
      : 'Aucun combattant offensif dans l\'équipe — ajoutez un Berserk, Tireur ou Assassin.'

  if (result.survived === 0 && result.dmgReceived > result.dmgDealt * 1.8)
    return hasTank
      ? hasHealer
        ? 'Votre équipe est trop fragile — améliorez vos survivants avec de l\'ADN.'
        : 'Ajoutez un Médic ou Biologiste pour soigner pendant le combat.'
      : 'Ajoutez un Tank (Bouclier ou Blindé) pour absorber les dégâts ennemis.'

  if (!hasHealer && result.fallen?.length >= Math.ceil(team.length / 2))
    return 'La moitié de votre équipe est tombée — un Médic pourrait changer la donne.'

  if (!hasSupport)
    return 'Un Tacticien ou Ingénieur renforcerait la synergie de votre équipe.'

  return 'Ouvrez des signaux pour recruter des survivants Expert ou Légendaire.'
}

// Lancer les animations de compteur après le rendu
export function startRewardCounters(reward) {
  if (!reward?.capsules) return
  setTimeout(() => {
    animateCounter('rr-caps', reward.capsules, '', '💊 +', 900)
    setTimeout(() => animateCounter('rr-dna', reward.dna, '', '🧬 +', 700), 150)
    setTimeout(() => animateCounter('rr-xp', reward.accountXP, ' XP', '⭐ +', 700), 300)
    if (reward.radium > 0) setTimeout(() => animateCounter('rr-rad', reward.radium, '', '☢ +', 500), 450)
  }, 600)
}

window.renderPreCombat    = renderPreCombat
window.renderCombatPanel  = renderCombatPanel
window.renderResult       = renderResult
window.startRewardCounters = startRewardCounters
