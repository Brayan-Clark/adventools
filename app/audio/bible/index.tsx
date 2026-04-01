import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Search, BookOpen, Music } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../../lib/settings-context';
import { useTranslation } from '../../../lib/i18n';
import * as FileSystem from 'expo-file-system/legacy';

// Fast cached structure
import BIBLE_STRUCTURE from '../../../assets/bible-audio-structure.json';

interface BibleBook {
  id: number;
  name: string;
  testament: number;
  chapters: number;
}

export default function BibleAudioBooksScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings: globalSettings } = useSettings();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [testamentFilter, setTestamentFilter] = useState<'all' | 1 | 2 | 'offline'>('all');

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  const [offlineStatus, setOfflineStatus] = useState<Record<string, boolean>>({});

  const filteredBooks = useMemo(() => {
    return BIBLE_STRUCTURE.filter(book => {
      const matchesSearch = book.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isOffline = offlineStatus[book.id];
      const matchesTestament = testamentFilter === 'all' 
        || (testamentFilter === 'offline' ? isOffline : book.testament === testamentFilter);
      return matchesSearch && matchesTestament;
    });
  }, [searchQuery, testamentFilter, offlineStatus]);

  React.useEffect(() => {
    checkOfflineStatus();
  }, [filteredBooks]);

  const checkOfflineStatus = async () => {
    try {
        const path = `${FileSystem.documentDirectory}bible-audio/metadata.json`;
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
            const content = await FileSystem.readAsStringAsync(path);
            const meta = JSON.parse(content);
            const status: Record<string, boolean> = {};
            // Check for each book if it has ANY entry in metadata
            filteredBooks.forEach(book => {
                const bookPrefix = `${book.id}-`;
                status[book.id] = Object.keys(meta).some(k => k.startsWith(bookPrefix));
            });
            setOfflineStatus(status);
        }
    } catch (e) {}
  };

  const renderBookItem = ({ item }: { item: BibleBook }) => {
    const isOffline = offlineStatus[item.id];
    return (
      <TouchableOpacity 
        onPress={() => router.push({
          pathname: '/audio/bible/[id]',
          params: { id: item.id, name: item.name, chapters: item.chapters }
        })}
        className="bg-slate-900/50 rounded-2xl p-4 mb-3 border border-slate-800/50 flex-row items-center justify-between"
      >
        <View className="flex-row items-center flex-1">
          <View className={`w-10 h-10 rounded-xl items-center justify-center ${item.testament === 1 ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
             <BookOpen size={20} color={item.testament === 1 ? '#f59e0b' : '#3b82f6'} />
          </View>
          <View className="ml-4 flex-1">
            <View className="flex-row items-center">
                <Text className="text-white font-bold text-base" style={{ fontFamily: fontFamilyBold }}>{item.name}</Text>
                {isOffline && (
                    <View className="ml-2 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                        <Text className="text-emerald-500 text-[8px] font-bold uppercase" style={{ fontFamily: fontFamilyBold }}>{t('stored')}</Text>
                    </View>
                )}
            </View>
            <Text className="text-slate-500 text-xs mt-0.5" style={{ fontFamily }}>
              {item.chapters} {t('chapters')} • {item.testament === 1 ? t('old_testament') : t('new_testament')}
            </Text>
          </View>
        </View>
        <Music size={16} color="#6366f1" opacity={0.6} />
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
          <Text className="text-white font-bold text-xl" style={{ fontFamily: fontFamilyBold }}>{t('bible_audio')}</Text>
          <View className="w-10 h-10" />
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 mb-2">
          <Search size={18} color="#64748b" />
          <TextInput 
            placeholder={t('search_book')} 
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
             { id: 'all', label: t('all') },
             { id: 1, label: t('old_testament') },
             { id: 2, label: t('new_testament') }
           ].map(tab => (
             <TouchableOpacity 
               key={tab.id}
               onPress={() => setTestamentFilter(tab.id as any)}
               className={`px-4 py-2 rounded-full border ${testamentFilter === tab.id ? 'bg-blue-600 border-blue-500' : 'bg-slate-900 border-slate-800'}`}
             >
               <Text className={`text-xs font-bold ${testamentFilter === tab.id ? 'text-white' : 'text-slate-400'}`} style={{ fontFamily: fontFamilyBold }}>
                 {tab.label}
               </Text>
             </TouchableOpacity>
           ))}
        </View>
      </View>

      <FlatList 
        data={filteredBooks}
        keyExtractor={item => item.id.toString()}
        renderItem={renderBookItem}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center pt-20">
            <Text className="text-slate-500" style={{ fontFamily }}>{t('no_results')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
