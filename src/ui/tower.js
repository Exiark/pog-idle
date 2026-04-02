import { WORLDS } from '../data/worlds.js'

export function renderTower(state) {
  const container = document.getElementById('tower-container')
  if (!container) return

  container.innerHTML = `
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:16px;font-weight:500">Tour de Babel</div>
      <div style="font-size:12px;color:var(--text-muted)">
        Monde ${state.currentWorld} — Vague ${state.currentFloor}/11
      </div>
    </div>

    <div style="
      display:flex;flex-direction:column;gap:8px;
      max-width:340px;margin:0 auto
    ">
      ${[...WORLDS].reverse().map(world => worldNode(world, state)).join('')}
    </div>

    <div style="
      text-align:center;margin-top:12px;
      font-size:11px;color:var(--text-muted)
    ">
      Cliquez sur un monde déverrouillé pour y jouer
    </div>`
}

function worldNode(world, state) {
  const isUnlocked  = state.unlockedWorlds.includes(world.id)
  const isActive    = state.activeWorld === world.id
  const isCurrent   = state.currentWorld === world.id
  const bossBeaten  = state.bossesDefeated.includes(`w${world.id}`)
  const isFarming   = isActive && world.id < state.currentWorld

  const colors = world.colors

  return `
    <div
      onclick="${isUnlocked ? `selectWorldUI(${world.id})` : ''}"
      style="
        display:flex;align-items:center;gap:12px;
        padding:12px 14px;
        border-radius:12px;
        border:${isActive ? `2px solid ${colors.primary}` : '0.5px solid var(--gray-border)'};
        background:${isActive ? colors.primary + '18' : 'white'};
        cursor:${isUnlocked ? 'pointer' : 'default'};
        opacity:${isUnlocked ? '1' : '0.4'};
        transition:border-color 0.2s,background 0.2s;
        position:relative;
      ">

      <!-- Numéro d'étage -->
      <div style="
        width:36px;height:36px;border-radius:50%;flex-shrink:0;
        background:${isUnlocked ? colors.primary : 'var(--gray-border)'};
        color:white;font-size:14px;font-weight:500;
        display:flex;align-items:center;justify-content:center;
      ">${world.id}</div>

      <!-- Infos monde -->
      <div style="flex:1;min-width:0">
        <div style="
          font-size:13px;font-weight:500;
          color:${isUnlocked ? 'var(--text)' : 'var(--text-muted)'}
        ">
          ${world.name}
          ${bossBeaten ? '<span style="color:#3B6D11;font-size:11px;margin-left:4px">✓</span>' : ''}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
          ${isUnlocked ? world.desc : 'Verrouilllé — battez le boss du monde précédent'}
        </div>

        ${isCurrent && !bossBeaten ? `
          <div style="margin-top:5px">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:2px">
              <span>Progression</span>
              <span>Vague ${state.currentFloor}/11</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="
                width:${Math.round(state.currentFloor / 11 * 100)}%;
                background:${colors.primary}
              "></div>
            </div>
          </div>` : ''
        }

        ${bossBeaten ? `
          <div style="font-size:11px;color:#3B6D11;margin-top:3px">
            Boss vaincu · Récompenses obtenues
          </div>` : ''
        }

        ${isFarming ? `
          <div style="font-size:11px;color:#BA7517;margin-top:3px">
            Mode farming — récompenses ×0.4
          </div>` : ''
        }
      </div>

      <!-- Badge actif -->
      ${isActive ? `
        <span class="badge" style="
          background:${colors.primary};color:white;
          font-size:10px;flex-shrink:0
        ">En jeu</span>` : ''
      }

      <!-- Cadenas -->
      ${!isUnlocked ? `
        <div style="font-size:18px;opacity:0.4">🔒</div>` : ''
      }

      <!-- Boss info -->
      ${isUnlocked && !bossBeaten ? `
        <div style="
          position:absolute;top:8px;right:10px;
          font-size:10px;color:var(--text-muted)
        ">
          Boss: ${world.boss.name}
        </div>` : ''
      }
    </div>`
}

window.renderTower = renderTower

window.selectWorldUI = function(worldId) {
  const S = window._state
  if (!S) return
  if (!S.unlockedWorlds.includes(worldId)) return
  S.activeWorld = worldId

  if (window.saveState) window.saveState(S)
  if (window.renderTower) window.renderTower(S)

  // Retourne sur l'onglet combat
  if (window.setTab) window.setTab('combat')

  // Relance le combat dans le nouveau monde
  document.dispatchEvent(new CustomEvent('worldChanged'))
}