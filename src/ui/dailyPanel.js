// ── SHELTER SURVIVOR — Panel journalier ──
import { DAILY_REWARDS, MISSIONS_DEFAULT } from '../core/economy.js'
import { saveState } from '../core/state.js'

export function renderDaily(state) {
  const rewardsDiv  = document.getElementById('daily-rewards')
  const missionsDiv = document.getElementById('missions-list')
  if (!rewardsDiv) return

  const today = state.dailyDay % 7

  rewardsDiv.innerHTML = `
    <div class="card">
      <div class="card-title">Rapport journalier — Jour ${today + 1}/7</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
        ${DAILY_REWARDS.map((r, i) => {
          const isPast   = i < today
          const isToday  = i === today
          const isFuture = i > today
          return `
            <div style="
              flex:1;min-width:60px;
              background:${isToday ? '#2A1A0A' : 'var(--panel-bg)'};
              border:${isToday ? '1.5px solid var(--accent)' : '0.5px solid var(--gray-border)'};
              border-radius:10px;padding:8px;text-align:center;
              opacity:${isFuture ? '0.4' : '1'}">
              <div style="font-size:10px;color:var(--text-muted)">J${i + 1}</div>
              <div style="font-size:14px;font-weight:500;margin:4px 0">
                ${isPast ? '✓' : rewardIcon(r)}
              </div>
              <div style="font-size:10px;color:var(--text-muted)">
                ${isPast ? 'Réclamé' : rewardLabel(r)}
              </div>
            </div>`
        }).join('')}
      </div>
      <button
        class="${state.dailyClaimed ? '' : 'btn-danger'}"
        onclick="window.claimDailyUI()"
        ${state.dailyClaimed ? 'disabled' : ''}
        style="width:100%">
        ${state.dailyClaimed ? 'Revenez demain !' : 'Réclamer le rapport'}
      </button>
    </div>`

  if (!missionsDiv) return

  if (!state.missions || !state.missions.length) {
    state.missions = JSON.parse(JSON.stringify(MISSIONS_DEFAULT))
  }

  missionsDiv.innerHTML = `
    <div class="card">
      <div class="card-title">Missions de terrain</div>
      ${state.missions.map(m => {
        const pct = Math.round(m.progress / m.target * 100)
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid var(--gray-border)">
            <div style="flex:1">
              <div style="font-size:12px;${m.done ? 'color:var(--text-muted)' : ''}">${m.name}</div>
              <div class="bar-track" style="margin:4px 0 2px">
                <div class="bar-fill" style="width:${pct}%;background:${m.done ? '#5A9E3A' : 'var(--accent)'}"></div>
              </div>
              <div style="font-size:10px;color:var(--text-muted)">${m.progress}/${m.target}</div>
            </div>
            <div>
              <span class="badge" style="background:${m.done ? '#1A3A0A' : '#2A1A0A'};color:${m.done ? '#5A9E3A' : 'var(--accent)'}">
                ${m.done ? 'Accomplie !' : missionRewardLabel(m.reward)}
              </span>
            </div>
          </div>`
      }).join('')}
    </div>

    <div class="card">
      <div class="card-title">Gains offline</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">
        Vos survivants au repos génèrent des capsules (max 8h). Doublez pour 5 radium.
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="window.collectOfflineUI(1)" style="flex:1">Collecter (×1)</button>
        <button class="btn-danger" onclick="window.collectOfflineUI(2)" style="flex:1">×2 — 5 ☢</button>
      </div>
    </div>`
}

function rewardIcon(r) {
  if (r.radium) return '☢'
  if (r.dna)    return '🧬'
  return '💊'
}

function rewardLabel(r) {
  const parts = []
  if (r.capsules) parts.push(`+${r.capsules} 💊`)
  if (r.radium)   parts.push(`+${r.radium} ☢`)
  if (r.dna)      parts.push(`+${r.dna} 🧬`)
  return parts.join(' ')
}

function missionRewardLabel(reward) {
  const parts = []
  if (reward.capsules) parts.push(`+${reward.capsules} 💊`)
  if (reward.radium)   parts.push(`+${reward.radium} ☢`)
  if (reward.dna)      parts.push(`+${reward.dna} 🧬`)
  if (reward.tokens)   parts.push(`+${reward.tokens} T`)
  return parts.join(' ')
}

window.renderDaily = renderDaily
