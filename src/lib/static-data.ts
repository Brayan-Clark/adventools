/**
 * Chargement de données statiques depuis des JSON servis en statique
 * (cantiques, mofonaina), avec cache localStorage pour l'offline.
 *
 * Pattern : localStorage → fetch → cache → retour.
 * Pas de dépendance Supabase pour ces données.
 */

const BASE = import.meta.env.BASE_URL ?? '/';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 heures

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

/**
 * Récupère un JSON avec cache localStorage + fetch avec fallback.
 * @param cacheKey Clé localStorage
 * @param url URL du fichier JSON (relatif au site ou absolu)
 */
export async function fetchWithCache<T>(cacheKey: string, url: string): Promise<T | null> {
  // 1. Cache
  const cached = getCache<T>(cacheKey);
  if (cached) return cached;

  // 2. Fetch (relatif au base path)
  const fullUrl = url.startsWith('http') ? url : `${BASE.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  try {
    const res = await fetch(fullUrl);
    if (!res.ok) return null;
    const data: T = await res.json();
    setCache(cacheKey, data);
    return data;
  } catch {
    return null;
  }
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
  lang?: string;
}

// ── Types mofonaina ──

export interface MofonainaDayJson {
  date: string;
  titre_du_jour: string;
  verset_texte: string;
  verset_reference: string;
  contenu?: string;
  content?: string;
  source?: string;
}

// ── Fetch cantiques ──

const CANTIQUE_FILES: Record<string, string> = {
  mg: 'cantiques_mg.json',
  fr: 'cantiques_fr.json',
  en: 'cantiques_en.json',
};

export async function getCantiquesJson(lang: 'mg' | 'fr' | 'en' = 'mg'): Promise<CantiqueJson[]> {
  const file = CANTIQUE_FILES[lang] ?? CANTIQUE_FILES.mg;
  const data = await fetchWithCache<CantiqueJson[]>(`cantiques-${lang}`, `data/${file}`);
  return data ?? [];
}

export async function getCantiqueByIdJson(id: string): Promise<CantiqueJson | null> {
  // Cherche dans toutes les langues
  for (const lang of ['mg', 'fr', 'en'] as const) {
    const list = await getCantiquesJson(lang);
    const found = list.find((c) => c.id === id);
    if (found) return found;
  }
  return null;
}

// ── Fetch mofonaina ──

export async function getMofonainaJson(): Promise<MofonainaDayJson[]> {
  const data = await fetchWithCache<MofonainaDayJson[]>('mofonaina', 'data/mofonaina.json');
  return data ?? [];
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
