import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const API_BASE = 'https://jasemsoftware.tech/api/v1';
const ASYNC_STORAGE_KEY = 'mofonaina_cache';
const ASYNC_STORAGE_LAST_SYNC_KEY = 'mofonaina_last_sync';

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
 * or returns the cached version from AsyncStorage.
 */
export async function syncMofonaina(force = false): Promise<Mofonaina[]> {
  try {
    const lastSyncStr = await AsyncStorage.getItem(ASYNC_STORAGE_LAST_SYNC_KEY);
    const cachedStr = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);

    let shouldSync = force;

    if (!shouldSync) {
      if (!lastSyncStr || !cachedStr) {
        shouldSync = true;
      } else {
        const lastSync = new Date(lastSyncStr).getTime();
        const now = new Date().getTime();
        // Sync daily if online to ensure fresh content
        if (now - lastSync > 24 * 60 * 60 * 1000) {
          shouldSync = true;
        }
      }
    }

    if (shouldSync) {
      try {
        // Use a timestamp to bypass any server-side or network-level caching
        const response = await fetch(`${API_BASE}/fiambenana?t=${Date.now()}`);
        if (response.ok) {
          const data: Mofonaina[] = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(data));
            await AsyncStorage.setItem(ASYNC_STORAGE_LAST_SYNC_KEY, new Date().toISOString());
            return data;
          }
        }
      } catch (fetchError) {
        console.error('Fetch failed in syncMofonaina, falling back to cache:', fetchError);
      }
    }

    if (cachedStr) {
      return JSON.parse(cachedStr);
    }

    return [];
  } catch (error) {
    console.error('Error syncing mofonaina:', error);
    const cachedStr = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
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
  const all = await syncMofonaina();
  if (all.length > 0) {
    const sorted = [...all].sort((a, b) => new Date(b.daty).getTime() - new Date(a.daty).getTime());
    return sorted.length > 0 ? sorted[0].telovolana : null;
  }
  return null;
}
