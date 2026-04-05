import { KINIS } from '../data/kinis.js'
import { saveState } from '../core/state.js'

export function renderKiniPanel(state) {
  const listDiv    = document.getElementById('kini-list')
  const upgradeDiv = document.getElementById('kini-upgrade')
  if (!listDiv) return

  const available = getAvailableKinis(state)

  listDiv.innerHTML = available.map((k, i) => {
    const isSel = i === state.selectedKini
    return `
      <div class="kini-card${isSel ? ' selected' : ''}" onclick="selectKini(${i})">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:500">
            ${k.icon} ${k.name}
            ${k.exclusive ? `<span class="badge" style="background:#FAEEDA;color:#412402;margin-left:4px">Exclusif W${k.world}</span>` : ''}
          </span>
          <span style="font-size:11px;color:var(--text-muted)">${k.type}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin:3px 0">${k.desc}</div>
        <div style="display:flex;gap:10px;font-size:11px;color:var(--text-muted)">
          <span>Atk: ${k.power}</span>
          <span>Vit: ${k.speed.toFixed(1)}</span>
          <span>Préc: ${Math.round(k.accuracy * 100)}%</span>
          <span>Crit: ${Math.round(k.chance * 100)}%</span>
        </div>
      </div>`
  }).join('')

  if (!upgradeDiv) return
  const k = available[state.selectedKini] || available[0]
  if (!k) return

  upgradeDiv.innerHTML = `
    <div class="card">
      <div class="card-title">Kini sélectionné</div>
      <div style="font-size:13px;font-weight:500;margin-bottom:6px">${k.icon} ${k.name}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${k.desc}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px">
        <span>⚔ Atk: <strong>${k.power}</strong></span>
        <span>⚡ Vit: <strong>${k.speed.toFixed(1)}</strong></span>
        <span>🎯 Préc: <strong>${Math.round(k.accuracy * 100)}%</strong></span>
        <span>★ Crit: <strong>${Math.round(k.chance * 100)}%</strong></span>
      </div>
      ${k.bonusEffect ? `<div style="margin-top:8px;font-size:11px;background:#EEEDFE;border-radius:8px;padding:6px 8px;color:#26215C">
        Bonus exclusif : ${k.bonusEffect}
      </div>` : ''}
    </div>`
}

function getAvailableKinis(state) {
  const base      = KINIS.filter(k => !k.exclusive)
  const exclusive = KINIS.filter(k =>
    k.exclusive && state.worldKinis && state.worldKinis.includes(k.id)
  )
  return [...base, ...exclusive]
}

window.renderKiniPanel = renderKiniPanel