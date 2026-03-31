import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Play, Download, Headphones, CheckCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../../lib/settings-context';
import { useTranslation } from '../../../lib/i18n';
import * as FileSystem from 'expo-file-system/legacy';

// Audio mapping
import BIBLE_AUDIO_MAP from '../../../assets/bible-audio-map.json';

const BIBLE_DIR = `${FileSystem.documentDirectory}bible-audio/`;
const METADATA_FILE = `${BIBLE_DIR}metadata.json`;

export default function BibleAudioChaptersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams() as any;
  const { id, name, chapters } = params;
  
  const { settings: globalSettings } = useSettings();
  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  const [downloadedChapters, setDownloadedChapters] = useState<Record<string, boolean>>({});
  const [downloadingProgress, setDownloadingProgress] = useState<Record<string, number>>({});

  const chapterCount = parseInt(chapters) || 0;
  const chaptersList = Array.from({ length: chapterCount }, (_, i) => i + 1);

  React.useEffect(() => {
    initFileSystem();
  }, [id]);

  const initFileSystem = async () => {
    try {
      const info = await FileSystem.getInfoAsync(BIBLE_DIR);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(BIBLE_DIR, { intermediates: true });
      } else {
        const metaInfo = await FileSystem.getInfoAsync(METADATA_FILE);
        if (metaInfo.exists) {
          const content = await FileSystem.readAsStringAsync(METADATA_FILE);
          setDownloadedChapters(JSON.parse(content));
        }
      }
    } catch (e) {}
  };

  const saveMetadata = async (newMeta: Record<string, boolean>) => {
    try {
      await FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(newMeta));
      setDownloadedChapters(newMeta);
    } catch (e) {}
  };

  const getAudioKey = (chapter: number) => `${id}-${chapter}`;
  const getLocalFileUri = (chapter: number) => `${BIBLE_DIR}${id}_${chapter}.mp3`;

  const downloadChapter = async (chapter: number) => {
    const key = getAudioKey(chapter);
    const url = BIBLE_AUDIO_MAP[key as keyof typeof BIBLE_AUDIO_MAP];
    if (!url) return;

    try {
      const fileUri = getLocalFileUri(chapter);
      const downloadResumable = FileSystem.createDownloadResumable(
        url, fileUri, {},
        (dp) => {
          const progress = dp.totalBytesWritten / dp.totalBytesExpectedToWrite;
          setDownloadingProgress(prev => ({ ...prev, [key]: progress }));
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (result && result.status === 200) {
        saveMetadata({ ...downloadedChapters, [key]: true });
      }
    } catch (e) {
      Alert.alert(t('error'), t('download_failed'));
    }
    setDownloadingProgress(prev => { const n = {...prev}; delete n[key]; return n; });
  };

  const deleteChapter = (chapter: number) => {
    const key = getAudioKey(chapter);
    Alert.alert(t('delete'), `${t('delete_audio_confirm')} (${t('chapters')} ${chapter})`, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
          try {
            await FileSystem.deleteAsync(getLocalFileUri(chapter), { idempotent: true });
            const newMeta = { ...downloadedChapters };
            delete newMeta[key];
            saveMetadata(newMeta);
          } catch (e) {}
      }}
    ]);
  };

  const handlePlayChapter = (chapter: number) => {
    const key = getAudioKey(chapter);
    const url = BIBLE_AUDIO_MAP[key as keyof typeof BIBLE_AUDIO_MAP];
    const isDownloaded = !!downloadedChapters[key];
    
    if (url) {
      router.push({
        pathname: '/audio/player',
        params: {
          title: `${name} ${chapter}`,
          url: isDownloaded ? getLocalFileUri(chapter) : url,
          isLocal: isDownloaded ? 'true' : 'false',
          subtext: t('bible_audio')
        }
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="px-6 py-4 border-b border-slate-800/30 flex-row items-center justify-between">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center"
        >
          <ChevronLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View className="flex-1 px-4 items-center">
            <Text className="text-white font-bold text-xl" style={{ fontFamily: fontFamilyBold }}>{name}</Text>
        </View>
        <View className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center">
            <Headphones size={18} color="#3b82f6" />
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-slate-500 text-xs mb-6 text-center leading-5" style={{ fontFamily }}>
           {t('bible_long_press_hint')}
        </Text>

        <View className="flex-row flex-wrap justify-start pb-20">
          {chaptersList.map((chapter) => {
             const key = getAudioKey(chapter);
             const isDownloaded = !!downloadedChapters[key];
             const progress = downloadingProgress[key];
             const isDownloading = progress !== undefined;

             return (
                <TouchableOpacity 
                key={chapter} 
                onPress={() => handlePlayChapter(chapter)}
                onLongPress={() => isDownloaded ? deleteChapter(chapter) : downloadChapter(chapter)}
                className={`w-[22%] aspect-square rounded-2xl m-[1.5%] border items-center justify-center relative ${isDownloaded ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/60 border-slate-800/40'}`}
                >
                {isDownloading ? (
                    <View className="items-center">
                        <ActivityIndicator size="small" color="#3b82f6" />
                        <Text className="text-blue-500 text-[8px] mt-1 font-bold">{Math.round(progress * 100)}%</Text>
                    </View>
                ) : (
                    <>
                    <Text className={`text-lg font-bold ${isDownloaded ? 'text-emerald-400' : 'text-white'}`} style={{ fontFamily: fontFamilyBold }}>{chapter}</Text>
                    
                    <View className="absolute bottom-1 right-1">
                        {isDownloaded ? (
                            <CheckCircle size={8} color="#10b981" />
                        ) : (
                            <Play size={10} color="#3b82f6" fill="#3b82f6" opacity={0.4} />
                        )}
                    </View>

                    {!isDownloaded && (
                        <View className="absolute top-1 right-1">
                           <Download size={8} color="#475569" opacity={0.6} />
                        </View>
                    )}
                    </>
                )}
                </TouchableOpacity>
             );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
