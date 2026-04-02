import { POGS, RARITY, RARITY_ORDER } from '../data/pogs.js'
import { getCollectionStats } from '../core/gacha.js'

export function renderCollection(state) {
  const collDiv  = document.getElementById('pog-collection')
  const albumDiv = document.getElementById('album-stats')
  if (!collDiv) return

  // ── Grille de collection ──
  const grouped = {}
  state.collection.forEach(p => {
    grouped[p.id] = (grouped[p.id] || 0) + 1
  })
  const uniqueIds = [...new Set(state.collection.map(p => p.id))]

  if (!uniqueIds.length) {
    collDiv.innerHTML = `
      <div class="card">
        <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">
          Aucun pog pour l'instant.<br>Ouvrez des packs pour commencer !
        </div>
      </div>`
  } else {
    collDiv.innerHTML = `
      <div class="card">
        <div class="card-title">Collection (${uniqueIds.length} pogs uniques)</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;max-height:220px;overflow-y:auto">
          ${uniqueIds.map(id => pogCircle(id, grouped[id], state)).join('')}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:8px">
          Cliquez pour équiper / retirer. 3 copies = fusion automatique.
        </div>
      </div>`
  }

  // ── Album ──
  if (!albumDiv) return
  const stats = getCollectionStats(state)
  const pct   = Math.round(stats.unique / stats.total * 100)

  albumDiv.innerHTML = `
    <div class="card">
      <div class="card-title">Album de pogs</div>
      <div style="font-size:13px;font-weight:500;margin-bottom:6px">
        ${stats.unique} / ${stats.total} découverts
      </div>
      <div class="bar-track" style="margin-bottom:8px">
        <div class="bar-fill" style="width:${pct}%;background:var(--purple)"></div>
      </div>
      ${RARITY_ORDER.map(r => {
        const ri   = RARITY[r]
        const data = stats.byRarity[r]
        const p    = Math.round(data.have / data.total * 100)
        return `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <span class="badge" style="background:${ri.bg};color:${ri.text};min-width:80px">
              ${ri.label}
            </span>
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

function pogCircle(id, copies, state) {
  const pg       = POGS.find(x => x.id === id)
  if (!pg) return ''
  const r        = RARITY[pg.rarity]
  const equipped = state.equippedPogs.findIndex(e => e && e.id === id) >= 0
  const isBoss   = pg.boss

  return `
    <div class="pog-circle"
      style="
        background:${r.bg};
        border-color:${equipped ? r.color : 'transparent'};
        border-width:${equipped ? '2px' : '1.5px'};
        color:${r.text};
        ${isBoss ? 'outline:2px solid #EF9F27;' : ''}
      "
      onclick="${isBoss ? '' : `toggleEquipUI('${id}')`}"
      title="${pg.name}\n${r.label}\n${pg.desc}${copies > 1 ? `\n${copies} copies` : ''}">
      <span style="font-size:13px">${pg.icon}</span>
      ${copies > 1 ? `<span class="copies">${copies}</span>` : ''}
    </div>`
}

window.renderCollection = renderCollection