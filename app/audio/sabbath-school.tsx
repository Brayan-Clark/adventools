import { useRouter } from 'expo-router';
import { ChevronLeft, Headphones, Globe, RefreshCw, Search, X, Download, Trash2, AlertCircle, WifiOff } from 'lucide-react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, Image, SectionList, ActivityIndicator, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';

import { useSettings } from '../../lib/settings-context';
import { useTranslation } from '../../lib/i18n';

interface AudioItem {
  id: string;
  title: string;
  artist: string;
  src: string;
  image: string;
  target?: string;
  targetIndex?: string;
  quarterlyTitle?: string;
  quarterlyId?: string;
  qType?: string;
  qQuarter?: string;
}

const SS_AUDIO_DIR = `${FileSystem.documentDirectory}sabbath-school/`;
const SS_METADATA_FILE = `${SS_AUDIO_DIR}metadata.json`;
const SS_MEDIA_CACHE = `${SS_AUDIO_DIR}media-cache.json`;

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

export default function SabbathSchoolAudioScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();
  const { settings: globalSettings } = useSettings();
  
  const initialLang = SUPPORTED_LANGS.find(l => l.label === currentLang)?.code || 'fr';
  const [mediaLang, setMediaLang] = useState(initialLang);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [mediaItems, setMediaItems] = useState<AudioItem[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [showDownloadedOnly, setShowDownloadedOnly] = useState(false);

  const [downloadedMedia, setDownloadedMedia] = useState<Record<string, boolean>>({});
  const [downloadingProgress, setDownloadingProgress] = useState<Record<string, number>>({});

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  useEffect(() => {
    initAndLoad();
  }, [mediaLang]);

  // Reconcile: scan disk and rebuild downloadedMedia from actual files.
  // This self-heals the metadata if it gets out of sync after restart/crash.
  const reconcileDownloads = async (): Promise<Record<string, boolean>> => {
    const verified: Record<string, boolean> = {};
    try {
      const dirInfo = await FileSystem.getInfoAsync(SS_AUDIO_DIR);
      if (!dirInfo.exists) return verified;

      // Read saved metadata first
      let saved: Record<string, boolean> = {};
      if ((await FileSystem.getInfoAsync(SS_METADATA_FILE)).exists) {
        const content = await FileSystem.readAsStringAsync(SS_METADATA_FILE);
        saved = JSON.parse(content);
      }

      // For each saved entry, verify the file actually exists on disk
      let changed = false;
      for (const [id, val] of Object.entries(saved)) {
        if (val) {
          const fileUri = `${SS_AUDIO_DIR}${id}.mp3`;
          const info = await FileSystem.getInfoAsync(fileUri);
          if (info.exists) {
            verified[id] = true;
          } else {
            changed = true; // file is gone — don't include
          }
        }
      }

      // Persist if metadata changed
      if (changed) {
        await FileSystem.writeAsStringAsync(SS_METADATA_FILE, JSON.stringify(verified));
      }
    } catch (e) {}
    return verified;
  };

  const initAndLoad = async () => {
    setLoading(true);
    setIsOffline(false);

    // Step 1: Ensure directory exists
    try {
      if (!(await FileSystem.getInfoAsync(SS_AUDIO_DIR)).exists) {
        await FileSystem.makeDirectoryAsync(SS_AUDIO_DIR, { intermediates: true });
      }
    } catch (e) {}

    // Step 2: Reconcile downloads — cross-check metadata vs actual files on disk
    const verified = await reconcileDownloads();
    setDownloadedMedia(verified);

    // Step 3: Load from local cache FIRST so user sees content immediately
    let cachedItems: AudioItem[] = [];
    try {
      if ((await FileSystem.getInfoAsync(SS_MEDIA_CACHE)).exists) {
        const cacheContent = await FileSystem.readAsStringAsync(SS_MEDIA_CACHE);
        const allCached: Record<string, AudioItem[]> = JSON.parse(cacheContent);
        const langItems = allCached[mediaLang] || [];
        if (langItems.length > 0) {
          cachedItems = langItems;
          setMediaItems(langItems);
          autoSelectQuarter(langItems);
          setLoading(false); // Show cached data right away
        }
      }
    } catch (e) {}

    // Step 4: Try to fetch fresh data from network
    try {
      const freshItems = await fetchFromNetwork();
      if (freshItems.length > 0) {
        setMediaItems(freshItems);
        autoSelectQuarter(freshItems);
        // Save to cache for next offline use
        await saveToCache(freshItems);
      }
    } catch (e) {
      // Network failed — use cached data if available
      setIsOffline(true);
      if (cachedItems.length === 0) {
        // No cache at all → show offline state
        setMediaItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const autoSelectQuarter = (items: AudioItem[]) => {
    const quarters = Array.from(new Set(items.map(a => a.qQuarter))).filter(Boolean) as string[];
    if (quarters.length > 0) {
      const latest = quarters.sort((a, b) => b.localeCompare(a))[0];
      setSelectedQuarter(latest);
    }
  };

  const fetchFromNetwork = async (): Promise<AudioItem[]> => {
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
          else if (idLow.includes('kids') || idLow.includes('primary')) type = 'kids';
          const matches = q.id.match(/(\d{4}-\d{2})/);
          return { id: q.id, title: q.title, type, quarter: matches ? matches[1] : 'Long Term' };
      });

    const toFetch = quarterlies.slice(0, 25);
    let allAudio: AudioItem[] = [];
    const results = await Promise.all(toFetch.map(async (q: any) => {
        try {
            const aRes = await fetch(`https://sabbath-school.adventech.io/api/v2/${mediaLang}/quarterlies/${q.id}/audio.json`);
            if (aRes.ok) {
                const audioData = await aRes.json();
                return Array.isArray(audioData) ? audioData.map((a: any) => ({
                    ...a, src: a.src || a.url, id: a.id || a.src,
                    quarterlyTitle: q.title, quarterlyId: q.id, qType: q.type, qQuarter: q.quarter
                })) : [];
            }
        } catch (e) {}
        return [];
    }));
    results.forEach(list => { allAudio = allAudio.concat(list); });
    return allAudio.filter((item, index, self) => index === self.findIndex((t) => t.src === item.src));
  };

  const saveToCache = async (items: AudioItem[]) => {
    try {
      let allCached: Record<string, AudioItem[]> = {};
      if ((await FileSystem.getInfoAsync(SS_MEDIA_CACHE)).exists) {
        const existing = await FileSystem.readAsStringAsync(SS_MEDIA_CACHE);
        allCached = JSON.parse(existing);
      }
      allCached[mediaLang] = items;
      await FileSystem.writeAsStringAsync(SS_MEDIA_CACHE, JSON.stringify(allCached));
    } catch (e) {}
  };

  const downloadAudio = async (item: AudioItem) => {
    const key = item.id;
    try {
      const fileUri = `${SS_AUDIO_DIR}${key}.mp3`;
      const dl = FileSystem.createDownloadResumable(item.src, fileUri, {}, (dp) => {
          setDownloadingProgress(prev => ({ ...prev, [key]: dp.totalBytesWritten / dp.totalBytesExpectedToWrite }));
      });
      const result = await dl.downloadAsync();
      if (result && result.status === 200) {
        setDownloadedMedia(prev => {
            const next = { ...prev, [key]: true };
            FileSystem.writeAsStringAsync(SS_METADATA_FILE, JSON.stringify(next)).catch(() => {});
            return next;
        });
      }
    } catch (e) { Alert.alert(t('error'), t('download_failed')); }
    setDownloadingProgress(prev => { const n = {...prev}; delete n[key]; return n; });
  };

  const deleteAudio = (item: AudioItem) => {
    Alert.alert(t('delete'), t('delete_audio_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
          try {
            await FileSystem.deleteAsync(`${SS_AUDIO_DIR}${item.id}.mp3`, { idempotent: true });
            setDownloadedMedia(prev => {
                const next = { ...prev }; delete next[item.id];
                FileSystem.writeAsStringAsync(SS_METADATA_FILE, JSON.stringify(next)).catch(() => {});
                return next;
            });
          } catch (e) {}
      }}
    ]);
  };

  const playAudio = (item: AudioItem) => {
    const isLocal = downloadedMedia[item.id] === true;
    router.push({ pathname: '/audio/player', params: { title: item.title, artist: item.artist, artwork: item.image, url: isLocal ? `${SS_AUDIO_DIR}${item.id}.mp3` : item.src, isLocal: isLocal ? 'true' : 'false', subtext: item.quarterlyTitle } });
  };

  const filteredItems = useMemo(() => {
    return mediaItems.filter(item => {
      const matchSearch = (item.title + (item.artist || '')).toLowerCase().includes(searchQuery.toLowerCase());
      const matchQuarter = !selectedQuarter || item.qQuarter === selectedQuarter;
      const matchType = selectedType === 'all' || item.qType === selectedType;
      const lessonNum = extractLessonNum(item.targetIndex);
      const matchLesson = selectedLesson === null || lessonNum === selectedLesson;
      const isStored = downloadedMedia[item.id] === true;
      const matchOffline = !showDownloadedOnly || isStored;
      return matchSearch && matchQuarter && matchType && matchLesson && matchOffline;
    });
  }, [mediaItems, searchQuery, selectedLesson, selectedType, selectedQuarter, showDownloadedOnly, downloadedMedia]);

  const sections = useMemo(() => {
    const groups: { [key: string]: AudioItem[] } = {};
    filteredItems.forEach(item => {
      const key = item.quarterlyTitle || "Audio";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return Object.keys(groups).map(key => ({ header: key, data: groups[key] }));
  }, [filteredItems]);

  const uniqueQuarters = useMemo(() => {
    return Array.from(new Set(mediaItems.map(a => a.qQuarter))).filter(Boolean).sort((a, b) => (b as string).localeCompare(a as string)) as string[];
  }, [mediaItems]);

  return (
    <SafeAreaView className="flex-1 bg-background-dark" edges={['top']}>
      <View className="bg-slate-950 px-5 pt-3 pb-3 border-b border-white/5">
        <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 rounded-lg bg-slate-900 items-center justify-center border border-white/10"><ChevronLeft size={16} color="#f8fafc" /></TouchableOpacity>
            <View className="flex-row items-center gap-2">
                <Text className="text-white font-black text-base" style={{ fontFamily: fontFamilyBold }}>École du Sabbat</Text>
                {isOffline && <View className="bg-amber-500/20 px-2 py-0.5 rounded-full flex-row items-center gap-1 border border-amber-500/30"><WifiOff size={9} color="#f59e0b" /><Text className="text-amber-500 text-[8px] font-bold">HORS-LIGNE</Text></View>}
            </View>
            <View className="flex-row gap-2">
                <TouchableOpacity onPress={() => initAndLoad()} className="w-8 h-8 rounded-lg bg-slate-900 items-center justify-center border border-white/10"><RefreshCw size={14} color="#3b82f6" /></TouchableOpacity>
                <TouchableOpacity onPress={() => setLangModalVisible(true)} className="w-8 h-8 rounded-lg bg-slate-900 items-center justify-center border border-white/10"><Globe size={16} color="#3b82f6" /></TouchableOpacity>
            </View>
        </View>

        <View className="flex-row items-center gap-2 mb-3">
            <View className="flex-row flex-1 bg-slate-900 p-0.5 rounded-xl border border-white/5">
                <TouchableOpacity onPress={() => setShowDownloadedOnly(false)} className={`flex-1 py-2 rounded-lg items-center ${!showDownloadedOnly ? 'bg-indigo-600' : ''}`}><Text className={`text-[9px] font-bold uppercase ${!showDownloadedOnly ? 'text-white' : 'text-slate-500'}`}>Tout</Text></TouchableOpacity>
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
                        <TouchableOpacity key={type.id} onPress={() => setSelectedType(type.id)} className={`px-3 py-1.5 rounded-lg border ${selectedType === type.id ? 'bg-white border-white' : 'bg-slate-900 border-white/5'}`}><Text className={`text-[9px] font-bold uppercase ${selectedType === type.id ? 'text-black' : 'text-slate-500'}`}>{type.label}</Text></TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
            <View className="w-[1px] h-4 bg-white/10" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-w-[120px]">
                <View className="flex-row gap-1.5">
                    {uniqueQuarters.map(q => (
                        <TouchableOpacity key={q} onPress={() => setSelectedQuarter(q === selectedQuarter ? null : q)} className={`px-2 py-1.5 rounded-lg ${selectedQuarter === q ? 'bg-blue-500/20' : ''}`}><Text className={`text-[9px] font-bold ${selectedQuarter === q ? 'text-blue-400' : 'text-slate-500'}`}>{q.replace('20', "'")}</Text></TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>

        <View className="flex-row items-center border-t border-white/5 pt-3">
            <Text className="text-slate-600 text-[8px] font-black uppercase mr-3">Leçons</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(num => (
                        <TouchableOpacity key={num} onPress={() => setSelectedLesson(num === selectedLesson ? null : num)} className={`w-7 h-7 items-center justify-center rounded-lg border ${selectedLesson === num ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-900 border-white/5'}`}><Text className={`text-[9px] font-bold ${selectedLesson === num ? 'text-white' : 'text-slate-500'}`}>{num}</Text></TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
      </View>

      <View className="flex-1">
        {loading && mediaItems.length === 0 ? (
            <View className="flex-1 items-center justify-center"><ActivityIndicator size="small" color="#3b82f6" /></View>
        ) : filteredItems.length === 0 && isOffline ? (
            <View className="flex-1 items-center justify-center px-10">
                <WifiOff size={40} color="#1e293b" />
                <Text className="text-slate-600 text-center text-sm mt-4 font-bold">Hors-ligne</Text>
                <Text className="text-slate-700 text-center text-xs mt-2">Aucun cache disponible. Connectez-vous pour charger les leçons.</Text>
                <TouchableOpacity onPress={() => initAndLoad()} className="mt-6 bg-blue-600 px-6 py-3 rounded-xl"><Text className="text-white font-bold text-xs">Réessayer</Text></TouchableOpacity>
            </View>
        ) : filteredItems.length === 0 ? (
            <View className="flex-1 items-center justify-center px-10"><AlertCircle size={32} color="#1e293b" /><Text className="text-slate-600 text-center text-xs mt-4">Aucun résultat.</Text></View>
        ) : (
            <SectionList sections={sections} keyExtractor={(item, index) => item.id + index} contentContainerStyle={{ paddingBottom: 100 }} stickySectionHeadersEnabled={true}
                renderSectionHeader={({ section: { header } }) => (
                    <View className="bg-slate-950/95 px-6 py-2 border-b border-white/5"><Text className="text-white font-bold text-[8px] uppercase tracking-widest">{header}</Text></View>
                )}
                renderItem={({ item }) => {
                    const isDownloaded = downloadedMedia[item.id] === true;
                    const progress = downloadingProgress[item.id];
                    return (
                        <TouchableOpacity onPress={() => playAudio(item)} className="bg-slate-900/20 px-5 py-4 border-b border-white/5 flex-row items-center">
                            <View className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden border border-white/10 flex-shrink-0"><Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" /></View>
                            <View className="ml-4 flex-1">
                                <View className="flex-row items-center mb-0.5">
                                    {item.qType === 'inverse' && <Text className="text-amber-500 text-[6px] font-bold mr-2">INVERSE</Text>}
                                    {item.qType === 'kids' && <Text className="text-blue-500 text-[6px] font-bold mr-2">ENFANTS</Text>}
                                    {isDownloaded && <Text className="text-emerald-500 text-[6px] font-bold uppercase tracking-widest">LOCAL</Text>}
                                </View>
                                <Text className="text-white font-bold text-xs" numberOfLines={1}>{item.title}</Text>
                                <Text className="text-slate-500 text-[9px]" numberOfLines={1}>{item.artist}</Text>
                            </View>
                            <TouchableOpacity onPress={() => isDownloaded ? deleteAudio(item) : downloadAudio(item)} className="w-8 h-8 items-center justify-center mr-2 flex-shrink-0">
                                {progress !== undefined ? <ActivityIndicator size="small" color="#3b82f6" /> : isDownloaded ? <Trash2 size={14} color="#ef4444" /> : <Download size={14} color="#64748b" />}
                            </TouchableOpacity>
                            <Headphones size={14} color="#3b82f6" />
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
                        <TouchableOpacity key={lang.code} onPress={() => { setMediaLang(lang.code); setLangModalVisible(false); }} className={`w-[48%] py-4 rounded-2xl border items-center ${mediaLang === lang.code ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-white/5'}`}>
                            <Text className={`font-bold ${mediaLang === lang.code ? 'text-white' : 'text-slate-400'}`}>{lang.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
