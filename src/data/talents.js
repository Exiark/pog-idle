// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/data/talents.js
// ══════════════════════════════════════════════════════════════

export const TALENTS = [
  // ── Rangée 1 ──────────────────────────────────────────────
  { id: 't1', name: 'Vitesse+',     icon: '⚡', row: 1, desc: 'Vitesse équipe +10%',   requires: [] },
  { id: 't2', name: 'Critique+',    icon: '⭐', row: 1, desc: 'Chance crit +10%',      requires: [] },
  { id: 't3', name: 'Résistance+',  icon: '🛡️', row: 1, desc: 'Dégâts reçus -20%',    requires: [] },

  // ── Rangée 2 (nécessite rangée 1) ─────────────────────────
  { id: 't4', name: 'Or+',          icon: '🪙', row: 2, desc: 'Or gagné +15%',         requires: ['t1','t2','t3'] },
  { id: 't5', name: 'Idle+',        icon: '💤', row: 2, desc: 'Or idle +50%',          requires: ['t1','t2','t3'] },
  { id: 't6', name: 'Fragments+',   icon: '🔩', row: 2, desc: '+2 fragments/vague',    requires: ['t1','t2','t3'] },

  // ── Rangée 3 (nécessite rangée 2) ─────────────────────────
  { id: 't7', name: 'Gemmes+',      icon: '💎', row: 3, desc: '+1 gemme/vague',        requires: ['t4','t5','t6'] },
  { id: 't8', name: 'Synergies+',   icon: '🔗', row: 3, desc: 'Synergies équipe +20%', requires: ['t4','t5','t6'] },
  { id: 't9', name: 'Slot+',        icon: '➕', row: 3, desc: '+1 slot équipement',    requires: ['t4','t5','t6'] },
];