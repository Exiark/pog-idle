// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/ui/packOpening.js
// ══════════════════════════════════════════════════════════════

import { PACK_CONFIG } from '../core/economy.js';
import { openPack }   from '../core/gacha.js';
import { RARITY_NAMES } from '../data/pogs.js';

let _S = null;

export function initPackOpening(S) {
  _S = S;
  renderPackPanel();
}

export function renderPackPanel() {
  const wrap = document.getElementById('pack-opening-wrap');
  if (!wrap) return;
  const S = _S;

  wrap.innerHTML = `<div class="section-title">🎁 Ouvrir des packs</div>`;

  for (const cfg of Object.values(PACK_CONFIG)) {
    const canBuy = cfg.cost.type === 'gold'
      ? S.get('gold') >= cfg.cost.amount
      : S.get('gems') >= cfg.cost.amount;

    const rateStr = Object.entries(cfg.rates)
      .map(([r, v]) => `<span class="rate-pill rate-${r.toLowerCase()}">${RARITY_NAMES[r]} ${v}%</span>`)
      .join('');

    const card = document.createElement('div');
    card.className = 'pack-card';
    card.innerHTML = `
      <div class="pack-header">
        <span class="pack-icon">${cfg.emoji}</span>
        <div>
          <div class="pack-name">${cfg.name}</div>
          <div class="pack-desc">${cfg.desc}</div>
        </div>
      </div>
      <div class="pack-rates">${rateStr}</div>
      <button class="pack-btn ${cfg.cost.type === 'gold' ? 'pack-btn-gold' : 'pack-btn-gem'}"
        ${canBuy ? '' : 'disabled style="opacity:0.45;cursor:not-allowed"'}
        onclick="window.buyPack('${cfg.id}')">
        ${cfg.cost.type === 'gold' ? '🪙' : '💎'} ${cfg.cost.amount} · Ouvrir ${cfg.count} champion${cfg.count > 1 ? 's' : ''}
      </button>
    `;
    wrap.appendChild(card);
  }
}

window.buyPack = function(packId) {
  const result = openPack(packId, _S);
  if (!result) {
    _showToast('Ressources insuffisantes !');
    return;
  }
  if (window.renderHUD) window.renderHUD(_S);
  _showPackReveal(result.pogs, () => {
    renderPackPanel();
    if (window.renderCollection) window.renderCollection(_S);
  });
};

function _showPackReveal(pogs, onClose) {
  const overlay = document.createElement('div');
  overlay.id = 'pack-result-overlay';

  const rarityColors = {
    C: 'var(--rarity-c)', R: 'var(--rarity-r)',
    E: 'var(--rarity-e)', L: 'var(--rarity-l)', M: 'var(--rarity-m)'
  };

  const pogsHTML = pogs.map((p, i) => `
    <div class="pack-pog-reveal${p.isNew ? ' new-badge' : ''}"
      style="border-color:${rarityColors[p.rarity]};animation-delay:${i * 0.12}s;box-shadow:0 0 12px ${rarityColors[p.rarity]}55">
      <div class="rp-emoji">${p.emoji}</div>
      <div class="rp-name">${p.name}</div>
      <div class="rr-val" style="font-size:10px;color:${rarityColors[p.rarity]}">${RARITY_NAMES[p.rarity]}</div>
      ${p.isNew ? '<div class="rr-val" style="font-size:9px;color:var(--gold)">NOUVEAU ✦</div>' : ''}
    </div>
  `).join('');

  overlay.innerHTML = `
    <div style="font-family:var(--font-title);font-size:22px;color:var(--gold);margin-bottom:4px">Champions obtenus !</div>
    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px">${pogs.length} champion${pogs.length>1?'s':''} rejoignent ta collection</div>
    <div class="pack-reveal-grid">${pogsHTML}</div>
    <button class="btn-primary" style="margin-top:16px;padding:14px 40px;width:auto;border-radius:var(--radius-md)"
      onclick="this.closest('#pack-result-overlay').remove(); (${onClose.toString()})()">
      Continuer ➜
    </button>
  `;

  document.body.appendChild(overlay);
}

function _showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:var(--bg-dark);border:1px solid rgba(255,255,255,0.15);border-radius:20px;
    padding:10px 20px;font-size:13px;font-weight:700;color:var(--coral);z-index:999;
    animation:floatUp 2s ease-out forwards`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}