import * as SQLite from 'expo-sqlite';
import { loadDatabase } from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

let db: SQLite.SQLiteDatabase | null = null;

const USER_DB_NAME = 'adventools_user.db';

export async function initUserStorage() {
  if (db) return db;
  
  db = await loadDatabase(USER_DB_NAME);
  
  // Create tables if they don't exist
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- 'text' | 'draw'
      title TEXT,
      content TEXT,
      color TEXT,
      folder_id TEXT,
      date INTEGER,
      FOREIGN KEY(folder_id) REFERENCES folders(id)
    );
    
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      note_id TEXT,
      type TEXT NOT NULL, -- 'image' | 'video' | 'voice'
      uri TEXT NOT NULL,
      duration INTEGER,
      FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT,
      subtitle TEXT,
      timestamp INTEGER,
      params_json TEXT
    );
    
    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT,
      uri TEXT,
      local_uri TEXT,
      size INTEGER,
      date INTEGER
    );

    CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        ref_id TEXT,
        title TEXT,
        date INTEGER
    );

    CREATE TABLE IF NOT EXISTS bible_markup (
        key TEXT PRIMARY KEY, -- word_highlights_lang_book_chapter
        type TEXT NOT NULL, -- 'highlight' | 'bookmark' | 'word'
        lang TEXT,
        book_id TEXT,
        chapter INTEGER,
        data TEXT
    );
  `);
  
  return db;
}

// --- SETTINGS ---
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const database = await initUserStorage();
  const row: any = await database.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
  if (row) {
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return row.value as unknown as T;
    }
  }
  return defaultValue;
}

export async function setSetting(key: string, value: any) {
  const database = await initUserStorage();
  const stringValue = JSON.stringify(value);
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, stringValue]
  );
}

// --- NOTES ---
export async function getAllNotes() {
    const database = await initUserStorage();
    const notes: any[] = await database.getAllAsync('SELECT * FROM notes ORDER BY date DESC');
    
    // Enrich with attachments
    for (let note of notes) {
        const atts: any[] = await database.getAllAsync('SELECT * FROM attachments WHERE note_id = ?', [note.id]);
        note.attachments = {
            images: atts.filter(a => a.type === 'image').map(a => a.uri),
            videos: atts.filter(a => a.type === 'video').map(a => a.uri),
            voice: atts.filter(a => a.type === 'voice').map(a => ({ uri: a.uri, duration: a.duration }))
        };
    }
    return notes;
}

export async function saveNote(note: any) {
    const database = await initUserStorage();
    const noteId = note.id || Date.now().toString() + Math.random().toString();
    const noteType = note.type || 'text';
    const noteDate = note.date || Date.now();

    await database.runAsync(
        'INSERT OR REPLACE INTO notes (id, type, title, content, color, folder_id, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [noteId, noteType, note.title || '', note.content || '', note.color || null, note.folder || null, noteDate]
    );
    
    // Update attachments
    // To be professional and save space, we should delete files that are no longer used
    const oldAtts: any[] = await database.getAllAsync('SELECT uri FROM attachments WHERE note_id = ?', [noteId]);
    const newUris = new Set<string>();
    if (note.attachments) {
        if (note.attachments.images) note.attachments.images.forEach((u: string) => newUris.add(u));
        if (note.attachments.videos) note.attachments.videos.forEach((u: string) => newUris.add(u));
        if (note.attachments.voice) note.attachments.voice.forEach((v: any) => newUris.add(v.uri));
    }

    // Delete files that are in oldAtts but NOT in newUris
    for (const old of oldAtts) {
        if (!newUris.has(old.uri)) {
            try {
                const fileInfo = await FileSystem.getInfoAsync(old.uri);
                if (fileInfo.exists) {
                    await FileSystem.deleteAsync(old.uri, { idempotent: true });
                }
            } catch (e) {
                console.error("Failed to cleanup orphaned attachment file:", old.uri, e);
            }
        }
    }

    await database.runAsync('DELETE FROM attachments WHERE note_id = ?', [noteId]);
    
    if (note.attachments) {
        if (note.attachments.images) {
            for (let uri of note.attachments.images) {
                await database.runAsync('INSERT INTO attachments (id, note_id, type, uri) VALUES (?, ?, ?, ?)', [Date.now() + Math.random().toString(), noteId, 'image', uri]);
            }
        }
        if (note.attachments.videos) {
            for (let uri of note.attachments.videos) {
                await database.runAsync('INSERT INTO attachments (id, note_id, type, uri) VALUES (?, ?, ?, ?)', [Date.now() + Math.random().toString(), noteId, 'video', uri]);
            }
        }
        if (note.attachments.voice) {
            for (let v of note.attachments.voice) {
                await database.runAsync('INSERT INTO attachments (id, note_id, type, uri, duration) VALUES (?, ?, ?, ?, ?)', [Date.now() + Math.random().toString(), noteId, 'voice', v.uri, v.duration || null]);
            }
        }
    }
}

export async function deleteNoteFromDb(id: string) {
    const database = await initUserStorage();
    
    // 1. Find all attachments for this note and delete their files
    const atts: any[] = await database.getAllAsync('SELECT uri FROM attachments WHERE note_id = ?', [id]);
    for (const att of atts) {
        try {
            const fileInfo = await FileSystem.getInfoAsync(att.uri);
            if (fileInfo.exists) {
                await FileSystem.deleteAsync(att.uri, { idempotent: true });
            }
        } catch (e) {
            console.error("Failed to delete attachment file:", att.uri, e);
        }
    }

    // 2. Delete from database
    await database.runAsync('DELETE FROM notes WHERE id = ?', [id]);
    await database.runAsync('DELETE FROM attachments WHERE note_id = ?', [id]);
}

// --- FOLDERS ---
export async function getFolders() {
    const database = await initUserStorage();
    const rows: any[] = await database.getAllAsync('SELECT name FROM folders');
    return rows.map(r => r.name);
}

export async function saveFolders(folders: string[]) {
    const database = await initUserStorage();
    await database.runAsync('DELETE FROM folders');
    for (let f of folders) {
        await database.runAsync('INSERT INTO folders (id, name) VALUES (?, ?)', [f, f]);
    }
}

// --- BIBLE MARKUP ---
export async function getBibleMarkup(key: string) {
    const database = await initUserStorage();
    const row: any = await database.getFirstAsync('SELECT data FROM bible_markup WHERE key = ?', [key]);
    return row ? JSON.parse(row.data) : null;
}

export async function saveBibleMarkup(key: string, data: any) {
    const database = await initUserStorage();
    const parts = key.split('_');
    const type = parts[0];
    const lang = parts[parts.length - 3] || 'MG';
    const book_id = parts[parts.length - 2] || '1';
    const chapter = parseInt(parts[parts.length - 1]) || 1;
    
    await database.runAsync(
        'INSERT OR REPLACE INTO bible_markup (key, type, lang, book_id, chapter, data) VALUES (?, ?, ?, ?, ?, ?)',
        [key, type, lang, book_id, chapter, JSON.stringify(data)]
    );
}

// --- HISTORY ---
export async function getHistory(limit = 10) {
    const database = await initUserStorage();
    const rows: any[] = await database.getAllAsync('SELECT * FROM history ORDER BY timestamp DESC LIMIT ?', [limit]);
    return rows.map(r => ({
        ...r,
        params: r.params_json ? JSON.parse(r.params_json) : null
    }));
}

export async function saveHistory(item: { type: string, title: string, subtitle: string, timestamp: number, params?: any }) {
    const database = await initUserStorage();
    
    // Remove if already exists with same title to avoid duplicates in view
    await database.runAsync('DELETE FROM history WHERE title = ? AND type = ?', [item.title, item.type]);
    
    await database.runAsync(
        'INSERT INTO history (type, title, subtitle, timestamp, params_json) VALUES (?, ?, ?, ?, ?)',
        [item.type, item.title, item.subtitle, item.timestamp, item.params ? JSON.stringify(item.params) : null]
    );

    // Limit to 50 items
    await database.runAsync('DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY timestamp DESC LIMIT 50)');
}

// --- BACKUP & RESTORE ---
export async function exportAllData() {
    const database = await initUserStorage();
    const data: any = {};

    // Export each table
    data.settings = await database.getAllAsync('SELECT * FROM settings');
    data.folders = await database.getAllAsync('SELECT * FROM folders');
    data.notes = await database.getAllAsync('SELECT * FROM notes');
    data.attachments = await database.getAllAsync('SELECT * FROM attachments');
    data.history = await database.getAllAsync('SELECT * FROM history');
    data.downloads = await database.getAllAsync('SELECT * FROM downloads');
    data.favorites = await database.getAllAsync('SELECT * FROM favorites');
    data.bible_markup = await database.getAllAsync('SELECT * FROM bible_markup');

    return {
        version: "2.0",
        timestamp: Date.now(),
        data
    };
}

export async function importData(backup: any) {
    const database = await initUserStorage();
    if (!backup.data) throw new Error("Invalid backup format");

    const d = backup.data;

    // Transactional import (best effort)
    await database.execAsync('BEGIN TRANSACTION');
    try {
        if (d.settings) {
            for (let s of d.settings) await database.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [s.key, s.value]);
        }
        if (d.folders) {
            for (let f of d.folders) await database.runAsync('INSERT OR REPLACE INTO folders (id, name) VALUES (?, ?)', [f.id, f.name]);
        }
        if (d.notes) {
            for (let n of d.notes) await database.runAsync('INSERT OR REPLACE INTO notes (id, type, title, content, color, folder_id, date) VALUES (?, ?, ?, ?, ?, ?, ?)', [n.id, n.type, n.title, n.content, n.color, n.folder_id, n.date]);
        }
        if (d.attachments) {
            for (let a of d.attachments) await database.runAsync('INSERT OR REPLACE INTO attachments (id, note_id, type, uri, duration) VALUES (?, ?, ?, ?, ?)', [a.id, a.note_id, a.type, a.uri, a.duration]);
        }
        if (d.history) {
            for (let h of d.history) await database.runAsync('INSERT OR REPLACE INTO history (id, type, title, subtitle, timestamp, params_json) VALUES (?, ?, ?, ?, ?, ?)', [h.id, h.type, h.title, h.subtitle, h.timestamp, h.params_json]);
        }
        if (d.downloads) {
            for (let dw of d.downloads) await database.runAsync('INSERT OR REPLACE INTO downloads (id, type, title, uri, local_uri, size, date) VALUES (?, ?, ?, ?, ?, ?, ?)', [dw.id, dw.type, dw.title, dw.uri, dw.local_uri, dw.size, dw.date]);
        }
        if (d.favorites) {
            for (let f of d.favorites) await database.runAsync('INSERT OR REPLACE INTO favorites (id, type, ref_id, title, date) VALUES (?, ?, ?, ?, ?)', [f.id, f.type, f.ref_id, f.title, f.date]);
        }
        if (d.bible_markup) {
            for (let m of d.bible_markup) await database.runAsync('INSERT OR REPLACE INTO bible_markup (key, type, lang, book_id, chapter, data) VALUES (?, ?, ?, ?, ?, ?)', [m.key, m.type, m.lang, m.book_id, m.chapter, m.data]);
        }
        await database.execAsync('COMMIT');
    } catch (e) {
        await database.execAsync('ROLLBACK');
        throw e;
    }
}

// --- MIGRATION FROM ASYNC STORAGE ---
export async function migrateFromAsyncStorage() {
    try {
        const migratedKey = 'app_migrated_to_sqlite_v2';
        const isMigrated = await AsyncStorage.getItem(migratedKey);
        if (isMigrated === 'true') {
            // Check if there are new items in AsyncStorage that need merging (from an old backup import)
            const allKeys = await AsyncStorage.getAllKeys();
            const hasLegacyNotes = allKeys.includes('adventools_notes');
            if (!hasLegacyNotes) return;
            
            console.log('--- Legacy items detected in AsyncStorage, merging ---');
        }

        console.log('--- Starting Global Migration to SQLite ---');
        const database = await initUserStorage();
        const allKeys = await AsyncStorage.getAllKeys();

        // 1. Core Settings & Lists
        const settings = await AsyncStorage.getItem('app_global_settings');
        if (settings) await setSetting('app_global_settings', JSON.parse(settings));

        const folders = await AsyncStorage.getItem('adventools_folders');
        if (folders) await saveFolders(JSON.parse(folders));

        const bibles = await AsyncStorage.getItem('adventools_bibles_installed');
        if (bibles) await setSetting('adventools_bibles_installed', JSON.parse(bibles));
        
        // Profile items
        const profileName = await AsyncStorage.getItem('profile_name');
        if (profileName) await setSetting('profile_name', profileName);
        const profileImg = await AsyncStorage.getItem('profile_image');
        if (profileImg) await setSetting('profile_image', profileImg);
        const profileEds = await AsyncStorage.getItem('profile_eds_class');
        if (profileEds) await setSetting('profile_eds_class', profileEds);
        const profileDeps = await AsyncStorage.getItem('profile_departments');
        if (profileDeps) await setSetting('profile_departments', profileDeps);

        // App State & Misc
        const ssLang = await AsyncStorage.getItem('adventools_ss_selected_lang');
        if (ssLang) await setSetting('adventools_ss_selected_lang', ssLang);
        const onboarding = await AsyncStorage.getItem('adventools_onboarding_done');
        if (onboarding) await setSetting('adventools_onboarding_done', onboarding);
        const audioAutoplay = await AsyncStorage.getItem('audio_autoplay');
        if (audioAutoplay) await setSetting('audio_autoplay', audioAutoplay);

        // 2. Notes
        const notesStr = await AsyncStorage.getItem('adventools_notes');
        if (notesStr) {
            const notes = JSON.parse(notesStr);
            for (let note of notes) {
                await saveNote(note);
            }
        }

        // 3. Bible Highlights, Bookmarks, Word Highlights + Hymn Favorites
        const markupKeys = allKeys.filter(k => 
            k.startsWith('highlights_') || 
            k.startsWith('bookmarks_') || 
            k.startsWith('word_highlights_') ||
            k.startsWith('hymn_favorites_') ||
            k.startsWith('hymne_edit_') ||
            k.startsWith('pdf_bookmarks_') ||
            k.startsWith('pdf_notes_')
        );
        for (let key of markupKeys) {
            const data = await AsyncStorage.getItem(key);
            if (data) {
                try {
                    await saveBibleMarkup(key, JSON.parse(data));
                } catch(e) {
                    // If not JSON, save as string setting
                    await setSetting(key, data);
                }
            }
        }

        // 4. History
        const historyStr = await AsyncStorage.getItem('app_history');
        if (historyStr) {
            const history = JSON.parse(historyStr);
            for (let h of history) {
                await saveHistory(h);
            }
        }

        // 5. Cleanup
        const keysToRemove = [
            'app_global_settings', 'adventools_folders', 'adventools_notes', 
            'app_history', 'adventools_bibles_installed', 'profile_name', 'profile_image',
            'profile_eds_class', 'profile_departments', 'adventools_ss_selected_lang',
            'adventools_onboarding_done', 'audio_autoplay',
            ...markupKeys
        ];
        await AsyncStorage.multiRemove(keysToRemove);

        await AsyncStorage.setItem(migratedKey, 'true');
        console.log('--- Global Migration to SQLite COMPLETED ---');
    } catch (e) {
        console.error('Migration failed', e);
    }
}
