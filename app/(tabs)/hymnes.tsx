import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BookOpen, ChevronRight, CloudDownload, Globe, Music, RefreshCw } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MANIFEST_URL = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/hymnes/manifest.json';

export default function HymneSelector() {
  const router = useRouter();
  const { manage } = useLocalSearchParams();
  const [manifest, setManifest] = useState<any>(null);
  const [localFiles, setLocalFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    loadManifest();
    checkLocalFiles();
  }, []);

  const checkLocalFiles = async (currentManifest?: any) => {
    try {
      const docDir = FileSystem.documentDirectory;
      if (!docDir) return;

      const dbDir = `${docDir}SQLite`;
      const dirInfo = await FileSystem.getInfoAsync(dbDir);

      let presentFiles: string[] = [];
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(dbDir);
        presentFiles = files.filter(f => f.endsWith('.db'));
      }

      const activeManifest = currentManifest || manifest;
      const manifestVersions = activeManifest?.versions || [];

      const hymnFiles = presentFiles.filter(f =>
        manifestVersions.some((v: any) => v.file.toLowerCase() === f.toLowerCase())
      );

      setLocalFiles(hymnFiles);
    } catch (e) {
      console.error("Error checking local hymn files:", e);
    }
  };

  const loadManifest = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
      let data;
      if (response.ok) {
        data = await response.json();
        setManifest(data);
        await AsyncStorage.setItem('hymn_manifest_cache', JSON.stringify(data));
      } else {
        const cached = await AsyncStorage.getItem('hymn_manifest_cache');
        if (cached) data = JSON.parse(cached);
        if (data) setManifest(data);
      }

      if (data) await checkLocalFiles(data);
    } catch (e) {
      console.error("Manifest load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const downloadDatabase = async (version: any) => {
    try {
      setDownloading(prev => ({ ...prev, [version.id]: 0 }));

      const docDir = FileSystem.documentDirectory;
      const dbDir = `${docDir}SQLite/`;
      const localPath = `${dbDir}${version.file}`;

      const dirInfo = await FileSystem.getInfoAsync(dbDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
      }

      const callback = (downloadProgress: any) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        setDownloading(prev => ({ ...prev, [version.id]: progress }));
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        version.url,
        localPath,
        {},
        callback
      );

      const result = await downloadResumable.downloadAsync();
      if (result) {
        await checkLocalFiles();
        Alert.alert("Succès", `${version.name} a été téléchargé.`);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Le téléchargement a échoué.");
    } finally {
      setDownloading(prev => {
        const next = { ...prev };
        delete next[version.id];
        return next;
      });
    }
  };

  const openLibrary = (db: string) => {
    router.push({
      pathname: '/hymnes/library',
      params: { db }
    });
  };

  if (loading && !manifest) {
    return (
      <SafeAreaView className="flex-1 bg-background-dark justify-center items-center">
        <ActivityIndicator size="large" color="#ec4899" />
      </SafeAreaView>
    );
  }

  const versions = manifest?.versions || [];
  const isOnlyOneSource = versions.length === 1;
  const theOnlySource = versions[0];
  const isTheOnlySourceLocal = theOnlySource && localFiles.some(f => f.toLowerCase() === theOnlySource.file.toLowerCase());

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />

      <View className="px-6 py-6 flex-row items-center justify-between border-b border-slate-800/50">
        <View>
          <Text className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>Hymnes</Text>
          <Text className="text-slate-500 text-xs mt-1">
            {isOnlyOneSource ? theOnlySource.name : "Choisissez votre recueil"}
          </Text>
        </View>
        <TouchableOpacity onPress={loadManifest} className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center">
          <RefreshCw size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {isOnlyOneSource ? (
          <View className="flex-1 px-8 pt-20 items-center justify-center">
            <View className="w-32 h-32 rounded-[40px] bg-pink-500/10 items-center justify-center mb-10 border border-pink-500/20 shadow-2xl shadow-pink-500/20">
              <Music size={60} color="#ec4899" />
            </View>

            <Text className="text-2xl font-bold text-white text-center mb-2" style={{ fontFamily: 'Lexend_700Bold' }}>{theOnlySource.name}</Text>
            <Text className="text-slate-400 text-center mb-10 leading-6 px-4">
              {isTheOnlySourceLocal
                ? "Votre recueil de chants est prêt. Cliquez ci-dessous pour commencer à chanter."
                : "Ce recueil de chants doit être téléchargé avant d'être utilisé."}
            </Text>

            {isTheOnlySourceLocal ? (
              <TouchableOpacity
                onPress={() => openLibrary(theOnlySource.file)}
                className="w-full bg-pink-500 py-5 rounded-[25px] flex-row items-center justify-center shadow-xl shadow-pink-500/30"
              >
                <BookOpen size={24} color="white" className="mr-3" />
                <Text className="text-white font-bold text-lg">Ouvrir le Recueil</Text>
              </TouchableOpacity>
            ) : (
              <DownloadButton
                version={theOnlySource}
                onPress={() => downloadDatabase(theOnlySource)}
                progress={downloading[theOnlySource.id]}
              />
            )}

            <View className="mt-12 flex-row items-center bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
              <Globe size={14} color="#64748b" className="mr-2" />
              <Text className="text-xs text-slate-500 uppercase font-bold tracking-widest">{theOnlySource.language} • {theOnlySource.size}</Text>
            </View>
          </View>
        ) : (
          <View className="px-6 pt-6">
            <Text className="text-[10px] font-bold uppercase text-slate-500 mb-4 ml-2 tracking-widest">Recueils Disponibles</Text>
            <View className="gap-4 pb-20">
              {versions.map((version: any) => {
                const isLocal = localFiles.some(f => f.toLowerCase() === version.file.toLowerCase());
                const isDownloading = downloading[version.id] !== undefined;

                return (
                  <TouchableOpacity
                    key={version.id}
                    onPress={() => isLocal ? openLibrary(version.file) : downloadDatabase(version)}
                    className={`flex-row items-center p-5 rounded-[30px] border ${isLocal ? 'bg-slate-900/50 border-slate-800/50' : 'bg-slate-900/20 border-slate-800/20'}`}
                  >
                    <View className={`w-14 h-14 rounded-2xl items-center justify-center mr-4 ${isLocal ? 'bg-pink-500/10' : 'bg-slate-800'}`}>
                      {isLocal ? <Music size={28} color="#ec4899" /> : <BookOpen size={28} color="#475569" />}
                    </View>
                    <View className="flex-1">
                      <Text className={`text-lg font-bold ${isLocal ? 'text-white' : 'text-slate-500'}`} style={{ fontFamily: 'Lexend_700Bold' }}>{version.name}</Text>
                      <Text className="text-xs text-slate-600 mt-1">{version.language} {isLocal ? '• Installé' : `• ${version.size}`}</Text>
                    </View>

                    {isDownloading ? (
                      <View className="w-12 h-12 items-center justify-center">
                        <ActivityIndicator size="small" color="#ec4899" />
                      </View>
                    ) : (
                      <View className={`w-10 h-10 rounded-full items-center justify-center ${isLocal ? 'bg-slate-800' : 'bg-pink-600/10 border border-pink-500/20'}`}>
                        {isLocal ? <ChevronRight size={18} color="#475569" /> : <CloudDownload size={20} color="#ec4899" />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <AutoRedirect
        localFiles={localFiles}
        loading={loading}
        manifest={manifest}
        manage={manage}
      />
    </SafeAreaView>
  );
}

function DownloadButton({ version, onPress, progress }: { version: any, onPress: () => void, progress: number | undefined }) {
  const isDownloading = progress !== undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDownloading}
      className={`w-full py-5 rounded-[25px] flex-row items-center justify-center shadow-xl ${isDownloading ? 'bg-slate-800' : 'bg-pink-600 shadow-pink-600/20'}`}
    >
      {isDownloading ? (
        <>
          <ActivityIndicator size="small" color="#ec4899" className="mr-3" />
          <Text className="text-slate-400 font-bold text-lg">Téléchargement {Math.round(progress * 100)}%</Text>
        </>
      ) : (
        <>
          <CloudDownload size={24} color="white" className="mr-3" />
          <Text className="text-white font-bold text-lg">Télécharger le recueil</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function AutoRedirect({ localFiles, loading, manifest, manage }: any) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!loading && manifest?.versions?.length === 1 && !done && manage !== 'true') {
      const theOnlySource = manifest.versions[0];
      const isLocal = localFiles.some((f: string) => f.toLowerCase() === theOnlySource.file.toLowerCase());

      if (isLocal) {
        router.replace({
          pathname: '/hymnes/library',
          params: { db: theOnlySource.file }
        });
        setDone(true);
      }
    }
  }, [loading, localFiles, manifest, done, manage]);

  return null;
}
