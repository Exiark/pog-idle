// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/core/gacha.js
//  Ouverture de packs, fusion, équipement de champions
// ══════════════════════════════════════════════════════════════

import { POGS }         from '../data/pogs.js';
import { PACK_CONFIG, PITY_EPIC, PITY_LEGENDARY, FUSION_COST, FUSION_FRAGS, FUSION_RARITY } from './economy.js';

// ─── TIRAGE D'UN PACK ────────────────────────────────────────
/**
 * Ouvre un pack et retourne les pogs tirés.
 * Applique le système de pity.
 * @param {string} packId  - 'basic' | 'rare' | 'premium'
 * @param {GameState} S
 * @returns {{ pogs: Array<{id,rarity,isNew}>, cost: Object } | null }
 */
export function openPack(packId, S) {
  const cfg = PACK_CONFIG[packId];
  if (!cfg) return null;

  // Vérifier ressources
  const cost = cfg.cost;
  if (cost.type === 'gold' && S.get('gold') < cost.amount) return null;
  if (cost.type === 'gems' && S.get('gems') < cost.amount) return null;

  // Débiter
  if (cost.type === 'gold') S.addGold(-cost.amount);
  else                      S.addGems(-cost.amount);

  // Tirer les pogs
  const pulled = [];
  for (let i = 0; i < cfg.count; i++) {
    const rarity = _drawRarity(cfg.rates, S);
    const pog    = _pickPog(rarity);
    const isNew  = S.countPog(pog.id) === 0;
    S.addToCollection(pog.id, rarity);
    pulled.push({ ...pog, rarity, isNew });
    S.data.totalPulls++;
    S.updateMission('packs', 1 / cfg.count);
  }

  S.save();
  return { pogs: pulled, cost };
}

function _drawRarity(rates, S) {
  let pity = S.get('pityL') || 0;
  S.set('pityL', pity + 1);
  S.set('pityE', (S.get('pityE') || 0) + 1);

  // Légendaire garanti
  if (S.get('pityL') >= PITY_LEGENDARY) {
    S.set('pityL', 0);
    S.set('pityE', 0);
    return 'L';
  }
  // Épique garanti
  if (S.get('pityE') >= PITY_EPIC) {
    S.set('pityE', 0);
    return 'E';
  }

  // Tirage normal
  const roll = Math.random() * 100;
  let acc = 0;
  for (const [r, chance] of Object.entries(rates)) {
    acc += chance;
    if (roll < acc) {
      if (r === 'L' || r === 'M') { S.set('pityL', 0); S.set('pityE', 0); }
      if (r === 'E')              { S.set('pityE', 0); }
      return r;
    }
  }
  return 'C';
}

function _pickPog(rarity) {
  const pool = POGS.filter(p => p.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── FUSION ──────────────────────────────────────────────────
/**
 * Fusionne 3 copies d'un pog en un de rareté supérieure.
 * @returns {{ result: pog, newRarity: string } | null}
 */
export function checkFusion(pogId, S) {
  const count = S.countPog(pogId);
  if (count < FUSION_COST) return null;

  // Trouver la rareté actuelle
  const existing = S.get('collection').find(p => p.id === pogId);
  if (!existing) return null;

  const newRarity = FUSION_RARITY[existing.rarity];
  if (!newRarity || newRarity === existing.rarity) return null;

  // Retirer 3 exemplaires
  let removed = 0;
  S.data.collection = S.get('collection').filter(p => {
    if (p.id === pogId && removed < FUSION_COST) { removed++; return false; }
    return true;
  });

  // Ajouter le nouveau
  S.addToCollection(pogId, newRarity);
  S.addFragments(FUSION_FRAGS);

  const pog = POGS.find(p => p.id === pogId);
  return { result: { ...pog, rarity: newRarity }, newRarity };
}

// ─── ÉQUIPEMENT ──────────────────────────────────────────────
/**
 * Bascule l'équipement d'un pog dans un slot.
 * Si le slot est spécifié, l'équipe là. Sinon cherche le premier slot libre.
 */
export function toggleEquip(pogId, rarity, slot, S) {
  const equipped = S.getEquippedTeam();

  // Déjà dans ce slot → déséquiper
  if (slot !== undefined && equipped[slot] && equipped[slot].id === pogId) {
    S.unequipPog(slot);
    S.save();
    return { action: 'unequip', slot };
  }

  // Équiper dans le slot donné ou le premier slot libre
  const targetSlot = slot !== undefined ? slot : equipped.findIndex(s => !s);
  if (targetSlot === -1) {
    // Tous les slots sont pleins → remplacer le slot 0
    S.equipPog(0, pogId, rarity);
    S.save();
    return { action: 'equip', slot: 0 };
  }

  S.equipPog(targetSlot, pogId, rarity);
  S.save();
  return { action: 'equip', slot: targetSlot };
}

// ─── STATS COLLECTION ─────────────────────────────────────────
export function getCollectionStats(S) {
  const coll = S.get('collection');
  const unique = new Set(coll.map(p => p.id));
  const byRarity = { C: 0, R: 0, E: 0, L: 0, M: 0 };
  for (const p of coll) if (byRarity[p.rarity] !== undefined) byRarity[p.rarity]++;
  return {
    total:     coll.length,
    unique:    unique.size,
    totalPogs: 30, // nombre de pogs normaux en gacha
    byRarity,
  };
}