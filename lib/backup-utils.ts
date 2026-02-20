import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export async function exportHymnCorrections() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const hymnKeys = keys.filter(key => key.startsWith('hymne_edit_'));

    if (hymnKeys.length === 0) {
      Alert.alert("Information", "Aucune correction à exporter.");
      return;
    }

    const pairs = await AsyncStorage.multiGet(hymnKeys);
    const data = Object.fromEntries(pairs);
    const json = JSON.stringify(data, null, 2);

    const filename = `adventools_corrections_${new Date().toISOString().split('T')[0]}.json`;
    // Using documentDirectory as it's more stable for certain systems
    const fileUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory || "") + filename;

    await FileSystem.writeAsStringAsync(fileUri, json);
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Exporter les corrections de cantiques',
      UTI: 'public.json'
    });
  } catch (error) {
    console.error("Export Error", error);
    Alert.alert("Erreur", "Impossible d'exporter les données.");
  }
}

export async function importHymnCorrections() {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true
    });

    if (result.canceled) return;

    const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const data = JSON.parse(fileContent);

    const entries = Object.entries(data);
    const validPairs: [string, string][] = entries
      .filter(([key]) => key.startsWith('hymne_edit_'))
      .map(([key, value]) => [key, String(value)]);

    if (validPairs.length === 0) {
      Alert.alert("Erreur", "Le fichier ne contient aucune correction de cantique valide.");
      return;
    }

    Alert.alert(
      "Confirmation",
      `Voulez-vous importer ${validPairs.length} corrections ? Cela pourrait écraser vos modifications actuelles.`,
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

  } catch (error) {
    console.error("Import Error", error);
    Alert.alert("Erreur", "Impossible d'importer le fichier. Vérifiez le format.");
  }
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
    const allKeys = await AsyncStorage.getAllKeys();

    // Filtrage des clés importantes pour la sauvegarde
    const keysToBackup = allKeys.filter(key =>
      key.startsWith('hymne_edit_') ||
      key.startsWith('highlights_') ||
      key.startsWith('word_highlights_') ||
      key.startsWith('bookmarks_') ||
      key.startsWith('pdf_bookmarks_') ||
      key.startsWith('pdf_notes_') ||
      key === 'adventools_notes' ||
      key === 'profile_name' ||
      key === 'profile_image' ||
      key === 'profile_departments' ||
      key === 'app_history' ||
      key === 'app_settings'
    );

    if (keysToBackup.length === 0) {
      Alert.alert("Information", "Aucune donnée à sauvegarder.");
      return;
    }

    const pairs = await AsyncStorage.multiGet(keysToBackup);
    const backupData = {
      version: "1.0",
      timestamp: Date.now(),
      data: Object.fromEntries(pairs)
    };

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

    const entries = Object.entries(backup.data);
    const validPairs: [string, string][] = entries.map(([key, value]) => [key, String(value)]);

    Alert.alert(
      "Restauration Complète",
      `Cette action va restaurer ${validPairs.length} éléments (notes, réglages, surlignages...). Vos données actuelles seront écrasées. Continuer ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Restaurer",
          onPress: async () => {
            try {
              await AsyncStorage.multiSet(validPairs);
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
