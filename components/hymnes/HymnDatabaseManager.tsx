import { HYMNE_SOURCES } from '@/lib/hymnes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { CheckCircle2, CloudDownload, Music, RefreshCw, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';

const MANIFEST_URL = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/hymnes/manifest.json';

export function HymnDatabaseManager() {
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

        await checkLocalFiles();
        Alert.alert("Vita", `${version.name} dia voasintona soa aman-tsara.`);
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert("Hadisoana", "Tsy tontolo ny fampidinana.");
    } finally {
      setDownloading(prev => {
        const next = { ...prev };
        delete next[version.id];
        return next;
      });
    }
  };

  const deleteDatabase = async (version: any) => {
    Alert.alert(
      "Hamafa fihirana",
      `Tena hovonoina ve ny "${version.name}"?`,
      [
        { text: "Hanafoana", style: "cancel" },
        {
          text: "Eny, fafao",
          style: "destructive",
          onPress: async () => {
            try {
              const path = `${FileSystem.documentDirectory}SQLite/hymnes/${version.file}`;
              await FileSystem.deleteAsync(path, { idempotent: true });
              await checkLocalFiles();
            } catch (e) {
              Alert.alert("Hadisoana", "Tsy voafafa ny rakitra.");
            }
          }
        }
      ]
    );
  };

  if (loading && !manifest) return <ActivityIndicator color="#ec4899" />;

  return (
    <View className="gap-4">
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
