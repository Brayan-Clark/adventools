import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Music, Info, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../../lib/settings-context';
import { useTranslation } from '../../../lib/i18n';
import NetInfo from '@react-native-community/netinfo';

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

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  React.useEffect(() => {
    loadManifest();
  }, []);

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

  const filteredCategories = categories.filter(cat => 
    cat.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    cat.lang.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCategory = ({ item }: { item: any }) => (
    <TouchableOpacity 
      onPress={() => router.push({
        pathname: '/audio/playbacks/[collection]',
        params: { collection: item.id, title: item.title }
      })}
      className="bg-slate-900/50 rounded-3xl p-5 mb-4 border border-slate-800/50 flex-row items-center"
    >
      <View className={`w-14 h-14 rounded-2xl ${item.bg} items-center justify-center`}>
        <Music size={24} color={item.color} />
      </View>
      <View className="ml-5 flex-1">
        <Text className="text-white font-bold text-lg" style={{ fontFamily: fontFamilyBold }}>{item.title}</Text>
        <Text className="text-slate-500 text-xs mt-1" style={{ fontFamily }}>
           {item.lang} • {item.count > 0 ? `${item.count} Playbacks` : '...'}
        </Text>
      </View>
      <View className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 items-center justify-center">
         <ChevronLeft size={16} color="#475569" style={{ transform: [{ rotate: '180deg' }] }} />
      </View>
    </TouchableOpacity>
  );

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
