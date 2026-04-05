// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/ui/arena.js
//  Phases de combat : sélection vague → combat animé → résultat
// ══════════════════════════════════════════════════════════════

import { WORLDS }     from '../data/worlds.js';
import { KINIS }      from '../data/kinis.js';
import { getPogById, getChampionStats } from '../data/pogs.js';
import { generateEnemyTeam, buildPlayerTeam, simulateBattle, calcTeamPower, calcEnemyPower } from '../core/combat.js';
import { getWaveRewards, getFarmingRewards } from '../core/economy.js';
import { RARITY_NAMES } from '../data/pogs.js';

let _S = null;
let _battleSpeed = 1;
let _battleTimer = null;
let _currentEnemyTeam = [];
let _currentPlayerTeam = [];
let _currentBattleResult = null;
let _currentRewards = null;
let _isFarming = false;

export function initArena(S) {
  _S = S;
  renderWaveSelect();
}

// ════════════════════════════════════════════════════════════
//  PHASE 0 : SÉLECTION DE VAGUE
// ════════════════════════════════════════════════════════════
export function renderWaveSelect() {
  _showPhase('wave-select');

  const S      = _S;
  const world  = S.get('activeWorld')  || 1;
  const floor  = S.get('activeFloor') || 1;
  const isBoss = floor >= 11;
  const worldData = WORLDS[world - 1] || WORLDS[0];

  // ── Bannière monde ──
  const icon = document.getElementById('wave-world-icon');
  const name = document.getElementById('wave-world-name');
  const lbl  = document.getElementById('wave-label');
  if (icon) icon.textContent = worldData.icon;
  if (name) name.textContent = worldData.name;
  if (lbl)  lbl.textContent  = isBoss ? `BOSS : ${worldData.bossName}` : `Vague ${floor} / 10`;

  // Farming badge
  const isFrontier = world === S.get('currentWorld') && floor === (S.get('currentFloor') || 1);
  _isFarming = !isFrontier || (world < S.get('currentWorld'));

  // ── Points de vague ──
  _renderWaveDots(floor, isBoss);

  // ── Équipe ennemie ──
  _currentEnemyTeam = generateEnemyTeam(world, floor);
  _renderTeamGrid('enemy-team-grid', _currentEnemyTeam, false);

  // ── Équipe joueur ──
  const kini = KINIS[S.get('selectedKini') || 0];
  const equipped = S.getEquippedTeam().map(slot => {
    if (!slot) return null;
    return getPogById(slot.id) ? { ...getPogById(slot.id), rarity: slot.rarity } : null;
  });
  _currentPlayerTeam = buildPlayerTeam(S.getEquippedTeam().map(s => s ? getPogById(s.id) : null), kini);
  _renderTeamGrid('player-team-grid', _currentPlayerTeam, true);

  // ── Power ratings ──
  const playerPow = Math.round(calcTeamPower(_currentPlayerTeam));
  const enemyPow  = Math.round(calcEnemyPower(_currentEnemyTeam));
  const pPow = document.getElementById('player-power');
  const ePow = document.getElementById('enemy-power');
  if (pPow) pPow.textContent = playerPow.toLocaleString();
  if (ePow) ePow.textContent = enemyPow.toLocaleString();

  // ── Récompenses ──
  _currentRewards = _isFarming
    ? getFarmingRewards(world, floor)
    : getWaveRewards(world, floor);
  const goldEl  = document.getElementById('wave-gold-reward');
  const fragEl  = document.getElementById('wave-frag-reward');
  const xpEl    = document.getElementById('wave-xp-reward');
  if (goldEl) goldEl.textContent = _currentRewards.gold;
  if (fragEl) fragEl.textContent = _currentRewards.frags;
  if (xpEl)   xpEl.textContent   = _currentRewards.xp;

  // ── Bouton combat ──
  const btn = document.getElementById('btn-fight');
  if (btn) {
    const isBossWave = floor >= 11;
    btn.textContent = isBossWave ? '⚔ AFFRONTER LE BOSS !' : '⚔ COMBAT';
    if (isBossWave) btn.style.background = 'linear-gradient(135deg,#b91c1c,#ef4444)';
    else btn.style.background = '';
  }
}

function _renderWaveDots(floor, isBoss) {
  const container = document.getElementById('wave-dots');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 1; i <= 11; i++) {
    const dot = document.createElement('div');
    dot.className = 'wave-dot';
    if (i === 11) dot.className += ' boss';
    if (i < floor) dot.className += ' done';
    if (i === floor) dot.className += ' current';
    container.appendChild(dot);
  }
}

function _renderTeamGrid(containerId, team, isPlayer) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = '';

  for (let i = 0; i < 6; i++) {
    const pog  = team[i];
    const slot = document.createElement('div');
    slot.className = `champion-slot${pog ? ` rarity-${pog.rarity}` : ' empty'}${!isPlayer ? ' enemy-slot' : ''}`;

    if (pog) {
      slot.innerHTML = `
        <span class="champ-emoji">${pog.emoji}</span>
        <span class="champ-name">${pog.name}</span>
        <div class="champ-hp-bar"><div class="champ-hp-fill" style="width:100%"></div></div>
      `;
      if (isPlayer) {
        slot.onclick = () => window.openChampionModal(pog);
      }
    } else {
      slot.innerHTML = `<span class="champ-emoji" style="opacity:0.3">?</span>`;
    }

    grid.appendChild(slot);
  }
}

// ════════════════════════════════════════════════════════════
//  PHASE 1 : COMBAT ANIMÉ
// ════════════════════════════════════════════════════════════
export function startBattle() {
  const S    = _S;
  const kini = KINIS[S.get('selectedKini') || 0];

  const talentBonuses = {
    critBonus: S.get('talentsUnlocked').includes('t2') ? 0.10 : 0,
  };

  _currentBattleResult = simulateBattle(_currentPlayerTeam, _currentEnemyTeam, talentBonuses);
  _showPhase('battle');
  _renderBattleScene();
  _playBattleAnimation(_currentBattleResult);
}

function _renderBattleScene() {
  const result = _currentBattleResult;

  // Décor monde
  const world = _S.get('activeWorld') || 1;
  const wData = WORLDS[world - 1] || WORLDS[0];
  const deco  = document.getElementById('battle-world-deco');
  if (deco) deco.style.background = wData.bgColor || 'rgba(255,255,255,0.04)';

  // Champions joueur
  _renderBattleRow('battle-player-row', result.pTeam, 'player');
  // Champions ennemis
  _renderBattleRow('battle-enemies-row', result.eTeam, 'enemy');

  // Manche max
  const maxRound = document.getElementById('battle-max-round');
  if (maxRound) maxRound.textContent = result.rounds.length;
  const curRound = document.getElementById('battle-round');
  if (curRound) curRound.textContent = '1';

  // HP bars initiales à 100%
  _setHPBar('player-hp-bar', 'player-hp-val', 100);
  _setHPBar('enemy-hp-bar',  'enemy-hp-val',  100);

  // Log vide
  const feed = document.getElementById('battle-log-feed');
  if (feed) feed.innerHTML = '';
}

function _renderBattleRow(containerId, team, side) {
  const row = document.getElementById(containerId);
  if (!row) return;
  row.innerHTML = '';

  for (const champ of team) {
    const el = document.createElement('div');
    el.className = `battle-champ ${side}`;
    el.id = `bc-${side}-${champ.index}`;
    el.innerHTML = `
      <div class="bc-avatar rarity-${champ.rarity}">${champ.emoji}</div>
      <div class="bc-hp-track"><div class="bc-hp-fill" style="width:100%"></div></div>
      <div class="bc-name">${champ.name}</div>
    `;
    row.appendChild(el);
  }
}

// ─── ANIMATION TOUR PAR TOUR ──────────────────────────────────
function _playBattleAnimation(result) {
  let roundIdx  = 0;
  let actionIdx = 0;

  // État courant des HP (en % de maxHp)
  const playerHP = result.pTeam.map(c => ({ cur: c.maxHp, max: c.maxHp }));
  const enemyHP  = result.eTeam.map(c => ({ cur: c.maxHp, max: c.maxHp }));

  const MS_PER_ACTION = () => Math.round(400 / _battleSpeed);

  function step() {
    if (roundIdx >= result.rounds.length) {
      // Combat terminé → afficher résultat
      setTimeout(() => showResult(), 800);
      return;
    }

    const round   = result.rounds[roundIdx];
    const actions = round.actions;

    if (actionIdx === 0) {
      const curRound = document.getElementById('battle-round');
      if (curRound) curRound.textContent = round.number;
    }

    const action = actions[actionIdx];
    if (action) _applyActionUI(action, playerHP, enemyHP);

    actionIdx++;
    if (actionIdx >= actions.length) {
      actionIdx = 0;
      roundIdx++;
    }

    _battleTimer = setTimeout(step, MS_PER_ACTION());
  }

  _battleTimer = setTimeout(step, 300);
}

function _applyActionUI(action, playerHP, enemyHP) {
  const isPlayerAtk = action.attackerSide === 'player';
  const targetSide  = action.targetSide;
  const hp          = targetSide === 'player' ? playerHP : enemyHP;
  const targetState = hp[action.targetIndex];
  if (!targetState) return;

  // Mettre à jour HP local
  targetState.cur = action.targetHpLeft;
  const pct = Math.max(0, Math.round((targetState.cur / targetState.max) * 100));

  // Animer le champion attaquant
  const atkEl = document.getElementById(`bc-${action.attackerSide}-${action.attackerIndex}`);
  if (atkEl) {
    atkEl.classList.add('attacking');
    setTimeout(() => atkEl.classList.remove('attacking'), 250);
  }

  // Mettre à jour HP de la cible
  const tgtEl = document.getElementById(`bc-${targetSide}-${action.targetIndex}`);
  if (tgtEl) {
    const fill = tgtEl.querySelector('.bc-hp-fill');
    if (fill) {
      fill.style.width = pct + '%';
      fill.classList.toggle('low', pct < 30);
    }
    if (action.isKO) tgtEl.classList.add('ko');

    // Texte flottant dégâts
    const dmgEl = document.createElement('div');
    dmgEl.className = `dmg-float${action.isCrit ? ' crit' : ''}${action.isKO ? ' ko-txt' : ''}`;
    dmgEl.textContent = action.isKO ? 'KO!' : (action.isCrit ? `⭐ ${action.dmg}` : `-${action.dmg}`);
    tgtEl.querySelector('.bc-avatar').appendChild(dmgEl);
    setTimeout(() => dmgEl.remove(), 900);
  }

  // Mettre à jour barres HP globales
  const playerAliveHP = (isPlayerAtk ? playerHP : playerHP).reduce((s, h) => s + h.cur, 0);
  const playerTotalHP = playerHP.reduce((s, h) => s + h.max, 0);
  const enemyAliveHP  = enemyHP.reduce((s, h) => s + h.cur, 0);
  const enemyTotalHP  = enemyHP.reduce((s, h) => s + h.max, 0);

  const pPct = Math.round((playerHP.reduce((s,h) => s+h.cur,0) / playerHP.reduce((s,h) => s+h.max,0)) * 100);
  const ePct = Math.round((enemyHP.reduce((s,h) => s+h.cur,0) / enemyHP.reduce((s,h) => s+h.max,0)) * 100);
  _setHPBar('player-hp-bar', 'player-hp-val', pPct);
  _setHPBar('enemy-hp-bar',  'enemy-hp-val',  ePct);

  // Log
  _addLogEntry(action);
}

function _addLogEntry(action) {
  const feed = document.getElementById('battle-log-feed');
  if (!feed) return;

  const side = action.attackerSide === 'player' ? 'log-player' : 'log-enemy';
  let txt  = action.attackerSide === 'player'
    ? `⚔ ${action.attackerName} → ${action.dmg} dégâts sur ${action.targetName}`
    : `🤖 ${action.attackerName} → ${action.dmg} dégâts sur ${action.targetName}`;
  if (action.isCrit) txt += ' ⭐ CRITIQUE !';
  if (action.isKO)   txt += ' 💀 KO !';

  const entry = document.createElement('div');
  entry.className = `log-entry ${side}${action.isCrit ? ' log-crit' : ''}`;
  entry.textContent = txt;
  feed.insertBefore(entry, feed.firstChild);

  // Garder seulement 3 entrées visibles
  while (feed.children.length > 3) feed.removeChild(feed.lastChild);
}

function _setHPBar(barId, valId, pct) {
  const bar = document.getElementById(barId);
  const val = document.getElementById(valId);
  if (bar) bar.style.width = Math.max(0, pct) + '%';
  if (val) val.textContent  = Math.max(0, pct) + '%';
}

// Contrôle vitesse
window.toggleBattleSpeed = function() {
  _battleSpeed = _battleSpeed === 1 ? 2 : 1;
  const btn = document.getElementById('battle-speed-btn');
  if (btn) btn.textContent = `⚡ ×${_battleSpeed}`;
};

// ════════════════════════════════════════════════════════════
//  PHASE 2 : RÉSULTAT
// ════════════════════════════════════════════════════════════
function showResult() {
  if (_battleTimer) { clearTimeout(_battleTimer); _battleTimer = null; }
  _showPhase('result');

  const result  = _currentBattleResult;
  const win     = result.winner === 'player';
  const rewards = win ? _currentRewards : { gold: 0, frags: 0, xp: 0 };

  const S     = _S;
  const world = S.get('activeWorld');
  const floor = S.get('activeFloor');
  const isBoss = floor >= 11;

  // Appliquer récompenses si victoire
  if (win) {
    S.addGold(rewards.gold);
    S.addFragments(rewards.frags);
    S.addAccountXP(rewards.xp);
    S.updateMission('waves', 1);
    S.updateMission('gold_earned', rewards.gold);
    S.save();
  }

  // Bannière
  const banner = document.getElementById('result-banner');
  const title  = document.getElementById('result-title');
  const sub    = document.getElementById('result-subtitle');
  if (banner) banner.className = win ? '' : 'defeat';
  if (title)  title.textContent  = win ? 'VICTOIRE !' : 'DÉFAITE…';
  if (sub)    sub.textContent    = win
    ? (isBoss ? `Boss W${world} vaincu !` : `Vague ${floor} / ${world > 1 ? world * 10 : 10} terminée`)
    : 'Ton équipe a besoin de renfort !';

  // Récompenses
  const rrGold  = document.getElementById('rr-gold');
  const rrFrags = document.getElementById('rr-frags');
  const rrXP    = document.getElementById('rr-xp');
  if (rrGold)  rrGold.textContent  = win ? `+${rewards.gold}`  : '0';
  if (rrFrags) rrFrags.textContent = win ? `+${rewards.frags}` : '0';
  if (rrXP)    rrXP.textContent    = win ? `+${rewards.xp} XP` : '0 XP';

  // Log
  const logEl = document.getElementById('result-combat-log');
  if (logEl) logEl.innerHTML = result.log.map(l => `<div>${l}</div>`).join('');

  // Boutons
  const btnNext  = document.getElementById('btn-next');
  const btnRetry = document.getElementById('btn-retry');
  if (btnNext) {
    if (win) {
      btnNext.style.display = '';
      if (isBoss) btnNext.textContent = '🌎 Monde suivant ➜';
      else        btnNext.textContent = 'Vague suivante ➜';
    } else {
      btnNext.style.display = 'none';
    }
  }
  if (btnRetry) {
    btnRetry.style.display = '';
    btnRetry.textContent   = win ? '↺ Rejouer' : '↺ Réessayer';
  }
}

window.nextWave = function() {
  if (!_currentBattleResult || _currentBattleResult.winner !== 'player') return;
  _S.advanceFloor();
  _S.save();
  if (window.renderHUD) window.renderHUD(_S);
  renderWaveSelect();
};

window.retryWave = function() {
  renderWaveSelect();
};

// ─── HELPER PHASES ───────────────────────────────────────────
function _showPhase(phase) {
  ['wave-select', 'battle', 'result'].forEach(p => {
    const el = document.getElementById(`phase-${p}`);
    if (el) el.classList.toggle('hidden', p !== phase);
  });
}

// ─── MODAL CHAMPION ──────────────────────────────────────────
window.openChampionModal = function(pog) {
  const modal   = document.getElementById('champion-modal');
  const content = document.getElementById('modal-content');
  if (!modal || !content) return;

  const stats = getChampionStats(pog);
  const rarityColor = {
    C: 'var(--rarity-c)', R: 'var(--rarity-r)',
    E: 'var(--rarity-e)', L: 'var(--rarity-l)', M: 'var(--rarity-m)',
  }[pog.rarity] || '#fff';

  content.innerHTML = `
    <div class="modal-champ-header">
      <div class="modal-champ-avatar" style="border-color:${rarityColor};background:var(--bg-mid)">${pog.emoji}</div>
      <div>
        <div class="modal-champ-name">${pog.name}</div>
        <div class="modal-champ-rarity" style="color:${rarityColor}">${RARITY_NAMES[pog.rarity]} · ${pog.role}</div>
      </div>
    </div>

    <div class="modal-stat-grid">
      <div class="modal-stat"><div class="modal-stat-name">❤️ Vie</div><div class="modal-stat-val">${stats.hp}</div></div>
      <div class="modal-stat"><div class="modal-stat-name">⚔️ Attaque</div><div class="modal-stat-val">${stats.atk}</div></div>
      <div class="modal-stat"><div class="modal-stat-name">⚡ Vitesse</div><div class="modal-stat-val">${stats.spd.toFixed(1)}×</div></div>
      <div class="modal-stat"><div class="modal-stat-name">⭐ Critique</div><div class="modal-stat-val">${Math.round(stats.crit * 100)}%</div></div>
    </div>

    <div class="modal-effect-box">
      ✨ Effet passif : ${pog.effectDesc}
    </div>

    <p style="font-size:12px;color:var(--text-secondary);font-style:italic;margin-bottom:16px;">"${pog.lore}"</p>

    <button class="modal-equip-btn btn-primary" onclick="window.equipFromModal('${pog.id}','${pog.rarity}')">
      Équiper dans l'équipe
    </button>
  `;

  modal.classList.remove('hidden');
};

window.closeChampionModal = function() {
  const modal = document.getElementById('champion-modal');
  if (modal) modal.classList.add('hidden');
};

window.equipFromModal = function(pogId, rarity) {
  const { toggleEquip } = window._gacha || {};
  if (toggleEquip) toggleEquip(pogId, rarity, undefined, _S);
  window.closeChampionModal();
  renderWaveSelect();
  if (window.renderCollection) window.renderCollection(_S);
};