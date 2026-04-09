import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { I18nManager } from './i18n-manager';
import { useSettings } from './settings-context';

const LAST_CHECK_KEY = 'adventools_last_update_check';

export function useAutoUpdater() {
  const { settings, isLoading } = useSettings();

  useEffect(() => {
    if (isLoading) return;

    const checkUpdates = async () => {
      try {
        const lastCheckStr = await AsyncStorage.getItem(LAST_CHECK_KEY);
        const lastCheckDate = lastCheckStr ? new Date(lastCheckStr) : null;
        const now = new Date();

        // Calculate months difference
        let monthsDiff = 0;
        if (lastCheckDate) {
          monthsDiff = (now.getFullYear() - lastCheckDate.getFullYear()) * 12;
          monthsDiff -= lastCheckDate.getMonth();
          monthsDiff += now.getMonth();
        }

        // If no previous check, or elapsed time >= interval, do check
        const interval = settings.updateCheckIntervalMonths || 1;
        if (!lastCheckDate || monthsDiff >= interval) {
          await performUpdateCheck(settings.downloadOverWifiOnly);
          // Save new check date
          await AsyncStorage.setItem(LAST_CHECK_KEY, now.toISOString());
        }
      } catch (error) {
        console.error("Erreur lors de la vérification des mises a jour", error);
      }
    };

    checkUpdates();
  }, [settings.updateCheckIntervalMonths, settings.downloadOverWifiOnly, isLoading]);
}

export async function performUpdateCheck(wifiOnly: boolean, manual = false) {
  // 1. Check Network
  const networkState = await NetInfo.fetch();
  if (!networkState.isConnected) {
    if (manual) Alert.alert("Pas de connexion", "Veuillez vous connecter à Internet pour rechercher des mises à jour.");
    return;
  }
  if (wifiOnly && networkState.type !== 'wifi') {
    if (manual) Alert.alert("Wi-Fi requis", "La vérification manuelle nécessite une connexion Wi-Fi selon vos paramètres.");
    return;
  }

  let foundSomething = false;
  const currentVersion = Constants.expoConfig?.version || "1.0.0";

  // 2. Check App Update (APK via GitHub Releases)
  try {
    const gitHubApiUrl = 'https://api.github.com/repos/Brayan-Clark/adventools/releases/latest';
    const response = await fetch(gitHubApiUrl);
    if (response.ok) {
      const release = await response.json();
      const latestVersion = release.tag_name ? release.tag_name.replace('v', '') : "0.0.0";

      // Robust semantic version comparison
      const isNewer = (latest: string, current: string) => {
        const l = latest.split('.').map(n => parseInt(n) || 0);
        const c = current.split('.').map(n => parseInt(n) || 0);
        for (let i = 0; i < Math.max(l.length, c.length); i++) {
          if ((l[i] || 0) > (c[i] || 0)) return true;
          if ((l[i] || 0) < (c[i] || 0)) return false;
        }
        return false;
      };

      if (isNewer(latestVersion, currentVersion)) {
        foundSomething = true;
        Alert.alert(
          "Mise à jour disponible",
          `Une nouvelle version (${release.tag_name}) est disponible ! Souhaitez-vous la télécharger ?\n\nVersion actuelle : ${currentVersion}\nNouveautés : ${release.name || ''}`,
          [
            { text: "Plus tard", style: "cancel" },
            {
              text: "Télécharger",
              onPress: () => {
                const apkAsset = release.assets?.find((a: any) => a.name.endsWith('.apk'));
                if (apkAsset && apkAsset.browser_download_url) {
                  Linking.openURL(apkAsset.browser_download_url);
                } else {
                  Linking.openURL(release.html_url);
                }
              }
            }
          ]
        );
      }
    }
  } catch (e) {
    console.error("App Update Check Error:", e);
  }

  // 3. Check Languages Update
  try {
    const manager = I18nManager.getInstance();
    await manager.init();

    // Fetch latest manifest from Github
    const latestManifest = await manager.syncRemoteManifest();
    if (latestManifest) {
      const installedLangs = manager.getInstalledLanguages();

      // Update only languages that the user has ALREADY downloaded!
      for (const lang of installedLangs) {
        // We only care about dynamically downloaded languages
        if (lang.isBuiltIn) continue;

        const status = manager.getLanguageStatus(lang.id);
        if (status === 'update-available') {
          foundSomething = true;
          await manager.downloadLanguage(lang.id);
          if (manual) Alert.alert("Mise à jour réussie", `La langue ${lang.name} a été mise à jour.`);
        }
      }
    }
  } catch (e) {
    console.error("Language Update Error:", e);
  }

  if (manual && !foundSomething) {
    Alert.alert("Tout est à jour", "Vous utilisez déjà la dernière version de l'application et des données.");
  }
}
