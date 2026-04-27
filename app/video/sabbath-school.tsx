import { useRouter } from 'expo-router';
import { ChevronLeft, PlayCircle, Globe, RefreshCw, Search, AlertCircle, Download, Trash2, WifiOff } from 'lucide-react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, Image, SectionList, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';

import { useSettings } from '../../lib/settings-context';
import { useTranslation } from '../../lib/i18n';

interface VideoClip {
  id: string;
  title: string;
  image: string;
  src: string;
  quarterlyTitle?: string;
  targetIndex?: string;
  qType?: string;
  qQuarter?: string;
}

const SS_VIDEO_DIR = `${FileSystem.documentDirectory}sabbath-school-video/`;
const SS_VIDEO_METADATA = `${SS_VIDEO_DIR}metadata.json`;
const SS_VIDEO_CACHE = `${SS_VIDEO_DIR}media-cache.json`;

const SUPPORTED_LANGS = [
  { code: 'fr', label: 'Français' },
  { code: 'mg', label: 'Malagasy' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'de', label: 'Deutsch' }
];

const SERIES_TYPES = [
  { id: 'all', label: 'Toutes' },
  { id: 'adult', label: 'Adultes' },
  { id: 'inverse', label: 'InVerse' },
  { id: 'cornerstone', label: 'CC' },
  { id: 'kids', label: 'Enfants' }
];

const extractLessonNum = (index?: string) => {
    if (!index) return null;
    const parts = index.split(/[-_]/);
    let yearIdx = parts.findIndex(p => p.match(/^20\d{2}$/));
    if (yearIdx === -1) return null;
    let start = yearIdx + 1;
    const maybeQuarter = parseInt(parts[start]);
    if (!isNaN(maybeQuarter) && maybeQuarter <= 4 && parts.length > start + 1) start++;
    for (let i = start; i < parts.length; i++) {
        const n = parseInt(parts[i]);
        if (!isNaN(n) && parts[i].match(/^\d+$/)) return n;
    }
    return null;
};

export default function SabbathSchoolVideoScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();
  const { settings: globalSettings } = useSettings();
  
  const initialLang = SUPPORTED_LANGS.find(l => l.label === currentLang)?.code || 'fr';
  const [mediaLang, setMediaLang] = useState(initialLang);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [videoClips, setVideoClips] = useState<VideoClip[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [showDownloadedOnly, setShowDownloadedOnly] = useState(false);

  const [downloadedVideos, setDownloadedVideos] = useState<Record<string, boolean>>({});
  const [downloadingProgress, setDownloadingProgress] = useState<Record<string, number>>({});

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  useEffect(() => { initAndLoad(); }, [mediaLang]);

  // Reconcile: scan disk and rebuild downloadedVideos from actual files.
  const reconcileDownloads = async (): Promise<Record<string, boolean>> => {
    const verified: Record<string, boolean> = {};
    try {
      const dirInfo = await FileSystem.getInfoAsync(SS_VIDEO_DIR);
      if (!dirInfo.exists) return verified;

      let saved: Record<string, boolean> = {};
      if ((await FileSystem.getInfoAsync(SS_VIDEO_METADATA)).exists) {
        const content = await FileSystem.readAsStringAsync(SS_VIDEO_METADATA);
        saved = JSON.parse(content);
      }

      let changed = false;
      for (const [id, val] of Object.entries(saved)) {
        if (val) {
          const fileUri = `${SS_VIDEO_DIR}${id}.mp4`;
          const info = await FileSystem.getInfoAsync(fileUri);
          if (info.exists) {
            verified[id] = true;
          } else {
            changed = true;
          }
        }
      }

      if (changed) {
        await FileSystem.writeAsStringAsync(SS_VIDEO_METADATA, JSON.stringify(verified));
      }
    } catch (e) {}
    return verified;
  };

  const initAndLoad = async () => {
    setLoading(true);
    setVideoClips([]); // Clear previous results when switching
    setIsOffline(false);

    try {
      if (!(await FileSystem.getInfoAsync(SS_VIDEO_DIR)).exists) {
        await FileSystem.makeDirectoryAsync(SS_VIDEO_DIR, { intermediates: true });
      }
    } catch (e) {}

    // Reconcile downloads vs actual files on disk
    const verified = await reconcileDownloads();
    setDownloadedVideos(verified);

    // Load from local cache first
    let cachedItems: VideoClip[] = [];
    try {
      if ((await FileSystem.getInfoAsync(SS_VIDEO_CACHE)).exists) {
        const cacheContent = await FileSystem.readAsStringAsync(SS_VIDEO_CACHE);
        const allCached: Record<string, VideoClip[]> = JSON.parse(cacheContent);
        const langItems = allCached[mediaLang] || [];
        if (langItems.length > 0) {
          cachedItems = langItems;
          setVideoClips(langItems);
          autoSelectQuarter(langItems);
          setLoading(false); // Cache found, stop main loading
        }
      }
    } catch (e) {}

    // Then try network
    try {
      setIsRefreshing(true);
      const freshItems = await fetchFromNetwork();
      if (freshItems.length > 0) {
        setVideoClips(freshItems);
        autoSelectQuarter(freshItems);
        await saveToCache(freshItems);
      }
    } catch (e) {
      setIsOffline(true);
      if (cachedItems.length === 0) setVideoClips([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const autoSelectQuarter = (items: VideoClip[]) => {
    const quarters = Array.from(new Set(items.map(a => a.qQuarter))).filter(Boolean) as string[];
    if (quarters.length > 0) {
      setSelectedQuarter(quarters.sort((a, b) => b.localeCompare(a))[0]);
    }
  };

  const fetchFromNetwork = async (): Promise<VideoClip[]> => {
    const qRes = await fetch(`https://sabbath-school.adventech.io/api/v2/${mediaLang}/quarterlies/index.json`);
    if (!qRes.ok) throw new Error('Network failed');
    const data = await qRes.json();

    const quarterlies = data
      .filter((q: any) => q.id.includes('202') || q.id.includes('201'))
      .map((q: any) => {
          let type: any = 'adult';
          const idLow = q.id.toLowerCase();
          if (idLow.includes('cq') || idLow.includes('inverse')) type = 'inverse';
          else if (idLow.includes('cc') || idLow.includes('cornerstone')) type = 'cornerstone';
          else if (idLow.includes('gracelink') || idLow.includes('primary')) type = 'kids';
          const matches = q.id.match(/(\d{4}-\d{2})/);
          return { id: q.id, title: q.title, type, quarter: matches ? matches[1] : 'Long Term', cover: q.cover };
      });

    let allClips: VideoClip[] = [];
    await Promise.all(quarterlies.slice(0, 25).map(async (q: any) => {
        try {
            const vRes = await fetch(`https://sabbath-school.adventech.io/api/v2/${mediaLang}/quarterlies/${q.id}/video.json`);
            if (vRes.ok) {
                const videoData = await vRes.json();
                if (Array.isArray(videoData)) {
                    videoData.forEach((v: any) => {
                        if (v.clips && Array.isArray(v.clips)) {
                            v.clips.forEach((c: any) => {
                                allClips.push({ id: c.id || c.src, title: c.title, image: c.image || c.thumbnail || q.cover || '', src: c.src || c.url, quarterlyTitle: q.title, targetIndex: v.targetIndex, qType: q.type, qQuarter: q.quarter });
                            });
                        }
                    });
                }
            }
        } catch (e) {}
    }));
    return allClips.filter((item, index, self) => index === self.findIndex((t) => t.src === item.src));
  };

  const saveToCache = async (items: VideoClip[]) => {
    try {
      let allCached: Record<string, VideoClip[]> = {};
      if ((await FileSystem.getInfoAsync(SS_VIDEO_CACHE)).exists) {
        const existing = await FileSystem.readAsStringAsync(SS_VIDEO_CACHE);
        allCached = JSON.parse(existing);
      }
      allCached[mediaLang] = items;
      await FileSystem.writeAsStringAsync(SS_VIDEO_CACHE, JSON.stringify(allCached));
    } catch (e) {}
  };

  const downloadVideo = async (item: VideoClip) => {
    const key = item.id;
    try {
      const fileUri = `${SS_VIDEO_DIR}${key}.mp4`;
      const dl = FileSystem.createDownloadResumable(item.src, fileUri, {}, (dp) => {
          setDownloadingProgress(prev => ({ ...prev, [key]: dp.totalBytesWritten / dp.totalBytesExpectedToWrite }));
      });
      const result = await dl.downloadAsync();
      if (result && result.status === 200) {
        setDownloadedVideos(prev => {
            const next = { ...prev, [key]: true };
            FileSystem.writeAsStringAsync(SS_VIDEO_METADATA, JSON.stringify(next)).catch(() => {});
            return next;
        });
      }
    } catch (e) { Alert.alert(t('error'), t('download_failed')); }
    setDownloadingProgress(prev => { const n = {...prev}; delete n[key]; return n; });
  };

  const deleteVideo = (item: VideoClip) => {
    Alert.alert(t('delete'), t('delete_audio_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
          try {
            await FileSystem.deleteAsync(`${SS_VIDEO_DIR}${item.id}.mp4`, { idempotent: true });
            setDownloadedVideos(prev => {
                const next = { ...prev }; delete next[item.id];
                FileSystem.writeAsStringAsync(SS_VIDEO_METADATA, JSON.stringify(next)).catch(() => {});
                return next;
            });
          } catch (e) {}
      }}
    ]);
  };

  const playVideo = (item: VideoClip) => {
    const isLocal = downloadedVideos[item.id] === true;
    router.push({ pathname: '/video/player', params: { title: item.title, url: isLocal ? `${SS_VIDEO_DIR}${item.id}.mp4` : item.src, thumbnail: item.image } });
  };

  const filteredClips = useMemo(() => {
    return videoClips.filter(clip => {
      const matchSearch = (clip.title + (clip.quarterlyTitle || '')).toLowerCase().includes(searchQuery.toLowerCase());
      const matchQuarter = !selectedQuarter || clip.qQuarter === selectedQuarter;
      const matchType = selectedType === 'all' || clip.qType === selectedType;
      const lessonNum = extractLessonNum(clip.targetIndex);
      const matchLesson = selectedLesson === null || lessonNum === selectedLesson;
      const isStored = downloadedVideos[clip.id] === true;
      const matchOffline = !showDownloadedOnly || isStored;
      return matchSearch && matchQuarter && matchType && matchLesson && matchOffline;
    });
  }, [videoClips, searchQuery, selectedLesson, selectedType, selectedQuarter, showDownloadedOnly, downloadedVideos]);

  const sections = useMemo(() => {
    const groups: { [key: string]: VideoClip[] } = {};
    filteredClips.forEach(item => {
      const lessonNum = extractLessonNum(item.targetIndex);
      const key = lessonNum ? `Leçon ${lessonNum}` : "Autres Vidéos";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return Object.keys(groups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(key => ({ title: key, data: groups[key] }));
  }, [filteredClips]);

  const uniqueQuarters = useMemo(() => {
    return Array.from(new Set(videoClips.map(a => a.qQuarter))).filter(Boolean).sort((a, b) => (b as string).localeCompare(a as string)) as string[];
  }, [videoClips]);

  return (
    <SafeAreaView className="flex-1 bg-background-dark" edges={['top']}>
      <View className="bg-slate-950 px-5 pt-3 pb-3 border-b border-white/5">
        <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 rounded-lg bg-slate-900 items-center justify-center border border-white/10"><ChevronLeft size={16} color="#f8fafc" /></TouchableOpacity>
            <View className="flex-row items-center gap-2">
                <Text className="text-white font-black text-base" style={{ fontFamily: fontFamilyBold }}>Vidéos SS</Text>
                {isOffline && <View className="bg-amber-500/20 px-2 py-0.5 rounded-full flex-row items-center gap-1 border border-amber-500/30"><WifiOff size={9} color="#f59e0b" /><Text className="text-amber-500 text-[8px] font-bold">HORS-LIGNE</Text></View>}
            </View>
            <View className="flex-row gap-2">
                {(loading || isRefreshing) && <ActivityIndicator size="small" color="#f59e0b" className="mr-2" />}
                <TouchableOpacity onPress={() => initAndLoad()} className="w-8 h-8 rounded-lg bg-slate-900 items-center justify-center border border-white/10"><RefreshCw size={14} color="#f59e0b" /></TouchableOpacity>
                <TouchableOpacity onPress={() => setLangModalVisible(true)} className="w-8 h-8 rounded-lg bg-slate-900 items-center justify-center border border-white/10"><Globe size={16} color="#f59e0b" /></TouchableOpacity>
            </View>
        </View>

        <View className="flex-row items-center gap-2 mb-3">
            <View className="flex-row flex-1 bg-slate-900 p-0.5 rounded-xl border border-white/5">
                <TouchableOpacity onPress={() => setShowDownloadedOnly(false)} className={`flex-1 py-2 rounded-lg items-center ${!showDownloadedOnly ? 'bg-amber-500' : ''}`}><Text className={`text-[9px] font-bold uppercase ${!showDownloadedOnly ? 'text-black' : 'text-slate-500'}`}>Tout</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDownloadedOnly(true)} className={`flex-1 py-2 rounded-lg items-center ${showDownloadedOnly ? 'bg-emerald-600' : ''}`}><Text className={`text-[9px] font-bold uppercase ${showDownloadedOnly ? 'text-white' : 'text-slate-500'}`}>Stocké</Text></TouchableOpacity>
            </View>
            <View className="flex-row items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-[45%]">
                <Search size={14} color="#64748b" />
                <TextInput placeholder="Chercher..." placeholderTextColor="#475569" value={searchQuery} onChangeText={setSearchQuery} className="flex-1 ml-2 text-white text-[10px]" style={{ fontFamily }} />
            </View>
        </View>

        <View className="flex-row items-center gap-2 mb-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
                <View className="flex-row gap-2">
                    {SERIES_TYPES.map(type => (
                        <TouchableOpacity key={type.id} onPress={() => setSelectedType(type.id)} className={`px-3 py-1.5 rounded-lg border ${selectedType === type.id ? 'bg-amber-500 border-amber-500' : 'bg-slate-900 border-white/5'}`}><Text className={`text-[9px] font-bold uppercase ${selectedType === type.id ? 'text-black' : 'text-slate-500'}`}>{type.label}</Text></TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
            <View className="w-[1px] h-4 bg-white/10" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-w-[120px]">
                <View className="flex-row gap-1.5">
                    {uniqueQuarters.map(q => (
                        <TouchableOpacity key={q} onPress={() => setSelectedQuarter(q === selectedQuarter ? null : q)} className={`px-2 py-1.5 rounded-lg ${selectedQuarter === q ? 'bg-amber-500/20 border border-amber-500/30' : ''}`}><Text className={`text-[9px] font-bold ${selectedQuarter === q ? 'text-amber-500' : 'text-slate-500'}`}>{q.replace('20', "'")}</Text></TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>

        <View className="flex-row items-center border-t border-white/5 pt-3">
            <Text className="text-slate-600 text-[8px] font-black uppercase mr-3">Leçons</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(num => (
                        <TouchableOpacity key={num} onPress={() => setSelectedLesson(num === selectedLesson ? null : num)} className={`w-7 h-7 items-center justify-center rounded-lg border ${selectedLesson === num ? 'bg-amber-500 border-amber-500' : 'bg-slate-900 border-white/5'}`}><Text className={`text-[9px] font-bold ${selectedLesson === num ? 'text-black' : 'text-slate-500'}`}>{num}</Text></TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
      </View>

      <View className="flex-1">
        {loading && videoClips.length === 0 ? (
            <View className="flex-1 items-center justify-center"><ActivityIndicator size="small" color="#f59e0b" /></View>
        ) : filteredClips.length === 0 && isOffline ? (
            <View className="flex-1 items-center justify-center px-10">
                <WifiOff size={40} color="#1e293b" />
                <Text className="text-slate-600 text-center text-sm mt-4 font-bold">Hors-ligne</Text>
                <Text className="text-slate-700 text-center text-xs mt-2">Aucun cache disponible. Connectez-vous pour charger les vidéos.</Text>
                <TouchableOpacity onPress={() => initAndLoad()} className="mt-6 bg-amber-500 px-6 py-3 rounded-xl"><Text className="text-black font-bold text-xs">Réessayer</Text></TouchableOpacity>
            </View>
        ) : filteredClips.length === 0 ? (
            <View className="flex-1 items-center justify-center px-10"><Text className="text-slate-600 text-center text-xs">Aucune vidéo.</Text></View>
        ) : (
            <SectionList sections={sections} keyExtractor={(item, index) => item.id + index} contentContainerStyle={{ paddingBottom: 100 }} stickySectionHeadersEnabled={true}
                renderSectionHeader={({ section: { title } }) => ( <View className="bg-slate-950/95 px-6 py-2 border-b border-white/5"><Text className="text-amber-500 font-bold text-[8px] uppercase tracking-widest">{title}</Text></View> )}
                renderItem={({ item }) => {
                    const isDownloaded = downloadedVideos[item.id] === true;
                    const progress = downloadingProgress[item.id];
                    return (
                        <TouchableOpacity onPress={() => playVideo(item)} className="bg-slate-900/40 p-4 border-b border-white/5 flex-row items-center">
                            <View className="w-24 h-14 rounded-xl bg-slate-800 overflow-hidden border border-white/5 flex-shrink-0">
                                <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
                                <View className="absolute inset-0 items-center justify-center bg-black/20"><PlayCircle size={20} color="white" /></View>
                            </View>
                            <View className="ml-3 flex-1">
                                <View className="flex-row items-center mb-1">
                                    {item.qType === 'inverse' && <Text className="text-amber-500 text-[6px] font-bold mr-2">INVERSE</Text>}
                                    {item.qType === 'kids' && <Text className="text-blue-500 text-[6px] font-bold mr-2">KIDS</Text>}
                                    {isDownloaded && <Text className="text-emerald-500 text-[6px] font-bold uppercase tracking-widest">LOCAL</Text>}
                                </View>
                                <Text className="text-white font-bold text-xs leading-4" numberOfLines={2} style={{ fontFamily: fontFamilyBold }}>{item.title}</Text>
                                <Text className="text-slate-500 text-[9px] mt-0.5" numberOfLines={1}>{item.quarterlyTitle}</Text>
                            </View>
                            <TouchableOpacity onPress={() => isDownloaded ? deleteVideo(item) : downloadVideo(item)} className="w-8 h-8 items-center justify-center ml-2 flex-shrink-0">
                                {progress !== undefined ? <ActivityIndicator size="small" color="#f59e0b" /> : isDownloaded ? <Trash2 size={14} color="#ef4444" /> : <Download size={14} color="#64748b" />}
                            </TouchableOpacity>
                        </TouchableOpacity>
                    );
                }}
            />
        )}
      </View>

      <Modal visible={langModalVisible} transparent animationType="fade">
        <TouchableOpacity activeOpacity={1} onPress={() => setLangModalVisible(false)} className="flex-1 bg-black/90 items-center justify-center p-8">
            <View className="bg-slate-900 w-full rounded-3xl border border-white/10 p-6">
                <Text className="text-white font-black text-center mb-6 uppercase tracking-widest">Langue</Text>
                <View className="flex-row flex-wrap justify-between gap-3">
                    {SUPPORTED_LANGS.map(lang => (
                        <TouchableOpacity key={lang.code} onPress={() => { setMediaLang(lang.code); setLangModalVisible(false); }} className={`w-[48%] py-4 rounded-2xl border items-center ${mediaLang === lang.code ? 'bg-amber-500 border-amber-400' : 'bg-slate-800 border-white/5'}`}>
                            <Text className={`font-bold ${mediaLang === lang.code ? 'text-black' : 'text-slate-400'}`}>{lang.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
