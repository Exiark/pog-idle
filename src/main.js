import { loadState, saveState, calcOfflineCapsules, calcIdleRate } from './core/state.js'
import { collectOffline, claimDaily, claimMission, updateMission, applyReward, checkMissionsReset } from './core/economy.js'
import { openSignal, toggleTeam } from './core/gacha.js'
import {
  generateEnemySquad, simulateFight, survivorCombatStats,
  calcWaveReward, advanceWave, isBossWave, defeatBoss,
  gainAccountXP, doPrestige, PHASE,
} from './core/combat.js'
import { ZONES } from './data/zones.js'
import { getNarration, markNarrationShown } from './data/narration.js'

import './ui/hub.js'
import './ui/homeScreen.js'
import './ui/arena.js'
import './ui/collection.js'
import './ui/packOpening.js'
import './ui/talentTree.js'
import './ui/dailyPanel.js'
import './ui/tower.js'

// ── État global ──
let S = loadState()
window._state    = S
window.saveState = saveState

// ── État de combat ──
let enemySquad   = []
let currentPhase = PHASE.IDLE
let lastResult   = null
let bossHP       = 0
let bossMaxHP    = 0

// ── Init ──
function init() {
  checkMissionsReset(S)
  checkOnboarding()
  checkOfflineReward()
  updateUI()
  setTab('home')
  renderCombatView()

  setInterval(() => saveState(S), 15000)

  // Tick idle capsules
  setInterval(() => {
    const rate = calcIdleRate(S)
    if (rate > 0) {
      S.capsules += rate
      const el = document.getElementById('d-capsules')
      if (el) el.textContent = Math.floor(S.capsules)
    }
    updateTabBadges(S)
  }, 1000)
}

// ── Onboarding (premier lancement) ──
function checkOnboarding() {
  if (S.onboardingDone) return
  import('../data/survivors.js').then(({ SURVIVORS }) => {
    const dTier = SURVIVORS.filter(sv => sv.rarity === 'D' && !sv.boss).slice(0, 3)
    dTier.forEach(sv => S.collection.push({ id: sv.id, rarity: sv.rarity }))
    S.onboardingDone = true
    saveState(S)
    updateUI()
    showOnboardingMessage()
  })
}

function showOnboardingMessage() {
  const panel = document.getElementById('precombat-panel')
  const banner = document.createElement('div')
  banner.className = 'onboarding-banner'
  banner.innerHTML = `
    <div class="onboarding-icon">☣</div>
    <div class="onboarding-text">
      <strong>Bienvenue au Shelter !</strong><br>
      3 survivants vous ont rejoint. Allez dans <strong>Équipe</strong> pour les ajouter à votre groupe,
      puis lancez votre première mission !
    </div>
    <button class="onboarding-dismiss" onclick="this.parentElement.remove()">✕</button>
  `
  if (panel) panel.prepend(banner)
  else document.body.prepend(banner)
}

// ── Offline ──
function checkOfflineReward() {
  const earned = calcOfflineCapsules(S)
  if (earned > 0) {
    S.capsules += earned
    S.lastSeen  = Date.now()
    const notif = document.getElementById('offline-notif')
    const msg   = document.getElementById('offline-msg')
    if (notif && msg) {
      msg.textContent     = `Bon retour ! +${earned} capsules gagnées hors-ligne.`
      notif.style.display = 'flex'
    }
  } else {
    S.lastSeen = Date.now()
  }
}

// ══════════════════════════════
// ÉCRANS DE COMBAT
// ══════════════════════════════

function renderCombatView() {
  // Masque tout
  showPanel(null)

  if (currentPhase === PHASE.IDLE) {
    showPanel('precombat-panel')
    if (window.renderPreCombat) window.renderPreCombat(S)
    renderBossPanel()
    renderWaveFrise()

  } else if (currentPhase === PHASE.FIGHTING) {
    showPanel('combat-panel')

  } else if (currentPhase === PHASE.RESULT) {
    showPanel('result-panel')
  }
}

function showPanel(id) {
  ['precombat-panel','combat-panel','result-panel'].forEach(p => {
    const el = document.getElementById(p)
    if (el) el.style.display = p === id ? '' : 'none'
  })
}

// ── Démarre un combat (avec narration si applicable) ──
window.startCombat = function() {
  const team = S.team.filter(Boolean)
  if (team.length === 0) return

  // Narration avant le combat (boss ou début de zone)
  const isBoss = isBossWave(S)
  const trigger = isBoss
    ? `boss_z${S.activeZone}`
    : (S.currentWave === 1 ? `zone_${S.activeZone}_start` : null)

  const narr = trigger ? getNarration(trigger, S) : null
  if (narr) {
    markNarrationShown(trigger, S)
    showNarration(narr, () => launchCombat(team))
  } else {
    launchCombat(team)
  }
}

function launchCombat(team) {
  enemySquad   = generateEnemySquad(S)
  currentPhase = PHASE.FIGHTING

  const playerTeam = team.map(t => ({ ...survivorCombatStats(t.id) }))
  showPanel('combat-panel')

  const result = simulateFight(team.map(t => t.id), enemySquad, S)
  lastResult   = result
  window._isBossWave = isBossWave(S)

  if (window.renderCombatPanel) {
    window.renderCombatPanel(S, playerTeam, enemySquad, result, onCombatDone)
  }
}

// ── Affiche une narration avec portrait pixel art ──
function showNarration(narr, onDone) {
  const overlay = document.createElement('div')
  overlay.id = 'narration-overlay'
  const line = narr.lines[Math.floor(Math.random() * narr.lines.length)]
  const speaker = narr.speaker || 'Survivant'

  overlay.innerHTML = `
    <div class="narr-box">
      <div class="narr-portrait">
        <img src="assets/portraits/${narr.role ? narr.role.toLowerCase().replace(/[éèê]/g, 'e') : 'default'}.png"
          alt="${speaker}"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="narr-portrait-fallback" style="display:none">
          <span style="font-size:32px">☣</span>
        </div>
      </div>
      <div class="narr-content">
        <div class="narr-speaker">${speaker}</div>
        <div class="narr-line" id="narr-line"></div>
      </div>
    </div>
    <div class="narr-hint">Appuyez pour continuer</div>
  `

  document.body.appendChild(overlay)

  // Effet machine à écrire
  const lineEl = overlay.querySelector('#narr-line')
  let i = 0
  const typeInterval = setInterval(() => {
    if (i >= line.length) { clearInterval(typeInterval); return }
    lineEl.textContent += line[i++]
  }, 28)

  const close = () => {
    clearInterval(typeInterval)
    overlay.classList.add('narr-fadeout')
    setTimeout(() => { overlay.remove(); onDone() }, 350)
  }

  overlay.addEventListener('click', close)
  setTimeout(close, 5000) // auto-skip après 5s
}

function onCombatDone() {
  currentPhase = PHASE.RESULT
  const stars  = lastResult.stars || 0

  // Bonus de récompenses selon étoiles (×1 / ×1.15 / ×1.30)
  const starMult = stars >= 3 ? 1.30 : stars >= 2 ? 1.15 : 1.0
  const baseReward = lastResult.victory ? calcWaveReward(S) : null
  const reward = baseReward ? {
    capsules:  Math.round(baseReward.capsules  * starMult),
    dna:       Math.round(baseReward.dna       * starMult),
    radium:    baseReward.radium,
    accountXP: Math.round(baseReward.accountXP * starMult),
  } : null

  if (lastResult.victory) {
    // Sauvegarde le meilleur score d'étoiles pour la zone
    const prevStars = (S.zoneStars || {})[S.activeZone] || 0
    if (stars > prevStars) {
      S.zoneStars = { ...(S.zoneStars || {}), [S.activeZone]: stars }
    }

    applyReward(S, reward)
    const leveledUp = gainAccountXP(S, reward.accountXP)
    if (leveledUp) {
      showToast(`⭐ Niveau ${S.accountLevel} atteint ! +1 point de talent`, 'levelup', 4000)
    }
    updateMission(S, 'capsules_earned', reward.capsules)
    addLog(`Vague ${S.currentWave} terminée ! +${reward.capsules} capsules`, 'reward')

    // Toasts missions complètes
    const missionLogs = S.missions?.filter(m => m.done && !m.claimed).map(m => m.name) || []
    missionLogs.forEach(name => showToast(`📋 Mission accomplie : ${name} !`, 'levelup', 3500))
  } else {
    addLog('Équipe éliminée — renforcez vos survivants !', 'miss')
  }

  showPanel('result-panel')
  if (window.renderResult) window.renderResult(S, lastResult, reward || {})
  if (lastResult.victory && window.playVictorySound) window.playVictorySound()
  if (lastResult.victory && reward && window.startRewardCounters) window.startRewardCounters(reward)

  // Branche le bouton résultat
  const btn = document.getElementById('result-btn')
  if (btn) {
    if (lastResult.victory) {
      btn.onclick = isBossWave(S) ? handleBossVictory : onVictoryNext
    } else {
      btn.onclick = onDefeatRetry
    }
  }

  saveState(S)
  updateUI()
}

function onVictoryNext() {
  advanceWave(S)
  saveState(S)
  currentPhase = PHASE.IDLE
  renderCombatView()
  updateUI()
}

function onDefeatRetry() {
  currentPhase = PHASE.IDLE
  renderCombatView()
}

// ── Boss ──
function renderBossPanel() {
  const zone   = ZONES[S.activeZone - 1]
  if (!isBossWave(S)) { hideBossPanel(); return }

  bossMaxHP = zone.boss.hp
  bossHP     = bossMaxHP

  const panel = document.getElementById('boss-panel')
  if (!panel) return
  panel.classList.add('visible')

  const nameEl = document.getElementById('boss-name')
  const descEl = document.getElementById('boss-desc')
  const hpText = document.getElementById('boss-hp-text')
  const hpBar  = document.getElementById('boss-hp-bar-fill')
  if (nameEl) nameEl.textContent  = zone.boss.name
  if (descEl) descEl.textContent  = zone.boss.desc
  if (hpText) hpText.textContent  = `${bossHP}/${bossMaxHP} PV`
  if (hpBar)  hpBar.style.width   = '100%'

  addLog(`BOSS : ${zone.boss.name} apparaît !`, 'boss')
}

function hideBossPanel() {
  const panel = document.getElementById('boss-panel')
  if (panel) panel.classList.remove('visible', 'shake')
}

function handleBossVictory() {
  hideBossPanel()
  const result = defeatBoss(S, S.activeZone)
  if (result) addLog(`Boss éliminé ! Zone ${result.nextZone} déverrouillée !`, 'reward')
  showBossVictoryScreen(result)
  advanceWave(S)
  saveState(S)
}

function showBossVictoryScreen(defeatResult) {
  const panel = document.getElementById('result-panel')
  if (!panel) return

  const zone = ZONES[S.activeZone - 2] || ZONES[0]  // zone qu'on vient de finir
  const bossName = zone.boss?.name || 'Boss'
  const nextZone = defeatResult?.nextZone
  const nextZoneData = nextZone ? ZONES[nextZone - 1] : null

  panel.innerHTML = `
    <div class="boss-victory-screen">
      <div class="boss-victory-icon">☠</div>
      <div class="boss-victory-title">Boss éliminé !</div>
      <div class="boss-victory-name">${bossName}</div>

      ${nextZoneData ? `
        <div class="boss-victory-unlock">
          <div class="boss-victory-unlock-label">Zone déverrouillée</div>
          <div class="boss-victory-unlock-zone">Zone ${nextZone} — ${nextZoneData.name}</div>
          <div class="boss-victory-unlock-desc">${nextZoneData.desc || ''}</div>
        </div>` : `
        <div class="boss-victory-unlock">
          <div class="boss-victory-unlock-label">Vous avez conquis toutes les zones !</div>
        </div>`}

      <button class="btn-danger result-btn" onclick="window._onBossVictoryContinue()">
        ${nextZoneData ? `Explorer Zone ${nextZone} →` : 'Continuer'}
      </button>
    </div>
  `

  playVictorySound()
  showPanel('result-panel')

  window._onBossVictoryContinue = function() {
    currentPhase = PHASE.IDLE
    renderCombatView()
    updateUI()
  }
}

// ── Frise de vagues ──
function renderWaveFrise() {
  const frise = document.getElementById('wave-frise')
  if (!frise) return

  const total   = 11
  const current = S.currentWave

  frise.innerHTML = `
    <div class="wave-frise-inner">
      ${Array.from({ length: total }, (_, i) => {
        const wave      = i + 1
        const isBoss    = wave === 11
        const isPast    = wave < current
        const isCurrent = wave === current

        let bg = 'var(--panel-bg)', border = 'var(--gray-border)', color = 'var(--text-muted)'
        let content = String(wave)

        if (isBoss) {
          bg      = isPast ? '#1A3A0A' : isCurrent ? '#3A0A0A' : 'var(--panel-bg)'
          border  = isPast ? '#5A9E3A' : isCurrent ? 'var(--accent)' : 'var(--gray-border)'
          color   = isPast ? '#5A9E3A' : isCurrent ? 'var(--accent)' : 'var(--text-muted)'
          content = isPast ? '✓' : '☠'
        } else if (isPast) {
          bg = '#1A3A0A'; border = '#5A9E3A'; color = '#5A9E3A'; content = '✓'
        } else if (isCurrent) {
          bg = '#2A1A0A'; border = 'var(--accent)'; color = 'var(--accent)'
        }

        return `
          <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0">
            <div style="
              width:${isBoss ? '32px' : '26px'};height:${isBoss ? '32px' : '26px'};
              border-radius:50%;background:${bg};
              border:${isCurrent ? '2px' : '1px'} solid ${border};
              color:${color};font-size:${isBoss ? '13px' : '11px'};
              font-weight:${isCurrent ? '500' : '400'};
              display:flex;align-items:center;justify-content:center;">
              ${content}
            </div>
            <div style="font-size:9px;color:${isCurrent ? 'var(--accent)' : 'var(--text-muted)'};
              font-weight:${isCurrent ? '500' : '400'}">
              ${isBoss ? 'BOSS' : 'V' + wave}
            </div>
          </div>
          ${i < total - 1 ? `<div style="
            flex:1;height:1px;
            background:${isPast ? '#5A9E3A' : 'var(--gray-border)'};
            min-width:6px;max-width:16px;margin-bottom:14px;
          "></div>` : ''}`
      }).join('')}
    </div>`
}

function addLog(msg, cls) {
  const log = document.getElementById('log')
  if (!log) return
  const d = document.createElement('div')
  d.className = cls || ''; d.textContent = msg
  log.insertBefore(d, log.firstChild)
  while (log.children.length > 20) log.removeChild(log.lastChild)
}

// ── Actions window ──
window.openSignalUI = function(type) {
  const result = openSignal(S, type)
  if (result.error) { addLog(result.error, 'miss'); return }
  result.fusionLogs?.forEach(f => {
    addLog(f.message, 'reward')
    showToast(
      `🔬 FUSION ! <strong>${f.from.name}</strong> ×3 → <strong>${f.to.name}</strong>`,
      'fusion', 4000
    )
  })
  saveState(S); updateUI()
  if (window.playPackAnim) window.playPackAnim(result.obtained, result.newIds || [])
  if (window.setTab) window.setTab('packs')
}

window.toggleTeamUI = function(survivorId) {
  const result = toggleTeam(S, survivorId)
  if (result.error) { addLog(result.error, 'miss'); return }
  saveState(S); updateUI()
}

window.claimDailyUI = function() {
  const result = claimDaily(S)
  if (!result) { addLog('Déjà réclamé aujourd\'hui !', 'miss'); return }
  const { reward, streak, streakBonus } = result
  let msg = 'Rapport journalier réclamé !'
  if (streak > 1) msg += ` — ${streak} jours consécutifs 🔥`
  if (streakBonus) msg += ` BONUS x7 ! +${streakBonus.capsules}💊 +${streakBonus.radium}☢`
  addLog(msg, 'reward')
  if (streakBonus) showToast(`🔥 Streak x7 ! +${streakBonus.capsules} capsules +${streakBonus.radium} radium`, 'fusion', 5000)
  checkMissionsReset(S)
  saveState(S); updateUI()
}

window.claimMissionUI = function(missionId) {
  const reward = claimMission(S, missionId)
  if (!reward) return
  const parts = []
  if (reward.capsules) parts.push(`+${reward.capsules}💊`)
  if (reward.dna)      parts.push(`+${reward.dna}🧬`)
  if (reward.radium)   parts.push(`+${reward.radium}☢`)
  showToast(`📋 Mission réclamée ! ${parts.join(' ')}`, 'levelup', 3000)
  saveState(S); updateUI()
}

window.collectOfflineUI = function(mult) {
  if (mult === 2 && S.radium < 5) { addLog('Pas assez de radium !', 'miss'); return }
  if (mult === 2) S.radium -= 5
  const earned = collectOffline(S, mult)
  addLog(`Gains offline : +${earned} capsules${mult === 2 ? ' (×2)' : ''}`, 'reward')
  const notif = document.getElementById('offline-notif')
  if (notif) notif.style.display = 'none'
  saveState(S); updateUI()
}

// ── Prestige ──
window.openPrestigeUI = function() {
  const modal = document.createElement('div')
  modal.id = 'prestige-modal'
  modal.innerHTML = `
    <div class="prestige-box">
      <div class="prestige-title">☣ PRESTIGE</div>
      <div class="prestige-desc">
        Repartez de zéro avec un bonus permanent de
        <strong>+${(((S.prestigeLevel || 0) + 1) * 10)}% de gains idle</strong>.<br><br>
        Votre niveau de compte, vos talents et vos points sont conservés.
        Tout le reste est réinitialisé.
      </div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
        <button class="btn-danger" onclick="window.confirmPrestige()">Prestige !</button>
        <button onclick="document.getElementById('prestige-modal').remove()">Annuler</button>
      </div>
    </div>`
  document.body.appendChild(modal)
}

window.confirmPrestige = function() {
  document.getElementById('prestige-modal')?.remove()
  if (doPrestige(S)) {
    showToast(`☣ Prestige ${S.prestigeLevel} ! Gains idle ×${1 + S.prestigeLevel * 0.1}`, 'fusion', 5000)
    saveState(S)
    currentPhase = PHASE.IDLE
    renderCombatView()
    updateUI()
  }
}

window.setTab = setTab
function setTab(tab) {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab))
  document.querySelectorAll('.view').forEach(v =>
    v.style.display = v.dataset.view === tab ? '' : 'none')
  updateUI()
}

document.addEventListener('zoneChanged', () => {
  currentPhase = PHASE.IDLE
  hideBossPanel()
  renderCombatView()
  updateUI()
})

// ── UI globale ──
function updateUI() {
  const zone = ZONES[S.activeZone - 1]

  const el = id => document.getElementById(id)
  if (el('d-capsules')) el('d-capsules').textContent = Math.floor(S.capsules)
  if (el('d-radium'))   el('d-radium').textContent   = Math.floor(S.radium)
  if (el('d-dna'))      el('d-dna').textContent      = Math.floor(S.dna)
  if (el('d-tokens'))   el('d-tokens').textContent   = Math.floor(S.tokens)
  if (el('wave-num'))   el('wave-num').textContent   = S.currentWave
  if (el('zone-name'))  el('zone-name').textContent  = `Zone ${S.activeZone} — ${zone?.name || ''}`

  const lvl   = S.accountLevel
  const xpMax = (lvl + 1) * 100
  if (el('acc-lvl-badge')) el('acc-lvl-badge').textContent = lvl + 1
  if (el('acc-xp-fill'))   el('acc-xp-fill').style.width   = Math.round(S.accountXP / xpMax * 100) + '%'

  const idleRate = calcIdleRate(S)
  if (el('idle-display')) el('idle-display').textContent = `Idle: +${idleRate} caps/s`

  window._state = S
  if (window.renderHome)       window.renderHome(S)
  if (window.renderTeam)       window.renderTeam(S)
  if (window.renderCollection) window.renderCollection(S)
  if (window.renderTalents)    window.renderTalents(S)
  if (window.renderDaily)      window.renderDaily(S)
  if (window.renderTower)      window.renderTower(S)
  if (window.renderPacks)      window.renderPacks(S)
  if (window.renderHub)        window.renderHub(S)
  // Re-rend le précombat si on est en phase IDLE (ex: après ajout d'un survivant à l'équipe)
  if (currentPhase === PHASE.IDLE && window.renderPreCombat) window.renderPreCombat(S)
  updateTabBadges(S)
}

// ── Badges de notification sur les onglets ──
function updateTabBadges(state) {
  // Missions : mission complète non réclamée OU rapport journalier disponible
  const hasMissionReady = state.missions?.some(m => m.done && !m.claimed)
  const hasDailyReady   = !state.dailyClaimed
  setBadge('daily', hasMissionReady || hasDailyReady)

  // Talents : points disponibles
  const hasPoints = (state.talentPoints || 0) > 0
  setBadge('talents', hasPoints)
}

function setBadge(tab, show) {
  const btn = document.querySelector(`.tab[data-tab="${tab}"]`)
  if (!btn) return
  let dot = btn.querySelector('.tab-badge')
  if (show && !dot) {
    dot = document.createElement('span')
    dot.className = 'tab-badge'
    btn.appendChild(dot)
  } else if (!show && dot) {
    dot.remove()
  }
}

// ── Toasts ──
function showToast(msg, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    document.body.appendChild(container)
  }
  const t = document.createElement('div')
  t.className = `toast toast-${type}`
  t.innerHTML = msg
  container.appendChild(t)
  requestAnimationFrame(() => t.classList.add('show'))
  setTimeout(() => {
    t.classList.remove('show')
    setTimeout(() => t.remove(), 400)
  }, duration)
}
window.showToast = showToast

// ── Audio (Web Audio API, aucun fichier externe) ──
let _audioCtx = null
function getAudio() {
  if (!_audioCtx) _audioCtx = new AudioContext()
  return _audioCtx
}

function playHitSound() {
  try {
    const ctx = getAudio()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'square'
    osc.frequency.setValueAtTime(180, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1)
  } catch (_) {}
}

function playVictorySound() {
  try {
    const ctx = getAudio()
    const notes = [330, 392, 494, 659]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'triangle'
      const t = ctx.currentTime + i * 0.12
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.2, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      osc.start(t); osc.stop(t + 0.2)
    })
  } catch (_) {}
}

window.playHitSound    = playHitSound
window.playVictorySound = playVictorySound

document.addEventListener('DOMContentLoaded', init)
