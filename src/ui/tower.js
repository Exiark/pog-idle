// ── SHELTER SURVIVOR — Carte des zones ──
import { ZONES } from '../data/zones.js'

export function renderTower(state) {
  const container = document.getElementById('tower-container')
  if (!container) return

  container.innerHTML = `
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:16px;font-weight:500;color:var(--accent)">☣ Carte d'exploration</div>
      <div style="font-size:12px;color:var(--text-muted)">
        Zone ${state.currentZone} — Vague ${state.currentWave}/11
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:8px;max-width:340px;margin:0 auto">
      ${[...ZONES].reverse().map(zone => zoneNode(zone, state)).join('')}
    </div>

    <div style="text-align:center;margin-top:12px;font-size:11px;color:var(--text-muted)">
      Appuyez sur une zone déverrouillée pour y envoyer votre équipe
    </div>`
}

function zoneNode(zone, state) {
  const isUnlocked = state.unlockedZones.includes(zone.id)
  const isActive   = state.activeZone === zone.id
  const isCurrent  = state.currentZone === zone.id
  const beaten     = state.bossesDefeated.includes(`z${zone.id}`)
  const isFarming  = isActive && zone.id < state.currentZone

  const c = zone.colors

  return `
    <div onclick="${isUnlocked ? `window.selectZoneUI(${zone.id})` : ''}"
      style="
        display:flex;align-items:center;gap:12px;
        padding:12px 14px;border-radius:12px;
        border:${isActive ? `2px solid ${c.primary}` : '0.5px solid var(--gray-border)'};
        background:${isActive ? c.primary + '22' : 'var(--panel-bg)'};
        cursor:${isUnlocked ? 'pointer' : 'default'};
        opacity:${isUnlocked ? '1' : '0.4'};
        position:relative;
      ">

      <div style="
        width:36px;height:36px;border-radius:50%;flex-shrink:0;
        background:${isUnlocked ? c.primary : 'var(--gray-border)'};
        color:white;font-size:14px;font-weight:500;
        display:flex;align-items:center;justify-content:center;">
        ${beaten ? '✓' : zone.id}
      </div>

      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:${isUnlocked ? 'var(--text)' : 'var(--text-muted)'}">
          ${zone.name}
          ${beaten ? '<span style="color:#5A9E3A;font-size:11px;margin-left:4px">✓</span>' : ''}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
          ${isUnlocked ? zone.desc : 'Verrouilée — battez le boss précédent'}
        </div>

        ${isCurrent && !beaten ? `
          <div style="margin-top:5px">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:2px">
              <span>Progression</span>
              <span>Vague ${state.currentWave}/11</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.round(state.currentWave / 11 * 100)}%;background:${c.primary}"></div>
            </div>
          </div>` : ''}

        ${beaten ? `<div style="font-size:11px;color:#5A9E3A;margin-top:3px">Boss éliminé · Zone sécurisée</div>` : ''}
        ${isFarming ? `<div style="font-size:11px;color:var(--accent);margin-top:3px">Mode farming — butin ×0.4</div>` : ''}
      </div>

      ${isActive ? `<span class="badge" style="background:${c.primary};color:white;font-size:10px;flex-shrink:0">En cours</span>` : ''}
      ${!isUnlocked ? `<div style="font-size:18px;opacity:0.4">🔒</div>` : ''}
      ${isUnlocked && !beaten ? `
        <div style="position:absolute;top:8px;right:10px;font-size:10px;color:var(--text-muted)">
          Boss: ${zone.boss.name}
        </div>` : ''}
    </div>`
}

window.renderTower = renderTower

window.selectZoneUI = function(zoneId) {
  const S = window._state
  if (!S || !S.unlockedZones.includes(zoneId)) return
  S.activeZone = zoneId
  if (window.saveState) window.saveState(S)
  renderTower(S)
  if (window.renderHub)  window.renderHub(S)
  if (window.setTab)     window.setTab('combat')
  document.dispatchEvent(new CustomEvent('zoneChanged'))
}
