// ── SHELTER SURVIVOR — Arène de combat ──
import { SURVIVORS, RARITY, ROLE_META } from '../data/survivors.js'
import { ZONES } from '../data/zones.js'

// ── Rendu de l'écran de sélection d'équipe (avant combat) ──
export function renderPreCombat(state) {
  const panel = document.getElementById('precombat-panel')
  if (!panel) return

  const zone = ZONES[state.activeZone - 1]
  const team = state.team.filter(Boolean)

  panel.innerHTML = `
    <div class="precombat-zone">
      <div class="precombat-zone-icon">☣</div>
      <div>
        <div class="precombat-zone-name">Zone ${state.activeZone} — ${zone.name}</div>
        <div class="precombat-zone-sub">Vague ${state.currentWave}/11 · Boss: ${zone.boss.name}</div>
      </div>
    </div>

    <div class="precombat-team">
      <div class="precombat-label">Équipe sélectionnée (${team.length}/6)</div>
      <div class="precombat-slots">
        ${Array.from({ length: 6 }, (_, i) => {
          const s = state.team[i]
          if (!s) return `<div class="precombat-slot empty">?</div>`
          const sv   = SURVIVORS.find(x => x.id === s.id)
          if (!sv) return ''
          const r    = RARITY[sv.rarity] || RARITY['D']
          const meta = ROLE_META[sv.role] || {}
          return `<div class="precombat-slot filled" style="background:${r.bg};border-color:${r.color}">
            <div class="ts-class-icon" style="color:${meta.classColor || r.color};font-size:10px">${meta.classIcon || ''}</div>
            <div style="font-size:20px">${sv.icon}</div>
            <div style="font-size:8px;color:${r.color}">${sv.role}</div>
            <div style="font-size:8px;font-weight:700;color:${r.text}">${sv.name}</div>
          </div>`
        }).join('')}
      </div>
    </div>

    ${team.length === 0 ? `
      <div class="precombat-warning">
        Aucun survivant dans l'équipe !<br>
        <button onclick="window.setTab('survivors')" style="margin-top:8px">Recruter des survivants</button>
      </div>` : `
      <button class="btn-danger launch-btn" onclick="window.startCombat()">
        ☣ Partir en mission
      </button>`}
  `
}

// ── Rendu du combat animé ──
export function renderCombatPanel(state, playerTeam, enemySquad, result, onDone) {
  const panel = document.getElementById('combat-panel')
  if (!panel) return

  panel.innerHTML = `
    <div class="combat-header">
      <div class="combat-title">Combat — Zone ${state.activeZone} · Vague ${state.currentWave}</div>
      <div class="combat-turn" id="combat-turn">Initialisation...</div>
    </div>

    <div class="combat-sides">
      <div class="combat-side player-side">
        <div class="combat-side-label">Votre équipe</div>
        <div class="combat-fighters" id="player-fighters">
          ${playerTeam.map(s => {
            const r = RARITY[s.rarity] || RARITY['D']
            return `
              <div class="fighter-card" id="fighter-${s.id}"
                style="background:${r.bg};border-color:${r.color}">
                <div class="fighter-icon">${s.icon}</div>
                <div class="fighter-name">${s.name}</div>
                <div class="fighter-hp-bar">
                  <div class="fighter-hp-fill" id="hp-${s.id}" style="width:100%;background:${r.color}"></div>
                </div>
                <div class="fighter-hp-text" id="hpv-${s.id}">${s.hp}</div>
              </div>`
          }).join('')}
        </div>
      </div>

      <div class="combat-vs">VS</div>

      <div class="combat-side enemy-side">
        <div class="combat-side-label">Ennemis</div>
        <div class="combat-fighters" id="enemy-fighters">
          ${enemySquad.map(e => `
            <div class="fighter-card enemy" id="enemy-${e.id}">
              <div class="fighter-icon">${e.icon}</div>
              <div class="fighter-name">${e.name}</div>
              <div class="fighter-hp-bar">
                <div class="fighter-hp-fill" id="ehp-${e.id}" style="width:100%;background:#D85A30"></div>
              </div>
              <div class="fighter-hp-text" id="ehpv-${e.id}">${e.hp}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="combat-log" id="combat-log"></div>
  `

  animateCombat(result, playerTeam, enemySquad, onDone)
}

function animateCombat(result, playerTeam, enemySquad, onDone) {
  const log    = document.getElementById('combat-log')
  const turnEl = document.getElementById('combat-turn')
  let turnIdx  = 0

  const interval = setInterval(() => {
    if (turnIdx >= result.turns.length) {
      clearInterval(interval)
      setTimeout(onDone, 600)
      return
    }

    const turn = result.turns[turnIdx]
    if (turnEl) turnEl.textContent = `Tour ${turn.turn} / ${result.totalTurns}`

    // Met à jour les barres HP depuis les actions
    turn.actions.forEach(a => {
      if (!a) return
      if (a.side === 'player') {
        const enemy = enemySquad.find(e => e.name === a.target)
        if (enemy) {
          const pct = Math.round(Math.max(0, enemy.hp) / enemy.maxHp * 100)
          const bar  = document.getElementById('ehp-' + enemy.id)
          const val  = document.getElementById('ehpv-' + enemy.id)
          if (bar) bar.style.width = pct + '%'
          if (val) val.textContent = Math.max(0, enemy.hp)
          if (!enemy.alive) {
            const card = document.getElementById('enemy-' + enemy.id)
            if (card) card.classList.add('dead')
          }
        }
      } else if (a.side === 'enemy') {
        const ally = playerTeam.find(s => s.name === a.target)
        if (ally) {
          const pct = Math.round(Math.max(0, ally.hp) / ally.maxHp * 100)
          const bar  = document.getElementById('hp-' + ally.id)
          const val  = document.getElementById('hpv-' + ally.id)
          if (bar) bar.style.width = pct + '%'
          if (val) val.textContent = Math.max(0, ally.hp)
          if (ally.hp <= 0) {
            const card = document.getElementById('fighter-' + ally.id)
            if (card) card.classList.add('dead')
          }
        }
      }
    })

    // Log des actions importantes
    if (log && turn.actions.length > 0) {
      turn.actions.slice(0, 2).forEach(a => {
        if (!a || a.side === 'hot' || a.side === 'turret') return
        const div = document.createElement('div')
        div.className = 'combat-log-entry ' + (a.side === 'player' ? 'atk' : 'dmg')
        if (a.side === 'heal') {
          div.className = 'combat-log-entry heal'
          div.textContent = `💊 ${a.actor} soigne ${a.target} +${a.amount}`
        } else if (a.dodged) {
          div.textContent = `${a.target} esquive l'attaque de ${a.actor} !`
        } else if (a.isCrit) {
          div.className += ' crit'
          div.textContent = `★ ${a.actor} CRIT ${a.target} — ${a.dmg} dégâts !`
        } else {
          div.textContent = `${a.actor} → ${a.target} : ${a.dmg} dégâts${a.killed ? ' ☠' : ''}`
        }
        log.insertBefore(div, log.firstChild)
      })
      while (log.children.length > 12) log.removeChild(log.lastChild)
    }

    turnIdx++
  }, 400)
}

// ── Rendu du résultat ──
export function renderResult(state, result, reward) {
  const panel = document.getElementById('result-panel')
  if (!panel) return

  panel.innerHTML = `
    <div class="result-icon">${result.victory ? '🏆' : '☠'}</div>
    <div class="result-title ${result.victory ? 'win' : 'lose'}">
      ${result.victory ? 'Mission réussie !' : 'Équipe éliminée...'}
    </div>
    <div class="result-sub">
      ${result.victory
        ? `${result.survived}/${state.team.filter(Boolean).length} survivants debout`
        : 'Recrutez de meilleurs survivants ou améliorez votre équipe'}
    </div>

    ${result.victory ? `
      <div class="result-reward">
        <span>+${reward.capsules} capsules</span>
        <span>+${reward.dna} ADN</span>
        <span>+${reward.accountXP} XP</span>
        ${reward.radium > 0 ? `<span>+${reward.radium} radium</span>` : ''}
      </div>` : ''}

    <button class="btn-danger result-btn" id="result-btn">
      ${result.victory
        ? (window._isBossWave ? 'Affronter le Boss !' : 'Vague suivante →')
        : 'Réessayer'}
    </button>
  `
}

window.renderPreCombat  = renderPreCombat
window.renderCombatPanel = renderCombatPanel
window.renderResult     = renderResult
