import { loadState, saveState, calcOfflineCapsules, calcIdleRate } from './core/state.js'
import { collectOffline, claimDaily, claimMission, updateMission, applyReward, checkMissionsReset, recycleSurvivor } from './core/economy.js'
import { openSignal, toggleTeam } from './core/gacha.js'
import {
  generateEnemySquad, simulateFight, survivorCombatStats,
  calcWaveReward, advanceWave, isBossWave, defeatBoss,
  gainAccountXP, doPrestige, PHASE,
} from './core/combat.js'
import { ZONES } from './data/zones.js'
import { SURVIVORS } from './data/survivors.js'
import { getNarration, markNarrationShown } from './data/narration.js'
import { ACHIEVEMENTS, checkAchievements } from './data/achievements.js'

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
window._state             = S
window.saveState          = saveState
window._SURVIVORS         = SURVIVORS
window.getNarration       = getNarration
window.markNarrationShown = markNarrationShown

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

const ONBOARDING_STEPS = [
  {
    tab:     'survivors',
    title:   'Vos premiers survivants',
    body:    'Trois rescapés viennent de rejoindre votre abri. Ajoutez-les à votre équipe en appuyant sur leurs cartes.',
    arrow:   'tab-survivors',
    btnText: 'Voir l\'équipe →',
    action:  () => setTab('survivors'),
  },
  {
    tab:     'combat',
    title:   'Première mission',
    body:    'Votre équipe est prête. Allez dans Exploration et lancez votre première mission contre les zombies.',
    arrow:   'tab-combat',
    btnText: 'Partir en mission →',
    action:  () => setTab('combat'),
  },
  {
    tab:     'packs',
    title:   'Renforcez-vous',
    body:    'Après chaque victoire, vous gagnez des capsules. Utilisez-les à la Tour Radio pour recruter de nouveaux survivants.',
    arrow:   'tab-packs',
    btnText: 'Compris !',
    action:  null,
  },
]

let _onboardingStep = 0

function showOnboardingMessage() {
  _onboardingStep = 0
  showOnboardingStep()
}

function showOnboardingStep() {
  document.getElementById('onboarding-overlay')?.remove()
  const step = ONBOARDING_STEPS[_onboardingStep]
  if (!step) return

  const overlay = document.createElement('div')
  overlay.id = 'onboarding-overlay'

  // Trouver la position de l'onglet cible pour la flèche
  const targetTab = document.querySelector(`.tab[data-tab="${step.tab}"]`)
  const rect = targetTab?.getBoundingClientRect()

  overlay.innerHTML = `
    <div class="ob-backdrop"></div>
    <div class="ob-box">
      <div class="ob-step">${_onboardingStep + 1} / ${ONBOARDING_STEPS.length}</div>
      <div class="ob-title">☣ ${step.title}</div>
      <div class="ob-body">${step.body}</div>
      <div class="ob-actions">
        ${_onboardingStep > 0 ? `<button class="ob-skip" onclick="window._dismissOnboarding()">Passer</button>` : ''}
        <button class="ob-btn" onclick="window._nextOnboardingStep()">${step.btnText}</button>
      </div>
    </div>
    ${rect ? `<div class="ob-arrow" style="left:${Math.round(rect.left + rect.width / 2)}px;top:${Math.round(rect.bottom + 6)}px"></div>` : ''}
    ${targetTab ? `<div class="ob-highlight" style="left:${Math.round(rect.left - 3)}px;top:${Math.round(rect.top - 3)}px;width:${Math.round(rect.width + 6)}px;height:${Math.round(rect.height + 6)}px"></div>` : ''}
  `
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('visible'))
}

window._nextOnboardingStep = function() {
  const step = ONBOARDING_STEPS[_onboardingStep]
  if (step?.action) step.action()
  _onboardingStep++
  if (_onboardingStep >= ONBOARDING_STEPS.length) {
    window._dismissOnboarding()
  } else {
    setTimeout(showOnboardingStep, 400)
  }
}

window._dismissOnboarding = function() {
  const overlay = document.getElementById('onboarding-overlay')
  if (overlay) {
    overlay.classList.remove('visible')
    setTimeout(() => overlay.remove(), 300)
  }
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
  showPanel('combat-panel')

  const result = simulateFight(team.map(t => t.id), enemySquad, S)
  lastResult   = result
  window._isBossWave = isBossWave(S)

  // Utilise le playerTeam de la simulation (stats upgradées + HP mutés) pour l'animation
  if (window.renderCombatPanel) {
    window.renderCombatPanel(S, result.playerTeam, result.enemyTeam, result, onCombatDone)
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
window.showNarration = showNarration

function onCombatDone() {
  if (currentPhase !== PHASE.FIGHTING) return  // garde contre double-appel
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

  // Incrément statistiques
  if (!S.stats) S.stats = {}
  if (lastResult.victory) {
    S.stats.totalWaves    = (S.stats.totalWaves    || 0) + 1
    S.stats.totalCapsules = (S.stats.totalCapsules || 0) + (reward?.capsules || 0)
  }
  S.stats.totalKills = (S.stats.totalKills || 0) + (lastResult.killCount || 0)

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
      playLevelUpSound()
      const narrLvl = getNarration('first_levelup', S)
      if (narrLvl) { markNarrationShown('first_levelup', S); showNarration(narrLvl, () => {}) }
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
  clearLog()
  renderCombatView()
  updateUI()
}

function onDefeatRetry() {
  currentPhase = PHASE.IDLE
  clearLog()
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

  // Narration premier boss
  const narrBoss = getNarration('first_boss', S)
  if (narrBoss) {
    markNarrationShown('first_boss', S)
    showNarration(narrBoss, () => showBossVictoryScreen(result))
  } else {
    showBossVictoryScreen(result)
  }
  advanceWave(S)
  saveState(S)
}

function showBossVictoryScreen(defeatResult) {
  const panel = document.getElementById('result-panel')
  if (!panel) return

  const zone        = ZONES[S.activeZone - 1] || ZONES[0]
  const bossName    = zone.boss?.name || 'Boss'
  const bossDesc    = zone.boss?.desc || ''
  const nextZone    = defeatResult?.nextZone
  const nextZoneData = nextZone ? ZONES[nextZone - 1] : null

  // Survivant boss recruté dans cette zone
  const bossRewardId = zone.boss?.reward?.survivor
  const bossRecrut   = bossRewardId ? SURVIVORS.find(x => x.id === bossRewardId) : null
  const isNewRecrut  = defeatResult && bossRecrut && S.zoneSurvivors?.includes(bossRewardId)

  panel.innerHTML = `
    <div class="boss-victory-screen">
      <div class="bvs-flash"></div>
      <div class="bvs-skull">☠</div>
      <div class="bvs-title">Boss éliminé !</div>
      <div class="bvs-name" style="color:${zone.colors.primary}">${bossName}</div>
      <div class="bvs-desc">${bossDesc}</div>

      <div class="bvs-rewards">
        ${bossRecrut ? `
          <div class="bvs-survivor-card" style="border-color:${zone.colors.primary}">
            <div class="bvs-survivor-badge">${isNewRecrut ? 'RECRUTÉ' : 'DÉJÀ POSSÉDÉ'}</div>
            <div class="bvs-survivor-name">${bossRecrut.name}</div>
            <div class="bvs-survivor-role">${bossRecrut.role}</div>
          </div>` : ''}

        ${nextZoneData ? `
          <div class="bvs-unlock-card" style="border-color:${nextZoneData.colors.primary}44">
            <div class="bvs-unlock-label">🔓 Zone déverrouillée</div>
            <div class="bvs-unlock-zone" style="color:${nextZoneData.colors.primary}">Zone ${nextZone} — ${nextZoneData.name}</div>
            <div class="bvs-unlock-desc">${nextZoneData.desc}</div>
          </div>` : `
          <div class="bvs-unlock-card" style="border-color:#C03030">
            <div class="bvs-unlock-label" style="color:#E05A5A">🌍 Toutes les zones sécurisées !</div>
            <div class="bvs-unlock-desc">Le monde peut enfin respirer. Lancez un Prestige pour recommencer plus fort.</div>
          </div>`}
      </div>

      <button class="btn-danger result-btn" onclick="window._onBossVictoryContinue()">
        ${nextZoneData ? `⚔ Explorer Zone ${nextZone}` : '☣ Lancer un Prestige'}
      </button>
    </div>
  `

  playVictorySound()
  // Flash d'effet spectaculaire
  setTimeout(() => { panel.querySelector('.bvs-flash')?.classList.add('bvs-flash--active') }, 100)
  showPanel('result-panel')

  window._onBossVictoryContinue = function() {
    currentPhase = PHASE.IDLE
    clearLog()
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

function clearLog() {
  const log = document.getElementById('log')
  if (log) log.innerHTML = ''
}

// ── Actions window ──
window.openSignalUI = function(type) {
  const result = openSignal(S, type)
  if (result.error) { addLog(result.error, 'miss'); return }
  result.fusionLogs?.forEach(f => {
    addLog(f.message, 'reward')
    showToast(`🔬 FUSION ! <strong>${f.from.name}</strong> ×3 → <strong>${f.to.name}</strong>`, 'fusion', 4000)
  })
  if (!S.stats) S.stats = {}
  S.stats.totalSignals  = (S.stats.totalSignals  || 0) + 1
  S.stats.totalFusions  = (S.stats.totalFusions  || 0) + (result.fusionLogs?.length || 0)
  saveState(S); updateUI()

  // Narration premier Expert / Légendaire (après la fermeture du gacha)
  const hasNewL = result.newIds?.some(id => {
    const sv = SURVIVORS.find(x => x.id === id); return sv?.rarity === 'L'
  })
  const hasNewE = result.newIds?.some(id => {
    const sv = SURVIVORS.find(x => x.id === id); return sv?.rarity === 'E'
  })
  const pendingNarr = hasNewL ? 'first_legendary' : hasNewE ? 'first_expert' : null
  if (pendingNarr) window._pendingGachaNarr = pendingNarr

  if (window.playPackAnim) window.playPackAnim(result.obtained, result.newIds || [])
  if (window.setTab) window.setTab('packs')
}

window.toggleTeamUI = function(survivorId) {
  const result = toggleTeam(S, survivorId)
  if (result.error) { addLog(result.error, 'miss'); return }
  saveState(S); updateUI()
}

window.autoTeamUI = function() {
  // Compose la meilleure équipe (max 6) depuis la collection
  const TANK_ROLES    = ['Bouclier', 'Blindé']
  const HEALER_ROLES  = ['Médic', 'Biologiste']
  const DPS_ROLES     = ['Berserk', 'Lame', 'Ombre', 'Pistard', 'Tireur', 'Artificier']
  const SUPP_ROLES    = ['Tacticien', 'Ingénieur']

  // Unique survivants de la collection, triés par score (rareté + upgrade)
  const seen = new Set()
  const RARITY_W = { L: 100, E: 30, D: 5 }
  const roster = S.collection
    .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
    .map(p => {
      const sv = SURVIVORS.find(x => x.id === p.id)
      if (!sv || sv.boss) return null
      const upLevel = (S.survivorUpgrades || {})[p.id] || 0
      const score   = (RARITY_W[sv.rarity] || 0) + upLevel * 10 + sv.atk * 0.1
      return { id: p.id, sv, score }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)

  // Sélection rôle-consciente
  const pick   = []
  const pickId = new Set()
  const tryPick = (roles, max = 1) => {
    let picked = 0
    for (const r of roster) {
      if (pick.length >= 6) break
      if (picked >= max) break
      if (pickId.has(r.id)) continue
      if (roles.includes(r.sv.role)) { pick.push(r); pickId.add(r.id); picked++ }
    }
  }
  tryPick(TANK_ROLES,   1)
  tryPick(HEALER_ROLES, 1)
  tryPick(DPS_ROLES,    3)
  tryPick(SUPP_ROLES,   1)
  // Compléter avec les meilleurs restants
  for (const r of roster) {
    if (pick.length >= 6) break
    if (!pickId.has(r.id)) { pick.push(r); pickId.add(r.id) }
  }

  S.team = pick.map(r => ({ id: r.id, rarity: r.sv.rarity }))
  saveState(S); updateUI()
  showToast(`⚡ Équipe optimale composée (${pick.length} survivants)`, 'levelup', 2500)
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

window.recycleSurvivorUI = function(survivorId, stacks) {
  const result = recycleSurvivor(S, survivorId, stacks)
  if (result.error) { showToast(result.error, 'info'); return }
  showToast(`♻ ${result.survivorName} ×${result.stacks * 3} → +${result.dna} 🧬 ADN`, 'fusion', 3000)
  playRecycleSound()
  saveState(S); updateUI()
  const narrR = getNarration('first_recycle', S)
  if (narrR) { markNarrationShown('first_recycle', S); showNarration(narrR, () => {}) }
  if (window.showSurvivorModal) window.showSurvivorModal(survivorId)
}

window.confirmRecycleAll = function(survivorId, stacks, totalDna) {
  // Mini-modale de confirmation inline dans la survivor-modal
  const existing = document.getElementById('recycle-confirm-box')
  if (existing) { existing.remove(); return }

  const box = document.createElement('div')
  box.id = 'recycle-confirm-box'
  box.className = 'recycle-confirm-box'
  box.innerHTML = `
    <div class="recycle-confirm-text">Recycler ×${stacks * 3} copies → +${totalDna} 🧬 ?<br><span style="font-size:10px;color:var(--text-muted)">Action irréversible</span></div>
    <div class="recycle-confirm-btns">
      <button class="rcb-cancel" onclick="document.getElementById('recycle-confirm-box')?.remove()">Annuler</button>
      <button class="rcb-ok" onclick="document.getElementById('recycle-confirm-box')?.remove();window.recycleSurvivorUI('${survivorId}',${stacks})">Confirmer</button>
    </div>`

  const modalBody = document.querySelector('.sv-modal-recycle')
  if (modalBody) modalBody.appendChild(box)
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

window.claimAllMissionsUI = function() {
  const claimable = (S.missions || []).filter(m => m.done && !m.claimed)
  if (!claimable.length) return
  let totCaps = 0, totDna = 0, totRad = 0
  claimable.forEach(m => {
    const reward = claimMission(S, m.id)
    if (reward) {
      totCaps += reward.capsules || 0
      totDna  += reward.dna     || 0
      totRad  += reward.radium  || 0
    }
  })
  const parts = []
  if (totCaps) parts.push(`+${totCaps}💊`)
  if (totDna)  parts.push(`+${totDna}🧬`)
  if (totRad)  parts.push(`+${totRad}☢`)
  showToast(`📋 ${claimable.length} missions réclamées ! ${parts.join(' ')}`, 'levelup', 3500)
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
  const nextLevel  = (S.prestigeLevel || 0) + 1
  const idleBonus  = nextLevel * 10
  const collSize   = [...new Set(S.collection.map(p => p.id))].length
  const teamCount  = S.team.filter(Boolean).length

  modal.innerHTML = `
    <div class="prestige-box">
      <div class="prestige-title">☣ PRESTIGE ${nextLevel}</div>
      <div class="prestige-reward-banner">
        +${idleBonus}% gains idle permanent
      </div>

      <div class="prestige-cols">
        <div class="prestige-col prestige-col--keep">
          <div class="prestige-col-title">Conservé</div>
          <div class="prestige-col-item">⭐ Niveau ${S.accountLevel}</div>
          <div class="prestige-col-item">🎯 ${S.talentsUnlocked.length} talent${S.talentsUnlocked.length > 1 ? 's' : ''}</div>
          <div class="prestige-col-item">⚔ Maîtrise rang ${S.masteryRank || 0}</div>
          <div class="prestige-col-item">📚 Collection (${collSize} surv.)</div>
          <div class="prestige-col-item">📊 Statistiques</div>
        </div>
        <div class="prestige-col prestige-col--reset">
          <div class="prestige-col-title">Réinitialisé</div>
          <div class="prestige-col-item">💊 Capsules (${Math.floor(S.capsules)})</div>
          <div class="prestige-col-item">🗺 Zone ${S.currentZone}, Vague ${S.currentWave}</div>
          <div class="prestige-col-item">👥 Équipe (${teamCount} membres)</div>
          <div class="prestige-col-item">🧬 ADN (${Math.floor(S.dna)})</div>
          <div class="prestige-col-item">🔥 Quêtes journalières</div>
        </div>
      </div>

      <div class="prestige-warning">
        Cette action est irréversible. Tous vos progrès de zone seront perdus.
      </div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
        <button class="btn-danger" onclick="window.confirmPrestige()">☣ Confirmer le Prestige</button>
        <button onclick="document.getElementById('prestige-modal').remove()">Annuler</button>
      </div>
    </div>`
  document.body.appendChild(modal)
}

window.confirmPrestige = function() {
  document.getElementById('prestige-modal')?.remove()
  if (doPrestige(S)) {
    if (!S.stats) S.stats = {}
    S.stats.totalPrestige = (S.stats.totalPrestige || 0) + 1
    saveState(S)
    const narrP = getNarration('first_prestige', S)
    const afterPrestige = () => {
      showToast(`☣ Prestige ${S.prestigeLevel} ! Gains idle ×${1 + S.prestigeLevel * 0.1}`, 'fusion', 5000)
      currentPhase = PHASE.IDLE
      renderCombatView()
      updateUI()
    }
    if (narrP) {
      markNarrationShown('first_prestige', S)
      showNarration(narrP, afterPrestige)
    } else {
      afterPrestige()
    }
  }
}

window.setTab = setTab
function setTab(tab) {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab))
  document.querySelectorAll('.view').forEach(v =>
    v.style.display = v.dataset.view === tab ? '' : 'none')
  playMenuSound()
  updateUI()
}

document.addEventListener('zoneChanged', () => {
  currentPhase = PHASE.IDLE
  hideBossPanel()
  renderCombatView()
  updateUI()
})

// ── UI globale ──
function triggerAchievements() {
  const unlocked = checkAchievements(S)
  unlocked.forEach(ach => {
    const parts = []
    if (ach.reward.capsules) parts.push(`+${ach.reward.capsules}💊`)
    if (ach.reward.dna)      parts.push(`+${ach.reward.dna}🧬`)
    if (ach.reward.radium)   parts.push(`+${ach.reward.radium}☢`)
    showToast(`${ach.icon} <strong>${ach.name}</strong> débloqué ! ${parts.join(' ')}`, 'fusion', 4500)
  })
  if (unlocked.length) saveState(S)
}

function updateUI() {
  triggerAchievements()
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

  // Collection : fusion disponible (3+ copies d'un même survivant non-L)
  const grouped = {}
  ;(state.collection || []).forEach(p => { grouped[p.id] = (grouped[p.id] || 0) + 1 })
  const hasFusionReady = Object.entries(grouped).some(([id, count]) => {
    const sv = SURVIVORS.find(x => x.id === id)
    return sv && sv.rarity !== 'L' && !sv.boss && count >= 3
  })
  setBadge('survivors', hasFusionReady)
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

// Son de fusion (⚡ chord épique montant)
function playFusionSound() {
  try {
    const ctx = getAudio()
    const chord = [220, 277, 330, 440, 554]
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      const t = ctx.currentTime + i * 0.07
      osc.frequency.setValueAtTime(freq, t)
      osc.frequency.exponentialRampToValueAtTime(freq * 2, t + 0.3)
      gain.gain.setValueAtTime(0.12, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
      osc.start(t); osc.stop(t + 0.45)
    })
  } catch (_) {}
}

// Son de recyclage (bruit de broyeur descendant)
function playRecycleSound() {
  try {
    const ctx = getAudio()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 600
    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(400, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.35)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4)
  } catch (_) {}
}

// Son d'upgrade ADN (ping électrique montant)
function playUpgradeSound() {
  try {
    const ctx = getAudio()
    const notes = [440, 550, 660]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      const t = ctx.currentTime + i * 0.1
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.18, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
      osc.start(t); osc.stop(t + 0.18)
    })
  } catch (_) {}
}

// Son gacha Légendaire (fanfare dorée — arpège long)
function playLegendarySound() {
  try {
    const ctx = getAudio()
    const melody = [523, 659, 784, 1047, 784, 1047, 1319]
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'triangle'
      const t = ctx.currentTime + i * 0.14
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.22, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
      osc.start(t); osc.stop(t + 0.25)
    })
  } catch (_) {}
}

// Son level-up (accord joyeux + shimmer)
function playLevelUpSound() {
  try {
    const ctx = getAudio()
    const arp = [392, 494, 587, 784, 987]
    arp.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = i < 3 ? 'square' : 'sine'
      const t = ctx.currentTime + i * 0.08
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.15, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
      osc.start(t); osc.stop(t + 0.22)
    })
  } catch (_) {}
}

// Son d'ouverture de menu / tab switch
function playMenuSound() {
  try {
    const ctx = getAudio()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.06)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12)
  } catch (_) {}
}

window.playHitSound      = playHitSound
window.playVictorySound  = playVictorySound
window.playFusionSound   = playFusionSound
window.playRecycleSound  = playRecycleSound
window.playUpgradeSound  = playUpgradeSound
window.playLegendarySound = playLegendarySound
window.playLevelUpSound  = playLevelUpSound
window.playMenuSound     = playMenuSound

document.addEventListener('DOMContentLoaded', init)
