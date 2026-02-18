import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
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
