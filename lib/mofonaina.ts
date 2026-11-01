import * as FileSystem from 'expo-file-system/legacy';

const API_BASE = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data';
const MANIFEST_URL = `${API_BASE}/mofonaina/manifest.json`;

// Cache stored on the filesystem (NOT AsyncStorage): this module is loaded by the
// Mofonaina widget, which runs in a separate Android process. AsyncStorage is not
// multi-process safe and concurrent access from the widget can corrupt the whole
// store (breaking notes, hymn favorites and Bible highlights in the main app).
// The filesystem is safe to share across processes.
const CACHE_FILE = `${FileSystem.documentDirectory}mofonaina_cache.json`;
const LAST_SYNC_FILE = `${FileSystem.documentDirectory}mofonaina_last_sync.txt`;
const ABBREVIATIONS_FILE = `${FileSystem.documentDirectory}mofonaina_abbreviations.json`;

// Raw quarter files are kept aside so a sync only re-downloads what changed
const QUARTERS_DIR = `${FileSystem.documentDirectory}mofonaina/`;
const MANIFEST_CACHE_FILE = `${QUARTERS_DIR}manifest.json`;

const FETCH_TIMEOUT_MS = 20000;

/**
 * In-process cache of the parsed devotionals, plus a date index.
 *
 * The cache file holds every quarter (~450 KB), and the screens call
 * getMofonainaForDate / getCurrentTelovolanaInfo / getAllMofonainaForQuarter
 * several times per open. Re-reading and re-parsing it each time is wasteful,
 * so the parsed form is kept in memory.
 *
 * It is keyed by the last-sync stamp rather than held forever: the widget runs
 * in its own Android process and can rewrite the file underneath us. Reading
 * that tiny stamp file is far cheaper than parsing the payload, so a write from
 * the other process still invalidates this cache.
 */
let memo: {
  stamp: string;
  list: Mofonaina[];
  byDate: Map<string, Mofonaina>;
} | null = null;

async function readCacheFile(path: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(path);
  } catch {
    return null;
  }
}

async function writeCacheFile(path: string, value: string): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(path, value);
  } catch (e) {
    console.warn('Failed to write mofonaina cache', e);
  }
}

/**
 * Global function to sync all remote-manifest-based modules
 */
export async function syncAllModules(): Promise<boolean> {
  try {
    const results = await Promise.allSettled([
      syncMofonaina(true),
      // Other modules have their own sync logic in their components,
      // but we can trigger a pre-fetch here if we want to warm the cache.
      // For now, we'll focus on the ones that use simple JSON manifests.
      fetch('https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/playbacks/manifest.json?t=' + Date.now()).catch(() => null),
      fetch('https://raw.githubusercontent.com/Brayan-Clark/adventools/data/hymnes/manifest.json?t=' + Date.now()).catch(() => null),
      fetch('https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/radios.json?t=' + Date.now()).catch(() => null),
      fetch('https://raw.githubusercontent.com/Brayan-Clark/adventools/data/video/manifest.json?t=' + Date.now()).catch(() => null),
    ]);
    return results.every(r => r.status === 'fulfilled');
  } catch (e) {
    return false;
  }
}

export interface Telovolana {
  id: number;
  taona: number;
  laharana: number;
  lohateny_lehibe: string;
}

export interface Mofonaina {
  id: number;
  id_telovolana: number;
  daty: string;
  lohateny_andro: string;
  andininy_soratra_masina: string;
  toerana_soratra_masina: string;
  mofon_aina: string;
  loharano: string;
  publish: boolean;
  telovolana: Telovolana;
  // Extras published from the quarterly booklet (T4 2026 onwards)
  andro_herinandro?: string;
  salamo_androany?: string;
  vakiteny_androany?: string;
  filentehan_masoandro?: string;
}

/** One quarter as described by mofonaina/manifest.json on the data branch */
interface ManifestQuarter {
  id: string;
  annee: number;
  trimestre: number;
  titre: string;
  file: string;
  url: string;
  startDate: string;
  endDate: string;
  count: number;
  version: number;
}

interface Manifest {
  version: number;
  updatedAt: string;
  quarters: ManifestQuarter[];
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}t=${Date.now()}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.warn('[Mofonaina] fetch failed:', url, e);
    return null;
  }
}

async function readJsonFile(path: string): Promise<any | null> {
  const content = await readCacheFile(path);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function writeJsonFile(path: string, data: any): Promise<void> {
  await writeCacheFile(path, JSON.stringify(data));
}

async function ensureQuartersDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(QUARTERS_DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(QUARTERS_DIR, { intermediates: true });
  } catch (e) {
    console.warn('Failed to create mofonaina dir', e);
  }
}

const quarterPath = (id: string) => `${QUARTERS_DIR}${id}.json`;

const normalizeDate = (d: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Converts a published quarter file (2026-Q4.json) into the internal array.
 * Ids are derived from the date so they stay unique once several quarters
 * are loaded side by side.
 */
function mapQuarterFile(fileData: any): Mofonaina[] {
  if (!fileData?.trimestre || !Array.isArray(fileData.meditations)) return [];

  const { annee, numero_trimestre, titre_principal } = fileData.trimestre;
  const telovolanaId = annee * 10 + numero_trimestre;

  return fileData.meditations
    .filter((med: any) => med && typeof med.date === 'string')
    .map((med: any) => ({
      id: Number(med.date.replace(/-/g, '')),
      id_telovolana: telovolanaId,
      daty: med.date,
      lohateny_andro: med.titre_du_jour || '',
      andininy_soratra_masina: med.verset_texte || '',
      toerana_soratra_masina: med.verset_reference || '',
      mofon_aina: med.contenu || '',
      loharano: med.source || '',
      publish: true,
      telovolana: {
        id: telovolanaId,
        taona: annee,
        laharana: numero_trimestre,
        lohateny_lehibe: titre_principal || '',
      },
      andro_herinandro: med.jour_semaine,
      salamo_androany: med.psaume_du_jour,
      vakiteny_androany: med.lecture_du_jour,
      filentehan_masoandro: med.coucher_du_soleil,
    }));
}

function setMemo(stamp: string, list: Mofonaina[]): void {
  const byDate = new Map<string, Mofonaina>();
  for (const m of list) {
    // Dates are stored as YYYY-MM-DD, but slice defensively in case a
    // published file ever carries a time component.
    if (m?.daty) byDate.set(m.daty.slice(0, 10), m);
  }
  memo = { stamp, list, byDate };
}

/** The parsed devotionals, re-reading the file only when the sync stamp moved. */
async function loadCachedList(): Promise<Mofonaina[]> {
  const stamp = (await readCacheFile(LAST_SYNC_FILE)) || '';
  if (memo && memo.stamp === stamp) return memo.list;

  const content = await readCacheFile(CACHE_FILE);
  if (!content) return [];
  try {
    const list: Mofonaina[] = JSON.parse(content);
    setMemo(stamp, list);
    return list;
  } catch {
    return [];
  }
}

const sortByDateDesc = (list: Mofonaina[]): Mofonaina[] =>
  [...list].sort((a, b) => (a.daty < b.daty ? 1 : a.daty > b.daty ? -1 : 0));

const sortByDateAsc = (list: Mofonaina[]): Mofonaina[] =>
  [...list].sort((a, b) => (a.daty > b.daty ? 1 : a.daty < b.daty ? -1 : 0));

/**
 * Downloads every quarter listed in the manifest that is missing locally, or
 * whose `version` was bumped. This is what makes a newly published quarter
 * appear on its own, without shipping a new build.
 *
 * Loading every quarter (rather than guessing today's file from the calendar)
 * also covers the booklet quarters overlapping calendar ones: the T4 2026
 * booklet starts on 27 September, still inside calendar Q3.
 */
async function syncFromManifest(): Promise<{ list: Mofonaina[]; abbreviations: any } | null> {
  const remote: Manifest | null = await fetchJson(MANIFEST_URL);
  if (!remote || !Array.isArray(remote.quarters) || remote.quarters.length === 0) return null;

  await ensureQuartersDir();

  const localManifest: Manifest | null = await readJsonFile(MANIFEST_CACHE_FILE);
  const localVersions = new Map<string, number>(
    (localManifest?.quarters || []).map(q => [q.id, q.version])
  );

  const list: Mofonaina[] = [];
  let abbreviations: any = null;
  let allAvailable = true;
  const todayStr = normalizeDate(new Date());

  for (const quarter of remote.quarters) {
    if (!quarter?.id || !quarter?.url) continue;

    const path = quarterPath(quarter.id);
    let fileData = await readJsonFile(path);

    if (!fileData || localVersions.get(quarter.id) !== quarter.version) {
      const fresh = await fetchJson(quarter.url);
      if (fresh) {
        await writeJsonFile(path, fresh);
        fileData = fresh;
      }
    }

    if (!fileData) {
      allAvailable = false;
      continue;
    }

    list.push(...mapQuarterFile(fileData));

    // Keep the abbreviations of the quarter we are currently in
    const coversToday = quarter.startDate <= todayStr && todayStr <= quarter.endDate;
    if (fileData.abbreviations && (coversToday || !abbreviations)) {
      abbreviations = fileData.abbreviations;
    }
  }

  if (list.length === 0) return null;

  // Record the manifest only once every quarter it lists is on disk, so a
  // partial download is retried on the next sync.
  if (allAvailable) await writeJsonFile(MANIFEST_CACHE_FILE, remote);

  return { list: sortByDateDesc(list), abbreviations };
}

/**
 * Last resort when the manifest cannot be reached: guess the current quarter
 * file from the calendar, as the app did before the manifest existed.
 */
async function syncCurrentQuarterDirectly(): Promise<{ list: Mofonaina[]; abbreviations: any } | null> {
  const now = new Date();
  const fileName = `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}.json`;
  const fileData = await fetchJson(`${API_BASE}/mofonaina/${fileName}`);
  if (!fileData) return null;

  const list = mapQuarterFile(fileData);
  if (list.length === 0) return null;

  return { list: sortByDateDesc(list), abbreviations: fileData.abbreviations || null };
}

/**
 * Fetches the daily devotionals published on the `data` branch, or returns
 * the cached version from the filesystem cache.
 */
export async function syncMofonaina(force = false): Promise<Mofonaina[]> {
  try {
    const lastSyncStr = await readCacheFile(LAST_SYNC_FILE);
    // Only the existence of the cache matters here; parsing its ~450 KB is
    // deferred to loadCachedList, which memoizes the result.
    const hasCache = memo !== null || (await FileSystem.getInfoAsync(CACHE_FILE)).exists;

    let shouldSync = force;

    if (!shouldSync) {
      if (!lastSyncStr || !hasCache) {
        shouldSync = true;
      } else {
        const lastSync = new Date(lastSyncStr);
        const now = new Date();
        // Sync daily if online to ensure fresh content
        if (now.getFullYear() !== lastSync.getFullYear() ||
            now.getMonth() !== lastSync.getMonth() ||
            now.getDate() !== lastSync.getDate()) {
          shouldSync = true;
        }
      }
    }

    if (shouldSync) {
      const result = (await syncFromManifest()) || (await syncCurrentQuarterDirectly());

      if (result && result.list.length > 0) {
        const stamp = new Date().toISOString();
        await writeCacheFile(CACHE_FILE, JSON.stringify(result.list));
        await writeCacheFile(LAST_SYNC_FILE, stamp);
        if (result.abbreviations) {
          await writeJsonFile(ABBREVIATIONS_FILE, result.abbreviations);
        }
        setMemo(stamp, result.list);
        return result.list;
      }
    }

    return await loadCachedList();
  } catch (error) {
    console.error('Error syncing mofonaina:', error);
    return await loadCachedList();
  }
}

/**
 * Retrieves the devotional for a specific date
 */
export async function getMofonainaForDate(date: Date = new Date()): Promise<Mofonaina | null> {
  const all = await syncMofonaina();
  const targetDateStr = normalizeDate(date);

  // Served by the date index built alongside the memory cache; the linear scan
  // is only a fallback for the (unmemoized) empty-cache case.
  const indexed = memo?.byDate.get(targetDateStr);
  if (indexed) return indexed;

  return all.find(m => m.daty && m.daty.startsWith(targetDateStr)) || null;
}

/**
 * The quarter covering today, or the most recent one when we are between two
 * booklets (the last days of December, for instance).
 */
function currentQuarterOf(all: Mofonaina[]): Telovolana | null {
  if (all.length === 0) return null;

  const todayStr = normalizeDate(new Date());
  const today = all.find(m => m.daty && m.daty.startsWith(todayStr));
  if (today) return today.telovolana;

  return sortByDateDesc(all)[0]?.telovolana || null;
}

/**
 * Gets the current quarter's information from the cached data
 */
export async function getCurrentTelovolanaInfo(): Promise<Telovolana | null> {
  try {
    const data = await loadCachedList();
    if (data.length === 0) return null;

    return currentQuarterOf(data);
  } catch (error) {
    console.error('Error getting telovolana info:', error);
    return null;
  }
}

/**
 * Every reading of the quarter we are currently in, in chronological order.
 * The cache now holds several quarters, so it has to be filtered. The cache
 * itself is sorted newest first (handy to find today's reading), but the
 * quarter list has to read like the booklet: first day of the quarter first.
 */
export async function getAllMofonainaForQuarter(): Promise<Mofonaina[]> {
  try {
    const data = await loadCachedList();
    if (data.length === 0) return [];

    const quarter = currentQuarterOf(data);
    if (!quarter) return [];

    return sortByDateAsc(data.filter(m => m.id_telovolana === quarter.id));
  } catch (error) {
    console.error('Error getting all mofonaina:', error);
    return [];
  }
}

export async function getMofonainaAbbreviations(): Promise<Record<string, string>> {
  try {
    const content = await readCacheFile(ABBREVIATIONS_FILE);
    if (!content) return {};
    return JSON.parse(content);
  } catch (error) {
    console.error('Error getting mofonaina abbreviations:', error);
    return {};
  }
}
