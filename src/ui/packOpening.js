import { RARITY, RARITY_ORDER } from '../data/pogs.js'
import { PACK_CONFIG } from '../core/economy.js'

let animRunning = false

export function renderPacks(state) {
  const pityDiv   = document.getElementById('pity-display')
  const packsDiv  = document.getElementById('pack-buttons')
  const ratesDiv  = document.getElementById('drop-rates')
  if (!packsDiv) return

  // ── Pity bars ──
  if (pityDiv) {
    pityDiv.innerHTML = `
      <div class="card">
        <div class="card-title">Pity system</div>
        <div style="display:flex;gap:10px">
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">
              Épique garanti
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.round(state.pityE / 10 * 100)}%;background:var(--purple)"></div>
            </div>
            <div style="font-size:11px;margin-top:2px">${state.pityE}/10 pulls</div>
          </div>
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">
              Légendaire garanti
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.round(state.pityL / 50 * 100)}%;background:#EF9F27"></div>
            </div>
            <div style="font-size:11px;margin-top:2px">${state.pityL}/50 pulls</div>
          </div>
        </div>
      </div>`
  }

  // ── Boutons de packs ──
  packsDiv.innerHTML = `
    <div class="card">
      <div class="card-title">Ouvrir des packs</div>
      ${Object.entries(PACK_CONFIG).map(([key, cfg]) => `
        <div style="
          display:flex;justify-content:space-between;align-items:center;
          padding:10px;border:0.5px solid var(--gray-border);
          border-radius:10px;margin-bottom:7px;cursor:pointer
        " onclick="openPackUI('${key}')">
          <div>
            <div style="font-size:13px;font-weight:500">${cfg.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">
              ${cfg.count} pogs · ${cfg.currency === 'gold' ? 'monnaie soft' : 'gemmes'}
            </div>
          </div>
          <button class="btn-primary" style="font-size:12px" onclick="event.stopPropagation();openPackUI('${key}')">
            ${cfg.cost} ${cfg.currency === 'gold' ? 'or' : '★'}
          </button>
        </div>`
      ).join('')}
    </div>`

  // ── Taux de drop ──
  if (ratesDiv) {
    ratesDiv.innerHTML = `
      <div class="card">
        <div class="card-title">Taux de drop</div>
        <table style="width:100%;font-size:11px;border-collapse:collapse">
          <tr>
            <td></td>
            <td style="text-align:center;color:var(--text-muted)">Basique</td>
            <td style="text-align:center;color:var(--text-muted)">Rare</td>
            <td style="text-align:center;color:var(--text-muted)">Premium</td>
          </tr>
          ${RARITY_ORDER.map(r => {
            const ri = RARITY[r]
            return `
              <tr>
                <td style="padding:3px 0">
                  <span class="badge" style="background:${ri.bg};color:${ri.text}">${ri.label}</span>
                </td>
                <td style="text-align:center;color:var(--text-muted)">${PACK_CONFIG.basic.weights[r]}%</td>
                <td style="text-align:center;color:var(--text-muted)">${PACK_CONFIG.rare.weights[r]}%</td>
                <td style="text-align:center;color:var(--text-muted)">${PACK_CONFIG.premium.weights[r]}%</td>
              </tr>`
          }).join('')}
        </table>
      </div>`
  }
}

// ── Animation d'ouverture de pack ──
export function playPackAnim(pogs) {
  if (animRunning) return
  animRunning = true

  const modal   = document.getElementById('pack-modal')
  const box     = document.getElementById('pack-modal-box')
  const stage   = document.getElementById('pack-stage')
  const disc    = document.getElementById('pack-disc')
  const reveal  = document.getElementById('pack-reveal')
  const closeBtn = document.getElementById('pack-close')
  if (!modal) return

  // Trouve la meilleure rareté obtenue
  const topRar = pogs.reduce((best, p) => {
    return RARITY_ORDER.indexOf(p.rarity) > RARITY_ORDER.indexOf(best)
      ? p.rarity : best
  }, 'C')
  const ri = RARITY[topRar]

  // Reset
  box.style.borderColor = 'var(--gray-border)'
  disc.className        = ''
  disc.style.background = 'var(--gray-bg)'
  disc.style.borderColor = 'var(--gray-border)'
  disc.textContent      = '?'
  disc.style.display    = 'flex'
  reveal.innerHTML      = ''
  closeBtn.style.display = 'none'
  stage.textContent     = 'Ouverture du pack...'
  stage.style.color     = 'var(--text-muted)'
  modal.style.display   = 'flex'

  // Phase 1 — spin
  setTimeout(() => {
    disc.classList.add('spin')
    stage.textContent = 'Le destin tourne...'
  }, 100)

  // Phase 2 — révélation couleur
  setTimeout(() => {
    disc.classList.remove('spin')
    disc.classList.add('pop')
    disc.style.background  = ri.bg
    disc.style.borderColor = ri.color
    disc.style.color       = ri.text
    disc.textContent       = pogs.length > 1 ? '×' + pogs.length : '1'
    box.style.borderColor  = ri.color
    stage.textContent      = 'Résultat !'
    stage.style.color      = ri.text
  }, 1400)

  // Phase 3 — reveal des pogs un par un
  setTimeout(() => {
    disc.style.display = 'none'
    reveal.innerHTML   = pogs.map((_, i) => `
      <div class="rev-item" id="ri${i}">
        <div class="rev-disc" id="rd${i}">?</div>
        <div class="rev-rarity" id="rr${i}"></div>
        <div class="rev-name" id="rn${i}"></div>
      </div>`).join('')

    pogs.forEach((pog, i) => {
      const r = RARITY[pog.rarity]
      setTimeout(() => {
        const rd = document.getElementById('rd' + i)
        const rr = document.getElementById('rr' + i)
        const rn = document.getElementById('rn' + i)
        if (!rd) return
        rd.style.background  = r.bg
        rd.style.borderColor = r.color
        rd.style.color       = r.text
        rd.innerHTML         = `<span style="font-size:20px">${pog.icon}</span>`
        rr.textContent       = r.label
        rr.style.background  = r.bg
        rr.style.color       = r.text
        rn.textContent       = pog.name
        document.getElementById('ri' + i).classList.add('show')
      }, i * 280)
    })

    setTimeout(() => {
      closeBtn.style.display = 'block'
    }, pogs.length * 280 + 400)
  }, 2100)
}

window.closePackModal = function () {
  animRunning = false
  const modal = document.getElementById('pack-modal')
  if (modal) modal.style.display = 'none'
  const disc = document.getElementById('pack-disc')
  if (disc) disc.style.display = 'flex'
}

window.playPackAnim   = playPackAnim
window.renderPacks    = renderPacks