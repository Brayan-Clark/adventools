import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Calendar, Share2, WifiOff, RefreshCw, Bookmark, Heart, Clock } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, Share, Alert, Image, ImageBackground, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

import NetInfo from '@react-native-community/netinfo';
import { syncMofonaina, getMofonainaForDate, Mofonaina, syncAllModules } from '../../lib/mofonaina';
import { useTranslation } from '../../lib/i18n';
import { useSettings } from '../../lib/settings-context';

const { width, height } = Dimensions.get('window');

export default function MofonainaScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings: globalSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [mofonaina, setMofonaina] = useState<Mofonaina | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  
  // Track selected date
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      Alert.alert(t('success'), t('sync_complete') || 'Mise à jour réussie');
    } catch (e) {
      Alert.alert(t('error'), t('sync_failed') || 'Échec de la mise à jour');
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
        title: mofonaina.lohateny_andro
      });
    } catch (error) {
      console.error('Error sharing mofonaina:', error);
    }
  };

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

  // Font adjustments
  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';
  const baseFontSize = globalSettings.fontSize || 18;

  return (
    <View className="flex-1 bg-[#020617]">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Stack.Screen options={{ headerShown: false }} />
      
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

      {showDatePicker && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          themeVariant="dark"
          onChange={onDateChange}
        />
      )}

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: height * 0.15, paddingBottom: 60 }}
      >
        <View className="px-6">
          {/* Top Title Section */}
          <View className="mb-8">
            <Text className="text-white/60 text-[10px] font-bold uppercase tracking-[4px] mb-2" style={{ fontFamily: fontFamilyBold }}>
              {t('daily_bread') || 'Mofon\'aina'}
            </Text>
            <Text className="text-white text-4xl font-bold leading-tight" style={{ fontFamily: fontFamilyBold }}>
              {mofonaina ? mofonaina.lohateny_andro : formatDate(currentDate)}
            </Text>
            
            <View className="flex-row items-center mt-4 gap-4">
               <View className="flex-row items-center">
                  <Clock size={12} color="#94a3b8" />
                  <Text className="text-slate-400 text-[10px] ml-1.5 font-bold uppercase tracking-wider" style={{ fontFamily: fontFamilyBold }}>
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
              <Text className="text-slate-400 mt-4 font-medium" style={{ fontFamily }}>{t('loading')}...</Text>
            </View>
          ) : mofonaina ? (
            <View>
              {/* Verse Card */}
              <View className="bg-slate-900/80 rounded-[32px] border border-white/10 p-6 mb-6 backdrop-blur-xl">
                 <View className="w-10 h-10 rounded-2xl bg-primary/20 items-center justify-center mb-4">
                    <Bookmark size={20} color="#3b82f6" />
                 </View>
                 <Text className="text-white font-medium italic leading-relaxed mb-4" style={{ fontFamily, fontSize: (baseFontSize + 2) }}>
                    "{mofonaina.andininy_soratra_masina}"
                 </Text>
                 <View className="flex-row items-center justify-between border-t border-white/5 pt-4">
                    <Text className="text-primary font-bold" style={{ fontFamily: fontFamilyBold }}>
                       {mofonaina.toerana_soratra_masina}
                    </Text>
                    <TouchableOpacity className="flex-row items-center">
                       <Heart size={16} color="#475569" />
                    </TouchableOpacity>
                 </View>
              </View>

              {/* Main Content Card */}
              <View className="bg-white/5 rounded-[40px] border border-white/5 p-8 mb-8">
                <Text className="text-slate-200 leading-[32px] text-justify" style={{ fontFamily, fontSize: baseFontSize }}>
                  {mofonaina.mofon_aina}
                </Text>

                {mofonaina.loharano && (
                  <View className="mt-8 pt-6 border-t border-white/5 flex-row items-center justify-between">
                    <View>
                      <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1" style={{ fontFamily: fontFamilyBold }}>{t('author')}</Text>
                      <Text className="text-white font-bold text-sm" style={{ fontFamily: fontFamilyBold }}>{mofonaina.loharano}</Text>
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
                    <Text className="text-primary font-bold text-lg" style={{ fontFamily: fontFamilyBold }}>{mofonaina.telovolana.taona}</Text>
                 </View>
                 <View className="flex-1">
                   <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1" style={{ fontFamily: fontFamilyBold }}>{t('quarter_number')} {mofonaina.telovolana.laharana}</Text>
                   <Text className="text-white font-bold text-sm leading-tight" style={{ fontFamily }}>{mofonaina.telovolana.lohateny_lehibe}</Text>
                 </View>
                 <View className="w-8 h-8 rounded-full bg-white/5 items-center justify-center">
                    <Heart size={14} color="#475569" />
                 </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center justify-center py-20 bg-slate-900/40 rounded-[40px] border border-white/5">
              <Text className="text-slate-400 font-medium" style={{ fontFamily }}>{t('no_content')}</Text>
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
