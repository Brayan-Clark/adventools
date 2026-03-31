import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetInfoState } from '@react-native-community/netinfo';

const API_BASE = 'https://jasemsoftware.tech/api/v1';
const ASYNC_STORAGE_KEY = 'mofonaina_cache';
const ASYNC_STORAGE_LAST_SYNC_KEY = 'mofonaina_last_sync';

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
        // Sync if older than 12 hours
        if (now - lastSync > 12 * 60 * 60 * 1000) {
          shouldSync = true;
        }
      }
    }

    if (shouldSync) {
      if (cachedStr) {
        // Background sync to not block the UI if we already have cache
        console.log('Background syncing mofonaina from API...');
        fetch(`${API_BASE}/fiambenana`)
          .then(async (response) => {
            if (response.ok) {
              const data = await response.json();
              await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(data));
              await AsyncStorage.setItem(ASYNC_STORAGE_LAST_SYNC_KEY, new Date().toISOString());
            }
          })
          .catch(err => console.error('Error in background sync:', err));
          
        return JSON.parse(cachedStr);
      } else {
        // First time or forced without cache, must await
        console.log('Fetching mofonaina from API...');
        const response = await fetch(`${API_BASE}/fiambenana`);
        if (response.ok) {
          const data: Mofonaina[] = await response.json();
          await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(data));
          await AsyncStorage.setItem(ASYNC_STORAGE_LAST_SYNC_KEY, new Date().toISOString());
          return data;
        }
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
    // Determine the most common or highest id_telovolana, or just grab from the latest date
    const sorted = [...all].sort((a, b) => new Date(b.daty).getTime() - new Date(a.daty).getTime());
    return sorted[0].telovolana;
  }
  return null;
}
