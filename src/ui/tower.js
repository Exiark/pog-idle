// ── SHELTER 7 — Carte du monde visuelle ──
import { ZONES } from '../data/zones.js'

export function renderTower(state) {
  const container = document.getElementById('tower-container')
  if (!container) return

  container.innerHTML = `
    <div class="world-map">
      <div class="world-map-header">
        <div class="world-map-title">☣ Carte d'exploration</div>
        <div class="world-map-sub">Zone ${state.currentZone} — Vague ${state.currentWave}/11</div>
      </div>

      <div class="world-map-grid">
        ${ZONES.map(zone => zoneCard(zone, state)).join('')}
      </div>

      ${state.bossesDefeated?.includes('z7') || state.bossesDefeated?.length >= 7 ? `
        <div class="prestige-panel" style="margin-top:12px">
          <div class="prestige-panel-title">☣ Toutes les zones sécurisées !</div>
          <div class="prestige-panel-sub">Prestige ${state.prestigeLevel || 0} — Bonus idle actuel : ×${(1 + (state.prestigeLevel || 0) * 0.1).toFixed(1)}</div>
          <button class="btn-danger" style="width:100%;margin-top:8px" onclick="window.openPrestigeUI()">
            ☣ Lancer un nouveau cycle
          </button>
        </div>` : ''}
    </div>
  `
}

function zoneCard(zone, state) {
  const isUnlocked = state.unlockedZones.includes(zone.id)
  const isActive   = state.activeZone === zone.id
  const isCurrent  = state.currentZone === zone.id
  const beaten     = state.bossesDefeated.includes(`z${zone.id}`)
  const wavePct    = isCurrent && !beaten ? Math.round(state.currentWave / 11 * 100) : beaten ? 100 : 0
  const c          = zone.colors

  const starsTotal = (state.zoneStars || {})[zone.id] || 0

  if (!isUnlocked) {
    return `
      <div class="zone-card zone-card--locked">
        <div class="zone-card-bg zone-card-bg--fog"></div>
        <div class="zone-card-lock">🔒</div>
        <div class="zone-card-num">${zone.id}</div>
        <div class="zone-card-name zone-card-name--locked">???</div>
      </div>`
  }

  return `
    <div class="zone-card ${isActive ? 'zone-card--active' : ''} ${beaten ? 'zone-card--beaten' : ''}"
      style="--zc: ${c.primary}; --zc2: ${c.secondary}"
      onclick="window.selectZoneUI(${zone.id})">

      <!-- Illustration de fond -->
      <div class="zone-card-bg">
        <img src="assets/backgrounds/zone${zone.id}.png" alt="${zone.name}"
          style="width:100%;height:100%;object-fit:cover;opacity:0.55"
          onerror="this.style.display='none'">
        <div class="zone-card-bg-gradient"></div>
      </div>

      <!-- Contenu -->
      <div class="zone-card-content">
        <div class="zone-card-top-row">
          <span class="zone-card-num-badge" style="background:${c.primary}22;border-color:${c.primary}55;color:${c.primary}">Z${zone.id}</span>
          ${beaten
            ? `<span class="zone-card-status beaten">✓ Sécurisée</span>`
            : isActive
              ? `<span class="zone-card-status active" style="background:${c.primary};color:#fff">En cours</span>`
              : ''}
        </div>

        <div class="zone-card-name" style="color:${c.primary}">${zone.name}</div>
        <div class="zone-card-boss" style="color:${c.primary}99">☠ ${zone.boss.name}</div>

        <!-- Barre de progression -->
        <div class="zone-card-progress">
          <div class="zone-card-wave-pips">
            ${Array.from({ length: 11 }, (_, i) => {
              const w = i + 1
              const done = beaten || (isCurrent && w < state.currentWave)
              const curr = isCurrent && !beaten && w === state.currentWave
              return `<div class="zone-wave-pip ${done ? 'done' : ''} ${curr ? 'curr' : ''} ${w === 11 ? 'boss' : ''}"
                style="${done || curr ? `background:${c.primary};` : ''}${curr ? `box-shadow:0 0 6px ${c.primary};` : ''}">
                ${w === 11 ? '☠' : ''}
              </div>`
            }).join('')}
          </div>
        </div>
      </div>
    </div>`
}

window.renderTower = renderTower

window.selectZoneUI = function(zoneId) {
  const S = window._state
  if (!S || !S.unlockedZones.includes(zoneId)) return
  S.activeZone = zoneId
  if (window.saveState) window.saveState(S)
  renderTower(S)
  if (window.renderHub) window.renderHub(S)

  // Feedback visuel de transition
  const zone = ZONES[zoneId - 1]
  if (zone && window.showToast) {
    window.showToast(`📍 Zone ${zoneId} — <strong>${zone.name}</strong>`, 'info', 2500)
  }
  // Flash couleur zone
  if (zone) {
    const flash = document.createElement('div')
    flash.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;background:${zone.colors.primary};opacity:0;transition:opacity 0.15s ease-in-out;`
    document.body.appendChild(flash)
    requestAnimationFrame(() => {
      flash.style.opacity = '0.18'
      setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 200) }, 150)
    })
  }

  if (window.setTab) window.setTab('combat')
  document.dispatchEvent(new CustomEvent('zoneChanged'))
}
