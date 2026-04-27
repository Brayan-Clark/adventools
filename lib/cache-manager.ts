import * as FileSystem from 'expo-file-system/legacy';

const CACHE_DIR = `${FileSystem.documentDirectory}app_cache/`;

/**
 * Interface for cache options
 */
export interface CacheOptions<T> {
  key: string;              // Unique key for the cache (e.g. 'audio_manifest')
  url: string;              // Remote URL to fetch fresh data
  fallbackData?: T;         // Hardcoded fallback if no network AND no cache
  expirationMs?: number;    // Optional: How long before cache is considered "stale" (but still usable if offline)
}

/**
 * Result of a cache operation
 */
export interface CacheResult<T> {
  data: T;
  isStale: boolean;
  isFromCache: boolean;
}

/**
 * Unified Cache Manager to handle remote data with local persistence
 */
export const CacheManager = {
  /**
   * Initialize cache directory
   */
  async init() {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  },

  /**
   * Load data from cache or network
   * Returns cached data immediately if available, and optionally triggers a background update
   */
  async fetchWithCache<T>(options: CacheOptions<T>): Promise<T> {
    await this.init();
    const cacheFile = `${CACHE_DIR}${options.key}.json`;
    
    // 1. Try to load from local storage
    let cachedData: T | null = null;
    const cacheInfo = await FileSystem.getInfoAsync(cacheFile);
    
    if (cacheInfo.exists) {
      try {
        const content = await FileSystem.readAsStringAsync(cacheFile);
        cachedData = JSON.parse(content);
      } catch (e) {
        console.error(`Cache read error for ${options.key}:`, e);
      }
    }

    // 2. Return cached data immediately if exists
    // (In a real app, you might want to return a stream or a callback for background updates)
    if (cachedData) {
      // Trigger background update silently
      this.refreshCache(options).catch(() => {});
      return cachedData;
    }

    // 3. If no cache, try to fetch from network
    try {
      return await this.refreshCache(options);
    } catch (e) {
      // 4. If network fails and no cache, use fallbackData
      if (options.fallbackData !== undefined) {
        return options.fallbackData;
      }
      throw e;
    }
  },

  /**
   * Explicitly refresh the cache from network
   */
  async refreshCache<T>(options: CacheOptions<T>): Promise<T> {
    const cacheFile = `${CACHE_DIR}${options.key}.json`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`${options.url}${options.url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        await FileSystem.writeAsStringAsync(cacheFile, JSON.stringify(data));
        return data;
      }
      throw new Error(`Failed to fetch fresh data: ${response.status}`);
    } catch (e) {
      console.log(`Refresh failed for ${options.key}, using existing data if available.`);
      throw e;
    }
  },

  /**
   * Clear a specific cache entry
   */
  async clearCache(key: string) {
    const cacheFile = `${CACHE_DIR}${key}.json`;
    const info = await FileSystem.getInfoAsync(cacheFile);
    if (info.exists) {
      await FileSystem.deleteAsync(cacheFile);
    }
  }
};
