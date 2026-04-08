// ── SHELTER SURVIVOR — Collection de survivants ──
import { SURVIVORS, RARITY, RARITY_ORDER, ROLE_META, getSpriteUrl, classIconHtml } from '../data/survivors.js'
import { getCollectionStats, checkFusion } from '../core/gacha.js'
import { UPGRADE_COST, UPGRADE_MAX, upgradeSurvivor } from '../core/economy.js'
import { saveState } from '../core/state.js'

const IDLE_RATE = { D: 0.05, E: 0.15, L: 0.4 }

// État de filtre courant
let filterRarity = 'all'
let filterTeam   = false

export function renderCollection(state) {
  const collDiv  = document.getElementById('survivor-collection')
  const albumDiv = document.getElementById('album-stats')
  if (!collDiv) return

  const grouped = {}
  state.collection.forEach(p => { grouped[p.id] = (grouped[p.id] || 0) + 1 })
  let uniqueIds = [...new Set(state.collection.map(p => p.id))]

  // Appliquer les filtres
  if (filterRarity !== 'all') {
    uniqueIds = uniqueIds.filter(id => {
      const sv = SURVIVORS.find(x => x.id === id)
      return sv && sv.rarity === filterRarity
    })
  }
  if (filterTeam) {
    uniqueIds = uniqueIds.filter(id => state.team.some(e => e && e.id === id))
  }

  // Séparation recrutés / manquants (non-boss uniquement)
  const allRoster   = SURVIVORS.filter(sv => !sv.boss)
  const allUniqueIds = [...new Set(state.collection.map(p => p.id))]
  const missingIds  = filterRarity !== 'all' || filterTeam
    ? []  // on cache les silhouettes si un filtre actif
    : allRoster.filter(sv => !allUniqueIds.includes(sv.id)).map(sv => sv.id)

  const filterBar = `
    <div class="filter-bar">
      <button class="filter-chip ${filterRarity === 'all' ? 'active' : ''}" onclick="window._setFilterRarity('all')">Tous</button>
      <button class="filter-chip ${filterRarity === 'D' ? 'active' : ''}" onclick="window._setFilterRarity('D')" style="color:var(--rarity-d)">D</button>
      <button class="filter-chip ${filterRarity === 'E' ? 'active' : ''}" onclick="window._setFilterRarity('E')" style="color:var(--rarity-e)">E</button>
      <button class="filter-chip ${filterRarity === 'L' ? 'active' : ''}" onclick="window._setFilterRarity('L')" style="color:var(--rarity-l)">L</button>
      <button class="filter-chip ${filterTeam ? 'active' : ''}" onclick="window._setFilterTeam()">Équipe</button>
    </div>`

  if (!allUniqueIds.length) {
    collDiv.innerHTML = `
      ${filterBar}
      <div class="card">
        <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">
          Aucun survivant.<br>Envoyez des signaux de détresse pour les recruter !
        </div>
        <div class="survivor-grid">
          ${missingIds.map(id => silhouetteCard(id)).join('')}
        </div>
      </div>`
  } else {
    collDiv.innerHTML = `
      ${filterBar}
      <div class="card">
        <div class="card-title">Survivants recrutés (${allUniqueIds.length} uniques)</div>
        ${uniqueIds.length === 0
          ? `<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px">Aucun survivant dans ce filtre</div>`
          : `<div class="survivor-grid">
               ${uniqueIds.map(id => survivorCard(id, grouped[id], state)).join('')}
             </div>`}
        <div style="font-size:11px;color:var(--text-muted);margin-top:8px">
          Appuyez pour ajouter/retirer de l'équipe. 3 copies = fusion automatique.
        </div>
      </div>
      ${missingIds.length ? `
      <div class="card" style="margin-top:8px">
        <div class="card-title" style="color:var(--text-muted)">À découvrir — ${missingIds.length} survivants</div>
        <div class="survivor-grid">
          ${missingIds.map(id => silhouetteCard(id)).join('')}
        </div>
      </div>` : ''}`
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
  const r       = RARITY[sv.rarity] || RARITY['D']
  const meta    = ROLE_META[sv.role] || {}
  const inTeam  = state.team.some(e => e && e.id === id)
  const isBoss  = sv.boss
  const sprite  = getSpriteUrl(sv)

  return `
    <div class="survivor-card sc-rarity--${sv.rarity.toLowerCase()} ${inTeam ? 'in-team' : ''}"
      style="background:${r.bg};border-color:${inTeam ? r.color : r.color + '44'}"
      onclick="window.showSurvivorModal('${id}')"
      title="${sv.name} — ${sv.role}\n${sv.desc}${copies > 1 ? `\n×${copies} copies` : ''}">

      <!-- Rareté -->
      <div class="sc-rarity" style="color:${r.color}">${r.label}</div>

      <!-- Sprite ou icône fallback -->
      <div class="sc-sprite-wrap">
        ${sprite
          ? `<img class="sc-sprite" src="${sprite}" alt="${sv.name}">`
          : `<div class="sc-class-icon">${classIconHtml(meta, 40, meta.classColor || r.color)}</div>`}
      </div>
      <div class="sc-subclass" style="color:${r.color}">${meta.globalClass || sv.role}</div>

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
      ${(() => { const lv = (state.survivorUpgrades || {})[id] || 0; return lv > 0 ? `<div class="survivor-card-upgrade">+${lv}</div>` : '' })()}
    </div>`
}

function silhouetteCard(id) {
  const sv   = SURVIVORS.find(x => x.id === id)
  if (!sv) return ''
  const r    = RARITY[sv.rarity] || RARITY['D']
  const meta = ROLE_META[sv.role] || {}
  // Utilise le sprite existant en silhouette CSS (grayscale + très sombre)
  const sprite = getSpriteUrl(sv)
  return `
    <div class="survivor-card silhouette sc-rarity--${sv.rarity.toLowerCase()}" title="Inconnu — Envoyez des signaux pour le découvrir">
      <div class="sc-rarity" style="color:${r.color};opacity:0.5">${r.label}</div>
      <div class="sc-sprite-wrap">
        ${sprite
          ? `<img class="sc-sprite sc-sprite-silhouette" src="${sprite}" alt="???">`
          : `<div class="sc-silhouette-placeholder" style="color:${r.color}40">?</div>`}
      </div>
      <div class="sc-subclass" style="color:${r.color};opacity:0.4">${meta.globalClass || sv.role}</div>
      <div class="sc-name" style="color:#ffffff22;font-size:10px">???</div>
    </div>`
}

function statBar(label, value, max, color) {
  const pct = Math.min(100, Math.round(value / max * 100))
  return `<div class="sc-stat-row">
    <span class="sc-stat-dot" style="background:${color}"></span>
    <span class="sc-stat-label">${label}</span>
    <div class="sc-stat-track"><div class="sc-stat-fill" style="width:${pct}%;background:${color}"></div></div>
  </div>`
}

window.renderCollection = renderCollection

window._setFilterRarity = function(r) {
  filterRarity = r
  filterTeam   = false
  renderCollection(window._state)
}
window._setFilterTeam = function() {
  filterTeam   = !filterTeam
  filterRarity = 'all'
  renderCollection(window._state)
}

window.fuseSurvivorUI = function(id) {
  const S = window._state
  if (!S) return
  const fusion = checkFusion(S, id)
  saveState(S)
  if (fusion) {
    if (window.showToast) window.showToast(`⚡ ${fusion.message}`, 'fusion', 3500)
  }
  document.getElementById('survivor-modal').style.display = 'none'
  renderCollection(S)
}

window.upgradeSurvivorUI = function(id) {
  const S = window._state
  if (!S) return
  const result = upgradeSurvivor(S, id)
  if (result.error) {
    if (window.showToast) window.showToast(result.error, 'info')
    return
  }
  saveState(S)
  if (window.showToast) window.showToast(`🧬 ${SURVIVORS.find(x => x.id === id)?.name} → Niv. ${result.newLevel} !`, 'fusion', 3000)
  window.showSurvivorModal(id)
  renderCollection(S)
}

const RECYCLE_DNA = { D: 10, E: 30, L: 100 }

// ── Modal fiche survivant ──
window.showSurvivorModal = function(id) {
  const S   = window._state
  const sv  = SURVIVORS.find(x => x.id === id)
  if (!sv || !S) return
  const r      = RARITY[sv.rarity] || RARITY['D']
  const meta   = ROLE_META[sv.role] || {}
  const copies = S.collection.filter(p => p.id === id).length
  const inTeam = S.team.some(e => e && e.id === id)
  const idle   = IDLE_RATE[sv.rarity] || 0

  const sprite = getSpriteUrl(sv)
  const modal = document.getElementById('survivor-modal')
  if (!modal) return

  modal.innerHTML = `
    <div class="sv-modal-box" style="border-color:${r.color}">
      <button class="sv-modal-close" onclick="document.getElementById('survivor-modal').style.display='none'">✕</button>

      <div class="sv-modal-header" style="background:${r.bg}">
        ${sprite
          ? `<div class="sv-modal-sprite-wrap"><img class="sv-modal-sprite" src="${sprite}" alt="${sv.name}"></div>`
          : `<div class="sv-modal-class-icon">${classIconHtml(meta, 56, meta.classColor || r.color)}</div>`}
        <div>
          <div class="sv-modal-name" style="color:${r.text}">${sv.name}</div>
          <div class="sv-modal-role" style="color:${r.color}">${meta.globalClass || ''} · ${sv.role}</div>
          <div class="sv-modal-rarity" style="color:${r.color}">${r.label}</div>
        </div>
      </div>

      <div class="sv-modal-body">
        <div class="sv-modal-desc">${sv.desc}</div>

        <div class="sv-modal-stats">
          ${modalStat('HP',  sv.hp,  600, '#5AE05A')}
          ${modalStat('ATK', sv.atk, 900, '#E05A4A')}
          ${modalStat('DEF', sv.def, 300, '#4A8FE0')}
          ${modalStat('SPD', sv.spd, 375, '#E0C44A')}
        </div>

        <div class="sv-modal-meta">
          <div class="sv-modal-meta-row">
            <span>Copies possédées</span>
            <strong>${copies}</strong>
          </div>
          <div class="sv-modal-meta-row">
            <span>Fusion dans</span>
            <strong>${copies >= 3 ? '✓ Prête' : `${3 - copies} copie(s)`}</strong>
          </div>
          <div class="sv-modal-meta-row">
            <span>Idle au repos</span>
            <strong style="color:#E0C44A">+${idle} caps/s</strong>
          </div>
        </div>

        ${!sv.boss ? upgradeSection(id, S) : ''}

        ${!sv.boss && copies >= 3 && sv.rarity !== 'L' ? `
          <button class="sv-modal-fusion-btn" onclick="window.fuseSurvivorUI('${id}')">
            ⚡ Fusionner ×3 → ${RARITY_ORDER[RARITY_ORDER.indexOf(sv.rarity) + 1] || '?'}
          </button>` : ''}

        ${!sv.boss && copies >= 3 ? recycleSection(id, copies, sv.rarity) : ''}

        ${!sv.boss ? `
          <button class="btn-danger sv-modal-equip"
            onclick="window.toggleTeamUI('${id}');window.renderCollection(window._state);document.getElementById('survivor-modal').style.display='none'">
            ${inTeam ? '— Retirer de l\'équipe' : '+ Ajouter à l\'équipe'}
          </button>` : `
          <div style="text-align:center;font-size:11px;color:var(--text-muted);padding:8px">
            Survivant boss — non équipable
          </div>`}
      </div>
    </div>`

  modal.style.display = 'flex'
}

function recycleSection(id, copies, rarity) {
  const stacks   = Math.floor(copies / 3)
  const dnaPerStack = RECYCLE_DNA[rarity] || 10
  const totalDna = stacks * dnaPerStack
  return `
    <div class="sv-modal-recycle">
      <div class="sv-modal-recycle-title">♻ Recyclage</div>
      <div class="sv-modal-recycle-desc">
        Convertit ×3 copies en <strong>${dnaPerStack} ADN</strong>. Vous avez <strong>${stacks} lot${stacks > 1 ? 's' : ''}</strong> disponible${stacks > 1 ? 's' : ''}.
      </div>
      <div class="sv-modal-recycle-row">
        ${stacks >= 1 ? `
          <button class="sv-modal-recycle-btn" onclick="window.recycleSurvivorUI('${id}', 1)">
            ×3 → +${dnaPerStack} 🧬
          </button>` : ''}
        ${stacks >= 2 ? `
          <button class="sv-modal-recycle-btn" onclick="window.recycleSurvivorUI('${id}', ${stacks})">
            Tout (×${stacks * 3}) → +${totalDna} 🧬
          </button>` : ''}
      </div>
    </div>`
}

function upgradeSection(id, S) {
  const level   = (S.survivorUpgrades || {})[id] || 0
  const maxed   = level >= UPGRADE_MAX
  const cost    = maxed ? null : UPGRADE_COST[level]
  const canBuy  = !maxed && S.dna >= cost
  const statBonus = `+${level * 15}%`

  return `
    <div class="sv-modal-upgrade">
      <div class="sv-modal-upgrade-header">
        <span>Amélioration ADN</span>
        <span class="sv-modal-upgrade-level">Niv. ${level}/${UPGRADE_MAX}</span>
      </div>
      <div class="sv-modal-upgrade-bars">
        ${Array.from({ length: UPGRADE_MAX }, (_, i) => `
          <div class="sv-upgrade-pip ${i < level ? 'filled' : ''}"></div>`).join('')}
      </div>
      ${level > 0 ? `<div class="sv-modal-upgrade-bonus">Stats actuelles : <strong>${statBonus}</strong></div>` : ''}
      ${maxed
        ? `<div class="sv-modal-upgrade-maxed">★ Niveau maximum atteint</div>`
        : `<button class="sv-modal-upgrade-btn ${canBuy ? '' : 'disabled'}"
             onclick="window.upgradeSurvivorUI('${id}')">
             🧬 Améliorer — ${cost} ADN
             ${!canBuy ? `<span style="font-size:10px;opacity:0.6">(${S.dna}/${cost})</span>` : ''}
           </button>`}
    </div>`
}

function modalStat(label, value, max, color) {
  const pct = Math.min(100, Math.round(value / max * 100))
  return `
    <div class="sv-modal-stat-row">
      <span class="sv-modal-stat-dot" style="background:${color}"></span>
      <span class="sv-modal-stat-label">${label}</span>
      <div class="sv-modal-stat-track">
        <div class="sv-modal-stat-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <span class="sv-modal-stat-val">${value}</span>
    </div>`
}
