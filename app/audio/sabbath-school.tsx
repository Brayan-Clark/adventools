import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Headphones, Globe, Play, AlertCircle, RefreshCw, Search, X, Filter } from 'lucide-react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, Image, SectionList, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
}

interface QuarterlyInfo {
  id: string;
  title: string;
  type: 'adult' | 'inverse' | 'cornerstone' | 'kids' | 'other';
  quarter: string;
}

const SUPPORTED_LANGS = [
  { code: 'fr', label: 'Français' },
  { code: 'mg', label: 'Malagasy' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'de', label: 'Deutsch' }
];

const SERIES_TYPES = [
  { id: 'all', label: 'Toutes Classes' },
  { id: 'adult', label: 'Adultes' },
  { id: 'inverse', label: 'InVerse' },
  { id: 'cornerstone', label: 'Cornerstone' },
  { id: 'kids', label: 'Enfants' }
];

const extractLessonNum = (index?: string) => {
    if (!index) return null;
    const parts = index.split(/[-_]/);
    let yearIdx = parts.findIndex(p => p.match(/^20\d{2}$/));
    if (yearIdx === -1) yearIdx = parts.findIndex(p => p.match(/^20\d{2}/));
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
  const [quarterlies, setQuarterlies] = useState<QuarterlyInfo[]>([]);
  const [mediaItems, setMediaItems] = useState<AudioItem[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  useEffect(() => {
    fetchQuarterlies();
  }, [mediaLang]);

  useEffect(() => {
    if (quarterlies.length > 0) fetchAllMedia();
  }, [quarterlies]);

  const fetchQuarterlies = async () => {
    setLoading(true);
    try {
      const qRes = await fetch(`https://sabbath-school.adventech.io/api/v2/${mediaLang}/quarterlies/index.json`);
      if (!qRes.ok) throw new Error("Failed");
      const data = await qRes.json();
      
      const processed: QuarterlyInfo[] = data
        .filter((q: any) => q.id.includes('202') || q.id.includes('201'))
        .map((q: any) => {
            let type: any = 'adult';
            const idLow = q.id.toLowerCase();
            if (idLow.includes('cq') || idLow.includes('inverse')) type = 'inverse';
            else if (idLow.includes('cc') || idLow.includes('cornerstone')) type = 'cornerstone';
            else if (idLow.includes('gracelink') || idLow.includes('primary') || idLow.includes('kindergarten') || idLow.includes('powerpoints')) type = 'kids';
            const matches = q.id.match(/(\d{4}-\d{2})/);
            return { id: q.id, title: q.title, type, quarter: matches ? matches[1] : 'Long Term' };
        });

      setQuarterlies(processed);
      if (processed.length > 0) setSelectedQuarter(processed[0].quarter);
    } catch (e) {
      setLoading(false);
    }
  };

  const fetchAllMedia = async () => {
    setLoading(true);
    try {
      const toFetch = quarterlies.slice(0, 15);
      let allAudio: AudioItem[] = [];
      const fetchPromises = toFetch.map(async (q) => {
        try {
            const aRes = await fetch(`https://sabbath-school.adventech.io/api/v2/${mediaLang}/quarterlies/${q.id}/audio.json`);
            if (aRes.ok) {
                const audioData = await aRes.json();
                if (Array.isArray(audioData)) {
                    return audioData.map(a => ({
                        ...a,
                        src: a.src || a.url,
                        quarterlyTitle: q.title,
                        quarterlyId: q.id,
                        qType: q.type,
                        qQuarter: q.quarter
                    }));
                }
            }
        } catch (e) {}
        return [];
      });

      const results = await Promise.all(fetchPromises);
      results.forEach(list => { allAudio = allAudio.concat(list); });
      const uniqueAudio = allAudio.filter((item, index, self) => index === self.findIndex((t) => t.src === item.src));
      setMediaItems(uniqueAudio);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return mediaItems.filter(item => {
      const matchSearch = (item.title + item.artist).toLowerCase().includes(searchQuery.toLowerCase());
      const matchQuarter = !selectedQuarter || (item as any).qQuarter === selectedQuarter;
      const matchType = selectedType === 'all' || (item as any).qType === selectedType;
      const lessonNum = extractLessonNum(item.targetIndex);
      const matchLesson = selectedLesson === null || lessonNum === selectedLesson;
      return matchSearch && matchQuarter && matchType && matchLesson;
    });
  }, [mediaItems, searchQuery, selectedLesson, selectedType, selectedQuarter]);

  const sections = useMemo(() => {
    const groups: { [key: string]: { items: AudioItem[], title?: string } } = {};
    filteredItems.forEach(item => {
      const lessonNum = extractLessonNum(item.targetIndex);
      const lessonKey = lessonNum ? `Leçon ${lessonNum}` : "Autres Ressources";
      if (!groups[lessonKey]) groups[lessonKey] = { items: [] };
      groups[lessonKey].items.push(item);
      if (!groups[lessonKey].title && item.title && !item.title.includes(item.artist || '')) groups[lessonKey].title = item.title;
    });
    return Object.keys(groups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(key => ({ header: key, subtitle: groups[key].title, data: groups[key].items }));
  }, [filteredItems]);

  const uniqueQuarters = useMemo(() => Array.from(new Set(quarterlies.map(q => q.quarter))).sort((a, b) => b.localeCompare(a)).slice(0, 6), [quarterlies]);

  const playAudio = (item: AudioItem) => {
    router.push({ pathname: '/audio/player', params: { title: item.title, artist: item.artist, artwork: item.image, url: item.src, subtext: item.quarterlyTitle } });
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="px-6 pt-4 pb-2 border-b border-slate-800/50">
        <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 rounded-full bg-slate-900 items-center justify-center border border-slate-800"><ChevronLeft size={20} color="#f8fafc" /></TouchableOpacity>
            <View className="flex-1 items-center px-2"><Text className="text-white font-bold text-base" style={{ fontFamily: fontFamilyBold }}>{t('audio_praise')}</Text></View>
            <TouchableOpacity onPress={fetchQuarterlies} className="w-8 h-8 rounded-full bg-slate-900 items-center justify-center border border-slate-800"><RefreshCw size={16} color="#94a3b8" /></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2">
                {SERIES_TYPES.map(type => (
                    <TouchableOpacity key={type.id} onPress={() => setSelectedType(type.id)}
                        className={`px-4 py-2 rounded-2xl border ${selectedType === type.id ? 'bg-primary border-primary' : 'bg-slate-900 border-slate-800'}`}>
                        <Text className={`text-[10px] uppercase font-bold tracking-wider ${selectedType === type.id ? 'text-white' : 'text-slate-500'}`} style={{ fontFamily: fontFamilyBold }}>{type.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>

        <View className="flex-row items-center mb-4">
            <Filter size={14} color="#64748b" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="ml-2">
                <View className="flex-row gap-2 items-center">
                    {uniqueQuarters.map(q => (
                        <TouchableOpacity key={q} onPress={() => setSelectedQuarter(q === selectedQuarter ? null : q)}
                            className={`px-3 py-1.5 rounded-lg border ${selectedQuarter === q ? 'bg-white border-white' : 'bg-slate-900 border-slate-800'}`}>
                            <Text className={`text-[9px] font-bold ${selectedQuarter === q ? 'text-black' : 'text-slate-400'}`} style={{ fontFamily: fontFamilyBold }}>{q}</Text>
                        </TouchableOpacity>
                    ))}
                    <View className="w-[1px] h-4 bg-slate-800 mx-1" />
                    {SUPPORTED_LANGS.map(lang => (
                        <TouchableOpacity key={lang.code} onPress={() => setMediaLang(lang.code)}
                            className={`px-3 py-1.5 rounded-lg border ${mediaLang === lang.code ? 'border-primary bg-primary/10' : 'bg-slate-900 border-slate-800'}`}>
                            <Text className={`text-[9px] font-bold uppercase ${mediaLang === lang.code ? 'text-primary' : 'text-slate-500'}`}>{lang.code}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>

        <View className="flex-row items-center gap-2 mb-2">
            <View className="flex-1 flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                <Search size={14} color="#64748b" />
                <TextInput placeholder="Rechercher..." placeholderTextColor="#64748b" value={searchQuery} onChangeText={setSearchQuery} className="flex-1 ml-2 text-white text-xs py-0.5" style={{ fontFamily }} />
                {searchQuery !== '' && <TouchableOpacity onPress={() => setSearchQuery('')}><X size={14} color="#64748b" /></TouchableOpacity>}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-w-[45%]">
                <View className="flex-row gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(num => (
                        <TouchableOpacity key={num} onPress={() => setSelectedLesson(num === selectedLesson ? null : num)}
                            className={`w-8 h-8 items-center justify-center rounded-lg border ${selectedLesson === num ? 'bg-primary border-primary' : 'bg-slate-900 border-slate-800'}`}>
                            <Text className={`text-[10px] font-bold ${selectedLesson === num ? 'text-white' : 'text-slate-500'}`}>L{num}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
      </View>

      <View className="flex-1">
        {loading ? (
            <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#f43f5e" /><Text className="text-slate-500 mt-4 text-xs">Synchronisation...</Text></View>
        ) : filteredItems.length === 0 ? (
            <View className="flex-1 items-center justify-center px-10"><AlertCircle size={48} color="#1e293b" /><Text className="text-slate-500 mt-6 text-center text-sm" style={{ fontFamily }}>Aucune ressource ne correspond à vos filtres.</Text></View>
        ) : (
            <SectionList sections={sections} keyExtractor={(item, index) => item.id + index} contentContainerStyle={{ paddingBottom: 100 }} stickySectionHeadersEnabled={true}
                renderSectionHeader={({ section: { header, subtitle } }) => (
                    <View className="bg-slate-950/95 px-6 py-3 border-b border-white/5 shadow-sm">
                        <Text className="text-white font-bold text-[10px] uppercase tracking-widest" style={{ fontFamily: fontFamilyBold }}>{header}</Text>
                        {subtitle && <Text className="text-slate-500 text-[9px] mt-1" numberOfLines={1}>{subtitle}</Text>}
                    </View>
                )}
                renderItem={({ item, section }) => {
                    const isCQ = (item as any).qType === 'inverse';
                    const isCC = (item as any).qType === 'cornerstone';
                    const isKids = (item as any).qType === 'kids';
                    const hasTitleCollision = section.data.filter(d => d.title === item.title).length > 1;
                    const displayTitle = hasTitleCollision ? (item.artist || 'Étude') : (item.title || "Audio");
                    const displayArtist = hasTitleCollision ? item.title : item.artist;
                    return (
                        <TouchableOpacity onPress={() => playAudio(item)} className="bg-slate-900/30 px-6 py-4 border-b border-white/5 flex-row items-center">
                            <View className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden border border-white/5"><Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" /></View>
                            <View className="ml-4 flex-1">
                                <View className="flex-row items-center mb-1">
                                    {isCQ && <View className="bg-amber-500/10 px-1 py-0.5 rounded mr-1"><Text className="text-amber-500 text-[6px] font-bold">INVERSE</Text></View>}
                                    {isCC && <View className="bg-emerald-500/10 px-1 py-0.5 rounded mr-1"><Text className="text-emerald-500 text-[6px] font-bold">CC</Text></View>}
                                    {isKids && <View className="bg-blue-500/10 px-1 py-0.5 rounded mr-1"><Text className="text-blue-500 text-[6px] font-bold">ENFANTS</Text></View>}
                                    <View className="bg-white/5 px-1 py-0.5 rounded"><Text className="text-white/40 text-[6px] font-bold">{(item as any).qQuarter}</Text></View>
                                </View>
                                <Text className="text-white font-bold text-sm leading-5" numberOfLines={1} style={{ fontFamily: fontFamilyBold }}>{displayTitle}</Text>
                                <Text className="text-slate-500 text-[10px]" numberOfLines={1}>{displayArtist}</Text>
                            </View>
                            <View className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center border border-white/5"><Headphones size={12} color="#f43f5e" /></View>
                        </TouchableOpacity>
                    );
                }}
            />
        )}
      </View>
    </SafeAreaView>
  );
}
