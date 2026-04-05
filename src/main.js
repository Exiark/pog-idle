import { loadState, saveState, calcOfflineGold } from './core/state.js'
import { collectOffline, claimDaily, updateMission, applyReward } from './core/economy.js'
import { openPack, toggleEquip } from './core/gacha.js'
import {
  generateEnemyPile, generateBotPogs, doAttack,
  calcWaveReward, advanceFloor, isBossWave, defeatBoss,
  gainAccountXP, calcInterval, calculateScores, simulateBattle,
  pogCombatStats, PHASE,
} from './core/combat.js'
import { WORLDS } from './data/worlds.js'
import { POGS, RARITY } from './data/pogs.js'
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
window._state    = S
window.saveState = saveState

// ── État de combat ──
let enemyPile     = []
let botPogs       = []
let fightInterval = null
let currentPhase  = PHASE.FLIPPING
let currentScores = null
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
// MACHINE À ÉTATS
// ══════════════════════════════

function startNewWave() {
  enemyPile     = generateEnemyPile(S)
  botPogs       = generateBotPogs(S)
  currentScores = null
  setPhase(PHASE.FLIPPING)
  renderPogStack()
  updateWaveBar()
}

function setPhase(phase) {
  currentPhase = phase

  document.getElementById('arena').style.display = 'none'
  document.getElementById('bilan-panel').classList.remove('visible')
  document.getElementById('battle-panel').classList.remove('visible')
  document.getElementById('result-panel').classList.remove('visible')

  const label = document.getElementById('phase-label')

  if (phase === PHASE.FLIPPING) {
    document.getElementById('arena').style.display = 'flex'
    if (label) label.textContent = 'Retournez le maximum de pogs !'
    clearInterval(fightInterval)
    fightInterval = setInterval(tickFlipping, calcInterval(S))

  } else if (phase === PHASE.CALCULATING) {
    if (label) label.textContent = ''
    clearInterval(fightInterval)
    renderBilanPanel()
    document.getElementById('bilan-panel').classList.add('visible')

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

// ── Phase 2 : Bilan ──
function renderBilanPanel() {
  const panel = document.getElementById('bilan-panel')
  if (!panel) return

  const flippedCount = enemyPile.filter(p => p.flipped).length
  const botFlipRate  = 0.4 + Math.random() * 0.3
  botPogs.forEach(p => { p.flipped = Math.random() < botFlipRate })

  currentScores = calculateScores(S, flippedCount, botPogs)
  const sc = currentScores

  const playerPower = sc.player.attack + sc.player.defense
  const botPower    = sc.bot.attack    + sc.bot.defense
  let advantageClass = 'even'
  let advantageText  = 'Forces équilibrées — tout peut arriver !'
  if (playerPower > botPower * 1.2) {
    advantageClass = 'player'
    advantageText  = 'Vous avez l\'avantage — bonne chance !'
  } else if (botPower > playerPower * 1.2) {
    advantageClass = 'bot'
    advantageText  = 'Le bot est plus fort — retournez plus de pogs !'
  }

  const playerPogCards = (sc.player.pogs || []).map(p => {
    const ri = RARITY[p.rarity] || RARITY['C']
    return `
      <div class="bilan-pog-card" style="background:${ri.bg};border-color:${ri.color};color:${ri.text}">
        <div class="bilan-pog-icon">${p.icon}</div>
        <div class="bilan-pog-name">${p.name}</div>
        <div class="bilan-pog-stats">Atk+${p.attack} Def+${p.defense}</div>
        <div class="bilan-pog-rarity" style="background:${ri.bg};color:${ri.text}">${ri.label}</div>
      </div>`
  }).join('')

  const botPogCircles = botPogs.filter(p => p.flipped).map(() =>
    `<div class="bilan-bot-pog">?</div>`
  ).join('')

  panel.innerHTML = `
    <div class="bilan-header">
      <div class="bilan-title">Bilan du retournement</div>
      <div class="bilan-sub">Vague ${S.currentFloor} · Monde ${S.activeWorld}</div>
    </div>

    <div class="bilan-vs">
      <div class="bilan-side player">
        <div class="bilan-side-label">Vos pogs retournés</div>
        <div class="bilan-count">${sc.player.count}</div>
        <div class="bilan-stats-row">
          <span>Atk <strong>${sc.player.attack}</strong></span>
          <span>Def <strong>${sc.player.defense}</strong></span>
          <span>HP <strong>${sc.player.hp}</strong></span>
        </div>
      </div>
      <div class="bilan-vs-sep">VS</div>
      <div class="bilan-side bot">
        <div class="bilan-side-label">Pogs du bot</div>
        <div class="bilan-count">${sc.bot.count}</div>
        <div class="bilan-stats-row">
          <span>Atk <strong>${sc.bot.attack}</strong></span>
          <span>Def <strong>${sc.bot.defense}</strong></span>
          <span>HP <strong>${sc.bot.hp}</strong></span>
        </div>
      </div>
    </div>

    <div class="bilan-advantage ${advantageClass}">${advantageText}</div>

    <div class="bilan-section">Vos pogs (face visible)</div>
    <div class="bilan-pog-grid">
      ${playerPogCards || `<div style="font-size:12px;color:var(--text-muted);padding:8px">
        Aucun pog retourné — équipez des pogs dans votre équipe !
      </div>`}
    </div>

    <div style="height:0.5px;background:var(--gray-border);margin:4px 0"></div>

    <div class="bilan-section">Pogs du bot (face cachée)</div>
    <div class="bilan-bot-grid">
      ${botPogCircles || `<div style="font-size:12px;color:var(--text-muted)">Aucun pog retourné</div>`}
    </div>

    <button id="launch-battle-btn" onclick="launchBattle()">⚔ Lancer le combat !</button>
  `
}

// ── Phase 3 : Combat ──
window.launchBattle = function() {
  if (!currentScores) return
  setPhase(PHASE.BATTLING)
  renderBattlePanel(currentScores)
  const result = simulateBattle(currentScores)
  animateBattle(result, currentScores)
}

function renderBattlePanel(scores) {
  const titleEl = document.getElementById('battle-title')
  const turnEl  = document.getElementById('battle-turn-label')
  const pHpEl   = document.getElementById('p-hp-val')
  const bHpEl   = document.getElementById('b-hp-val')
  const pBar    = document.getElementById('p-hp-bar')
  const bBar    = document.getElementById('b-hp-bar')
  const pAtk    = document.getElementById('p-atk-val')
  const pDef    = document.getElementById('p-def-val')
  const bAtk    = document.getElementById('b-atk-val')
  const bDef    = document.getElementById('b-def-val')
  const logEl   = document.getElementById('battle-log')

  if (titleEl) titleEl.textContent = 'Combat !'
  if (turnEl)  turnEl.textContent  = 'Tour 1 en cours...'
  if (pHpEl)   pHpEl.textContent   = scores.player.hp
  if (bHpEl)   bHpEl.textContent   = scores.bot.hp
  if (pBar)    pBar.style.width    = '100%'
  if (bBar)    bBar.style.width    = '100%'
  if (pAtk)    pAtk.textContent    = scores.player.attack
  if (pDef)    pDef.textContent    = scores.player.defense
  if (bAtk)    bAtk.textContent    = scores.bot.attack
  if (bDef)    bDef.textContent    = scores.bot.defense
  if (logEl)   logEl.innerHTML     = ''
}

function animateBattle(result, scores) {
  const pMaxHp    = scores.player.hp
  const bMaxHp    = scores.bot.hp
  const battleLog = document.getElementById('battle-log')
  let turn = 0

  const interval = setInterval(() => {
    if (turn >= result.turns.length) {
      clearInterval(interval)
      setTimeout(() => showResult(result, scores), 700)
      return
    }

    const t    = result.turns[turn]
    const pBar = document.getElementById('p-hp-bar')
    const bBar = document.getElementById('b-hp-bar')
    const pHp  = document.getElementById('p-hp-val')
    const bHp  = document.getElementById('b-hp-val')
    const turnEl = document.getElementById('battle-turn-label')

    if (pBar) pBar.style.width = Math.round(t.playerHp / pMaxHp * 100) + '%'
    if (bBar) bBar.style.width = Math.round(t.botHp    / bMaxHp * 100) + '%'
    if (pHp)  pHp.textContent  = Math.max(0, t.playerHp)
    if (bHp)  bHp.textContent  = Math.max(0, t.botHp)
    if (turnEl) turnEl.textContent = `Tour ${t.turn} / ${result.turns.length}`

    if (battleLog) {
      const turnDiv = document.createElement('div')
      turnDiv.className = 'battle-log-turn'
      turnDiv.innerHTML = `
        <div class="battle-log-turn-num">Tour ${t.turn}</div>
        <div class="battle-log-action player-atk${t.playerCrit ? ' crit' : ''}">
          ⚔ Vous infligez ${t.playerDmg} dégâts${t.playerCrit ? ' — CRITIQUE !' : ''}
        </div>
        <div class="battle-log-action bot-atk${t.botCrit ? ' crit' : ''}">
          🤖 Bot inflige ${t.botDmg} dégâts${t.botCrit ? ' — CRITIQUE !' : ''}
        </div>`
      battleLog.insertBefore(turnDiv, battleLog.firstChild)
    }

    turn++
  }, 450)
}

// ── Phase 4 : Résultat ──
function showResult(result, scores) {
  setPhase(PHASE.RESULT)

  const icon  = document.getElementById('result-icon')
  const title = document.getElementById('result-title')
  const sub   = document.getElementById('result-sub')
  const btn   = document.getElementById('result-btn')
  const extra = document.getElementById('result-extra')

  if (result.victory) {
    if (icon)  icon.textContent  = '🏆'
    if (title) title.textContent = 'Victoire !'
    if (sub)   sub.textContent   = ''

    const reward = calcWaveReward(S)
    applyReward(S, reward)
    gainAccountXP(S, reward.accountXP)
    updateMission(S, 'waves', 1)
    updateMission(S, 'gold_earned', reward.gold)

    if (extra) {
      extra.style.display = 'block'
      extra.innerHTML = `
        <div style="background:#EAF3DE;border-radius:8px;padding:8px 12px;
          font-size:12px;color:#173404;text-align:center;width:100%">
          +${reward.gold} or · +${reward.fragments} fragments · +${reward.accountXP} XP
        </div>`
    }

    if (btn) {
      btn.textContent = isBossWave(S) ? 'Affronter le boss !' : 'Vague suivante →'
      btn.onclick     = isBossWave(S) ? handleBossVictory : onVictoryNext
    }
    addLog(`Victoire ! +${reward.gold} or`, 'reward')

  } else {
    if (icon)  icon.textContent  = '💀'
    if (title) title.textContent = 'Défaite...'
    if (sub)   sub.textContent   = 'Retournez plus de pogs ou améliorez votre équipe !'

    if (extra) {
      extra.style.display = 'block'
      extra.innerHTML = `
        <div style="background:#FAECE7;border-radius:8px;padding:8px 12px;
          font-size:12px;color:#4A1B0C;text-align:center;width:100%">
          Conseil : équipez des pogs épiques ou légendaires dans vos slots
        </div>`
    }

    if (btn) {
      btn.textContent = 'Réessayer'
      btn.onclick     = onDefeatRetry
    }
    addLog('Défaite — réessayez !', 'miss')
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

function onDefeatRetry() { startNewWave() }

// ── Boss ──
function handleBoss() {
  bossActive = true
  const world = WORLDS[S.activeWorld - 1]
  bossMaxHP   = world.boss.hp
  bossHP      = bossMaxHP

  const nameEl  = document.getElementById('boss-name')
  const descEl  = document.getElementById('boss-desc')
  const hpText  = document.getElementById('boss-hp-text')
  const hpBar   = document.getElementById('boss-hp-bar-fill')
  const panel   = document.getElementById('boss-panel')
  const ball    = document.getElementById('kini-ball')

  if (nameEl)  nameEl.textContent     = world.boss.name
  if (descEl)  descEl.textContent     = world.boss.desc
  if (hpText)  hpText.textContent     = `${bossHP}/${bossMaxHP} PV`
  if (hpBar)   hpBar.style.width      = '100%'
  if (panel)   panel.classList.add('visible')
  if (ball)    ball.classList.add('boss-mode')

  addLog(`BOSS : ${world.boss.name} apparaît !`, 'boss')
}

function updateBossHP(flipped) {
  const dmg  = flipped * 3
  bossHP     = Math.max(0, bossHP - dmg)
  const pct  = Math.round(bossHP / bossMaxHP * 100)
  const hpBar  = document.getElementById('boss-hp-bar-fill')
  const hpText = document.getElementById('boss-hp-text')
  const panel  = document.getElementById('boss-panel')

  if (hpBar)  hpBar.style.width  = pct + '%'
  if (hpText) hpText.textContent = `${bossHP}/${bossMaxHP} PV`
  if (panel) {
    panel.classList.remove('shake')
    void panel.offsetWidth
    panel.classList.add('shake')
    setTimeout(() => panel.classList.remove('shake'), 400)
  }
}

function hideBossPanel() {
  bossActive = false
  const panel = document.getElementById('boss-panel')
  const ball  = document.getElementById('kini-ball')
  if (panel) panel.classList.remove('visible', 'shake')
  if (ball)  ball.classList.remove('boss-mode')
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

// ── Rendu pile cylindrique ──
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
  const maxVisible = 8

  if (remaining.length === 0) {
    html = `<div style="font-size:12px;color:var(--text-muted);padding:16px">Pile vide !</div>`
  } else {
    const top    = remaining[0]
    const topCol = colors[top.id % colors.length]
    html += `<div class="pog-top" id="ptop" style="background:${topCol};color:#26215C">Pog ${top.id + 1}</div>`

    remaining.slice(1, maxVisible).forEach(p => {
      const col = colors[p.id % colors.length]
      html += `<div class="pog-slice visible" style="background:${col}99"></div>`
    })

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

    if (bossActive) updateBossHP(result.flipped)

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
  const goldEl   = document.getElementById('d-gold')
  const gemsEl   = document.getElementById('d-gems')
  const fragsEl  = document.getElementById('d-frags')
  const tokensEl = document.getElementById('d-tokens')
  const waveEl   = document.getElementById('wave-num')
  const wnEl     = document.getElementById('world-name')

  if (goldEl)   goldEl.textContent   = Math.floor(S.gold)
  if (gemsEl)   gemsEl.textContent   = Math.floor(S.gems)
  if (fragsEl)  fragsEl.textContent  = Math.floor(S.fragments)
  if (tokensEl) tokensEl.textContent = Math.floor(S.tokens)
  if (waveEl)   waveEl.textContent   = S.currentFloor

  const worldNames = [
    'La Rue des Pogs','Les Abysses Froides','La Forge Volcanique',
    'Les Ruines Stellaires','Le Cosmos Brisé','L\'Olympe des Pogs','Le Néant Céleste',
  ]
  if (wnEl) wnEl.textContent = `Monde ${S.activeWorld} — ${worldNames[S.activeWorld - 1] || ''}`

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