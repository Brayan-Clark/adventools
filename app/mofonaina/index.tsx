import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Calendar, Share2, WifiOff, RefreshCw } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import NetInfo from '@react-native-community/netinfo';
import { syncMofonaina, getMofonainaForDate, Mofonaina } from '../../lib/mofonaina';
import { useTranslation } from '../../lib/i18n';
import { useSettings } from '../../lib/settings-context';

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

      // Sync checks if 12h have passed internally and loads from cache immediately if valid
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
      const data = await syncMofonaina(true);
      if (data && data.length > 0) {
        const todayData = await getMofonainaForDate(currentDate);
        setMofonaina(todayData);
        Alert.alert(t('success'), t('sync_complete') || 'Mise à jour réussie');
      }
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
  const baseFontSize = globalSettings.fontSize || 18;

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-4 border-b border-slate-800/50">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center p-0"
        >
          <ChevronLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        
        <View className="flex-1 items-center justify-center px-2">
          <Text className="text-white font-bold text-sm tracking-wide capitalize" style={{ fontFamily: 'Lexend_700Bold' }}>
            {formatDate(currentDate)}
          </Text>
          {new Date().toDateString() !== currentDate.toDateString() ? (
            <TouchableOpacity onPress={() => setCurrentDate(new Date())} className="mt-1 bg-primary/20 px-2 py-0.5 rounded-full">
              <Text className="text-primary text-[10px] font-bold">{t('read_today')}</Text>
            </TouchableOpacity>
          ) : (
            isConnected === false && (
              <View className="flex-row items-center mt-1">
                <WifiOff size={10} color="#ef4444" className="mr-1" />
                <Text className="text-red-500 text-[10px] uppercase font-bold tracking-wider">{t('check_connection')}</Text>
              </View>
            )
          )}
        </View>
        
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={handleManualSync}
            disabled={loading}
            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mr-2"
          >
            <RefreshCw size={18} color={loading ? "#475569" : "#f8fafc"} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mr-2"
          >
            <Calendar size={18} color="#195de6" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={shareMofonaina}
            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center p-0"
          >
            <Share2 size={18} color="#f8fafc" />
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          themeVariant="dark"
          onChange={onDateChange}
        />
      )}

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="flex-1 items-center justify-center pt-20">
            <ActivityIndicator size="large" color="#195de6" />
            <Text className="text-slate-400 mt-4 font-medium" style={{ fontFamily }}>{t('loading')}...</Text>
          </View>
        ) : mofonaina ? (
          <View className="mb-20">
            <View className="bg-slate-900 rounded-[30px] border border-slate-800 p-6 mb-8">
              <Text className="text-white font-bold mb-4" style={{ fontFamily: 'Lexend_700Bold', fontSize: 24 * (baseFontSize / 18) }}>
                {mofonaina.lohateny_andro}
              </Text>
              
              <View className="bg-primary/10 rounded-2xl p-4 border border-primary/20 mb-6">
                <Text className="text-white font-medium italic mb-2 leading-relaxed" style={{ fontFamily, fontSize: 16 * (baseFontSize / 18) }}>
                  {mofonaina.andininy_soratra_masina}
                </Text>
                <Text className="text-primary font-bold text-right" style={{ fontFamily: 'Lexend_700Bold', fontSize: 14 * (baseFontSize / 18) }}>
                  — {mofonaina.toerana_soratra_masina}
                </Text>
              </View>

              <Text className="text-slate-300 leading-8 mb-6 text-justify" style={{ fontFamily, fontSize: baseFontSize }}>
                {mofonaina.mofon_aina}
              </Text>

              {mofonaina.loharano && (
                <View className="pt-4 border-t border-slate-800">
                  <Text className="text-slate-500 font-medium italic" style={{ fontFamily, fontSize: 14 * (baseFontSize / 18) }}>
                    {t('author')}: {mofonaina.loharano}
                  </Text>
                </View>
              )}
            </View>

            {/* Quarter Info */}
            <View className="bg-slate-900/50 rounded-[20px] p-5 border border-slate-800 flex-row items-center">
               <View className="w-12 h-12 rounded-full bg-blue-500/20 items-center justify-center mr-4">
                  <Text className="text-primary font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>{mofonaina.telovolana.taona}</Text>
               </View>
               <View className="flex-1">
                 <Text className="text-slate-400 text-xs uppercase tracking-widest font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>{t('quarter_number')} {mofonaina.telovolana.laharana}</Text>
                 <Text className="text-white font-medium" style={{ fontFamily }}>{mofonaina.telovolana.lohateny_lehibe}</Text>
               </View>
            </View>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center pt-20 pb-20">
            <Text className="text-slate-400 font-medium" style={{ fontFamily }}>{t('no_content')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
