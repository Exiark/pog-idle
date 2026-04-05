// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/ui/hud.js
// ══════════════════════════════════════════════════════════════

import { calcIdleRate } from '../core/economy.js';

export function renderHUD(S) {
  const gold  = document.getElementById('gold-display');
  const gems  = document.getElementById('gems-display');
  const frags = document.getElementById('frags-display');
  if (gold)  gold.textContent  = _fmt(S.get('gold'));
  if (gems)  gems.textContent  = S.get('gems');
  if (frags) frags.textContent = S.get('fragments');

  const lvl = document.getElementById('account-level-text');
  if (lvl) lvl.textContent = `Niv. ${S.get('accountLevel') + 1}`;

  const xpFill = document.getElementById('xp-bar-fill');
  if (xpFill) {
    const thresholds = [0, 200, 600, 1400, 3000, 6000];
    const l  = S.get('accountLevel');
    const xp = S.get('accountXP');
    if (l < thresholds.length - 1) {
      const pct = Math.round(((xp - thresholds[l]) / (thresholds[l+1] - thresholds[l])) * 100);
      xpFill.style.width = Math.min(100, Math.max(0, pct)) + '%';
    } else {
      xpFill.style.width = '100%';
    }
  }

  const idleEl = document.getElementById('idle-rate');
  if (idleEl) {
    const rate = calcIdleRate(S.get('currentWorld'), S.get('talentsUnlocked') || []);
    idleEl.textContent = rate >= 1 ? `+${_fmt(rate)}` : `+${rate.toFixed(2)}`;
  }
}

function _fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}