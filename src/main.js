import { loadState, saveState, calcOfflineGold } from './core/state.js'
import { collectOffline, claimDaily, updateMission, applyReward } from './core/economy.js'
import { openPack, toggleEquip } from './core/gacha.js'
import {
  buildPlayerTeam, buildEnemyTeam, simulateCombat,
  calcTeamBonuses, calcWaveReward, advanceFloor,
  isBossWave, defeatBoss, gainAccountXP, calcInterval,
  PHASE,
} from './core/combat.js'
import { WORLDS } from './data/worlds.js'
import { POGS, RARITY, CLASSES } from './data/pogs.js'
import { KINIS } from './data/kinis.js'

import './ui/hud.js'
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
let currentPhase   = PHASE.SELECTION
let playerTeam     = []
let enemyTeam      = []
let combatResult   = null
let combatBonuses  = {}
let combatInterval = null
let currentRound   = 0
let combatLog      = []

// ── Init ──
function init() {
  checkOfflineReward()
  setPhase(PHASE.SELECTION)
  updateUI()
  setTab('combat')

  setInterval(() => saveState(S), 15000)
  setInterval(() => {
    const bonuses = calcTeamBonuses(S)
    const rate    = bonuses.idle || 0
    if (rate > 0) {
      S.gold += rate
      const el = document.getElementById('d-gold')
      if (el) el.textContent = Math.floor(S.gold)
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

function setPhase(phase) {
  currentPhase = phase

  const selPanel    = document.getElementById('selection-panel')
  const combatPanel = document.getElementById('combat-panel')
  const resultPanel = document.getElementById('result-panel')
  const phaseLbl    = document.getElementById('phase-label')

  if (selPanel)    selPanel.style.display    = 'none'
  if (combatPanel) combatPanel.style.display = 'none'
  if (resultPanel) resultPanel.style.display = 'none'

  if (phase === PHASE.SELECTION) {
    if (selPanel) selPanel.style.display = 'block'
    if (phaseLbl) phaseLbl.textContent   = ''
    renderSelectionScreen()

  } else if (phase === PHASE.COMBAT) {
    if (combatPanel) combatPanel.style.display = 'block'
    if (phaseLbl)    phaseLbl.textContent      = 'Combat en cours !'
    startCombatAnimation()

  } else if (phase === PHASE.RESULT) {
    if (resultPanel) resultPanel.style.display = 'flex'
    if (phaseLbl)    phaseLbl.textContent      = ''
    renderResultScreen()
  }
}

// ══════════════════════════════
// PHASE 1 : SÉLECTION
// ══════════════════════════════

function renderSelectionScreen() {
  const panel = document.getElementById('selection-panel')
  if (!panel) return

  playerTeam    = buildPlayerTeam(S)
  enemyTeam     = buildEnemyTeam(S)
  combatBonuses = calcTeamBonuses(S)

  const worldNames = [
    'La Rue des Pogs','Les Abysses Froides','La Forge Volcanique',
    'Les Ruines Stellaires','Le Cosmos Brisé','L\'Olympe des Pogs','Le Néant Céleste',
  ]
  const world = WORLDS[S.activeWorld - 1]
  const isBoss = isBossWave(S)

  panel.innerHTML = `
    <div class="sel-world-banner" style="background:${world.colors.primary}22;border-color:${world.colors.primary}">
      <div class="sel-world-name">${worldNames[S.activeWorld - 1]}</div>
      <div class="sel-world-sub">
        ${isBoss ? '💀 BOSS — ' + world.boss.name : `Vague ${S.currentFloor} / 11`}
      </div>
    </div>

    <div class="sel-teams">

      <!-- Ton équipe -->
      <div class="sel-team-block">
        <div class="sel-team-label">Ton équipe</div>
        <div class="sel-team-grid" id="player-team-grid">
          ${renderTeamGrid(playerTeam, false)}
        </div>
        ${playerTeam.length === 0 ? `
          <div class="sel-empty-team">
            Équipe vide ! Va dans l'onglet 🎴 Pogs pour équiper des champions.
          </div>` : ''}
      </div>

      <div class="sel-vs">VS</div>

      <!-- Équipe ennemie -->
      <div class="sel-team-block">
        <div class="sel-team-label">Adversaire</div>
        <div class="sel-team-grid">
          ${renderTeamGrid(enemyTeam, true)}
        </div>
      </div>

    </div>

    <!-- Bonus actifs -->
    <div class="sel-bonuses">
      ${renderBonusPills(combatBonuses)}
    </div>

    <!-- Bouton combat -->
    <button
      id="combat-btn"
      class="sel-combat-btn${playerTeam.length === 0 ? ' disabled' : ''}"
      onclick="startCombat()"
      ${playerTeam.length === 0 ? 'disabled' : ''}>
      ⚔ COMBAT !
    </button>
  `
}

function renderTeamGrid(team, isEnemy) {
  if (team.length === 0) return ''
  return team.map(p => {
    const ri  = RARITY[p.rarity]
    const cls = CLASSES[p.cls]
    return `
      <div class="champ-card${isEnemy ? ' enemy' : ''}"
        style="background:${ri.bg};border-color:${ri.color}">
        <div class="champ-icon" style="color:${ri.text}">${p.icon}</div>
        <div class="champ-name" style="color:${ri.text}">${p.name}</div>
        <div class="champ-class" style="background:${cls.color}22;color:${cls.color}">
          ${cls.icon} ${cls.label}
        </div>
        <div class="champ-stats">
          <span>❤ ${p.currentHp || p.hp}</span>
          <span>⚔ ${p.currentAtk || p.atk}</span>
          <span>🛡 ${p.currentDef || p.def}</span>
        </div>
      </div>`
  }).join('')
}

function renderBonusPills(bonuses) {
  const pills = []
  if (bonuses.atk  > 0) pills.push(`<span class="bonus-pill atk">⚔ ATK +${Math.round(bonuses.atk * 100)}%</span>`)
  if (bonuses.def  > 0) pills.push(`<span class="bonus-pill def">🛡 DEF +${Math.round(bonuses.def * 100)}%</span>`)
  if (bonuses.crit > 0) pills.push(`<span class="bonus-pill crit">★ Crit ${Math.round(bonuses.crit * 100)}%</span>`)
  if (bonuses.gold > 0) pills.push(`<span class="bonus-pill gold">G Or +${Math.round(bonuses.gold * 100)}%</span>`)
  if (bonuses.idle > 0) pills.push(`<span class="bonus-pill idle">⏱ Idle +${bonuses.idle}/s</span>`)
  return pills.length
    ? `<div class="bonus-pills-wrap">${pills.join('')}</div>`
    : '<div class="bonus-pills-wrap" style="color:var(--text-muted);font-size:11px">Équipez des pogs pour activer des bonus !</div>'
}

window.startCombat = function() {
  if (playerTeam.length === 0) return
  combatResult = simulateCombat(playerTeam, enemyTeam, combatBonuses)
  combatLog    = combatResult.log
  currentRound = 0
  setPhase(PHASE.COMBAT)
}

// ══════════════════════════════
// PHASE 2 : COMBAT ANIMÉ
// ══════════════════════════════

function startCombatAnimation() {
  renderCombatPanel()
  clearInterval(combatInterval)
  combatInterval = setInterval(animateNextRound, 600)
}

function renderCombatPanel() {
  const panel = document.getElementById('combat-panel')
  if (!panel) return

  panel.innerHTML = `
    <div class="combat-arena">
      <!-- Équipe joueur (gauche) -->
      <div class="combat-side player-side" id="combat-player-side">
        ${renderCombatSide(playerTeam, false)}
      </div>

      <!-- Centre -->
      <div class="combat-center">
        <div class="combat-round-label" id="combat-round">Round 1</div>
        <div class="combat-vs-icon">⚔</div>
      </div>

      <!-- Équipe ennemie (droite) -->
      <div class="combat-side enemy-side" id="combat-enemy-side">
        ${renderCombatSide(enemyTeam, true)}
      </div>
    </div>

    <!-- Log de combat -->
    <div class="combat-log" id="combat-log"></div>
  `
}

function renderCombatSide(team, isEnemy) {
  return team.map(p => `
    <div class="combat-fighter${isEnemy ? ' enemy' : ''}" id="cf_${p.id}">
      <div class="cf-icon">${p.icon}</div>
      <div class="cf-name">${p.name}</div>
      <div class="cf-hp-bar">
        <div class="cf-hp-fill${isEnemy ? ' enemy' : ''}" id="cfhp_${p.id}" style="width:100%"></div>
      </div>
      <div class="cf-hp-text" id="cfhpt_${p.id}">${p.currentHp}/${p.maxHp}</div>
    </div>`
  ).join('')
}

function animateNextRound() {
  if (currentRound >= combatLog.length) {
    clearInterval(combatInterval)
    setTimeout(() => setPhase(PHASE.RESULT), 800)
    return
  }

  const round = combatLog[currentRound]
  const roundEl = document.getElementById('combat-round')
  if (roundEl) roundEl.textContent = `Round ${round.round}`

  const logEl = document.getElementById('combat-log')

  round.actions.forEach(action => {
    // Anime la barre HP de la cible
    const hpBar  = document.getElementById('cfhp_' + action.targetId)
    const hpText = document.getElementById('cfhpt_' + action.targetId)
    if (hpBar) {
      const pct = Math.round(action.targetHp / action.targetMaxHp * 100)
      hpBar.style.width = pct + '%'
    }
    if (hpText) hpText.textContent = `${action.targetHp}/${action.targetMaxHp}`

    // KO
    if (action.targetDead) {
      const fighter = document.getElementById('cf_' + action.targetId)
      if (fighter) fighter.classList.add('ko')
    }

    // Log
    if (logEl) {
      const entry = document.createElement('div')
      entry.className = `log-action ${action.attackerSide}${action.isCrit ? ' crit' : ''}`
      entry.textContent = action.attackerSide === 'player'
        ? `⚔ ${action.attackerName} inflige ${action.damage}${action.isCrit ? ' CRIT!' : ''} à ${action.targetName}${action.targetDead ? ' — KO!' : ''}`
        : `🤖 ${action.attackerName} inflige ${action.damage}${action.isCrit ? ' CRIT!' : ''} à ${action.targetName}${action.targetDead ? ' — KO!' : ''}`
      logEl.insertBefore(entry, logEl.firstChild)
      while (logEl.children.length > 8) logEl.removeChild(logEl.lastChild)
    }
  })

  currentRound++
}

// ══════════════════════════════
// PHASE 3 : RÉSULTAT
// ══════════════════════════════

function renderResultScreen() {
  if (!combatResult) return
  const panel  = document.getElementById('result-panel')
  if (!panel) return

  const victory = combatResult.victory
  const reward  = calcWaveReward(S, combatBonuses)

  if (victory) {
    applyReward(S, reward)
    gainAccountXP(S, reward.accountXP)
    updateMission(S, 'waves', 1)
    updateMission(S, 'gold_earned', reward.gold)
  }

  const isBoss = isBossWave(S)

  panel.innerHTML = `
    <div class="result-icon">${victory ? '🏆' : '💀'}</div>
    <div class="result-title">${victory ? 'VICTOIRE !' : 'DÉFAITE...'}</div>
    <div class="result-sub">${victory
      ? `Vague ${S.currentFloor} terminée en ${combatResult.rounds} rounds`
      : 'Ton équipe n\'était pas assez forte'}</div>

    ${victory ? `
      <div class="result-rewards">
        <div class="result-rewards-title">Récompenses</div>
        <div class="result-rewards-grid">
          <div class="result-reward-item">
            <div class="reward-icon gold-icon">G</div>
            <div class="reward-val">+${reward.gold}</div>
            <div class="reward-label">or</div>
          </div>
          <div class="result-reward-item">
            <div class="reward-icon frag-icon">F</div>
            <div class="reward-val">+${reward.fragments}</div>
            <div class="reward-label">fragments</div>
          </div>
          <div class="result-reward-item">
            <div class="reward-icon xp-icon">XP</div>
            <div class="reward-val">+${reward.accountXP}</div>
            <div class="reward-label">XP compte</div>
          </div>
          ${reward.gems > 0 ? `
          <div class="result-reward-item">
            <div class="reward-icon gem-icon">★</div>
            <div class="reward-val">+${reward.gems}</div>
            <div class="reward-label">gemmes</div>
          </div>` : ''}
        </div>
      </div>

      <!-- Bonus passifs qui ont contribué -->
      <div class="result-passives">
        ${renderPassiveSummary()}
      </div>
    ` : `
      <div class="result-advice">
        <div class="result-advice-title">Conseils</div>
        <div class="result-advice-text">
          ${playerTeam.length < 3 ? '→ Équipe trop petite — équipez plus de champions' : ''}
          ${playerTeam.length >= 3 && !playerTeam.some(p => ['E','L','M'].includes(p.rarity)) ? '→ Vos champions sont trop faibles — ouvrez des packs pour des épiques+' : ''}
          ${playerTeam.length >= 3 ? '→ Essayez d\'équiper un Tank pour absorber les dégâts' : ''}
        </div>
      </div>
    `}

    <div class="result-actions">
      ${victory && isBoss ? `
        <button class="result-btn boss-btn" onclick="onBossVictory()">Affronter le boss !</button>
      ` : victory ? `
        <button class="result-btn primary-btn" onclick="onVictoryNext()">Vague suivante →</button>
      ` : `
        <button class="result-btn retry-btn" onclick="onRetry()">Réessayer</button>
        <button class="result-btn secondary-btn" onclick="setTab('pogs')">Améliorer l'équipe 🎴</button>
      `}
    </div>
  `

  saveState(S)
  updateUI()
}

function renderPassiveSummary() {
  const actives = getEquippedPogs(S).filter(p => p?.passive).map(p => {
    const pog = POGS.find(x => x.id === p.id)
    if (!pog) return null
    const ri = RARITY[pog.rarity]
    return `<span class="passive-tag" style="background:${ri.bg};color:${ri.text};border-color:${ri.color}">
      ${pog.icon} ${pog.name} — ${pog.desc}
    </span>`
  }).filter(Boolean)

  if (!actives.length) return ''
  return `
    <div class="passives-label">Bonus passifs actifs</div>
    <div class="passives-list">${actives.join('')}</div>`
}

// ── Actions résultat ──
window.onVictoryNext = function() {
  advanceFloor(S)
  saveState(S)
  updateUI()
  setPhase(PHASE.SELECTION)
}

window.onRetry = function() {
  setPhase(PHASE.SELECTION)
}

window.onBossVictory = function() {
  const result = defeatBoss(S, S.activeWorld)
  if (result) addLog(`Boss vaincu ! Monde ${result.nextWorld} déverrouillé !`, 'reward')
  advanceFloor(S)
  saveState(S)
  updateUI()
  setPhase(PHASE.SELECTION)
}

// ── Actions ──
window.selectKini = function(index) {
  S.selectedKini = index
  saveState(S); updateUI()
  if (currentPhase === PHASE.SELECTION) renderSelectionScreen()
}

window.toggleEquipUI = function(pogId) {
  const maxSlots = S.talentsUnlocked.includes('t9') ? 11 : 10
  const result   = toggleEquip(S, pogId, maxSlots)
  if (result.error) { addLog(result.error, 'miss'); return }
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

window.claimDailyUI = function() {
  const reward = claimDaily(S)
  if (!reward) { addLog('Déjà réclamé !', 'miss'); return }
  addLog('Récompense journalière réclamée !', 'reward')
  saveState(S); updateUI()
}

window.collectOfflineUI = function(mult) {
  if (mult === 2 && S.gems < 5) { addLog('Pas assez de gemmes !', 'miss'); return }
  if (mult === 2) S.gems -= 5
  const earned = collectOffline(S, mult)
  addLog(`Gains offline : +${earned} or${mult === 2 ? ' (×2)' : ''}`, 'reward')
  const el = document.getElementById('offline-notif')
  if (el) el.style.display = 'none'
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

function addLog(msg, cls) {
  console.log(`[${cls || 'info'}] ${msg}`)
}

function getEquippedPogs(state) {
  return state.equippedPogs.filter(Boolean)
}

// ── UI globale ──
function updateUI() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
  set('d-gold',   Math.floor(S.gold))
  set('d-gems',   Math.floor(S.gems))
  set('d-frags',  Math.floor(S.fragments))
  set('d-tokens', Math.floor(S.tokens))
  set('wave-num', S.currentFloor)

  const worldNames = [
    'La Rue des Pogs','Les Abysses Froides','La Forge Volcanique',
    'Les Ruines Stellaires','Le Cosmos Brisé','L\'Olympe des Pogs','Le Néant Céleste',
  ]
  set('world-name', `Monde ${S.activeWorld} — ${worldNames[S.activeWorld - 1] || ''}`)

  window._state = S
  if (window.renderHUD)        window.renderHUD(S)
  if (window.renderKiniPanel)  window.renderKiniPanel(S)
  if (window.renderCollection) window.renderCollection(S)
  if (window.renderTalents)    window.renderTalents(S)
  if (window.renderDaily)      window.renderDaily(S)
  if (window.renderTower)      window.renderTower(S)
  if (window.renderPacks)      window.renderPacks(S)
}

document.addEventListener('worldChanged', () => {
  setPhase(PHASE.SELECTION)
  updateUI()
})

document.addEventListener('DOMContentLoaded', init)