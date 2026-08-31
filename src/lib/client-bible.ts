/**
 * Bible côté client (100% statique, GitHub Pages) : charge les bases SQLite
 * depuis la branche `data` d'adventools via sql.js + Cache API.
 *
 * Même mécanique que src/pages/bible/index.astro, extraite en module partagé
 * pour que la page bible ET le mode "Bible" des présentations l'utilisent.
 */

import initSqlJs from 'sql.js';
import { fetchDataFile } from './hymnals';

export const BIBLE_RAW =
  'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/bible';

export const BIBLE_MANIFEST_URL = `${BIBLE_RAW}/manifest.json`;

// Secours si le manifest distant est indisponible
export const BIBLE_FALLBACK_VERSIONS = [
  {
    id: 'MG65_SQLite3',
    name: 'MG65',
    file: 'MG65.SQLite3',
    language: 'Malagasy',
    isDefault: true,
    url: `${BIBLE_RAW}/MG65.SQLite3`,
  },
  {
    id: 'SBF_SQLite3',
    name: 'SBF',
    file: 'SBF.SQLite3',
    language: 'French',
    isDefault: true,
    url: `${BIBLE_RAW}/SBF.SQLite3`,
  },
];

export type BibleVersion = {
  id: string;
  name: string;
  file: string;
  language?: string;
  isDefault?: boolean;
  url: string;
};

export type BibleBook = {
  number: number;
  shortName: string;
  longName: string;
  chapters: number;
  testamentId: number;
};

export type BibleVerse = { verse: number; text: string };

export type BibleSearchResult = {
  count: number;
  results: { bookNumber: number; chapter: number; verse: number; text: string; reference: string }[];
};

let _base = '/';
export function setBase(b: string): void {
  _base = b;
}

// --- Init sql.js ----------------------------------------------------------
let SQLPromise: Promise<any> | null = null;
export function initSql(): Promise<any> {
  if (!SQLPromise) {
    SQLPromise = initSqlJs({ locateFile: () => _base + 'sql-wasm.wasm' });
  }
  return SQLPromise;
}

// --- Cache des bases -------------------------------------------------------
const dbCache = new Map<string, any>();
export function resetDbCache(): void {
  dbCache.clear();
}

/** Télécharge (avec persistance Cache API) et charge en mémoire une version .SQLite3. */
export async function loadDb(versions: BibleVersion[], file: string): Promise<any> {
  if (dbCache.has(file)) return dbCache.get(file);
  const v = versions.find((x) => x.file === file);
  const url = v?.url ?? `${BIBLE_RAW}/${encodeURIComponent(file)}`;
  // Revalidation conditionnelle partagée avec les recueils de cantiques : le
  // cache seul ne voyait jamais les mises à jour de la branche `data`.
  const bytes = await fetchDataFile(url, 'ah-bible-db');
  const sql = await initSql();
  const db = new sql.Database(bytes);
  dbCache.set(file, db);
  return db;
}

/** Charge la liste des versions depuis le manifest distant (avec secours). */
export async function loadVersions(): Promise<BibleVersion[]> {
  try {
    const res = await fetch(BIBLE_MANIFEST_URL, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.versions)) {
        return data.versions.map((v: any) => ({
          id: v.id,
          name: v.name,
          file: v.file,
          language: v.language,
          isDefault: v.isDefault,
          url: v.url ?? `${BIBLE_RAW}/${encodeURIComponent(v.file)}`,
        }));
      }
    }
  } catch {
    /* offline */
  }
  return BIBLE_FALLBACK_VERSIONS;
}

// --- Requêtes SQL ----------------------------------------------------------
export function queryAll(db: any, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

export function cleanVerseText(text: string): string {
  return text
    .replace(/<n>/g, '')
    .replace(/<\/n>/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function readBooks(db: any): BibleBook[] {
  const rows = queryAll(
    db,
    `SELECT b.book_number, b.short_name, b.long_name, b.testament_id,
            COUNT(DISTINCT v.chapter) AS chapters
     FROM books b
     LEFT JOIN verses v ON v.book_number = b.book_number
     GROUP BY b.book_number, b.short_name, b.long_name, b.testament_id
     ORDER BY b.book_number`
  );
  return rows.map((r) => ({
    number: r.book_number,
    shortName: r.short_name,
    longName: r.long_name,
    testamentId: r.testament_id,
    chapters: Number(r.chapters) || 0,
  }));
}

export function readChapter(db: any, bookNumber: number, chapter: number): BibleVerse[] {
  return queryAll(
    db,
    'SELECT verse, text FROM verses WHERE book_number = ? AND chapter = ? ORDER BY verse',
    [bookNumber, chapter]
  ).map((r) => ({ verse: r.verse, text: cleanVerseText(r.text) }));
}

export function searchVerses(db: any, books: BibleBook[], query: string, limit = 30): BibleSearchResult {
  const words = query
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
  if (!words.length) return { count: 0, results: [] };
  const where = words.map(() => 'lower(text) LIKE ?').join(' AND ');
  const params = words.map((w) => `%${w.toLowerCase()}%`);
  const [{ c }] = queryAll(db, `SELECT COUNT(*) AS c FROM verses WHERE ${where}`, params);
  const rows = queryAll(
    db,
    `SELECT book_number, chapter, verse, text FROM verses WHERE ${where} ORDER BY book_number, chapter, verse LIMIT ${limit}`,
    params
  );
  const nameMap = new Map(books.map((b) => [b.number, b.longName]));
  return {
    count: c,
    results: rows.map((r) => ({
      bookNumber: r.book_number,
      chapter: r.chapter,
      verse: r.verse,
      text: cleanVerseText(r.text),
      reference: `${nameMap.get(r.book_number) ?? ''} ${r.chapter}:${r.verse}`,
    })),
  };
}

// --- Résolution de référence -----------------------------------------------
export function normalizeBookName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function resolveBookNumber(books: BibleBook[], name: string): number | null {
  const q = normalizeBookName(name);
  if (!q) return null;
  const idx = new Map<number, Set<string>>();
  for (const b of books) {
    if (!idx.has(b.number)) idx.set(b.number, new Set());
    const set = idx.get(b.number)!;
    set.add(normalizeBookName(b.longName));
    set.add(normalizeBookName(b.shortName));
  }
  for (const [num, names] of idx) {
    if (names.has(q)) return num;
  }
  return null;
}
