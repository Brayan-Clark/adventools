import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility to warn users when they are about to consume large amounts of data
 * on a cellular connection (mobile data).
 * 
 * @param moduleName Name of the high-data feature (e.g. "Vidéos", "Téléchargement de Leçons")
 * @param onConfirm Callback if user wants to proceed
 * @param onCancel Callback if user cancels
 */
export async function checkMobileDataWarning(
  moduleName: string,
  onConfirm: () => void,
  onCancel?: () => void
) {
  try {
    const state = await NetInfo.fetch();
    
    // Only warn on cellular data connection
    if (state.type !== 'cellular') {
      onConfirm();
      return;
    }

    // Check if user has bypassed this warning previously
    const bypassWarning = await AsyncStorage.getItem(`bypass_data_warning_${moduleName}`);
    if (bypassWarning === 'true') {
      onConfirm();
      return;
    }

    // Show native warning prompt
    Alert.alert(
      "📊 Données Mobiles Actives",
      `Vous êtes actuellement connecté via vos données mobiles. Le chargement ou le téléchargement dans "${moduleName}" consomme beaucoup de données.\n\nNous vous recommandons vivement d'utiliser une connexion Wi-Fi pour préserver votre forfait mobile.\n\nVoulez-vous continuer ?`,
      [
        {
          text: "Annuler",
          style: "cancel",
          onPress: () => {
            if (onCancel) onCancel();
          }
        },
        {
          text: "Continuer",
          style: "default",
          onPress: () => {
            onConfirm();
          }
        },
        {
          text: "Ne plus me demander",
          style: "default",
          onPress: async () => {
            await AsyncStorage.setItem(`bypass_data_warning_${moduleName}`, 'true');
            onConfirm();
          }
        }
      ],
      { cancelable: true }
    );
  } catch (e) {
    // If check fails, default to running onConfirm to avoid locking user out
    onConfirm();
  }
}
