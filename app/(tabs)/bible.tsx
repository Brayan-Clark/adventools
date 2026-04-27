import { loadDatabase } from '@/lib/database';
import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import { cn } from '@/lib/utils';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, ChevronDown, ChevronRight, Globe, PlusCircle, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BibleConfig, checkAndDownloadBible, DB_SOURCES, getAvailableBibles } from '@/lib/bible';

export default function Bible() {
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  const { t } = useTranslation();
  const [books, setBooks] = useState<any[]>([]);
  const [testaments, setTestaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState<'books' | 'verses'>('books');
  const [verseResults, setVerseResults] = useState<any[]>([]);
  const [isSearchingVerses, setIsSearchingVerses] = useState(false);
  const [availableBibles, setAvailableBibles] = useState<BibleConfig[]>([]);
  const [lang, setLang] = useState<string>(globalSettings.bibleVersion || 'MG');
  const [showLangPicker, setShowLangPicker] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      async function init() {
        const bibles = await getAvailableBibles();
        setAvailableBibles(bibles);

        // If current lang is not in bibles, fallback to MG
        if (!bibles.find(b => b.id === lang)) {
          setLang('MG');
        }
      }
      init();
    }, [lang])
  );

  useEffect(() => {
    async function fetchData() {
      if (availableBibles.length === 0) return;
      setLoading(true);
      try {
        const config = availableBibles.find(b => b.id === lang) || availableBibles[0];

        // Ensure file exists (for cloud-only default)
        await checkAndDownloadBible(config);

        const db = await loadDatabase(config.file, DB_SOURCES[config.file], 'bibles');

        const tables: any = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");

        // Cloud Schema?
        const isCloudSchema = tables.some((t: any) => t.name === 'books');

        let bookData: any[] = [];
        let testamentData: any[] = [];

        if (isCloudSchema) {
          const testTable = tables.find((t: any) => t.name.toLowerCase() === 'testaments' || t.name.toLowerCase() === 'testament')?.name;
          if (testTable) {
            bookData = await db.getAllAsync(`
              SELECT b.book_number as id, b.long_name as name, b.testament_id as testamentId, t.name as testamentName
              FROM books b
              LEFT JOIN ${testTable} t ON b.testament_id = t.id
              ORDER BY b.book_number ASC
            `);
            testamentData = await db.getAllAsync(`SELECT id, name FROM ${testTable} ORDER BY id ASC`);
          } else {
            bookData = await db.getAllAsync(`SELECT book_number as id, long_name as name, testament_id as testamentId FROM books ORDER BY book_number ASC`);
          }
        } else {
          // Legacy Schema
          const bookTable = tables.find((t: any) => t.name.startsWith("books") || t.name.endsWith("_boky"))?.name;
          const testTable = tables.find((t: any) => t.name.endsWith("_testamenta") || t.name === "testamenta" || t.name === "testament" || t.name === "testaments")?.name;

          if (bookTable) {
            if (testTable) {
              const testNameCol = testTable.includes('_') ? 'test_name' : 'name';
              bookData = await db.getAllAsync(`
                SELECT b.id, b.b_name as name, b.b_testid as testamentId, t.${testNameCol} as testamentName
                FROM ${bookTable} b
                LEFT JOIN ${testTable} t ON b.b_testid = t.id
                ORDER BY b.id ASC
              `);
              testamentData = await db.getAllAsync(`SELECT id, ${testNameCol} as name FROM ${testTable} ORDER BY id ASC`);
            } else {
              bookData = await db.getAllAsync(`SELECT id, b_name as name, b_testid as testamentId FROM ${bookTable} ORDER BY id ASC`);
            }
          }
        }

        setBooks(bookData || []);

        // Pure Database Mapping
        const tMap = new Map<string, string>();
        testamentData.forEach(t => { if (t.id != null && t.name) tMap.set(String(t.id), t.name); });
        bookData.forEach(b => {
          if (b.testamentName && b.testamentId != null && !tMap.has(String(b.testamentId))) {
            tMap.set(String(b.testamentId), b.testamentName);
          }
        });

        const uniqueIds = [...new Set((bookData || []).map((b: any) => b.testamentId))]
          .filter(id => id !== null && id !== undefined)
          .sort((a, b) => Number(a) - Number(b));

        const testamentsList = uniqueIds.map(id => {
          const name = tMap.get(String(id));
          return { id, name: name || `${id}` };
        });

        if (testamentsList.length === 0) {
          testamentsList.push({ id: 1, name: "1" });
          testamentsList.push({ id: 2, name: "2" });
        }

        setTestaments(testamentsList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [lang, availableBibles]);

  // Search Verses Function
  const handleVerseSearch = async (text: string) => {
    if (text.length < 3) {
      setVerseResults([]);
      return;
    }

    setIsSearchingVerses(true);
    try {
      const config = availableBibles.find(b => b.id === lang) || availableBibles[0];
      const db = await loadDatabase(config.file, DB_SOURCES[config.file], 'bibles');

      const tables: any = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
      const isCloud = tables.some((t: any) => t.name === 'books');

      if (isCloud) {
        const query = `
          SELECT book_number as bookId, chapter, verse, text, 
                 (SELECT long_name FROM books WHERE book_number = verses.book_number) as bookName
          FROM verses
          WHERE text LIKE ?
          LIMIT 50
        `;
        const results = await db.getAllAsync(query, [`%${text}%`]);
        setVerseResults(results.map((r: any) => ({
          bookId: r.bookId,
          bookName: r.bookName,
          chapter: r.chapter,
          verse: r.verse,
          text: r.text,
          testament: r.bookId <= 39 ? 1 : 2
        })));
      } else {
        const bookTable = tables.find((t: any) => t.name.endsWith("_boky"))?.name;
        const verseTable = tables.find((t: any) => t.name.endsWith("_andininy"))?.name;

        if (bookTable && verseTable) {
          const query = `
            SELECT CAST(v.a_toko AS INTEGER) as chapter, v.a_and as verse, v.a_text as text, b.b_name as bookName, b.id as bookId, b.b_testid as testament
            FROM ${verseTable} v
            JOIN ${bookTable} b ON v.a_bid = b.id
            WHERE v.a_text LIKE ?
            LIMIT 50
          `;
          const results = await db.getAllAsync(query, [`%${text}%`]);
          setVerseResults(results || []);
        }
      }
    } catch (e) {
      console.error("Verse Search Error:", e);
    } finally {
      setIsSearchingVerses(false);
    }
  };

  useEffect(() => {
    if (searchMode === 'verses' && search.length >= 3) {
      const timer = setTimeout(() => {
        handleVerseSearch(search);
      }, 600);
      return () => clearTimeout(timer);
    } else if (searchMode === 'verses' && search.length < 3) {
      setVerseResults([]);
    }
  }, [search, searchMode, lang]);

  const filteredBooks = books.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background-dark">
        <ActivityIndicator size="large" color="#195de6" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />
      <View className="px-6 py-6 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 rounded-full bg-slate-900 items-center justify-center border border-slate-800">
            <ArrowLeft size={20} color="#94a3b8" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>{t('holy_bible')}</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowLangPicker(true)}
          className="flex-row items-center bg-slate-900 px-4 py-2 rounded-full border border-slate-800"
        >
          <Globe size={16} color="#94a3b8" />
          <Text className="text-white font-bold text-xs ml-2 tracking-wider">
            {availableBibles.find(b => b.id === lang)?.language || lang}
          </Text>
          <ChevronDown size={14} color="#64748b" className="ml-1" />
        </TouchableOpacity>
      </View>

      <View className="px-6 mb-4">
        <View className="relative flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-1 shadow-inner">
          <Search size={18} color="#64748b" />
          <TextInput
            placeholder={searchMode === 'books' ? t('search_book') : t('search_text')}
            placeholderTextColor="#475569"
            className="flex-1 h-12 ml-3 text-white font-medium"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Mode Toggle */}
      <View className="px-6 flex-row mb-6 mt-2">
        <TouchableOpacity
          onPress={() => setSearchMode('books')}
          className={cn(
            "flex-1 py-2 rounded-xl border items-center justify-center mr-2",
            searchMode === 'books' ? "bg-[#195de6] border-[#195de6]" : "bg-slate-900 border-slate-800"
          )}
        >
          <Text className={cn("font-bold text-xs", searchMode === 'books' ? "text-white" : "text-slate-500")}>{t('books').toUpperCase()}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setSearchMode('verses');
            if (search.length >= 3) handleVerseSearch(search);
          }}
          className={cn(
            "flex-1 py-2 rounded-xl border items-center justify-center ml-2",
            searchMode === 'verses' ? "bg-[#195de6] border-[#195de6]" : "bg-slate-900 border-slate-800"
          )}
        >
          <Text className={cn("font-bold text-xs", searchMode === 'verses' ? "text-white" : "text-slate-500")}>{t('verses_tab').toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {searchMode === 'books' ? (
          <View className="flex-row flex-wrap justify-between pb-2">
            {filteredBooks.map((book) => {
              const testament = testaments.find(t => t.id == book.testamentId);
              const testamentIndex = testaments.findIndex(t => t.id == book.testamentId);
              const colorIdx = testamentIndex === -1 ? 0 : testamentIndex % 3;
              return (
                <BookGridItem 
                  key={book.id} 
                  book={book} 
                  lang={lang} 
                  testamentName={testament?.name || ""} 
                  colorIdx={colorIdx} 
                />
              );
            })}
          </View>
        ) : (
          <View className="pb-24">
            {isSearchingVerses ? (
              <View className="py-20 items-center">
                <ActivityIndicator color="#195de6" />
                <Text className="text-slate-500 mt-4">{t('searching_bible')}</Text>
              </View>
            ) : search.length < 3 ? (
              <View className="py-20 items-center">
                <Text className="text-slate-500 text-center px-10">{t('min_search_chars')}</Text>
              </View>
            ) : verseResults.length === 0 ? (
              <View className="py-20 items-center">
                <Text className="text-slate-500">{t('no_verse_found')} "{search}"</Text>
              </View>
            ) : (
              <>
                <Text className="text-slate-500 text-xs font-bold mb-4 ml-2">{verseResults.length} {t('results_found')}</Text>
                {verseResults.map((v, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => router.push({
                      pathname: "/bible/reader",
                      params: {
                        bookId: v.bookId,
                        bookName: v.bookName,
                        testament: v.testament,
                        testamentName: testaments.find(t => t.id === v.testament)?.name || "",
                        chapter: v.chapter,
                        verse: v.verse,
                        lang: lang
                      }
                    })}
                    className="bg-[#0f172a] border border-slate-800 p-4 rounded-2xl mb-4"
                  >
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-[#195de6] font-bold text-sm">
                        {v.bookName} {v.chapter}:{v.verse}
                      </Text>
                      <ChevronRight size={16} color="#475569" />
                    </View>
                    <Text className="text-slate-300 leading-6" numberOfLines={3}>
                      {highlightText(v.text, search)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}
        <View className="h-24" />
      </ScrollView>

      {/* Modal Selection Langue */}
      {showLangPicker && (
        <View className="absolute inset-0 bg-black/70 justify-end z-[100]">
          <TouchableOpacity className="flex-1" onPress={() => setShowLangPicker(false)} />
          <View className="bg-[#1a2233] rounded-t-[40px] p-8 max-h-[70%] border-t border-slate-700">
            <View className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-8" />
            <Text className="text-xl font-bold text-white mb-8 text-center" style={{ fontFamily: 'Lexend_700Bold' }}>{t('choose_language')}</Text>

            <TouchableOpacity
              onPress={() => { setShowLangPicker(false); router.push({ pathname: '/bible/store' as any }); }}
              className="flex-row items-center bg-blue-600/20 border border-blue-600 p-4 rounded-2xl mb-6"
            >
              <PlusCircle size={20} color="#3b82f6" className="mr-3" />
              <Text className="text-blue-400 font-bold">{t('install_other_versions')}</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {availableBibles.map((config) => (
                <TouchableOpacity
                  key={config.id}
                  onPress={() => { setLang(config.id); setShowLangPicker(false); }}
                  className={cn(
                    "flex-row items-center justify-between p-4 rounded-2xl mb-3 border",
                    lang === config.id ? "bg-[#195de6] border-[#195de6]" : "bg-[#111621] border-slate-800"
                  )}
                >
                  <View>
                    <Text className={cn("font-bold text-base", lang === config.id ? "text-white" : "text-slate-300")}>
                      {config.language}
                    </Text>
                    <Text className={cn("text-xs mt-1", lang === config.id ? "text-blue-100" : "text-slate-500")}>
                      {config.name}
                    </Text>
                  </View>
                  {lang === config.id && (
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
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="flex-row items-center mb-4 ml-2 mt-4">
      <View className="h-[3px] w-8 bg-[#195de6] mr-3 rounded-full opacity-80" />
      <Text className="text-xs font-bold uppercase text-slate-400 tracking-[0.2em]">{title}</Text>
    </View>
  );
}

function BookGridItem({ book, lang, testamentName, colorIdx = 0 }: any) {
  const router = useRouter();

  const colors = [
    { bg: 'bg-[#0f172a]', border: 'border-slate-800', text: 'text-white' },
    { bg: 'bg-[#1e1b4b]', border: 'border-indigo-900', text: 'text-indigo-200' },
    { bg: 'bg-[#064e3b]', border: 'border-emerald-900', text: 'text-emerald-200' },
  ];
  const c = colors[colorIdx] || colors[0];

  return (
    <TouchableOpacity
      onPress={() => router.push({
        pathname: "/bible/reader",
        params: {
          bookId: book.id,
          bookName: book.name,
          testament: book.testamentId,
          lang: lang,
          testamentName: testamentName
        }
      })}
      activeOpacity={0.7}
      className={`w-[48%] ${c.bg} border ${c.border} py-5 px-3 rounded-2xl mb-3 items-center justify-center shadow-sm`}
    >
      <Text
        className={`${c.text} text-[15px] font-medium text-center`}
        style={{ fontFamily: 'Lexend_600SemiBold' }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {book.name}
      </Text>
    </TouchableOpacity>
  );
}

function highlightText(text: string, query: string) {
  if (!query) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <Text>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text key={i} className="text-white font-bold bg-blue-600/30">{part}</Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}
