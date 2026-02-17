import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bookmark, Type, Play, ChevronDown, Edit3, Minus, Globe } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { loadDatabase } from '@/lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cn } from '@/lib/utils';
import { StatusBar } from 'expo-status-bar';

// Static imports for all database files
const DB_SOURCES: Record<string, any> = {
  'protestant.db': require('../../assets/databases/protestant.db'),
  'king_james.db': require('../../assets/databases/king_james.db'),
  'le_bible.db': require('../../assets/databases/le_bible.db'),
  'arabic.db': require('../../assets/databases/arabic.db'),
  'basic_english.db': require('../../assets/databases/basic_english.db'),
  'esperanto.db': require('../../assets/databases/esperanto.db'),
  'greek.db': require('../../assets/databases/greek.db'),
  'schlachter.db': require('../../assets/databases/schlachter.db'),
  'diem.db': require('../../assets/databases/diem.db'),
};

// Bible database configurations
const BIBLE_CONFIGS: Record<string, { file: string; prefix: string; name: string }> = {
  'MG': { file: 'protestant.db', prefix: 'protestant', name: 'Malagasy' },
  'FR': { file: 'le_bible.db', prefix: 'fr', name: 'Français' },
  'EN': { file: 'king_james.db', prefix: 'en', name: 'English (KJV)' },
  'AR': { file: 'arabic.db', prefix: 'ar', name: 'العربية' },
  'BE': { file: 'basic_english.db', prefix: 'en', name: 'Basic English' },
  'ES': { file: 'esperanto.db', prefix: 'es', name: 'Esperanto' },
  'GR': { file: 'greek.db', prefix: 'gr', name: 'Ελληνικά' },
  'DE': { file: 'schlachter.db', prefix: 'sc', name: 'Deutsch' },
  'CI': { file: 'diem.db', prefix: 'ci_diem', name: 'Diem' },
};

export default function BibleReader() {
  const router = useRouter();
  const { bookId, bookName, testament } = useLocalSearchParams();
  const [chapter, setChapter] = useState(1);
  const [chaptersCount, setChaptersCount] = useState(0);
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [lang, setLang] = useState<string>('MG');
  const [currentBookName, setCurrentBookName] = useState(bookName);

  useEffect(() => {
    async function loadData() {
      if (!bookId) return;
      setLoading(true);
      try {
        const config = BIBLE_CONFIGS[lang];
        console.log(`[BibleReader] Loading ${lang} - Book: ${bookId}, Chapter: ${chapter}`);

        const db = await loadDatabase(config.file, DB_SOURCES[config.file]);

        const verseTable = `${config.prefix}_andininy`;
        const bookTable = `${config.prefix}_boky`;

        const bookIdNum = Number(bookId);

        // Get book name in selected language
        const bookInfo: any = await db.getFirstAsync(`
          SELECT b_name as name FROM ${bookTable} WHERE id = ?
        `, [bookIdNum]);

        if (bookInfo) {
          setCurrentBookName(bookInfo.name);
        }

        // Get total chapters for this book
        const countResult: any = await db.getFirstAsync(`
          SELECT COUNT(DISTINCT a_toko) as count FROM ${verseTable} WHERE a_bid = ?
        `, [bookIdNum]);

        if (countResult) {
          setChaptersCount(countResult.count);
        }

        // Get verses
        const chapterNum = Number(chapter);
        const versesResult: any = await db.getAllAsync(`
          SELECT a_and as verse, a_text as text 
          FROM ${verseTable} 
          WHERE a_bid = ? AND a_toko = ?
            ORDER BY CAST(a_and AS INTEGER) ASC
        `, [bookIdNum, isNaN(chapterNum) ? 1 : chapterNum]);

        setVerses(versesResult || []);
        console.log(`[BibleReader] Loaded ${versesResult?.length || 0} verses in ${lang}`);
      } catch (e) {
        console.error("[BibleReader] Load Error:", e);
      } finally {
        setLoading(false);

        // Save to History
        try {
          const historyItem = {
            type: 'bible',
            title: `${bookName} ${chapter}`,
            subtitle: `Chapitre consulté • ${new Date().toLocaleDateString('fr-FR')}`,
            timestamp: Date.now(),
            params: { bookId, chapter }
          };

          const existingHistory = await AsyncStorage.getItem('app_history');
          let history = existingHistory ? JSON.parse(existingHistory) : [];

          // Remove duplicates (same title)
          history = history.filter((h: any) => h.title !== historyItem.title);

          // Add to top
          history.unshift(historyItem);

          // Keep only top 5
          await AsyncStorage.setItem('app_history', JSON.stringify(history.slice(0, 5)));
        } catch (e) {
          console.error("Failed to save history", e);
        }
      }
    }
    loadData();
  }, [bookId, chapter, lang]);

  const shareVerse = (verseNum: number, verseText: string) => {
    router.push({
      pathname: '/share/verset',
      params: {
        verseText: verseText,
        verseRef: `${currentBookName} ${chapter}:${verseNum}`
      }
    });
  };

  return (
    <View className="flex-1 bg-[#111621]">
      <StatusBar style="light" />

      {/* 1. Header with Language Switcher */}
      <View className="bg-[#111621]/90 pt-12 pb-4 px-6 flex-row justify-between items-center border-b border-slate-800/50">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowLangPicker(true)}
          className="flex-row items-center bg-[#1a2233] px-4 py-2 rounded-full border border-slate-800"
        >
          <Globe size={16} color="#94a3b8" />
          <Text className="text-white font-bold text-xs ml-2 tracking-wider">{lang}</Text>
          <ChevronDown size={14} color="#64748b" className="ml-1" />
        </TouchableOpacity>

        <TouchableOpacity className="p-2 -mr-2">
          <Bookmark size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 2. Large Chapter Selector */}
        <View className="px-6 py-4">
          <TouchableOpacity
            onPress={() => setShowChapterPicker(true)}
            className="bg-[#1a2233] border border-slate-700/50 rounded-2xl py-4 px-6 flex-row justify-center items-center shadow-lg"
          >
            <Text className="text-lg font-bold text-white mr-3 tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>
              {currentBookName} {chapter}
            </Text>
            <ChevronDown size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View className="px-5 pt-4">
          {/* 3. Section Headers */}
          <View className="items-center mb-10 pt-2">
            <Text className="text-[10px] font-bold uppercase text-[#195de6] tracking-[0.3em] mb-3">
              {Number(testament) === 2 ? 'Nouvel Testament' : 'Ancien Testament'}
            </Text>
            <Text className="text-[26px] font-bold text-white text-center mb-6 leading-tight" style={{ fontFamily: 'Lexend_700Bold' }}>
              {currentBookName} {chapter}
            </Text>
            <View className="h-[4px] w-8 bg-[#195de6] rounded-full mx-auto opacity-80" />
          </View>

          {loading ? (
            <View className="py-20">
              <ActivityIndicator color="#195de6" />
            </View>
          ) : (
            <View className="pb-20 px-2">
              {verses.map((v) => (
                <TouchableOpacity
                  key={v.verse}
                  onLongPress={() => shareVerse(v.verse, v.text)}
                  activeOpacity={0.7}
                  className="mb-0"
                >
                  <Text className="text-slate-300 leading-7 text-lg" style={{ fontSize, fontFamily: 'Lexend_400Regular' }}>
                    <Text className="text-[10px] font-bold text-slate-500 mr-1" style={{ transform: [{ translateY: -2 }] }}>{v.verse} </Text>
                    {v.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 4. Action Bar
      <View className="absolute bottom-10 left-[5%] right-[5%] z-50">
        <View className="bg-[#1a2233]/95 border border-slate-700/50 rounded-3xl shadow-2xl flex-row items-center justify-between px-6 py-3">
          <TouchableOpacity onPress={() => setShowSettings(!showSettings)} className="p-2">
            <Type size={24} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity className="w-14 h-14 rounded-full bg-[#195de6] items-center justify-center shadow-xl shadow-[#195de6]/30">
            <Play size={28} color="white" fill="white" />
          </TouchableOpacity>

          <TouchableOpacity className="p-2">
            <Edit3 size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
      */}

      {/* Modal Selection Langue */}
      {showLangPicker && (
        <View className="absolute inset-0 bg-black/70 justify-end z-[100]">
          <TouchableOpacity className="flex-1" onPress={() => setShowLangPicker(false)} />
          <View className="bg-[#1a2233] rounded-t-[40px] p-8 max-h-[70%] border-t border-slate-700">
            <View className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-8" />
            <Text className="text-xl font-bold text-white mb-8 text-center" style={{ fontFamily: 'Lexend_700Bold' }}>Choisir une langue</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.entries(BIBLE_CONFIGS).map(([code, config]) => (
                <TouchableOpacity
                  key={code}
                  onPress={() => { setLang(code); setShowLangPicker(false); }}
                  className={cn(
                    "flex-row items-center justify-between p-4 rounded-2xl mb-3 border",
                    lang === code ? "bg-[#195de6] border-[#195de6]" : "bg-[#111621] border-slate-800"
                  )}
                >
                  <View>
                    <Text className={cn("font-bold text-base", lang === code ? "text-white" : "text-slate-300")}>
                      {config.name}
                    </Text>
                    <Text className={cn("text-xs mt-1", lang === code ? "text-blue-100" : "text-slate-500")}>
                      {code}
                    </Text>
                  </View>
                  {lang === code && (
                    <View className="w-6 h-6 rounded-full bg-white items-center justify-center">
                      <Text className="text-[#195de6] font-bold text-xs">✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Modal Selection Chapitre */}
      {showChapterPicker && (
        <View className="absolute inset-0 bg-black/70 justify-end z-[100]">
          <TouchableOpacity className="flex-1" onPress={() => setShowChapterPicker(false)} />
          <View className="bg-[#1a2233] rounded-t-[40px] p-8 max-h-[70%] border-t border-slate-700">
            <View className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-8" />
            <Text className="text-xl font-bold text-white mb-8 text-center" style={{ fontFamily: 'Lexend_700Bold' }}>Choisir un chapitre</Text>
            <FlatList
              data={Array.from({ length: chaptersCount || 50 }, (_, i) => i + 1)}
              numColumns={5}
              keyExtractor={(item) => item.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setChapter(item); setShowChapterPicker(false); }}
                  className={cn(
                    "w-[17%] aspect-square items-center justify-center rounded-2xl m-1.5 border",
                    item === chapter ? "bg-[#195de6] border-[#195de6]" : "bg-[#111621] border-slate-800"
                  )}
                >
                  <Text className={cn("font-bold text-base", item === chapter ? "text-white" : "text-slate-500")}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      )}

      {/* Modal Paramètres */}
      {showSettings && (
        <View className="absolute inset-x-0 bottom-0 bg-[#1a2233] rounded-t-[40px] p-10 z-[100] shadow-2xl border-t border-slate-800">
          <View className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-10" />
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Taille du Texte</Text>
            <Text className="font-bold text-white text-sm">{fontSize} px</Text>
          </View>
          <View className="flex-row items-center gap-6 mb-12">
            <Type size={16} color="#475569" />
            <View className="flex-1 h-2 bg-[#111621] rounded-full relative">
              <View className="absolute left-0 top-0 bottom-0 bg-[#195de6] rounded-full" style={{ width: `${(fontSize - 12) * 6}%` }} />
              <View className="absolute h-5 w-5 bg-white rounded-full -top-1.5 border-4 border-[#195de6]" style={{ left: `${(fontSize - 12) * 6}%`, marginLeft: -10 }} />
            </View>
            <Type size={28} color="#475569" />
          </View>
          <TouchableOpacity
            onPress={() => setShowSettings(false)}
            className="bg-[#195de6] py-4 rounded-2xl items-center"
          >
            <Text className="text-white font-bold">Terminer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
