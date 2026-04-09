// ── SHELTER 7 — Tour Radio : Signal de détresse (gacha rework) ──
import { SURVIVORS, RARITY, RARITY_ORDER, ROLE_META, getSpriteUrl, classIconHtml } from '../data/survivors.js'
import { SIGNAL_CONFIG } from '../core/economy.js'

let animRunning  = false
let revealQueue  = []
let revealIndex  = 0
let revealDone   = false
let newSurvivorIds = []   // IDs de survivants nouvellement découverts

// ══════════════════════════════
// SÉLECTEUR DE SIGNAUX
// ══════════════════════════════
export function renderPacks(state) {
  const pityDiv  = document.getElementById('pity-display')
  const packsDiv = document.getElementById('pack-buttons')
  const ratesDiv = document.getElementById('drop-rates')
  if (!packsDiv) return

  // Mini-HUD ressources
  const resHud = document.getElementById('packs-resource-hud')
  if (resHud) {
    resHud.innerHTML = `
      <div class="packs-hud">
        <span class="packs-hud-item"><img class="res-icon" src="assets/icons/res-capsule.png" alt="💊"> <span id="phud-caps">${Math.floor(state.capsules)}</span></span>
        <span class="packs-hud-item packs-hud-radium">☢ <span id="phud-rad">${Math.floor(state.radium)}</span></span>
        <span class="packs-hud-item">🧬 <span id="phud-dna">${Math.floor(state.dna)}</span></span>
      </div>`
  }

  // Pity compact
  if (pityDiv) {
    pityDiv.innerHTML = `
      <div class="pity-bar-row">
        <div class="pity-item">
          <span class="pity-label">Expert garanti</span>
          <div class="pity-track">
            <div class="pity-fill pity-e" style="width:${Math.min(100, Math.round(state.pityE / 10 * 100))}%"></div>
          </div>
          <span class="pity-count">${state.pityE}/10</span>
          <span class="pity-hint">Garanti au 10e signal</span>
        </div>
        <div class="pity-item">
          <span class="pity-label">Légende garanti</span>
          <div class="pity-track">
            <div class="pity-fill pity-l" style="width:${Math.min(100, Math.round(state.pityL / 50 * 100))}%"></div>
          </div>
          <span class="pity-count">${state.pityL}/50</span>
          <span class="pity-hint">Garanti au 50e signal</span>
        </div>
      </div>`
  }

  // Signal cards
  const SIGNAL_META = {
    basic:   { label: 'Fréquence Locale',      desc: 'Signal de base — survivants proches',   icon: '📻', theme: 'basic'   },
    urgent:  { label: 'Alerte Urgente',         desc: 'Fréquence longue portée — meilleurs odds', icon: '🚨', theme: 'urgent'  },
    premium: { label: 'Signal Radium',          desc: 'Transmission elite — recrues légendaires', icon: '☢',  theme: 'premium' },
  }

  packsDiv.innerHTML = Object.entries(SIGNAL_CONFIG).map(([key, cfg]) => {
    const meta  = SIGNAL_META[key]
    const costIcon = cfg.currency === 'capsules' ? '💊' : '☢'
    const wD = cfg.weights.D, wE = cfg.weights.E, wL = cfg.weights.L
    const radiumHint = cfg.currency === 'radium'
      ? `<div class="signal-radium-hint">Obtenir du radium ☢ : missions journalières · boss de zone · talent t7</div>`
      : ''
    return `
      <div class="signal-card signal-card--${meta.theme}" onclick="window.openSignalUI('${key}')">
        <div class="signal-card-bg"></div>
        <div class="signal-card-content">
          <div class="signal-card-top">
            <div class="signal-card-icon">${meta.icon}</div>
            <div class="signal-card-info">
              <div class="signal-card-name">${meta.label}</div>
              <div class="signal-card-desc">${meta.desc}</div>
              <div class="signal-card-count">${cfg.count} survivants recrutés</div>
            </div>
          </div>
          ${radiumHint}
          <div class="signal-card-rates">
            <div class="signal-rate-bar">
              <span class="signal-rate-label" style="color:var(--rarity-d)">D</span>
              <div class="signal-rate-track"><div class="signal-rate-fill" style="width:${wD}%;background:var(--rarity-d)"></div></div>
              <span class="signal-rate-pct">${wD}%</span>
            </div>
            <div class="signal-rate-bar">
              <span class="signal-rate-label" style="color:var(--rarity-e)">E</span>
              <div class="signal-rate-track"><div class="signal-rate-fill" style="width:${wE}%;background:var(--rarity-e)"></div></div>
              <span class="signal-rate-pct">${wE}%</span>
            </div>
            <div class="signal-rate-bar">
              <span class="signal-rate-label" style="color:var(--rarity-l)">L</span>
              <div class="signal-rate-track"><div class="signal-rate-fill" style="width:${wL * 3}%;background:var(--rarity-l)"></div></div>
              <span class="signal-rate-pct">${wL}%</span>
            </div>
          </div>
          <button class="signal-card-btn signal-card-btn--${meta.theme}" onclick="event.stopPropagation();window.openSignalUI('${key}')">
            ${cfg.cost} ${costIcon} — Envoyer Signal
          </button>
        </div>
      </div>`
  }).join('')

  if (ratesDiv) ratesDiv.innerHTML = '' // rates now inline on cards
}

// ══════════════════════════════
// ANIMATION REVEAL — NOUVELLE VERSION ÉPIQUE
// ══════════════════════════════
export function playSignalAnim(survivors, newIds = []) {
  if (animRunning) return
  animRunning      = true
  revealQueue      = survivors
  revealIndex      = 0
  revealDone       = false
  newSurvivorIds   = newIds

  const modal = document.getElementById('pack-modal')
  if (!modal) return

  // Reset & build full-screen structure
  modal.innerHTML = `
    <div id="pm-backdrop" class="pm-backdrop">
      <img class="pm-bg-img" src="assets/backgrounds/packs.png" alt="" onerror="this.style.display='none'">
      <div class="pm-bg-overlay"></div>
    </div>

    <div class="pm-ui">
      <!-- Intro phase -->
      <div id="pm-intro" class="pm-intro">
        <div class="pm-radar">
          <div class="pm-radar-ring r1"></div>
          <div class="pm-radar-ring r2"></div>
          <div class="pm-radar-ring r3"></div>
          <div class="pm-radar-center">📡</div>
        </div>
        <div id="pm-intro-text" class="pm-intro-text">Signal capté…</div>
        <div class="pm-intro-sub">Analyse des survivants en cours</div>
      </div>

      <!-- Reveal phase (hidden initially) -->
      <div id="pm-reveal" class="pm-reveal" style="display:none">
        <!-- Large centered card -->
        <div id="pm-spotlight" class="pm-spotlight">
          <div id="pm-card" class="pm-card">
            <div id="pm-card-inner" class="pm-card-inner">
              <div class="pm-card-face pm-card-front">
                <div class="pm-card-question">?</div>
              </div>
              <div id="pm-card-back" class="pm-card-face pm-card-back"></div>
            </div>
          </div>
          <div id="pm-flash" class="pm-flash"></div>
        </div>
        <div id="pm-hint" class="pm-hint">Appuyez pour révéler</div>
        <!-- Tray: already revealed cards -->
        <div id="pm-tray" class="pm-tray"></div>
      </div>

      <!-- Summary phase (hidden initially) -->
      <div id="pm-summary" class="pm-summary" style="display:none">
        <div class="pm-summary-title">Recrutement terminé</div>
        <div id="pm-summary-grid" class="pm-summary-grid"></div>
        <button class="pm-close-btn" onclick="window.closePackModal()">
          ✓ Intégrer à la base
        </button>
      </div>
    </div>
  `

  modal.style.display = 'flex'
  modal.onclick = null

  // Phase 1: intro animation (1.6s)
  const introText = document.getElementById('pm-intro-text')
  setTimeout(() => { if (introText) introText.textContent = 'Survivants localisés !' }, 900)
  setTimeout(() => startRevealPhase(), 1700)
}

function startRevealPhase() {
  const intro  = document.getElementById('pm-intro')
  const reveal = document.getElementById('pm-reveal')
  if (intro)  intro.style.display  = 'none'
  if (reveal) reveal.style.display = 'flex'

  // Pre-fill tray with face-down placeholders
  const tray = document.getElementById('pm-tray')
  if (tray) {
    tray.innerHTML = revealQueue.map((_, i) =>
      `<div class="tray-pip tray-pip--hidden" id="tp${i}"></div>`
    ).join('')
  }

  // Click anywhere to reveal next
  const modal = document.getElementById('pack-modal')
  if (modal) modal.onclick = () => { if (!revealDone) advanceReveal() }

  // Auto-start first card
  setTimeout(() => advanceReveal(), 400)
}

function advanceReveal() {
  if (revealIndex >= revealQueue.length) {
    showSummary()
    return
  }

  const sv = revealQueue[revealIndex]
  const sv_data = SURVIVORS.find(x => x.id === sv.id) || sv
  const r  = RARITY[sv.rarity] || RARITY['D']
  const meta = ROLE_META[sv_data.role] || {}
  const sprite = getSpriteUrl(sv_data)
  const idx = revealIndex
  revealIndex++

  // Build back of card
  const back = document.getElementById('pm-card-back')
  if (back) {
    back.style.background  = r.bg
    back.style.borderColor = r.color
    back.innerHTML = `
      <div class="pm-card-rarity" style="color:${r.color}">${r.label}</div>
      ${sprite
        ? `<img class="pm-card-sprite" src="${sprite}" alt="${sv_data.name}">`
        : `<div class="pm-card-icon">${classIconHtml(meta, 64, meta.classColor || r.color)}</div>`}
      <div class="pm-card-name" style="color:${r.text}">${sv_data.name}</div>
      <div class="pm-card-role" style="color:${r.color}">${meta.globalClass || sv_data.role}</div>
      <div class="pm-card-stats">
        <span>♥ ${sv_data.hp}</span>
        <span>⚔ ${sv_data.atk}</span>
        <span>🛡 ${sv_data.def}</span>
      </div>`
  }

  // Reset card to face-down
  const inner = document.getElementById('pm-card-inner')
  if (inner) {
    inner.style.transition = 'none'
    inner.classList.remove('flipped')
    void inner.offsetWidth // force reflow
    inner.style.transition = ''
  }

  // Update hint
  const hint = document.getElementById('pm-hint')
  const remaining = revealQueue.length - revealIndex
  if (hint) {
    hint.textContent = remaining > 0
      ? `${idx + 1}/${revealQueue.length} — Appuyez pour révéler`
      : `Dernier survivant !`
  }

  // Disable click during animation
  const modal = document.getElementById('pack-modal')
  if (modal) modal.onclick = null

  // Flip after short delay
  setTimeout(() => {
    if (inner) inner.classList.add('flipped')

    // Rarity effects after flip
    setTimeout(() => {
      triggerRarityEffect(sv.rarity, r)

      // Update tray pip
      const pip = document.getElementById('tp' + idx)
      if (pip) {
        pip.className = `tray-pip tray-pip--${sv.rarity.toLowerCase()}`
        pip.style.borderColor = r.color
        pip.style.background  = r.bg
        if (sprite) pip.innerHTML = `<img src="${sprite}" style="height:100%;width:100%;object-fit:contain;image-rendering:pixelated">`
      }

      // Re-enable click after delay
      const minDelay = sv.rarity === 'L' ? 2200 : sv.rarity === 'E' ? 1200 : 700
      setTimeout(() => {
        if (modal) modal.onclick = () => { if (!revealDone) advanceReveal() }
        // Auto-advance for D rarity
        if (sv.rarity === 'D') setTimeout(() => advanceReveal(), 1000)
      }, minDelay)
    }, 300)
  }, 250)
}

function triggerRarityEffect(rarity, r) {
  const flash = document.getElementById('pm-flash')
  const card  = document.getElementById('pm-card')

  if (rarity === 'L') {
    // Golden explosion
    if (flash) {
      flash.className = 'pm-flash pm-flash--l'
      setTimeout(() => { flash.className = 'pm-flash' }, 1000)
    }
    if (card) {
      card.classList.add('pm-card--shake')
      setTimeout(() => card.classList.remove('pm-card--shake'), 600)
    }
    document.getElementById('pm-spotlight')?.classList.add('pm-spotlight--l')
    setTimeout(() => document.getElementById('pm-spotlight')?.classList.remove('pm-spotlight--l'), 2500)
    if (window.playLegendarySound) window.playLegendarySound()
    else if (window.playVictorySound) window.playVictorySound()

  } else if (rarity === 'E') {
    // Electric pulse
    if (flash) {
      flash.className = 'pm-flash pm-flash--e'
      setTimeout(() => { flash.className = 'pm-flash' }, 600)
    }
    if (card) {
      card.style.boxShadow = `0 0 30px ${r.color}, 0 0 60px ${r.color}44`
      setTimeout(() => { if (card) card.style.boxShadow = '' }, 800)
    }
    if (window.playHitSound) window.playHitSound()
  }
}

function showSummary() {
  revealDone = true
  const modal   = document.getElementById('pack-modal')
  const reveal  = document.getElementById('pm-reveal')
  const summary = document.getElementById('pm-summary')
  const grid    = document.getElementById('pm-summary-grid')
  if (modal) modal.onclick = null

  if (reveal)  reveal.style.display  = 'none'
  if (summary) summary.style.display = 'flex'

  if (grid) {
    grid.innerHTML = revealQueue.map(sv => {
      const sv_data = SURVIVORS.find(x => x.id === sv.id) || sv
      const r       = RARITY[sv.rarity] || RARITY['D']
      const sprite  = getSpriteUrl(sv_data)
      const meta    = ROLE_META[sv_data.role] || {}
      const isNew   = newSurvivorIds.includes(sv.id)
      return `
        <div class="pm-summary-card" style="background:${r.bg};border-color:${r.color}">
          ${isNew ? `<div class="pm-summary-new">NOUVEAU</div>` : ''}
          ${sprite
            ? `<img class="pm-summary-sprite" src="${sprite}" alt="${sv_data.name}">`
            : `<div class="pm-summary-icon">${classIconHtml(meta, 40, meta.classColor || r.color)}</div>`}
          <div class="pm-summary-name" style="color:${r.text}">${sv_data.name}</div>
          <div class="pm-summary-rarity" style="color:${r.color}">${r.label}</div>
        </div>`
    }).join('')
  }
}

window.closePackModal = function() {
  animRunning = false
  revealDone  = false
  const modal = document.getElementById('pack-modal')
  if (modal) { modal.style.display = 'none'; modal.onclick = null }

  // Déclenche la narration en attente (first_expert / first_legendary)
  const trigger = window._pendingGachaNarr
  if (trigger) {
    window._pendingGachaNarr = null
    const S = window._state
    if (S && window.getNarration) {
      const narr = window.getNarration(trigger, S)
      if (narr && window.showNarration) {
        window.markNarrationShown?.(trigger, S)
        window.showNarration(narr, () => {})
      }
    }
  }
}

window.playPackAnim = playSignalAnim
window.renderPacks  = renderPacks
