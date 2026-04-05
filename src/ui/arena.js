import { POGS, RARITY } from '../data/pogs.js'
import { KINIS }        from '../data/kinis.js'

export function renderTeam(state) {
  const slotsDiv = document.getElementById('team-slots')
  const bonusDiv = document.getElementById('team-bonus')
  const friseDiv = document.getElementById('wave-frise')
  const kiniCard = document.getElementById('kini-card')

  if (friseDiv) renderFrise(state, friseDiv)
  if (kiniCard) renderKiniCard(state, kiniCard)
  if (!slotsDiv) return

  const maxSlots = state.talentsUnlocked.includes('t9') ? 11 : 10
  slotsDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;margin:8px 0'

  slotsDiv.innerHTML = Array.from({ length: maxSlots }, (_, i) => {
    const p = state.equippedPogs[i]
    if (p) {
      const pg = POGS.find(x => x.id === p.id)
      const r  = RARITY[pg.rarity]
      return `<div class="pog-circle"
        style="background:${r.bg};border-color:${r.color};color:${r.text}"
        onclick="toggleEquipUI('${p.id}')"
        title="${pg.name} — ${r.label}\n${pg.desc}">
        <span style="font-size:12px">${pg.icon}</span>
      </div>`
    }
    return `<div class="slot-empty" onclick="setTab('pogs')" title="Ajouter un pog">+</div>`
  }).join('')

  const bonuses = calcSynergies(state)
  if (bonusDiv) {
    bonusDiv.style.cssText = 'font-size:11px;color:var(--text-muted);margin:0 0 8px'
    bonusDiv.textContent   = bonuses.length ? bonuses.join(' · ') : 'Aucune synergie active'
  }
}

function renderKiniCard(state, container) {
  const k  = KINIS[state.selectedKini] || KINIS[0]
  const typeColors = {
    'Débutant':  { bg: '#E6F1FB', c: '#185FA5' },
    'Puissance': { bg: '#FAECE7', c: '#993C1D' },
    'Polyvalent':{ bg: '#EEEDFE', c: '#534AB7' },
    'Vitesse':   { bg: '#EAF3DE', c: '#3B6D11' },
    'Chanceux':  { bg: '#FAEEDA', c: '#854F0B' },
  }
  const tc = typeColors[k.type] || { bg: '#F1EFE8', c: '#5F5E5A' }

  container.innerHTML = `
    <div style="
      background:white;border:0.5px solid var(--gray-border);
      border-radius:14px;padding:12px 14px;margin-bottom:10px;
      display:flex;gap:12px;align-items:flex-start;
    ">
      <div style="
        width:50px;height:50px;border-radius:50%;flex-shrink:0;
        background:${tc.bg};border:2px solid ${tc.c};
        display:flex;align-items:center;justify-content:center;font-size:22px;
      ">${k.icon}</div>

      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="font-size:14px;font-weight:500">${k.name}</span>
          <span style="font-size:10px;padding:2px 7px;border-radius:10px;
            background:${tc.bg};color:${tc.c}">${k.type}</span>
          ${k.exclusive ? `<span style="font-size:10px;padding:2px 7px;border-radius:10px;
            background:#FAEEDA;color:#412402">Exclusif W${k.world}</span>` : ''}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">${k.desc}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${statPill('⚔', 'Atk', k.power)}
          ${statPill('⚡', 'Vit', k.speed.toFixed(1))}
          ${statPill('🎯', 'Préc', Math.round(k.accuracy * 100) + '%')}
          ${statPill('★', 'Crit', Math.round(k.chance * 100) + '%')}
        </div>
      </div>
      <button onclick="setTab('kini')" style="font-size:11px;padding:5px 10px;flex-shrink:0;align-self:flex-start">
        Changer
      </button>
    </div>`
}

function statPill(icon, label, value) {
  return `<div style="
    display:flex;align-items:center;gap:3px;
    background:var(--gray-bg);border-radius:8px;padding:3px 8px;font-size:11px;
  "><span style="font-size:11px">${icon}</span>
  <span style="color:var(--text-muted)">${label}</span>
  <span style="font-weight:500;margin-left:2px">${value}</span></div>`
}

function renderFrise(state, container) {
  const total   = 11
  const current = state.currentFloor

  container.innerHTML = `
    <div style="
      display:flex;align-items:center;gap:3px;
      padding:10px 12px;background:white;
      border:0.5px solid var(--gray-border);
      border-radius:12px;margin-bottom:10px;overflow-x:auto;
    ">
      ${Array.from({ length: total }, (_, i) => {
        const vague     = i + 1
        const isBoss    = vague === 11
        const isPast    = vague < current
        const isCurrent = vague === current

        let bg = 'var(--gray-bg)', border = 'var(--gray-border)', color = 'var(--text-muted)'
        let content = String(vague)

        if (isBoss) {
          bg      = isPast ? '#EAF3DE' : isCurrent ? '#FAECE7' : 'var(--gray-bg)'
          border  = isPast ? '#3B6D11' : isCurrent ? '#D85A30' : 'var(--gray-border)'
          color   = isPast ? '#173404' : isCurrent ? '#D85A30' : 'var(--text-muted)'
          content = isPast ? '✓' : '💀'
        } else if (isPast) {
          bg = '#EAF3DE'; border = '#3B6D11'; color = '#173404'; content = '✓'
        } else if (isCurrent) {
          bg = '#EEEDFE'; border = 'var(--purple)'; color = 'var(--purple)'
        }

        return `
          <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0">
            <div style="
              width:${isBoss ? '32px' : '26px'};height:${isBoss ? '32px' : '26px'};
              border-radius:50%;background:${bg};
              border:${isCurrent ? '2px' : '1px'} solid ${border};
              color:${color};font-size:${isBoss ? '14px' : '11px'};
              font-weight:${isCurrent ? '500' : '400'};
              display:flex;align-items:center;justify-content:center;
            ">${content}</div>
            <div style="font-size:9px;color:${isCurrent ? 'var(--purple)' : 'var(--text-muted)'};
              font-weight:${isCurrent ? '500' : '400'}">
              ${isBoss ? 'BOSS' : 'V' + vague}
            </div>
          </div>
          ${i < total - 1 ? `<div style="
            flex:1;height:1px;
            background:${isPast ? '#3B6D11' : 'var(--gray-border)'};
            min-width:6px;max-width:16px;margin-bottom:14px;
          "></div>` : ''}`
      }).join('')}
    </div>`
}

function calcSynergies(state) {
  const effects = state.equippedPogs.filter(Boolean).map(p => p.effect || '')
  const bonuses = []
  if (effects.filter(e => e.startsWith('idle+')).length  >= 2) bonuses.push('Duo Idle ×1.5')
  if (effects.filter(e => e.startsWith('flips+')).length >= 3) bonuses.push('Trio Flip +3')
  if (effects.some(e => e.startsWith('chain')))                bonuses.push('Chaîne active')
  if (effects.filter(e => e.startsWith('crit+')).length  >= 2) bonuses.push('Duo Crit +10%')
  return bonuses
}

window.renderTeam = renderTeam