import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeSsLabel } from './sabbath-school';

/**
 * Sabbath School languages shared by the lesson, audio and video screens.
 *
 * The list is NOT hardcoded to mg/fr/en anymore: it is read from the same
 * upstream API that serves the quarterlies, so a language added upstream shows
 * up in the pickers without shipping a new build.
 */

const LANGUAGE_CACHE_KEY = 'adventools_ss_languages';

/** Languages index. The two sspmadventist hosts mirror the exact same payload. */
export const SS_LANGUAGES_URL = 'https://sabbath-school.adventech.io/api/v2/languages/index.json';

export interface SsLanguage {
  code: string;
  /** Name as served by the API (English). */
  name: string;
  /** Endonym when known, otherwise `name`. */
  label: string;
  flag: string;
}

/** Shown first in every picker: the languages the app itself is translated in. */
export const PINNED_SS_LANGUAGE_CODES = ['mg', 'fr', 'en'];

/**
 * Endonyms, so a reader looking for their own language recognises it. Taken
 * from the upstream Sabbath School web app; codes missing here simply fall
 * back to the English name returned by the API.
 */
export const SS_LANGUAGE_NATIVE_NAMES: Record<string, string> = {
  af: 'Afrikaans',
  am: 'አማርኛ',
  ar: 'عربى',
  as: 'অসমীয়া',
  az: 'Azərbaycan',
  bbc: 'Batak Toba',
  bg: 'Български',
  bn: 'বাংলা',
  ca: 'Català',
  ceb: 'Sinugboanon',
  cfm: 'Lai ṭong',
  cs: 'Český',
  ctd: 'Tedim Chin',
  da: 'Dansk',
  de: 'Deutsch',
  el: 'Ελληνικά',
  en: 'English',
  es: 'Español',
  et: 'Eesti Keel',
  fa: 'فارسی',
  fi: 'Suomen kieli',
  fj: 'Viti',
  fr: 'Français',
  grt: 'Garo',
  gu: 'ગુજરાતી',
  he: 'עִברִית',
  hi: 'हिन्दी',
  hil: 'Hiligaynon',
  hmn: 'Lus Hmoob',
  hr: 'Hrvatski',
  ht: 'Kreyòl ayisyen',
  hu: 'Magyar',
  hy: 'Հայերեն',
  iba: 'Jaku Iban',
  ilo: 'Ilokano',
  in: 'Bahasa Indonesia',
  is: 'Íslenska',
  it: 'Italiano',
  ja: '日本語',
  ka: 'ქართული ენა',
  kar: 'ကညီကျိာ်',
  kha: 'Khasi',
  kin: 'Ikinyarwanda',
  kjp: 'အရှေ့ပိုးကရင်',
  km: 'ខ្មែរ',
  kn: 'ಕನ್ನಡ',
  ko: '한국어',
  ky: 'Кыргыз',
  kz: 'Қазақша',
  lo: 'ລາວ',
  lt: 'Lietuviškai',
  lus: 'Mizo ṭawng',
  lv: 'Latviešu valoda',
  mg: 'Malagasy',
  mk: 'Македонски',
  ml: 'മലയാളം',
  mn: 'Монгол хэл',
  mr: 'मराठी',
  ms: 'Bahasa Malaysia',
  my: 'မြန်မာဘာသာ',
  ne: 'नेपाली',
  nl: 'Nederlandse taal',
  no: 'Norsk',
  om: 'Afaan Oromoo',
  or: 'ଓଡ଼ିଆ',
  pap: 'Papiamentu',
  pl: 'Polski',
  pt: 'Português',
  ro: 'Română',
  ru: 'Русский',
  run: 'Ikirundi',
  si: 'සිංහල',
  sk: 'Slovenčina',
  sl: 'Slovenščina',
  sn: 'ChiShona',
  sq: 'Shqiptar',
  sr: 'Srpski',
  st: 'Sesotho',
  sv: 'Svenska',
  sw: 'Kiswahili',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  tg: 'Тоҷикӣ',
  th: 'ไทย',
  ti: 'ትግርኛ',
  tl: 'Tagalog',
  tr: 'Türk',
  trp: 'Kokborok',
  tw: 'Twi',
  uk: 'Українська',
  uz: 'Ўзбекча',
  vi: 'Việt',
  xh: 'IsiXhosa',
  zh: '中文',
  zu: 'IsiZulu',
};

/**
 * Flags for the languages that map to a single obvious country. Most of the 95
 * codes do not (Swahili, Arabic, Spanish...), so they get a code badge instead
 * and this map stays deliberately short.
 */
export const SS_LANGUAGE_FLAGS: Record<string, string> = {
  mg: '🇲🇬',
  fr: '🇫🇷',
  en: '🇬🇧',
  pt: '🇵🇹',
  de: '🇩🇪',
  it: '🇮🇹',
  ru: '🇷🇺',
  uk: '🇺🇦',
  pl: '🇵🇱',
  ro: '🇷🇴',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳',
  th: '🇹🇭',
  vi: '🇻🇳',
  in: '🇮🇩',
  ms: '🇲🇾',
  tl: '🇵🇭',
  tr: '🇹🇷',
  gr: '🇬🇷',
  el: '🇬🇷',
  he: '🇮🇱',
  hu: '🇭🇺',
  cs: '🇨🇿',
  sk: '🇸🇰',
  hr: '🇭🇷',
  sr: '🇷🇸',
  bg: '🇧🇬',
  da: '🇩🇰',
  sv: '🇸🇪',
  no: '🇳🇴',
  fi: '🇫🇮',
  is: '🇮🇸',
  nl: '🇳🇱',
  et: '🇪🇪',
  lv: '🇱🇻',
  lt: '🇱🇹',
  sq: '🇦🇱',
  mk: '🇲🇰',
  sl: '🇸🇮',
  hy: '🇦🇲',
  ka: '🇬🇪',
  mn: '🇲🇳',
  km: '🇰🇭',
  lo: '🇱🇦',
  my: '🇲🇲',
  ne: '🇳🇵',
  si: '🇱🇰',
  fa: '🇮🇷',
  am: '🇪🇹',
  ht: '🇭🇹',
  fj: '🇫🇯',
  kin: '🇷🇼',
  run: '🇧🇮',
  zu: '🇿🇦',
  xh: '🇿🇦',
  af: '🇿🇦',
  st: '🇱🇸',
  sn: '🇿🇼',
  az: '🇦🇿',
  kz: '🇰🇿',
  ky: '🇰🇬',
  uz: '🇺🇿',
  tg: '🇹🇯',
};

export const buildSsLanguage = (code: string, name?: string): SsLanguage => {
  const trimmed = (code || '').trim();
  const apiName = (name || '').trim();
  return {
    code: trimmed,
    name: apiName || SS_LANGUAGE_NATIVE_NAMES[trimmed] || trimmed.toUpperCase(),
    label: SS_LANGUAGE_NATIVE_NAMES[trimmed] || apiName || trimmed.toUpperCase(),
    flag: SS_LANGUAGE_FLAGS[trimmed] || '',
  };
};

/** Local fallback used before the API has ever answered (offline first launch). */
export const DEFAULT_SS_LANGUAGES: SsLanguage[] = PINNED_SS_LANGUAGE_CODES.map((code) =>
  buildSsLanguage(code)
);

/** Pinned languages first (in their declared order), then the API order. */
export const sortSsLanguages = (languages: SsLanguage[]): SsLanguage[] => {
  const rank = (code: string) => {
    const idx = PINNED_SS_LANGUAGE_CODES.indexOf(code);
    return idx === -1 ? PINNED_SS_LANGUAGE_CODES.length : idx;
  };
  return [...languages].sort((a, b) => rank(a.code) - rank(b.code));
};

export const filterSsLanguages = (languages: SsLanguage[], query: string): SsLanguage[] => {
  const q = normalizeSsLabel(query);
  if (!q) return languages;
  const matches = (value: string) => normalizeSsLabel(value).includes(q);
  return languages.filter(
    (lang) => matches(lang.label) || matches(lang.name) || matches(lang.code)
  );
};

export const readCachedSsLanguages = async (): Promise<SsLanguage[]> => {
  try {
    const raw = await AsyncStorage.getItem(LANGUAGE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed?.languages) ? parsed.languages : parsed;
    if (!Array.isArray(list)) return [];
    return list
      .filter((l: any) => l && typeof l.code === 'string' && l.code.trim() !== '')
      // Rebuild so a newer endonym/flag map applies to an older cache.
      .map((l: any) => buildSsLanguage(l.code, l.name));
  } catch {
    return [];
  }
};

export const writeCachedSsLanguages = async (languages: SsLanguage[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      LANGUAGE_CACHE_KEY,
      JSON.stringify({
        languages: languages.map(({ code, name }) => ({ code, name })),
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Cache failures must never break the UI.
  }
};

export const fetchSsLanguages = async (): Promise<SsLanguage[]> => {
  const res = await fetch(`${SS_LANGUAGES_URL}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`Sabbath School languages HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const languages: SsLanguage[] = [];
  for (const entry of data) {
    const code = typeof entry?.code === 'string' ? entry.code.trim() : '';
    if (!code || seen.has(code)) continue;
    seen.add(code);
    languages.push(buildSsLanguage(code, entry?.name));
  }
  return languages;
};

/**
 * Returns the available languages. Cached values are served immediately, then
 * refreshed when `refresh` is true or when nothing was cached yet.
 */
export const getSsLanguages = async (
  options: { refresh?: boolean } = {}
): Promise<SsLanguage[]> => {
  let languages = await readCachedSsLanguages();

  if (options.refresh || languages.length === 0) {
    try {
      const fresh = await fetchSsLanguages();
      if (fresh.length > 0) {
        languages = fresh;
        await writeCachedSsLanguages(fresh);
      }
    } catch {
      // Offline: keep cache, or fall back to the app's own languages.
    }
  }

  return sortSsLanguages(languages.length > 0 ? languages : DEFAULT_SS_LANGUAGES);
};
