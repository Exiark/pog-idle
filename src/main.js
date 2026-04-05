// ══════════════════════════════════════════════════════════════
//  POG IDLE — src/main.js
//  Orchestration, tabs, boucle idle, init
// ══════════════════════════════════════════════════════════════

import { GameState }     from './core/state.js';
import { initArena, renderWaveSelect, startBattle } from './ui/arena.js';
import { renderHUD }     from './ui/hud.js';
import { renderCollection } from './ui/collection.js';
import { initPackOpening, renderPackPanel } from './ui/packOpening.js';
import { renderKiniPanel, renderTalentTree, renderDailyPanel, renderTower }
  from './ui/panels.js';
import { calcIdleRate }  from './core/economy.js';
import { toggleEquip }   from './core/gacha.js';
import { MISSIONS_DEFAULT } from './core/economy.js';

// ─── INIT ──────────────────────────────────────────────────
const S = new GameState();
S.load();

// Initialiser les missions si vides
if (!S.get('missions') || S.get('missions').length === 0) {
  S.set('missions', MISSIONS_DEFAULT.map(m => ({ ...m, progress: 0, claimed: false })));
  S.save();
}

// Exposer globalement
window._state = S;
window._gacha = { toggleEquip };
window.renderHUD        = renderHUD;
window.renderCollection = renderCollection;
window.renderArena      = renderWaveSelect;

// ─── TABS ─────────────────────────────────────────────────
const TAB_RENDERERS = {
  combat:     () => { /* déjà rendu par initArena */ },
  tower:      () => renderTower(S),
  kinis:      () => renderKiniPanel(S),
  collection: () => renderCollection(S),
  packs:      () => renderPackPanel(),
  talents:    () => renderTalentTree(S),
  daily:      () => renderDailyPanel(S),
};

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const id = tab.dataset.tab;

    // Activer onglet
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Afficher panel
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    const panel = document.getElementById(`tab-${id}`);
    if (panel) {
      panel.classList.remove('hidden');
      panel.classList.add('active');
    }
    document.querySelectorAll('.tab-panel').forEach(p => {
      if (p.id !== `tab-${id}`) p.classList.remove('active');
    });

    // Rendre le contenu
    if (TAB_RENDERERS[id]) TAB_RENDERERS[id]();
  });
});

// ─── BOUTON COMBAT ────────────────────────────────────────
const btnFight = document.getElementById('btn-fight');
if (btnFight) btnFight.addEventListener('click', startBattle);

// ─── BOUCLE IDLE ──────────────────────────────────────────
let _lastIdle = Date.now();

function idleLoop() {
  const now     = Date.now();
  const elapsed = (now - _lastIdle) / 1000;
  _lastIdle     = now;

  const rate = calcIdleRate(S.get('currentWorld') || 1, S.get('talentsUnlocked') || []);
  const gold = rate * elapsed;
  S.addGold(gold);
  S.updateMission('gold_earned', gold);

  // Mettre à jour HUD toutes les 1s
  renderHUD(S);

  // Sauvegarde auto toutes les 30s
  if (Math.floor(now / 1000) % 30 === 0) S.save();

  requestAnimationFrame(idleLoop);
}

// ─── COLLECTE OFFLINE ──────────────────────────────────────
function handleOffline() {
  const rate       = calcIdleRate(S.get('currentWorld') || 1, S.get('talentsUnlocked') || []);
  const offlineGold = S.calcOfflineGold(rate);
  if (offlineGold > 10) {
    S.addGold(offlineGold);
    S.set('lastSeen', Date.now());
    S.save();
  }
}

// ─── DÉMARRAGE ────────────────────────────────────────────
handleOffline();

// Init combat en premier
initArena(S);
initPackOpening(S);

// Rendu HUD initial
renderHUD(S);

// Lancer boucle idle
requestAnimationFrame(idleLoop);

// Visibilité : relancer idle au retour sur l'onglet
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    _lastIdle = Date.now();
    handleOffline();
  } else {
    S.save();
  }
});

console.log('[POG IDLE] ✅ Pogs Champions — Initialisé !');
console.log('[POG IDLE] Version 1.0.0 · Monde', S.get('currentWorld'), '· Or', S.get('gold'));