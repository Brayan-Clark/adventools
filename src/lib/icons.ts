/**
 * Jeu d'icônes du site — une seule source de vérité.
 *
 * Toutes ces formes sont pleines (`fill="currentColor"`), fermées et dessinées
 * sur une grille 24×24. C'est important : les tracés copiés de bibliothèques
 * en mode contour (`stroke`) — la note de musique, le groupe de personnes —
 * étaient rendus avec `fill`, ce qui refermait leurs courbes ouvertes et les
 * transformait en pâtés illisibles. La caméra des sermons, elle, n'avait que
 * son ergot : le corps du boîtier manquait.
 */

export const ICONS = {
  /** Caméra vidéo — sermons, groupe « Vidéos » */
  video:
    'M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z',
  /** Lecture */
  play: 'M8 5v14l11-7L8 5z',
  /** Note de musique — audio, cantiques, groupe « Écoute » */
  music: 'M12 3v10.55A4 4 0 1014 17V7h4V3h-6z',
  /** Microphone — conférences */
  mic: 'M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-4 4.9V19h3v2H8v-2h3v-3.1A5 5 0 017 11h2a3 3 0 006 0h2z',
  /** Groupe de personnes — séminaires */
  users:
    'M16 11a3 3 0 100-6 3 3 0 000 6zm-8 0a3 3 0 100-6 3 3 0 000 6zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  /** Chapeau de diplômé — cours */
  cap: 'M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z',
  /** Livre ouvert — Bible */
  book: 'M12 6.5C10.5 5.2 8.4 4.5 6 4.5c-1 0-2 .1-3 .4v13.6c1-.3 2-.4 3-.4 2.4 0 4.5.7 6 2 1.5-1.3 3.6-2 6-2 1 0 2 .1 3 .4V4.9c-1-.3-2-.4-3-.4-2.4 0-4.5.7-6 2z',
  /** Lignes de texte — articles */
  article: 'M4 5h16v2H4V5zm0 4h16v2H4V9zm0 4h10v2H4v-2zm0 4h16v2H4v-2z',
  /** Étoile scintillante — mofonaina, mise en avant */
  sparkles:
    'M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2zm7 11l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4zM5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8L5 15z',
  /** Document — bibliothèque */
  document:
    'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 13h8v1.5H8V13zm0 4h8v1.5H8V17z',
  /** Écran de projection — présentation */
  screen:
    'M2 5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-7l2.5 3.5-1.6 1.2L12 18.4l-3.9 3.3-1.6-1.2L9 17H4a2 2 0 01-2-2V5zm2 0v10h16V5H4z',
  /** Cœur — famille */
  heart:
    'M12 21s-7.5-4.9-9.5-9C1 8.5 3 5 6.5 5c2 0 3.5 1 4.5 2.5C12 6 13.5 5 15.5 5 19 5 21 8.5 19.5 12c-2 4.1-7.5 9-7.5 9z',
  /** Flamme — prière, réveil */
  flame:
    'M12 2s5 4.5 5 10a5 5 0 01-10 0c0-1.5.5-2.8 1.2-4C9.5 9.5 10 11 12 11s2.5-1.5 2.5-3.5C14.5 5 12 2 12 2z',
  /** Rouleau — prophétie */
  scroll:
    'M8 3h9a2 2 0 012 2v2h-2V5H8V3zm-1 0a1 1 0 100 2v14a2 2 0 01-2 2 1 1 0 01-1-1V4a1 1 0 011-1h2zm4 7h7v2h-7v-2zm0 4h7v2h-7v-2z',
  /** Personne — prédicateur */
  person: 'M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-3.31 0-8 1.67-8 5v1h16v-1c0-3.33-4.69-5-8-5z',
  /** Œil — nombre de vues */
  eye: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12a4.5 4.5 0 110-9 4.5 4.5 0 010 9zm0-7a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
  /** Liste — nombre de leçons */
  list: 'M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2zm1 2v10h12V7H6zm2 2h8v2H8V9zm0 4h5v2H8v-2z',
  /** Cercle d'information — à propos */
  info: 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
} as const;

export type IconName = keyof typeof ICONS;

/** Icône associée à un type de média. */
export const MEDIA_ICONS: Record<string, string> = {
  sermon: ICONS.video,
  course: ICONS.cap,
  audio: ICONS.music,
  seminar: ICONS.users,
  conference: ICONS.mic,
  article: ICONS.article,
};

/** Icône associée à un slug d'icône de catégorie (colonne `categories.icon`). */
export const CATEGORY_ICONS: Record<string, string> = {
  book: ICONS.book,
  music: ICONS.music,
  heart: ICONS.heart,
  flame: ICONS.flame,
  scroll: ICONS.scroll,
  sparkles: ICONS.sparkles,
};
