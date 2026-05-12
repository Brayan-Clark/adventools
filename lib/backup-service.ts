import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { initUserStorage } from './user-storage';
import { encryptData, decryptData } from './security';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BACKUP_FILE_NAME = 'adventools_backup.advb';

interface BackupData {
  version: string;
  timestamp: number;
  tables: Record<string, any[]>;
  asyncStorage: Record<string, string | null>;
}

export const BackupService = {
  /**
   * Export all user data to an encrypted file
   */
  exportBackup: async (): Promise<boolean> => {
    try {
      const db = await initUserStorage();
      const backup: BackupData = {
        version: '1.0.0',
        timestamp: Date.now(),
        tables: {},
        asyncStorage: {}
      };

      // 1. Export SQL Tables
      const tablesToExport = [
        'settings', 'folders', 'notes', 'attachments', 
        'history', 'favorites', 'bible_markup'
      ];

      for (const table of tablesToExport) {
        const rows: any[] = await db.getAllAsync(`SELECT * FROM ${table}`);
        backup.tables[table] = rows;
      }

      // 2. Export Essential AsyncStorage Keys
      const keys = await AsyncStorage.getAllKeys();
      const essentialKeys = keys.filter(k => 
        k.startsWith('adventools_') || 
        k.includes('selected_lang') || 
        k.includes('settings')
      );

      for (const key of essentialKeys) {
        backup.asyncStorage[key] = await AsyncStorage.getItem(key);
      }

      // 3. Encrypt and Save
      const jsonString = JSON.stringify(backup);
      const encryptedData = encryptData(jsonString);
      
      const backupPath = `${FileSystem.cacheDirectory}${BACKUP_FILE_NAME}`;
      await FileSystem.writeAsStringAsync(backupPath, encryptedData);

      // 4. Share File
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupPath, {
          mimeType: 'application/octet-stream',
          dialogTitle: 'Sauvegarder mes données Adventools',
          UTI: 'public.data'
        });
        return true;
      } else {
        throw new Error("Sharing is not available on this device");
      }
    } catch (e) {
      console.error("Export backup failed", e);
      throw e;
    }
  },

  /**
   * Import data from an encrypted file
   */
  importBackup: async (fileUri: string): Promise<boolean> => {
    try {
      const db = await initUserStorage();
      
      // 1. Read and Decrypt
      const encryptedData = await FileSystem.readAsStringAsync(fileUri);
      const jsonString = decryptData(encryptedData);
      
      if (!jsonString || !jsonString.startsWith('{')) {
        throw new Error("Fichier de sauvegarde invalide ou corrompu.");
      }

      const backup: BackupData = JSON.parse(jsonString);

      // 2. Import SQL Tables (Transactions recommended)
      await db.withTransactionAsync(async () => {
        for (const [tableName, rows] of Object.entries(backup.tables)) {
          // Clear existing data to avoid conflicts
          await db.execAsync(`DELETE FROM ${tableName}`);
          
          if (rows.length === 0) continue;

          const columns = Object.keys(rows[0]);
          const placeholders = columns.map(() => '?').join(',');
          const query = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;

          for (const row of rows) {
            const values = columns.map(col => row[col]);
            await db.runAsync(query, values);
          }
        }
      });

      // 3. Import AsyncStorage
      for (const [key, value] of Object.entries(backup.asyncStorage)) {
        if (value !== null) {
          await AsyncStorage.setItem(key, value);
        }
      }

      return true;
    } catch (e) {
      console.error("Import backup failed", e);
      throw e;
    }
  }
};
