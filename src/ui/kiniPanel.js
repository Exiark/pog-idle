// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/ui/kiniPanel.js
// ══════════════════════════════════════════════════════════════
import { KINIS } from '../data/kinis.js';

export function renderKiniPanel(S) {
  const wrap = document.getElementById('kini-panel-wrap');
  if (!wrap) return;
  wrap.innerHTML = `<div class="section-title">🥏 Ton kini</div>
    <p style="font-size:12px;color:var(--text-secondary);margin-bottom:16px">
      Le kini booste les stats de toute ton équipe. Choisis celui qui correspond à ton style de jeu.
    </p>`;

  const selected = S.get('selectedKini') || 0;
  const worldKinis = S.get('worldKinis') || [];

  KINIS.forEach((kini, i) => {
    const isUnlocked = i === 0 || !kini.exclusive || worldKinis.includes(kini.id);
    const isSel = selected === i;
    const card = document.createElement('div');
    card.className = `kini-card${isSel ? ' selected' : ''}${!isUnlocked ? ' locked' : ''}`;
    card.innerHTML = `
      <div class="kini-avatar">${kini.emoji || '🥏'}</div>
      <div class="kini-info">
        <div class="kini-name">${kini.name}</div>
        <div class="kini-stats">
          <span class="kini-stat-pill">⚔ ${kini.power}</span>
          <span class="kini-stat-pill">⚡ ${kini.speed}×</span>
          ${kini.chance ? `<span class="kini-stat-pill">⭐ Crit+${Math.round(kini.chance*100)}%</span>` : ''}
          ${kini.bonusEffect ? `<span class="kini-stat-pill">✨ ${kini.bonusEffect}</span>` : ''}
        </div>
      </div>
      ${isSel ? '<span class="kini-selected-badge">Actif</span>' : ''}
      ${!isUnlocked ? '<span style="color:var(--text-muted);font-size:12px">🔒 Boss</span>' : ''}
    `;
    if (isUnlocked) {
      card.onclick = () => {
        S.set('selectedKini', i);
        S.save();
        renderKiniPanel(S);
        if (window.renderArena) window.renderArena();
      };
    }
    wrap.appendChild(card);
  });
}


// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/ui/talentTree.js
// ══════════════════════════════════════════════════════════════
import { TALENTS } from '../data/talents.js';

export function renderTalentTree(S) {
  const wrap = document.getElementById('talent-tree-wrap');
  if (!wrap) return;
  const points    = S.get('talentPoints') || 0;
  const unlocked  = S.get('talentsUnlocked') || [];

  wrap.innerHTML = `
    <div class="talent-header">
      <div class="section-title" style="margin:0">⭐ Arbre de talents</div>
      <div class="talent-points-badge">${points} point${points > 1 ? 's' : ''}</div>
    </div>
    <p style="font-size:12px;color:var(--text-secondary);margin-bottom:20px">
      Monte de niveau pour gagner des points. Chaque talent améliore ton équipe en permanence.
    </p>
  `;

  const ROWS = [
    ['t1','t2','t3'],
    ['t4','t5','t6'],
    ['t7','t8','t9'],
  ];

  ROWS.forEach((row, ri) => {
    if (ri > 0) {
      const conn = document.createElement('div');
      conn.className = 'talent-connector';
      wrap.appendChild(conn);
    }
    const rowEl = document.createElement('div');
    rowEl.className = 'talent-row';

    row.forEach(tid => {
      const talent  = TALENTS.find(t => t.id === tid);
      if (!talent) return;
      const isUnlocked = unlocked.includes(tid);
      const isAvail    = ri === 0 || ROWS[ri-1].some(pt => unlocked.includes(pt));
      const canBuy     = !isUnlocked && isAvail && points > 0;

      const node = document.createElement('div');
      node.className = `talent-node${isUnlocked ? ' unlocked' : isAvail ? '' : ' locked'}`;
      node.innerHTML = `
        <div class="tn-icon">${talent.icon}</div>
        <div class="tn-name">${talent.name}</div>
        <div class="tn-desc">${talent.desc}</div>
      `;

      if (canBuy) {
        node.onclick = () => {
          S.data.talentsUnlocked = [...(S.get('talentsUnlocked') || []), tid];
          S.data.talentPoints    = Math.max(0, points - 1);
          S.save();
          renderTalentTree(S);
          if (window.renderHUD) window.renderHUD(S);
        };
      }
      rowEl.appendChild(node);
    });

    wrap.appendChild(rowEl);
  });
}


// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/ui/dailyPanel.js
// ══════════════════════════════════════════════════════════════
import { DAILY_REWARDS, MISSIONS_DEFAULT } from '../core/economy.js';

export function renderDailyPanel(S) {
  const wrap = document.getElementById('daily-panel-wrap');
  if (!wrap) return;

  // ── Daily rewards ──
  const day       = S.get('dailyDay') || 0;
  const claimed   = S.get('dailyClaimed') || false;
  const dayCards  = DAILY_REWARDS.map((d, i) => {
    const isDone    = i < day;
    const isCurrent = i === day;
    return `<div class="daily-day-card${isDone ? ' claimed' : ''}${isCurrent ? ' current' : ''}">
      <span class="dd-icon">${d.icon}</span>
      <span style="font-size:9px;color:var(--text-muted)">J${d.day}</span>
      <span style="font-size:9px;font-weight:700;color:var(--text-secondary)">${d.label}</span>
    </div>`;
  }).join('');

  const claimBtn = claimed
    ? `<button class="btn-secondary" style="width:100%;padding:12px;margin-top:12px;opacity:0.5" disabled>✓ Déjà réclamé aujourd'hui</button>`
    : `<button class="btn-primary" style="padding:12px;margin-top:12px" onclick="window.claimDaily()">Réclamer la récompense du jour 🎁</button>`;

  // ── Missions ──
  const missions = S.get('missions') || [];
  const missionHTML = missions.map(m => {
    const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
    return `<div class="mission-card">
      <span class="mission-icon">${m.icon}</span>
      <div class="mission-info">
        <div class="mission-name">${m.name}</div>
        <div style="font-size:11px;color:var(--text-secondary)">${m.progress}/${m.target}</div>
        <div class="mission-progress-bar"><div class="mission-progress-fill" style="width:${pct}%"></div></div>
      </div>
      <button class="mission-claim-btn" ${m.progress >= m.target && !m.claimed ? '' : 'disabled'}
        onclick="window.claimMission('${m.id}')">
        ${m.claimed ? '✓' : pct >= 100 ? 'Réclamer' : `${pct}%`}
      </button>
    </div>`;
  }).join('');

  // ── Offline ──
  const idleRate = 0.1;
  const offlineGold = S.calcOfflineGold(idleRate);
  const offlineHTML = offlineGold > 0 ? `
    <div style="background:rgba(245,197,66,0.08);border:1px solid rgba(245,197,66,0.2);border-radius:var(--radius-md);padding:14px;margin-bottom:16px;text-align:center">
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px">💤 Gains hors ligne</div>
      <div style="font-family:var(--font-title);font-size:22px;color:var(--gold)">+${offlineGold} 🪙</div>
      <button class="btn-primary" style="margin-top:10px;padding:10px;font-size:14px" onclick="window.collectOffline()">Collecter</button>
    </div>` : '';

  wrap.innerHTML = `
    <div class="section-title">📅 Récompenses journalières</div>
    <div class="daily-claim-row">${dayCards}</div>
    ${claimBtn}
    <div class="section-title" style="margin-top:24px">🎯 Missions</div>
    ${offlineHTML}
    ${missionHTML || '<div style="color:var(--text-muted);text-align:center;padding:20px">Aucune mission active</div>'}
  `;
}

window.claimDaily = function() {
  const S = window._state;
  if (!S || S.get('dailyClaimed')) return;
  const day    = S.get('dailyDay') || 0;
  const reward = DAILY_REWARDS[day];
  if (!reward) return;
  if (reward.reward.gold)  S.addGold(reward.reward.gold);
  if (reward.reward.gems)  S.addGems(reward.reward.gems);
  if (reward.reward.frags) S.addFragments(reward.reward.frags);
  S.set('dailyClaimed', true);
  S.set('dailyDay', (day + 1) % 7);
  S.save();
  if (window.renderHUD)   window.renderHUD(S);
  import('./dailyPanel.js').then(m => m.renderDailyPanel(S));
};

window.claimMission = function(missionId) {
  const S = window._state;
  if (!S) return;
  const m = (S.get('missions') || []).find(x => x.id === missionId);
  if (!m || m.claimed || m.progress < m.target) return;
  if (m.reward.gold)   S.addGold(m.reward.gold);
  if (m.reward.gems)   S.addGems(m.reward.gems);
  if (m.reward.tokens) S.addTokens(m.reward.tokens);
  if (m.reward.frags)  S.addFragments(m.reward.frags);
  S.data.missions = S.get('missions').map(x =>
    x.id === missionId ? { ...x, claimed: true } : x
  );
  S.save();
  if (window.renderHUD) window.renderHUD(S);
  import('./dailyPanel.js').then(mod => mod.renderDailyPanel(S));
};

window.collectOffline = function() {
  const S = window._state;
  if (!S) return;
  const gold = S.calcOfflineGold(0.1);
  S.addGold(gold);
  S.set('lastSeen', Date.now());
  S.save();
  if (window.renderHUD) window.renderHUD(S);
  import('./dailyPanel.js').then(mod => mod.renderDailyPanel(S));
};


// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/ui/tower.js
// ══════════════════════════════════════════════════════════════
import { WORLDS } from '../data/worlds.js';

export function renderTower(S) {
  const list = document.getElementById('worlds-list');
  if (!list) return;
  list.innerHTML = '';

  const currentWorld  = S.get('currentWorld')  || 1;
  const currentFloor  = S.get('currentFloor')  || 1;
  const activeWorld   = S.get('activeWorld')   || 1;
  const unlockedWorlds = S.get('unlockedWorlds') || [1];
  const bossesDefeated = S.get('bossesDefeated') || [];

  WORLDS.forEach((w, i) => {
    const wNum      = i + 1;
    const isUnlocked = unlockedWorlds.includes(wNum);
    const isActive  = activeWorld === wNum;
    const isCurrent = currentWorld === wNum;
    const isBossKO  = bossesDefeated.includes(`w${wNum}`);
    const isFarming = isUnlocked && wNum < currentWorld;
    const progress  = isCurrent ? Math.min(100, Math.round((currentFloor / 11) * 100)) : isBossKO ? 100 : 0;

    const card = document.createElement('div');
    card.className = `world-card${isActive ? ' active' : ''}${!isUnlocked ? ' locked' : ''}`;
    card.innerHTML = `
      <div class="world-card-header">
        <span class="world-icon">${w.icon}</span>
        <div>
          <div class="world-name">${w.name}</div>
          <div class="world-sub">Vagues ${(wNum-1)*10+1}–${wNum*10} ${isBossKO ? '• Boss vaincu ✓' : ''}</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:4px;align-items:center">
          ${isFarming ? '<span class="world-farm-badge">🌾 Farming ×0.4</span>' : ''}
          ${isActive ? '<span style="color:var(--gold);font-size:12px;font-weight:800">ACTIF</span>' : ''}
          ${!isUnlocked ? '<span style="font-size:20px">🔒</span>' : ''}
        </div>
      </div>
      <div class="world-progress-bar">
        <div class="world-progress-fill" style="width:${progress}%"></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
        <span style="font-size:11px;color:var(--text-muted)">${isUnlocked ? `${progress}% terminé` : 'Verrouillé'}</span>
        <span class="world-boss-badge">💀 ${w.bossName}</span>
      </div>
    `;

    if (isUnlocked) {
      card.onclick = () => {
        const S2 = window._state;
        S2.set('activeWorld', wNum);
        S2.set('activeFloor', isCurrent ? (S2.get('currentFloor') || 1) : (isBossKO ? 1 : 1));
        S2.save();
        renderTower(S2);
        // Aller sur l'onglet combat
        document.querySelector('[data-tab="combat"]')?.click();
        if (window.renderArena) window.renderArena();
      };
    }
    list.appendChild(card);
  });
}