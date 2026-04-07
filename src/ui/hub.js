// ── SHELTER SURVIVOR — Hub (camp de base) ──
import { SURVIVORS, RARITY, ROLE_META } from '../data/survivors.js'
import { ZONES } from '../data/zones.js'

export function renderHub(state) {
  renderHUD(state)
  renderTeam(state)
  renderZoneFrise(state)
}

// ── HUD ressources ──
function renderHUD(state) {
  const el = id => document.getElementById(id)
  if (el('d-capsules')) el('d-capsules').textContent = Math.floor(state.capsules)
  if (el('d-radium'))   el('d-radium').textContent   = Math.floor(state.radium)
  if (el('d-dna'))      el('d-dna').textContent      = Math.floor(state.dna)
  if (el('d-tokens'))   el('d-tokens').textContent   = Math.floor(state.tokens)

  const lvl   = state.accountLevel
  const xpMax = (lvl + 1) * 100
  if (el('acc-lvl-badge')) el('acc-lvl-badge').textContent = lvl + 1
  if (el('acc-xp-fill'))   el('acc-xp-fill').style.width   = Math.round(state.accountXP / xpMax * 100) + '%'

  let idleRate = 0
  if (state.team) state.team.forEach(s => {
    if (s?.effect?.startsWith('idle+')) idleRate += parseFloat(s.effect.split('+')[1])
  })
  if (el('idle-display')) el('idle-display').textContent = `Idle: +${Math.round(idleRate * 10) / 10} caps/s`
}

// ── Équipe (6 slots) ──
export function renderTeam(state) {
  const slotsDiv = document.getElementById('team-slots')
  const infoDiv  = document.getElementById('team-info')
  if (!slotsDiv) return

  slotsDiv.innerHTML = Array.from({ length: 6 }, (_, i) => {
    const s = state.team[i]
    if (!s) return `<div class="team-slot empty" onclick="window.setTab('survivors')" title="Ajouter un survivant">+</div>`
    const sv   = SURVIVORS.find(x => x.id === s.id)
    if (!sv) return ''
    const r    = RARITY[sv.rarity] || RARITY['D']
    const meta = ROLE_META[sv.role] || {}
    return `
      <div class="team-slot filled"
        style="background:${r.bg};border-color:${r.color}"
        onclick="window.toggleTeamUI('${s.id}')"
        title="${sv.name} — ${sv.role}\n${sv.desc}">
        <div class="ts-class-icon" style="color:${meta.classColor || r.color}">${meta.classIcon || ''}</div>
        <div class="ts-subclass" style="color:${r.color}">${sv.role}</div>
        <div class="ts-stats">
          <div class="ts-stat"><span style="color:#E05A4A">⚔</span>${sv.atk}</div>
          <div class="ts-stat"><span style="color:#4A8FE0">🛡</span>${sv.def}</div>
          <div class="ts-stat"><span style="color:#5AE05A">♥</span>${sv.hp}</div>
        </div>
        <div class="ts-name" style="color:${r.text}">${sv.name}</div>
      </div>`
  }).join('')

  if (infoDiv) {
    const count   = state.team.filter(Boolean).length
    const roles   = [...new Set(state.team.filter(Boolean).map(s => {
      const sv = SURVIVORS.find(x => x.id === s.id)
      return sv ? sv.role : ''
    }))]
    const synergy = calcTeamSynergy(roles)
    infoDiv.textContent = count > 0
      ? `${count}/6 survivants${synergy ? ` · ${synergy}` : ''}`
      : 'Aucun survivant — sélectionnez votre équipe'
  }
}

function calcTeamSynergy(roles) {
  const hasTank   = roles.some(r => r === 'Bouclier' || r === 'Blindé')
  const hasHealer = roles.some(r => r === 'Médic' || r === 'Biologiste')
  const hasDPS    = roles.some(r => r === 'Berserk' || r === 'Lame' || r === 'Ombre' || r === 'Pistard')
  if (hasTank && hasHealer && hasDPS) return '⚡ Équipe complète'
  if (hasTank && hasHealer)           return '🛡 Défense solide'
  if (hasTank && hasDPS)              return '⚔ Force brute'
  return ''
}

// ── Frise de progression des zones ──
export function renderZoneFrise(state) {
  const frise = document.getElementById('zone-frise')
  if (!frise) return

  frise.innerHTML = `
    <div class="zone-frise-inner">
      ${ZONES.map(z => {
        const unlocked = state.unlockedZones.includes(z.id)
        const isActive = state.activeZone === z.id
        const beaten   = state.bossesDefeated.includes(`z${z.id}`)
        return `
          <div class="zone-pip ${isActive ? 'active' : ''} ${beaten ? 'done' : ''} ${!unlocked ? 'locked' : ''}"
            onclick="${unlocked ? `window.selectZoneUI(${z.id})` : ''}"
            title="Z${z.id}: ${z.name}${!unlocked ? ' (verrouillée)' : ''}">
            <div class="zone-pip-num">${beaten ? '✓' : z.id}</div>
            <div class="zone-pip-label">Z${z.id}</div>
          </div>
          ${z.id < 7 ? '<div class="zone-pip-line"></div>' : ''}`
      }).join('')}
    </div>`
}

window.renderHUD  = renderHUD
window.renderTeam = renderTeam
window.renderHub  = renderHub

window.selectZoneUI = function(zoneId) {
  const S = window._state
  if (!S || !S.unlockedZones.includes(zoneId)) return
  S.activeZone = zoneId
  if (window.saveState) window.saveState(S)
  renderHub(S)
  if (window.setTab) window.setTab('combat')
  document.dispatchEvent(new CustomEvent('zoneChanged'))
}
