/**
 * Chargement des données de référence (cantiques, mofonaina) DIRECTEMENT depuis
 * la branche `data` du dépôt adventools (URLs raw GitHub), avec :
 *   - cache localStorage pour l'offline (TTL 24h)
 *   - fallback sur les JSON locaux public/data/ si le réseau échoue
 *
 * Avantage : quand la branche `data` d'adventools est mise à jour, l'app est
 * à jour automatiquement (même principe que la bible via sql.js).
 *
 * ⚠️ Les clés de cache sont versionnées (v2) : toute ancienne entrée au format
 * incorrect (stockée par une ancienne version du code) est automatiquement
 * ignorée, et on re-fetch à la place.
 */

const RAW = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data';
const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 heures
const CACHE_VER = 'v2';

interface CacheEntry<T> {
  data: T;
  ts: number;
}

function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    /* quota exceeded — silent */
  }
}

/** Purge toutes les entrées de cache de données statiques. */
export function clearStaticCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('cantiques-') || k?.startsWith('mofonaina')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Récupère un JSON local avec cache localStorage.
 * @param cacheKey Clé localStorage
 * @param url Chemin relatif au site
 */
export async function fetchWithCache<T>(cacheKey: string, url: string): Promise<T | null> {
  const cached = getCache<T>(cacheKey);
  if (cached) return cached;

  const fullUrl = url.startsWith('http') ? url : `${BASE.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  const data = await fetchJson<T>(fullUrl);
  if (data) setCache(cacheKey, data);
  return data;
}

// ── Types cantiques ──

export interface CantiqueJson {
  id: string;
  num: number;
  title: string;
  key?: string;
  author?: string;
  categories?: string;
  content?: string;
  playback?: string;
  source?: string;
}

interface HymneVersion {
  id: string;
  name: string;
  language: string;
  url: string;
}

interface HymneManifest {
  versions: HymneVersion[];
}

const LANG_MAP: Record<string, 'mg' | 'fr' | 'en'> = {
  Malagasy: 'mg',
  French: 'fr',
  English: 'en',
};

// ── Fetch cantiques (depuis la branche data, fallback local) ──

export async function getCantiquesJson(lang: 'mg' | 'fr' | 'en' = 'mg'): Promise<CantiqueJson[]> {
  const cacheKey = `cantiques-${lang}-${CACHE_VER}`;

  // 1. Cache localStorage (validé : doit être un array, sinon re-fetch)
  const cached = getCache<CantiqueJson[]>(cacheKey);
  if (Array.isArray(cached)) return cached;

  // 2. Branche data (auto-update)
  const manifest = await fetchJson<HymneManifest>(`${RAW}/hymnes/manifest.json`);
  if (manifest?.versions) {
    const version = manifest.versions.find((v) => LANG_MAP[v.language] === lang);
    if (version?.url) {
      const data = await fetchJson<CantiqueJson[]>(version.url);
      if (data && Array.isArray(data)) {
        setCache(cacheKey, data);
        return data;
      }
    }
  }

  // 3. Fallback local (offline)
  return (await fetchWithCache<CantiqueJson[]>(cacheKey, `data/cantiques_${lang}.json`)) ?? [];
}

export async function getCantiqueByIdJson(id: string): Promise<CantiqueJson | null> {
  for (const lang of ['mg', 'fr', 'en'] as const) {
    const list = await getCantiquesJson(lang);
    const found = list.find((c) => c.id === id);
    if (found) return found;
  }
  return null;
}

// ── Fetch mofonaina (depuis la branche data, fallback local) ──

export interface MofonainaDayJson {
  date: string;
  titre_du_jour: string;
  verset_texte: string;
  verset_reference: string;
  contenu?: string;
  content?: string;
  source?: string;
}

function quarterOf(date: Date): string {
  const y = date.getFullYear();
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

export async function getMofonainaJson(): Promise<MofonainaDayJson[]> {
  const cacheKey = `mofonaina-${CACHE_VER}`;

  // 1. Cache localStorage (validé : doit être un array, sinon re-fetch)
  const cached = getCache<MofonainaDayJson[]>(cacheKey);
  if (Array.isArray(cached)) return cached;

  // 2. Branche data (auto-update) — fichier du trimestre courant
  const file = `${quarterOf(new Date())}.json`;
  const raw = await fetchJson<{ meditations?: MofonainaDayJson[] }>(`${RAW}/mofonaina/${file}`);
  if (raw && Array.isArray(raw.meditations)) {
    setCache(cacheKey, raw.meditations);
    return raw.meditations;
  }

  // 3. Fallback local (offline)
  const local = await fetchWithCache<{ meditations?: MofonainaDayJson[] }>(cacheKey, 'data/mofonaina.json');
  if (local && Array.isArray(local.meditations)) {
    return local.meditations;
  }
  return [];
}

export async function getMeditationForDateJson(date?: string): Promise<MofonainaDayJson | null> {
  const meds = await getMofonainaJson();
  if (!meds.length) return null;
  if (date) {
    const found = meds.find((m) => m.date === date);
    if (found) return found;
  }
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const t = meds.find((m) => m.date === iso);
  return t ?? meds[0] ?? null;
}

// ── Playback src Google Drive ──

export function playbackSrc(url?: string): string {
  if (!url) return '';
  const m = url.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (m && /drive\.google\.com|drive\.usercontent\.google\.com|docs\.google\.com/i.test(url)) {
    return `https://drive.usercontent.google.com/download?id=${m[1]}&export=download`;
  }
  return url;
}
