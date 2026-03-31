import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Play, Download, Search, Trash2, Smartphone, CheckCircle } from 'lucide-react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import { useSettings } from '../../../lib/settings-context';
import { useTranslation } from '../../../lib/i18n';

const COLLECTION_BASE_URL = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/playbacks/';

interface Song {
  id: string;
  title: string;
  url: string;
}

const PB_DIR = `${FileSystem.documentDirectory}playbacks/`;
const METADATA_FILE = `${PB_DIR}metadata.json`;

export default function PlaybacksSongsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams() as any;
  const { collection, title: collectionTitle } = params;
  
  const { settings: globalSettings } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  
  const [downloadedSongs, setDownloadedSongs] = useState<Record<string, boolean>>({});
  const [downloadingProgress, setDownloadingProgress] = useState<Record<string, number>>({});

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  useEffect(() => {
    initAndLoad();
  }, [collection]);

  const initAndLoad = async () => {
    await initFileSystem();
    await fetchSongs();
  };

  const fetchSongs = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    setIsRefreshing(true);
    try {
      const res = await fetch(`${COLLECTION_BASE_URL}${collection}.json?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setSongs(data);
      }
    } catch (e) {
      console.log('Collection fetch error', e);
    }
    setIsRefreshing(false);
  };

  const filteredSongs = useMemo(() => {
    return songs.filter(song => 
      song.id.toString().includes(searchQuery) || 
      song.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [songs, searchQuery]);

  useEffect(() => {
    initFileSystem();
  }, [collection]);

  const initFileSystem = async () => {
    try {
      if (!(await FileSystem.getInfoAsync(PB_DIR)).exists) {
        await FileSystem.makeDirectoryAsync(PB_DIR, { intermediates: true });
      } else if ((await FileSystem.getInfoAsync(METADATA_FILE)).exists) {
        const content = await FileSystem.readAsStringAsync(METADATA_FILE);
        setDownloadedSongs(JSON.parse(content));
      }
    } catch (e) {}
  };

  const getLocalFileUri = (id: string) => `${PB_DIR}${collection}_${id}.mp3`;
  const getAudioKey = (id: string) => `${collection}-${id}`;

  const downloadSong = async (song: Song) => {
    const key = getAudioKey(song.id);
    try {
      const fileUri = getLocalFileUri(song.id);
      const downloadResumable = FileSystem.createDownloadResumable(
        song.url, fileUri, {},
        (dp) => {
          const progress = dp.totalBytesWritten / dp.totalBytesExpectedToWrite;
          setDownloadingProgress(prev => ({ ...prev, [key]: progress }));
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (result && result.status === 200) {
        const newMeta = { ...downloadedSongs, [key]: true };
        setDownloadedSongs(newMeta);
        await FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(newMeta));
      }
    } catch (e) {
      Alert.alert(t('error'), t('download_failed'));
    }
    setDownloadingProgress(prev => { const n = {...prev}; delete n[key]; return n; });
  };

  const deleteSong = (song: Song) => {
    const key = getAudioKey(song.id);
    Alert.alert(t('delete'), t('delete_audio_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
          try {
            await FileSystem.deleteAsync(getLocalFileUri(song.id), { idempotent: true });
            const newMeta = { ...downloadedSongs };
            delete newMeta[key];
            setDownloadedSongs(newMeta);
            await FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(newMeta));
          } catch (e) {}
      }}
    ]);
  };

  const playSong = (song: Song) => {
    const key = getAudioKey(song.id);
    const isLocal = !!downloadedSongs[key];
    
    // Transform Google Drive URL for better streaming if not local
    let audioUrl = isLocal ? getLocalFileUri(song.id) : song.url;
    if (!isLocal && audioUrl.includes('drive.google.com')) {
       // Convert uc?export=download&id=XYZ to docs.google.com/uc?export=open&id=XYZ
       // This format is generally better for streaming
       audioUrl = audioUrl.replace('export=download', 'export=open');
    }

    router.push({
      pathname: '/audio/player',
      params: {
        title: `N° ${song.id} - ${song.title}`,
        url: audioUrl,
        isLocal: isLocal ? 'true' : 'false',
        subtext: collectionTitle
      }
    });
  };

  const renderSongItem = ({ item }: { item: Song }) => {
    const key = getAudioKey(item.id);
    const isDownloaded = !!downloadedSongs[key];
    const progress = downloadingProgress[key];
    const isDownloading = progress !== undefined;

    return (
      <View className="bg-slate-900/40 rounded-2xl mb-3 border border-slate-800/40 overflow-hidden">
        <TouchableOpacity 
          onPress={() => playSong(item)}
          className="p-4 flex-row items-center"
        >
          <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDownloaded ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>
             <Text className={`font-bold ${isDownloaded ? 'text-emerald-500' : 'text-slate-400'}`} style={{ fontFamily: fontFamilyBold }}>{item.id}</Text>
          </View>
          
          <View className="ml-4 flex-1">
            <Text className="text-white font-bold text-sm" numberOfLines={1} style={{ fontFamily: fontFamilyBold }}>{item.title}</Text>
            <View className="flex-row items-center mt-1">
               <Smartphone size={10} color={isDownloaded ? '#22c55e' : '#64748b'} />
               <Text className={`text-[10px] ml-1 uppercase font-bold ${isDownloaded ? 'text-emerald-500' : 'text-slate-500'}`} style={{ fontFamily: fontFamilyBold }}>
                 {isDownloaded ? 'Tehirizina' : 'An-tsary'}
               </Text>
            </View>
          </View>

          {isDownloading ? (
            <View className="items-center mr-2">
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text className="text-blue-500 text-[8px] mt-1 font-bold">{Math.round(progress * 100)}%</Text>
            </View>
          ) : (
            <TouchableOpacity 
              onPress={() => isDownloaded ? deleteSong(item) : downloadSong(item)}
              className="w-10 h-10 items-center justify-center"
            >
              {isDownloaded ? (
                <Trash2 size={18} color="#ef4444" />
              ) : (
                <Download size={18} color="#64748b" />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => playSong(item)} className="w-12 h-12 items-center justify-center ml-1 bg-slate-900/50 rounded-xl border border-slate-800/50">
             <Play size={20} color={isDownloaded ? '#10b981' : '#3b82f6'} fill={isDownloaded ? '#10b981' : 'transparent'} opacity={1} />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="px-6 py-4 border-b border-slate-800/30">
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center"
          >
            <ChevronLeft size={20} color="#f8fafc" />
          </TouchableOpacity>
          <View className="flex-1 px-4 items-center">
            <Text className="text-white font-bold text-lg" numberOfLines={1} style={{ fontFamily: fontFamilyBold }}>{collectionTitle}</Text>
          </View>
          <TouchableOpacity className="w-10 h-10 bg-blue-500/10 rounded-full items-center justify-center">
             <Search size={18} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3">
          <Search size={18} color="#64748b" />
          <TextInput 
            placeholder={t('search_hymns_basic')} 
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-white text-sm"
            style={{ fontFamily }}
          />
        </View>
      </View>

      <FlatList 
        data={filteredSongs}
        keyExtractor={item => item.id}
        renderItem={renderSongItem}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center pt-20">
            <Text className="text-slate-500" style={{ fontFamily }}>{t('no_results')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
