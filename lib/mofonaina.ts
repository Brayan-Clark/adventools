import * as FileSystem from 'expo-file-system/legacy';

const API_BASE = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data';

// Cache stored on the filesystem (NOT AsyncStorage): this module is loaded by the
// Mofonaina widget, which runs in a separate Android process. AsyncStorage is not
// multi-process safe and concurrent access from the widget can corrupt the whole
// store (breaking notes, hymn favorites and Bible highlights in the main app).
// The filesystem is safe to share across processes.
const CACHE_FILE = `${FileSystem.documentDirectory}mofonaina_cache.json`;
const LAST_SYNC_FILE = `${FileSystem.documentDirectory}mofonaina_last_sync.txt`;

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
}

/**
 * Fetches the latest daily devotionals from the API if online,
 * or returns the cached version from the filesystem cache.
 */
export async function syncMofonaina(force = false): Promise<Mofonaina[]> {
  try {
    const lastSyncStr = await readCacheFile(LAST_SYNC_FILE);
    const cachedStr = await readCacheFile(CACHE_FILE);

    let shouldSync = force;

    if (!shouldSync) {
      if (!lastSyncStr || !cachedStr) {
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
      // US-06: Robust network management with timeout and retry
      let attempt = 0;
      const MAX_ATTEMPTS = 2;
      let success = false;

      while (attempt < MAX_ATTEMPTS && !success) {
        attempt++;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

          const now = new Date();
          const year = now.getFullYear();
          const quarter = Math.floor(now.getMonth() / 3) + 1;
          const fileName = `${year}-Q${quarter}.json`;

          const response = await fetch(`${API_BASE}/mofonaina/${fileName}?t=${Date.now()}`, {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (response.ok) {
            const fileData = await response.json();
            if (fileData && fileData.trimestre && Array.isArray(fileData.meditations)) {
              // Convert new French JSON structure to the internal Mofonaina array
              const data: Mofonaina[] = fileData.meditations.map((med: any, index: number) => ({
                id: index + 1,
                id_telovolana: fileData.trimestre.numero_trimestre,
                daty: med.date,
                lohateny_andro: med.titre_du_jour,
                andininy_soratra_masina: med.verset_texte,
                toerana_soratra_masina: med.verset_reference,
                mofon_aina: med.contenu,
                loharano: med.source,
                publish: true,
                telovolana: {
                  id: fileData.trimestre.numero_trimestre,
                  taona: fileData.trimestre.annee,
                  laharana: fileData.trimestre.numero_trimestre,
                  lohateny_lehibe: fileData.trimestre.titre_principal
                }
              }));

              if (data.length > 0) {
                await writeCacheFile(CACHE_FILE, JSON.stringify(data));
                await writeCacheFile(LAST_SYNC_FILE, new Date().toISOString());
                success = true;
                return data;
              }
            }
          }
        } catch (fetchError) {
          console.warn(`Mofonaina fetch attempt ${attempt} failed:`, fetchError);
          // Removed console.error to prevent intrusive UI toast when offline
        }
      }
    }

    if (cachedStr) {
      return JSON.parse(cachedStr);
    }

    return [];
  } catch (error) {
    console.error('Error syncing mofonaina:', error);
    const cachedStr = await readCacheFile(CACHE_FILE);
    if (cachedStr) {
      return JSON.parse(cachedStr);
    }
    return [];
  }
}

/**
 * Helper to normalize a date string to YYYY-MM-DD
 */
function normalizeDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Retrieves the devotional for a specific date
 */
export async function getMofonainaForDate(date: Date = new Date()): Promise<Mofonaina | null> {
  const all = await syncMofonaina();
  const targetDateStr = normalizeDate(date);

  // Find the exact match for the date using string comparison on prefix YYYY-MM-DD
  const match = all.find(m => m.daty && m.daty.startsWith(targetDateStr));

  if (match) return match;

  // If not found, just return the most recent one or the first one as fallback
  if (all.length > 0) {
    // Optional: Sort by ID descending or date descending to get the most recent
    const sorted = [...all].sort((a, b) => new Date(b.daty).getTime() - new Date(a.daty).getTime());
    // For now, let's strictly return null if no exact date match, so the UI can show "No reading for today"
    // But wait, it's better to show 'something' if dates are slightly off in DB
  }

  return null;
}

/**
 * Gets the current quarter's information from the cached data
 */
export async function getCurrentTelovolanaInfo(): Promise<Telovolana | null> {
  try {
    const content = await readCacheFile(CACHE_FILE);
    if (!content) return null;
    
    const data: Mofonaina[] = JSON.parse(content);
    if (data.length > 0) {
      return data[0].telovolana;
    }
    return null;
  } catch (error) {
    console.error('Error getting telovolana info:', error);
    return null;
  }
}

export async function getAllMofonainaForQuarter(): Promise<Mofonaina[]> {
  try {
    const content = await readCacheFile(CACHE_FILE);
    if (!content) return [];
    
    const data: Mofonaina[] = JSON.parse(content);
    return data;
  } catch (error) {
    console.error('Error getting all mofonaina:', error);
    return [];
  }
}
