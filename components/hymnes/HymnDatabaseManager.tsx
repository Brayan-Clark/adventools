import { AppText as Text } from '@/components/ui/AppText';
import { loadDatabase } from '@/lib/database';
import { HYMNE_SOURCES } from '@/lib/hymnes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { CheckCircle2, CloudDownload, Music, RefreshCw, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { useToast } from '@/lib/toast-context';
import { useAlert } from '@/lib/alert-context';


const MANIFEST_URL = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/hymnes/manifest.json';
const AUDIO_MANIFEST_BASE_URL = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/playbacks/';

// Function to download audio manifest for a collection
const downloadAudioManifest = async (collectionId: string): Promise<void> => {
  try {
    const PB_DIR = `${FileSystem.documentDirectory}playbacks/`;
    const CACHE_FILE = `${PB_DIR}cache_v3_${collectionId}.json`;

    const res = await fetch(`${AUDIO_MANIFEST_BASE_URL}${collectionId}.json`);
    if (res.ok) {
      const data = await res.json();
      await FileSystem.makeDirectoryAsync(PB_DIR, { intermediates: true }).catch(() => {});
      await FileSystem.writeAsStringAsync(CACHE_FILE, JSON.stringify(data));
      console.log(`Updated audio manifest for ${collectionId}`);
    }
  } catch (e) {
    console.log(`Failed to download audio manifest for ${collectionId}`, e);
  }
};

/**
 * Collect the audio collections ACTUALLY referenced by the installed hymn
 * databases, by reading the distinct `c_playbacks` values from each DB. This
 * replaces a hardcoded list that was both wrong (e.g. 'hira-fameno' is not a
 * real collection) and incomplete (missed collections like 'hira-faneva_minenf'),
 * which is why the update button never refreshed some hymns' audio.
 */
const collectInstalledCollections = async (manifest: any): Promise<string[]> => {
  const collections = new Set<string>();
  const docDir = FileSystem.documentDirectory;
  const versions: any[] = manifest?.versions || [];

  for (const v of versions) {
    const fileName = (v.file || '').toLowerCase();
    if (!fileName) continue;

    // Only read DBs that are actually present (built-in or downloaded).
    const isBuiltIn = !!HYMNE_SOURCES[fileName];
    if (!isBuiltIn && docDir) {
      const info = await FileSystem.getInfoAsync(`${docDir}SQLite/hymnes/${v.file}`).catch(() => null);
      if (!info?.exists || info.size === 0) continue;
    }

    try {
      const db = await loadDatabase(v.file, HYMNE_SOURCES[fileName], 'hymnes', isBuiltIn ? 5 : 0);
      const rows: any[] = await db.getAllAsync(
        "SELECT DISTINCT c_playbacks FROM adventiste_cantique WHERE c_playbacks IS NOT NULL AND c_playbacks != '' AND c_playbacks != 'null'"
      );
      for (const r of rows) {
        if (r.c_playbacks) collections.add(String(r.c_playbacks));
      }
    } catch (e) {
      console.log(`Could not read collections from ${v.file}`, e);
    }
  }

  return Array.from(collections);
};

// Refresh every audio manifest referenced by the installed databases.
const updateAllAudioManifests = async (manifest: any): Promise<number> => {
  let count = 0;
  try {
    const collections = await collectInstalledCollections(manifest);
    for (const collectionId of collections) {
      await downloadAudioManifest(collectionId);
      count++;
    }
  } catch (e) {
    console.log('Failed to update audio manifests', e);
  }
  return count;
};

export function HymnDatabaseManager() {
  const { showToast } = useToast();
  const { showAlert } = useAlert();
  const [manifest, setManifest] = useState<any>(null);
  const [localFiles, setLocalFiles] = useState<Record<string, { size: number, exists: boolean, needsUpdate: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<Record<string, number>>({});

  useEffect(() => {
    loadManifest();
  }, []);

  const checkLocalFiles = async (currentManifest?: any) => {
    try {
      const docDir = FileSystem.documentDirectory;
      if (!docDir) return;

      const dbDir = `${docDir}SQLite/hymnes/`;
      const filesState: Record<string, { size: number, exists: boolean, needsUpdate: boolean }> = {};

      const list = currentManifest?.versions || manifest?.versions || [];
      
      // Load installed versions from storage
      const storedVersions = await AsyncStorage.getItem('hymn_installed_versions');
      const installedVersions = storedVersions ? JSON.parse(storedVersions) : {};

      for (const v of list) {
        const path = `${dbDir}${v.file}`;
        const info = await FileSystem.getInfoAsync(path);
        
        // Check if update is needed based on version number in manifest vs local storage
        const currentV = installedVersions[v.id] || 0;
        const needsUpdate = info.exists && v.version && v.version > currentV;

        filesState[v.file.toLowerCase()] = {
          exists: info.exists && info.size > 0,
          size: info.exists ? info.size : 0,
          needsUpdate: !!needsUpdate
        };
      }

      setLocalFiles(filesState);
    } catch (e) {
      console.error(e);
    }
  };

  const loadManifest = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${MANIFEST_URL}?t=${Date.now()}`).catch(() => null);
      let data;
      if (response && response.ok) {
        data = await response.json();
        setManifest(data);
        await AsyncStorage.setItem('hymn_manifest_cache', JSON.stringify(data));
      } else {
        const cached = await AsyncStorage.getItem('hymn_manifest_cache');
        if (cached) data = JSON.parse(cached);
        if (data) setManifest(data);
      }
      if (data) checkLocalFiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const downloadDatabase = async (version: any) => {
    try {
      setDownloading(prev => ({ ...prev, [version.id]: 0 }));

      const docDir = FileSystem.documentDirectory;
      const dbDir = `${docDir}SQLite/hymnes/`;
      const localPath = `${dbDir}${version.file}`;

      if (!(await FileSystem.getInfoAsync(dbDir)).exists) {
        await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
      }

      const callback = (p: any) => {
        setDownloading(prev => ({ ...prev, [version.id]: p.totalBytesWritten / p.totalBytesExpectedToWrite }));
      };

      const downloadResumable = FileSystem.createDownloadResumable(version.url, localPath, {}, callback);
      const result = await downloadResumable.downloadAsync();

      if (result) {
        const header = await FileSystem.readAsStringAsync(localPath, { encoding: FileSystem.EncodingType.UTF8, length: 16 }).catch(() => "");
        if (header.includes("<!DOCTYPE") || !header.includes("SQLite format")) {
          await FileSystem.deleteAsync(localPath, { idempotent: true });
          throw new Error("Lien rompu ou erreur 404.");
        }
        
        // Save the version after successful download
        const storedVersions = await AsyncStorage.getItem('hymn_installed_versions');
        const installedVersions = storedVersions ? JSON.parse(storedVersions) : {};
        installedVersions[version.id] = version.version || 1;
        await AsyncStorage.setItem('hymn_installed_versions', JSON.stringify(installedVersions));

        // Update audio manifests for every collection referenced by installed DBs
        await updateAllAudioManifests(manifest);

        await checkLocalFiles();
        showToast(`${version.name} a été téléchargé avec succès.`, 'success');
      }
    } catch (e: any) {
      console.error(e);
      showToast("Le téléchargement a échoué.", 'error');
    } finally {
      setDownloading(prev => {
        const next = { ...prev };
        delete next[version.id];
        return next;
      });
    }
  };

  const deleteDatabase = async (version: any) => {
    showAlert({
      title: "Supprimer le recueil",
      message: `Voulez-vous vraiment supprimer "${version.name}" ?`,
      type: 'error',
      confirmText: "Oui, supprimer",
      cancelText: "Annuler",
      onConfirm: async () => {
        try {
          const path = `${FileSystem.documentDirectory}SQLite/hymnes/${version.file}`;
          await FileSystem.deleteAsync(path, { idempotent: true });
          await checkLocalFiles();
        } catch (e) {
          showToast("Le fichier n'a pas pu être supprimé.", 'error');
        }
      },
    });
  };

  if (loading && !manifest) return <ActivityIndicator color="#ec4899" />;

  const updateAllAudioManifestsHandler = async () => {
    showAlert({
      title: "Mettre à jour les audio",
      message: "Cela va télécharger les manifests audio pour toutes les bases de données installées. Continuer?",
      confirmText: "Mettre à jour",
      cancelText: "Annuler",
      onConfirm: async () => {
        try {
          const count = await updateAllAudioManifests(manifest);
          showToast(
            count > 0
              ? `Les audio de ${count} collection(s) ont été mis à jour.`
              : "Aucune collection audio trouvée dans les recueils installés.",
            count > 0 ? 'success' : 'info'
          );
        } catch (e) {
          showToast("La mise à jour a échoué.", 'error');
        }
      },
    });
  };

  return (
    <View className="gap-4">
      <TouchableOpacity
        onPress={updateAllAudioManifestsHandler}
        className="bg-blue-600/20 border border-blue-500/30 rounded-2xl p-4 flex-row items-center justify-center"
      >
        <RefreshCw size={18} color="#3b82f6" />
        <Text className="text-blue-400 font-bold text-sm ml-2">Mettre à jour tous les manifests audio</Text>
      </TouchableOpacity>

      {manifest?.versions.map((v: any) => {
        const isBuiltIn = HYMNE_SOURCES[v.file.toLowerCase()];
        const isLocal = localFiles[v.file.toLowerCase()]?.exists || isBuiltIn;
        const isDefault = v.isDefault || v.file.toLowerCase() === 'cantique.db';
        const isDownloading = downloading[v.id] !== undefined;

        const needsUpdate = localFiles[v.file.toLowerCase()]?.needsUpdate;

        return (
          <View
            key={v.id}
            className={`flex-row items-center p-5 rounded-[30px] border ${isLocal ? 'bg-slate-900/50 border-slate-800/50' : 'bg-slate-900/20 border-slate-800/20'}`}
          >
            <View className={`w-14 h-14 rounded-2xl items-center justify-center mr-4 ${isLocal ? 'bg-pink-500/10' : 'bg-slate-800'}`}>
              <Music size={28} color={isLocal ? "#ec4899" : "#475569"} />
            </View>
            <View className="flex-1">
              <Text className={`text-lg font-bold ${isLocal ? 'text-white' : 'text-slate-500'}`} style={{ fontFamily: 'Lexend_700Bold' }}>{v.name}</Text>
              <Text className="text-xs text-slate-600 mt-1">{v.language} • {v.size}</Text>
            </View>

            <View className="flex-row items-center">
              {isDownloading ? (
                <View className="items-end mr-2">
                  <ActivityIndicator size="small" color="#ec4899" />
                </View>
              ) : isLocal ? (
                <>
                  <TouchableOpacity
                    onPress={() => downloadDatabase(v)}
                    className={`w-10 h-10 rounded-xl items-center justify-center mr-2 border ${needsUpdate ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/50' : 'bg-blue-600/20 border-blue-500/30'}`}
                  >
                    <RefreshCw size={18} color={needsUpdate ? "white" : "#3b82f6"} />
                  </TouchableOpacity>
                  {!isDefault && (
                    <TouchableOpacity
                      onPress={() => deleteDatabase(v)}
                      className="w-10 h-10 rounded-xl bg-red-500/10 items-center justify-center mr-2 border border-red-500/20"
                    >
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                  <View className="w-8 h-8 rounded-full bg-green-500/10 items-center justify-center">
                    <CheckCircle2 size={18} color="#10b981" />
                  </View>
                </>
              ) : (
                <TouchableOpacity
                  onPress={() => downloadDatabase(v)}
                  className="w-10 h-10 rounded-xl bg-pink-600 items-center justify-center shadow-lg"
                >
                  <CloudDownload size={20} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
