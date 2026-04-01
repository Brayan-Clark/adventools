import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, BookOpen, Info, Search, Users } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useSettings } from '../../../lib/settings-context';
import { useTranslation } from '../../../lib/i18n';

import * as FileSystem from 'expo-file-system/legacy';

const MANIFEST_URL = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/etudes/manifest.json';
const CACHE_FILE = `${FileSystem.documentDirectory}etudes/manifest_cache.json`;

export default function EtudesCategoriesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings: globalSettings } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  const [offlineStatus, setOfflineStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadManifest();
  }, []);

  useEffect(() => {
    checkOffline();
  }, [categories]);

  const loadManifest = async () => {
    try {
      // 1. Try Cache first
      const cacheInfo = await FileSystem.getInfoAsync(CACHE_FILE);
      if (cacheInfo.exists) {
        setCategories(JSON.parse(await FileSystem.readAsStringAsync(CACHE_FILE)));
        setIsLoading(false);
      }

      // 2. Fetch fresh
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
          await FileSystem.writeAsStringAsync(CACHE_FILE, JSON.stringify(data));
        }
      }
    } catch (e) {
      console.log('Etudes manifest load error', e);
    } finally {
      setIsLoading(false);
    }
  };

  const checkOffline = async () => {
    try {
        const path = `${FileSystem.documentDirectory}etudes/metadata.json`;
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
            const content = await FileSystem.readAsStringAsync(path);
            const meta = JSON.parse(content);
            const status: Record<string, boolean> = {};
            categories.forEach(cat => {
                status[cat.id] = Object.keys(meta).some(k => k.startsWith(`${cat.id}-`));
            });
            setOfflineStatus(status);
        }
    } catch (e) {}
  };

  const filteredCategories = categories.filter(cat => 
    cat.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    cat.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCategory = ({ item }: { item: any }) => {
    const isOffline = offlineStatus[item.id];
    return (
      <TouchableOpacity 
        onPress={() => router.push({
          pathname: '/audio/etudes/[series]',
          params: { 
            series: item.id, 
            title: item.title, 
            author: item.author,
            artwork: item.image || item.defaultImage
          }
        })}
        className="bg-slate-900/50 rounded-3xl p-4 mb-5 border border-slate-800/50 flex-row items-center"
      >
        <View className="w-20 h-20 rounded-2xl bg-slate-800 overflow-hidden border border-slate-700/50">
          <Image 
            source={{ uri: item.image || item.defaultImage }} 
            className="w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/10 items-center justify-center">
             {!item.image && <BookOpen size={24} color="#64748b" />}
          </View>
        </View>
        
        <View className="ml-4 flex-1">
          <View className="flex-row items-center flex-wrap">
            <Text className="text-white font-bold text-lg leading-6" style={{ fontFamily: fontFamilyBold }}>{item.title}</Text>
            {isOffline && (
                <View className="ml-2 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                    <Text className="text-emerald-500 text-[8px] font-bold uppercase" style={{ fontFamily: fontFamilyBold }}>Offline</Text>
                </View>
            )}
          </View>
          <View className="flex-row items-center mt-2">
             <Users size={12} color="#94a3b8" />
             <Text className="text-slate-400 text-xs ml-1" numberOfLines={1} style={{ fontFamily }}>{item.author}</Text>
          </View>
          <Text className="text-violet-400 text-[10px] mt-2 font-bold uppercase tracking-wider" style={{ fontFamily: fontFamilyBold }}>
             {item.count} {t('episodes')} • Audio MP3
          </Text>
        </View>

        <View className="w-10 h-10 items-center justify-center">
           <ChevronLeft size={20} color="#475569" style={{ transform: [{ rotate: '180deg' }] }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="px-6 py-4 border-b border-slate-800/30">
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center"
          >
            <ChevronLeft size={20} color="#f8fafc" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-xl" style={{ fontFamily: fontFamilyBold }}>{t('bible_studies')}</Text>
          <View className="w-10 h-10" />
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 mb-2">
          <Search size={18} color="#64748b" />
          <TextInput 
            placeholder={t('search_series')} 
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-white text-sm"
            style={{ fontFamily }}
          />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
           <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList 
          data={filteredCategories}
          keyExtractor={item => item.id}
          renderItem={renderCategory}
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center pt-20">
              <Text className="text-slate-500" style={{ fontFamily }}>{t('no_results')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
