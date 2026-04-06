// ── SHELTER SURVIVOR — Signaux de détresse (gacha) ──
import { RARITY, RARITY_ORDER } from '../data/survivors.js'
import { SIGNAL_CONFIG } from '../core/economy.js'

let animRunning = false

export function renderPacks(state) {
  const pityDiv  = document.getElementById('pity-display')
  const packsDiv = document.getElementById('pack-buttons')
  const ratesDiv = document.getElementById('drop-rates')
  if (!packsDiv) return

  if (pityDiv) {
    pityDiv.innerHTML = `
      <div class="card">
        <div class="card-title">Garanties</div>
        <div style="display:flex;gap:10px">
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Expert garanti</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.round(state.pityE / 10 * 100)}%;background:var(--rarity-e)"></div>
            </div>
            <div style="font-size:11px;margin-top:2px">${state.pityE}/10 signaux</div>
          </div>
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Légende garanti</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.round(state.pityL / 50 * 100)}%;background:var(--rarity-l)"></div>
            </div>
            <div style="font-size:11px;margin-top:2px">${state.pityL}/50 signaux</div>
          </div>
        </div>
      </div>`
  }

  packsDiv.innerHTML = `
    <div class="card">
      <div class="card-title">Signaux de détresse</div>
      ${Object.entries(SIGNAL_CONFIG).map(([key, cfg]) => `
        <div class="signal-row" onclick="window.openSignalUI('${key}')">
          <div>
            <div style="font-size:13px;font-weight:500">${cfg.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">
              ${cfg.count} survivants · ${cfg.currency === 'capsules' ? '💊 capsules' : '☢ radium'}
            </div>
          </div>
          <button class="btn-danger" onclick="event.stopPropagation();window.openSignalUI('${key}')">
            ${cfg.cost} ${cfg.currency === 'capsules' ? '💊' : '☢'}
          </button>
        </div>`).join('')}
    </div>`

  if (ratesDiv) {
    ratesDiv.innerHTML = `
      <div class="card">
        <div class="card-title">Taux de recrutement</div>
        <table style="width:100%;font-size:11px;border-collapse:collapse">
          <tr>
            <td></td>
            <td style="text-align:center;color:var(--text-muted)">Basique</td>
            <td style="text-align:center;color:var(--text-muted)">Urgent</td>
            <td style="text-align:center;color:var(--text-muted)">Premium</td>
          </tr>
          ${RARITY_ORDER.map(r => {
            const ri = RARITY[r]
            return `<tr>
              <td style="padding:3px 0">
                <span class="badge" style="background:${ri.bg};color:${ri.text}">${ri.label}</span>
              </td>
              <td style="text-align:center;color:var(--text-muted)">${SIGNAL_CONFIG.basic.weights[r]}%</td>
              <td style="text-align:center;color:var(--text-muted)">${SIGNAL_CONFIG.urgent.weights[r]}%</td>
              <td style="text-align:center;color:var(--text-muted)">${SIGNAL_CONFIG.premium.weights[r]}%</td>
            </tr>`
          }).join('')}
        </table>
      </div>`
  }
}

export function playSignalAnim(survivors) {
  if (animRunning) return
  animRunning = true

  const modal    = document.getElementById('pack-modal')
  const box      = document.getElementById('pack-modal-box')
  const stage    = document.getElementById('pack-stage')
  const disc     = document.getElementById('pack-disc')
  const reveal   = document.getElementById('pack-reveal')
  const closeBtn = document.getElementById('pack-close')
  if (!modal) return

  const topRar = survivors.reduce((best, s) =>
    RARITY_ORDER.indexOf(s.rarity) > RARITY_ORDER.indexOf(best) ? s.rarity : best, 'D')
  const ri = RARITY[topRar]

  box.style.borderColor  = 'var(--gray-border)'
  disc.className         = ''
  disc.style.background  = 'var(--gray-bg)'
  disc.style.borderColor = 'var(--gray-border)'
  disc.textContent       = '📡'
  disc.style.display     = 'flex'
  reveal.innerHTML       = ''
  closeBtn.style.display = 'none'
  stage.textContent      = 'Signal capté...'
  stage.style.color      = 'var(--text-muted)'
  modal.style.display    = 'flex'

  setTimeout(() => { disc.classList.add('spin'); stage.textContent = 'Localisation en cours...' }, 100)

  setTimeout(() => {
    disc.classList.remove('spin')
    disc.classList.add('pop')
    disc.style.background  = ri.bg
    disc.style.borderColor = ri.color
    disc.style.color       = ri.text
    disc.textContent       = survivors.length > 1 ? '×' + survivors.length : '1'
    box.style.borderColor  = ri.color
    stage.textContent      = 'Survivant(s) trouvé(s) !'
    stage.style.color      = ri.text
  }, 1400)

  setTimeout(() => {
    disc.style.display = 'none'
    reveal.innerHTML = survivors.map((_, i) => `
      <div class="rev-item" id="ri${i}">
        <div class="rev-disc" id="rd${i}">?</div>
        <div class="rev-rarity" id="rr${i}"></div>
        <div class="rev-name" id="rn${i}"></div>
      </div>`).join('')

    survivors.forEach((sv, i) => {
      const r = RARITY[sv.rarity]
      setTimeout(() => {
        const rd = document.getElementById('rd' + i)
        const rr = document.getElementById('rr' + i)
        const rn = document.getElementById('rn' + i)
        if (!rd) return
        rd.style.background  = r.bg
        rd.style.borderColor = r.color
        rd.style.color       = r.text
        rd.innerHTML         = `<span style="font-size:20px">${sv.icon}</span>`
        rr.textContent       = r.label
        rr.style.background  = r.bg
        rr.style.color       = r.text
        rn.textContent       = sv.name
        document.getElementById('ri' + i)?.classList.add('show')
      }, i * 280)
    })

    setTimeout(() => { closeBtn.style.display = 'block' }, survivors.length * 280 + 400)
  }, 2100)
}

window.closePackModal = function() {
  animRunning = false
  const modal = document.getElementById('pack-modal')
  if (modal) modal.style.display = 'none'
  const disc = document.getElementById('pack-disc')
  if (disc) disc.style.display = 'flex'
}

window.playPackAnim = playSignalAnim
window.renderPacks  = renderPacks
