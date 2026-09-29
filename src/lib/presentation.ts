/**
 * Présentations « façon VideoPsalm » : ordre de culte / slides (cantiques,
 * versets bibliques, annonces, images) projetables en plein écran sur un
 * second écran. Tout est stocké en localStorage (fonctionne hors-ligne, PWA).
 */

export type SlideKind = 'cantique' | 'bible' | 'text' | 'image' | 'doc' | 'video' | 'audio' | 'blank';

export interface PresentSettings {
  /** Fond : dégradé, image ou couleur unie */
  bgType: 'gradient' | 'image' | 'solid';
  /** Valeur : dégradé CSS, URL d'image ou couleur hex */
  bgValue: string;
  textColor: string;
  textSize: 'sm' | 'md' | 'lg' | 'xl';
  alignment: 'left' | 'center' | 'right' | 'justify';
  /** Position du texte sur l'écran (façon VideoPsalm) */
  position:
    | 'top-left' | 'top' | 'top-right'
    | 'left' | 'center' | 'right'
    | 'bottom-left' | 'bottom' | 'bottom-right';
  showVerseNumbers: boolean;
  transition: 'fade' | 'none';
  /** Secondes avant avance automatique (0 = désactivé) */
  autoAdvance: number;
  /** Fond média : image ou vidéo derrière le contenu (façon VideoPsalm) */
  bgMedia?: string;
  bgMediaType?: 'none' | 'image' | 'video';
}

export interface PresentItem {
  id: string;
  kind: SlideKind;
  title: string;
  subtitle?: string;
  /** Cantique */
  cLang?: 'mg' | 'fr' | 'en';
  cNum?: number;
  stanzas?: string[];
  /** Bible */
  versionLabel?: string;
  refLabel?: string;
  verses?: { verse: number; text: string }[];
  /** Bible par verset : une page par verset (projeter le verset courant) */
  perVerse?: boolean;
  /** Surcharge de réglages propre à cet élément (personnalisation par slide) */
  settingsOverride?: Partial<PresentSettings>;
  /** Texte libre */
  textContent?: string;
  /** Image */
  imageUrl?: string;
  imageCaption?: string;
  /** Document PDF (bibliothèque) */
  docPath?: string;
  docUrl?: string;
  /** Nombre de pages du PDF : une page projetée par page du document. */
  docPages?: number;
  /** Vidéo (YouTube ou fichier mp4) */
  videoUrl?: string;
  /** Audio (stream ou fichier mp3) */
  audioUrl?: string;
}

export interface Presentation {
  id: string;
  name: string;
  items: PresentItem[];
  settings: PresentSettings;
  updatedAt: number;
}

export const DEFAULT_SETTINGS: PresentSettings = {
  bgType: 'gradient',
  bgValue: 'linear-gradient(135deg, #0b1020 0%, #1e1b4b 55%, #3b0764 100%)',
  textColor: '#ffffff',
  textSize: 'lg',
  alignment: 'center',
  position: 'center',
  showVerseNumbers: true,
  transition: 'fade',
  autoAdvance: 0,
  bgMedia: '',
  bgMediaType: 'none',
};

// --- Paramètres mémorisés par MODE (façon VideoPsalm) ----------------------
// Chaque type de présentation (agenda, bible, cantique) garde ses propres
// réglages (fond, position, taille…) stockés séparément.

export type PresMode = 'agenda' | 'bible' | 'cantique';
const KEY_MODE_SETTINGS = 'ah-pres-mode-settings';

export function loadModeSettings(): Record<PresMode, PresentSettings> {
  const base: Record<PresMode, PresentSettings> = {
    agenda: { ...DEFAULT_SETTINGS },
    bible: { ...DEFAULT_SETTINGS },
    cantique: { ...DEFAULT_SETTINGS },
  };
  const raw = safeGet(KEY_MODE_SETTINGS);
  if (!raw) return base;
  try {
    const d = JSON.parse(raw) as Partial<Record<PresMode, Partial<PresentSettings>>>;
    (Object.keys(base) as PresMode[]).forEach((k) => {
      if (d[k]) base[k] = { ...DEFAULT_SETTINGS, ...d[k] };
    });
  } catch {
    /* ignore */
  }
  return base;
}

export function saveModeSettings(m: Record<PresMode, PresentSettings>): void {
  safeSet(KEY_MODE_SETTINGS, JSON.stringify(m));
}

// --- Présentations « live » des modes Bible / Cantique ----------------------
// Projetées directement depuis le mode (une page = un verset / une strophe),
// stockées séparément de l'agenda pour ne pas le polluer.

const KEY_LIVE = 'ah-pres-live';

export function loadLivePres(): Record<PresMode, Presentation | null> {
  const base: Record<PresMode, Presentation | null> = { agenda: null, bible: null, cantique: null };
  const raw = safeGet(KEY_LIVE);
  if (!raw) return base;
  try {
    const d = JSON.parse(raw) as Partial<Record<PresMode, Presentation | null>>;
    (Object.keys(base) as PresMode[]).forEach((k) => {
      if (d[k]) base[k] = d[k]!;
    });
  } catch {
    /* ignore */
  }
  return base;
}

export function saveLivePres(mode: PresMode, pres: Presentation): void {
  const cur = loadLivePres();
  cur[mode] = pres;
  safeSet(KEY_LIVE, JSON.stringify(cur));
}

// --- Superpositions du projecteur (façon VideoPsalm) ------------------------
// Minuteur, message défilant (ticker) et format d'horloge : réglages globaux
// du projecteur, stockés séparément des présentations (partagés studio ⇄ projecteur).

export interface PresOverlays {
  clockFormat: 'hm' | 'hms' | 'hmd' | 'full';
  timerOn: boolean;
  timerSeconds: number;
  tickerOn: boolean;
  tickerText: string;
  tickerSpeed: number;
}

const KEY_OVERLAYS = 'ah-pres-overlays';

export const DEFAULT_OVERLAYS: PresOverlays = {
  clockFormat: 'hm',
  timerOn: false,
  timerSeconds: 300,
  tickerOn: false,
  tickerText: '',
  tickerSpeed: 60,
};

export function loadOverlays(): PresOverlays {
  const raw = safeGet(KEY_OVERLAYS);
  if (!raw) return { ...DEFAULT_OVERLAYS };
  try {
    return { ...DEFAULT_OVERLAYS, ...(JSON.parse(raw) as Partial<PresOverlays>) };
  } catch {
    return { ...DEFAULT_OVERLAYS };
  }
}

export function saveOverlays(o: PresOverlays): void {
  safeSet(KEY_OVERLAYS, JSON.stringify(o));
}

export const BG_PRESETS: { label: string; value: string }[] = [
  { label: 'Nuit', value: 'linear-gradient(135deg, #0b1020 0%, #1e1b4b 55%, #3b0764 100%)' },
  { label: 'Or', value: 'linear-gradient(135deg, #1c1917 0%, #78350f 55%, #b45309 100%)' },
  { label: 'Forêt', value: 'linear-gradient(135deg, #022c22 0%, #064e3b 55%, #065f46 100%)' },
  { label: 'Ciel', value: 'linear-gradient(135deg, #082f49 0%, #0c4a6e 55%, #0369a1 100%)' },
  { label: 'Bordeaux', value: 'linear-gradient(135deg, #2a0a0a 0%, #7f1d1d 55%, #991b1b 100%)' },
  { label: 'Ardoise', value: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)' },
];

// --- Stockage localStorage (sécurisé côté serveur) -------------------------

const KEY_LIST = 'ah-presentations';
const KEY_ACTIVE = 'ah-presentation-active'; // { presId, pageIndex }

function safeGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / indisponible */
  }
}

export function uid(): string {  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function loadPresentations(): Presentation[] {
  const raw = safeGet(KEY_LIST);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as Presentation[];
    return list.filter((p) => p && Array.isArray(p.items));
  } catch {
    return [];
  }
}

export function savePresentations(list: Presentation[]): void {
  safeSet(KEY_LIST, JSON.stringify(list));
}

export function loadActive(): { presId: string; pageIndex: number } | null {
  const raw = safeGet(KEY_ACTIVE);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveActive(state: { presId: string; pageIndex: number }): void {
  safeSet(KEY_ACTIVE, JSON.stringify(state));
}

/** Nombre de pages projetées pour un item (une page par strophe pour les cantiques, par verset si perVerse) */
export function itemPageCount(item: PresentItem): number {
  switch (item.kind) {
    case 'cantique':
      return Math.max(1, item.stanzas?.length ?? 1);
    case 'bible':
      return item.perVerse ? Math.max(1, item.verses?.length ?? 1) : 1;
    case 'doc':
      return Math.max(1, item.docPages ?? 1);
    default:
      return 1;
  }
}

/** Découpe des paroles en strophes (lignes vides) */
export function splitStanzas(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Nombre total de pages projetées d'une présentation (une page par strophe) */
export function totalPages(pres: Presentation): number {
  return pres.items.reduce((n, it) => n + itemPageCount(it), 0);
}

/** Élément + page interne correspondant à une page plate (index global) */
export function pageAt(
  pres: Presentation,
  flatIndex: number
): { item: PresentItem; page: number; itemIndex: number } | null {
  let acc = 0;
  for (let i = 0; i < pres.items.length; i++) {
    const item = pres.items[i];
    const pages = itemPageCount(item);
    if (flatIndex < acc + pages) {
      return { item, page: flatIndex - acc, itemIndex: i };
    }
    acc += pages;
  }
  return null;
}

/**
 * HTML du contenu d'une page projetée (titre + corps), partagé entre le
 * studio (aperçu) et le projecteur. Le fond/les couleurs sont appliqués
 * par le conteneur parent via style.
 */
export function pageHtml(
  item: PresentItem,
  page: number,
  settings: PresentSettings,
  stanzaLabel = 'strophe'
): string {
  // Note : les apostrophes sont échappées (URL dans url('…') et textes)
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  // Sécurité CSS/URL : les entités HTML (&#39;) sont décodées AVANT l'analyse
  // CSS, donc on percent-encode les caractères sensibles pour empêcher toute
  // sortie de chaîne (url('…') ou attribut src="…").
  const cssSafe = (u: string) =>
    u
      .replace(/'/g, '%27')
      .replace(/"/g, '%22')
      .replace(/\\/g, '%5C')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/;/g, '%3B');
  const textColor = settings.textColor || '#ffffff';
  // L'alignement du texte est indépendant de la position du bloc : on peut
  // vouloir un bloc calé à gauche dont le texte reste justifié.
  const align = (['left', 'center', 'right', 'justify'] as const).includes(settings.alignment as any)
    ? settings.alignment
    : 'center';

  // Position du bloc sur l'écran, sur une grille de neuf : les anciennes
  // valeurs ('left', 'top'…) restent comprises.
  const position = settings.position ?? 'center';
  const vertical = position.startsWith('top') ? 'flex-start' : position.startsWith('bottom') ? 'flex-end' : 'center';
  const horizontal = position.endsWith('left') ? 'flex-start' : position.endsWith('right') ? 'flex-end' : 'center';

  /**
   * Cadre plein écran qui place le bloc de contenu. `width` le limite pour
   * qu'un bloc calé à gauche laisse réellement le côté droit vide — sans
   * quoi il occupait toute la largeur et paraissait centré.
   */
  // Calé sur un côté, le bloc est volontairement plus étroit : sinon il
  // occupait quasiment toute la largeur et « à gauche » ne se distinguait pas
  // du centre. La moitié libre est justement ce qu'on cherche à dégager.
  const blockWidth = horizontal === 'center' ? '92%' : '55%';
  const posFrame = (inner: string, width = blockWidth) =>
    `<div style="display:flex;width:100%;height:100%;align-items:${vertical};justify-content:${horizontal}">` +
    `<div style="width:${width};max-width:${width};text-align:${align}">${inner}</div></div>`;

  const titleHtml = (extra?: string) => {
    const label = item.subtitle
      ? `<span style="display:block;font-size:.45em;opacity:.75;letter-spacing:.18em;text-transform:uppercase">${esc(item.subtitle)}</span>`
      : '';
    const suffix = extra ? `<span style="display:block;font-size:.4em;opacity:.6;margin-top:.4em">${extra}</span>` : '';
    return `<div style="text-align:center;margin-bottom:1.2em">${label}<div style="font-weight:800;font-size:.5em;opacity:.9;letter-spacing:.04em">${esc(item.title)}</div>${suffix}</div>`;
  };

  switch (item.kind) {
    case 'video': {
      // YouTube → iframe embed ; sinon lecteur vidéo natif
      const raw = item.videoUrl ?? '';
      const yt = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/i);
      const src = cssSafe(yt ? `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0` : raw);
      const caption = item.subtitle
        ? `<div style="position:absolute;bottom:4%;left:0;right:0;text-align:center;font-size:.55em;opacity:.85;color:${textColor}">${esc(item.subtitle)}</div>`
        : '';
      return yt
        ? `<div style="position:absolute;inset:0"><iframe src="${src}" style="width:100%;height:100%;border:0" title="${esc(item.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>${caption}`
        : `<div style="position:absolute;inset:0;background:#000"><video src="${src}" style="width:100%;height:100%;object-fit:contain" controls autoplay playsinline></video></div>${caption}`;
    }
    case 'audio': {
      const src = cssSafe(item.audioUrl ?? '');
      const cover = item.imageUrl
        ? `<div style="width:min(72%,560px);aspect-ratio:16/9;background:url('${cssSafe(item.imageUrl)}') center/cover no-repeat;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.45)"></div>`
        : '';
      return `${titleHtml()}<div style="display:flex;flex-direction:column;align-items:center;gap:1.4em;width:100%">${cover}<audio src="${src}" controls autoplay style="width:min(90%,680px)"></audio></div>`;
    }
    case 'doc': {
      // Les PDF de la bibliothèque sont servis en `application/octet-stream` :
      // un `<iframe>` déclenchait un téléchargement au lieu d'afficher la page.
      // On dépose un canevas que `hydratePdfSlides` peint avec pdf.js.
      const url = esc(item.docUrl ?? '');
      return `<canvas data-pdf-url="${url}" data-pdf-page="${page + 1}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff"></canvas>`;
    }
    case 'cantique': {
      // Même parti pris que pour les versets : la strophe occupe l'écran, le
      // reste s'efface. Le titre et le recueil passent en bas, le numéro de
      // strophe en haut à droite. Auparavant le bloc de titre poussait les
      // paroles vers le bas et leur prenait la place.
      const stanza = item.stanzas?.[page] ?? item.stanzas?.[0] ?? '';
      const numLabel = item.cNum ? esc(`${stanzaLabel} ${page + 1}`) : '';
      const caption = [item.title, item.subtitle].filter(Boolean).map((x) => esc(x!)).join(' · ');
      const stanzaBody = `<pre style="margin:0;white-space:pre-wrap;font-family:inherit;font-size:1.05em;line-height:1.55;text-align:inherit">${esc(stanza)}</pre>`;
      return `<div style="position:relative;width:100%;height:100%;color:${textColor}">
        ${numLabel ? `<div style="position:absolute;top:0;right:0;font-size:.4em;font-weight:700;letter-spacing:.1em;opacity:.72">${numLabel}</div>` : ''}
        <div style="position:absolute;inset:1.6em .4em">${posFrame(stanzaBody)}</div>
        ${caption ? `<div style="position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:.3em;letter-spacing:.2em;text-transform:uppercase;opacity:.45">${caption}</div>` : ''}
      </div>`;
    }
    case 'bible': {
      // Mode par verset : n'affiche que le verset courant (une page = un verset)
      const all = item.verses ?? [];
      const verses = item.perVerse && all.length ? (all[page] ? [all[page]] : all) : all;
      // Numéro en exposant dans le fil du texte : la colonne de numéros
      // décalait le verset et mangeait la largeur utile.
      const versesHtml = verses.map(
        (v) =>
          `<span style="display:inline">${
            settings.showVerseNumbers
              ? `<sup style="font-size:.45em;font-weight:700;opacity:.5;margin-right:.15em">${v.verse}</sup>`
              : ''
          }${esc(v.text)} </span>`
      );
      // Mise en page façon logiciel de projection : la référence en haut à
      // droite, discrète ; le texte occupe le centre, c'est lui qu'on lit ;
      // la version en bas au centre, plus effacée encore. Le titre n'est plus
      // répété au-dessus du texte, il prenait la place du verset.
      const reference = esc(item.refLabel || item.title || '');
      const source = esc(item.versionLabel || '');
      const verseBody = `<div style="font-size:1.05em;line-height:1.5">${versesHtml.join('')}</div>`;
      return `<div style="position:relative;width:100%;height:100%;color:${textColor}">
        ${reference ? `<div style="position:absolute;top:0;right:0;font-size:.4em;font-weight:700;letter-spacing:.1em;opacity:.72">${reference}</div>` : ''}
        <div style="position:absolute;inset:1.6em .4em">${posFrame(verseBody)}</div>
        ${source ? `<div style="position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:.3em;letter-spacing:.2em;text-transform:uppercase;opacity:.45">${source}</div>` : ''}
      </div>`;
    }
    case 'text': {
      const body = (item.textContent ?? '')
        .split(/\n+/)
        .filter(Boolean)
        .map((l) => esc(l))
        .join('<br/>');
      return posFrame(`${titleHtml()}<div style="max-width:92%;margin:0 auto;white-space:pre-wrap;font-size:1em;line-height:1.6;text-align:inherit;color:${textColor}">${body}</div>`);
    }
    case 'image': {
      return `<div style="position:absolute;inset:0;background:url('${cssSafe(item.imageUrl ?? '')}') center/cover no-repeat"></div>${
        item.imageCaption
          ? `<div style="position:absolute;bottom:5%;left:0;right:0;text-align:center;font-size:.55em;opacity:.85;color:${textColor}">${esc(item.imageCaption)}</div>`
          : ''
      }`;
    }
    default:
      return ''; // blank
  }
}

/**
 * Échappe une URL destinée à `url('…')`. Les guillemets, parenthèses et
 * antislashs suffisent à sortir de la chaîne ; le point-virgule, lui, doit
 * être conservé, sans quoi les URL `data:image/jpeg;base64,…` sont corrompues.
 * À l'intérieur d'une chaîne CSS quotée, un `;` ne termine pas la déclaration.
 */
export function cssUrlSafe(u: string): string {
  return u
    .replace(/\\/g, '%5C')
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

/**
 * Valeur de la propriété `background`, à affecter via `style.background`.
 * Un fond image est une URL, pas une valeur CSS : sans `url(…)` la
 * déclaration est invalide et l'écran reste noir.
 */
export function backgroundValue(settings: PresentSettings): string {
  const value = (settings.bgValue ?? '').trim();
  if (settings.bgType === 'image' && value) {
    return `#000 url('${cssUrlSafe(value)}') center/cover no-repeat`;
  }
  return value;
}

export function pageBackground(settings: PresentSettings): string {
  return `background:${backgroundValue(settings)}`;
}

/**
 * Couche de fond média (image ou vidéo) affichée derrière le contenu, façon
 * VideoPsalm. Retourne '' si aucun média n'est configuré. Le contenu est
 * placé dans un wrapper avec position:relative;z-index:1 par-dessus.
 */
export function bgMediaHtml(settings: PresentSettings): string {
  const url = settings.bgMedia?.trim();
  const type = settings.bgMediaType ?? 'none';
  if (!url || type === 'none') return '';
  const cssUrl = cssUrlSafe(url);
  if (type === 'video') {
    // YouTube → embed silencieux en boucle ; sinon fichier vidéo natif
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/i);
    const media = yt
      ? `<iframe src="https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&rel=0&controls=0" style="position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none" allow="autoplay" title="fond"></iframe>`
      : `<video src="${cssUrl}" autoplay muted loop playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>`;
    return `<div style="position:absolute;inset:0;z-index:0;overflow:hidden;background:#000">${media}<div style="position:absolute;inset:0;background:rgba(2,6,23,.45)"></div></div>`;
  }
  return `<div style="position:absolute;inset:0;z-index:0;background:url('${cssUrl}') center/cover no-repeat"><div style="position:absolute;inset:0;background:rgba(2,6,23,.45)"></div></div>`;
}

/**
 * Présentation de démonstration : montre tous les types de slides possibles
 * (texte, cantique, Bible, annonce, image, document, vidéo, audio). Utilisée
 * au premier lancement et via le bouton « Charger la démo ».
 */
const DATA_RAW = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data';

export function demoPresentation(): Presentation {
  return {
    id: uid(),
    name: 'Démo — Découverte du studio',
    settings: { ...DEFAULT_SETTINGS },
    updatedAt: Date.now(),
    items: [
      {
        id: uid(),
        kind: 'text',
        title: 'Andeha Hizaha',
        subtitle: 'Bienvenue',
        textContent: 'Venez et voyez.\nDécouvrez tout ce que le studio de présentation sait faire.\nUtilisez les flèches ← → pour naviguer.',
      },
      {
        id: uid(),
        kind: 'cantique',
        title: '1. RY MPONINA AN-TANY O',
        subtitle: 'Fihirana',
        cLang: 'mg',
        cNum: 1,
        stanzas: [
          '1.\nRy mponina an-tany ô\nAvia manandrata feo\nKa mba derao ny Tomponao;\nHirao ny voninahiny.',
          '2.\nAndriana ambony hasina,\nIzy nanao antsika izao.\nIsika no malalany,\nFa ondry izay fiandriny.',
        ],
      },
      {
        id: uid(),
        kind: 'bible',
        title: 'Jaona 3:16',
        subtitle: 'Malgache (MG65)',
        versionLabel: 'MG65.SQLite3',
        refLabel: 'Jaona 3:16',
        verses: [
          {
            verse: 16,
            text: "Fa toy izao no nitiavan' Andriamanitra izao tontolo izao: nomeny ny Zanani-lahy Tokana, mba tsy ho very izay rehetra mino Azy, fa hanana fiainana mandrakizay.",
          },
        ],
      },
      {
        id: uid(),
        kind: 'text',
        title: 'Annonce',
        subtitle: 'À la semaine prochaine',
        textContent: 'Samedi prochain — 10h00\nÉtude biblique : « La foi qui sauve »\nBienvenue à tous !',
      },
      {
        id: uid(),
        kind: 'image',
        title: 'Image de fond',
        subtitle: 'Illustration',
        imageUrl:
          'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1920&q=80',
        imageCaption: '« Venez et voyez » — Jean 1:46',
      },
      {
        id: uid(),
        kind: 'doc',
        title: 'Education',
        subtitle: 'Esprit de Prophétie (FR)',
        // URL de la branche `data` : le dossier public/docs n'est pas déployé.
        docPath: 'esprit_prophetie_fr/Education.PDF',
        docUrl: `${DATA_RAW}/docs/esprit_prophetie_fr/Education.PDF`,
      },
      {
        id: uid(),
        kind: 'video',
        title: 'Vidéo de démonstration',
        subtitle: 'Exemple de slide vidéo (plein écran)',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      },
      {
        id: uid(),
        kind: 'audio',
        title: 'Cantique audio',
        subtitle: 'Exemple de slide audio',
        imageUrl:
          'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80',
        // Lecture directe : /api/stream n'existe pas sur un site statique.
        audioUrl: 'https://drive.usercontent.google.com/download?id=1DP_ogB5zF19g8o_4uxQ_W4X65zZKKYcG&export=download',
      },
      {
        id: uid(),
        kind: 'blank',
        title: 'Écran noir',
        subtitle: 'Transition / recueillement',
      },
    ],
  };
}
