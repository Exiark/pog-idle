import { TALENTS } from '../data/talents.js'
import { saveState } from '../core/state.js'

export function renderTalents(state) {
  const pointsDiv = document.getElementById('talent-points-display')
  const gridDiv   = document.getElementById('talent-grid')
  if (!gridDiv) return

  if (pointsDiv) {
    pointsDiv.innerHTML = `
      <div class="card" style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:13px;font-weight:500">Points de talent</div>
          <div style="font-size:11px;color:var(--text-muted)">
            Gagnez 1 point par niveau de compte
          </div>
        </div>
        <div style="font-size:22px;font-weight:500;color:var(--purple)">
          ${state.talentPoints}
        </div>
      </div>`
  }

  // Groupe par rangée
  const rows = {}
  TALENTS.forEach(t => {
    if (!rows[t.row]) rows[t.row] = []
    rows[t.row].push(t)
  })

  gridDiv.innerHTML = Object.entries(rows).map(([row, talents]) => `
    <div style="margin-bottom:10px">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">
        Rangée ${row}
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${talents.map(t => talentNode(t, state)).join('')}
      </div>
    </div>`
  ).join('')
}

function talentNode(t, state) {
  const unlocked   = state.talentsUnlocked.includes(t.id)
  const canAfford  = state.talentPoints >= t.cost
  const reqMet     = !t.requires || state.talentsUnlocked.includes(t.requires)
  const available  = canAfford && reqMet && !unlocked
  const locked     = !reqMet

  let cls = 'talent-node'
  if (unlocked) cls += ' unlocked'
  else if (locked) cls += ' locked'

  return `
    <div class="${cls}"
      onclick="${available ? `unlockTalentUI('${t.id}')` : ''}"
      title="${t.requires && !reqMet ? `Nécessite : ${getTalentName(t.requires)}` : ''}">
      <div style="font-size:18px;margin-bottom:4px">${t.icon}</div>
      <div style="font-size:12px;font-weight:500">${t.name}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${t.desc}</div>
      <div style="font-size:11px;margin-top:5px;color:${unlocked ? '#3B6D11' : 'var(--purple)'}">
        ${unlocked ? '✓ Débloqué' : `${t.cost} pt${t.cost > 1 ? 's' : ''}`}
      </div>
      ${t.requires && !reqMet
        ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">
             Nécessite : ${getTalentName(t.requires)}
           </div>`
        : ''
      }
    </div>`
}

function getTalentName(id) {
  const t = TALENTS.find(x => x.id === id)
  return t ? t.name : id
}

window.renderTalents = renderTalents

window.unlockTalentUI = function (id) {
  const S = window._state
  if (!S) return
  const talent = TALENTS.find(t => t.id === id)
  if (!talent) return
  if (S.talentsUnlocked.includes(id)) return
  if (S.talentPoints < talent.cost) return
  const reqMet = !talent.requires || S.talentsUnlocked.includes(talent.requires)
  if (!reqMet) return

  S.talentPoints -= talent.cost
  S.talentsUnlocked.push(id)

  saveState(S)
  if (window.renderTalents) window.renderTalents(S)
  if (window.renderHUD)     window.renderHUD(S)
}