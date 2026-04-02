import { loadState, saveState, calcOfflineGold } from './core/state.js'
import { collectOffline, claimDaily, updateMission, applyReward } from './core/economy.js'
import { openPack, toggleEquip } from './core/gacha.js'
import {
  generateEnemyPile,
  doAttack,
  calcWaveReward,
  advanceFloor,
  isBossWave,
  defeatBoss,
  gainKiniXP,
  gainAccountXP,
  calcInterval,
} from './core/combat.js'

// ── État global ──
let S = loadState()
let enemyPile = []
let fightInterval = null
let isPaused = false
let currentTab = 'combat'

// ── Initialisation ──
function init() {
  checkOfflineReward()
  initPile()
  startFighting()
  updateUI()
  setTab('combat')

  // Sauvegarde automatique toutes les 15 secondes
  setInterval(() => saveState(S), 15000)

  // Gains idle toutes les secondes
  setInterval(() => {
    const rate = calcIdleRate()
    if (rate > 0) {
      S.gold += rate
      document.getElementById('d-gold').textContent = Math.floor(S.gold)
    }
  }, 1000)
}

// ── Vérifie les gains offline au démarrage ──
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
  const msg = document.getElementById('offline-msg')
  if (!notif || !msg) return
  msg.textContent = `Bon retour ! Vous avez gagné ${earned} or hors-ligne.`
  notif.style.display = 'flex'
}

// ── Boucle de combat ──
function initPile() {
  enemyPile = generateEnemyPile(S)
  renderEnemyPile()
  updateWaveBar()
}

function startFighting() {
  clearInterval(fightInterval)
  const interval = calcInterval(S)
  fightInterval = setInterval(tick, interval)
}

function tick() {
  if (isPaused || enemyPile.every(p => p.flipped)) return

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

  addLog(`Vague terminée ! +${reward.gold} or`, 'reward')

  if (isBossWave(S)) {
    startBoss()
    return
  }

  advanceFloor(S)
  saveState(S)
  updateUI()
  setTimeout(() => {
    initPile()
    startFighting()
  }, 1000)
}

function startBoss() {
  isPaused = true
  addLog('Un BOSS apparaît !', 'boss')
  setTimeout(() => {
    isPaused = false
    initPile()
    startFighting()
  }, 1500)
}

// ── Actions utilisateur ──
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
  result.fusionLogs.forEach(f => addLog(f.message, 'reward'))
  saveState(S)
  updateUI()
  // Lance l'animation d'ouverture de pack
  if (window.playPackAnim) window.playPackAnim(result.obtained)
}

window.toggleEquipUI = function(pogId) {
  const maxSlots = S.talentsUnlocked.includes('t9') ? 11 : 10
  const result = toggleEquip(S, pogId, maxSlots)
  if (result.error) { addLog(result.error, 'miss'); return }
  saveState(S)
  updateUI()
}

window.claimDailyUI = function() {
  const reward = claimDaily(S)
  if (!reward) { addLog('Déjà réclamé aujourd\'hui !', 'miss'); return }
  addLog(`Récompense journalière réclamée !`, 'reward')
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
  currentTab = tab
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab)
  })
  document.querySelectorAll('.view').forEach(v => {
    v.style.display = v.dataset.view === tab ? '' : 'none'
  })
}

// ── Rendu ──
function updateUI() {
  document.getElementById('d-gold').textContent      = Math.floor(S.gold)
  document.getElementById('d-gems').textContent      = Math.floor(S.gems)
  document.getElementById('d-frags').textContent     = Math.floor(S.fragments)
  document.getElementById('d-tokens').textContent    = Math.floor(S.tokens)
  document.getElementById('wave-num').textContent    = S.currentFloor
  document.getElementById('world-name').textContent  = `Monde ${S.activeWorld}`

  if (window.renderHUD)        window.renderHUD(S)
  if (window.renderTeam)       window.renderTeam(S)
  if (window.renderKiniPanel)  window.renderKiniPanel(S)
  if (window.renderCollection) window.renderCollection(S)
  if (window.renderTalents)    window.renderTalents(S)
  if (window.renderDaily)      window.renderDaily(S)
  if (window.renderTower)      window.renderTower(S)
  if (window.renderPacks)      window.renderPacks(S)
}

function renderEnemyPile() {
  const pile = document.getElementById('enemy-pile')
  if (!pile) return
  const colors = ['#EEEDFE', '#E6F1FB', '#EAF3DE', '#FAEEDA', '#FBEAF0', '#FAECE7']
  pile.innerHTML = enemyPile.map(p => `
    <div class="pog-e${p.flipped ? ' flipped' : ''}" id="ep${p.id}"
      style="background:${p.flipped ? '#ddd' : colors[p.id % colors.length]}">
      ${p.id + 1}
    </div>
  `).join('')
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

  const msg = result.isCrit
    ? `★ CRITIQUE ! ${result.flipped} pog(s) retourné(s) !`
    : `${result.flipped} pog(s) retourné(s)`
  addLog(msg, result.isCrit ? 'crit' : 'flip')
}

function updateWaveBar() {
  const total = enemyPile.length
  const flipped = enemyPile.filter(p => p.flipped).length
  const pct = total > 0 ? Math.round(flipped / total * 100) : 0
  const bar = document.getElementById('wave-bar')
  const pctEl = document.getElementById('wave-pct')
  if (bar) bar.style.width = pct + '%'
  if (pctEl) pctEl.textContent = pct + '%'
}

function addLog(msg, cls) {
  const log = document.getElementById('log')
  if (!log) return
  const d = document.createElement('div')
  d.className = cls || ''
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

// ── Démarrage ──
document.addEventListener('DOMContentLoaded', init)