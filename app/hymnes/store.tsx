import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle2, ChevronLeft, CloudDownload, Music, RefreshCw } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MANIFEST_URL = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/hymnes/manifest.json';

export default function HymneStore() {
  const router = useRouter();
  const [manifest, setManifest] = useState<any>(null);
  const [localFiles, setLocalFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<Record<string, number>>({});

  useEffect(() => {
    loadManifest();
    checkLocalFiles();
  }, []);

  const checkLocalFiles = async (currentManifest?: any) => {
    try {
      const docDir = FileSystem.documentDirectory;
      if (!docDir) return;

      const rootDbDir = `${docDir}SQLite`;
      const hymnDbDir = `${docDir}SQLite/hymnes`;

      let presentFiles: string[] = [];
      const scanDirs = [rootDbDir, hymnDbDir];

      for (const dir of scanDirs) {
        if ((await FileSystem.getInfoAsync(dir)).exists) {
          const files = await FileSystem.readDirectoryAsync(dir);
          for (const file of files) {
            if (file.endsWith('.db')) {
              const fileInfo = await FileSystem.getInfoAsync(`${dir}/${file}`);
              if (fileInfo.exists && fileInfo.size > 0) {
                presentFiles.push(file.toLowerCase());
              }
            }
          }
        }
      }

      setLocalFiles(presentFiles);
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
        await checkLocalFiles();
        Alert.alert("Succès", `${version.name} a été téléchargé.`);
      }
    } catch (e: any) {
      console.error(e);
      let errorMsg = "Le téléchargement a échoué.";

      if (e.message?.includes("Network request failed") || e.message?.includes("network")) {
        errorMsg = "Impossible de se connecter au serveur. Vérifiez votre connexion internet.";
      } else if (e.message) {
        errorMsg = e.message;
      }

      Alert.alert("Erreur", errorMsg);

      if (version?.file) {
        const path = `${FileSystem.documentDirectory}SQLite/hymnes/${version.file}`;
        await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => { });
      }
    } finally {
      setDownloading(prev => {
        const next = { ...prev };
        delete next[version.id];
        return next;
      });
    }
  };

  if (loading && !manifest) {
    return (
      <SafeAreaView className="flex-1 bg-background-dark justify-center items-center">
        <ActivityIndicator size="large" color="#ec4899" />
      </SafeAreaView>
    );
  }

  const versions = manifest?.versions || [];

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />

      <View className="px-6 py-6 flex-row items-center justify-between border-b border-slate-800/50">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center">
            <ChevronLeft size={20} color="#94a3b8" />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>Boutique Hymnes</Text>
            <Text className="text-slate-500 text-xs mt-1">Recueils disponibles en ligne</Text>
          </View>
        </View>
        <TouchableOpacity onPress={loadManifest} className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center">
          <RefreshCw size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="gap-4 pb-20">
          {versions.map((version: any) => {
            const isLocal = localFiles.some(f => f.toLowerCase() === version.file.toLowerCase());
            const isDownloading = downloading[version.id] !== undefined;
            const displayName = version.file === 'cantique.db' ? "Fihirana Advantista" : version.name;

            return (
              <View
                key={version.id}
                className={`flex-row items-center p-5 rounded-[30px] border ${isLocal ? 'bg-slate-900/50 border-slate-800/50' : 'bg-slate-900/20 border-slate-800/20'}`}
              >
                <View className={`w-14 h-14 rounded-2xl items-center justify-center mr-4 ${isLocal ? 'bg-pink-500/10' : 'bg-slate-800'}`}>
                  <Music size={28} color={isLocal ? "#ec4899" : "#475569"} />
                </View>
                <View className="flex-1">
                  <Text className={`text-lg font-bold ${isLocal ? 'text-white' : 'text-slate-500'}`} style={{ fontFamily: 'Lexend_700Bold' }}>{displayName}</Text>
                  <Text className="text-xs text-slate-600 mt-1">{version.language} • {version.size}</Text>
                </View>

                {isDownloading ? (
                  <View className="items-end">
                    <Text className="text-[10px] text-pink-500 font-bold mb-1">{Math.round(downloading[version.id] * 100)}%</Text>
                    <ActivityIndicator size="small" color="#ec4899" />
                  </View>
                ) : isLocal ? (
                  <View className="w-10 h-10 rounded-full bg-green-500/10 items-center justify-center">
                    <CheckCircle2 size={18} color="#10b981" />
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => downloadDatabase(version)}
                    className="w-10 h-10 rounded-xl bg-pink-600 items-center justify-center shadow-lg"
                  >
                    <CloudDownload size={20} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
