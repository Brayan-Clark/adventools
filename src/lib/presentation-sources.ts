/**
 * Sources de contenu du studio de présentation : cantiques, Bible et
 * documents. Le studio ne fait qu'afficher et ordonner — toute la logique de
 * recherche et de conversion en éléments projetables vit ici.
 *
 * Chaque source expose la même forme de résultat (`SourceHit`), ce qui permet
 * à la bibliothèque du studio d'utiliser un seul composant de liste.
 */

import {
  COLLECTIONS,
  loadCollection,
  searchSongs,
  splitStanzas,
  type Song,
} from './hymnals';
import {
  setBase as setBibleBase,
  loadVersions,
  loadDb,
  readBooks,
  readChapter,
  resolveBookNumber,
  type BibleBook,
  type BibleVersion,
} from './client-bible';
import { loadDocsManifest, docsCatById, docsCatIcon, type DocCat, type DocItem } from './docs-manifest';
import { uid, type PresentItem } from './presentation';

export interface SourceHit {
  /** Clé stable pour le rendu de liste */
  key: string;
  title: string;
  subtitle?: string;
  /** Badge court affiché à droite (nombre de strophes, taille du PDF…) */
  badge?: string;
  /** Construit l'élément à insérer dans le déroulé */
  toItem: () => PresentItem;
}

// ── Cantiques ──────────────────────────────────────────────────────────────

export { COLLECTIONS as HYMNAL_COLLECTIONS };

function songSubtitle(song: Song): string {
  return COLLECTIONS.find((c) => c.id === song.collection)?.name ?? song.collection;
}

export function songToItem(song: Song): PresentItem {
  const stanzas = splitStanzas(song.content);
  return {
    id: uid(),
    kind: 'cantique',
    title: `${song.num}. ${song.title}`,
    subtitle: songSubtitle(song),
    cLang: song.lang,
    cNum: song.num,
    // Un cantique sans paroles (recueil audio) garde au moins une page, sinon
    // il occuperait zéro page et deviendrait impossible à sélectionner.
    stanzas: stanzas.length ? stanzas : [song.title],
  };
}

/**
 * Cherche dans un recueil. Renvoie une liste vide si le recueil distant n'a
 * pas pu être téléchargé — l'appelant affiche alors l'état d'erreur.
 */
export async function searchHymns(collectionId: string, query: string, limit = 40): Promise<SourceHit[]> {
  const songs = await loadCollection(collectionId);
  return searchSongs(songs, query, limit).map((song) => ({
    key: song.id,
    title: `${song.num}. ${song.title}`,
    subtitle: songSubtitle(song),
    badge: `${splitStanzas(song.content).length || 1}`,
    toItem: () => songToItem(song),
  }));
}

export async function findSong(id: string): Promise<Song | null> {
  const colId = id.slice(0, id.lastIndexOf('-'));
  if (!COLLECTIONS.some((c) => c.id === colId)) return null;
  const songs = await loadCollection(colId);
  return songs.find((s) => s.id === id) ?? null;
}

// ── Bible ──────────────────────────────────────────────────────────────────

let versions: BibleVersion[] = [];
let books: BibleBook[] = [];
let booksForFile = '';

export async function bibleVersions(base: string): Promise<BibleVersion[]> {
  setBibleBase(base);
  if (!versions.length) versions = await loadVersions();
  return versions;
}

/**
 * Ouvre une version et met en cache sa table des livres.
 * Les livres sont réindexés à chaque changement de version : les garder d'une
 * version à l'autre faisait résoudre les références sur les mauvais noms.
 */
async function openVersion(base: string, file: string) {
  const list = await bibleVersions(base);
  const target = file || list.find((v) => v.isDefault)?.file || list[0]?.file;
  const db = await loadDb(list, target);
  if (booksForFile !== target) {
    books = readBooks(db);
    booksForFile = target;
  }
  return { db, file: target };
}

export interface BibleRef {
  reference: string;
  bookNumber: number;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  verses: { verse: number; text: string }[];
  versionFile: string;
}

/** `Jean 3:16`, `Jean 3:16-18`, `Jaona 3` → chapitre + plage de versets. */
export async function resolveReference(base: string, file: string, query: string): Promise<BibleRef | null> {
  const q = query.trim();
  if (!q) return null;
  const m = q.match(/^(.+?)\s*(\d+)(?:\s*[:.]\s*(\d+)(?:\s*-\s*(\d+))?)?$/);
  if (!m) return null;

  const { db, file: versionFile } = await openVersion(base, file);
  const bookNumber = resolveBookNumber(books, m[1].trim());
  if (bookNumber === null) return null;

  const chapter = parseInt(m[2], 10);
  const all = readChapter(db, bookNumber, chapter);
  if (!all.length) return null;

  const verseStart = m[3] ? parseInt(m[3], 10) : 1;
  const verseEnd = m[4] ? parseInt(m[4], 10) : m[3] ? verseStart : all[all.length - 1].verse;
  const verses = all.filter((v) => v.verse >= verseStart && v.verse <= verseEnd);
  const book = books.find((b) => b.number === bookNumber);

  return {
    reference: `${book?.longName ?? ''} ${chapter}`.trim(),
    bookNumber,
    chapter,
    verseStart,
    verseEnd,
    verses: verses.length ? verses : all,
    versionFile,
  };
}

/** Libellé d'une référence : `Jean 3`, `Jean 3:16`, `Jean 3:16-18`. */
export function refLabel(ref: BibleRef): string {
  if (ref.verseStart <= 1 && ref.verseEnd >= (ref.verses[ref.verses.length - 1]?.verse ?? 1)) {
    return ref.reference;
  }
  return ref.verseEnd > ref.verseStart
    ? `${ref.reference}:${ref.verseStart}-${ref.verseEnd}`
    : `${ref.reference}:${ref.verseStart}`;
}

export function bibleToItem(ref: BibleRef, versionName: string, perVerse: boolean): PresentItem {
  return {
    id: uid(),
    kind: 'bible',
    title: refLabel(ref),
    subtitle: versionName,
    versionLabel: versionName,
    refLabel: refLabel(ref),
    perVerse,
    verses: ref.verses,
  };
}

// ── Documents ──────────────────────────────────────────────────────────────

export interface DocsData {
  docs: DocItem[];
  cats: DocCat[];
}

let docsCache: DocsData | null = null;

export async function loadDocs(): Promise<DocsData | null> {
  if (docsCache) return docsCache;
  const data = await loadDocsManifest();
  if (data) docsCache = data;
  return data;
}

export function docToItem(doc: DocItem): PresentItem {
  return {
    id: uid(),
    kind: 'doc',
    title: doc.title,
    subtitle: doc.fileName,
    docPath: doc.url,
    docUrl: doc.url,
  };
}

export function searchDocs(data: DocsData, query: string, catFilter: string | null, limit = 40): SourceHit[] {
  const q = query.trim().toLowerCase();
  return data.docs
    .filter((d) => {
      if (catFilter && d.categoryId !== catFilter) return false;
      if (!q) return true;
      return `${d.title} ${d.fileName}`.toLowerCase().includes(q);
    })
    .slice(0, limit)
    .map((d) => {
      const cat = docsCatById(data.cats, d.categoryId);
      return {
        key: d.id,
        title: `${docsCatIcon(cat)} ${d.title}`,
        subtitle: cat?.title ?? d.categoryId.replace(/_/g, ' '),
        badge: d.size,
        toItem: () => docToItem(d),
      };
    });
}
