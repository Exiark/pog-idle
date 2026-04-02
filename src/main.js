import { loadState, saveState, calcOfflineGold } from './core/state.js'
import { collectOffline, claimDaily, updateMission, applyReward } from './core/economy.js'
import { openPack, toggleEquip } from './core/gacha.js'
import {
  generateEnemyPile, generateBotPogs, doAttack,
  calcWaveReward, advanceFloor, isBossWave, defeatBoss,
  gainAccountXP, calcInterval, calculateScores, simulateBattle,
  PHASE,
} from './core/combat.js'
import { WORLDS } from './data/worlds.js'
import { KINIS }  from './data/kinis.js'

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
window._state    = S
window.saveState = saveState

// ── État de combat ──
let enemyPile    = []
let botPogs      = []
let fightInterval = null
let currentPhase  = PHASE.FLIPPING
let bossActive    = false
let bossHP        = 0
let bossMaxHP     = 0

// ── Init ──
function init() {
  checkOfflineReward()
  startNewWave()
  updateUI()
  setTab('combat')

  setInterval(() => saveState(S), 15000)
  setInterval(() => {
    let rate = 0
    S.equippedPogs.forEach(p => {
      if (!p?.effect) return
      if (p.effect.startsWith('idle+')) rate += parseFloat(p.effect.split('+')[1])
      if (p.effect === 'master') rate *= 2
    })
    if (rate > 0) {
      S.gold += Math.round(rate * 10) / 10
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

// ══════════════════════════════
// MACHINE À ÉTATS DU COMBAT
// ══════════════════════════════

function startNewWave() {
  enemyPile = generateEnemyPile(S)
  botPogs   = generateBotPogs(S)
  setPhase(PHASE.FLIPPING)
  renderPogStack()
  updateWaveBar()
}

function setPhase(phase) {
  currentPhase = phase
  const label  = document.getElementById('phase-label')

  // Cache tous les panels
  document.getElementById('battle-panel').classList.remove('visible')
  document.getElementById('result-panel').classList.remove('visible')
  document.getElementById('arena').style.display = 'flex'

  if (phase === PHASE.FLIPPING) {
    if (label) label.textContent = 'Retournement des pogs...'
    clearInterval(fightInterval)
    fightInterval = setInterval(tickFlipping, calcInterval(S))

  } else if (phase === PHASE.CALCULATING) {
    if (label) label.textContent = 'Calcul des scores...'
    clearInterval(fightInterval)
    document.getElementById('arena').style.display = 'none'
    setTimeout(startBattlePhase, 800)

  } else if (phase === PHASE.BATTLING) {
    if (label) label.textContent = 'Combat en cours !'
    document.getElementById('battle-panel').classList.add('visible')

  } else if (phase === PHASE.RESULT) {
    if (label) label.textContent = ''
    document.getElementById('result-panel').classList.add('visible')
  }
}

// ── Phase 1 : Retournement ──
function tickFlipping() {
  if (enemyPile.every(p => p.flipped)) {
    clearInterval(fightInterval)
    setTimeout(() => setPhase(PHASE.CALCULATING), 600)
    return
  }

  const result = doAttack(S, enemyPile)
  renderAttack(result)
  updateWaveBar()

  if (bossActive) updateBossHP(result.flipped)
}

// ── Phase 2 : Calcul ──
function startBattlePhase() {
  const playerFlipped = S.equippedPogs.filter(Boolean)
  const scores        = calculateScores(S, playerFlipped, botPogs)

  // Affiche les stats
  document.getElementById('p-count').textContent = scores.player.count
  document.getElementById('b-count').textContent = scores.bot.count
  document.getElementById('p-atk').textContent   = scores.player.attack
  document.getElementById('p-def').textContent   = scores.player.defense
  document.getElementById('b-atk').textContent   = scores.bot.attack
  document.getElementById('b-def').textContent   = scores.bot.defense
  document.getElementById('p-hp-bar').style.width = '100%'
  document.getElementById('b-hp-bar').style.width = '100%'
  document.getElementById('battle-log').innerHTML = ''

  setPhase(PHASE.BATTLING)

  // Simule le combat et l'anime
  const result = simulateBattle(scores)
  animateBattle(result, scores)
}

// ── Animation du combat ──
function animateBattle(result, scores) {
  const pMaxHp   = scores.player.hp
  const bMaxHp   = scores.bot.hp
  const battleLog = document.getElementById('battle-log')
  let turn = 0

  const interval = setInterval(() => {
    if (turn >= result.turns.length) {
      clearInterval(interval)
      setTimeout(() => showResult(result, scores), 600)
      return
    }

    const t = result.turns[turn]

    // Barre HP joueur
    const pPct = Math.round(t.playerHp / pMaxHp * 100)
    const bPct = Math.round(t.botHp    / bMaxHp * 100)
    document.getElementById('p-hp-bar').style.width = pPct + '%'
    document.getElementById('b-hp-bar').style.width = bPct + '%'

    // Log du tour
    const entry = document.createElement('div')
    entry.className = 'battle-log-entry' + (t.playerCrit || t.botCrit ? ' crit' : '')
    entry.textContent = `Tour ${t.turn} — Vous: -${t.botDmg}PV${t.botCrit ? ' (CRIT!)' : ''} · Bot: -${t.playerDmg}PV${t.playerCrit ? ' (CRIT!)' : ''}`
    battleLog.insertBefore(entry, battleLog.firstChild)

    turn++
  }, 400)
}

// ── Phase 4 : Résultat ──
function showResult(result, scores) {
  setPhase(PHASE.RESULT)

  const icon  = document.getElementById('result-icon')
  const title = document.getElementById('result-title')
  const sub   = document.getElementById('result-sub')
  const btn   = document.getElementById('result-btn')

  if (result.victory) {
    icon.textContent  = '🏆'
    title.textContent = 'Victoire !'

    const reward = calcWaveReward(S)
    applyReward(S, reward)
    gainAccountXP(S, reward.accountXP)
    updateMission(S, 'waves', 1)
    updateMission(S, 'gold_earned', reward.gold)

    sub.textContent  = `+${reward.gold} or · +${reward.fragments} fragments`
    btn.textContent  = isBossWave(S) ? 'Affronter le boss !' : 'Vague suivante'

    addLog(`Victoire ! +${reward.gold} or`, 'reward')

    if (isBossWave(S)) {
      btn.onclick = () => { handleBossVictory(); }
    } else {
      btn.onclick = () => { onVictoryNext() }
    }

  } else {
    icon.textContent  = '💀'
    title.textContent = 'Défaite...'
    sub.textContent   = 'Vos pogs n\'étaient pas assez forts. Retournez-en plus !'
    btn.textContent   = 'Réessayer'
    btn.onclick       = () => { onDefeatRetry() }
    addLog('Défaite — nouvel essai !', 'miss')
  }

  saveState(S)
  updateUI()
}

function onVictoryNext() {
  advanceFloor(S)
  saveState(S)
  updateUI()
  startNewWave()
}

function onDefeatRetry() {
  startNewWave()
}

window.onResultNext = function() {}

// ── Boss ──
function handleBoss() {
  bossActive = true
  const world = WORLDS[S.activeWorld - 1]
  bossMaxHP   = world.boss.hp
  bossHP      = bossMaxHP
  document.getElementById('boss-name').textContent        = world.boss.name
  document.getElementById('boss-desc').textContent        = world.boss.desc
  document.getElementById('boss-hp-text').textContent     = `${bossHP}/${bossMaxHP} PV`
  document.getElementById('boss-hp-bar-fill').style.width = '100%'
  document.getElementById('boss-panel').classList.add('visible')
  document.getElementById('kini-ball')?.classList.add('boss-mode')
  addLog(`BOSS : ${world.boss.name} apparaît !`, 'boss')
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

function hideBossPanel() {
  bossActive = false
  document.getElementById('boss-panel').classList.remove('visible', 'shake')
  document.getElementById('kini-ball')?.classList.remove('boss-mode')
}

function handleBossVictory() {
  hideBossPanel()
  const result = defeatBoss(S, S.activeWorld)
  if (result) addLog(`Boss vaincu ! Monde ${result.nextWorld} déverrouillé !`, 'reward')
  advanceFloor(S)
  saveState(S)
  updateUI()
  startNewWave()
}

// ── Rendu pile cylindrique option A ──
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

  if (remaining.length === 0) {
    html = `<div style="font-size:12px;color:var(--text-muted);padding:16px">Pile vide !</div>`
  } else {
    // Pog du dessus — même largeur que les autres, juste plus épais
    const top    = remaining[0]
    const topCol = colors[top.id % colors.length]
    html += `<div class="pog-top" id="ptop"
      style="background:${topCol};color:#26215C">
      Pog ${top.id + 1}
    </div>`

    // Tranches suivantes — MÊME LARGEUR (100px) = cylindre régulier
    const maxVisible = 8
    remaining.slice(1, maxVisible).forEach((p, i) => {
      const col = colors[p.id % colors.length]
      html += `<div class="pog-slice visible"
        style="background:${col}99;border-color:rgba(0,0,0,0.1)">
      </div>`
    })

    // Tranches cachées
    const hidden = Math.max(0, remaining.length - maxVisible)
    if (hidden > 0) {
      html += `<div class="pog-slice hidden-pog">+ ${hidden}</div>`
    }
  }

  stack.innerHTML = html

  if (counter) {
    counter.textContent = remaining.length > 0
      ? `${remaining.length} pog${remaining.length > 1 ? 's' : ''} restant${remaining.length > 1 ? 's' : ''}`
      : 'Pile retournée !'
  }

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

    const topEl = document.getElementById('ptop')
    if (topEl) {
      topEl.classList.add('hit')
      setTimeout(() => renderPogStack(), 420)
    } else {
      renderPogStack()
    }
  }, 180)

  addLog(
    result.isCrit ? `★ CRITIQUE ! ${result.flipped} pog(s) !` : `${result.flipped} pog(s) retourné(s)`,
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

// ── Actions window ──
window.selectKini = function(index) {
  S.selectedKini = index
  clearInterval(fightInterval)
  if (currentPhase === PHASE.FLIPPING) fightInterval = setInterval(tickFlipping, calcInterval(S))
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
  startNewWave()
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