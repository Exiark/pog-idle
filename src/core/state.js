// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/core/state.js
//  GameState, load/save localStorage, calcul idle offline
// ══════════════════════════════════════════════════════════════

import { MISSIONS_DEFAULT } from './economy.js';

const SAVE_KEY = 'pog_idle_v1';
const IDLE_MAX_HOURS = 8;

export const DEFAULT_STATE = {
  version: '1.0.0',

  // ── Ressources ──
  gold:      250,
  gems:      15,
  fragments: 0,
  tokens:    0,

  // ── Progression monde ──
  currentWorld:    1,   // monde le plus avancé débloqué
  currentFloor:    1,   // vague dans ce monde (1-11, 11 = boss)
  activeWorld:     1,   // monde sur lequel on joue actuellement
  activeFloor:     1,   // vague active
  unlockedWorlds: [1],
  bossesDefeated: [],   // ['w1', 'w2'…]

  // ── Collection & équipement ──
  collection:    [],    // [{ id, rarity }] — peut avoir plusieurs exemplaires
  equippedPogs: Array(6).fill(null),  // 6 slots = équipe de 6 champions

  // ── Kini ──
  selectedKini: 0,
  worldKinis:   [],     // kinis exclusifs boss débloqués
  worldPogs:    [],     // pogs boss obtenus

  // ── Gacha pity ──
  pityE: 0,   // compteur pulls depuis dernier épique
  pityL: 0,   // compteur pulls depuis dernier légendaire
  totalPulls: 0,

  // ── Talents ──
  talentPoints:   0,
  talentsUnlocked: [],

  // ── Compte ──
  accountXP:    0,
  accountLevel: 0,   // 0-5

  // ── Daily / Missions ──
  lastSeen:    Date.now(),
  dailyClaimed: false,
  dailyDay:    0,
  missions:    [],

  // ── Stripe ──
  stripeCustomerId: null,
};

export class GameState {
  constructor() {
    this.data = { ...DEFAULT_STATE };
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        this.data = { ...DEFAULT_STATE, missions: MISSIONS_DEFAULT.map(m => ({ ...m, progress: 0, claimed: false })) };
        return;
      }
      const saved = JSON.parse(raw);
      // Merge: les nouvelles clés de DEFAULT_STATE sont ajoutées
      this.data = { ...DEFAULT_STATE, ...saved };
      // S'assurer que equippedPogs a 6 slots
      if (!this.data.equippedPogs || this.data.equippedPogs.length < 6) {
        this.data.equippedPogs = Array(6).fill(null);
      }
    } catch (e) {
      console.warn('[State] Erreur chargement, reset:', e);
      this.data = { ...DEFAULT_STATE, missions: MISSIONS_DEFAULT.map(m => ({ ...m, progress: 0, claimed: false })) };
    }
  }

  save() {
    try {
      this.data.lastSeen = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[State] Erreur sauvegarde:', e);
    }
  }

  /** Calcule l'or gagné pendant l'absence du joueur */
  calcOfflineGold(idleRatePerSec) {
    const now = Date.now();
    const elapsed = (now - this.data.lastSeen) / 1000; // secondes
    const maxSec  = IDLE_MAX_HOURS * 3600;
    const clipped = Math.min(elapsed, maxSec);
    return Math.floor(clipped * idleRatePerSec);
  }

  /** Accès direct aux données */
  get(key) { return this.data[key]; }
  set(key, val) { this.data[key] = val; }

  /** Ajoute une ressource */
  addGold(n)      { this.data.gold      = Math.max(0, this.data.gold + n); }
  addGems(n)      { this.data.gems      = Math.max(0, this.data.gems + n); }
  addFragments(n) { this.data.fragments = Math.max(0, this.data.fragments + n); }
  addTokens(n)    { this.data.tokens    = Math.max(0, this.data.tokens + n); }

  /** XP compte → niveau (niveau max 5, +1 talentPoint par niveau) */
  addAccountXP(xp) {
    this.data.accountXP += xp;
    const thresholds = [0, 200, 600, 1400, 3000, 6000];
    let lvl = 0;
    for (let i = 1; i < thresholds.length; i++) {
      if (this.data.accountXP >= thresholds[i]) lvl = i;
    }
    if (lvl > this.data.accountLevel) {
      const gained = lvl - this.data.accountLevel;
      this.data.accountLevel = lvl;
      this.data.talentPoints += gained;
    }
    return this.data.accountLevel;
  }

  /** Collection : ajoute un pog (id + rarity) */
  addToCollection(id, rarity) {
    this.data.collection.push({ id, rarity });
  }

  /** Collection : compte les exemplaires d'un pog */
  countPog(id) {
    return this.data.collection.filter(p => p.id === id).length;
  }

  /** Retourne les 6 pogs équipés avec leurs données complètes (peut contenir null) */
  getEquippedTeam() {
    return this.data.equippedPogs; // array de { id, rarity } | null
  }

  /** Équipe un pog dans un slot */
  equipPog(slot, id, rarity) {
    if (slot < 0 || slot >= 6) return;
    this.data.equippedPogs[slot] = id ? { id, rarity } : null;
  }

  /** Déséquipe un slot */
  unequipPog(slot) {
    this.data.equippedPogs[slot] = null;
  }

  /** Avance d'une vague */
  advanceFloor() {
    const maxFloor = 11; // 10 vagues + 1 boss
    if (this.data.activeFloor < maxFloor) {
      this.data.activeFloor++;
    } else {
      // Vague boss terminée → monde suivant
      const world = this.data.activeWorld;
      if (!this.data.bossesDefeated.includes(`w${world}`)) {
        this.data.bossesDefeated.push(`w${world}`);
      }
      const nextWorld = world + 1;
      if (nextWorld <= 7 && !this.data.unlockedWorlds.includes(nextWorld)) {
        this.data.unlockedWorlds.push(nextWorld);
      }
      this.data.currentWorld = Math.max(this.data.currentWorld, Math.min(nextWorld, 7));
      this.data.currentFloor = 1;
      this.data.activeWorld  = this.data.currentWorld;
      this.data.activeFloor  = 1;
    }
  }

  /** Vérifie si une mission doit être mise à jour */
  updateMission(type, amount = 1) {
    if (!this.data.missions) return;
    this.data.missions = this.data.missions.map(m => {
      if (m.type === type && !m.claimed) {
        return { ...m, progress: Math.min(m.progress + amount, m.target) };
      }
      return m;
    });
  }
}