import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Sabbath School helpers shared by the lesson screen and the settings/profile screens.
 *
 * The list of lesson categories (EDS classes) is NOT hardcoded anymore: it is read
 * from the same API that serves the quarterlies, so the filter at the top of the
 * lesson screen and the "Classe EDS" setting always reference existing categories.
 */

const CATEGORY_CACHE_PREFIX = 'adventools_ss_categories_';

export const getSsApiBase = (lang: string) => `https://inverse.sspmadventist.org/api/v3/${lang}/ss`;
export const getSsAbsgBase = (lang: string) => `https://absg.sspmadventist.org/api/v3/${lang}/ss`;

export const getSsIndexUrl = (lang: string) => {
  const base = lang === 'en' ? getSsAbsgBase(lang) : getSsApiBase(lang);
  return `${base}/index.json`;
};

export const getSsCategoryCacheKey = (lang: string) => `${CATEGORY_CACHE_PREFIX}${lang}`;

/** Local fallback used before the API has ever answered (offline first launch). */
export const DEFAULT_SS_CATEGORIES: Record<string, string[]> = {
  mg: ['Lesona Lehibe', 'Lesona Tanora Zokiny'],
  fr: ['Classe des Adultes', 'InVerse', 'Division Interaméricaine'],
  en: [
    'Standard Adult',
    'InVerse',
    'Easy Reading',
    'Mission Quarterly',
    'Mission Spotlight',
    'Cornerstone Connections',
    'Real Time Faith',
    'Junior PowerPoints',
    'Primary',
    'Kindergarten',
    'Beginner',
    'Babies',
  ],
};

export const normalizeSsLabel = (value: string): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/**
 * Compares a saved (possibly legacy) value with a category coming from the API.
 * Exact matches win; a legacy label may also append an age range such as
 * "Lesona Lehibe (+ 35 taona)" while the API exposes only "Lesona Lehibe".
 */
export const categoryMatches = (value: string, category: string): boolean => {
  if (!value || !category) return false;
  const a = normalizeSsLabel(value);
  const b = normalizeSsLabel(category);
  if (!a || !b) return false;
  if (a === b) return true;
  // Only accept a prefix relationship so "Lesona Lehibe" never swallows
  // unrelated categories that merely share a word.
  return a.startsWith(`${b} `) || b.startsWith(`${a} `);
};

/** Returns the real category title matching a saved value, or '' when none match. */
export const resolveSsCategory = (value: string, categories: string[]): string => {
  if (!value || !categories?.length) return '';
  const exact = categories.find((cat) => normalizeSsLabel(cat) === normalizeSsLabel(value));
  if (exact) return exact;
  return categories.find((cat) => categoryMatches(value, cat)) || '';
};

export const getDefaultSsCategories = (lang: string): string[] =>
  DEFAULT_SS_CATEGORIES[lang] || DEFAULT_SS_CATEGORIES.mg;

export const readCachedSsCategories = async (lang: string): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(getSsCategoryCacheKey(lang));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.categories)) {
      return parsed.categories.filter((c: any) => typeof c === 'string' && c.trim() !== '');
    }
    if (Array.isArray(parsed)) {
      return parsed.filter((c: any) => typeof c === 'string' && c.trim() !== '');
    }
    return [];
  } catch {
    return [];
  }
};

export const writeCachedSsCategories = async (lang: string, categories: string[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      getSsCategoryCacheKey(lang),
      JSON.stringify({ categories, updatedAt: new Date().toISOString() })
    );
  } catch {
    // Cache failures must never break the UI.
  }
};

/** Fetches the category titles from the API index (groups). */
export const fetchSsCategories = async (lang: string): Promise<string[]> => {
  const res = await fetch(`${getSsIndexUrl(lang)}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`Sabbath School index HTTP ${res.status}`);
  const data = await res.json();
  const categories: string[] = [];
  for (const group of data?.groups || []) {
    const title = typeof group?.title === 'string' ? group.title.trim() : '';
    if (title && !categories.includes(title)) categories.push(title);
  }
  return categories;
};

/**
 * Returns the categories for a language. Cached values are served immediately,
 * then refreshed when `refresh` is true or when nothing was cached yet.
 */
export const getSsCategories = async (
  lang: string,
  options: { refresh?: boolean } = {}
): Promise<string[]> => {
  let categories = await readCachedSsCategories(lang);

  if (options.refresh || categories.length === 0) {
    try {
      const fresh = await fetchSsCategories(lang);
      if (fresh.length > 0) {
        categories = fresh;
        await writeCachedSsCategories(lang, fresh);
      }
    } catch {
      // Offline: keep cache, or fall back to the known labels.
    }
  }

  return categories.length > 0 ? categories : getDefaultSsCategories(lang);
};
