import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Music, Info, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../../lib/settings-context';
import { useTranslation } from '../../../lib/i18n';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';

const MANIFEST_URL = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/playbacks/manifest.json';

// Local Fallback
const DEFAULT_CATEGORIES = [
  { id: 'sda-hymnal', title: 'SDA Hymnal', lang: 'English', count: 695, color: '#fbbf24', bg: 'bg-amber-500/10' },
  { id: 'fihirana-adventista', title: 'Fihirana Adventista', lang: 'Malagasy', count: 420, color: '#10b981', bg: 'bg-emerald-500/10' },
  { id: 'hymnes-louanges', title: 'Hymnes et Louanges', lang: 'Français', count: 650, color: '#3b82f6', bg: 'bg-blue-500/10' }
];

export default function PlaybacksCategoriesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings: globalSettings } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'offline'>('all');

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  const [offlineStatus, setOfflineStatus] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    loadManifest();
  }, []);

  React.useEffect(() => {
    checkOffline();
  }, [categories]);

  const loadManifest = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      console.log('Playbacks manifest load error', e);
    }
    setIsLoading(false);
  };

  const checkOffline = async () => {
    try {
        const path = `${FileSystem.documentDirectory}playbacks/metadata.json`;
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

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cat.lang.toLowerCase().includes(searchQuery.toLowerCase());
    const isOffline = offlineStatus[cat.id];
    return matchesSearch && (filterMode === 'all' || isOffline);
  });

  const renderCategory = ({ item }: { item: any }) => {
    const isOffline = offlineStatus[item.id];
    return (
      <TouchableOpacity 
        onPress={() => router.push({
          pathname: '/audio/playbacks/[collection]',
          params: { 
            collection: item.id, 
            title: item.title,
            artwork: item.image
          }
        })}
        className="bg-slate-900/50 rounded-3xl p-5 mb-4 border border-slate-800/50 flex-row items-center"
      >
        <View className={`w-14 h-14 rounded-2xl ${item.bg} items-center justify-center`}>
          <Music size={24} color={item.color} />
        </View>
        <View className="ml-5 flex-1">
          <View className="flex-row items-center">
            <Text className="text-white font-bold text-lg" style={{ fontFamily: fontFamilyBold }}>{item.title}</Text>
            {isOffline && (
                <View className="ml-2 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                    <Text className="text-emerald-500 text-[8px] font-bold uppercase" style={{ fontFamily: fontFamilyBold }}>{t('stored')}</Text>
                </View>
            )}
          </View>
          <Text className="text-slate-500 text-xs mt-1" style={{ fontFamily }}>
             {item.lang} • {item.count > 0 ? `${item.count} Playbacks` : '...'}
          </Text>
        </View>
        <View className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 items-center justify-center">
           <ChevronLeft size={16} color="#475569" style={{ transform: [{ rotate: '180deg' }] }} />
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
          <Text className="text-white font-bold text-xl" style={{ fontFamily: fontFamilyBold }}>{t('hymns_audio')}</Text>
          <TouchableOpacity className="w-10 h-10 items-center justify-center">
             <Info size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 mb-2">
          <Search size={18} color="#64748b" />
          <TextInput 
            placeholder={t('search_hymns_basic')} 
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-white text-sm"
            style={{ fontFamily }}
          />
        </View>

        {/* Tabs */}
        <View className="flex-row mt-4 gap-2">
           {[
             { id: 'offline', label: t('stored') },
             { id: 'all', label: t('all') }
           ].map(tab => (
             <TouchableOpacity 
               key={tab.id}
               onPress={() => setFilterMode(tab.id as any)}
               className={`px-4 py-2 rounded-full border ${filterMode === tab.id ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-900 border-slate-800'}`}
             >
               <Text className={`text-xs font-bold ${filterMode === tab.id ? 'text-white' : 'text-slate-400'}`} style={{ fontFamily: fontFamilyBold }}>
                 {tab.label}
               </Text>
             </TouchableOpacity>
           ))}
        </View>
      </View>

      <FlatList 
        data={filteredCategories}
        keyExtractor={item => item.id}
        renderItem={renderCategory}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
