import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, MonitorPlay, PlayCircle, RefreshCw, AlertCircle, Search, X, Filter } from 'lucide-react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, Image, SectionList, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings } from '../../lib/settings-context';
import { useTranslation } from '../../lib/i18n';

interface VideoClip {
  id: string;
  title: string;
  image: string;
  src: string;
  thumbnail?: string;
  quarterlyTitle?: string;
  quarterlyId?: string;
  targetIndex?: string;
  qType?: string;
  qQuarter?: string;
}

interface QuarterlyInfo {
  id: string;
  title: string;
  type: 'adult' | 'inverse' | 'cornerstone' | 'kids' | 'other';
  quarter: string;
  cover?: string;
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
  { id: 'all', label: 'Touts' },
  { id: 'adult', label: 'Adultes' },
  { id: 'inverse', label: 'InVerse' },
  { id: 'cornerstone', label: 'CC' },
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

export default function SabbathSchoolVideoScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();
  const { settings: globalSettings } = useSettings();
  
  const initialLang = SUPPORTED_LANGS.find(l => l.label === currentLang)?.code || 'fr';
  const [mediaLang, setMediaLang] = useState(initialLang);
  const [loading, setLoading] = useState(true);
  const [quarterlies, setQuarterlies] = useState<QuarterlyInfo[]>([]);
  const [videoClips, setVideoClips] = useState<VideoClip[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  useEffect(() => { fetchQuarterlies(); }, [mediaLang]);
  useEffect(() => { if (quarterlies.length > 0) fetchAllVideos(); }, [quarterlies]);

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
            else if (idLow.includes('gracelink') || idLow.includes('primary') || idLow.includes('kindergarten')) type = 'kids';
            const matches = q.id.match(/(\d{4}-\d{2})/);
            return { id: q.id, title: q.title, type, quarter: matches ? matches[1] : 'Long Term', cover: q.cover };
        });
      setQuarterlies(processed);
      if (processed.length > 0) setSelectedQuarter(processed[0].quarter);
    } catch (e) { setLoading(false); }
  };

  const fetchAllVideos = async () => {
    setLoading(true);
    try {
      const toFetch = quarterlies.slice(0, 15);
      let allClips: VideoClip[] = [];
      const fetchPromises = toFetch.map(async (q) => {
        try {
            const vRes = await fetch(`https://sabbath-school.adventech.io/api/v2/${mediaLang}/quarterlies/${q.id}/video.json`);
            if (vRes.ok) {
                const videoData = await vRes.json();
                if (Array.isArray(videoData)) {
                    videoData.forEach(v => {
                        if (v.clips && Array.isArray(v.clips)) {
                            v.clips.forEach((c: any) => {
                                allClips.push({
                                    id: c.id, title: c.title, image: c.image || c.thumbnail || q.cover || '', src: c.src || c.url, quarterlyTitle: q.title, quarterlyId: q.id, targetIndex: v.targetIndex, qType: q.type, qQuarter: q.quarter
                                });
                            });
                        }
                    });
                }
            }
        } catch (e) {}
      });
      await Promise.all(fetchPromises);
      const uniqueClips = allClips.filter((item, index, self) => index === self.findIndex((t) => t.src === item.src));
      setVideoClips(uniqueClips);
    } catch (error) {
    } finally { setLoading(false); }
  };

  const filteredClips = useMemo(() => {
    return videoClips.filter(clip => {
      const matchSearch = (clip.title + (clip.quarterlyTitle || '')).toLowerCase().includes(searchQuery.toLowerCase());
      const matchQuarter = !selectedQuarter || (clip as any).qQuarter === selectedQuarter;
      const matchType = selectedType === 'all' || (clip as any).qType === selectedType;
      const lessonNum = extractLessonNum(clip.targetIndex);
      const matchLesson = selectedLesson === null || lessonNum === selectedLesson;
      return matchSearch && matchQuarter && matchType && matchLesson;
    });
  }, [videoClips, searchQuery, selectedLesson, selectedType, selectedQuarter]);

  const sections = useMemo(() => {
    const groups: { [key: string]: VideoClip[] } = {};
    filteredClips.forEach(item => {
      const lessonNum = extractLessonNum(item.targetIndex);
      const lessonKey = lessonNum ? `Leçon ${lessonNum}` : "Autres Vidéos";
      if (!groups[lessonKey]) groups[lessonKey] = [];
      groups[lessonKey].push(item);
    });
    return Object.keys(groups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(key => ({ title: key, data: groups[key] }));
  }, [filteredClips]);

  const uniqueQuarters = useMemo(() => Array.from(new Set(quarterlies.map(q => q.quarter))).sort((a, b) => b.localeCompare(a)).slice(0, 6), [quarterlies]);

  return (
    <SafeAreaView className="flex-1 bg-background-dark" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="px-6 pt-4 pb-2 border-b border-white/5">
        <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 rounded-full bg-slate-900 items-center justify-center border border-slate-800"><ChevronLeft size={20} color="#f8fafc" /></TouchableOpacity>
            <View className="flex-1 items-center px-2"><Text className="text-white font-bold text-base" style={{ fontFamily: fontFamilyBold }}>{t('video_and_tv')}</Text></View>
            <TouchableOpacity onPress={fetchQuarterlies} className="w-8 h-8 rounded-full bg-slate-900 items-center justify-center border border-slate-800"><RefreshCw size={16} color="#94a3b8" /></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2">
                {SERIES_TYPES.map(type => (
                    <TouchableOpacity key={type.id} onPress={() => setSelectedType(type.id)}
                        className={`px-4 py-2 rounded-2xl border ${selectedType === type.id ? 'bg-amber-500 border-amber-500' : 'bg-slate-900 border-slate-800'}`}>
                        <Text className={`text-[10px] uppercase font-bold tracking-wider ${selectedType === type.id ? 'text-black' : 'text-slate-500'}`} style={{ fontFamily: fontFamilyBold }}>{type.label}</Text>
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
                            className={`px-3 py-1.5 rounded-lg border ${selectedQuarter === q ? 'bg-amber-500 border-amber-500' : 'bg-slate-900 border-slate-800'}`}>
                            <Text className={`text-[9px] font-bold ${selectedQuarter === q ? 'text-black' : 'text-slate-400'}`} style={{ fontFamily: fontFamilyBold }}>{q}</Text>
                        </TouchableOpacity>
                    ))}
                    <View className="w-[1px] h-4 bg-slate-800 mx-1" />
                    {SUPPORTED_LANGS.map(lang => (
                        <TouchableOpacity key={lang.code} onPress={() => setMediaLang(lang.code)}
                            className={`px-3 py-1.5 rounded-lg border ${mediaLang === lang.code ? 'border-amber-500 bg-amber-500/10' : 'bg-slate-900 border-slate-800'}`}>
                            <Text className={`text-[9px] font-bold uppercase ${mediaLang === lang.code ? 'text-amber-500' : 'text-slate-500'}`}>{lang.code}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>

        <View className="flex-row items-center gap-2 mb-2">
            <View className="flex-1 flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                <Search size={14} color="#64748b" /><TextInput placeholder="Rechercher..." placeholderTextColor="#64748b" value={searchQuery} onChangeText={setSearchQuery} className="flex-1 ml-2 text-white text-xs py-0.5" style={{ fontFamily }} />
                {searchQuery !== '' && <TouchableOpacity onPress={() => setSearchQuery('')}><X size={14} color="#64748b" /></TouchableOpacity>}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-w-[45%]">
                <View className="flex-row gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(num => (
                        <TouchableOpacity key={num} onPress={() => setSelectedLesson(num === selectedLesson ? null : num)}
                            className={`w-8 h-8 items-center justify-center rounded-lg border ${selectedLesson === num ? 'bg-amber-500 border-amber-500' : 'bg-slate-900 border-slate-800'}`}>
                            <Text className={`text-[10px] font-bold ${selectedLesson === num ? 'text-black' : 'text-slate-500'}`}>L{num}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
      </View>

      <View className="flex-1">
        {loading ? (
            <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#f59e0b" /><Text className="text-slate-500 mt-4 text-xs">Chargement...</Text></View>
        ) : filteredClips.length === 0 ? (
            <View className="flex-1 items-center justify-center px-10"><AlertCircle size={48} color="#1e293b" /><Text className="text-slate-500 mt-6 text-center text-sm" style={{ fontFamily }}>Aucune vidéo.</Text></View>
        ) : (
            <SectionList sections={sections} keyExtractor={(item, index) => item.id + index} contentContainerStyle={{ paddingBottom: 100 }} stickySectionHeadersEnabled={true}
                renderSectionHeader={({ section: { title } }) => ( <View className="bg-slate-950 px-6 py-2 border-b border-white/5"><Text className="text-amber-500 font-bold text-[9px] uppercase tracking-widest" style={{ fontFamily: fontFamilyBold }}>{title}</Text></View> )}
                renderItem={({ item }) => {
                    const isCQ = (item as any).qType === 'inverse';
                    const isCC = (item as any).qType === 'cornerstone';
                    const isKids = (item as any).qType === 'kids';
                    return (
                        <TouchableOpacity onPress={() => router.push({ pathname: '/video/player', params: { title: item.title, url: item.src, thumbnail: item.image } })} className="bg-slate-900/40 p-4 border-b border-white/5 flex-row items-center">
                            <View className="w-24 h-14 rounded-xl bg-slate-800 overflow-hidden border border-white/5"><Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" /><View className="absolute inset-0 items-center justify-center bg-black/20"><PlayCircle size={20} color="white" /></View></View>
                            <View className="ml-4 flex-1">
                                <View className="flex-row items-center mb-1">
                                    {isCQ && <View className="bg-amber-500/20 px-1 py-0.5 rounded mr-1"><Text className="text-amber-500 text-[6px] font-bold">INVERSE</Text></View>}
                                    {isCC && <View className="bg-emerald-500/20 px-1 py-0.5 rounded mr-1"><Text className="text-emerald-500 text-[6px] font-bold">CC</Text></View>}
                                    {isKids && <View className="bg-blue-500/20 px-1 py-0.5 rounded mr-1"><Text className="text-blue-500 text-[6px] font-bold">KIDS</Text></View>}
                                    <View className="bg-white/5 px-1 py-0.5 rounded"><Text className="text-white/40 text-[6px] font-bold">{(item as any).qQuarter}</Text></View>
                                </View>
                                <Text className="text-white font-bold text-xs leading-4" numberOfLines={2} style={{ fontFamily: fontFamilyBold }}>{item.title}</Text>
                                <Text className="text-slate-500 text-[9px] mt-1">{item.quarterlyTitle}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        )}
      </View>
    </SafeAreaView>
  );
}
