const ACCOUNT_LEVELS = ['Novice', 'Apprenti', 'Flipper', 'Expert', 'Maître', 'Légende']

export function renderHUD(state) {
  // Niveau de compte
  const lvl = state.accountLevel
  const xpMax = (lvl + 1) * 100

  const badge = document.getElementById('acc-lvl-badge')
  const fill  = document.getElementById('acc-xp-fill')
  const idle  = document.getElementById('idle-display')

  if (badge) badge.textContent = lvl + 1
  if (fill)  fill.style.width  = Math.round(state.accountXP / xpMax * 100) + '%'
  if (idle)  idle.textContent  = 'Idle: +' + calcIdleDisplay(state) + ' or/s'

  // Titre du niveau affiché au survol (tooltip natif)
  if (badge) badge.title = ACCOUNT_LEVELS[Math.min(lvl, ACCOUNT_LEVELS.length - 1)]
}

function calcIdleDisplay(state) {
  let rate = 0
  state.equippedPogs.forEach(p => {
    if (!p?.effect) return
    if (p.effect.startsWith('idle+')) rate += parseFloat(p.effect.split('+')[1])
    if (p.effect === 'master') rate *= 2
    if (p.effect === 'speed+0.4') rate *= 2
  })
  return Math.round(rate * 10) / 10
}

// Enregistre le renderer sur window pour que main.js puisse l'appeler
window.renderHUD = renderHUD