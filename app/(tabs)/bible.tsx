import { loadDatabase } from '@/lib/database';
import { useSettings } from '@/lib/settings-context';
import { cn } from '@/lib/utils';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, ChevronDown, ChevronRight, Globe, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Static imports for all database files
export const DB_SOURCES: Record<string, any> = {
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
export const BIBLE_CONFIGS: Record<string, { file: string; prefix: string; name: string }> = {
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

export default function Bible() {
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  const [books, setBooks] = useState<any[]>([]);
  const [testaments, setTestaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState<'books' | 'verses'>('books');
  const [verseResults, setVerseResults] = useState<any[]>([]);
  const [isSearchingVerses, setIsSearchingVerses] = useState(false);
  const [lang, setLang] = useState<string>(globalSettings.bibleVersion || 'MG');
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const config = BIBLE_CONFIGS[lang];
        const db = await loadDatabase(config.file, DB_SOURCES[config.file]);
        const tables: any = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
        const bookTable = tables.find((t: any) => t.name.endsWith("_boky"))?.name;
        const testamentTable = tables.find((t: any) => t.name.endsWith("_testamenta"))?.name;

        // Fetch Testaments
        let testamentData = [];
        if (testamentTable) {
          testamentData = await db.getAllAsync(`SELECT id, test_name as name FROM ${testamentTable} ORDER BY id ASC`) as any[];
        } else {
          // Fallback
          testamentData = [
            { id: 1, name: "Ancien Testament" },
            { id: 2, name: "Nouveau Testament" }
          ];
        }
        setTestaments(testamentData);

        // Fetch Books
        if (bookTable) {
          const result: any = await db.getAllAsync(`
            SELECT id, b_name as name, b_testid as testamentId 
            FROM ${bookTable} 
            ORDER BY id ASC
          `);
          setBooks(result || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [lang]);

  // Search Verses Function
  const handleVerseSearch = async (text: string) => {
    if (text.length < 3) {
      setVerseResults([]);
      return;
    }

    setIsSearchingVerses(true);
    try {
      const config = BIBLE_CONFIGS[lang];
      const db = await loadDatabase(config.file, DB_SOURCES[config.file]);

      const tables: any = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
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
          <Text className="text-2xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>Sainte Bible</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowLangPicker(true)}
          className="flex-row items-center bg-slate-900 px-4 py-2 rounded-full border border-slate-800"
        >
          <Globe size={16} color="#94a3b8" />
          <Text className="text-white font-bold text-xs ml-2 tracking-wider">{lang}</Text>
          <ChevronDown size={14} color="#64748b" className="ml-1" />
        </TouchableOpacity>
      </View>

      <View className="px-6 mb-4">
        <View className="relative flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-1 shadow-inner">
          <Search size={18} color="#64748b" />
          <TextInput
            placeholder={searchMode === 'books' ? "Rechercher un livre..." : "Rechercher un texte..."}
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
          <Text className={cn("font-bold text-xs", searchMode === 'books' ? "text-white" : "text-slate-500")}>LIVRES</Text>
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
          <Text className={cn("font-bold text-xs", searchMode === 'verses' ? "text-white" : "text-slate-500")}>VERSETS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {searchMode === 'books' ? (
          testaments.map((testament) => {
            const booksInSection = filteredBooks.filter(b => b.testamentId === testament.id);
            if (booksInSection.length === 0) return null;

            return (
              <View key={testament.id}>
                <SectionHeader title={testament.name} />
                <View className="flex-row flex-wrap justify-between pb-6">
                  {booksInSection.map((book) => (
                    <BookGridItem key={book.id} book={book} lang={lang} />
                  ))}
                </View>
              </View>
            );
          })
        ) : (
          <View className="pb-24">
            {isSearchingVerses ? (
              <View className="py-20 items-center">
                <ActivityIndicator color="#195de6" />
                <Text className="text-slate-500 mt-4">Recherche dans la Bible...</Text>
              </View>
            ) : search.length < 3 ? (
              <View className="py-20 items-center">
                <Text className="text-slate-500 text-center px-10">Entrez au moins 3 caractères pour rechercher dans les textes.</Text>
              </View>
            ) : verseResults.length === 0 ? (
              <View className="py-20 items-center">
                <Text className="text-slate-500">Aucun verset trouvé pour "{search}"</Text>
              </View>
            ) : (
              <>
                <Text className="text-slate-500 text-xs font-bold mb-4 ml-2">{verseResults.length} RÉSULTATS TROUVÉS</Text>
                {verseResults.map((v, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => router.push({
                      pathname: "/bible/reader",
                      params: {
                        bookId: v.bookId,
                        bookName: v.bookName,
                        testament: v.testament,
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

function BookGridItem({ book, lang }: any) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push({
        pathname: "/bible/reader",
        params: { bookId: book.id, bookName: book.name, testament: book.testamentId, lang: lang }
      })}
      activeOpacity={0.7}
      className="w-[48%] bg-[#0f172a] border border-slate-800 py-5 px-3 rounded-2xl mb-3 items-center justify-center shadow-sm"
    >
      <Text
        className="text-white text-[15px] font-medium text-center"
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
