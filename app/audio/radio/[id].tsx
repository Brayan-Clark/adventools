import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Download, PlayCircle, Clock, Trash2, CheckCircle, Smartphone, Globe, RefreshCcw } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';

import NetInfo from '@react-native-community/netinfo';
import { useSettings } from '../../../lib/settings-context';

interface PodcastEpisode {
  id: string; 
  title: string;
  pubDate: string;
  audioUrl: string;
  duration?: string;
}

interface PodcastMetadata {
  downloaded: Record<string, PodcastEpisode>;
  cachedFeed?: PodcastEpisode[];
}

const AUDIO_DIR = `${FileSystem.documentDirectory}podcasts/`;
const METADATA_FILE = `${AUDIO_DIR}metadata.json`;
const ITEMS_PER_PAGE = 15;

export default function PodcastEpisodesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as any;
  const { title, streamUrl } = params;
  
  const { settings: globalSettings } = useSettings();
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [remoteEpisodes, setRemoteEpisodes] = useState<PodcastEpisode[]>([]);
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [downloadingProgress, setDownloadingProgress] = useState<Record<string, number>>({});
  const [downloadedMetadata, setDownloadedMetadata] = useState<Record<string, PodcastEpisode>>({});
  const [cachedRemoteFeed, setCachedRemoteFeed] = useState<PodcastEpisode[]>([]);

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  useEffect(() => {
    initAndLoad();
  }, [streamUrl]);

  const deleteAll = async () => {
    const toDelete = Object.keys(downloadedMetadata);
    if (toDelete.length === 0) return;

    Alert.alert('Tout supprimer', `Voulez-vous supprimer les ${toDelete.length} épisodes téléchargés ?`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Tout supprimer', style: 'destructive', onPress: async () => {
            try {
                for (const id of toDelete) {
                    await FileSystem.deleteAsync(`${AUDIO_DIR}${id}.mp3`, { idempotent: true });
                }
                saveMetadata({}, cachedRemoteFeed);
            } catch (e) {}
        }}
    ]);
  };

  const initAndLoad = async () => {
    // 1. Load local files and cache first (INSTANT)
    const localMeta = await initFileSystem();
    
    // 2. Fetch remote update
    if (streamUrl) {
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        fetchEpisodes(localMeta?.downloaded);
      }
    }
  };

  const initFileSystem = async () => {
    try {
      const info = await FileSystem.getInfoAsync(AUDIO_DIR);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
        return { downloaded: {}, cachedFeed: [] };
      } else {
        const metaInfo = await FileSystem.getInfoAsync(METADATA_FILE);
        if (metaInfo.exists) {
          const content = await FileSystem.readAsStringAsync(METADATA_FILE);
          const meta: PodcastMetadata = JSON.parse(content);
          setDownloadedMetadata(meta.downloaded || {});
          setCachedRemoteFeed(meta.cachedFeed || []);
          return meta;
        }
      }
    } catch (error) {
      console.error('File system init error:', error);
    }
    return { downloaded: {}, cachedFeed: [] };
  };

  const saveMetadata = async (downloaded: Record<string, PodcastEpisode>, cachedFeed?: PodcastEpisode[]) => {
    try {
      const meta: PodcastMetadata = { 
        downloaded, 
        cachedFeed: cachedFeed || cachedRemoteFeed 
      };
      await FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(meta));
      setDownloadedMetadata(downloaded);
      if (cachedFeed) setCachedRemoteFeed(cachedFeed);
    } catch (e) {
      console.error('Failed to save metadata', e);
    }
  };

  const fetchEpisodes = async (currentDownloaded?: Record<string, PodcastEpisode>) => {
    setIsRemoteLoading(true);
    try {
      const response = await fetch(`${streamUrl}${streamUrl.includes('?') ? '&' : '?'}t=${Date.now()}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      });
      const xml = await response.text();
      
      // Try to find items more robustly
      const itemsMatch = xml.toLowerCase().includes('<item>');
      if (!itemsMatch) {
          console.warn('No <item> tags found in RSS');
          setIsRemoteLoading(false);
          return;
      }

      // Defer parsing to keep UI responsive
      setTimeout(() => {
        const parsedEpisodes = parseRssFeed(xml);
        setRemoteEpisodes(parsedEpisodes);
        
        // Cache for next time - ONLY if we actually got items!
        if (parsedEpisodes && parsedEpisodes.length > 0) {
            // Use the passed currentDownloaded or the latest state to avoid erasing data
            saveMetadata(currentDownloaded || downloadedMetadata, parsedEpisodes.slice(0, 20));
        }
        setIsRemoteLoading(false);
      }, 50);
      
    } catch (error) {
      console.error('Failed to parse podcast feed', error);
      setIsRemoteLoading(false);
    }
  };

  const decodeEntities = (html: string) => {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#039;/g, "'")
      .replace(/&ndash;/g, '-')
      .replace(/&mdash;/g, '-')
      .replace(/&nbsp;/g, ' ');
  };

  const getSafeFileName = (url: string) => {
    const parts = url.split('/');
    const cleanId = parts[parts.length - 1].split('?')[0].replace(/[^a-zA-Z0-9-]/g, '_');
    return cleanId;
  };

  const formatDuration = (d?: string) => {
    if (!d) return '';
    if (d.includes(':')) return d; // Already HH:MM:SS
    const secs = parseInt(d);
    if (isNaN(secs)) return d;
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}:${(secs % 60).toString().padStart(2, '0')}`;
    const hours = Math.floor(mins / 60);
    return `${hours}:${(mins % 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;
  };

  const formatEpisodeDate = (dateStr: string) => {
    try {
      const dateObj = new Date(dateStr.trim());
      if (isNaN(dateObj.getTime())) {
        return dateStr.split(' ').slice(0, 4).join(' ');
      }

      const day = dateObj.getDate();
      const monthIndex = dateObj.getMonth();
      const year = dateObj.getFullYear();

      const lang = globalSettings.language || 'Malagasy';
      
      const monthsMG = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Des'];
      const monthsFR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      
      const monthName = lang === 'Malagasy' ? monthsMG[monthIndex] : monthsFR[monthIndex];
      
      return `${day} ${monthName} ${year}`;
    } catch (e) {
      return dateStr.substring(0, 15);
    }
  };

  const parseRssFeed = (xml: string): PodcastEpisode[] => {
    const items: PodcastEpisode[] = [];
    // Split by <item> case-insensitively
    const itemParts = xml.split(/<item[^>]*>/i);
    if (itemParts.length <= 1) return [];

    for (let i = 1; i < itemParts.length; i++) {
        const itemXml = itemParts[i].split(/<\/item>/i)[0];
        
        // Try to get title from <title> or <itunes:title>
        const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) 
                         || itemXml.match(/<itunes:title><!\[CDATA\[([\s\S]*?)\]\]><\/itunes:title>/)
                         || itemXml.match(/<title>([\s\S]*?)<\/title>/)
                         || itemXml.match(/<itunes:title>([\s\S]*?)<\/itunes:title>/);

        const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const audioMatch = itemXml.match(/<enclosure[^>]*url="([^"]+)"/) || itemXml.match(/<enclosure[^>]*url='([^']+)'/);
        const durMatch = itemXml.match(/<itunes:duration>([\s\S]*?)<\/itunes:duration>/);
        
        if (titleMatch && audioMatch) {
            let cleanTitle = decodeEntities(titleMatch[1].trim());
            if (cleanTitle.startsWith('AWR ')) {
                const parts = cleanTitle.split(' - ');
                if (parts.length > 1) cleanTitle = parts.slice(1).join(' - ');
            }
            
            items.push({
                id: getSafeFileName(audioMatch[1]),
                title: cleanTitle,
                pubDate: dateMatch ? formatEpisodeDate(dateMatch[1]) : "",
                audioUrl: audioMatch[1],
                duration: formatDuration(durMatch ? durMatch[1] : undefined)
            });
        }
    }
    return items;
  };

  const downloadEpisode = async (ep: PodcastEpisode) => {
    try {
      const fileUri = `${AUDIO_DIR}${ep.id}.mp3`;
      const downloadResumable = FileSystem.createDownloadResumable(
        ep.audioUrl, fileUri, {},
        (dp) => {
          const progress = dp.totalBytesWritten / dp.totalBytesExpectedToWrite;
          setDownloadingProgress(prev => ({ ...prev, [ep.id]: progress }));
        }
      );
      const result = await downloadResumable.downloadAsync();
      if (result && result.status === 200) {
        setDownloadedMetadata(prev => {
            const next = { ...prev, [ep.id]: ep };
            saveMetadata(next);
            return next;
        });
      }
    } catch (e) { Alert.alert('Erreur', 'Echec du téléchargement.'); }
    setDownloadingProgress(prev => { const n = {...prev}; delete n[ep.id]; return n; });
  };

  const deleteEpisode = async (epId: string) => {
    Alert.alert('Supprimer', 'Voulez-vous supprimer ce fichier ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await FileSystem.deleteAsync(`${AUDIO_DIR}${epId}.mp3`, { idempotent: true });
          const newMeta = { ...downloadedMetadata };
          delete newMeta[epId];
          saveMetadata(newMeta);
        } catch (e) {}
      }}
    ]);
  };

  const playEpisode = (ep: PodcastEpisode) => {
    const isDownloaded = !!downloadedMetadata[ep.id];
    const currentIndex = listToDisplay.findIndex(e => e.id === ep.id);
    const playlistData = listToDisplay.map(e => ({
        id: e.id,
        title: e.title,
        url: downloadedMetadata[e.id] ? `${AUDIO_DIR}${e.id}.mp3` : e.audioUrl,
        isLocal: !!downloadedMetadata[e.id],
        subtext: e.pubDate
    }));

    router.push({
      pathname: '/audio/player',
      params: { 
        title: ep.title,
        url: isDownloaded ? `${AUDIO_DIR}${ep.id}.mp3` : ep.audioUrl,
        isLocal: isDownloaded ? 'true' : 'false',
        subtext: ep.pubDate || "Épisode",
        index: currentIndex.toString(),
        playlist: JSON.stringify(playlistData)
      }
    });
  };

  const downloadAll = async () => {
    const toDownload = listToDisplay.filter(ep => !downloadedMetadata[ep.id]);
    if (toDownload.length === 0) {
        Alert.alert('Info', 'Tout les épisodes affichés sont déjà téléchargés.');
        return;
    }

    Alert.alert(
      'Tout télécharger',
      `Voulez-vous télécharger les ${toDownload.length} épisodes récents affichés ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Télécharger', onPress: async () => {
             for (const ep of toDownload) {
                await downloadEpisode(ep);
             }
        }}
      ]
    );
  };

  const renderEpisodeCard = (ep: PodcastEpisode, section: 'local' | 'remote') => {
    const progress = downloadingProgress[ep.id];
    const isDownloading = progress !== undefined;
    const isDownloaded = !!downloadedMetadata[ep.id];

    if (section === 'remote' && isDownloaded) return null;

    return (
      <View key={ep.id} className="bg-slate-900 rounded-[20px] p-4 border border-slate-800 mb-4 shadow-sm">
        <TouchableOpacity onPress={() => playEpisode(ep)}>
          <Text className="text-white font-bold text-sm mb-2" style={{ fontFamily: fontFamilyBold }}>{ep.title}</Text>
        </TouchableOpacity>
        
        <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-slate-800/50">
          <View className="flex-1">
            <Text className="text-slate-500 text-[10px] uppercase font-bold" style={{ fontFamily: fontFamilyBold }}>
              {ep.pubDate} {ep.duration ? `• ${ep.duration}` : ''}
            </Text>
            {isDownloading && (
               <View className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden mr-4">
                 <View className="h-full bg-blue-500" style={{ width: `${progress * 100}%` }} />
               </View>
            )}
          </View>
          
          <View className="flex-row items-center">
            {isDownloading ? (
               <Text className="text-blue-500 text-[10px] font-bold mr-2">{Math.round(progress * 100)}%</Text>
            ) : isDownloaded ? (
              <TouchableOpacity onPress={() => deleteEpisode(ep.id)} className="w-8 h-8 rounded-full items-center justify-center bg-red-500/10 border border-red-500/20 mr-2">
                <Trash2 size={14} color="#ef4444" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => downloadEpisode(ep)} className="w-8 h-8 rounded-full items-center justify-center bg-slate-800 border border-slate-700 mr-2">
                <Download size={14} color="#94a3b8" />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => playEpisode(ep)} className="w-8 h-8 rounded-full items-center justify-center bg-blue-500/20 border border-blue-500/30">
              <PlayCircle size={16} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const localList = Object.values(downloadedMetadata);
  // If we have remote episodes, use them. If not, maybe use cached ones.
  const remoteList = remoteEpisodes.length > 0 ? remoteEpisodes : cachedRemoteFeed;
  const listToDisplay = remoteList.slice(0, displayedCount);

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />
      
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-800/30">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 items-center justify-center">
          <ChevronLeft size={18} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="flex-1 text-white font-bold text-base text-center px-4" style={{ fontFamily: fontFamilyBold }} numberOfLines={1}>{title || "Épisodes"}</Text>
        <View className="flex-row items-center">
            {Object.keys(downloadedMetadata).length > 0 && (
                <TouchableOpacity 
                    onPress={deleteAll}
                    className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 items-center justify-center mr-2"
                >
                    <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
            )}
            <TouchableOpacity 
                onPress={() => fetchEpisodes(downloadedMetadata)}
                disabled={isRemoteLoading}
                className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mr-2"
            >
                {isRemoteLoading ? (
                    <ActivityIndicator size={12} color="#f8fafc" />
                ) : (
                    <RefreshCcw size={16} color="#f8fafc" />
                )}
            </TouchableOpacity>
            <TouchableOpacity 
                onPress={downloadAll}
                className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 items-center justify-center"
            >
                <Download size={16} color="#3b82f6" />
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-5 pt-4" 
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
            const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) {
                if (displayedCount < remoteList.length) setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
            }
        }}
      >
        {/* DOWNLOADED */}
        {localList.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Smartphone size={14} color="#10b981" />
              <Text className="text-emerald-500 font-bold ml-2 uppercase text-[10px] tracking-widest" style={{ fontFamily: fontFamilyBold }}>Téléchargés</Text>
            </View>
            {localList.map(ep => renderEpisodeCard(ep, 'local'))}
          </View>
        )}

        {/* FEED */}
        <View className="pb-20">
            <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                    <Globe size={14} color="#6366f1" />
                    <Text className="text-indigo-400 font-bold ml-2 uppercase text-[10px] tracking-widest" style={{ fontFamily: fontFamilyBold }}>Liste en ligne</Text>
                </View>
                {isRemoteLoading && <ActivityIndicator size="small" color="#6366f1" />}
            </View>

            {listToDisplay.map(ep => renderEpisodeCard(ep, 'remote'))}

            {!isRemoteLoading && remoteList.length === 0 && (
                <Text className="text-slate-600 text-center text-xs py-10" style={{ fontFamily }}>Aucun contenu en ligne trouvé.</Text>
            )}

            {displayedCount < remoteList.length && (
                <TouchableOpacity onPress={() => setDisplayedCount(prev => prev + ITEMS_PER_PAGE)} className="py-4 items-center">
                    <Text className="text-slate-500 text-xs" style={{ fontFamily }}>Charger plus d'épisodes...</Text>
                </TouchableOpacity>
            )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

