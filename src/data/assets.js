// Ce fichier centralise tous les chemins vers les assets graphiques.
// Quand tes illustrations arrivent, remplace les valeurs par les chemins
// vers tes fichiers. Tant qu'un fichier n'existe pas, le jeu affiche
// l'emoji ou la couleur CSS de fallback — rien ne casse.

export const ASSETS = {

  // ── POGS ──
  // Remplace null par ex: 'assets/pogs/p01-disc-pierre.png'
  pogs: {
    p01: null, p02: null, p03: null, p04: null, p05: null,
    p06: null, p07: null, p08: null, p09: null, p10: null,
    p11: null, p12: null, p13: null, p14: null, p15: null,
    p16: null, p17: null, p18: null, p19: null, p20: null,
    p21: null, p22: null, p23: null, p24: null, p25: null,
    p26: null, p27: null, p28: null, p29: null, p30: null,
    // Boss
    b01: null, b02: null, b03: null, b04: null,
    b05: null, b06: null, b07: null,
  },

  // ── KINIS ──
  kinis: {
    k1: null, k2: null, k3: null, k4: null, k5: null,
    // Exclusifs
    ke1: null, ke2: null, ke3: null, ke4: null,
    ke5: null, ke6: null, ke7: null,
  },

  // ── MONDES ──
  // bg       : image de fond de l'arène pendant ce monde
  // icon     : icône du monde sur la tour
  // bossImg  : illustration du boss
  worlds: {
    w1: { bg: null, icon: null, bossImg: null },
    w2: { bg: null, icon: null, bossImg: null },
    w3: { bg: null, icon: null, bossImg: null },
    w4: { bg: null, icon: null, bossImg: null },
    w5: { bg: null, icon: null, bossImg: null },
    w6: { bg: null, icon: null, bossImg: null },
    w7: { bg: null, icon: null, bossImg: null },
  },

  // ── UI GÉNÉRALE ──
  ui: {
    logo:         null,   // 'assets/ui/logo.png'
    towerBg:      null,   // 'assets/ui/tower-background.jpg'
    packBasic:    null,   // 'assets/ui/pack-basic.png'
    packRare:     null,   // 'assets/ui/pack-rare.png'
    packPremium:  null,   // 'assets/ui/pack-premium.png'
    packWorld:    null,   // 'assets/ui/pack-world.png'
  },

  // ── SONS ──
  // Tous les fichiers audio vont dans assets/sounds/
  sounds: {
    flip:       null,   // 'assets/sounds/flip.mp3'
    crit:       null,   // 'assets/sounds/crit.mp3'
    packOpen:   null,   // 'assets/sounds/pack-open.mp3'
    bossMusic:  null,   // 'assets/sounds/boss-music.mp3'
    waveWin:    null,   // 'assets/sounds/wave-win.mp3'
    levelUp:    null,   // 'assets/sounds/level-up.mp3'
  },
}

// Utilitaire : retourne l'image d'un pog ou son emoji de fallback
export function pogAsset(pogId, fallbackIcon) {
  const path = ASSETS.pogs[pogId]
  if (!path) return { type: 'emoji', value: fallbackIcon }
  return { type: 'image', value: path }
}

// Utilitaire : retourne l'image d'un kini ou son emoji de fallback
export function kiniAsset(kiniId, fallbackIcon) {
  const path = ASSETS.kinis[kiniId]
  if (!path) return { type: 'emoji', value: fallbackIcon }
  return { type: 'image', value: path }
}

// Utilitaire : joue un son si le fichier existe
export function playSound(soundKey) {
  const path = ASSETS.sounds[soundKey]
  if (!path) return
  const audio = new Audio(path)
  audio.volume = 0.5
  audio.play().catch(() => {})
}