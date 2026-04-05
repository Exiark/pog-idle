// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/core/combat.js
//  Système de combat 6v6 Champions
//  Chaque pog équipé = un combattant visible dans l'arène
// ══════════════════════════════════════════════════════════════

import { getPogById, POGS, POGS_BOSS, getChampionStats } from '../data/pogs.js';
import { WORLDS }   from '../data/worlds.js';
import { KINIS }    from '../data/kinis.js';

// ─── GÉNÉRATION ÉQUIPE ENNEMIE ────────────────────────────────
/**
 * Génère une équipe de 6 champions ennemis pour une vague donnée.
 * La difficulté scale avec le monde et la vague.
 */
export function generateEnemyTeam(world, floor) {
  const isBoss = floor >= 11;

  if (isBoss) {
    // Boss = pog boss + 5 sbires épiques/légendaires
    const bossData = POGS_BOSS[world - 1];
    const minions  = _pickRandomPogs(['E', 'L'], 5);
    const boss     = { ...bossData, ...getChampionStats(bossData), isBoss: true };
    const team     = [boss, ...minions.map(p => ({ ...p, ...getChampionStats(p) }))];
    return _scaleTeam(team, world, floor);
  }

  // Vague normale : mix de raretés selon progression
  let rarityPool = ['C', 'C', 'C', 'R', 'R', 'C'];
  if (world >= 2) rarityPool = ['C', 'R', 'R', 'R', 'E', 'R'];
  if (world >= 3) rarityPool = ['R', 'R', 'E', 'E', 'R', 'R'];
  if (world >= 4) rarityPool = ['R', 'E', 'E', 'E', 'L', 'E'];
  if (world >= 5) rarityPool = ['E', 'E', 'L', 'E', 'E', 'E'];
  if (world >= 6) rarityPool = ['E', 'L', 'L', 'E', 'L', 'E'];
  if (world >= 7) rarityPool = ['L', 'L', 'M', 'L', 'L', 'L'];

  const pogs = rarityPool.map(r => {
    const pool = POGS.filter(p => p.rarity === r);
    const p    = pool[Math.floor(Math.random() * pool.length)];
    return { ...p, ...getChampionStats(p) };
  });

  return _scaleTeam(pogs, world, floor);
}

function _pickRandomPogs(rarities, count) {
  const pool = POGS.filter(p => rarities.includes(p.rarity));
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return result;
}

function _scaleTeam(team, world, floor) {
  // Scaling : HP et ATK augmentent avec la progression
  const worldMult = 1 + (world - 1) * 0.6;
  const floorMult = 1 + (floor - 1) * 0.08;
  const total     = worldMult * floorMult;
  return team.map(p => ({
    ...p,
    hp:  Math.round(p.hp  * total),
    atk: Math.round(p.atk * total),
  }));
}

// ─── GÉNÉRATION ÉQUIPE JOUEUR ─────────────────────────────────
/**
 * Construit l'équipe joueur depuis les pogs équipés.
 * Les slots vides sont remplis par des pogs communs de base.
 */
export function buildPlayerTeam(equippedPogs, kini) {
  const fallbackPool = POGS.filter(p => p.rarity === 'C');
  const kiniBonus    = _getKiniBonus(kini);

  return equippedPogs.map((slot, i) => {
    let pog;
    if (slot && slot.id) {
      pog = getPogById(slot.id) || fallbackPool[i % fallbackPool.length];
    } else {
      pog = fallbackPool[i % fallbackPool.length];
    }
    const stats = getChampionStats(pog);
    // Appliquer bonus kini
    return {
      ...pog,
      hp:   Math.round(stats.hp   * kiniBonus.hp),
      atk:  Math.round(stats.atk  * kiniBonus.atk),
      spd:  stats.spd  * kiniBonus.spd,
      crit: Math.min(stats.crit + kiniBonus.crit, 0.95),
      def:  Math.min(stats.def  + kiniBonus.def,  0.75),
    };
  });
}

function _getKiniBonus(kini) {
  const base = { hp: 1, atk: 1, spd: 1, crit: 0, def: 0 };
  if (!kini) return base;
  return {
    hp:   1,
    atk:  kini.power  ? 1 + (kini.power - 10) / 30 : 1,
    spd:  kini.speed  || 1,
    crit: kini.chance || 0,
    def:  0,
  };
}

// ─── SIMULATION COMBAT ────────────────────────────────────────
/**
 * Simule l'intégralité du combat à l'avance.
 * Retourne un tableau de "rounds" : chaque round = une liste d'actions.
 *
 * @param {Array} playerTeam  - pogs du joueur avec stats
 * @param {Array} enemyTeam   - pogs ennemis avec stats
 * @param {Object} talentBonuses - bonus talents actifs
 * @returns {{ rounds: Array, winner: 'player'|'enemy', log: Array }}
 */
export function simulateBattle(playerTeam, enemyTeam, talentBonuses = {}) {
  // Copie profonde pour simulation (on ne modifie pas les originaux)
  const pTeam = playerTeam.map((p, i) => ({
    ...p,
    currentHp: p.hp,
    maxHp:     p.hp,
    index:     i,
    side:      'player',
    alive:     true,
  }));
  const eTeam = enemyTeam.map((p, i) => ({
    ...p,
    currentHp: p.hp,
    maxHp:     p.hp,
    index:     i,
    side:      'enemy',
    alive:     true,
  }));

  const critMult = 1 + (talentBonuses.critBonus || 0);

  const rounds = [];
  const MAX_ROUNDS = 30;

  for (let r = 0; r < MAX_ROUNDS; r++) {
    const round = { number: r + 1, actions: [] };

    // Ordre d'attaque : alterné (joueur, ennemi, joueur, ...)
    // Chaque champion vivant attaque une fois par round
    const aliveP = pTeam.filter(c => c.alive);
    const aliveE = eTeam.filter(c => c.alive);
    if (!aliveP.length || !aliveE.length) break;

    // Les champions joueurs attaquent
    for (const attacker of aliveP) {
      const targets = eTeam.filter(c => c.alive);
      if (!targets.length) break;
      const target = _pickTarget(targets);
      const action = _resolveAttack(attacker, target, critMult);
      round.actions.push(action);
    }

    // Les champions ennemis ripostent
    for (const attacker of aliveE) {
      if (!attacker.alive) continue;
      const targets = pTeam.filter(c => c.alive);
      if (!targets.length) break;
      const target = _pickTarget(targets);
      const action = _resolveAttack(attacker, target, 1);
      round.actions.push(action);
    }

    rounds.push(round);

    // Vérifier fin de combat
    if (!pTeam.some(c => c.alive) || !eTeam.some(c => c.alive)) break;
  }

  const playerAlive = pTeam.some(c => c.alive);
  const enemyAlive  = eTeam.some(c => c.alive);

  let winner;
  if (playerAlive && !enemyAlive) winner = 'player';
  else if (!playerAlive && enemyAlive) winner = 'enemy';
  else winner = _computeHPadvantage(pTeam, eTeam); // timeout → compare HP restants

  // Log textuel condensé pour l'écran de résultat
  const log = _buildSummaryLog(rounds, playerTeam, enemyTeam);

  return {
    rounds,
    winner,
    log,
    finalPlayerHP: pTeam.map(c => c.currentHp),
    finalEnemyHP:  eTeam.map(c => c.currentHp),
    pTeam,
    eTeam,
  };
}

function _pickTarget(team) {
  // Cible le champion avec le moins de HP (stratégie focus)
  return team.reduce((a, b) => a.currentHp < b.currentHp ? a : b);
}

function _resolveAttack(attacker, target, critMult) {
  const isCrit = Math.random() < attacker.crit;
  let dmg = Math.round(attacker.atk * (isCrit ? 2 * critMult : 1));
  // Réduction par défense de la cible
  dmg = Math.max(1, Math.round(dmg * (1 - target.def)));
  target.currentHp = Math.max(0, target.currentHp - dmg);
  if (target.currentHp === 0) target.alive = false;

  return {
    attackerSide:  attacker.side,
    attackerIndex: attacker.index,
    attackerName:  attacker.name,
    attackerEmoji: attacker.emoji,
    targetSide:    target.side,
    targetIndex:   target.index,
    targetName:    target.name,
    dmg,
    isCrit,
    isKO:          target.currentHp === 0,
    targetHpLeft:  target.currentHp,
    targetMaxHp:   target.maxHp,
  };
}

function _computeHPadvantage(pTeam, eTeam) {
  const pHP = pTeam.reduce((s, c) => s + c.currentHp, 0);
  const eHP = eTeam.reduce((s, c) => s + c.currentHp, 0);
  return pHP >= eHP ? 'player' : 'enemy';
}

function _buildSummaryLog(rounds, playerTeam, enemyTeam) {
  const lines = [];
  let playerKOs = 0;
  let enemyKOs  = 0;
  let playerCrits = 0;

  for (const round of rounds) {
    for (const a of round.actions) {
      if (a.isKO)   { a.attackerSide === 'player' ? enemyKOs++ : playerKOs++; }
      if (a.isCrit && a.attackerSide === 'player') playerCrits++;
    }
  }

  lines.push(`⚔ ${rounds.length} manches disputées`);
  lines.push(`💥 Tu as éliminé ${enemyKOs} ennemi(s)`);
  if (playerKOs > 0) lines.push(`💀 Tu as perdu ${playerKOs} champion(s)`);
  if (playerCrits > 0) lines.push(`⭐ ${playerCrits} coup(s) critique(s) !`);

  return lines;
}

// ─── CALCUL POWER (affichage écran de sélection) ──────────────
export function calcTeamPower(team) {
  return team.reduce((sum, p) => {
    if (!p) return sum;
    const stats = getChampionStats(p);
    return sum + stats.hp / 5 + stats.atk * 3 + stats.crit * 100 + stats.spd * 20;
  }, 0);
}

export function calcEnemyPower(enemyTeam) {
  return enemyTeam.reduce((sum, p) => sum + p.hp / 5 + p.atk * 3, 0);
}