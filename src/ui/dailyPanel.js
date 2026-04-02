import { DAILY_REWARDS, MISSIONS_DEFAULT } from '../core/economy.js'
import { saveState } from '../core/state.js'

export function renderDaily(state) {
  const rewardsDiv  = document.getElementById('daily-rewards')
  const statusEl    = document.getElementById('daily-status')
  const missionsDiv = document.getElementById('missions-list')
  if (!rewardsDiv) return

  // ── Récompenses journalières ──
  const today = state.dailyDay % 7

  rewardsDiv.innerHTML = `
    <div class="card">
      <div class="card-title">Connexion journalière — Jour ${today + 1}/7</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
        ${DAILY_REWARDS.map((r, i) => {
          const isPast   = i < today
          const isToday  = i === today
          const isFuture = i > today
          return `
            <div style="
              flex:1;min-width:70px;
              background:${isToday ? '#EEEDFE' : 'var(--gray-bg)'};
              border:${isToday ? '1.5px solid var(--purple)' : '0.5px solid var(--gray-border)'};
              border-radius:10px;padding:8px;text-align:center;
              opacity:${isFuture ? '0.5' : '1'}
            ">
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
        class="${state.dailyClaimed ? '' : 'btn-primary'}"
        onclick="claimDailyUI()"
        ${state.dailyClaimed ? 'disabled' : ''}
        style="width:100%">
        ${state.dailyClaimed ? 'Revenez demain !' : 'Réclamer la récompense'}
      </button>
    </div>`

  // ── Missions journalières ──
  if (!missionsDiv) return

  // Initialise les missions si vides
  if (!state.missions || !state.missions.length) {
    state.missions = JSON.parse(JSON.stringify(MISSIONS_DEFAULT))
  }

  missionsDiv.innerHTML = `
    <div class="card">
      <div class="card-title">Missions journalières</div>
      ${state.missions.map(m => {
        const pct = Math.round(m.progress / m.target * 100)
        return `
          <div style="
            display:flex;align-items:center;gap:10px;
            padding:8px 0;
            border-bottom:0.5px solid var(--gray-border)
          ">
            <div style="flex:1">
              <div style="font-size:12px;${m.done ? 'color:var(--text-muted)' : ''}">
                ${m.name}
              </div>
              <div class="bar-track" style="margin:4px 0 2px">
                <div class="bar-fill" style="
                  width:${pct}%;
                  background:${m.done ? '#3B6D11' : 'var(--purple)'}
                "></div>
              </div>
              <div style="font-size:10px;color:var(--text-muted)">
                ${m.progress}/${m.target}
              </div>
            </div>
            <div>
              <span class="badge" style="
                background:${m.done ? '#EAF3DE' : '#EEEDFE'};
                color:${m.done ? '#173404' : '#26215C'}
              ">
                ${m.done ? 'Accomplie !' : missionRewardLabel(m.reward)}
              </span>
            </div>
          </div>`
      }).join('')}
    </div>

    <div class="card">
      <div class="card-title">Récompense offline</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">
        Vous gagnez de l'or même hors-ligne (maximum 8h).
        Doublez vos gains pour 5 gemmes.
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="collectOfflineUI(1)" style="flex:1">
          Collecter (×1)
        </button>
        <button class="btn-primary" onclick="collectOfflineUI(2)" style="flex:1">
          ×2 — 5 gemmes
        </button>
      </div>
    </div>`
}

function rewardIcon(r) {
  if (r.gems)      return '★'
  if (r.fragments) return 'F'
  return 'G'
}

function rewardLabel(r) {
  const parts = []
  if (r.gold)      parts.push(`+${r.gold} or`)
  if (r.gems)      parts.push(`+${r.gems} ★`)
  if (r.fragments) parts.push(`+${r.fragments} F`)
  return parts.join(' ')
}

function missionRewardLabel(reward) {
  const parts = []
  if (reward.gold)      parts.push(`+${reward.gold} or`)
  if (reward.gems)      parts.push(`+${reward.gems} ★`)
  if (reward.fragments) parts.push(`+${reward.fragments} F`)
  if (reward.tokens)    parts.push(`+${reward.tokens} T`)
  return parts.join(' ')
}

window.renderDaily = renderDaily