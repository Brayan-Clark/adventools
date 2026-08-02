import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// --- Chemins -------------------------------------------------------------
const DATA_DIR = process.env.ANDEAHA_DATA_DIR
  ? path.resolve(process.env.ANDEAHA_DATA_DIR)
  : path.join(process.cwd(), 'data');
const BIBLE_DIR = path.join(DATA_DIR, 'bible');

export interface BibleVersion {
  id: string;
  name: string;
  language: string;
  file: string;
  url: string;
  size: string;
  description?: string;
  isDefault?: boolean;
  testaments?: { id: number; name: string }[];
}

export interface BibleBook {
  number: number;
  shortName: string;
  longName: string;
  testamentId: number;
  /** Nombre de chapitres (calculé) */
  chapters: number;
}

export interface BibleVerse {
  verse: number;
  text: string;
}

export interface BibleChapter {
  version: string;
  book: BibleBook;
  chapter: number;
  verses: BibleVerse[];
  /** Référence lisible, ex : "Genèse 1" */
  reference: string;
  totalChapters: number;
}

// --- Cache mémoire -------------------------------------------------------
let _manifest: BibleVersion[] | null = null;
let _manifestMtime = 0;
const _conns = new Map<string, Database.Database>();

function conn(file: string): Database.Database {
  if (_conns.has(file)) return _conns.get(file)!;
  const p = path.join(BIBLE_DIR, file);
  if (!fs.existsSync(p)) throw new Error(`Bible introuvable : ${file}`);
  const db = new Database(p, { readonly: true });
  _conns.set(file, db);
  return db;
}

function loadManifest(): BibleVersion[] {
  const manifestPath = path.join(BIBLE_DIR, 'manifest.json');
  try {
    // Invalidation par mtime : si data/bible/manifest.json change (ex : ajout
    // de versions), on relit le manifest sans redémarrer le serveur.
    const stat = fs.statSync(manifestPath);
    if (_manifest && stat.mtimeMs === _manifestMtime) return _manifest;
    const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    _manifest = (raw.versions ?? []) as BibleVersion[];
    _manifestMtime = stat.mtimeMs;
  } catch {
    _manifest = [];
  }
  return _manifest;
}

/** Liste des versions intégrées */
export function getBibleVersions(): BibleVersion[] {
  return loadManifest();
}

export function getBibleVersion(id: string): BibleVersion | null {
  return loadManifest().find((v) => v.id === id || v.file === id) ?? null;
}

/** Nettoyage des balises HTML (rouge du Seigneur `<n>`, `<br/>`, etc.) */
export function cleanVerseText(text: string): string {
  return text
    .replace(/<n>/g, '')
    .replace(/<\/n>/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Livres d'une version, avec nombre de chapitres par livre */
export function getBibleBooks(versionId: string): BibleBook[] {
  const v = getBibleVersion(versionId);
  if (!v) return [];
  const db = conn(v.file);
  const books = db
    .prepare('SELECT book_number, short_name, long_name, testament_id FROM books ORDER BY book_number')
    .all() as { book_number: number; short_name: string; long_name: string; testament_id: number }[];
  return books.map((b) => {
    const { n } = db
      .prepare('SELECT COUNT(DISTINCT chapter) AS n FROM verses WHERE book_number = ?')
      .get(b.book_number) as { n: number };
    return {
      number: b.book_number,
      shortName: b.short_name,
      longName: b.long_name,
      testamentId: b.testament_id,
      chapters: n,
    };
  });
}

/** Un chapitre complet (versets numérotés) */
export function getBibleChapter(versionId: string, bookNumber: number, chapter: number): BibleChapter | null {
  const v = getBibleVersion(versionId);
  const book = getBibleBooks(versionId).find((b) => b.number === bookNumber) ?? null;
  if (!v || !book || chapter < 1 || chapter > book.chapters) return null;
  const db = conn(v.file);
  const rows = db
    .prepare('SELECT verse, text FROM verses WHERE book_number = ? AND chapter = ? ORDER BY verse')
    .all(bookNumber, chapter) as { verse: number; text: string }[];
  return {
    version: versionId,
    book,
    chapter,
    verses: rows.map((r) => ({ verse: r.verse, text: cleanVerseText(r.text) })),
    reference: `${book.longName} ${chapter}`,
    totalChapters: book.chapters,
  };
}

// --- Recherche & références ----------------------------------------------

/** Versions utilisées comme référentiel d'alias multilingues (noms de livres) */
const REFERENCE_SOURCE_VERSIONS = ['MG65.SQLite3', 'DIEM.SQLite3', 'SBF.SQLite3', 'Niobe.SQLite3'];

let _aliasIndex: Map<number, Set<string>> | null = null;

/** Normalise un nom de livre : minuscules, sans accents, sans ponctuation */
export function normalizeBookName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Index multilingue : numéro canonique de livre → alias (noms courts + longs
 * des 4 versions de base : malgache 1865/DIEM, français, anglais).
 */
function buildAliasIndex(): Map<number, Set<string>> {
  if (_aliasIndex) return _aliasIndex;
  const idx = new Map<number, Set<string>>();
  for (const file of REFERENCE_SOURCE_VERSIONS) {
    let books: BibleBook[] = [];
    try {
      books = getBibleBooks(file);
    } catch {
      continue;
    }
    for (const b of books) {
      if (!idx.has(b.number)) idx.set(b.number, new Set());
      const set = idx.get(b.number)!;
      set.add(normalizeBookName(b.shortName));
      set.add(normalizeBookName(b.longName));
    }
  }
  _aliasIndex = idx;
  return idx;
}

/** Résout le numéro canonique d'un livre à partir d'un nom/abréviation multilingue */
export function resolveBookNumber(name: string): number | null {
  const q = normalizeBookName(name);
  if (!q) return null;
  const idx = buildAliasIndex();
  // 1) correspondance exacte (ex : jao, jn, john, jaona, johany)
  for (const [num, aliases] of idx) {
    if (aliases.has(q)) return num;
  }
  // 2) abréviation : l'alias commence par la saisie (ex : Joh → John, Gen → Genesisy)
  if (q.length >= 2) {
    let best: number | null = null;
    let bestLen = 0;
    for (const [num, aliases] of idx) {
      for (const a of aliases) {
        if (a.startsWith(q) && a.length > bestLen) {
          bestLen = a.length;
          best = num;
        }
      }
    }
    if (best) return best;
  }
  return null;
}

export interface BibleRefTarget {
  bookNumber: number;
  chapter: number;
  /** 0 = tout le chapitre */
  verseStart: number;
  verseEnd: number;
  reference: string;
  totalChapters: number;
}

/**
 * Analyse une référence biblique : « Jaona3:16 », « Jao.3:16 », « Jao.3:16-20 »,
 * « Genèse 1:1 », « 1 Jean 2 »… Renvoie null si ce n'est pas une référence valide.
 */
export function parseBibleReference(versionId: string, input: string): BibleRefTarget | null {
  const s = input.trim();
  if (!s) return null;
  // Livre + chapitre:verset[-fin]  ou  livre + chapitre
  const m =
    s.match(/^([0-9]?\s*[A-Za-zÀ-ÿ'’ .-]+?)\s*[:.]?\s*(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\s*$/i) ??
    s.match(/^([0-9]?\s*[A-Za-zÀ-ÿ'’ .-]+?)\s*[:.]?\s*(\d{1,3})\s*$/i);
  if (!m) return null;
  const bookNumber = resolveBookNumber(m[1]);
  if (!bookNumber) return null;
  const books = getBibleBooks(versionId);
  const book = books.find((b) => b.number === bookNumber);
  if (!book) return null;
  const chapter = Number(m[2]);
  if (chapter < 1 || chapter > book.chapters) return null;
  let verseStart = 1;
  let verseEnd = 0; // 0 = tout le chapitre
  if (m[3]) {
    verseStart = Number(m[3]);
    verseEnd = m[4] ? Number(m[4]) : verseStart;
    if (verseEnd < verseStart) verseEnd = verseStart;
  }
  return {
    bookNumber,
    chapter,
    verseStart,
    verseEnd,
    reference: `${book.longName} ${chapter}`,
    totalChapters: book.chapters,
  };
}

export interface BibleSearchHit {
  bookNumber: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
}

/** Recherche plein-texte (tous les mots doivent apparaître) dans une version */
export function searchBible(versionId: string, query: string, limit = 30): { count: number; results: BibleSearchHit[] } {
  const v = getBibleVersion(versionId);
  if (!v) return { count: 0, results: [] };
  const words = query
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
  if (!words.length) return { count: 0, results: [] };
  const db = conn(v.file);
  const where = words.map(() => 'lower(text) LIKE ?').join(' AND ');
  const params = words.map((w) => `%${w.toLowerCase()}%`);
  const { c } = db
    .prepare(`SELECT COUNT(*) AS c FROM verses WHERE ${where}`)
    .get(...params) as { c: number };
  const rows = db
    .prepare(
      `SELECT book_number, chapter, verse, text FROM verses WHERE ${where} ORDER BY book_number, chapter, verse LIMIT ?`
    )
    .all(...params, limit) as { book_number: number; chapter: number; verse: number; text: string }[];
  const nameMap = new Map(getBibleBooks(versionId).map((b) => [b.number, b.longName]));
  return {
    count: c,
    results: rows.map((r) => ({
      bookNumber: r.book_number,
      bookName: nameMap.get(r.book_number) ?? '',
      chapter: r.chapter,
      verse: r.verse,
      text: cleanVerseText(r.text),
      reference: `${nameMap.get(r.book_number) ?? ''} ${r.chapter}:${r.verse}`,
    })),
  };
}

