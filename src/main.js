import { loadState, saveState, calcOfflineCapsules } from './core/state.js'
import { collectOffline, claimDaily, updateMission, applyReward } from './core/economy.js'
import { openSignal, toggleTeam } from './core/gacha.js'
import {
  generateEnemySquad, simulateFight, survivorCombatStats,
  calcWaveReward, advanceWave, isBossWave, defeatBoss,
  gainAccountXP, PHASE,
} from './core/combat.js'
import { ZONES } from './data/zones.js'

import './ui/hub.js'
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
  checkOfflineReward()
  updateUI()
  setTab('combat')
  renderCombatView()

  setInterval(() => saveState(S), 15000)

  // Tick idle capsules
  setInterval(() => {
    let rate = 0
    if (S.team) S.team.forEach(s => {
      if (s?.effect?.startsWith('idle+')) rate += parseFloat(s.effect.split('+')[1])
    })
    if (rate > 0) {
      S.capsules += Math.round(rate * 10) / 10
      const el = document.getElementById('d-capsules')
      if (el) el.textContent = Math.floor(S.capsules)
    }
  }, 1000)
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

// ── Démarre un combat ──
window.startCombat = function() {
  const team = S.team.filter(Boolean)
  if (team.length === 0) return

  enemySquad = generateEnemySquad(S)
  currentPhase = PHASE.FIGHTING

  // Instancie les stats joueur
  const playerTeam = team.map(t => {
    const stats = survivorCombatStats(t.id)
    return { ...stats }
  })

  showPanel('combat-panel')

  const result = simulateFight(team.map(t => t.id), enemySquad, S)
  lastResult   = result
  window._isBossWave = isBossWave(S)

  if (window.renderCombatPanel) {
    window.renderCombatPanel(S, playerTeam, enemySquad, result, onCombatDone)
  }
}

function onCombatDone() {
  currentPhase = PHASE.RESULT
  const reward = lastResult.victory ? calcWaveReward(S) : null

  if (lastResult.victory) {
    applyReward(S, reward)
    gainAccountXP(S, reward.accountXP)
    updateMission(S, 'capsules_earned', reward.capsules)
    addLog(`Vague ${S.currentWave} terminée ! +${reward.capsules} capsules`, 'reward')
  } else {
    addLog('Équipe éliminée — renforcez vos survivants !', 'miss')
  }

  showPanel('result-panel')
  if (window.renderResult) window.renderResult(S, lastResult, reward || {})

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
  advanceWave(S)
  saveState(S)
  currentPhase = PHASE.IDLE
  renderCombatView()
  updateUI()
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
  result.fusionLogs?.forEach(f => addLog(f.message, 'reward'))
  saveState(S); updateUI()
  if (window.playPackAnim) window.playPackAnim(result.obtained)
  if (window.setTab) window.setTab('packs')
}

window.toggleTeamUI = function(survivorId) {
  const result = toggleTeam(S, survivorId)
  if (result.error) { addLog(result.error, 'miss'); return }
  saveState(S); updateUI()
}

window.claimDailyUI = function() {
  const reward = claimDaily(S)
  if (!reward) { addLog('Déjà réclamé aujourd\'hui !', 'miss'); return }
  addLog('Rapport journalier réclamé !', 'reward')
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

  let idleRate = 0
  if (S.team) S.team.forEach(s => {
    if (s?.effect?.startsWith('idle+')) idleRate += parseFloat(s.effect.split('+')[1])
  })
  if (el('idle-display')) el('idle-display').textContent = `Idle: +${Math.round(idleRate * 10) / 10} caps/s`

  window._state = S
  if (window.renderTeam)       window.renderTeam(S)
  if (window.renderCollection) window.renderCollection(S)
  if (window.renderTalents)    window.renderTalents(S)
  if (window.renderDaily)      window.renderDaily(S)
  if (window.renderTower)      window.renderTower(S)
  if (window.renderPacks)      window.renderPacks(S)
  if (window.renderHub)        window.renderHub(S)
}

document.addEventListener('DOMContentLoaded', init)
