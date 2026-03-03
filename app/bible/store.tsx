import { BibleConfig, getAvailableBibles } from '@/lib/bible';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, CloudDownload, Info, RefreshCcw, Search, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MANIFEST_URL = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/bible/manifest.json';

export default function BibleStore() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [manifest, setManifest] = useState<BibleConfig[]>([]);
  const [installed, setInstalled] = useState<BibleConfig[]>([]);
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch available installed bibles
      const available = await getAvailableBibles();
      setInstalled(available);

      // 2. Load cached manifest if exists
      const cached = await AsyncStorage.getItem('adventools_bible_manifest_cache');
      if (cached) setManifest(JSON.parse(cached));

      // 3. Fetch manifest from GitHub
      const response = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        const versions = data.versions || [];
        setManifest(versions);
        await AsyncStorage.setItem('adventools_bible_manifest_cache', JSON.stringify(versions));
      }
    } catch (e) {
      console.error(e);
      // No alert here, we just use the cache if possible
    } finally {
      setLoading(false);
    }
  };

  const getDisplayList = () => {
    // Merge manifest and installed
    // Ensure every installed bible that's NOT in manifest is added to manifest for management (deletion)
    const list = [...manifest];
    installed.forEach(inst => {
      if (!list.find(m => m.id === inst.id)) {
        list.push(inst);
      }
    });

    return list.filter(v =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.language.toLowerCase().includes(search.toLowerCase())
    );
  };

  const downloadBible = async (version: BibleConfig) => {
    if (!version.url) return;

    try {
      setDownloading(prev => ({ ...prev, [version.id]: 0 }));

      const docDir = FileSystem.documentDirectory;
      const dbDir = `${docDir}SQLite/bibles`;

      const dirInfo = await FileSystem.getInfoAsync(dbDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
      }

      const fileUri = `${dbDir}/${version.file}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        version.url,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesExpectedToWrite > 0
            ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
            : 0;
          setDownloading(prev => ({ ...prev, [version.id]: Math.round(progress * 100) }));
        }
      );

      const downloadRes = await downloadResumable.downloadAsync();

      if (!downloadRes || downloadRes.status !== 200) {
        throw new Error(`Download failed with status ${downloadRes?.status}`);
      }

      // Update installed list in AsyncStorage
      const stored = await AsyncStorage.getItem('adventools_bibles_installed');
      let currentInstalled = stored ? JSON.parse(stored) : [];

      // Remove if already exists (update)
      currentInstalled = currentInstalled.filter((b: any) => b.id !== version.id);
      currentInstalled.push(version);

      await AsyncStorage.setItem('adventools_bibles_installed', JSON.stringify(currentInstalled));

      setInstalled(prev => [...prev.filter(b => b.id !== version.id), version]);
      Alert.alert("Succès", `La bible ${version.name} a été installée.`);
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

  const deleteBible = async (versionId: string) => {
    // Prevent deleting the default built-in bible
    if (versionId === 'MG') {
      Alert.alert("Information", "La version officielle ne peut pas être supprimée.");
      return;
    }

    Alert.alert(
      "Suppression",
      "Voulez-vous vraiment supprimer cette version ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui",
          style: "destructive",
          onPress: async () => {
            try {
              const version = installed.find(b => b.id === versionId);
              if (!version) return;

              const docDir = FileSystem.documentDirectory;
              const filePath = `${docDir}SQLite/bibles/${version.file}`;

              await FileSystem.deleteAsync(filePath, { idempotent: true });

              const stored = await AsyncStorage.getItem('adventools_bibles_installed');
              let currentInstalled = stored ? JSON.parse(stored) : [];
              currentInstalled = currentInstalled.filter((b: any) => b.id !== versionId);
              await AsyncStorage.setItem('adventools_bibles_installed', JSON.stringify(currentInstalled));

              setInstalled(prev => prev.filter(b => b.id !== versionId));
            } catch (e) {
              console.error(e);
            }
          }
        }
      ]
    );
  };

  const displayList = getDisplayList();

  return (
    <SafeAreaView className="flex-1 bg-[#0f172a]">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-white/5 bg-[#0f172a]">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10 mr-4">
          <ArrowLeft size={20} color="#cbd5e1" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>
            Bibles
          </Text>
          <Text className="text-slate-500 text-xs">Télécharger d'autres versions</Text>
        </View>
        <TouchableOpacity onPress={fetchData} className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center border border-blue-500/20">
          <RefreshCcw size={18} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View className="px-6 py-4">
        <View className="bg-slate-900 border border-white/10 rounded-2xl px-4 flex-row items-center">
          <Search size={18} color="#64748b" />
          <TextInput
            placeholder="Rechercher une langue ou version..."
            placeholderTextColor="#475569"
            className="flex-1 h-12 ml-3 text-white font-medium"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-slate-500 mt-4">Chargement de la liste...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pb-10" showsVerticalScrollIndicator={false}>
          {/* Info Card */}
          <View className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6 flex-row items-center">
            <Info size={20} color="#3b82f6" className="mr-3" />
            <Text className="text-blue-200 text-xs flex-1">
              La version Malagasy est déjà incluse dans l'application et peut être utilisée hors-ligne.
            </Text>
          </View>

          {displayList.length === 0 ? (
            <View className="py-20 items-center">
              <Text className="text-slate-500">Aucun résultat trouvé.</Text>
            </View>
          ) : (
            displayList.map((item) => {
              const isInstalled = installed.some(b => b.id === item.id);
              const isDownloading = downloading[item.id] !== undefined;

              return (
                <View key={item.id} className="bg-slate-900/50 border border-white/5 rounded-3xl mb-4 overflow-hidden">
                  <View className="p-5 flex-row items-center">
                    <View className="w-12 h-12 rounded-2xl bg-slate-800 items-center justify-center mr-4 border border-white/5">
                      <Text className="text-blue-400 font-bold text-lg">{item.id.substring(0, 2)}</Text>
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-white font-bold text-base">{item.language}</Text>
                        {item.id === 'MG' && (
                          <View className="ml-2 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">
                            <Text className="text-blue-400 text-[8px] font-bold uppercase">Ofisialy</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-slate-500 text-xs">{item.name}</Text>
                    </View>

                    {isDownloading ? (
                      <View className="items-center min-w-[70px]">
                        {/* Progress bar */}
                        <View className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden mb-1">
                          <View
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.max(5, downloading[item.id] || 0)}%` }}
                          />
                        </View>
                        <Text className="text-blue-400 text-xs font-bold">
                          {downloading[item.id] !== undefined ? `${downloading[item.id]}%` : '...'}
                        </Text>
                      </View>
                    ) : isInstalled ? (
                      <View className="flex-row items-center">
                        <TouchableOpacity
                          onPress={() => downloadBible(item)}
                          className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 items-center justify-center mr-2"
                        >
                          <RefreshCcw size={16} color="#3b82f6" />
                        </TouchableOpacity>
                        {item.id !== 'MG' && (
                          <TouchableOpacity
                            onPress={() => deleteBible(item.id)}
                            className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 items-center justify-center"
                          >
                            <Trash2 size={16} color="#f87171" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => downloadBible(item)}
                        className="bg-blue-600 px-4 py-2 rounded-xl flex-row items-center"
                      >
                        <CloudDownload size={16} color="white" className="mr-2" />
                        <Text className="text-white font-bold text-sm">Télécharger</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
          <View className="h-10" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
