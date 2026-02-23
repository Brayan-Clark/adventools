import { loadDatabase } from './database';

import manifest from '@/assets/bible/manifest.json';

// Keep static sources only for files that ARE currently in assets
export const DB_SOURCES: Record<string, any> = {
  // 'protestant.db': require('../assets/databases/protestant.db'),
  // ... others can be added if needed, but we aim for zero default
};

export interface BibleConfig {
  id: string;
  name: string;
  language: string;
  file: string;
  url: string;
  size: string;
  isDefault?: boolean;
}

export const getBibleConfigs = (): BibleConfig[] => {
  return manifest.versions;
};

export const BOOK_MAP: Record<string, string> = {
  'gen': 'Genesisy', 'eks': 'Eksodosy', 'lev': 'Levitikosy', 'nom': 'Nomery', 'deo': 'Deotoronomia',
  'jos': 'Josoa', 'mpits': 'Mpitsara', 'rota': 'Rota', '1sam': '1 Samoela', '2sam': '2 Samoela',
  '1mpanj': '1 Mpanjaka', '2mpanj': '2 Mpanjaka', '1tant': '1 Tantara', '2tant': '2 Tantara',
  'ezra': 'Ezra', 'neh': 'Nehemia', 'est': 'Estera', 'joba': 'Joba', 'sal': 'Salamo', 'ohab': 'Ohabolana',
  'mpito': 'Mpitoriteny', 'tonon': "Tonon-kiran'i Solomona", 'isa': 'Isaia', 'jer': 'Jeremia',
  'fitom': 'Fitomaniana', 'ezek': 'Ezekiela', 'dan': 'Daniela',
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

export async function fetchVerseContent(lang: string, bookName: string, chapter: string, verses: string) {
  try {
    const configs = getBibleConfigs();
    const config = configs.find(c => c.id === lang) || configs.find(c => c.isDefault) || configs[0];
    const db = await loadDatabase(config.file, DB_SOURCES[config.file]);

    const tables: any[] = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");

    // Detection du schéma
    const isNewSchema = tables.some(t => t.name === 'verses');

    let bookTable, verseTable, colBookId, colBookName, colVerseBookId, colVerseChapter, colVerseNumber, colVerseText;

    if (isNewSchema) {
      bookTable = 'books';
      verseTable = 'verses';
      colBookId = 'book_number';
      colBookName = 'long_name';
      colVerseBookId = 'book_number';
      colVerseChapter = 'chapter';
      colVerseNumber = 'verse';
      colVerseText = 'text';
    } else {
      bookTable = tables.find(t => t.name.endsWith("_boky"))?.name;
      verseTable = tables.find(t => t.name.endsWith("_andininy"))?.name;
      colBookId = 'id';
      colBookName = 'b_name';
      colVerseBookId = 'a_bid';
      colVerseChapter = 'a_toko';
      colVerseNumber = 'a_and';
      colVerseText = 'a_text';
    }

    if (!bookTable || !verseTable) return null;

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
      SELECT ${colBookId} as id, ${colBookName} as b_name 
      FROM ${bookTable} 
      WHERE REPLACE(REPLACE(REPLACE(LOWER(${colBookName}), ' ', ''), '-', ''), "'", '') LIKE ? 
      OR REPLACE(REPLACE(REPLACE(LOWER(${colBookName}), ' ', ''), '-', ''), "'", '') LIKE ?
      LIMIT 1
    `;
    const searchPattern = `%${searchBookName.toLowerCase().replace(/[\s\-\']/g, '')}%`;
    const shortSearchPattern = `%${cleanDetectedBook}%`;

    let bookRes: any = await db.getFirstAsync(bookQuery, [searchPattern, shortSearchPattern]);

    if (!bookRes) return null;

    let query = `SELECT ${colVerseNumber} as a_and, ${colVerseText} as a_text FROM ${verseTable} WHERE ${colVerseBookId} = ? AND ${colVerseChapter} = ?`;
    let params: any[] = [bookRes.id, chapter];

    if (verses) {
      const cleanVerses = verses.replace(/\s/g, '');
      if (cleanVerses.includes('-')) {
        const parts = cleanVerses.split('-');
        if (parts.length === 2 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))) {
          query += ` AND ${colVerseNumber} BETWEEN ? AND ?`;
          params.push(parseInt(parts[0]), parseInt(parts[1]));
        }
      } else if (cleanVerses.includes(',')) {
        const nums = cleanVerses.split(',').map(n => parseInt(n)).filter(n => !isNaN(n));
        if (nums.length > 0) {
          query += ` AND ${colVerseNumber} IN (${nums.join(',')})`;
        }
      } else {
        const num = parseInt(cleanVerses);
        if (!isNaN(num)) {
          query += ` AND ${colVerseNumber} = ?`;
          params.push(num);
        }
      }
    }

    const versesRes: any[] = await db.getAllAsync(query, params);
    if (versesRes && versesRes.length > 0) {
      return {
        text: versesRes.map(v => versesRes.length > 1 ? `${v.a_and}. ${v.a_text}` : v.a_text).join('\n\n'),
        bookId: bookRes.id,
        bookName: bookRes.b_name
      };
    }
    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
}
