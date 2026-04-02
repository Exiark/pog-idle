import { KINIS } from '../data/kinis.js'

export function renderKiniPanel(state) {
  const listDiv    = document.getElementById('kini-list')
  const upgradeDiv = document.getElementById('kini-upgrade')
  if (!listDiv) return

  // ── Liste des kinis disponibles ──
  const available = getAvailableKinis(state)

  listDiv.innerHTML = available.map((k, i) => {
    const lv     = state.kiniLevels[i] || 1
    const xp     = state.kiniXP[i]     || 0
    const xpMax  = lv * 60
    const pwr    = Math.round(k.power * (1 + (lv - 1) * 0.12))
    const pct    = Math.round(xp / xpMax * 100)
    const isSel  = i === state.selectedKini

    return `
      <div class="kini-card${isSel ? ' selected' : ''}" onclick="selectKini(${i})">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:500">
            ${k.icon} ${k.name}
            <span style="color:var(--purple);font-size:11px">Lv${lv}</span>
            ${k.exclusive ? `<span class="badge" style="background:#FAEEDA;color:#412402;margin-left:4px">Exclusif W${k.world}</span>` : ''}
          </span>
          <span style="font-size:11px;color:var(--text-muted)">${k.type}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin:3px 0">${k.desc}</div>
        <div class="bar-track" style="margin:4px 0 2px">
          <div class="bar-fill" style="width:${pct}%;background:var(--purple)"></div>
        </div>
        <div style="display:flex;gap:10px;font-size:11px;color:var(--text-muted)">
          <span>P: ${pwr}</span>
          <span>V: ${k.speed.toFixed(1)}</span>
          <span>C: ${Math.round(k.chance * 100)}%</span>
          <span style="margin-left:auto">XP: ${xp}/${xpMax}</span>
        </div>
      </div>`
  }).join('')

  // ── Panel d'amélioration ──
  if (!upgradeDiv) return
  const k   = KINIS[state.selectedKini] || KINIS[0]
  const lv  = state.kiniLevels[state.selectedKini] || 1
  const pwr = Math.round(k.power * (1 + (lv - 1) * 0.12))
  const nxt = Math.round(k.power * (1 + lv * 0.12))

  upgradeDiv.innerHTML = `
    <div class="card">
      <div class="card-title">Améliorer ${k.name}</div>
      <div style="font-size:12px;margin-bottom:8px">
        Niveau actuel : <strong>${lv}</strong>/10<br>
        Puissance : ${pwr} → <span style="color:var(--purple)">${nxt}</span>
      </div>
      ${lv >= 10
        ? `<div style="font-size:12px;color:var(--text-muted)">Niveau maximum atteint !</div>`
        : `<button class="btn-primary" onclick="upgradeKiniUI()" style="width:100%">
             Améliorer — 30 fragments
           </button>
           <div style="font-size:11px;color:var(--text-muted);margin-top:5px">
             Fragments disponibles : ${Math.floor(state.fragments)}
           </div>`
      }
    </div>`
}

function getAvailableKinis(state) {
  const base = KINIS.filter(k => !k.exclusive)
  const exclusive = KINIS.filter(k => k.exclusive && state.worldKinis.includes(k.id))
  return [...base, ...exclusive]
}

window.renderKiniPanel = renderKiniPanel

// ── Actions ──
window.upgradeKiniUI = function () {
  const event = new CustomEvent('upgradeKini')
  document.dispatchEvent(event)
}

// Écoute dans main.js
document.addEventListener('upgradeKini', () => {
  if (!window._state) return
  const S = window._state
  if (S.kiniLevels[S.selectedKini] >= 10) return
  if (S.fragments < 30) {
    alert('Pas assez de fragments (30 requis) !')
    return
  }
  S.fragments -= 30
  S.kiniXP[S.selectedKini] += 999
  import('../core/combat.js').then(({ gainKiniXP }) => {
    gainKiniXP(S, S.selectedKini, 0)
    if (window.saveState) window.saveState(S)
    if (window.renderKiniPanel) window.renderKiniPanel(S)
  })
})