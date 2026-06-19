import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { exportAllData, importData } from './user-storage';
import { encryptBackup, decryptBackup } from './security';

const BACKUP_FILE_EXTENSION = '.advb';

/**
 * EXPORT COMPLET ET CHIFFRÉ DE L'APPLICATION
 */
export async function exportAllAppData(categories?: string[]) {
  try {
    // 1. Collect all data from SQLite
    const backupData = await exportAllData(categories);

    // 2. Encrypt the data
    const jsonString = JSON.stringify(backupData);
    const encryptedData = encryptBackup(jsonString);

    // 3. Save to a temporary file
    const filename = `adventools_backup_${new Date().toISOString().split('T')[0]}${BACKUP_FILE_EXTENSION}`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, encryptedData);

    // 4. Share the encrypted file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Sauvegarde sécurisée Adventools',
        UTI: 'public.data'
      });
    } else {
      Alert.alert("Erreur", "Le partage n'est pas disponible sur cet appareil.");
    }
  } catch (error) {
    console.error("Full Export Error", error);
    Alert.alert("Erreur", "Impossible de créer la sauvegarde chiffrée.");
  }
}

/**
 * LECTURE ET DÉCHIFFREMENT D'UN FICHIER DE SAUVEGARDE
 */
export async function readBackupFile() {
  try {
    // 1. Pick the file
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/octet-stream', 'application/json', '*/*'],
      copyToCacheDirectory: true
    });

    if (result.canceled) return null;

    // 2. Read the content
    const content = await FileSystem.readAsStringAsync(result.assets[0].uri);

    // 3. Attempt decryption
    let jsonString = '';
    if (content.startsWith('{')) {
      // Legacy unencrypted backup
      jsonString = content;
    } else {
      // Encrypted backup
      jsonString = decryptBackup(content);
    }

    if (!jsonString || !jsonString.startsWith('{')) {
      Alert.alert("Erreur", "Le fichier de sauvegarde est invalide, corrompu ou la clé de déchiffrement est incorrecte.");
      return null;
    }

    const backup = JSON.parse(jsonString);
    return backup;
  } catch (error) {
    console.error("Read Backup Error", error);
    Alert.alert("Erreur", "Impossible de lire ou déchiffrer le fichier de sauvegarde.");
    return null;
  }
}

/**
 * RESTAURATION COMPLÈTE À PARTIR D'UN FICHIER
 */
export async function importAllAppData() {
  try {
    const backup = await readBackupFile();
    if (!backup) return;

    Alert.alert(
      "Restauration sécurisée",
      "Voulez-vous restaurer vos données ? Vos données actuelles seront remplacées par celles de la sauvegarde.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Restaurer",
          onPress: async () => {
            try {
              await importData(backup);
              Alert.alert(
                "Succès", 
                "Vos données ont été restaurées avec succès ! Veuillez redémarrer l'application.",
                [{ text: "OK" }]
              );
            } catch (e) {
              console.error(e);
              Alert.alert("Erreur", "Échec de l'importation des données dans la base de données.");
            }
          }
        }
      ]
    );
  } catch (error) {
    console.error("Full Import Error", error);
    Alert.alert("Erreur", "Échec de la restauration.");
  }
}
