import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bookmark, BookOpen, ChevronRight, FileText, History, LayoutGrid, Music, RefreshCw, Settings, Share2, StickyNote, Headphones, Tv } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchVerseContentById } from '@/lib/bible';
import { useTranslation } from '@/lib/i18n';
import { syncMofonaina, getMofonainaForDate, Mofonaina } from '@/lib/mofonaina';
import { useSettings } from '@/lib/settings-context';
import { getRandomVerseReference, VerseReference } from '@/lib/versets-data';
import { fetchWeather, WeatherInfo, getWeatherDisplay } from '@/lib/weather';
import * as LucideIcons from 'lucide-react-native';

export default function Home() {
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  const { t, currentLang } = useTranslation();
  const [currentReference, setCurrentReference] = useState<VerseReference | null>(null);
  const [verseText, setVerseText] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [mofonainaDaily, setMofonainaDaily] = useState<Mofonaina | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  React.useEffect(() => {
    async function init() {
      try {
        // Fetch Mofon'aina
        try {
          const mData = await getMofonainaForDate(new Date());
          if (mData) {
            setMofonainaDaily(mData);
          } else {
            const all = await syncMofonaina(false);
            if (all.length > 0) {
              const sorted = [...all].sort((a, b) => new Date(b.daty).getTime() - new Date(a.daty).getTime());
              setMofonainaDaily(sorted[0]);
            }
          }
        } catch (e) {
          console.error("Error loading mofonaina:", e);
        }

        // Obtenir une référence aléatoire depuis notre fichier
        const randomReference = getRandomVerseReference();
        setCurrentReference(randomReference);

        // Récupérer le texte du verset depuis la base de données selon la langue
        if (randomReference.bookId && randomReference.chapter && randomReference.verse) {
          const verseContent = await fetchVerseContentById(
            globalSettings.bibleVersion,
            randomReference.bookId,
            randomReference.chapter.toString(),
            randomReference.verse.toString()
          );

          if (verseContent) {
            setVerseText(verseContent.text);
          } else {
            setVerseText(t('loading'));
          }
        } else {
          setVerseText('...');
        }
      } catch (e) {
        console.error("Error loading verse:", e);
        setVerseText('...');
      }

      // Fetch Weather (uses 7-day cache — won't hit network if fresh)
      try {
        const weatherData = await fetchWeather();
        if (weatherData) setWeather(weatherData);
      } catch (_) {}
      finally { setWeatherLoading(false); }
    }
    init();
  }, [globalSettings.bibleVersion]);

  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem('app_history').then(res => {
        if (res) setHistory(JSON.parse(res));
      });
      // Only update from cache on focus — no network call (7-day cache)
      fetchWeather()
        .then(data => { if (data) setWeather(data); })
        .catch(() => {})
        .finally(() => setWeatherLoading(false));
    }, [])
  );

  const refreshVerse = async () => {
    try {
      // Obtenir une nouvelle référence aléatoire depuis notre fichier
      const randomReference = getRandomVerseReference();
      setCurrentReference(randomReference);

      // Récupérer le texte du verset depuis la base de données selon la langue
      if (randomReference.bookId && randomReference.chapter && randomReference.verse) {
        const verseContent = await fetchVerseContentById(
          globalSettings.bibleVersion,
          randomReference.bookId,
          randomReference.chapter.toString(),
          randomReference.verse.toString()
        );

        if (verseContent) {
          setVerseText(verseContent.text);
        } else {
          setVerseText(t('loading'));
        }
      } else {
        setVerseText('...');
      }
    } catch (e) {
      console.error("Error refreshing verse:", e);
      setVerseText('...');
    }
  };

  const hour = new Date().getHours();
  const getGreeting = () => {
    if (hour < 12) return t('greeting_morning');
    if (hour < 18) return t('greeting_afternoon');
    return t('greeting_evening');
  };

  const greeting = getGreeting();

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-10">
          <View className="flex-row items-center">
            <Image
              source={require('../../assets/images/Adventiste_logo_colored.png')}
              style={{ width: 40, height: 40, marginRight: 12 }}
              resizeMode="contain"
            />
            <View>
              <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{greeting}</Text>
              <Text className="text-lg uppercase font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>{globalSettings.userName ? ` ${globalSettings.userName}` : `${t('welcome')} !`}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/modal')}
            className="w-11 h-11 rounded-full bg-slate-900 border border-slate-800 items-center justify-center relative shadow-lg"
          >
            <Settings size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Hero Verse Card */}
        <TouchableOpacity
          onPress={() => {
            if (currentReference) {
              router.push({
                pathname: '/verse-du-jour',
                params: {
                  bookId: currentReference.bookId,
                  chapter: currentReference.chapter,
                  verse: currentReference.verse,
                  reference: currentReference.reference,
                  category: currentReference.category
                }
              });
            } else {
              router.push('/verse-du-jour');
            }
          }}
          className="relative overflow-hidden rounded-[40px] bg-primary mb-10 shadow-2xl shadow-primary/40"
        >
          {/* Background Decoration */}
          <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
          <View className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/5 rounded-full" />

          <View className="p-8">
            <View className="flex-row items-center justify-between mb-6">
              <View className="bg-white/20 px-3 py-1.5 rounded-full">
                <Text className="text-[10px] font-bold uppercase text-white tracking-widest">{t('verse_of_the_day')}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    refreshVerse();
                  }}
                  className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                  <RefreshCw size={14} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    if (currentReference && verseText) {
                      router.push({
                        pathname: '/share/verset',
                        params: {
                          verseText: verseText,
                          verseRef: currentReference.reference
                        }
                      });
                    }
                  }}
                  className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                  <Share2 size={14} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {currentReference ? (
              <View>
                <Text className="text-white italic mb-6 leading-8" style={{
                  fontFamily: globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily,
                  fontSize: 20 * (globalSettings.fontSize / 18) // Scaling based on base size
                }}>
                  "{verseText}"
                </Text>
                <View className="flex-row items-center">
                  <View className="h-[2px] w-6 bg-white/30 mr-3" />
                  <Text className="text-sm font-bold text-blue-100" style={{ fontFamily: 'Lexend_700Bold' }}>
                    {currentReference.reference}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="py-10 items-center">
                <Text className="text-white/60 font-bold uppercase tracking-tighter">{t('loading')}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Mofon'aina Daily Reading Card */}
        {mofonainaDaily && (
          <TouchableOpacity
            onPress={() => router.push('/mofonaina' as any)}
            className="mb-10 bg-slate-900 rounded-[30px] border border-slate-800 shadow-xl overflow-hidden p-6"
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1">
                {/* Weather icon — press → /weather (stopPropagation évite d'ouvrir mofon'aina) */}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push('/weather' as any);
                  }}
                  activeOpacity={0.75}
                  className="mr-3"
                >
                  <View className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 items-center justify-center">
                    {weather ? (
                      <View className="items-center">
                        {(() => {
                          const display = getWeatherDisplay(weather.conditionCode);
                          const Icon = (LucideIcons as any)[display.name];
                          return <Icon size={20} color={display.color} />;
                        })()}
                        <Text className="text-[9px] text-white font-bold mt-0.5">{weather.temp}°C</Text>
                      </View>
                    ) : weatherLoading ? (
                      <View className="items-center justify-center">
                        <ActivityIndicator size="small" color="#f97316" />
                      </View>
                    ) : (
                      <View className="items-center justify-center">
                        <LucideIcons.Cloud size={20} color="#475569" />
                        <Text className="text-[7px] text-slate-600 font-bold mt-0.5">--°</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase text-orange-500 tracking-widest leading-3" style={{ fontFamily: 'Lexend_700Bold' }}>{t('fiambenana_maraina')}</Text>
                  <Text className="text-white font-bold text-base mt-1" style={{ fontFamily: 'Lexend_700Bold' }}>{mofonainaDaily.lohateny_andro}</Text>

                  {/* CITY AND SUNRISE INFO */}
                  {weather && (
                    <View className="flex-row items-center mt-1">
                      <LucideIcons.MapPin size={9} color="#64748b" />
                      <Text className="text-[9px] text-slate-500 font-bold ml-1 mr-2">{weather.city}</Text>

                      <LucideIcons.Sunrise size={9} color="#94a3b8" />
                      <Text className="text-[9px] text-slate-400 font-bold ml-1">{weather.sunrise}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center ml-2">
                <LucideIcons.ChevronRight size={16} color="#94a3b8" />
              </View>
            </View>

            <View className="bg-slate-800/50 rounded-2xl p-4">
              <Text className="text-slate-300 italic text-sm mb-2 leading-6" numberOfLines={2} style={{ fontFamily: 'Lexend_400Regular' }}>
                "{mofonainaDaily.andininy_soratra_masina}"
              </Text>
              <Text className="text-orange-400 font-bold text-xs" style={{ fontFamily: 'Lexend_600SemiBold' }}>
                {mofonainaDaily.toerana_soratra_masina}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Feature Grid */}
        <Text className="text-[10px] font-bold uppercase text-slate-500 mb-6 ml-1 tracking-widest">{t('tools')}</Text>
        <View className="flex-row flex-wrap justify-between gap-y-5 mb-12">
          <FeatureCard
            href="/bible"
            title={t('bible')}
            subtitle={t('bible_subtitle')}
            icon={<BookOpen color="#195de6" size={28} />}
            bgColor="bg-blue-500/10"
          />
          <FeatureCard
            href="/hymnes"
            title={t('hymns')}
            subtitle={t('hymns_subtitle')}
            icon={<Music color="#ec4899" size={28} />}
            bgColor="bg-pink-500/10"
          />
          <FeatureCard
            href="/pdf"
            title={t('pdf_reader')}
            subtitle={t('pdf_subtitle')}
            icon={<FileText color="#f59e0b" size={28} />}
            bgColor="bg-amber-500/10"
          />
          <FeatureCard
            href="/notes"
            title={t('notes')}
            subtitle={t('notes_subtitle')}
            icon={<StickyNote color="#10b981" size={28} />}
            bgColor="bg-emerald-500/10"
          />
          <FeatureCard
            href="/utiles/lesona"
            title={t('sabbath_school_lessons')}
            subtitle={t('daily_study')}
            icon={<BookOpen color="#ef4444" size={28} />}
            bgColor="bg-red-500/10"
          />
          <FeatureCard
            href="/audio"
            title="Audio"
            subtitle={t("podcasts_streaming")}
            icon={<Headphones color="#06b6d4" size={28} />}
            bgColor="bg-cyan-500/10"
          />
          <FeatureCard
            href="/video"
            title={t('video_and_tv')}
            subtitle={t('video_subtitle')}
            icon={<Tv color="#ec4899" size={28} />}
            bgColor="bg-pink-500/10"
          />
          <FeatureCard
            href="/utiles"
            title={t('useful')}
            subtitle={t('useful_subtitle')}
            icon={<LayoutGrid color="#8b5cf6" size={28} />}
            bgColor="bg-violet-500/10"
            fullWidth={false}
          />
        </View>

        {/* Recent Section - Dynamic */}
        <View className="mb-20">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-lg font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>{t('recent_read')}</Text>
            <TouchableOpacity onPress={async () => {
              setHistory([]);
              await AsyncStorage.removeItem('app_history');
            }}>
              <Text className="text-xs text-primary font-bold">{t('reset_history')}</Text>
            </TouchableOpacity>
          </View>

          {history.length > 0 ? (
            history.slice(0, 5).map((item, index) => (
              <ActivityItem
                key={index}
                icon={
                  item.type === 'bible' ? <Bookmark color="#195de6" size={18} /> :
                    item.type === 'hymn' ? <Music color="#ec4899" size={18} /> :
                      item.type === 'pdf' ? <FileText color="#f59e0b" size={18} /> :
                        <StickyNote color="#10b981" size={18} />
                }
                title={item.title}
                subtitle={item.subtitle}
                bg="bg-slate-900"
                onPress={() => {
                  if (item.type === 'bible') {
                    router.push({ pathname: '/bible/reader', params: item.params });
                  } else if (item.type === 'hymn') {
                    router.push(`/hymnes/${item.params.id}`);
                  } else if (item.type === 'pdf') {
                    router.push({ pathname: '/pdf/viewer', params: item.params });
                  } else if (item.type === 'note') {
                    router.push({ pathname: '/notes', params: item.params });
                  }
                }}
              />
            ))
          ) : (
            <View className="py-8 bg-slate-900/50 rounded-3xl items-center border border-slate-800/50">
              <History size={24} color="#475569" className="mb-2" />
              <Text className="text-slate-500 text-xs">{t('empty_history')}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureCard({ href, title, subtitle, icon, bgColor, fullWidth }: any) {
  return (
    <Link href={href as any} asChild>
      <TouchableOpacity className={`${fullWidth ? 'w-full flex-row items-center' : 'w-[47%]'} bg-slate-900 rounded-[30px] p-6 border border-slate-800 shadow-xl`}>
        <View className={`w-14 h-14 rounded-2xl ${bgColor} items-center justify-center ${fullWidth ? 'mr-5 mb-0' : 'mb-5'}`}>
          {icon}
        </View>
        <View className={fullWidth ? 'flex-1' : ''}>
          <Text className="font-bold text-white text-lg" style={{ fontFamily: 'Lexend_700Bold' }}>{title}</Text>
          <Text className="text-xs text-slate-500" style={{ fontFamily: 'Lexend_400Regular' }}>{subtitle}</Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

function ActivityItem({ icon, title, subtitle, bg, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} className={`flex-row items-center p-4 rounded-3xl ${bg} mb-4 border border-slate-800/50`}>
      <View className="w-11 h-11 rounded-2xl bg-background-dark items-center justify-center mr-4 border border-slate-800">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-bold text-white text-sm" style={{ fontFamily: 'Lexend_600SemiBold' }}>{title}</Text>
        <Text className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">{subtitle}</Text>
      </View>
      <ChevronRight size={16} color="#475569" />
    </TouchableOpacity>
  );
}
