import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Play, Download, Search, Users, Trash2, Smartphone, CheckCircle } from 'lucide-react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import { useSettings } from '../../../lib/settings-context';
import { useTranslation } from '../../../lib/i18n';

const SERIES_BASE_URL = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/etudes/';

interface Lesson {
  id: string;
  title: string;
  author: string;
  url: string;
  size?: string;
}

const ETUDES_DIR = `${FileSystem.documentDirectory}etudes/`;
const METADATA_FILE = `${ETUDES_DIR}metadata.json`;
const CACHE_FILE = (id: string) => `${ETUDES_DIR}cache_${id}.json`;

export default function EtudesLessonsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams() as any;
  const { series: seriesId, title: seriesTitle, author: seriesAuthor } = params;
  
  const { settings: globalSettings } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  const [downloadedLessons, setDownloadedLessons] = useState<Record<string, boolean>>({});
  const [downloadingProgress, setDownloadingProgress] = useState<Record<string, number>>({});

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  useEffect(() => {
    initAndLoad();
  }, [seriesId]);

  const initAndLoad = async () => {
    await initFileSystem();
    await fetchLessons();
  };

  const initFileSystem = async () => {
    try {
      if (!(await FileSystem.getInfoAsync(ETUDES_DIR)).exists) {
        await FileSystem.makeDirectoryAsync(ETUDES_DIR, { intermediates: true });
      } else if ((await FileSystem.getInfoAsync(METADATA_FILE)).exists) {
        const content = await FileSystem.readAsStringAsync(METADATA_FILE);
        setDownloadedLessons(JSON.parse(content));
      }
    } catch (e) {}
  };

  const fetchLessons = async () => {
    setIsRefreshing(true);
    try {
      const cachePath = CACHE_FILE(seriesId);
      const net = await NetInfo.fetch();

      // Try to load from cache first if we are offline or just to show something fast
      if (await FileSystem.getInfoAsync(cachePath).then(i => i.exists)) {
        const cachedContent = await FileSystem.readAsStringAsync(cachePath);
        setLessons(JSON.parse(cachedContent));
      }

      if (net.isConnected) {
        const res = await fetch(`${SERIES_BASE_URL}${seriesId}.json?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setLessons(data);
          // Save to cache for offline use
          await FileSystem.writeAsStringAsync(cachePath, JSON.stringify(data));
        }
      }
    } catch (e) {
      console.log('Series fetch error', e);
    }
    setIsRefreshing(false);
  };

  const downloadAll = async () => {
    const toDownload = lessons.filter(l => !downloadedLessons[getAudioKey(l.id)]);
    if (toDownload.length === 0) {
      Alert.alert(t('info'), t('all_downloaded'));
      return;
    }

    Alert.alert(
      t('download_all'),
      `${t('download_all_confirm')} (${toDownload.length} files)`,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('download'), onPress: async () => {
             for (const l of toDownload) {
                await downloadLesson(l);
             }
        }}
      ]
    );
  };

  const deleteAll = async () => {
    const toDelete = lessons.filter(l => downloadedLessons[getAudioKey(l.id)]);
    if (toDelete.length === 0) return;

    Alert.alert(
      t('delete'),
      `${t('delete_audio_confirm')} (${toDelete.length} files)`,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: async () => {
            try {
              for (const l of toDelete) {
                await FileSystem.deleteAsync(getLocalFileUri(l.id), { idempotent: true });
              }
              const newMeta = { ...downloadedLessons };
              toDelete.forEach(l => delete newMeta[getAudioKey(l.id)]);
              setDownloadedLessons(newMeta);
              await FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(newMeta));
            } catch (e) {}
        }}
      ]
    );
  };

  const filteredLessons = useMemo(() => {
    return lessons.filter(lesson => 
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [lessons, searchQuery]);

  const getLocalFileUri = (id: string) => `${ETUDES_DIR}${seriesId}_${id}.mp3`;
  const getAudioKey = (id: string) => `${seriesId}-${id}`;

  const downloadLesson = async (lesson: Lesson) => {
    const key = getAudioKey(lesson.id);
    try {
      const fileUri = getLocalFileUri(lesson.id);
      const downloadResumable = FileSystem.createDownloadResumable(
        lesson.url, fileUri, {},
        (dp) => {
          const progress = dp.totalBytesWritten / dp.totalBytesExpectedToWrite;
          setDownloadingProgress(prev => ({ ...prev, [key]: progress }));
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (result && result.status === 200) {
        setDownloadedLessons(prev => {
            const next = { ...prev, [key]: true };
            FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(next)).catch(() => {});
            return next;
        });
      }
    } catch (e) {
      Alert.alert(t('error'), t('download_failed'));
    }
    setDownloadingProgress(prev => { const n = {...prev}; delete n[key]; return n; });
  };

  const deleteLesson = (lesson: Lesson) => {
    const key = getAudioKey(lesson.id);
    Alert.alert(t('delete'), t('delete_audio_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
          try {
            await FileSystem.deleteAsync(getLocalFileUri(lesson.id), { idempotent: true });
            const newMeta = { ...downloadedLessons };
            delete newMeta[key];
            setDownloadedLessons(newMeta);
            await FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(newMeta));
          } catch (e) {}
      }}
    ]);
  };

  const playLesson = (lesson: Lesson) => {
    const isLocal = !!downloadedLessons[getAudioKey(lesson.id)];
    const currentIndex = filteredLessons.findIndex(l => l.id === lesson.id);
    const playlistData = filteredLessons.map(l => ({
        id: l.id,
        title: l.title,
        url: downloadedLessons[getAudioKey(l.id)] ? getLocalFileUri(l.id) : l.url,
        isLocal: !!downloadedLessons[getAudioKey(l.id)],
        subtext: seriesTitle,
        artwork: params.artwork
    }));

    router.push({
      pathname: '/audio/player',
      params: {
        title: lesson.title,
        url: isLocal ? getLocalFileUri(lesson.id) : lesson.url,
        isLocal: isLocal ? 'true' : 'false',
        subtext: `${seriesTitle} • ${lesson.author}`,
        index: currentIndex.toString(),
        artwork: params.artwork,
        playlist: JSON.stringify(playlistData)
      }
    });
  };

  const renderLessonItem = ({ item }: { item: Lesson }) => {
    const key = getAudioKey(item.id);
    const isDownloaded = !!downloadedLessons[key];
    const progress = downloadingProgress[key];
    const isDownloading = progress !== undefined;

    return (
      <View className="bg-slate-900/40 rounded-2xl mb-3 border border-slate-800/40 overflow-hidden">
        <TouchableOpacity 
          onPress={() => playLesson(item)}
          className="p-4 flex-row items-center"
        >
          <View className={`w-12 h-12 rounded-xl items-center justify-center ${isDownloaded ? 'bg-violet-500/20' : 'bg-slate-800'}`}>
             <Play size={22} color={isDownloaded ? '#a78bfa' : '#3b82f6'} fill={isDownloaded ? '#a78bfa' : 'transparent'} opacity={0.9} />
          </View>
          
          <View className="ml-4 flex-1">
            <Text className="text-white font-bold text-sm" numberOfLines={2} style={{ fontFamily: fontFamilyBold }}>{item.title}</Text>
            <View className="flex-row items-center mt-1">
               <Text className={`text-[10px] font-bold ${isDownloaded ? 'text-violet-400' : 'text-slate-500'}`} style={{ fontFamily: fontFamilyBold }}>
                 {isDownloaded ? t('stored') : t('online')} • {item.size || '--- MB'}
               </Text>
            </View>
          </View>

          {isDownloading ? (
            <View className="items-center mr-2">
                <ActivityIndicator size="small" color="#8b5cf6" />
            </View>
          ) : (
            <TouchableOpacity 
              onPress={() => isDownloaded ? deleteLesson(item) : downloadLesson(item)}
              className="w-10 h-10 items-center justify-center"
            >
              {isDownloaded ? (
                <Trash2 size={16} color="#ef4444" />
              ) : (
                <Download size={16} color="#64748b" />
              )}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="px-6 py-4 border-b border-slate-800/30">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center"
          >
            <ChevronLeft size={20} color="#f8fafc" />
          </TouchableOpacity>
          <View className="flex-1 px-4 items-center">
            <Text className="text-white font-bold text-lg text-center" numberOfLines={1} style={{ fontFamily: fontFamilyBold }}>{seriesTitle}</Text>
          </View>
          <View className="w-10 h-10" />
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3">
          <Search size={18} color="#64748b" />
          <TextInput 
            placeholder={t('search_series')} 
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-white text-sm"
            style={{ fontFamily }}
          />
        </View>
      </View>

      <FlatList 
        data={filteredLessons}
        keyExtractor={item => item.id}
        renderItem={renderLessonItem}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={fetchLessons}
        ListHeaderComponent={
           <View className="mb-6">
             <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Users size={14} color="#a78bfa" />
                  <Text className="text-violet-400 text-xs ml-2 font-bold uppercase tracking-widest" style={{ fontFamily }}>{seriesAuthor}</Text>
                </View>

                <View className="flex-row items-center">
                  {lessons.some(l => downloadedLessons[getAudioKey(l.id)]) && (
                    <TouchableOpacity 
                      onPress={deleteAll}
                      className="bg-red-500/10 p-2 rounded-full border border-red-500/20 mr-2"
                    >
                      <Trash2 size={12} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                  {lessons.length > 0 && (
                    <TouchableOpacity 
                      onPress={downloadAll}
                      className="flex-row items-center bg-violet-500/20 px-3 py-1.5 rounded-full border border-violet-500/20"
                    >
                      <Download size={12} color="#a78bfa" />
                      <Text className="text-violet-400 text-[10px] ml-1.5 font-bold uppercase" style={{ fontFamily: fontFamilyBold }}>{t('download_all')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
             </View>
             <Text className="text-slate-500 text-xs" style={{ fontFamily }}>{t('all_lessons_in_theme')}</Text>
           </View>
        }
        ListEmptyComponent={
          <View className="items-center justify-center pt-20">
             <Text className="text-slate-500" style={{ fontFamily }}>{t('no_results')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
