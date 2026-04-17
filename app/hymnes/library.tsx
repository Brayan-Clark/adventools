import { loadDatabase } from '@/lib/database';
import { HYMNE_SOURCES } from '@/lib/hymnes';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getSetting } from '@/lib/user-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Bookmark, ChevronRight as ChevronRightIcon, Globe, Hash, Music as MusicIcon, Search as SearchIcon, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, FlatList, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Hymnes() {
  const { t } = useTranslation();
  const router = useRouter();
  const { db: dbNameParam, title: pageTitle, redirected } = useLocalSearchParams<{ db: string, title?: string, redirected?: string }>();
  const dbName = dbNameParam || 'cantique.db';
  const dbPath = `hymnes/${dbName}`;

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (redirected === 'true') {
          router.navigate('/(tabs)');
        } else {
          router.back();
        }
        return true;
      };

      if (Platform.OS === 'android') {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
      }
    }, [redirected])
  );

  useEffect(() => {
    loadFavorites();
    fetchCategories();
  }, [dbName]);

  const [hymns, setHymns] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNumberPicker, setShowNumberPicker] = useState(false);
  const [hymnNumber, setHymnNumber] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [totalHymns, setTotalHymns] = useState(0);
  const [maxHymnNumber, setMaxHymnNumber] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      fetchCategories();
    }, [dbName])
  );

  const loadFavorites = async () => {
    try {
      const stored = await getSetting<number[]>(`hymn_favorites_${dbName}`, []);
      setFavoriteIds(stored);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCategories = async () => {
    try {
      const db = await loadDatabase(dbName, HYMNE_SOURCES[dbName], 'hymnes');

      // Get categories
      const result: any = await db.getAllAsync("SELECT DISTINCT c_categories FROM adventiste_cantique WHERE c_categories IS NOT NULL AND c_categories != 'undefined' ORDER BY c_categories ASC");
      const cats = result.map((r: any) => r.c_categories.split(' - ')[0]);
      setCategories(Array.from(new Set(cats)) as string[]);

      // Get total count and max number
      const stats: any = await db.getFirstAsync("SELECT COUNT(*) as count, MAX(c_num) as max_num FROM adventiste_cantique");
      if (stats) {
        setTotalHymns(stats.count);
        setMaxHymnNumber(stats.max_num);
      }
    } catch (e) {
      console.error(e);
      // If DB not found, redirect back to selector
      Alert.alert(t('error'), t('db_not_found' as any));
      router.back();
    }
  };

  useEffect(() => {
    async function fetchHymns() {
      try {
        const db = await loadDatabase(dbName, HYMNE_SOURCES[dbName], 'hymnes');
        let query = "SELECT id, c_num, c_title, c_categories FROM adventiste_cantique";
        let conditions = [];
        let params: any[] = [];

        if (search) {
          conditions.push("(c_title LIKE ? OR c_num = ? OR c_content LIKE ?)");
          params.push(`%${search}%`, search, `%${search}%`);
        }

        if (selectedCategory) {
          conditions.push("c_categories LIKE ?");
          params.push(`${selectedCategory}%`);
        }

        if (showFavorites) {
          if (favoriteIds.length > 0) {
            conditions.push(`id IN (${favoriteIds.join(',')})`);
          } else {
            setHymns([]);
            setLoading(false);
            return;
          }
        }

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY c_num ASC";
        const result: any = await db.getAllAsync(query, params);
        setHymns(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(fetchHymns, 300);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, showFavorites, favoriteIds, dbName]);

  const goToHymnByNumber = async () => {
    const num = parseInt(hymnNumber);
    if (isNaN(num) || num < 1) return;

    try {
      const db = await loadDatabase(dbName, HYMNE_SOURCES[dbName], 'hymnes');
      const result: any = await db.getFirstAsync("SELECT id FROM adventiste_cantique WHERE c_num = ?", [num]);

      if (result) {
        setShowNumberPicker(false);
        setHymnNumber("");
        router.push({
          pathname: `/hymnes/[id]`,
          params: { id: result.id, db: dbName }
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBack = () => {
    if (redirected === 'true') {
      router.navigate('/(tabs)');
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />
      <View className="px-6 py-6 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleBack} className="mr-4 w-10 h-10 rounded-full bg-slate-900 items-center justify-center border border-slate-800">
            <ArrowLeft size={20} color="#94a3b8" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>{pageTitle || t('hymns')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/hymnes/store')}
          className="w-10 h-10 rounded-full bg-slate-900 items-center justify-center border border-slate-800"
        >
          <Globe size={18} color="#ec4899" />
        </TouchableOpacity>
      </View>

      <View className="px-6 mb-4">
        <View className="relative flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-1 shadow-inner">
          <SearchIcon size={18} color="#64748b" />
          <TextInput
            placeholder={totalHymns > 0 ? t('search_hymns_placeholder').replace('{{count}}', totalHymns.toString()) : t('search_hymns_basic')}
            placeholderTextColor="#475569"
            className="flex-1 h-12 ml-3 text-white font-medium"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View className="mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
          <TouchableOpacity
            onPress={() => { setSelectedCategory(null); setShowFavorites(false); }}
            className={cn(
              "px-5 py-2.5 rounded-xl border",
              (!selectedCategory && !showFavorites) ? "bg-pink-500 border-pink-500" : "bg-slate-900 border-slate-800"
            )}
          >
            <Text className={cn("font-bold text-xs", (!selectedCategory && !showFavorites) ? "text-white" : "text-slate-400")}>{t('all_notes')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setShowFavorites(true); setSelectedCategory(null); }}
            className={cn(
              "px-5 py-2.5 rounded-xl border flex-row items-center",
              showFavorites ? "bg-pink-600 border-pink-600" : "bg-slate-900 border-slate-800"
            )}
          >
            <Bookmark size={12} color={showFavorites ? "white" : "#ef4444"} fill={showFavorites ? "white" : "transparent"} className="mr-1.5" />
            <Text className={cn("font-bold text-xs", showFavorites ? "text-white" : "text-slate-400")}>{t('favorites').toUpperCase()}</Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => { setSelectedCategory(cat); setShowFavorites(false); }}
              className={cn(
                "px-5 py-2.5 rounded-xl border",
                selectedCategory === cat ? "bg-pink-500 border-pink-500" : "bg-slate-900 border-slate-800"
              )}
            >
              <Text className={cn("font-bold text-xs uppercase", selectedCategory === cat ? "text-white" : "text-slate-400")}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={hymns}
        keyExtractor={(item) => item.id.toString()}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        removeClippedSubviews={true}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View className="py-20">
              <ActivityIndicator color="#ec4899" />
            </View>
          ) : (
            <View className="py-20 items-center">
              <MusicIcon size={48} color="#1e293b" />
              <Text className="text-slate-500 mt-4">{t('no_hymn_found')}</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const prevItem = index > 0 ? hymns[index - 1] : null;
          const showSubCat = selectedCategory && item.c_categories?.includes(' - ') && (!prevItem || prevItem.c_categories !== item.c_categories);
          const subCat = item.c_categories?.split(' - ')[1];

          return (
            <View>
              {showSubCat && (
                <View className="flex-row items-center mb-4 mt-2">
                  <View className="h-[2px] w-6 bg-pink-500/30 mr-3 rounded-full" />
                  <Text className="text-[10px] font-bold uppercase text-pink-400 tracking-widest">{subCat}</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => router.push({
                  pathname: '/hymnes/[id]',
                  params: { id: item.id, db: dbName }
                })}
                className={`flex-row items-center p-5 bg-slate-900/50 border-slate-800/50 mb-3 rounded-2xl border`}
              >
                <View className="w-12 h-12 rounded-2xl bg-pink-500/10 items-center justify-center mr-4">
                  <Text className="text-pink-500 font-bold text-sm">{item.c_num}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-white text-base" style={{ fontFamily: 'Lexend_600SemiBold' }} numberOfLines={1}>{item.c_title}</Text>
                  <Text className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{item.c_categories?.split(' - ')[1] || item.c_categories || t('praise')}</Text>
                </View>
                <ChevronRightIcon size={16} color="#475569" />
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Floating Number Search Button */}
      <TouchableOpacity
        onPress={() => setShowNumberPicker(true)}
        className="absolute bottom-8 right-8 w-16 h-16 rounded-full bg-pink-500 items-center justify-center shadow-2xl shadow-pink-500/40"
      >
        <Hash size={28} color="white" />
      </TouchableOpacity>

      {/* Number Picker Modal */}
      <Modal visible={showNumberPicker} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center px-8">
          <View className="bg-[#1a2233] rounded-3xl p-8 w-full max-w-sm border border-slate-700">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>{t('quick_search')}</Text>
              <TouchableOpacity onPress={() => { setShowNumberPicker(false); setHymnNumber(""); }} className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center">
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-400 text-sm mb-4">
              {t('enter_hymn_number')} {maxHymnNumber > 0 ? `(1-${maxHymnNumber})` : ""}
            </Text>

            <TextInput
              placeholder="Ex: 123"
              placeholderTextColor="#475569"
              className="bg-[#111621] border border-slate-800 rounded-2xl px-6 py-4 text-white text-2xl font-bold text-center mb-6"
              style={{ fontFamily: 'Lexend_700Bold' }}
              value={hymnNumber}
              onChangeText={setHymnNumber}
              keyboardType="number-pad"
              autoFocus
              onSubmitEditing={goToHymnByNumber}
            />

            <TouchableOpacity
              onPress={goToHymnByNumber}
              className="bg-pink-500 rounded-2xl py-4 items-center shadow-lg shadow-pink-500/30"
            >
              <Text className="text-white font-bold text-base">{t('go_to_hymn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
