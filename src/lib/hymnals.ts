/**
 * Catalogue unifié des recueils de cantiques.
 *
 * Deux familles de sources, volontairement mélangées pour que la page ne soit
 * JAMAIS vide même hors-ligne ou quand GitHub est injoignable :
 *
 *  - `json`  : recueils embarqués dans le site (public/data/cantiques_*.json).
 *              Immédiats, disponibles hors-ligne, et les seuls à contenir les
 *              liens audio (playback) et les auteurs.
 *  - `db`    : recueils supplémentaires lus à la demande depuis la branche
 *              `data` d'adventools (fichiers SQLite, via sql.js + Cache API),
 *              exactement comme la Bible. Ils se mettent à jour tout seuls.
 *
 * L'ancienne implémentation (getCantiquesJson) lisait `hymnes/manifest.json`
 * en espérant des tableaux JSON : ce manifest liste en réalité des `.db`
 * SQLite et étiquette le français « Français » (et non « French »). Le fetch
 * distant échouait donc systématiquement et l'app retombait en silence sur les
 * JSON locaux — d'où l'impression de données manquantes ou figées.
 */

import initSqlJs from 'sql.js';

const RAW = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/hymnes';
// `import.meta.env` n'existe que sous Vite : lecture défensive pour que le
// module reste importable en dehors du bundler (tests, outils Node).
const BASE = ((import.meta as any).env?.BASE_URL ?? '/').replace(/\/?$/, '/');

export type SongLang = 'mg' | 'fr' | 'en';

export interface Song {
  /** Identifiant stable, unique tous recueils confondus : `<collection>-<num>` */
  id: string;
  num: number;
  title: string;
  content: string;
  lang: SongLang;
  /** Identifiant du recueil d'origine */
  collection: string;
  key?: string;
  author?: string;
  categories?: string;
  /** URL audio (playback) quand elle existe */
  playback?: string;
}

export interface Collection {
  id: string;
  /** Libellé affiché */
  name: string;
  lang: SongLang;
  /** `json` = embarqué (hors-ligne garanti), `db` = SQLite distant (à la demande) */
  kind: 'json' | 'db';
  /** Chemin relatif au site (json) ou URL absolue (db) */
  src: string;
  /** Nombre de cantiques, connu après chargement */
  count?: number;
}

/**
 * Recueils proposés. Les trois premiers sont embarqués (donc toujours là) ;
 * les suivants viennent de la branche `data` et ne sont téléchargés que si
 * l'utilisateur les ouvre.
 */
export const COLLECTIONS: Collection[] = [
  { id: 'adventista', name: 'Fihirana Adventista', lang: 'mg', kind: 'json', src: 'data/cantiques_mg.json' },
  { id: 'hymnes', name: 'Hymnes & Louanges', lang: 'fr', kind: 'json', src: 'data/cantiques_fr.json' },
  { id: 'sda', name: 'SDA Hymnal', lang: 'en', kind: 'json', src: 'data/cantiques_en.json' },
  { id: 'ffpm', name: 'Fihirana FFPM', lang: 'mg', kind: 'db', src: `${RAW}/fihirana_ffpm.db` },
  { id: 'fanampiny', name: 'Fihirana Fanampiny', lang: 'mg', kind: 'db', src: `${RAW}/fihirana_fanampiny.db` },
  { id: 'antema', name: 'Fihirana Antema', lang: 'mg', kind: 'db', src: `${RAW}/fihirana_antema.db` },
];

/** Recueils embarqués : ceux qu'on peut charger sans réseau. */
export const OFFLINE_COLLECTIONS = COLLECTIONS.filter((c) => c.kind === 'json');

export function collectionById(id: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.id === id);
}

// ── Cache mémoire (une seule lecture par recueil et par session) ────────────

const cache = new Map<string, Song[]>();
const inflight = new Map<string, Promise<Song[]>>();

/** Découpe des paroles en strophes (séparées par une ligne vide). */
export function splitStanzas(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Identifiant de fichier Google Drive contenu dans une URL, s'il y en a un. */
export function driveFileId(url?: string): string | null {
  if (!url) return null;
  if (!/drive\.google\.com|drive\.usercontent\.google\.com|docs\.google\.com/i.test(url)) return null;
  return url.match(/[?&]id=([A-Za-z0-9_-]+)/)?.[1] ?? url.match(/\/d\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
}

/**
 * URL de lecture directe pour un playback.
 *
 * ⚠️ Google Drive ne permet plus la lecture d'un fichier depuis un site tiers :
 * la réponse porte `Content-Disposition: attachment`, et Chrome la rejette via
 * l'Opaque Response Blocking (`ERR_BLOCKED_BY_ORB`) aussi bien pour un élément
 * `<audio>` que pour un `fetch`. `drive.google.com/uc` répond même 403.
 * Aucune variante d'URL n'y échappe : les fichiers doivent être ré-hébergés.
 * `playbackBlocked()` permet d'afficher un repli au lieu d'un lecteur muet.
 */
export function playbackSrc(url?: string): string {
  if (!url) return '';
  const id = driveFileId(url);
  return id ? `https://drive.usercontent.google.com/download?id=${id}&export=download` : url;
}

/** Vrai si la source ne peut pas être jouée en ligne (hébergeur bloquant). */
export function playbackBlocked(url?: string): boolean {
  return driveFileId(url) !== null;
}

/** Page Drive où le fichier reste écoutable. */
export function driveViewUrl(url?: string): string {
  const id = driveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/view` : (url ?? '');
}

// ── Source JSON (embarquée) ────────────────────────────────────────────────

interface RawJsonSong {
  id?: string | number;
  num?: number;
  title?: string;
  key?: string;
  author?: string;
  categories?: string;
  content?: string;
  playback?: string;
}

async function loadJsonCollection(col: Collection): Promise<Song[]> {
  const res = await fetch(`${BASE}${col.src}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = (await res.json()) as RawJsonSong[];
  if (!Array.isArray(rows)) throw new Error('format inattendu');
  return rows.map((r, i) => ({
    id: `${col.id}-${r.num ?? i + 1}`,
    num: Number(r.num ?? i + 1),
    title: String(r.title ?? '').trim(),
    content: String(r.content ?? ''),
    lang: col.lang,
    collection: col.id,
    key: r.key || undefined,
    author: r.author || undefined,
    categories: r.categories || undefined,
    playback: r.playback || undefined,
  }));
}

// ── Source SQLite distante (à la demande) ──────────────────────────────────

let sqlPromise: Promise<any> | null = null;
function initSql(): Promise<any> {
  return (sqlPromise ??= initSqlJs({ locateFile: () => `${BASE}sql-wasm.wasm` }));
}

/**
 * Télécharge un fichier de la branche `data` avec revalidation.
 *
 * L'ancienne version renvoyait la copie en cache sans jamais la vérifier :
 * une base mise à jour sur GitHub n'atteignait jamais les visiteurs. On
 * interroge maintenant le réseau avec `cache: 'no-cache'`, ce qui déclenche une
 * requête conditionnelle (`If-None-Match`) : quelques octets si rien n'a
 * changé, le fichier complet sinon. Le cache reste le secours hors-ligne.
 */
export async function fetchDataFile(url: string, cacheName: string): Promise<Uint8Array> {
  const store = typeof caches !== 'undefined' ? await caches.open(cacheName).catch(() => null) : null;

  try {
    const net = await fetch(url, { cache: 'no-cache' });
    if (!net.ok) throw new Error(`HTTP ${net.status}`);
    if (store) {
      try {
        await store.put(url, net.clone());
      } catch {
        /* quota dépassé : la réponse reste utilisable en mémoire */
      }
    }
    return new Uint8Array(await net.arrayBuffer());
  } catch (err) {
    const cached = await store?.match(url);
    if (cached) return new Uint8Array(await cached.arrayBuffer());
    throw err;
  }
}

function fetchDb(url: string): Promise<Uint8Array> {
  return fetchDataFile(url, 'ah-hymnal-db');
}

async function loadDbCollection(col: Collection): Promise<Song[]> {
  const [SQL, bytes] = await Promise.all([initSql(), fetchDb(col.src)]);
  const db = new SQL.Database(bytes);
  try {
    // Le schéma est identique dans les six recueils, à la casse près de
    // `c_author` / `C_author` : on ne sélectionne que les colonnes sûres.
    const stmt = db.prepare(
      'SELECT c_num, c_title, c_key, c_content, c_categories FROM adventiste_cantique ORDER BY c_num'
    );
    const out: Song[] = [];
    try {
      while (stmt.step()) {
        const r = stmt.getAsObject() as Record<string, any>;
        const num = Number(r.c_num) || out.length + 1;
        out.push({
          id: `${col.id}-${num}`,
          num,
          title: String(r.c_title ?? '').trim(),
          content: String(r.c_content ?? ''),
          lang: col.lang,
          collection: col.id,
          key: r.c_key || undefined,
          categories: r.c_categories || undefined,
        });
      }
    } finally {
      stmt.free();
    }
    return out;
  } finally {
    db.close();
  }
}

// ── API publique ───────────────────────────────────────────────────────────

/**
 * Charge un recueil (mémoïsé, dédupliqué entre appels concurrents).
 * Lève si la source est injoignable — les appelants qui veulent un affichage
 * dégradé passent par `loadCollectionsSafe`.
 */
export function loadCollection(id: string): Promise<Song[]> {
  const cached = cache.get(id);
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(id);
  if (pending) return pending;

  const col = collectionById(id);
  if (!col) return Promise.reject(new Error(`recueil inconnu : ${id}`));

  const p = (col.kind === 'json' ? loadJsonCollection(col) : loadDbCollection(col))
    .then((songs) => {
      col.count = songs.length;
      cache.set(id, songs);
      inflight.delete(id);
      return songs;
    })
    .catch((err) => {
      inflight.delete(id);
      throw err;
    });
  inflight.set(id, p);
  return p;
}

/**
 * Charge plusieurs recueils sans jamais échouer : les sources indisponibles
 * sont simplement absentes du résultat, et signalées via `failed`.
 */
export async function loadCollectionsSafe(
  ids: string[]
): Promise<{ songs: Song[]; failed: string[] }> {
  const results = await Promise.allSettled(ids.map((id) => loadCollection(id)));
  const songs: Song[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') songs.push(...r.value);
    else failed.push(ids[i]);
  });
  return { songs, failed };
}

/** Normalisation pour la recherche : sans accents, minuscules. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/**
 * Recherche par numéro ou par titre. Un numéro exact remonte en tête, ce qui
 * correspond à l'usage réel (« cantique 45 » pendant le culte).
 */
export function searchSongs(songs: Song[], query: string, limit = 60): Song[] {
  const q = normalize(query.trim());
  if (!q) return songs.slice(0, limit);
  const asNum = /^\d+$/.test(q) ? Number(q) : null;
  const scored: { s: Song; score: number }[] = [];
  for (const s of songs) {
    let score = -1;
    if (asNum !== null && s.num === asNum) score = 0;
    else if (asNum !== null && String(s.num).startsWith(q)) score = 1;
    else {
      const title = normalize(s.title);
      if (title.startsWith(q)) score = 2;
      else if (title.includes(q)) score = 3;
      else if (normalize(s.content).includes(q)) score = 4;
    }
    if (score >= 0) scored.push({ s, score });
  }
  scored.sort((a, b) => a.score - b.score || a.s.num - b.s.num);
  return scored.slice(0, limit).map((x) => x.s);
}

export function findSongById(songs: Song[], id: string): Song | undefined {
  return songs.find((s) => s.id === id);
}
