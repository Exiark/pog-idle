// ── SHELTER 7 — Arbre de talents visuel ──
import { TALENTS } from '../data/talents.js'
import { saveState } from '../core/state.js'
import { unlockMastery } from '../core/economy.js'

// Grid: 3 cols × 3 rows, each cell 90px, gap 10px → total 290×290
// Centers: col x = 45 / 145 / 245 ; row y = 45 / 145 / 245
const NODE_POS = {
  t1: { x: 45,  y: 45  },
  t2: { x: 145, y: 45  },
  t3: { x: 245, y: 45  },
  t4: { x: 45,  y: 145 },
  t5: { x: 145, y: 145 },
  t6: { x: 245, y: 145 },
  t7: { x: 45,  y: 245 },
  t8: { x: 145, y: 245 },
  t9: { x: 245, y: 245 },
}

const CONNECTIONS = [
  ['t1', 't4'], ['t2', 't5'], ['t3', 't6'],
  ['t4', 't7'], ['t5', 't8'], ['t6', 't9'],
]

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

  const unlocked = state.talentsUnlocked || []

  // ── SVG connector lines ──
  const svgLines = CONNECTIONS.map(([from, to]) => {
    const p1 = NODE_POS[from]
    const p2 = NODE_POS[to]
    const bothOn  = unlocked.includes(from) && unlocked.includes(to)
    const parentOn = unlocked.includes(from) && !unlocked.includes(to)
    const color   = bothOn  ? '#5A9E3A' : parentOn ? '#c0832a' : '#3a3a3a'
    const width   = bothOn  ? 3 : 2
    const opacity = bothOn  ? 1 : parentOn ? 0.7 : 0.3
    const dash    = bothOn  ? '' : 'stroke-dasharray="6 4"'
    return `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"
      stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}" ${dash}/>`
  }).join('\n    ')

  // ── Talent nodes ──
  const nodesHtml = TALENTS.map(t => {
    const isUnlocked  = unlocked.includes(t.id)
    const canAfford   = state.talentPoints >= t.cost
    const reqMet      = !t.requires || unlocked.includes(t.requires)
    const available   = canAfford && reqMet && !isUnlocked
    const locked      = !reqMet
    const isT5        = t.id === 't5'

    let cls = 'tn-node'
    if (isUnlocked)       cls += ' tn-unlocked'
    else if (locked)      cls += ' tn-locked'
    else if (available)   cls += ' tn-available'
    else                  cls += ' tn-unaffordable'
    if (isT5)             cls += ' tn-star'

    const tooltip = t.requires && !reqMet
      ? `Nécessite : ${getTalentName(t.requires)}`
      : available ? `Déverrouiller : ${t.cost} point${t.cost > 1 ? 's' : ''}`
      : isUnlocked ? 'Acquis'
      : ''

    const costLabel = isUnlocked
      ? `<span class="tn-cost tn-cost--done">✓ Acquis</span>`
      : locked
      ? `<span class="tn-cost tn-cost--locked">🔒</span>`
      : `<span class="tn-cost">${t.cost} pt${t.cost > 1 ? 's' : ''}</span>`

    return `
      <div class="${cls}"
        onclick="${available ? `window.unlockTalentUI('${t.id}')` : ''}"
        title="${tooltip}">
        ${isT5 ? `<div class="tn-star-badge">IDLE</div>` : ''}
        <div class="tn-icon">${t.icon}</div>
        <div class="tn-name">${t.name}</div>
        <div class="tn-desc">${t.desc}</div>
        ${costLabel}
      </div>`
  }).join('')

  // Row labels
  const ROW_LABELS = ['Combat', 'Économie', 'Maîtrise']
  const rowLabelsHtml = ROW_LABELS.map(label =>
    `<div class="tn-row-label">${label}</div>`
  ).join('')

  gridDiv.innerHTML = `
    <div class="tn-wrapper">
      <div class="tn-row-labels">${rowLabelsHtml}</div>
      <div class="tn-tree">
        <svg class="tn-svg" viewBox="0 0 290 290" preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg">
          ${svgLines}
        </svg>
        <div class="tn-grid">
          ${nodesHtml}
        </div>
      </div>
    </div>
  ` + masteryBlock(state)
}

function masteryBlock(state) {
  const rank   = state.masteryRank || 0
  const cost   = 1 + Math.floor(rank / 3)
  const canBuy = state.talentPoints >= cost

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

  S.talentPoints  -= talent.cost
  S.talentsUnlocked.push(id)
  saveState(S)

  if (window.playUpgradeSound) window.playUpgradeSound()
  if (window.showToast) window.showToast(`✓ ${talent.name} déverrouillé !`, 'levelup', 2500)

  renderTalents(S)
  if (window.renderHub) window.renderHub(S)
}
