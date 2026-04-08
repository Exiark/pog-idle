// ── SHELTER SURVIVOR — Écran d'accueil (Hub) ──
import { SURVIVORS, RARITY, ROLE_META, getSpriteUrl, classIconHtml } from '../data/survivors.js'
import { ZONES } from '../data/zones.js'
import { calcIdleRate } from '../core/state.js'

export function renderHome(state) {
  const el = document.getElementById('home-view-inner')
  if (!el) return

  const zone      = ZONES[(state.activeZone || 1) - 1]
  const teamCount = state.team.filter(Boolean).length
  const idleRate  = calcIdleRate(state)
  const lvl       = state.accountLevel
  const xpMax     = (lvl + 1) * 100
  const xpPct     = Math.round(state.accountXP / xpMax * 100)
  const bossDefeated = state.bossesDefeated?.includes(`z${state.activeZone}`)
  const waveLabel = bossDefeated
    ? `Zone ${state.activeZone} terminée ✓`
    : `Zone ${state.activeZone} — Vague ${state.currentWave}/11`

  // Offline reward info
  const offlineEl = document.getElementById('offline-notif')
  const hasOffline = offlineEl && offlineEl.style.display !== 'none'

  el.innerHTML = `
    <!-- Fond de zone -->
    <div class="home-bg" id="home-bg" style="${zoneBg(zone)}">
      <img class="home-bg-img" src="assets/backgrounds/hub.png" alt="" onerror="this.style.display='none'">
    </div>

    <!-- Titre overlay -->
    <div class="home-header">
      <div class="home-title"><span class="home-title-icon">☣</span>SHELTER</div>
      <div class="home-subtitle">Post-Apocalyptic Idle RPG</div>
    </div>

    <!-- Équipe large -->
    <div class="home-team-section">
      <div class="home-team-label">ÉQUIPE ACTIVE</div>
      <div class="home-team-slots">
        ${Array.from({ length: 6 }, (_, i) => homeTeamSlot(state.team[i], state)).join('')}
      </div>
    </div>

    <!-- Stats rapides -->
    <div class="home-stats-row">
      <div class="home-stat-chip">
        <span class="home-stat-icon">💊</span>
        <span class="home-stat-val">${Math.floor(state.capsules)}</span>
      </div>
      <div class="home-stat-chip">
        <span class="home-stat-icon">☢</span>
        <span class="home-stat-val">${Math.floor(state.radium)}</span>
      </div>
      <div class="home-stat-chip">
        <span class="home-stat-icon">🧬</span>
        <span class="home-stat-val">${Math.floor(state.dna)}</span>
      </div>
      <div class="home-stat-chip">
        <span class="home-stat-icon">⚡</span>
        <span class="home-stat-val">${idleRate}/s</span>
      </div>
    </div>

    <!-- Progression compte -->
    <div class="home-xp-row">
      <span class="home-xp-label">Niv. ${lvl + 1}</span>
      <div class="home-xp-track">
        <div class="home-xp-fill" style="width:${xpPct}%"></div>
      </div>
      <span class="home-xp-label">${state.accountXP}/${xpMax} XP</span>
    </div>

    <!-- Zone en cours -->
    <div class="home-zone-card" style="border-color:${zone.colors.primary}44">
      <div class="home-zone-inner">
        <div>
          <div class="home-zone-label">EN EXPLORATION</div>
          <div class="home-zone-name" style="color:${zone.colors.primary}">${zone.name}</div>
          <div class="home-zone-wave">${waveLabel}</div>
        </div>
        <div class="home-zone-pip-row">
          ${Array.from({ length: 11 }, (_, i) => {
            const w = i + 1
            const done = w < state.currentWave
            const curr = w === state.currentWave
            const isBoss = w === 11
            return `<div class="home-wave-pip ${done ? 'done' : curr ? 'curr' : ''} ${isBoss ? 'boss' : ''}">${isBoss ? '☠' : ''}</div>`
          }).join('')}
        </div>
      </div>
    </div>

    <!-- CTAs principaux -->
    <div class="home-cta-row">
      <button class="home-cta-main" onclick="window.setTab('combat')">
        ⚔ Continuer l'Exploration
      </button>
    </div>

    <div class="home-cta-secondary-row">
      <button class="home-cta-secondary" onclick="window.setTab('survivors')">
        👥 Équipe
      </button>
      <button class="home-cta-secondary" onclick="window.setTab('packs')">
        📡 Signaux
      </button>
      <button class="home-cta-secondary" onclick="window.setTab('daily')">
        📋 Missions
      </button>
    </div>

    <!-- Daily bonus -->
    ${dailySection(state)}

    <!-- Offline reward (si dispo) -->
    ${hasOffline ? `
    <div class="home-offline-card" onclick="window.collectOfflineUI(1)">
      <span>⏰ Revenus hors-ligne disponibles — Appuyez pour collecter</span>
    </div>` : ''}
  `
}

function homeTeamSlot(slot, state) {
  if (!slot) {
    return `<div class="home-team-slot empty" onclick="window.setTab('survivors')">
      <div class="home-slot-plus">+</div>
    </div>`
  }
  const sv = SURVIVORS.find(x => x.id === slot.id)
  if (!sv) return ''
  const r      = RARITY[sv.rarity] || RARITY['D']
  const meta   = ROLE_META[sv.role] || {}
  const sprite = getSpriteUrl(sv)
  const lv     = (state.survivorUpgrades || {})[sv.id] || 0

  return `
    <div class="home-team-slot filled" style="background:${r.bg};border-color:${r.color}"
      onclick="window.showSurvivorModal('${sv.id}')">
      ${sprite
        ? `<img class="home-team-sprite" src="${sprite}" alt="${sv.name}">`
        : `<div class="home-team-class-icon">${classIconHtml(meta, 48, meta.classColor||r.color)}</div>`}
      <div class="home-team-name" style="color:${r.text}">${sv.name}</div>
      ${lv > 0 ? `<div class="home-team-lv">+${lv}</div>` : ''}
    </div>`
}

function dailySection(state) {
  const claimed = state.dailyClaimed
  const day     = (state.dailyDay || 0) % 7 + 1

  if (claimed) {
    return `
      <div class="home-daily-card claimed">
        <span class="home-daily-icon">📋</span>
        <span>Rapport journalier déjà réclamé</span>
        <span class="home-daily-tag">Revient demain</span>
      </div>`
  }
  return `
    <div class="home-daily-card" onclick="window.claimDailyUI()">
      <span class="home-daily-icon">📋</span>
      <span>Rapport journalier — Jour ${day}</span>
      <span class="home-daily-tag btn-glow">Réclamer !</span>
    </div>`
}

function zoneBg(zone) {
  const c1 = zone.colors.secondary
  const c2 = zone.colors.primary
  return `position:relative;overflow:hidden;background:linear-gradient(180deg,${c1}99 0%,${c2}44 60%,transparent 100%);`
}


window.renderHome = renderHome
