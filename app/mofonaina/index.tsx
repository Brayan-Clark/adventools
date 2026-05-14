import { Stack, router } from 'expo-router';
import { ChevronLeft, Calendar, Share2, WifiOff, RefreshCw, Bookmark, Heart, Clock, Volume2, Square } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View, Share, Alert, Image, ImageBackground, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import NetInfo from '@react-native-community/netinfo';
import { syncMofonaina, getMofonainaForDate, Mofonaina, syncAllModules } from '../../lib/mofonaina';
import { useTranslation } from '../../lib/i18n';
import { useSettings } from '../../lib/settings-context';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumDatePicker } from '@/components/ui/PremiumDatePicker';
import { AppText as Text } from '@/components/ui/AppText';


const { width, height } = Dimensions.get('window');

export default function MofonainaScreen() {
  const { t } = useTranslation();
  const { settings: globalSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [mofonaina, setMofonaina] = useState<Mofonaina | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Track selected date
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const fetchMofonainaForDate = async (targetDate: Date) => {
    setLoading(true);
    try {
      const networkState = await NetInfo.fetch();
      setIsConnected(networkState.isConnected);

      await syncMofonaina(false);
      const data = await getMofonainaForDate(targetDate);
      
      setMofonaina(data);
    } catch (error) {
      console.error('Failed to load mofonaina', error);
      setMofonaina(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setLoading(true);
    try {
      // Sync everything!
      await syncAllModules();
      
      const todayData = await getMofonainaForDate(currentDate);
      setMofonaina(todayData);
      setAlertConfig({
        visible: true,
        title: t('success'),
        message: t('sync_complete') || 'Mise à jour réussie',
        type: 'success'
      });
    } catch (e) {
      setAlertConfig({
        visible: true,
        title: t('error'),
        message: t('sync_failed') || 'Échec de la mise à jour',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMofonainaForDate(currentDate);
  }, [currentDate]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  };

  const shareMofonaina = async () => {
    if (!mofonaina) return;
    try {
      const textToShare = `${mofonaina.lohateny_andro}\n\n"${mofonaina.andininy_soratra_masina}"\n${mofonaina.toerana_soratra_masina}\n\n${mofonaina.mofon_aina}\n\nLoharano: ${mofonaina.loharano || ''}`;
      await Share.share({
        message: textToShare,
        title: 'Mofon\'aina'
      });
    } catch (error) {
      console.error(error);
    }
  };

  const transliterateMalagasyForFrenchTTS = (text: string) => {
    if (!text) return "";
    let phonetic = text.toLowerCase();
    
    // 1. Correction des lettres pour l'accentuation
    phonetic = phonetic.replace(/o/g, "ou");
    phonetic = phonetic.replace(/j/g, "dz");
    phonetic = phonetic.replace(/tr/g, "tch");
    phonetic = phonetic.replace(/dr/g, "dj");
    // Empêcher que le 's' entre deux voyelles ne devienne un son 'z'
    phonetic = phonetic.replace(/([aeiouy])s([aeiouy])/g, "$1ss$2");

    // 2. Ajustement de la Ponctuation et de l'Intonation
    // En malgache, l'intonation ne monte pas au milieu de la phrase. 
    // La voix française monte la voix aux virgules. On remplace donc la virgule par un point
    // pour forcer la voix à garder une intonation descendante/neutre.
    phonetic = phonetic.replace(/,/g, ".");
    
    // Pour prendre plus de temps après un vrai point (fin de phrase),
    // on ajoute des points de suspension pour forcer un silence plus long.
    phonetic = phonetic.replace(/\./g, ". ... ");

    return phonetic;
  };

  const toggleTTS = async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    
    if (mofonaina) {
      const textToRead = `${mofonaina.lohateny_andro}. ${mofonaina.andininy_soratra_masina}. ${mofonaina.toerana_soratra_masina}. ${mofonaina.mofon_aina}`;
      const phoneticText = transliterateMalagasyForFrenchTTS(textToRead);
      
      setIsSpeaking(true);
      Speech.speak(phoneticText, {
        language: 'fr-FR',
        pitch: 1.0,
        rate: 0.85, // Légèrement plus lent pour une meilleure diction
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
    }
  };

  // Ensure TTS stops when unmounting
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const formatDate = (date: Date) => {
    const localeMap: Record<string, string> = {
      'English': 'en-US',
      'Français': 'fr-FR',
      'Malagasy': 'mg-MG'
    };
    const locale = localeMap[globalSettings.language] || 'fr-FR';
    
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Font adjustments handled dynamically by AppText

  return (
    <View className="flex-1 bg-[#020617]">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <PremiumDatePicker
        visible={showDatePicker}
        currentDate={currentDate}
        onClose={() => setShowDatePicker(false)}
        onSelect={(date) => {
          setCurrentDate(date);
          setShowDatePicker(false);
        }}
      />
      
      {/* Background Header Image */}
      <View className="absolute top-0 left-0 right-0 h-[45%]">
        <Image 
          source={require('../../assets/images/mofonaina_bg.jpg')} 
          className="w-full h-full"
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(2, 6, 23, 0.5)', '#020617']}
          className="absolute inset-0"
        />
      </View>

      {/* Floating Header */}
      <SafeAreaView edges={['top']} className="z-20">
        <View className="flex-row items-center justify-between px-6 py-2">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-black/30 border border-white/10 items-center justify-center backdrop-blur-md"
          >
            <ChevronLeft size={20} color="#f8fafc" />
          </TouchableOpacity>
          
          <View className="flex-row items-center gap-2">
            <TouchableOpacity 
              onPress={handleManualSync}
              disabled={loading}
              className="w-10 h-10 rounded-2xl bg-black/30 border border-white/10 items-center justify-center backdrop-blur-md"
            >
              <RefreshCw size={18} color={loading ? "#475569" : "#f8fafc"} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={toggleTTS}
              className={`w-10 h-10 rounded-2xl border items-center justify-center backdrop-blur-md relative ${isSpeaking ? 'bg-pink-500/20 border-pink-500/50' : 'bg-black/30 border-white/10'}`}
            >
              <View className="absolute -top-1 -right-1 bg-blue-500 rounded-full px-1 py-0.5 border border-slate-900 z-10">
                <Text className="text-[6px] font-black text-white">BETA</Text>
              </View>
              {isSpeaking ? (
                 <Square size={14} color="#ec4899" fill="#ec4899" />
              ) : (
                 <Volume2 size={18} color="#f8fafc" />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              className="w-10 h-10 rounded-2xl bg-black/30 border border-white/10 items-center justify-center backdrop-blur-md"
            >
              <Calendar size={18} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={shareMofonaina}
              className="w-10 h-10 rounded-2xl bg-black/30 border border-white/10 items-center justify-center backdrop-blur-md"
            >
              <Share2 size={18} color="#f8fafc" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: height * 0.15, paddingBottom: 60 }}
      >
        <View className="px-6">
          {/* Top Title Section */}
          <View className="mb-8">
            <Text className="text-white/60 text-[10px] font-bold uppercase tracking-[4px] mb-2">
              {t('daily_bread') || 'Mofon\'aina'}
            </Text>
            <Text className="text-white text-4xl font-bold leading-tight">
              {mofonaina ? mofonaina.lohateny_andro : formatDate(currentDate)}
            </Text>
            
            <View className="flex-row items-center mt-4 gap-4">
               <View className="flex-row items-center">
                  <Clock size={12} color="#94a3b8" />
                  <Text className="text-slate-400 text-[10px] ml-1.5 font-bold uppercase tracking-wider">
                    {formatDate(currentDate)}
                  </Text>
               </View>
               {isConnected === false && (
                  <View className="flex-row items-center">
                    <WifiOff size={12} color="#ef4444" />
                    <Text className="text-red-500 text-[10px] ml-1.5 font-bold uppercase tracking-wider">{t('check_connection')}</Text>
                  </View>
               )}
            </View>
          </View>

          {loading ? (
            <View className="items-center justify-center py-20 bg-slate-900/40 rounded-[40px] border border-white/5">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="text-slate-400 mt-4 font-medium">{t('loading')}...</Text>
            </View>
          ) : mofonaina ? (
            <View>
              {/* Verse Card */}
              <View className="bg-slate-900/80 rounded-[32px] border border-white/10 p-6 mb-6 backdrop-blur-xl">
                 <View className="w-10 h-10 rounded-2xl bg-primary/20 items-center justify-center mb-4">
                    <Bookmark size={20} color="#3b82f6" />
                 </View>
                 <Text className="text-white font-medium italic leading-relaxed mb-4 text-xl">
                    "{mofonaina.andininy_soratra_masina}"
                 </Text>
                 <View className="flex-row items-center justify-between border-t border-white/5 pt-4">
                    <Text className="text-primary font-bold">
                       {mofonaina.toerana_soratra_masina}
                    </Text>
                    <TouchableOpacity className="flex-row items-center">
                       <Heart size={16} color="#475569" />
                    </TouchableOpacity>
                 </View>
              </View>

              {/* Main Content Card */}
              <View className="bg-white/5 rounded-[40px] border border-white/5 p-8 mb-8">
                <Text className="text-slate-200 leading-[32px] text-justify text-lg">
                  {mofonaina.mofon_aina}
                </Text>

                {mofonaina.loharano && (
                  <View className="mt-8 pt-6 border-t border-white/5 flex-row items-center justify-between">
                    <View>
                      <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">{t('author')}</Text>
                      <Text className="text-white font-bold text-sm">{mofonaina.loharano}</Text>
                    </View>
                    <View className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
                       <Text className="text-white/20 font-bold text-xl">”</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Quarterly Info Footer */}
              <TouchableOpacity className="bg-slate-900/40 rounded-[32px] p-6 border border-white/5 flex-row items-center">
                 <View className="w-14 h-14 rounded-2xl bg-blue-500/20 items-center justify-center mr-5">
                    <Text className="text-primary font-bold text-lg">{mofonaina.telovolana.taona}</Text>
                 </View>
                 <View className="flex-1">
                   <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">{t('quarter_number')} {mofonaina.telovolana.laharana}</Text>
                   <Text className="text-white font-bold text-sm leading-tight">{mofonaina.telovolana.lohateny_lehibe}</Text>
                 </View>
                 <View className="w-8 h-8 rounded-full bg-white/5 items-center justify-center">
                    <Heart size={14} color="#475569" />
                 </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center justify-center py-20 bg-slate-900/40 rounded-[40px] border border-white/5">
              <Text className="text-slate-400 font-medium">{t('no_content')}</Text>
              {new Date().toDateString() !== currentDate.toDateString() && (
                <TouchableOpacity onPress={() => setCurrentDate(new Date())} className="mt-6 bg-primary px-6 py-3 rounded-2xl">
                  <Text className="text-white font-bold">{t('read_today')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
