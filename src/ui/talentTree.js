// ── SHELTER SURVIVOR — Arbre de talents ──
import { TALENTS } from '../data/talents.js'
import { saveState } from '../core/state.js'
import { unlockMastery } from '../core/economy.js'

export function renderTalents(state) {
  const pointsDiv = document.getElementById('talent-points-display')
  const gridDiv   = document.getElementById('talent-grid')
  if (!gridDiv) return

  if (pointsDiv) {
    pointsDiv.innerHTML = `
      <div class="card" style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:13px;font-weight:500">Points de survie</div>
          <div style="font-size:11px;color:var(--text-muted)">+1 par niveau de compte</div>
        </div>
        <div style="font-size:22px;font-weight:500;color:var(--accent)">${state.talentPoints}</div>
      </div>`
  }

  const rows = {}
  TALENTS.forEach(t => {
    if (!rows[t.row]) rows[t.row] = []
    rows[t.row].push(t)
  })

  gridDiv.innerHTML = Object.entries(rows).map(([row, talents]) => `
    <div style="margin-bottom:10px">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Niveau ${row}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${talents.map(t => talentNode(t, state)).join('')}
      </div>
    </div>`).join('') + masteryBlock(state)
}

function talentNode(t, state) {
  const unlocked  = state.talentsUnlocked.includes(t.id)
  const canAfford = state.talentPoints >= t.cost
  const reqMet    = !t.requires || state.talentsUnlocked.includes(t.requires)
  const available = canAfford && reqMet && !unlocked
  const locked    = !reqMet

  let cls = 'talent-node'
  if (unlocked) cls += ' unlocked'
  else if (locked) cls += ' locked'

  return `
    <div class="${cls}" onclick="${available ? `window.unlockTalentUI('${t.id}')` : ''}"
      title="${t.requires && !reqMet ? `Nécessite : ${getTalentName(t.requires)}` : ''}">
      <div style="font-size:18px;margin-bottom:4px">${t.icon}</div>
      <div style="font-size:12px;font-weight:500">${t.name}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${t.desc}</div>
      <div style="font-size:11px;margin-top:5px;color:${unlocked ? '#5A9E3A' : 'var(--accent)'}">
        ${unlocked ? '✓ Acquis' : `${t.cost} pt${t.cost > 1 ? 's' : ''}`}
      </div>
      ${t.requires && !reqMet
        ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">Nécessite : ${getTalentName(t.requires)}</div>`
        : ''}
    </div>`
}

function masteryBlock(state) {
  const rank    = state.masteryRank || 0
  const cost    = 1 + Math.floor(rank / 3)
  const canBuy  = state.talentPoints >= cost

  return `
    <div class="mastery-block">
      <div class="mastery-title">⚔ Maîtrise — Rang ${rank}</div>
      ${rank > 0 ? `
      <div class="mastery-desc">
        Bonus cumulés :
        <strong>+${rank}% ATK</strong> ·
        <strong>+${rank}% DEF</strong> ·
        <strong>+${rank}% HP</strong> ·
        <strong>+${(rank * 0.02).toFixed(2)} caps/s idle</strong>
      </div>` : `
      <div class="mastery-desc" style="color:var(--text-muted)">
        Débloque des bonus permanents cumulatifs sur tous vos survivants.
      </div>`}
      <button class="mastery-btn ${canBuy ? '' : 'disabled'}"
        onclick="window.unlockMasteryUI()">
        Rang ${rank + 1} — ${cost} point${cost > 1 ? 's' : ''}
        ${!canBuy ? `<span style="font-size:10px;opacity:0.6">(${state.talentPoints}/${cost})</span>` : ''}
      </button>
    </div>`
}

function getTalentName(id) {
  const t = TALENTS.find(x => x.id === id)
  return t ? t.name : id
}

window.renderTalents = renderTalents

window.unlockMasteryUI = function() {
  const S = window._state
  if (!S) return
  const result = unlockMastery(S)
  if (result.error) {
    if (window.showToast) window.showToast(result.error, 'info')
    return
  }
  saveState(S)
  if (window.showToast) window.showToast(`⚔ Maîtrise rang ${result.newRank} atteint !`, 'levelup', 3000)
  renderTalents(S)
}

window.unlockTalentUI = function(id) {
  const S = window._state
  if (!S) return
  const talent = TALENTS.find(t => t.id === id)
  if (!talent || S.talentsUnlocked.includes(id)) return
  if (S.talentPoints < talent.cost) return
  if (talent.requires && !S.talentsUnlocked.includes(talent.requires)) return

  S.talentPoints -= talent.cost
  S.talentsUnlocked.push(id)
  saveState(S)
  renderTalents(S)
  if (window.renderHub) window.renderHub(S)
}
