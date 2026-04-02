import { POGS, RARITY } from '../data/pogs.js'
import { KINIS } from '../data/kinis.js'

export function renderTeam(state) {
  const slotsDiv  = document.getElementById('team-slots')
  const bonusDiv  = document.getElementById('team-bonus')
  const kiniDiv   = document.getElementById('active-kini-info')
  if (!slotsDiv) return

  const maxSlots = state.talentsUnlocked.includes('t9') ? 11 : 10

  // ── Slots d'équipement ──
  slotsDiv.style.display  = 'flex'
  slotsDiv.style.flexWrap = 'wrap'
  slotsDiv.style.gap      = '5px'
  slotsDiv.style.margin   = '8px 0'

  slotsDiv.innerHTML = Array.from({ length: maxSlots }, (_, i) => {
    const p = state.equippedPogs[i]
    if (p) {
      const pg = POGS.find(x => x.id === p.id)
      const r  = RARITY[pg.rarity]
      return `
        <div class="pog-circle"
          style="background:${r.bg};border-color:${r.color};color:${r.text}"
          onclick="toggleEquipUI('${p.id}')"
          title="${pg.name} — ${r.label}\n${pg.desc}">
          <span style="font-size:12px">${pg.icon}</span>
        </div>`
    }
    return `<div class="slot-empty" onclick="setTab('pogs')" title="Ajouter un pog">+</div>`
  }).join('')

  // ── Synergies ──
  const bonuses = calcSynergies(state)
  if (bonusDiv) {
    bonusDiv.style.fontSize = '11px'
    bonusDiv.style.color    = 'var(--text-muted)'
    bonusDiv.style.margin   = '0 0 8px'
    bonusDiv.textContent    = bonuses.length ? bonuses.join(' · ') : 'Aucune synergie active'
  }

  // ── Kini actif ──
  if (kiniDiv) {
    const allKinis = [...KINIS]
    const k   = allKinis[state.selectedKini] || allKinis[0]
    const lv  = state.kiniLevels[state.selectedKini] || 1
    const pwr = Math.round(k.power * (1 + (lv - 1) * 0.12))
    kiniDiv.innerHTML = `
      <div style="font-size:12px;font-weight:500;margin-bottom:3px">
        ${k.icon} ${k.name} <span style="color:var(--purple);font-size:11px">Lv${lv}</span>
      </div>
      <div style="font-size:11px;color:var(--text-muted)">
        Puissance: ${pwr} · Vitesse: ${k.speed.toFixed(1)} · Critique: ${Math.round(k.chance * 100)}%
      </div>`
  }
}

function calcSynergies(state) {
  const bonuses = []
  const equipped = state.equippedPogs.filter(Boolean)
  const effects  = equipped.map(p => p.effect || '')

  const idleCount  = effects.filter(e => e.startsWith('idle+')).length
  const flipCount  = effects.filter(e => e.startsWith('flips+')).length
  const chainCount = effects.filter(e => e.startsWith('chain')).length
  const critCount  = effects.filter(e => e.startsWith('crit+')).length

  if (idleCount  >= 2) bonuses.push('Duo Idle : gains ×1.5')
  if (flipCount  >= 3) bonuses.push('Trio Flip : +3 flips bonus')
  if (chainCount >= 1) bonuses.push('Synergie Chaîne active')
  if (critCount  >= 2) bonuses.push('Duo Critique : +10% crit')

  return bonuses
}

window.renderTeam = renderTeam