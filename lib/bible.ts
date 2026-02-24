import { loadDatabase } from './database';

export const DB_SOURCES: Record<string, any> = {
  'protestant.db': require('../assets/databases/protestant.db'),
  'king_james.db': require('../assets/databases/king_james.db'),
  'le_bible.db': require('../assets/databases/le_bible.db'),
  'arabic.db': require('../assets/databases/arabic.db'),
  'basic_english.db': require('../assets/databases/basic_english.db'),
  'esperanto.db': require('../assets/databases/esperanto.db'),
  'greek.db': require('../assets/databases/greek.db'),
  'schlachter.db': require('../assets/databases/schlachter.db'),
  'diem.db': require('../assets/databases/diem.db'),
};

export const BIBLE_CONFIGS: Record<string, { file: string; prefix: string; name: string }> = {
  'MG': { file: 'protestant.db', prefix: 'protestant', name: 'Malagasy' },
  'FR': { file: 'le_bible.db', prefix: 'fr', name: 'Français' },
  'EN': { file: 'king_james.db', prefix: 'en', name: 'English (KJV)' },
  'AR': { file: 'arabic.db', prefix: 'ar', name: 'العربية' },
  'BE': { file: 'basic_english.db', prefix: 'en', name: 'Basic English' },
  'ES': { file: 'esperanto.db', prefix: 'es', name: 'Esperanto' },
  'GR': { file: 'greek.db', prefix: 'gr', name: 'Ελληνικά' },
  'DE': { file: 'schlachter.db', prefix: 'sc', name: 'Deutsch' },
  'CI': { file: 'diem.db', prefix: 'ci_diem', name: 'Diem' },
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
    const config = BIBLE_CONFIGS[lang || 'MG'];
    const db = await loadDatabase(config.file, DB_SOURCES[config.file]);

    const tables: any[] = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
    const bookTable = tables.find(t => t.name.endsWith("_boky"))?.name;
    const verseTable = tables.find(t => t.name.endsWith("_andininy"))?.name;

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
      SELECT id, b_name 
      FROM ${bookTable} 
      WHERE REPLACE(REPLACE(REPLACE(LOWER(b_name), ' ', ''), '-', ''), "'", '') LIKE ? 
      OR REPLACE(REPLACE(REPLACE(LOWER(b_name), ' ', ''), '-', ''), "'", '') LIKE ?
      LIMIT 1
    `;
    const searchPattern = `%${searchBookName.toLowerCase().replace(/[\s\-\']/g, '')}%`;
    const shortSearchPattern = `%${cleanDetectedBook}%`;

    let bookRes: any = await db.getFirstAsync(bookQuery, [searchPattern, shortSearchPattern]);

    if (!bookRes) return null;

    let query = `SELECT a_and, a_text FROM ${verseTable} WHERE a_bid = ? AND a_toko = ?`;
    let params: any[] = [bookRes.id, chapter];

    if (verses) {
      const cleanVerses = verses.replace(/\s/g, '');
      if (cleanVerses.includes('-')) {
        const parts = cleanVerses.split('-');
        if (parts.length === 2 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))) {
          query += ` AND a_and BETWEEN ? AND ?`;
          params.push(parseInt(parts[0]), parseInt(parts[1]));
        }
      } else if (cleanVerses.includes(',')) {
        const nums = cleanVerses.split(',').map(n => parseInt(n)).filter(n => !isNaN(n));
        if (nums.length > 0) {
          query += ` AND a_and IN (${nums.join(',')})`;
        }
      } else {
        const num = parseInt(cleanVerses);
        if (!isNaN(num)) {
          query += ` AND a_and = ?`;
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

export async function fetchVerseContentById(lang: string, bookId: number, chapter: string, verse: string) {
  try {
    const config = BIBLE_CONFIGS[lang || 'MG'];
    const db = await loadDatabase(config.file, DB_SOURCES[config.file]);

    const tables: any[] = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
    const bookTable = tables.find(t => t.name.endsWith("_boky"))?.name;
    const verseTable = tables.find(t => t.name.endsWith("_andininy"))?.name;

    if (!bookTable || !verseTable) return null;

    const verseQuery = `
      SELECT a_and as verse, a_text as text, b_name as book, a_toko as chapter
      FROM ${verseTable}
      JOIN ${bookTable} ON ${verseTable}.a_bid = ${bookTable}.id
      WHERE ${verseTable}.a_bid = ? AND a_toko = ? AND a_and = ?
    `;

    const result: any = await db.getFirstAsync(verseQuery, [bookId, parseInt(chapter), parseInt(verse)]);
    if (!result) return null;

    return {
      text: result.text,
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
