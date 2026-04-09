// ── SHELTER 7 — Narration contextuelle ──
// Déclencheurs : zone_start, boss_wave, wave_X, victory, defeat, recruit_L

export const NARRATION = {
  // ── Début de zone ──
  zone_1_start: {
    speaker: 'Marcus',
    role: 'Bouclier',
    lines: [
      'Shelter opérationnel. On sort en éclaireurs.',
      'Restez groupés. On revient vivants.',
    ],
  },
  zone_2_start: {
    speaker: 'Dusty',
    role: 'Tireur',
    lines: [
      'Ces faubourgs grouillent d\'infectés...',
      'J\'en vois des dizaines depuis ici. Soyez prêts.',
    ],
  },
  zone_3_start: {
    speaker: 'Doc',
    role: 'Médic',
    lines: [
      'Radiations élevées dans ce secteur. Limitez l\'exposition.',
      'Si quelqu\'un tombe, criez. Je ferai de mon mieux.',
    ],
  },
  zone_4_start: {
    speaker: 'Atlas',
    role: 'Tacticien',
    lines: [
      'Une base militaire abandonnée. Ça peut être utile... ou dangereux.',
      'On avance en formation. On ne laisse personne derrière.',
    ],
  },
  zone_5_start: {
    speaker: 'Rage',
    role: 'Berserk',
    lines: [
      'Des marécages. J\'aime pas les marécages.',
      'On fonce. On tue. On rentre. Simple.',
    ],
  },
  zone_6_start: {
    speaker: 'Genome',
    role: 'Biologiste',
    lines: [
      'Un laboratoire... Qui sait ce qu\'ils ont créé ici.',
      'Restez loin des cuves. Ne touchez à rien sans ma confirmation.',
    ],
  },
  zone_7_start: {
    speaker: 'Lazarus',
    role: 'Médic',
    lines: [
      'C\'est là que tout a commencé. Patient Zéro.',
      'Si on l\'élimine... ça peut tout changer. Allons-y.',
    ],
  },

  // ── Vague boss ──
  boss_wave: {
    speaker: null, // speaker dynamique selon la zone
    lines: [
      'Il est énorme. Restez concentrés.',
      'On tient ensemble ou on tombe ensemble.',
    ],
  },

  // ── Moments spéciaux ──
  wave_5: {
    speaker: 'Marcus',
    role: 'Bouclier',
    lines: [
      'Mi-chemin. Tenez bon.',
      'On a vu pire. Continuez.',
    ],
  },

  first_victory: {
    speaker: 'Dusty',
    role: 'Tireur',
    lines: [
      'Première mission réussie !',
      'Pas mal pour des survivants. Pas mal du tout.',
    ],
  },

  first_defeat: {
    speaker: 'Doc',
    role: 'Médic',
    lines: [
      'On s\'est fait écraser.',
      'Soignez vos blessures. On repart dès qu\'on est prêts.',
    ],
  },

  recruit_legend: {
    speaker: null, // speaker = le survivant recruté
    lines: [
      'Je suis là maintenant. Vous pouvez compter sur moi.',
      'On va faire de grandes choses ensemble.',
    ],
  },

  // ── Recrutement premier Expert ──
  first_expert: {
    speaker: 'Atlas',
    role: 'Tacticien',
    lines: [
      'Un Expert dans nos rangs. La donne change.',
      'Avec des gens comme ça, on tient la distance.',
    ],
  },

  // ── Recrutement premier Légendaire ──
  first_legendary: {
    speaker: null,
    lines: [
      'Je suis là maintenant. Vous pouvez compter sur moi.',
      'Ce que j\'ai vécu... ça m\'a rendu plus fort. Je vous protègerai.',
    ],
  },

  // ── Premier recyclage ──
  first_recycle: {
    speaker: 'Genome',
    role: 'Biologiste',
    lines: [
      'ADN récupéré. Chaque ressource compte dans ce monde.',
      'On optimise. On survit. C\'est ça, l\'adaptation.',
    ],
  },

  // ── Premier boss battu ──
  first_boss: {
    speaker: 'Marcus',
    role: 'Bouclier',
    lines: [
      'Boss éliminé. On a prouvé qu\'on peut gagner.',
      'Ils sont forts. Mais on est plus malins. Avancez.',
    ],
  },

  // ── Premier prestige ──
  first_prestige: {
    speaker: 'Lazarus',
    role: 'Médic',
    lines: [
      'Recommencer... mais plus forts. C\'est ça, la survie.',
      'Les cycles se répètent. Nous, on s\'améliore à chaque fois.',
    ],
  },

  // ── Upgrade ADN premier niveau ──
  first_upgrade: {
    speaker: 'Doc',
    role: 'Médic',
    lines: [
      'Modification génétique réussie. Impressionnant.',
      'L\'ADN ne ment pas. Cette personne est plus dangereuse qu\'avant.',
    ],
  },

  // ── Premier niveau de compte ──
  first_levelup: {
    speaker: 'Atlas',
    role: 'Tacticien',
    lines: [
      'L\'équipe gagne en expérience. Les talents se révèlent.',
      'Chaque combat nous forge. Débloquez vos talents.',
    ],
  },

  // ── Boss : lignes spécifiques ──
  boss_z1: {
    speaker: 'Le Berger',
    lines: ['Mes enfants... tuez-les.'],
  },
  boss_z2: {
    speaker: 'Docteur Zéro',
    lines: ['Votre système immunitaire est une insulte à la science.'],
  },
  boss_z3: {
    speaker: 'Le Réacteur',
    lines: ['Je suis la chaleur. Je suis la fin.'],
  },
  boss_z4: {
    speaker: 'Le Général X',
    lines: ['Ordre d\'engagement : élimination totale.'],
  },
  boss_z5: {
    speaker: 'La Nuée',
    lines: ['...'],
  },
  boss_z6: {
    speaker: 'Chimère-09',
    lines: ['Spécimen non reconnu. Protocole d\'élimination enclenché.'],
  },
  boss_z7: {
    speaker: 'Patient Zéro',
    lines: ['Je suis le commencement. Et la fin.'],
  },
}

// ── Récupère le bon dialogue selon le contexte ──
export function getNarration(trigger, state) {
  const n = NARRATION[trigger]
  if (!n) return null

  // Filtre : n'affiche certains dialogues qu'une seule fois
  const shown = state.shownNarrations || []
  const oneShot = [
    'first_victory', 'first_defeat', 'recruit_legend',
    'first_expert', 'first_legendary', 'first_recycle',
    'first_boss', 'first_prestige', 'first_upgrade', 'first_levelup',
  ]
  if (oneShot.includes(trigger) && shown.includes(trigger)) return null

  return n
}

// ── Marque un dialogue comme vu ──
export function markNarrationShown(trigger, state) {
  if (!state.shownNarrations) state.shownNarrations = []
  if (!state.shownNarrations.includes(trigger)) {
    state.shownNarrations.push(trigger)
  }
}
