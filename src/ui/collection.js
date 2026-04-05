// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/ui/collection.js
//  Grille de pogs + slots d'équipement
// ══════════════════════════════════════════════════════════════

import { POGS, getPogById, RARITY_NAMES } from '../data/pogs.js';
import { getCollectionStats, toggleEquip } from '../core/gacha.js';

export function renderCollection(S) {
  _renderStats(S);
  _renderEquipSlots(S);
  _renderPogsGrid(S);
}

function _renderStats(S) {
  const stats = getCollectionStats(S);
  const row   = document.getElementById('collection-stats-row');
  if (!row) return;
  row.innerHTML = `
    <div class="coll-stat"><div class="coll-stat-val">${stats.unique}/${stats.totalPogs}</div><div class="coll-stat-lbl">Uniques</div></div>
    <div class="coll-stat"><div class="coll-stat-val">${stats.total}</div><div class="coll-stat-lbl">Total</div></div>
    <div class="coll-stat"><div class="coll-stat-val" style="color:var(--rarity-e)">${stats.byRarity.E}</div><div class="coll-stat-lbl">Épiques</div></div>
    <div class="coll-stat"><div class="coll-stat-val" style="color:var(--rarity-l)">${stats.byRarity.L}</div><div class="coll-stat-lbl">Légendaires</div></div>
  `;
}

function _renderEquipSlots(S) {
  const row     = document.getElementById('equip-slots-row');
  if (!row) return;
  const equipped = S.getEquippedTeam();
  row.innerHTML  = '';

  for (let i = 0; i < 6; i++) {
    const slot = equipped[i];
    const pog  = slot ? getPogById(slot.id) : null;
    const el   = document.createElement('div');
    el.className = `equip-slot${pog ? ' filled rarity-' + (slot?.rarity || 'C') : ''}`;
    el.innerHTML = pog ? `${pog.emoji}<span class="slot-num">${i+1}</span>` : `<span style="color:var(--text-muted);font-size:12px">${i+1}</span>`;
    el.title = pog ? `Slot ${i+1}: ${pog.name}` : `Slot ${i+1}: vide`;
    el.onclick = () => {
      if (pog) {
        S.unequipPog(i);
        S.save();
        renderCollection(S);
        if (window.renderArena) window.renderArena();
      }
    };
    row.appendChild(el);
  }
}

function _renderPogsGrid(S) {
  const grid = document.getElementById('pogs-grid');
  if (!grid) return;
  const coll    = S.get('collection');
  const equip   = S.getEquippedTeam();
  grid.innerHTML = '';

  // Grouper par id unique
  const unique = {};
  for (const p of coll) {
    if (!unique[p.id]) unique[p.id] = { id: p.id, rarity: p.rarity, count: 0 };
    unique[p.id].count++;
    // Upgrade rarity si on a une meilleure copie
    const order = ['C','R','E','L','M'];
    if (order.indexOf(p.rarity) > order.indexOf(unique[p.id].rarity)) {
      unique[p.id].rarity = p.rarity;
    }
  }

  if (Object.keys(unique).length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px 0">
      Ouvre des packs pour obtenir des champions !
    </div>`;
    return;
  }

  // Trier : légendaires/mythiques en premier
  const order = ['M','L','E','R','C'];
  const sorted = Object.values(unique).sort((a,b) =>
    order.indexOf(a.rarity) - order.indexOf(b.rarity)
  );

  for (const entry of sorted) {
    const pog     = getPogById(entry.id);
    if (!pog) continue;
    const isEquipped = equip.some(s => s && s.id === entry.id);
    const card    = document.createElement('div');
    card.className = `pog-card rarity-${entry.rarity}${isEquipped ? ' equipped' : ''}`;

    const rarityColors = {
      C: 'var(--rarity-c)', R: 'var(--rarity-r)',
      E: 'var(--rarity-e)', L: 'var(--rarity-l)', M: 'var(--rarity-m)'
    };

    card.innerHTML = `
      ${entry.count > 1 ? `<span class="pog-count">×${entry.count}</span>` : ''}
      <div class="pog-emoji">${pog.emoji}</div>
      <div class="pog-name">${pog.name}</div>
      <div class="pog-rarity-dot" style="background:${rarityColors[entry.rarity]}"></div>
    `;

    card.onclick = () => {
      window.openChampionModal({ ...pog, rarity: entry.rarity });
    };

    grid.appendChild(card);
  }
}

window.renderCollection = renderCollection;