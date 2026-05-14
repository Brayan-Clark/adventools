import React, { useEffect, useState } from 'react';
import { View, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookOpen, ChevronRight } from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import { parseDate } from '@/lib/utils';
import { AppText as Text } from '@/components/ui/AppText';


interface Lesson {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  index: string;
}

interface Quarterly {
  id: string;
  title: string;
  description: string;
  covers: {
    portrait: string;
    landscape: string;
    square?: string;
  };
  startDate: string;
  endDate: string;
  index: string;
  lessons?: Lesson[];
}

export default function SabbathSchoolWidget() {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings: globalSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [currentQuarterly, setCurrentQuarterly] = useState<Quarterly | null>(null);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [lang, setLang] = useState('mg');

  useEffect(() => {
    const init = async () => {
      const savedLang = await AsyncStorage.getItem('adventools_ss_selected_lang');
      const targetLang = savedLang || (globalSettings.language?.toLowerCase().includes('fr') ? 'fr' : (globalSettings.language?.toLowerCase().includes('en') ? 'en' : 'mg'));
      setLang(targetLang);
      fetchData(targetLang);
    };
    init();
  }, [globalSettings.language]);

  const fetchData = async (selectedLang: string) => {
    try {
      setLoading(true);
      const apiBase = `https://inverse.sspmadventist.org/api/v3/${selectedLang}/ss`;
      const abBase = `https://absg.sspmadventist.org/api/v3/${selectedLang}/ss`;
      const indexUrl = `${selectedLang === 'en' ? abBase : apiBase}/index.json`;

      const response = await fetch(indexUrl);
      const data = await response.json();
      
      let quarterly: Quarterly | null = null;
      if (data && data.groups) {
        // Flatten resources and find current one
        const allResources: any[] = [];
        data.groups.forEach((g: any) => {
          if (g.resources) g.resources.forEach((r: any) => allResources.push(r));
        });

        const now = new Date();
        quarterly = allResources.find(q => {
          const start = parseDate(q.startDate);
          const end = parseDate(q.endDate);
          return now >= start && now <= end;
        });

        // Fallback to most recent
        if (!quarterly && allResources.length > 0) {
          quarterly = allResources.sort((a, b) => parseDate(b.startDate).getTime() - parseDate(a.startDate).getTime())[0];
        }
      }

      if (quarterly) {
        // Fetch quarterly detail to get lessons
        const qUrl = `https://${quarterly.index.includes('inverse') || quarterly.id.includes('-cq') ? 'inverse' : 'absg'}.sspmadventist.org/api/v3/${quarterly.index}/index.json`;
        const qRes = await fetch(qUrl);
        const qData = await qRes.json();
        setCurrentQuarterly(qData);

        // Find today's lesson
        const now = new Date();
        now.setHours(0,0,0,0);
        const todayLesson = qData.lessons?.find((l: any) => {
          const start = parseDate(l.startDate);
          const end = parseDate(l.endDate);
          return now >= start && now <= end;
        });

        if (todayLesson) {
          const lId = todayLesson.id.split('-').pop();
          const lUrl = `https://${qData.index.includes('inverse') || qData.id.includes('-cq') ? 'inverse' : 'absg'}.sspmadventist.org/api/v3/${qData.index}/${lId}/index.json`;
          const lRes = await fetch(lUrl);
          const lData = await lRes.json();
          setCurrentLesson(lData);
        }
      }
    } catch (e) {
      console.error("Widget fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="bg-slate-900 rounded-[30px] p-6 border border-slate-800 h-40 items-center justify-center mb-10">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  if (!currentQuarterly) return null;

  const today = new Date().getDay(); // 0 (Sun) to 6 (Sat)
  // Sabbath School week starts on Saturday (6)
  // Indices in segments are usually 0-6 corresponding to Sat-Fri
  const days = [
    { label: 'Sam', code: 6 },
    { label: 'Dim', code: 0 },
    { label: 'Lun', code: 1 },
    { label: 'Mar', code: 2 },
    { label: 'Mer', code: 3 },
    { label: 'Jeu', code: 4 },
    { label: 'Ven', code: 5 },
  ];

  const currentSegmentIdx = currentLesson?.segments?.findIndex((s: any) => {
    if (!s.date) return false;
    const sDate = parseDate(s.date);
    const now = new Date();
    return sDate.getDate() === now.getDate() && sDate.getMonth() === now.getMonth();
  });

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/utiles/lesona', params: { qId: currentQuarterly.id, lId: currentLesson?.id?.split('-').pop() } })}
      activeOpacity={0.9}
      className="bg-slate-900 rounded-[35px] border border-slate-800 shadow-2xl overflow-hidden mb-10"
    >
      {/* Header with Background Pattern */}
      <View className="p-6 pb-4">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center px-3 py-1 bg-primary/20 rounded-full border border-primary/30">
            <BookOpen size={12} color="#3b82f6" className="mr-2" />
            <Text className="text-[10px] font-bold text-primary uppercase tracking-widest">{t('sabbath_school_lessons')}</Text>
          </View>
          <ChevronRight size={16} color="#475569" />
        </View>

        <View className="flex-row">
          <Image 
            source={{ uri: currentQuarterly.covers.portrait }} 
            className="w-20 h-28 rounded-2xl border border-white/10"
            resizeMode="cover"
          />
          <View className="flex-1 ml-4 justify-center">
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">
              {currentQuarterly.title}
            </Text>
            <Text className="text-white font-bold text-lg leading-6" numberOfLines={2}>
              {currentLesson?.title || "Leçon de la semaine"}
            </Text>
            <Text className="text-primary/70 text-xs mt-2 font-bold">
              {t('open_lesson')} →
            </Text>
          </View>
        </View>
      </View>

      {/* Week Timeline */}
      <View className="px-4 pb-6 mt-2">
        <View className="flex-row justify-between bg-slate-950/50 rounded-3xl p-2 border border-white/5">
          {days.map((day, idx) => {
            const isToday = day.code === today;
            return (
              <View key={idx} className={`items-center justify-center w-10 h-14 rounded-2xl ${isToday ? 'bg-primary shadow-lg shadow-primary/40' : ''}`}>
                <Text className={`text-[9px] font-bold uppercase mb-1 ${isToday ? 'text-white/70' : 'text-slate-500'}`}>
                  {day.label}
                </Text>
                <Text className={`text-sm font-bold ${isToday ? 'text-white' : 'text-slate-400'}`}>
                  {/* Find the date for this day relative to lesson start or just current week */}
                  {(() => {
                    const now = new Date();
                    const diff = day.code - today;
                    const d = new Date();
                    d.setDate(now.getDate() + (day.code === 6 && today !== 6 ? diff - 7 : (day.code !== 6 && today === 6 ? diff + 7 : diff)));
                    return d.getDate().toString().padStart(2, '0');
                  })()}
                </Text>
              </View>
            );
          })}
        </View>
        
        {/* Current Segment Title Highlight */}
        {currentLesson?.segments?.[currentSegmentIdx] && (
           <View className="mt-4 px-2 flex-row items-center">
             <View className="w-1.5 h-1.5 rounded-full bg-primary mr-3" />
             <Text className="text-slate-300 text-xs font-bold flex-1" numberOfLines={1}>
               {currentLesson.segments[currentSegmentIdx].title}
             </Text>
             <Text className="text-slate-500 text-[10px] font-bold">
               Aujourd'hui
             </Text>
           </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
