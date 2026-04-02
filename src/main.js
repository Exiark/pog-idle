import { loadState, saveState, calcOfflineGold } from './core/state.js'
import { collectOffline, claimDaily, updateMission, applyReward } from './core/economy.js'
import { openPack, toggleEquip } from './core/gacha.js'
import {
  generateEnemyPile, doAttack, calcWaveReward,
  advanceFloor, isBossWave, defeatBoss,
  gainKiniXP, gainAccountXP, calcInterval,
} from './core/combat.js'

import './ui/hud.js'
import './ui/arena.js'
import './ui/kiniPanel.js'
import './ui/collection.js'
import './ui/packOpening.js'
import './ui/talentTree.js'
import './ui/dailyPanel.js'
import './ui/tower.js'

// ── État global ──
let S = loadState()
let enemyPile = []
let fightInterval = null
let isPaused = false

// Expose sur window pour les modules UI
window._state    = S
window.saveState = saveState

// ── Initialisation ──
function init() {
  checkOfflineReward()
  initPile()
  startFighting()
  updateUI()
  setTab('combat')

  setInterval(() => saveState(S), 15000)

  setInterval(() => {
    const rate = calcIdleRate()
    if (rate > 0) {
      S.gold += rate
      document.getElementById('d-gold').textContent = Math.floor(S.gold)
    }
  }, 1000)
}

// ── Offline ──
function checkOfflineReward() {
  const earned = calcOfflineGold(S)
  if (earned > 0) {
    S.gold += earned
    S.lastSeen = Date.now()
    showOfflineNotif(earned)
  } else {
    S.lastSeen = Date.now()
  }
}

function showOfflineNotif(earned) {
  const notif = document.getElementById('offline-notif')
  const msg   = document.getElementById('offline-msg')
  if (!notif || !msg) return
  msg.textContent    = `Bon retour ! +${earned} or gagnés hors-ligne.`
  notif.style.display = 'flex'
}

// ── Combat ──
function initPile() {
  enemyPile = generateEnemyPile(S)
  renderEnemyPile()
  updateWaveBar()
}

function startFighting() {
  clearInterval(fightInterval)
  fightInterval = setInterval(tick, calcInterval(S))
}

function tick() {
  if (isPaused) return
  if (enemyPile.every(p => p.flipped)) return

  const result = doAttack(S, enemyPile)
  gainKiniXP(S, S.selectedKini, result.flipped)
  renderAttack(result)
  updateWaveBar()

  if (result.done) {
    clearInterval(fightInterval)
    setTimeout(endWave, 800)
  }
}

function endWave() {
  const reward = calcWaveReward(S)
  applyReward(S, reward)
  gainAccountXP(S, reward.accountXP)
  updateMission(S, 'waves', 1)
  updateMission(S, 'gold_earned', reward.gold)
  addLog(`Vague ${S.currentFloor} terminée ! +${reward.gold} or`, 'reward')

  if (isBossWave(S)) {
    handleBoss()
    return
  }

  advanceFloor(S)
  saveState(S)
  updateUI()
  setTimeout(() => { initPile(); startFighting() }, 1000)
}

function handleBoss() {
  isPaused = true
  addLog(`BOSS : ${getCurrentWorld().boss.name} !`, 'boss')

  setTimeout(() => {
    const result = defeatBoss(S, S.activeWorld)
    if (result) {
      addLog(`Boss vaincu ! Kini ${result.kini} et pog ${result.pog} obtenus !`, 'reward')
      if (result.nextWorld <= 7) {
        addLog(`Monde ${result.nextWorld} déverrouillé !`, 'reward')
      }
    }
    isPaused = false
    saveState(S)
    updateUI()
    setTimeout(() => { initPile(); startFighting() }, 1500)
  }, 2000)
}

function getCurrentWorld() {
  return { boss: { name: `Boss Monde ${S.activeWorld}` } }
}

// ── Actions window ──
window.selectKini = function(index) {
  S.selectedKini = index
  clearInterval(fightInterval)
  startFighting()
  saveState(S)
  updateUI()
}

window.openPackUI = function(type) {
  const result = openPack(S, type)
  if (result.error) { addLog(result.error, 'miss'); return }
  result.fusionLogs?.forEach(f => addLog(f.message, 'reward'))
  saveState(S)
  updateUI()
  if (window.playPackAnim) window.playPackAnim(result.obtained)
  if (window.setTab) window.setTab('packs')
}

window.toggleEquipUI = function(pogId) {
  const maxSlots = S.talentsUnlocked.includes('t9') ? 11 : 10
  const result   = toggleEquip(S, pogId, maxSlots)
  if (result.error) { addLog(result.error, 'miss'); return }
  saveState(S)
  updateUI()
}

window.claimDailyUI = function() {
  const reward = claimDaily(S)
  if (!reward) { addLog('Déjà réclamé aujourd\'hui !', 'miss'); return }
  addLog('Récompense journalière réclamée !', 'reward')
  saveState(S)
  updateUI()
}

window.collectOfflineUI = function(mult) {
  if (mult === 2 && S.gems < 5) { addLog('Pas assez de gemmes !', 'miss'); return }
  if (mult === 2) S.gems -= 5
  const earned = collectOffline(S, mult)
  addLog(`Gains offline : +${earned} or${mult === 2 ? ' (×2)' : ''}`, 'reward')
  document.getElementById('offline-notif').style.display = 'none'
  saveState(S)
  updateUI()
}

window.setTab = setTab
function setTab(tab) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab)
  })
  document.querySelectorAll('.view').forEach(v => {
    v.style.display = v.dataset.view === tab ? '' : 'none'
  })
  updateUI()
}

document.addEventListener('worldChanged', () => {
  clearInterval(fightInterval)
  initPile()
  startFighting()
  updateUI()
})

// ── Rendu ──
function updateUI() {
  document.getElementById('d-gold').textContent   = Math.floor(S.gold)
  document.getElementById('d-gems').textContent   = Math.floor(S.gems)
  document.getElementById('d-frags').textContent  = Math.floor(S.fragments)
  document.getElementById('d-tokens').textContent = Math.floor(S.tokens)
  document.getElementById('wave-num').textContent = S.currentFloor

  const wn = document.getElementById('world-name')
  if (wn) wn.textContent = `Monde ${S.activeWorld} — ${getWorldName(S.activeWorld)}`

  window._state = S
  if (window.renderHUD)        window.renderHUD(S)
  if (window.renderTeam)       window.renderTeam(S)
  if (window.renderKiniPanel)  window.renderKiniPanel(S)
  if (window.renderCollection) window.renderCollection(S)
  if (window.renderTalents)    window.renderTalents(S)
  if (window.renderDaily)      window.renderDaily(S)
  if (window.renderTower)      window.renderTower(S)
  if (window.renderPacks)      window.renderPacks(S)
}

function getWorldName(id) {
  const names = [
    'La Rue des Pogs', 'Les Abysses Froides', 'La Forge Volcanique',
    'Les Ruines Stellaires', 'Le Cosmos Brisé', 'L\'Olympe des Pogs', 'Le Néant Céleste'
  ]
  return names[id - 1] || ''
}

function renderEnemyPile() {
  const pile = document.getElementById('enemy-pile')
  if (!pile) return
  const colors = ['#EEEDFE','#E6F1FB','#EAF3DE','#FAEEDA','#FBEAF0','#FAECE7']
  pile.innerHTML = enemyPile.map(p => `
    <div class="pog-e${p.flipped ? ' flipped' : ''}" id="ep${p.id}"
      style="background:${p.flipped ? '#ddd' : colors[p.id % colors.length]}">
      ${p.id + 1}
    </div>`).join('')
}

function renderAttack(result) {
  const ball = document.getElementById('kini-ball')
  if (!ball) return
  ball.classList.remove('out', 'back')
  void ball.offsetWidth
  ball.classList.add('out')
  setTimeout(() => {
    ball.classList.remove('out')
    ball.classList.add('back')
    enemyPile.filter(p => p.flipped).forEach(p => {
      const el = document.getElementById('ep' + p.id)
      if (el && !el.classList.contains('flipped')) {
        el.classList.add('hit')
        setTimeout(() => {
          el.classList.remove('hit')
          el.classList.add('flipped')
          el.style.background = '#ddd'
        }, 150)
      }
    })
  }, 150)
  addLog(
    result.isCrit ? `★ CRITIQUE ! ${result.flipped} pog(s) !` : `${result.flipped} pog(s) retourné(s)`,
    result.isCrit ? 'crit' : 'flip'
  )
}

function updateWaveBar() {
  const total   = enemyPile.length
  const flipped = enemyPile.filter(p => p.flipped).length
  const pct     = total > 0 ? Math.round(flipped / total * 100) : 0
  const bar     = document.getElementById('wave-bar')
  const pctEl   = document.getElementById('wave-pct')
  if (bar)   bar.style.width  = pct + '%'
  if (pctEl) pctEl.textContent = pct + '%'
}

function addLog(msg, cls) {
  const log = document.getElementById('log')
  if (!log) return
  const d = document.createElement('div')
  d.className   = cls || ''
  d.textContent = msg
  log.insertBefore(d, log.firstChild)
  while (log.children.length > 20) log.removeChild(log.lastChild)
}

function calcIdleRate() {
  let rate = 0
  S.equippedPogs.forEach(p => {
    if (!p?.effect) return
    if (p.effect.startsWith('idle+')) rate += parseFloat(p.effect.split('+')[1])
    if (p.effect === 'master') rate *= 2
  })
  return Math.round(rate * 10) / 10
}

document.addEventListener('DOMContentLoaded', init)