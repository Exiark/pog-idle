import { loadState, saveState, calcOfflineGold } from './core/state.js'
import { collectOffline, claimDaily, updateMission, applyReward } from './core/economy.js'
import { openPack, toggleEquip } from './core/gacha.js'
import {
  generateEnemyPile, doAttack, calcWaveReward,
  advanceFloor, isBossWave, defeatBoss,
  gainKiniXP, gainAccountXP, calcInterval,
} from './core/combat.js'
import { WORLDS } from './data/worlds.js'
import { KINIS } from './data/kinis.js'

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
let bossActive = false
let bossHP = 0
let bossMaxHP = 0

window._state    = S
window.saveState = saveState

// ── Init ──
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
    const notif = document.getElementById('offline-notif')
    const msg   = document.getElementById('offline-msg')
    if (notif && msg) {
      msg.textContent     = `Bon retour ! +${earned} or gagnés hors-ligne.`
      notif.style.display = 'flex'
    }
  } else {
    S.lastSeen = Date.now()
  }
}

// ── Combat ──
function initPile() {
  enemyPile = generateEnemyPile(S)
  renderPogStack()
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

  if (result.done && !bossActive) {
    clearInterval(fightInterval)
    setTimeout(endWave, 800)
  }
  if (bossActive && bossHP <= 0) {
    clearInterval(fightInterval)
    setTimeout(handleBossDefeated, 500)
  }
}

function endWave() {
  const reward = calcWaveReward(S)
  applyReward(S, reward)
  gainAccountXP(S, reward.accountXP)
  updateMission(S, 'waves', 1)
  updateMission(S, 'gold_earned', reward.gold)
  addLog(`Vague ${S.currentFloor} terminée ! +${reward.gold} or`, 'reward')
  if (isBossWave(S)) { handleBoss(); return }
  advanceFloor(S)
  saveState(S)
  updateUI()
  setTimeout(() => { initPile(); startFighting() }, 1000)
}

// ── Boss ──
function handleBoss() {
  isPaused = false
  const world = WORLDS[S.activeWorld - 1]
  addLog(`BOSS : ${world.boss.name} apparaît !`, 'boss')
  showBossPanel(world)
}

function showBossPanel(world) {
  bossActive = true
  bossMaxHP  = world.boss.hp
  bossHP     = bossMaxHP
  document.getElementById('boss-name').textContent        = world.boss.name
  document.getElementById('boss-desc').textContent        = world.boss.desc
  document.getElementById('boss-hp-text').textContent     = `${bossHP}/${bossMaxHP} PV`
  document.getElementById('boss-hp-bar-fill').style.width = '100%'
  document.getElementById('boss-panel').classList.add('visible')
  document.getElementById('kini-ball')?.classList.add('boss-mode')
}

function hideBossPanel() {
  bossActive = false
  document.getElementById('boss-panel').classList.remove('visible', 'shake')
  document.getElementById('kini-ball')?.classList.remove('boss-mode')
}

function updateBossHP(flipped) {
  const dmg = flipped * 3
  bossHP = Math.max(0, bossHP - dmg)
  const pct = Math.round(bossHP / bossMaxHP * 100)
  document.getElementById('boss-hp-bar-fill').style.width = pct + '%'
  document.getElementById('boss-hp-text').textContent     = `${bossHP}/${bossMaxHP} PV`
  const panel = document.getElementById('boss-panel')
  panel.classList.remove('shake')
  void panel.offsetWidth
  panel.classList.add('shake')
  setTimeout(() => panel.classList.remove('shake'), 400)
}

function handleBossDefeated() {
  hideBossPanel()
  const result = defeatBoss(S, S.activeWorld)
  if (result) addLog(`Boss vaincu ! Monde ${result.nextWorld} déverrouillé !`, 'reward')
  isPaused = false
  saveState(S)
  updateUI()
  setTimeout(() => { initPile(); startFighting() }, 1000)
}

// ── Pile de pogs vue de côté ──
function renderPogStack() {
  const stack   = document.getElementById('pog-stack')
  const counter = document.getElementById('stack-counter')
  const wonZone = document.getElementById('pog-won-zone')
  const ball    = document.getElementById('kini-ball')
  const label   = document.getElementById('kini-label')
  if (!stack) return

  const remaining = enemyPile.filter(p => !p.flipped)
  const flipped   = enemyPile.filter(p => p.flipped)
  const colors    = ['#EEEDFE','#E6F1FB','#EAF3DE','#FAEEDA','#FBEAF0','#FAECE7']
  const k = KINIS[S.selectedKini] || KINIS[0]
  if (ball)  ball.textContent  = k.icon
  if (label) label.textContent = k.name

  let html = ''
  const maxVisible = 7

  if (remaining.length === 0) {
    html = `<div style="font-size:12px;color:var(--text-muted);padding:12px">Pile vide !</div>`
  } else {
    // Pog du dessus — coloré et visible
    const top    = remaining[0]
    const topCol = colors[top.id % colors.length]
    html += `
      <div class="pog-top" id="ptop"
        style="background:${topCol};color:#26215C">
        Pog ${top.id + 1}
      </div>`

    // Tranches des pogs suivants visibles
    remaining.slice(1, maxVisible).forEach((p, i) => {
      const w   = Math.max(60, 104 - i * 6)
      const col = colors[p.id % colors.length]
      html += `<div class="pog-slice visible" style="width:${w}px;background:${col}88"></div>`
    })

    // Tranches cachées
    const hiddenCount = Math.max(0, remaining.length - maxVisible)
    if (hiddenCount > 0) {
      for (let i = 0; i < Math.min(hiddenCount, 3); i++) {
        const w = Math.max(50, 68 - i * 6)
        html += `<div class="pog-slice hidden-pog" style="width:${w}px">
          ${i === 0 ? '+' + hiddenCount : ''}
        </div>`
      }
    }
  }

  stack.innerHTML = html

  if (counter) {
    counter.textContent = remaining.length > 0
      ? `${remaining.length} pog${remaining.length > 1 ? 's' : ''} restant${remaining.length > 1 ? 's' : ''}`
      : 'Pile retournée !'
  }

  // Zone gagnés
  if (wonZone) {
    const recent = flipped.slice(-5)
    wonZone.innerHTML = `
      <div id="pog-won-label">Gagnés (${flipped.length})</div>
      ${recent.map(p => {
        const col = colors[p.id % colors.length]
        return `<div class="won-pog" style="background:${col}">${p.id + 1}</div>`
      }).join('')}`
  }
}

// ── Rendu attaque ──
function renderAttack(result) {
  const ball = document.getElementById('kini-ball')
  if (!ball) return

  ball.classList.remove('throw', 'back')
  void ball.offsetWidth
  ball.classList.add('throw')

  setTimeout(() => {
    ball.classList.remove('throw')
    ball.classList.add('back')

    if (result.isCrit) {
      ball.classList.add('shake')
      setTimeout(() => ball.classList.remove('shake'), 300)
      showCritLabel()
    }

    if (bossActive) updateBossHP(result.flipped)

    // Anime le pog du dessus
    const topEl = document.getElementById('ptop')
    if (topEl) {
      topEl.classList.add('hit')
      setTimeout(() => renderPogStack(), 380)
    } else {
      renderPogStack()
    }
  }, 180)

  addLog(
    result.isCrit
      ? `★ CRITIQUE ! ${result.flipped} pog(s) retourné(s) !`
      : `${result.flipped} pog(s) retourné(s)`,
    result.isCrit ? 'crit' : 'flip'
  )
}

function showCritLabel() {
  const arena = document.getElementById('arena')
  if (!arena) return
  const label = document.createElement('div')
  label.className   = 'crit-label'
  label.textContent = '★ CRITIQUE !'
  label.style.left  = Math.random() * 40 + 30 + '%'
  label.style.top   = Math.random() * 30 + 10 + '%'
  arena.appendChild(label)
  setTimeout(() => label.remove(), 900)
}

function updateWaveBar() {
  const total   = enemyPile.length
  const flipped = enemyPile.filter(p => p.flipped).length
  const pct     = total > 0 ? Math.round(flipped / total * 100) : 0
  const bar     = document.getElementById('wave-bar')
  const pctEl   = document.getElementById('wave-pct')
  if (bar)   bar.style.width   = pct + '%'
  if (pctEl) pctEl.textContent = pct + '%'
}

function addLog(msg, cls) {
  const log = document.getElementById('log')
  if (!log) return
  const d = document.createElement('div')
  d.className = cls || ''; d.textContent = msg
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

// ── Actions window ──
window.selectKini = function(index) {
  S.selectedKini = index
  clearInterval(fightInterval)
  startFighting()
  saveState(S); updateUI()
}

window.openPackUI = function(type) {
  const result = openPack(S, type)
  if (result.error) { addLog(result.error, 'miss'); return }
  result.fusionLogs?.forEach(f => addLog(f.message, 'reward'))
  saveState(S); updateUI()
  if (window.playPackAnim) window.playPackAnim(result.obtained)
  if (window.setTab) window.setTab('packs')
}

window.toggleEquipUI = function(pogId) {
  const maxSlots = S.talentsUnlocked.includes('t9') ? 11 : 10
  const result   = toggleEquip(S, pogId, maxSlots)
  if (result.error) { addLog(result.error, 'miss'); return }
  saveState(S); updateUI()
}

window.claimDailyUI = function() {
  const reward = claimDaily(S)
  if (!reward) { addLog('Déjà réclamé aujourd\'hui !', 'miss'); return }
  addLog('Récompense journalière réclamée !', 'reward')
  saveState(S); updateUI()
}

window.collectOfflineUI = function(mult) {
  if (mult === 2 && S.gems < 5) { addLog('Pas assez de gemmes !', 'miss'); return }
  if (mult === 2) S.gems -= 5
  const earned = collectOffline(S, mult)
  addLog(`Gains offline : +${earned} or${mult === 2 ? ' (×2)' : ''}`, 'reward')
  document.getElementById('offline-notif').style.display = 'none'
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

document.addEventListener('worldChanged', () => {
  clearInterval(fightInterval)
  hideBossPanel()
  initPile()
  startFighting()
  updateUI()
})

// ── UI globale ──
function updateUI() {
  document.getElementById('d-gold').textContent   = Math.floor(S.gold)
  document.getElementById('d-gems').textContent   = Math.floor(S.gems)
  document.getElementById('d-frags').textContent  = Math.floor(S.fragments)
  document.getElementById('d-tokens').textContent = Math.floor(S.tokens)
  document.getElementById('wave-num').textContent = S.currentFloor

  const worldNames = [
    'La Rue des Pogs','Les Abysses Froides','La Forge Volcanique',
    'Les Ruines Stellaires','Le Cosmos Brisé','L\'Olympe des Pogs','Le Néant Céleste',
  ]
  const wn = document.getElementById('world-name')
  if (wn) wn.textContent = `Monde ${S.activeWorld} — ${worldNames[S.activeWorld - 1] || ''}`

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

document.addEventListener('DOMContentLoaded', init)