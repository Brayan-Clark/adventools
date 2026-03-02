import { useTranslation } from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BookOpen, ChevronRight, Music, Plus } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HymneManager() {
  const router = useRouter();
  const { t } = useTranslation();
  const [localFiles, setLocalFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      checkLocalFiles();
    }, [])
  );

  const checkLocalFiles = async () => {
    try {
      setLoading(true);
      const docDir = FileSystem.documentDirectory;
      if (!docDir) return;

      const rootDbDir = `${docDir}SQLite`;
      const hymnDbDir = `${docDir}SQLite/hymnes`;

      if (!(await FileSystem.getInfoAsync(hymnDbDir)).exists) {
        await FileSystem.makeDirectoryAsync(hymnDbDir, { intermediates: true });
      }

      let manifestData: any = null;
      try {
        const cached = await AsyncStorage.getItem('hymn_manifest_cache');
        if (cached) manifestData = JSON.parse(cached);

        const MANIFEST_URL = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/hymnes/manifest.json';
        const response = await fetch(`${MANIFEST_URL}?t=${Date.now()}`).catch(() => null);
        if (response && response.ok) {
          manifestData = await response.json();
          await AsyncStorage.setItem('hymn_manifest_cache', JSON.stringify(manifestData));
        }
      } catch (e) {
        console.log("Could not load manifest for filtering");
      }

      const validHymnFiles = manifestData?.versions?.map((v: any) => v.file.toLowerCase()) || [];

      let presentFiles: any[] = [];

      const scanDirs = [rootDbDir, hymnDbDir];
      const foundFilesSet = new Set<string>();

      for (const dir of scanDirs) {
        if ((await FileSystem.getInfoAsync(dir)).exists) {
          const files = await FileSystem.readDirectoryAsync(dir);
          for (const file of files) {
            if (file.endsWith('.db')) {
              const fileNameLower = file.toLowerCase();
              if (foundFilesSet.has(fileNameLower)) continue;

              const isDefault = fileNameLower === 'cantique.db';
              const isInManifest = validHymnFiles.includes(fileNameLower);

              if (isDefault || isInManifest) {
                const fileInfo = await FileSystem.getInfoAsync(`${dir}/${file}`);
                if (fileInfo.exists && fileInfo.size > 0) {
                  foundFilesSet.add(fileNameLower);
                  let displayName = file.replace('.db', '').replace(/_/g, ' ');
                  if (isDefault) {
                    displayName = t('default_hymnal_name');
                  } else if (isInManifest && manifestData) {
                    const version = manifestData.versions.find((v: any) => v.file.toLowerCase() === fileNameLower);
                    if (version) displayName = version.name;
                  }

                  presentFiles.push({
                    file,
                    name: displayName,
                    size: (fileInfo.size / 1024).toFixed(0) + " KB",
                    isDefault,
                    fullPath: `${dir}/${file}`
                  });
                }
              }
            }
          }
        }
      }

      setLocalFiles(presentFiles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteHymnSource = async (version: any) => {
    if (version.isDefault) {
      Alert.alert(t('action_impossible'), t('cannot_delete_default_hymnal'));
      return;
    }

    Alert.alert(
      t('delete_hymnal') + ' : ' + version.name,
      t('delete_hymnal_data_warning'),
      [
        { text: t('cancel'), style: "cancel" },
        {
          text: t('keep_my_data'),
          onPress: async () => {
            try {
              const rootPath = `${FileSystem.documentDirectory}SQLite/${version.file}`;
              const hymnPath = `${FileSystem.documentDirectory}SQLite/hymnes/${version.file}`;
              await FileSystem.deleteAsync(rootPath, { idempotent: true });
              await FileSystem.deleteAsync(hymnPath, { idempotent: true });
              checkLocalFiles();
            } catch (e) { console.error(e); }
          }
        },
        {
          text: t('delete_all'),
          style: "destructive",
          onPress: async () => {
            try {
              const rootPath = `${FileSystem.documentDirectory}SQLite/${version.file}`;
              const hymnPath = `${FileSystem.documentDirectory}SQLite/hymnes/${version.file}`;
              await FileSystem.deleteAsync(rootPath, { idempotent: true });
              await FileSystem.deleteAsync(hymnPath, { idempotent: true });
              await AsyncStorage.removeItem(`hymn_favorites_${version.file}`);
              checkLocalFiles();
            } catch (e) { console.error(e); }
          }
        }
      ]
    );
  };

  const openLibrary = (version: any) => {
    router.push({
      pathname: '/hymnes/library',
      params: { db: version.file, title: version.name }
    });
  };

  if (loading && localFiles.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background-dark justify-center items-center">
        <ActivityIndicator size="large" color="#ec4899" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />

      <View className="px-6 py-6 flex-row items-center justify-between border-b border-slate-800/50">
        <View>
          <Text className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>{t('my_hymnals')}</Text>
          <Text className="text-slate-500 text-xs mt-1">{t('manage_local_songs')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/hymnes/store')}
          className="bg-pink-600 px-4 py-2 rounded-full flex-row items-center"
        >
          <Plus size={16} color="white" className="mr-1" />
          <Text className="text-white font-bold text-xs uppercase">{t('store')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="gap-4 pb-20">
          {localFiles.map((item: any) => (
            <View
              key={item.file}
              className="flex-row items-center bg-slate-900/50 border border-slate-800/50 rounded-[25px] overflow-hidden"
            >
              <TouchableOpacity
                onPress={() => openLibrary(item)}
                className="flex-1 flex-row items-center p-4"
              >
                <View className="w-10 h-10 rounded-xl bg-pink-500/10 items-center justify-center mr-3">
                  <Music size={20} color="#ec4899" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }} numberOfLines={1}>{item.name}</Text>
                  <Text className="text-[10px] text-slate-500 mt-0.5">{item.isDefault ? t('integrated_hymnal') : item.size}</Text>
                </View>
                <ChevronRight size={16} color="#475569" className="ml-2" />
              </TouchableOpacity>

            </View>
          ))}

          {localFiles.length === 0 && !loading && (
            <View className="py-20 items-center opacity-50">
              <BookOpen size={64} color="#475569" />
              <Text className="text-slate-400 mt-4 font-bold">{t('no_hymnal_found')}</Text>
              <TouchableOpacity onPress={() => router.push('/hymnes/store')} className="mt-4">
                <Text className="text-pink-500 font-bold uppercase text-xs">{t('go_to_store')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
