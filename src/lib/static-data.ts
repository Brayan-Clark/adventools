/**
 * Méditations quotidiennes (mofonaina) chargées depuis la branche `data`
 * d'adventools, avec cache localStorage (TTL 24 h) et repli sur le JSON
 * embarqué dans le site pour le hors-ligne.
 *
 * Les cantiques ne passent plus par ici : ils ont leur propre module
 * (`hymnals.ts`), car leurs sources sont des bases SQLite et non des JSON.
 */

const RAW = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data';
// `import.meta.env` n'existe que sous Vite : lecture défensive.
const BASE = ((import.meta as any).env?.BASE_URL ?? '/').replace(/\/?$/, '/');
// 1 heure : la revalidation conditionnelle rend le rafraîchissement bon marché,
// un TTL de 24 h retardait d'une journée toute correction publiée sur `data`.
const CACHE_TTL = 1000 * 60 * 60;
const CACHE_KEY = 'mofonaina-v3';

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
    /* quota dépassé — le cache est un confort, pas une obligation */
  }
}

/** Purge le cache des données de référence (bouton « vider le cache »). */
export function clearStaticCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('mofonaina') || k?.startsWith('cantiques-') || k?.startsWith('docs-manifest')) {
        keys.push(k);
      }
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface MofonainaDayJson {
  date: string;
  titre_du_jour: string;
  verset_texte: string;
  verset_reference: string;
  contenu?: string;
  content?: string;
  source?: string;
}

interface MofonainaFile {
  trimestre?: { annee?: number; numero_trimestre?: number; titre_principal?: string };
  meditations?: MofonainaDayJson[];
}

/** Nom de fichier `YYYY-QN` d'un trimestre, décalé de `offset` trimestres. */
function quarterFile(date: Date, offset = 0): string {
  const q = Math.floor(date.getMonth() / 3) + offset;
  const y = date.getFullYear() + Math.floor(q / 4);
  const qq = ((q % 4) + 4) % 4;
  return `${y}-Q${qq + 1}`;
}

/**
 * Méditations du trimestre courant. Si le fichier du trimestre n'est pas
 * (encore) publié sur la branche `data`, on essaie le trimestre précédent
 * avant de retomber sur le JSON embarqué : sans ce repli, la page devenait
 * vide au changement de trimestre.
 */
export async function getMofonainaJson(): Promise<MofonainaDayJson[]> {
  const cached = getCache<MofonainaDayJson[]>(CACHE_KEY);
  if (Array.isArray(cached) && cached.length) return cached;

  const now = new Date();
  for (const offset of [0, -1]) {
    const file = await fetchJson<MofonainaFile>(`${RAW}/mofonaina/${quarterFile(now, offset)}.json`);
    if (file && Array.isArray(file.meditations) && file.meditations.length) {
      setCache(CACHE_KEY, file.meditations);
      return file.meditations;
    }
  }

  const local = await fetchJson<MofonainaFile>(`${BASE}data/mofonaina.json`);
  if (local && Array.isArray(local.meditations)) return local.meditations;
  return [];
}

/** Date du jour au format `YYYY-MM-DD`, en heure locale. */
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Méditation d'une date donnée (par défaut celle du jour). Si la date exacte
 * est absente, on renvoie la méditation la plus proche dans le passé plutôt
 * que la toute première du trimestre, qui pouvait être vieille de trois mois.
 */
export async function getMeditationForDateJson(date?: string): Promise<MofonainaDayJson | null> {
  const meds = await getMofonainaJson();
  if (!meds.length) return null;

  const target = date ?? todayIso();
  const exact = meds.find((m) => m.date === target);
  if (exact) return exact;

  const past = meds.filter((m) => m.date <= target).sort((a, b) => (a.date < b.date ? 1 : -1));
  return past[0] ?? meds[0] ?? null;
}

/**
 * URL de lecture directe pour un lien audio.
 * Les liens Google Drive « uc?export=download » renvoient une page
 * d'avertissement ; `drive.usercontent.google.com` sert le flux directement.
 */
export function playbackSrc(url?: string): string {
  if (!url) return '';
  const m = url.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (m && /drive\.google\.com|drive\.usercontent\.google\.com|docs\.google\.com/i.test(url)) {
    return `https://drive.usercontent.google.com/download?id=${m[1]}&export=download`;
  }
  return url;
}
