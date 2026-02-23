import { fetchVerseContent } from '@/lib/bible';
import { getPromises, PromiseVerse } from '@/lib/promises';
import { useSettings } from '@/lib/settings-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Share2 } from 'lucide-react-native';
import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PromisesPage() {
  const router = useRouter();
  const categories = useMemo(() => getPromises(), []);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categories[0]?.title || null);

  const activeCategory = categories.find(c => c.title === selectedCategory);

  return (
    <SafeAreaView className="flex-1 bg-background-dark" edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between z-30">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-900 items-center justify-center border border-slate-800"
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white px-4" style={{ fontFamily: 'Lexend_700Bold' }}>Teny Fikasana</Text>
        <View className="w-10" />
      </View>

      {/* Categories Horizontal Scroll */}
      <View className="py-4 border-b border-slate-800/50 relative z-20">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {categories.map((item) => {
            const isSelected = selectedCategory === item.title;
            const label = item.title.replace(/Teny fikasana\s+/i, '');

            return (
              <Pressable
                key={item.title}
                onPress={() => setSelectedCategory(item.title)}
                className={`px-5 py-2.5 rounded-2xl mr-3 border ${isSelected
                    ? 'bg-primary border-primary'
                    : 'bg-slate-900 border-slate-800'
                  }`}
                style={isSelected ? { elevation: 4, shadowColor: '#195de6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 } : {}}
              >
                <Text
                  className={`text-[10px] font-bold tracking-[0.15em] uppercase ${isSelected ? 'text-white' : 'text-slate-500'
                    }`}
                  style={{ fontFamily: 'Lexend_700Bold' }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Verses List */}
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 32, paddingBottom: 100 }}
      >
        <View className="mb-10">
          <Text className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Lexend_800ExtraBold', lineHeight: 40 }}>
            {selectedCategory}
          </Text>
          <View className="h-1.5 w-16 bg-primary rounded-full" />
        </View>

        {activeCategory?.verses.map((verse, index) => (
          <PromiseVerseItem
            key={`${selectedCategory}-${index}`}
            verse={verse}
            router={router}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function PromiseVerseItem({ verse, router }: { verse: PromiseVerse, router: any }) {
  const { settings: globalSettings } = useSettings();
  const [dynamicText, setDynamicText] = useState<string>(verse.text);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDynamic() {
      if (verse.struct) {
        setLoading(true);
        try {
          const result = await fetchVerseContent(
            globalSettings.bibleVersion,
            verse.struct.book,
            verse.struct.chapter,
            verse.struct.verses
          );
          if (isMounted && result) {
            setDynamicText(result.text);
          }
        } catch (e) {
          console.error("Error loading dynamic verse", e);
        } finally {
          if (isMounted) setLoading(false);
        }
      }
    }
    loadDynamic();
    return () => { isMounted = false; };
  }, [globalSettings.bibleVersion, verse]);

  return (
    <View className="bg-slate-900/50 rounded-[32px] p-6 mb-6 border border-slate-800/50 overflow-hidden">
      <View className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full" />

      {loading ? (
        <View className="py-4">
          <ActivityIndicator color="#195de6" />
        </View>
      ) : (
        <Text
          className="text-white leading-7 mb-4 italic"
          style={{
            fontFamily: globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily,
            fontSize: 18 * (globalSettings.fontSize / 18)
          }}
        >
          "{dynamicText}"
        </Text>
      )}

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="h-[2px] w-4 bg-primary/40 mr-2" />
          <Text className="text-primary font-bold text-sm" style={{ fontFamily: 'Lexend_700Bold' }}>
            {verse.reference}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: '/share/verset',
              params: {
                verseText: dynamicText,
                verseRef: verse.reference
              }
            });
          }}
          className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center"
        >
          <Share2 size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
