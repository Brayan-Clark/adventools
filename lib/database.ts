import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const dbConnections: Record<string, SQLite.SQLiteDatabase> = {};
const dbLoadingPromises: Record<string, Promise<SQLite.SQLiteDatabase> | undefined> = {};

/**
 * Sanitizes parameters for SQLite queries to prevent NullPointerException on Android.
 */
function sanitizeParams(params: any[]): any[] {
  if (!params) return [];

  // If params is an array containing ONE array, it's the old style: getAllAsync(query, [p1, p2])
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0].map(p => {
      if (p === undefined || p === null) return null;
      if (typeof p === 'number' && isNaN(p)) return null;
      return p;
    });
  }

  // New style: getAllAsync(query, p1, p2)
  return params.map(p => {
    if (p === undefined || p === null) return null;
    if (typeof p === 'number' && isNaN(p)) return null;
    return p;
  });
}

/**
 * Opens and prepares the database. 
 * Includes a singleton pattern to avoid re-opening and re-copying files constantly.
 */
export async function loadDatabase(dbName: string, assetSource?: any, subfolder?: string, expectedVersion: number = 0): Promise<SQLite.SQLiteDatabase> {
  // Normalize dbName if it already contains a path
  let finalDbName = dbName;
  let finalSubfolder = subfolder;

  if (dbName.includes('/')) {
    const parts = dbName.split('/');
    finalDbName = parts.pop()!;
    finalSubfolder = parts.join('/');
  }

  const cacheKey = finalSubfolder ? `${finalSubfolder}/${finalDbName}` : finalDbName;

  // Return cached connection if available
  if (dbConnections[cacheKey]) {
    return dbConnections[cacheKey];
  }

  // If already loading, wait for that promise
  if (dbLoadingPromises[cacheKey]) {
    return dbLoadingPromises[cacheKey];
  }

  // Start new loading promise
  dbLoadingPromises[cacheKey] = (async () => {
    const docDir = FileSystem.documentDirectory;
    if (Platform.OS === 'web' || !docDir) {
      const db = await SQLite.openDatabaseAsync(finalDbName);
      const wrapped = wrapDatabase(db);
      dbConnections[cacheKey] = wrapped;
      return wrapped;
    }

    const dbDir = finalSubfolder ? `${docDir}SQLite/${finalSubfolder}` : `${docDir}SQLite`;
    const dbPath = `${dbDir}/${finalDbName}`;
    const rootDbPath = `${docDir}SQLite/${finalDbName}`;

    try {
      // 1. Ensure the target directory exists
      const dirInfo = await FileSystem.getInfoAsync(dbDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
      }

      const info = await FileSystem.getInfoAsync(dbPath);

      // 2. Migration: If not in subfolder but exists in root, move it
      if (!info.exists && finalSubfolder) {
        const rootInfo = await FileSystem.getInfoAsync(rootDbPath);
        if (rootInfo.exists) {
          await FileSystem.moveAsync({
            from: rootDbPath,
            to: dbPath
          });
        }
      }

      const finalInfo = await FileSystem.getInfoAsync(dbPath);

      // 3. Initial Copy or Version Update from Assets
      let shouldCopy = !finalInfo.exists && !!assetSource;

      // If already exists but we have a version requirement
      if (finalInfo.exists && assetSource && expectedVersion > 0) {
        try {
          const tempDb = await SQLite.openDatabaseAsync(finalSubfolder ? `${finalSubfolder}/${finalDbName}` : finalDbName);
          const result: any = await tempDb.getFirstAsync("PRAGMA user_version;");
          const currentVersion = result ? result.user_version : 0;
          
          // Special case: check for melodie table if it's cantique.db
          let hasMelodie = true;
          if (finalDbName === 'cantique.db') {
            const tableCheck: any = await tempDb.getFirstAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='melodie'");
            hasMelodie = !!tableCheck;
          }

          await tempDb.closeAsync();

          if (currentVersion < expectedVersion || !hasMelodie) {
            shouldCopy = true;
            console.log(`Database ${finalDbName} is outdated (v${currentVersion} < v${expectedVersion} or missing tables). Re-copying...`);
          }
        } catch (e) {
          console.error(`Error checking version for ${finalDbName}:`, e);
        }
      }

      if (shouldCopy && assetSource) {
        const asset = await Asset.fromModule(assetSource).downloadAsync();
        if (asset.localUri) {
          await FileSystem.copyAsync({
            from: asset.localUri,
            to: dbPath,
          });
          
          // After copying, set the new version
          if (expectedVersion > 0) {
            const newDb = await SQLite.openDatabaseAsync(finalSubfolder ? `${finalSubfolder}/${finalDbName}` : finalDbName);
            await newDb.execAsync(`PRAGMA user_version = ${expectedVersion};`);
            await newDb.closeAsync();
          }
        }
      } else if (!info.exists && !assetSource) {
        console.log(`Database ${finalDbName} not found, will be created fresh.`);
      }
    } catch (error) {
      console.error(`Error preparing database ${finalDbName}:`, error);
      throw error;
    }

    let db;
    try {
      // expo-sqlite openDatabaseAsync expects a relative path from the SQLite folder
      const openPath = finalSubfolder ? `${finalSubfolder}/${finalDbName}` : finalDbName;
      db = await SQLite.openDatabaseAsync(openPath);

      // Verify database integrity
      await db.execAsync("PRAGMA user_version;");

      const wrapped = wrapDatabase(db);
      dbConnections[cacheKey] = wrapped;
      return wrapped;
    } catch (error: any) {
      console.error(`Error opening/verifying database ${finalDbName}:`, error);

      // Cleanup corrupted file
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("not a database") || msg.includes("code 26") || msg.includes("malformed")) {
        await FileSystem.deleteAsync(dbPath, { idempotent: true }).catch(() => { });
      }
      delete dbConnections[cacheKey];
      delete dbLoadingPromises[cacheKey];
      throw error;
    }
  })();

  return dbLoadingPromises[cacheKey];
}

/**
 * Wraps a database with sanitized parameters to prevent NPE on Android
 */
export function wrapDatabase(db: SQLite.SQLiteDatabase) {
  const originalGetAll = db.getAllAsync.bind(db);
  const originalGetFirst = db.getFirstAsync.bind(db);
  const originalRun = db.runAsync.bind(db);

  db.getAllAsync = async (query: string, ...params: any[]) => {
    const safe = sanitizeParams(params);
    try {
      return await originalGetAll(query, ...safe);
    } catch (err) {
      console.error(`SQL GetAll Error: ${query}`, safe, err);
      throw err;
    }
  };

  db.getFirstAsync = async (query: string, ...params: any[]) => {
    const safe = sanitizeParams(params);
    try {
      return await originalGetFirst(query, ...safe);
    } catch (err) {
      console.error(`SQL GetFirst Error: ${query}`, safe, err);
      throw err;
    }
  };

  db.runAsync = async (query: string, ...params: any[]) => {
    const safe = sanitizeParams(params);
    try {
      return await originalRun(query, ...safe);
    } catch (err) {
      console.error(`SQL Run Error: ${query}`, safe, err);
      throw err;
    }
  };

  return db;
}
