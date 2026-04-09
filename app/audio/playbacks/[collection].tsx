import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Play, Download, Search, Trash2, Smartphone, CheckCircle, RefreshCcw } from 'lucide-react-native';
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
const CACHE_FILE = (id: string) => `${PB_DIR}cache_${id}.json`;

export default function PlaybacksSongsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams() as any;
  const { collection, title: collectionTitle } = params;
  
  const { settings: globalSettings } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'stored' | 'online'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  
  const [downloadedSongs, setDownloadedSongs] = useState<Record<string, boolean>>({});
  const [downloadingProgress, setDownloadingProgress] = useState<Record<string, number>>({});

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  const getAudioKey = (id: string) => `${collection}-${id}`;

  useEffect(() => {
    initAndLoad();
  }, [collection]);

  const initAndLoad = async () => {
    await initFileSystem();
    await fetchSongs();
  };

  const fetchSongs = async () => {
    setIsRefreshing(true);
    try {
      const cachePath = CACHE_FILE(collection);
      const net = await NetInfo.fetch();

      if (await FileSystem.getInfoAsync(cachePath).then(i => i.exists)) {
        const cachedContent = await FileSystem.readAsStringAsync(cachePath);
        setSongs(JSON.parse(cachedContent));
      }

      if (net.isConnected) {
        const res = await fetch(`${COLLECTION_BASE_URL}${collection}.json?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setSongs(data);
          await FileSystem.writeAsStringAsync(cachePath, JSON.stringify(data));
        }
      }
    } catch (e) {
      console.log('Collection fetch error', e);
    }
    setIsRefreshing(false);
  };

  const downloadAll = async () => {
    const toDownload = songs.filter(s => !downloadedSongs[getAudioKey(s.id)]);
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
             for (const s of toDownload) {
                await downloadSong(s);
             }
        }}
      ]
    );
  };

  const deleteAll = async () => {
    const toDelete = songs.filter(s => downloadedSongs[getAudioKey(s.id)]);
    if (toDelete.length === 0) return;

    Alert.alert(
      t('delete'),
      `${t('delete_audio_confirm')} (${toDelete.length} files)`,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: async () => {
            try {
              for (const s of toDelete) {
                await FileSystem.deleteAsync(getLocalFileUri(s.id), { idempotent: true });
              }
              const newMeta = { ...downloadedSongs };
              toDelete.forEach(s => delete newMeta[getAudioKey(s.id)]);
              setDownloadedSongs(newMeta);
              await FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(newMeta));
            } catch (e) {}
        }}
      ]
    );
  };

  const filteredSongs = useMemo(() => {
    let result = songs.filter(song => 
      song.id.toString().includes(searchQuery) || 
      song.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterMode === 'stored') {
      result = result.filter(s => !!downloadedSongs[getAudioKey(s.id)]);
    } else if (filterMode === 'online') {
      result = result.filter(s => !downloadedSongs[getAudioKey(s.id)]);
    }

    return result;
  }, [songs, searchQuery, filterMode, downloadedSongs]);

  const counts = useMemo(() => {
    const collPrefix = `${collection}-`;
    const downloadedCount = Object.keys(downloadedSongs).filter(k => k.startsWith(collPrefix)).length;
    return {
      all: songs.length,
      stored: downloadedCount,
      online: Math.max(0, songs.length - downloadedCount)
    };
  }, [songs, downloadedSongs, collection]);

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

  const downloadSong = async (song: Song) => {
    const key = getAudioKey(song.id);
    try {
      const fileUri = getLocalFileUri(song.id);
      const downloadResumable = FileSystem.createDownloadResumable(
        song.url, 
        fileUri, 
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.hymnes.net/'
          }
        },
        (dp) => {
          const progress = dp.totalBytesWritten / dp.totalBytesExpectedToWrite;
          setDownloadingProgress(prev => ({ ...prev, [key]: progress }));
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (result && result.status === 200) {
        setDownloadedSongs(prev => {
            const next = { ...prev, [key]: true };
            FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(next));
            return next;
        });
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
    const isDownloaded = !!downloadedSongs[key];
    const url = isDownloaded ? getLocalFileUri(song.id) : song.url;

    // Video Detection
    const isVideo = url.toLowerCase().endsWith('.mp4') || 
                    url.toLowerCase().endsWith('.mov') ||
                    url.includes('youtube.com') || 
                    url.includes('youtu.be') || 
                    url.includes('vimeo.com');

    if (isVideo) {
      router.push({
        pathname: '/video/player',
        params: {
          url: song.url,
          title: song.title,
          subtext: collectionTitle
        }
      });
      return;
    }

    const playlistData = filteredSongs
      .filter(s => {
          const u = s.url.toLowerCase();
          return !u.endsWith('.mp4') && !u.endsWith('.mov') && !u.includes('youtube') && !u.includes('vimeo');
      })
      .map((s) => {
        const isLoc = !!downloadedSongs[getAudioKey(s.id)];
        return {
            id: s.id,
            title: `N° ${s.id} - ${s.title}`,
            url: isLoc ? getLocalFileUri(s.id) : s.url,
            isLocal: isLoc,
            subtext: collectionTitle,
            artwork: params.artwork // Use collection artwork
        };
    });

    const currentIndexInAudioPlaylist = playlistData.findIndex(s => s.id === song.id);

    router.push({
      pathname: '/audio/player',
      params: {
        title: `N° ${song.id} - ${song.title}`,
        url: url,
        isLocal: isDownloaded ? 'true' : 'false',
        subtext: collectionTitle,
        index: currentIndexInAudioPlaylist.toString(),
        artwork: params.artwork, // Pass artwork to player
        playlist: JSON.stringify(playlistData)
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
                 {isDownloaded ? t('stored') : t('online')}
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
          <View className="flex-row items-center">
            {songs.some(s => downloadedSongs[getAudioKey(s.id)]) && (
                <TouchableOpacity 
                onPress={deleteAll}
                className="w-10 h-10 bg-red-500/10 rounded-full items-center justify-center border border-red-500/20 mr-2"
                >
                <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
            )}
            <TouchableOpacity 
                onPress={fetchSongs}
                disabled={isRefreshing}
                className="w-10 h-10 bg-slate-900 rounded-full items-center justify-center border border-slate-800 mr-2"
            >
                {isRefreshing ? (
                    <ActivityIndicator size="small" color="#f8fafc" />
                ) : (
                    <RefreshCcw size={18} color="#f8fafc" />
                )}
            </TouchableOpacity>
            <TouchableOpacity 
                onPress={downloadAll}
                className="w-10 h-10 bg-violet-500/10 rounded-full items-center justify-center border border-violet-500/20"
            >
                <Download size={18} color="#a78bfa" />
            </TouchableOpacity>
          </View>
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

        <View className="flex-row items-center mt-4">
          {[
            { id: 'all', label: t('all'), color: 'bg-blue-500', count: counts.all },
            { id: 'stored', label: t('stored'), color: 'bg-emerald-500', count: counts.stored },
            { id: 'online', label: t('online'), color: 'bg-amber-500', count: counts.online },
          ].map((mode) => (
            <TouchableOpacity 
              key={mode.id}
              onPress={() => setFilterMode(mode.id as any)}
              className={`px-4 py-2 rounded-full mr-2 flex-row items-center ${filterMode === mode.id ? mode.color : 'bg-slate-900 border border-slate-800/50'}`}
            >
              <Text className={`text-[10px] font-bold uppercase ${filterMode === mode.id ? 'text-white' : 'text-slate-400'}`} style={{ fontFamily: fontFamilyBold }}>
                {mode.label}
              </Text>
              <View className={`ml-2 px-1.5 py-0.5 rounded-md ${filterMode === mode.id ? 'bg-white/20' : 'bg-slate-800'}`}>
                <Text className={`text-[8px] font-bold ${filterMode === mode.id ? 'text-white' : 'text-slate-500'}`}>{mode.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
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
