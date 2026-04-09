// ── SHELTER 7 — Panel journalier ──
import { DAILY_REWARDS, MISSIONS_DEFAULT } from '../core/economy.js'
import { saveState } from '../core/state.js'
import { ACHIEVEMENTS } from '../data/achievements.js'

export function renderDaily(state) {
  const rewardsDiv  = document.getElementById('daily-rewards')
  const missionsDiv = document.getElementById('missions-list')
  if (!rewardsDiv) return

  const today  = state.dailyDay % 7
  const streak = state.dailyStreak || 0

  rewardsDiv.innerHTML = `
    <div class="card">
      <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
        <span>Rapport journalier — Jour ${today + 1}/7</span>
        ${streak > 0 ? `<span class="streak-badge">🔥 ${streak}j</span>` : ''}
      </div>
      ${streak > 0 ? `
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">
          ${streak % 7 === 0 && streak > 0
            ? '⭐ Semaine complète — bonus obtenu !'
            : `${7 - (streak % 7)} jour(s) avant le bonus de semaine`}
        </div>` : ''}
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

  const pendingCount = state.missions.filter(m => m.done && !m.claimed).length

  missionsDiv.innerHTML = `
    <div class="card">
      <div class="card-title" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span>Missions de terrain</span>
        <div style="display:flex;align-items:center;gap:6px">
          ${pendingCount > 0 ? `<span class="streak-badge" style="background:#2A4A1A;color:#5AE05A">${pendingCount} à réclamer</span>` : ''}
          ${pendingCount > 1 ? `<button class="mission-claim-all-btn" onclick="window.claimAllMissionsUI()">Tout réclamer</button>` : ''}
        </div>
      </div>
      ${state.missions.map(m => {
        const pct      = Math.round(m.progress / m.target * 100)
        const claimable = m.done && !m.claimed
        const claimed   = m.done && m.claimed
        return `
          <div class="mission-row ${claimable ? 'mission-claimable' : ''}">
            <div style="flex:1">
              <div style="font-size:12px;${claimed ? 'color:var(--text-muted)' : ''}">${m.name}</div>
              <div class="bar-track" style="margin:4px 0 2px">
                <div class="bar-fill" style="width:${pct}%;background:${claimed ? '#3A6A2A' : claimable ? '#5AE05A' : 'var(--accent)'}"></div>
              </div>
              <div style="font-size:10px;color:var(--text-muted)">${m.progress}/${m.target}</div>
            </div>
            <div style="flex-shrink:0;margin-left:10px">
              ${claimable
                ? `<button class="mission-claim-btn" onclick="window.claimMissionUI('${m.id}')">
                    Réclamer !
                   </button>`
                : `<span class="badge" style="background:${claimed ? '#1A3A0A' : '#2A1A0A'};color:${claimed ? '#5AE05A' : 'var(--accent)'}">
                    ${claimed ? '✓ Réclamé' : missionRewardLabel(m.reward)}
                   </span>`}
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
    </div>

    ${renderStats(state)}
    ${renderAchievements(state)}`
}

function renderStats(state) {
  const st = state.stats || {}
  const rows = [
    { label: 'Vagues remportées',  val: st.totalWaves    || 0 },
    { label: 'Ennemis éliminés',   val: st.totalKills    || 0 },
    { label: 'Capsules gagnées',   val: st.totalCapsules || 0, suffix: '💊' },
    { label: 'Signaux envoyés',    val: st.totalSignals  || 0 },
    { label: 'Fusions réalisées',  val: st.totalFusions  || 0 },
    { label: 'Prestiges',          val: st.totalPrestige || 0 },
  ]
  return `
    <div class="card">
      <div class="card-title">Statistiques de survie</div>
      <div class="stats-grid">
        ${rows.map(r => `
          <div class="stats-row">
            <span class="stats-label">${r.label}</span>
            <span class="stats-val">${r.val.toLocaleString()}${r.suffix ? ' ' + r.suffix : ''}</span>
          </div>`).join('')}
      </div>
    </div>`
}

function renderAchievements(state) {
  const unlocked = state.achievements || {}
  const doneCount = Object.keys(unlocked).length

  return `
    <div class="card">
      <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
        <span>Achèvements</span>
        <span class="streak-badge" style="background:#1A2A3A;color:var(--accent)">${doneCount}/${ACHIEVEMENTS.length}</span>
      </div>
      <div class="ach-list">
        ${ACHIEVEMENTS.map(ach => {
          const done = !!unlocked[ach.id]
          const rewardStr = [
            ach.reward.capsules ? `+${ach.reward.capsules}💊` : '',
            ach.reward.dna      ? `+${ach.reward.dna}🧬` : '',
            ach.reward.radium   ? `+${ach.reward.radium}☢` : '',
          ].filter(Boolean).join(' ')
          return `
            <div class="ach-row ${done ? 'ach-done' : ''}">
              <div class="ach-icon">${ach.icon}</div>
              <div class="ach-info">
                <div class="ach-name">${ach.name}</div>
                <div class="ach-desc">${ach.desc}</div>
              </div>
              <div class="ach-reward ${done ? 'ach-reward--done' : ''}">${done ? '✓' : rewardStr}</div>
            </div>`
        }).join('')}
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
