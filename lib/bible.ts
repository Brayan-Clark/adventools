import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadDatabase } from './database';

export interface BibleConfig {
  id: string;
  name: string;
  language: string;
  file: string;
  url?: string;
  isDefault?: boolean;
}

// Default Malagasy version (Built-in)
export const DEFAULT_BIBLE: BibleConfig = {
  id: 'MG',
  name: 'Malagasy MG65',
  language: 'Malagasy',
  file: "MG65_v2.db",
  isDefault: true
};

// Built-in assets mapping
export const DB_SOURCES: Record<string, any> = {
  "MG65_v2.db": require("../assets/bibles/MG65_v2.db"),
};

export const BOOK_MAP: Record<string, string> = {
  'gen': 'Genesisy', 'eks': 'Eksodosy', 'lev': 'Levitikosy', 'nom': 'Nomery', 'deo': 'Deotoronomia',
  'jos': 'Josoa', 'mpits': 'Mpitsara', 'rota': 'Rota', '1sam': '1 Samoela', '2sam': '2 Samoela',
  '1mpanj': '1 Mpanjaka', '2mpanj': '2 Mpanjaka', '1tant': '1 Tantara', '2tant': '2 Tantara',
  'ezra': 'Ezra', 'neh': 'Nehemia', 'est': 'Estera', 'joba': 'Joba', 'sal': 'Salamo', 'ohab': 'Ohabolana',
  'mpito': 'Mpitoriteny', 'tonon': "Tonon-kiran'i Solomona", 'isa': 'Isaia', 'jer': 'Jeremia',
  'fitom': 'Fitomaniana', 'ezek': 'Ezekiela', 'dan': 'Daniela',
  'hos': 'Hosea', 'joel': 'Joela', 'amos': 'Amosa', 'obad': 'Obadia', 'jona': 'Jona', 'mika': 'Mika',
  'nah': 'Nahoma', 'hab': 'Habakoka', 'zef': 'Zefania', 'hag': 'Hagay', 'zak': 'Zakaria', 'mal': 'Malakia',
  'mat': 'Matio', 'mar': 'Marka', 'lio': 'Lioka', 'jao': 'Jaona', 'asa': "Asan'ny Apostoly",
  'rom': 'Romana', '1kor': '1 Korintiana', '2kor': '2 Korintiana', 'gal': 'Galatiana',
  'efe': 'Efesiana', 'filip': 'Filipiana', 'kol': 'Kolosiana',
  '1tes': '1 Tesaloniana', '2tes': '2 Tesaloniana', '1tim': '1 Timoty', '2tim': '2 Timoty',
  'tit': 'Titosy', 'file': 'Filemona', 'heb': 'Hebreo', 'jak': 'Jakoba',
  '1pet': '1 Petera', '2pet': '2 Petera', '1jao': '1 Jaona', '2jao': '2 Jaona', '3jao': '3 Jaona',
  'jod': 'Joda', 'apok': 'Apokalypsy'
};

const BIBLE_BOOKS = Object.keys(BOOK_MAP).join('|') + '|' + Object.values(BOOK_MAP).join('|') + '|Genesisy|Eksodosy|Levitikosy|Nomery|Deoteronomia|Josoa|Mpitsara|Rota|1Samoela|2Samoela|1Mpanjaka|2Mpanjaka|1Tantara|2Tantara|Ezra|Nehemia|Estera|Joba|Salamo|Ohabolana|Mpitoriteny|Tonon-kiran\'i Solomona|Isaia|Jeremia|Fitomaniana|Ezekiela|Daniela|Hosea|Joela|Amosa|Obadia|Jona|Mika|Nahoma|Habakoka|Zefania|Hagay|Zakaria|Malakia|Matio|Marka|Lioka|Jaona|Asan\'ny Apostoly|Romana|Romanina|1Korintiana|2Korintiana|Galatiana|Efesiana|Filipiana|Kolosiana|1Tesaloniana|2Tesaloniana|1Timoty|2Timoty|Titosy|Filemona|Hebreo|Jakoba|1Petera|2Petera|1Jaona|2Jaona|3Jaona|Joda|Apokalypsy|Zak';

export const BIBLE_REGEX = new RegExp(`\\b(${BIBLE_BOOKS})\\.?\\s{0,1}(\\d+)\\s{0,1}(?::\\s{0,1}([\\d\\s\\-,]+))?(?:\\.?\\s{0,1})\\b`, 'gi');

import * as FileSystem from 'expo-file-system/legacy';

/**
 * Ensures a bible file is available locally, downloads it if missing and URL is provided.
 */
export async function checkAndDownloadBible(config: BibleConfig): Promise<boolean> {
  try {
    const docDir = FileSystem.documentDirectory;
    const dbDir = `${docDir}SQLite/bibles`;
    const dbPath = `${dbDir}/${config.file}`;

    const info = await FileSystem.getInfoAsync(dbPath);
    if (info.exists) return true;

    if (!config.url) return false;

    console.log(`Downloading missing bible: ${config.name}...`);

    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(dbDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
    }

    const downloadRes = await FileSystem.downloadAsync(config.url, dbPath);
    return downloadRes.status === 200;
  } catch (e) {
    console.error(`Error downloading bible ${config.name}:`, e);
    return false;
  }
}

/**
 * Gets all available bibles (built-in + downloaded).
 */
export async function getAvailableBibles(): Promise<BibleConfig[]> {
  const list = [DEFAULT_BIBLE];

  // Try to ensure default bible is there (silent check)
  checkAndDownloadBible(DEFAULT_BIBLE).catch(() => { });

  try {
    const stored = await AsyncStorage.getItem('adventools_bibles_installed');
    if (stored) {
      const downloaded = JSON.parse(stored) as BibleConfig[];
      // Filter out those that are "Malagasy" if we want to avoid duplicates or enforce our DEFAULT_BIBLE
      list.push(...downloaded.filter(b => b.id !== DEFAULT_BIBLE.id));
    }
  } catch (e) { console.error(e); }
  return list;
}

/**
 * Helper to get the correct table names and column names based on the database schema.
 */
async function getBibleSchema(db: any) {
  const tables: any[] = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");

  // New schema check (Cloud)
  const isNewSchema = tables.some(t => t.name === 'books') && tables.some(t => t.name === 'verses');

  if (isNewSchema) {
    return {
      bookTable: 'books',
      verseTable: 'verses',
      bookIdCol: 'book_number',
      bookNameCol: 'long_name',
      chapterCol: 'chapter',
      verseNumCol: 'verse',
      textCol: 'text'
    };
  }

  // Legacy / Malagasy schema check
  const bookTable = tables.find(t => t.name.endsWith("_boky"))?.name;
  const verseTable = tables.find(t => t.name.endsWith("_andininy"))?.name;

  if (bookTable && verseTable) {
    return {
      bookTable,
      verseTable,
      bookIdCol: 'id',
      bookNameCol: 'b_name',
      chapterCol: 'a_toko',
      verseNumCol: 'a_and',
      textCol: 'a_text'
    };
  }

  throw new Error("Unknown Bible database schema");
}

export async function fetchVerseContent(lang: string, bookName: string, chapter: string, verses: string, stripNotes = false) {
  try {
    const bibles = await getAvailableBibles();
    const config = bibles.find(b => b.id === lang) || bibles.find(b => b.id === 'MG') || DEFAULT_BIBLE;

    // Cloud bibles are in 'bibles/' subfolder, built-in is in 'bibles' (passed to loadDatabase)
    // Actually loadDatabase adds 'SQLite/' prefix automatically.
    const subfolder = 'bibles';
    const db = await loadDatabase(config.file, DB_SOURCES[config.file], subfolder);
    const schema = await getBibleSchema(db);

    const cleanDetectedBook = bookName.replace(/[\.\s]/g, '').toLowerCase();
    let searchBookName = BOOK_MAP[cleanDetectedBook];

    if (!searchBookName && cleanDetectedBook.length >= 3) {
      const shortName = cleanDetectedBook.substring(0, 3);
      searchBookName = BOOK_MAP[shortName];
    }

    if (!searchBookName) {
      searchBookName = bookName;
    }

    const bookQuery = `
      SELECT ${schema.bookIdCol} as id, ${schema.bookNameCol} as name 
      FROM ${schema.bookTable} 
      WHERE REPLACE(REPLACE(REPLACE(LOWER(${schema.bookNameCol}), ' ', ''), '-', ''), "'", '') LIKE ? 
      OR REPLACE(REPLACE(REPLACE(LOWER(${schema.bookNameCol}), ' ', ''), '-', ''), "'", '') LIKE ?
      LIMIT 1
    `;
    const searchPattern = `%${searchBookName.toLowerCase().replace(/[\s\-\']/g, '')}%`;
    const shortSearchPattern = `%${cleanDetectedBook}%`;

    let bookRes: any = await db.getFirstAsync(bookQuery, [searchPattern, shortSearchPattern]);

    if (!bookRes) return null;

    let query = `SELECT ${schema.verseNumCol} as a_and, ${schema.textCol} as a_text FROM ${schema.verseTable} WHERE ${schema.bookIdCol} = ? AND CAST(${schema.chapterCol} AS INTEGER) = ?`;
    let params: any[] = [bookRes.id, chapter];

    if (verses) {
      const cleanVerses = verses.replace(/\s/g, '');
      if (cleanVerses.includes('-')) {
        const parts = cleanVerses.split('-');
        if (parts.length === 2 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))) {
          query += ` AND ${schema.verseNumCol} BETWEEN ? AND ?`;
          params.push(parseInt(parts[0]), parseInt(parts[1]));
        }
      } else if (cleanVerses.includes(',')) {
        const nums = cleanVerses.split(',').map(n => parseInt(n)).filter(n => !isNaN(n));
        if (nums.length > 0) {
          query += ` AND ${schema.verseNumCol} IN (${nums.join(',')})`;
        }
      } else {
        const num = parseInt(cleanVerses);
        if (!isNaN(num)) {
          query += ` AND ${schema.verseNumCol} = ?`;
          params.push(num);
        }
      }
    }

    const versesRes: any[] = await db.getAllAsync(query, params);
    if (versesRes && versesRes.length > 0) {
      const text = versesRes.map(v => versesRes.length > 1 ? `${v.a_and}. ${v.a_text}` : v.a_text).join('\n\n');
      return {
        text: stripNotes ? text.replace(/<n>.*?<\/n>/g, '') : text,
        bookId: bookRes.id,
        bookName: bookRes.name
      };
    }
    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function fetchVerseContentById(lang: string, bookId: number, chapter: string, verse: string, stripNotes = true) {
  try {
    const bibles = await getAvailableBibles();
    const config = bibles.find(b => b.id === lang) || bibles.find(b => b.id === 'MG') || DEFAULT_BIBLE;
    const db = await loadDatabase(config.file, DB_SOURCES[config.file], 'bibles');
    const schema = await getBibleSchema(db);

    const verseQuery = `
      SELECT ${schema.verseNumCol} as verse, ${schema.textCol} as text, ${schema.bookNameCol} as book, ${schema.chapterCol} as chapter
      FROM ${schema.verseTable}
      JOIN ${schema.bookTable} ON ${schema.verseTable}.${schema.bookIdCol} = ${schema.bookTable}.${schema.bookIdCol}
      WHERE ${schema.verseTable}.${schema.bookIdCol} = ? AND CAST(${schema.chapterCol} AS INTEGER) = ? AND ${schema.verseNumCol} = ?
    `;

    const result: any = await db.getFirstAsync(verseQuery, [bookId, parseInt(chapter), parseInt(verse)]);
    if (!result) return null;

    return {
      text: stripNotes ? result.text.replace(/<n>.*?<\/n>/g, '') : result.text,
      book: result.book,
      bookId: bookId,
      chapter: parseInt(chapter),
      verses: verse
    };

  } catch (error) {
    console.error('Error fetching verse content by ID:', error);
    return null;
  }
}
