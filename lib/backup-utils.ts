import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { exportAllData, importData, migrateFromAsyncStorage } from './user-storage';

export async function exportUserModifications() {
  try {
    const backupData = await exportAllData();

    const filename = `adventools_modifications_${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory || "") + filename;

    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupData, null, 2));
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Exporter les modifications',
      UTI: 'public.json'
    });
  } catch (error) {
    console.error("Export Error", error);
    Alert.alert("Erreur", "Impossible d'exporter les données.");
  }
}

export async function readBackupFile() {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true
    });

    if (result.canceled) return null;

    const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Read Backup Error", error);
    Alert.alert("Erreur", "Impossible de lire le fichier.");
    return null;
  }
}

export async function importUserModifications() {
  // We will now handle this in the UI (modal.tsx) for a better experience with summary
  // This old version is kept for compatibility or can be removed if fully replaced.
  const data = await readBackupFile();
  if (!data) return;

  const entries = Object.entries(data);
  const validPairs: [string, string][] = entries
    .map(([key, value]) => [key, String(value)]);

  if (validPairs.length === 0) {
    Alert.alert("Erreur", "Le fichier est vide ou invalide.");
    return;
  }

  Alert.alert(
    "Confirmation",
    `Voulez-vous importer ${validPairs.length} éléments ? Cela pourrait écraser vos modifications actuelles.`,
    [
      { text: "Annuler", style: "cancel" },
      {
        text: "Importer",
        onPress: async () => {
          try {
            await AsyncStorage.multiSet(validPairs);
            Alert.alert("Succès", "Importation terminée avec succès !");
          } catch (e) {
            console.error(e);
            Alert.alert("Erreur", "Échec de l'écriture dans le stockage.");
          }
        }
      }
    ]
  );
}
export async function resetHymnCorrections() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const hymnKeys = keys.filter(key => key.startsWith('hymne_edit_'));

    if (hymnKeys.length === 0) {
      Alert.alert("Information", "Aucune correction à réinitialiser.");
      return;
    }

    Alert.alert(
      "Réinitialisation",
      `Voulez-vous supprimer les ${hymnKeys.length} corrections locales ? Cette action est irréversible.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Réinitialiser",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove(hymnKeys);
            Alert.alert("Succès", "Toutes les corrections ont été effacées.");
          }
        }
      ]
    );
  } catch (e) {
    console.error(e);
    Alert.alert("Erreur", "Impossible de réinitialiser les corrections.");
  }
}

/**
 * EXPORT COMPLET DE L'APPLICATION
 */
export async function exportAllAppData() {
  try {
    const backupData = await exportAllData();

    const json = JSON.stringify(backupData, null, 2);
    const filename = `adventools_backup_${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory || "") + filename;

    await FileSystem.writeAsStringAsync(fileUri, json);
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Sauvegarde complète Adventools',
      UTI: 'public.json'
    });
  } catch (error) {
    console.error("Full Export Error", error);
    Alert.alert("Erreur", "Impossible de créer la sauvegarde.");
  }
}

/**
 * IMPORT COMPLET DE L'APPLICATION
 */
export async function importAllAppData() {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true
    });

    if (result.canceled) return;

    const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const backup = JSON.parse(fileContent);

    if (!backup.data || typeof backup.data !== 'object') {
      Alert.alert("Erreur", "Format de sauvegarde invalide.");
      return;
    }

    Alert.alert(
      "Restauration Complète",
      `Cette action va restaurer vos données (notes, réglages, surlignages...). Vos données actuelles pourraient être écrasées. Continuer ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Restaurer",
          onPress: async () => {
            try {
              if (backup.version === "2.0") {
                  // Direct SQLite import
                  await importData(backup);
              } else {
                  // Legacy AsyncStorage import
                  const entries = Object.entries(backup.data);
                  const validPairs: [string, string][] = entries.map(([key, value]) => [key, String(value)]);
                  await AsyncStorage.multiSet(validPairs);
                  // Trigger migration on next run or now?
                  await migrateFromAsyncStorage();
              }
              
              Alert.alert(
                "Succès",
                "Restauration terminée ! Il est conseillé de redémarrer l'application pour appliquer tous les changements.",
                [{ text: "OK" }]
              );
            } catch (e) {
              console.error(e);
              Alert.alert("Erreur", "Échec de l'écriture des données restaureés.");
            }
          }
        }
      ]
    );

  } catch (error) {
    console.error("Full Import Error", error);
    Alert.alert("Erreur", "Le fichier de sauvegarde est corrompu ou illisible.");
  }
}
