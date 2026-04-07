// ── SHELTER SURVIVOR — Collection de survivants ──
import { SURVIVORS, RARITY, RARITY_ORDER, ROLE_META } from '../data/survivors.js'
import { getCollectionStats } from '../core/gacha.js'

export function renderCollection(state) {
  const collDiv  = document.getElementById('survivor-collection')
  const albumDiv = document.getElementById('album-stats')
  if (!collDiv) return

  const grouped = {}
  state.collection.forEach(p => { grouped[p.id] = (grouped[p.id] || 0) + 1 })
  const uniqueIds = [...new Set(state.collection.map(p => p.id))]

  if (!uniqueIds.length) {
    collDiv.innerHTML = `
      <div class="card">
        <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">
          Aucun survivant.<br>Envoyez des signaux de détresse pour les recruter !
        </div>
      </div>`
  } else {
    collDiv.innerHTML = `
      <div class="card">
        <div class="card-title">Survivants recrutés (${uniqueIds.length} uniques)</div>
        <div class="survivor-grid">
          ${uniqueIds.map(id => survivorCard(id, grouped[id], state)).join('')}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:8px">
          Appuyez pour ajouter/retirer de l'équipe. 3 copies = fusion automatique.
        </div>
      </div>`
  }

  if (!albumDiv) return
  const stats = getCollectionStats(state)
  const pct   = Math.round(stats.unique / stats.total * 100)

  albumDiv.innerHTML = `
    <div class="card">
      <div class="card-title">Dossier des survivants</div>
      <div style="font-size:13px;font-weight:500;margin-bottom:6px">
        ${stats.unique} / ${stats.total} recrutés
      </div>
      <div class="bar-track" style="margin-bottom:8px">
        <div class="bar-fill" style="width:${pct}%;background:var(--accent)"></div>
      </div>
      ${RARITY_ORDER.map(r => {
        const ri   = RARITY[r]
        const data = stats.byRarity[r]
        const p    = data.total > 0 ? Math.round(data.have / data.total * 100) : 0
        return `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <span class="badge" style="background:${ri.bg};color:${ri.text};min-width:72px">${ri.label}</span>
            <div class="bar-track" style="flex:1">
              <div class="bar-fill" style="width:${p}%;background:${ri.color}"></div>
            </div>
            <span style="font-size:11px;color:var(--text-muted);min-width:35px;text-align:right">
              ${data.have}/${data.total}
            </span>
          </div>`
      }).join('')}
    </div>`
}

function survivorCard(id, copies, state) {
  const sv = SURVIVORS.find(x => x.id === id)
  if (!sv) return ''
  const r      = RARITY[sv.rarity] || RARITY['D']
  const meta   = ROLE_META[sv.role] || {}
  const inTeam = state.team.some(e => e && e.id === id)
  const isBoss = sv.boss

  return `
    <div class="survivor-card ${inTeam ? 'in-team' : ''}"
      style="background:${r.bg};border-color:${inTeam ? r.color : r.color + '44'}"
      onclick="${isBoss ? '' : `window.toggleTeamUI('${id}')`}"
      title="${sv.name} — ${sv.role}\n${sv.desc}${copies > 1 ? `\n×${copies} copies` : ''}">

      <!-- Rareté -->
      <div class="sc-rarity" style="color:${r.color}">${r.label}</div>

      <!-- Icône de sur-classe + sous-classe dessous -->
      <div class="sc-class-icon" style="color:${meta.classColor || r.color}">${meta.classIcon || ''}</div>
      <div class="sc-subclass" style="color:${r.color}">${sv.role}</div>

      <!-- Mini stats -->
      <div class="sc-stats">
        ${statBar('HP',  sv.hp,  600, '#5AE05A')}
        ${statBar('ATK', sv.atk, 900, '#E05A4A')}
        ${statBar('DEF', sv.def, 300, '#4A8FE0')}
        ${statBar('SPD', sv.spd, 375, '#E0C44A')}
      </div>

      <!-- Nom tout en bas -->
      <div class="sc-name" style="color:${r.text}">${sv.name}</div>

      <!-- Badges flottants -->
      ${copies > 1 ? `<div class="survivor-card-copies">${copies}</div>` : ''}
      ${inTeam      ? `<div class="survivor-card-check">✓</div>` : ''}
      ${isBoss      ? `<div class="survivor-card-boss">BOSS</div>` : ''}
    </div>`
}

function statBar(label, value, max, color) {
  const pct = Math.min(100, Math.round(value / max * 100))
  return `<div class="sc-stat-row">
    <span class="sc-stat-label">${label}</span>
    <div class="sc-stat-track"><div class="sc-stat-fill" style="width:${pct}%;background:${color}"></div></div>
  </div>`
}

window.renderCollection = renderCollection
