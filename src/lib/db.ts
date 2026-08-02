import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Category, MediaItem, MediaType, Settings, Verse } from './types';
import { parseTags, parseLessons } from './utils.ts';

// --- Chemins -------------------------------------------------------------
const ROOT = process.cwd();
// ANDEAHA_DATA_DIR permet de personnaliser l'emplacement de la base
// (sinon : <dossier d'exécution>/data)
const DATA_DIR = process.env.ANDEAHA_DATA_DIR
  ? path.resolve(process.env.ANDEAHA_DATA_DIR)
  : path.join(ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'andeaha.db');
const SEED_PATH = path.join(ROOT, 'data', 'content.json');

// --- Connexion (lazy) ------------------------------------------------------
let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  return _db;
}

export function dbPath() {
  return DB_PATH;
}

// --- Schéma ----------------------------------------------------------------
export function ensureSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name_fr TEXT NOT NULL,
      name_mg TEXT NOT NULL,
      icon TEXT DEFAULT 'book',
      color TEXT DEFAULT 'indigo'
    );
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      title_fr TEXT NOT NULL,
      title_mg TEXT NOT NULL,
      description_fr TEXT DEFAULT '',
      description_mg TEXT DEFAULT '',
      content_fr TEXT DEFAULT '',
      content_mg TEXT DEFAULT '',
      speaker TEXT DEFAULT '',
      image TEXT DEFAULT '',
      video_url TEXT DEFAULT '',
      audio_url TEXT DEFAULT '',
      duration TEXT DEFAULT '',
      date TEXT DEFAULT '',
      category_id INTEGER,
      tags TEXT DEFAULT '[]',
      featured INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      lessons TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text_fr TEXT NOT NULL,
      text_mg TEXT NOT NULL,
      reference TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Migration : colonnes content_* (articles) sur les bases existantes
  const cols = db.prepare("PRAGMA table_info(media)").all() as { name: string }[];
  const names = cols.map((c) => c.name);
  if (!names.includes('content_fr')) {
    db.exec("ALTER TABLE media ADD COLUMN content_fr TEXT DEFAULT ''");
  }
  if (!names.includes('content_mg')) {
    db.exec("ALTER TABLE media ADD COLUMN content_mg TEXT DEFAULT ''");
  }
}

// --- Seed ------------------------------------------------------------------
export function ensureDatabase() {
  const db = getDb();
  ensureSchema(db);
  const count = (db.prepare('SELECT COUNT(*) AS c FROM media').get() as { c: number }).c;
  if (count === 0 && fs.existsSync(SEED_PATH)) {
    seedFromJson(db);
  }
  // Mot de passe admin par défaut si absent
  const pw = db.prepare("SELECT value FROM settings WHERE key='admin_password'").get();
  if (!pw) {
    const hash = crypto.createHash('sha256').update('andeaha2026').digest('hex');
    db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_password', ?)").run(hash);
  }
}

interface SeedMedia {
  type: MediaType;
  slug: string;
  title_fr: string;
  title_mg: string;
  description_fr?: string;
  description_mg?: string;
  speaker?: string;
  image?: string;
  video_url?: string;
  audio_url?: string;
  duration?: string;
  date?: string;
  category?: string;
  tags?: string[];
  featured?: boolean;
  views?: number;
  lessons?: { title_fr: string; title_mg: string; video_url?: string; audio_url?: string; duration?: string }[];
  content_fr?: string;
  content_mg?: string;
}

export function seedFromJson(db: Database.Database) {
  const raw = fs.readFileSync(SEED_PATH, 'utf-8');
  const data = JSON.parse(raw);

  const insertCat = db.prepare(
    'INSERT OR REPLACE INTO categories (id, slug, name_fr, name_mg, icon, color) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertMedia = db.prepare(
    `INSERT INTO media (type, slug, title_fr, title_mg, description_fr, description_mg, content_fr, content_mg, speaker, image,
       video_url, audio_url, duration, date, category_id, tags, featured, views, lessons)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertVerse = db.prepare(
    'INSERT OR REPLACE INTO verses (id, text_fr, text_mg, reference) VALUES (?, ?, ?, ?)'
  );

  const catIds: Record<string, number> = {};
  (data.categories as { id: number; slug: string; name_fr: string; name_mg: string; icon: string; color: string }[]).forEach(
    (c) => {
      insertCat.run(c.id, c.slug, c.name_fr, c.name_mg, c.icon, c.color);
      catIds[c.slug] = c.id;
    }
  );

  const tx = db.transaction(() => {
    (data.media as SeedMedia[]).forEach((m) => {
      const catId = m.category ? catIds[m.category] ?? null : null;
      insertMedia.run(
        m.type,
        m.slug,
        m.title_fr,
        m.title_mg,
        m.description_fr ?? '',
        m.description_mg ?? '',
        m.content_fr ?? '',
        m.content_mg ?? '',
        m.speaker ?? '',
        m.image ?? '',
        m.video_url ?? '',
        m.audio_url ?? '',
        m.duration ?? '',
        m.date ?? '',
        catId,
        JSON.stringify(m.tags ?? []),
        m.featured ? 1 : 0,
        m.views ?? 0,
        JSON.stringify(m.lessons ?? [])
      );
    });
    (data.verses as Verse[]).forEach((v) => {
      insertVerse.run(v.id, v.text_fr, v.text_mg, v.reference);
    });
    // Verset du jour = index du jour de l'année
    const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('verse_index', ?)"
    ).run(String(day % (data.verses as Verse[]).length));
  });
  tx();
}

// --- Requêtes ----------------------------------------------------------------
function mapRow(row: any): MediaItem {
  return {
    ...row,
    tags: parseTags(row.tags),
    lessons: parseLessons(row.lessons),
    featured: !!row.featured,
    category_id: row.category_id ?? null,
  };
}

export function getCategories(): Category[] {
  ensureDatabase();
  return getDb().prepare('SELECT * FROM categories ORDER BY id').all() as Category[];
}

export function getMedia(opts: { type?: MediaType; limit?: number; featured?: boolean; category?: string } = {}): MediaItem[] {
  ensureDatabase();
  const clauses: string[] = [];
  const params: any[] = [];
  if (opts.type) {
    clauses.push('m.type = ?');
    params.push(opts.type);
  }
  if (opts.featured) {
    clauses.push('m.featured = 1');
  }
  if (opts.category) {
    clauses.push('c.slug = ?');
    params.push(opts.category);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = getDb()
    .prepare(
      `SELECT m.*, c.slug AS cat_slug, c.name_fr AS cat_name_fr, c.name_mg AS cat_name_mg, c.icon AS cat_icon, c.color AS cat_color
       FROM media m LEFT JOIN categories c ON c.id = m.category_id
       ${where} ORDER BY m.featured DESC, m.date DESC, m.id DESC LIMIT ?`
    )
    .all(...params, opts.limit ?? 100) as any[];
  return rows.map((r) => {
    const m = mapRow(r);
    if (r.cat_slug) {
      m.category = {
        id: r.category_id,
        slug: r.cat_slug,
        name_fr: r.cat_name_fr,
        name_mg: r.cat_name_mg,
        icon: r.cat_icon,
        color: r.cat_color,
      };
    }
    return m;
  });
}

export function getMediaBySlug(slug: string): MediaItem | null {
  ensureDatabase();
  const row = getDb()
    .prepare(
      `SELECT m.*, c.slug AS cat_slug, c.name_fr AS cat_name_fr, c.name_mg AS cat_name_mg, c.icon AS cat_icon, c.color AS cat_color
       FROM media m LEFT JOIN categories c ON c.id = m.category_id WHERE m.slug = ?`
    )
    .get(slug) as any;
  if (!row) return null;
  const m = mapRow(row);
  if (row.cat_slug) {
    m.category = {
      id: row.category_id,
      slug: row.cat_slug,
      name_fr: row.cat_name_fr,
      name_mg: row.cat_name_mg,
      icon: row.cat_icon,
      color: row.cat_color,
    };
  }
  return m;
}

export function getMediaById(id: number): MediaItem | null {
  ensureDatabase();
  const row = getDb().prepare('SELECT * FROM media WHERE id = ?').get(id) as any;
  return row ? mapRow(row) : null;
}

export function incrementViews(id: number) {
  ensureDatabase();
  getDb().prepare('UPDATE media SET views = views + 1 WHERE id = ?').run(id);
}

export function relatedMedia(item: MediaItem, limit = 4): MediaItem[] {
  const tags = item.tags ?? [];
  const list = getMedia({ limit: 200 }).filter((m) => m.id !== item.id);
  const score = (m: MediaItem) => {
    let s = 0;
    if (m.type === item.type) s += 3;
    if (m.category_id && item.category_id && m.category_id === item.category_id) s += 2;
    for (const t of tags) if ((m.tags ?? []).includes(t)) s += 2;
    return s;
  };
  return list.sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export function searchMedia(q: string, type?: MediaType): MediaItem[] {
  ensureDatabase();
  const like = `%${q}%`;
  const params: any[] = [like, like, like, like, like];
  let typeSql = '';
  if (type) {
    typeSql = ' AND m.type = ?';
    params.push(type);
  }
  const rows = getDb()
    .prepare(
      `SELECT m.* FROM media m
       WHERE (m.title_fr LIKE ? OR m.title_mg LIKE ? OR m.description_fr LIKE ? OR m.description_mg LIKE ? OR m.speaker LIKE ? OR m.content_fr LIKE ? OR m.content_mg LIKE ?)
       ${typeSql} ORDER BY m.featured DESC, m.date DESC LIMIT 50`
    )
    .all(...params, like, like) as any[];
  return rows.map(mapRow);
}

export function getVerseOfDay(): Verse {
  ensureDatabase();
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key='verse_index'").get() as { value?: string } | undefined;
  const idx = Number(row?.value ?? 0);
  const verses = db.prepare('SELECT * FROM verses ORDER BY id').all() as Verse[];
  if (!verses.length) return { id: 0, text_fr: '', text_mg: '', reference: '' };
  return verses[((idx % verses.length) + verses.length) % verses.length];
}

export function getSettings(): Settings {
  ensureDatabase();
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const s: Record<string, string> = {};
  rows.forEach((r) => (s[r.key] = r.value));
  return s as Settings;
}

export function stats() {
  ensureDatabase();
  const db = getDb();
  const c = (t: MediaType) =>
    (db.prepare('SELECT COUNT(*) AS c FROM media WHERE type = ?').get(t) as { c: number }).c;
  return {
    sermons: c('sermon'),
    courses: c('course'),
    audio: c('audio'),
    seminars: c('seminar'),
    conferences: c('conference'),
    articles: c('article'),
    total: (db.prepare('SELECT COUNT(*) AS c FROM media').get() as { c: number }).c,
  };
}

// --- CRUD (admin) -------------------------------------------------------------
export function createMedia(data: Partial<MediaItem> & { title_fr: string; type: MediaType }): MediaItem {
  ensureDatabase();
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO media (type, slug, title_fr, title_mg, description_fr, description_mg, content_fr, content_mg, speaker, image,
        video_url, audio_url, duration, date, category_id, tags, featured, lessons)
       VALUES (@type, @slug, @title_fr, @title_mg, @description_fr, @description_mg, @content_fr, @content_mg, @speaker, @image,
        @video_url, @audio_url, @duration, @date, @category_id, @tags, @featured, @lessons)`
    )
    .run({
      type: data.type,
      slug: data.slug,
      title_fr: data.title_fr,
      title_mg: data.title_mg ?? data.title_fr,
      description_fr: data.description_fr ?? '',
      description_mg: data.description_mg ?? '',
      content_fr: data.content_fr ?? '',
      content_mg: data.content_mg ?? '',
      speaker: data.speaker ?? '',
      image: data.image ?? '',
      video_url: data.video_url ?? '',
      audio_url: data.audio_url ?? '',
      duration: data.duration ?? '',
      date: data.date ?? '',
      category_id: data.category_id ?? null,
      tags: JSON.stringify(data.tags ?? []),
      featured: data.featured ? 1 : 0,
      lessons: JSON.stringify(data.lessons ?? []),
    });
  return getMediaById(Number(info.lastInsertRowid))!;
}

export function updateMedia(id: number, data: Partial<MediaItem>): boolean {
  ensureDatabase();
  const db = getDb();
  const existing = getMediaById(id);
  if (!existing) return false;
  const merged = { ...existing, ...data, tags: data.tags ?? existing.tags, lessons: data.lessons ?? existing.lessons };
  db.prepare(
    `UPDATE media SET type=@type, slug=@slug, title_fr=@title_fr, title_mg=@title_mg, description_fr=@description_fr,
      description_mg=@description_mg, content_fr=@content_fr, content_mg=@content_mg, speaker=@speaker, image=@image,
      video_url=@video_url, audio_url=@audio_url, duration=@duration, date=@date, category_id=@category_id,
      tags=@tags, featured=@featured, lessons=@lessons
     WHERE id=@id`
  ).run({
    id,
    type: merged.type,
    slug: merged.slug,
    title_fr: merged.title_fr,
    title_mg: merged.title_mg,
    description_fr: merged.description_fr ?? '',
    description_mg: merged.description_mg ?? '',
    content_fr: data.content_fr ?? existing.content_fr ?? '',
    content_mg: data.content_mg ?? existing.content_mg ?? '',
    speaker: merged.speaker ?? '',
    image: merged.image ?? '',
    video_url: merged.video_url ?? '',
    audio_url: merged.audio_url ?? '',
    duration: merged.duration ?? '',
    date: merged.date ?? '',
    category_id: merged.category_id ?? null,
    tags: JSON.stringify(merged.tags),
    featured: merged.featured ? 1 : 0,
    lessons: JSON.stringify(merged.lessons),
  });
  return true;
}

export function deleteMedia(id: number): boolean {
  ensureDatabase();
  const info = getDb().prepare('DELETE FROM media WHERE id = ?').run(id);
  return info.changes > 0;
}

export function uniqueSlug(base: string): string {
  ensureDatabase();
  const db = getDb();
  let slug = base;
  let i = 2;
  while (db.prepare('SELECT 1 FROM media WHERE slug = ?').get(slug)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}
