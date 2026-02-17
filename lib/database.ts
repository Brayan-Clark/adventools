import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const dbConnections: Record<string, SQLite.SQLiteDatabase> = {};

/**
 * Sanitizes parameters for SQLite queries to prevent NullPointerException on Android.
 */
function sanitizeParams(params: any[]): any[] {
  if (!params || params.length === 0) return [];

  if (params.length === 1 && Array.isArray(params[0])) {
    return [params[0].map(p => {
      if (p === undefined || p === null) return null;
      if (typeof p === 'number' && isNaN(p)) return null;
      return p;
    })];
  }

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
export async function loadDatabase(dbName: string, assetSource: any): Promise<SQLite.SQLiteDatabase> {
  // Return cached connection if available
  if (dbConnections[dbName]) {
    return dbConnections[dbName];
  }

  const docDir = FileSystem.documentDirectory;
  if (Platform.OS === 'web' || !docDir) {
    const db = await SQLite.openDatabaseAsync(dbName);
    dbConnections[dbName] = wrapDatabase(db);
    return dbConnections[dbName];
  }

  const dbDir = `${docDir}SQLite`;
  const dbPath = `${dbDir}/${dbName}`;

  try {
    const info = await FileSystem.getInfoAsync(dbPath);

    // ONLY copy if the file doesn't exist to avoid "NullPointerException" or "Locked" errors
    if (!info.exists) {
      console.log(`Database ${dbName} not found, copying from assets...`);

      const dirInfo = await FileSystem.getInfoAsync(dbDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
      }

      const asset = await Asset.fromModule(assetSource).downloadAsync();
      if (asset.localUri) {
        await FileSystem.copyAsync({
          from: asset.localUri,
          to: dbPath,
        });
      }
    }
  } catch (error) {
    console.error(`Error preparing database ${dbName}:`, error);
  }

  const db = await SQLite.openDatabaseAsync(dbName);
  dbConnections[dbName] = wrapDatabase(db);
  return dbConnections[dbName];
}

function wrapDatabase(db: SQLite.SQLiteDatabase) {
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
