import { loadDatabase } from '@/lib/database';
import { useSettings } from '@/lib/settings-context';
import { cn } from '@/lib/utils';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, ChevronDown, ChevronRight, CloudDownload, Globe, Search, Trash2, X, Clock } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';

import { getBibleConfigs, BibleConfig } from '@/lib/bible';

export default function Bible() {
  const router = useRouter();
  const { settings: globalSettings, updateSettings } = useSettings();
  const [books, setBooks] = useState<any[]>([]);
  const [testaments, setTestaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState<'books' | 'verses'>('books');
  const [verseResults, setVerseResults] = useState<any[]>([]);
  const [isSearchingVerses, setIsSearchingVerses] = useState(false);
  const [lang, setLang] = useState<string>(globalSettings.bibleVersion || 'MG65');
  const [showLangPicker, setShowLangPicker] = useState(false);

  // Versions state
  const [availableVersions, setAvailableVersions] = useState<BibleConfig[]>([]);
  const [localFiles, setLocalFiles] = useState<string[]>([]);
  const [downloading, setDownloading] = useState<Record<string, number>>({});

  useEffect(() => {
    loadManifest();
    checkLocalFiles();
  }, []);

  const loadManifest = async (force = false) => {
    try {
      // 1. Toujours charger local en premier
      const configs = getBibleConfigs();
      setAvailableVersions(configs);

      // 2. Tenter sync GitHub (branche data)
      const GITHUB_URL = `https://raw.githubusercontent.com/Brayan-Clark/adventools/data/assets/bible/manifest.json?t=${Date.now()}`;
      const response = await fetch(GITHUB_URL);
      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData.versions) setAvailableVersions(remoteData.versions);
      }
    } catch (e) {
      console.log("Bible manifest sync failed, using local/cached");
    }
  };

  const checkLocalFiles = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);
      setLocalFiles(files);
    } catch (e) { console.error(e); }
  };

  const downloadBible = async (version: BibleConfig) => {
    try {
      setDownloading(prev => ({ ...prev, [version.id]: 0 }));
      const callback = (p: any) => {
        const progress = p.totalBytesWritten / p.totalBytesExpectedToWrite;
        setDownloading(prev => ({ ...prev, [version.id]: progress }));
      };
      const downloadResumable = FileSystem.createDownloadResumable(
        version.url,
        FileSystem.documentDirectory + version.file,
        {},
        callback
      );
      const result = await downloadResumable.downloadAsync();
      if (result) {
        setLocalFiles(prev => [...prev, version.file]);
      }
    } catch (e) {
      Alert.alert("Erreur", "Impossible de télécharger cette version.");
    } finally {
      setDownloading(prev => {
        const next = { ...prev };
        delete next[version.id];
        return next;
      });
    }
  };

  const deleteBible = async (version: BibleConfig) => {
    Alert.alert("Supprimer", `Voulez-vous supprimer ${version.name} ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive", onPress: async () => {
          await FileSystem.deleteAsync(FileSystem.documentDirectory + version.file);
          setLocalFiles(prev => prev.filter(f => f !== version.file));
          if (lang === version.id) {
            const next = availableVersions.find(v => localFiles.includes(v.file) && v.id !== version.id);
            if (next) setLang(next.id);
          }
        }
      }
    ]);
  };

  useEffect(() => {
    async function fetchData() {
      const config = availableVersions.find(v => v.id === lang);
      if (!config || !localFiles.includes(config.file)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const db = await loadDatabase(config.file);
        const tables: any = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");

        const isNewSchema = tables.some((t: any) => t.name === 'verses');
        let bookTable, testamentTable, colId, colName, colTestId;

        if (isNewSchema) {
          bookTable = 'books';
          testamentTable = undefined; // New ones don't seem to have testament table in my check, use fallback
          colId = 'book_number';
          colName = 'long_name';
          colTestId = 'book_number'; // Placeholder
        } else {
          bookTable = tables.find((t: any) => t.name.endsWith("_boky"))?.name;
          testamentTable = tables.find((t: any) => t.name.endsWith("_testamenta"))?.name;
          colId = 'id';
          colName = 'b_name';
          colTestId = 'b_testid';
        }

        // Fetch Testaments
        let testamentData = [];
        if (testamentTable) {
          testamentData = await db.getAllAsync(`SELECT id, test_name as name FROM ${testamentTable} ORDER BY id ASC`) as any[];
        } else {
          testamentData = [
            { id: 1, name: "Ancien Testament" },
            { id: 2, name: "Nouveau Testament" }
          ];
        }
        setTestaments(testamentData);

        // Fetch Books
        if (bookTable) {
          const result: any = await db.getAllAsync(`
            SELECT ${colId} as id, ${colName} as name, ${isNewSchema ? `(CASE WHEN ${colId} <= 39 THEN 1 ELSE 2 END)` : colTestId} as testamentId 
            FROM ${bookTable} 
            ORDER BY ${colId} ASC
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
  }, [lang, localFiles, availableVersions]);

  // Search Verses Function
  const handleVerseSearch = async (text: string) => {
    if (text.length < 3) {
      setVerseResults([]);
      return;
    }

    setIsSearchingVerses(true);
    try {
      const config = availableVersions.find(v => v.id === lang);
      if (!config) return;
      const db = await loadDatabase(config.file);

      const tables: any = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
      const isNewSchema = tables.some((t: any) => t.name === 'verses');

      let bookTable, verseTable, q;
      if (isNewSchema) {
        q = `
          SELECT v.chapter, v.verse, v.text, b.long_name as bookName, b.book_number as bookId, (CASE WHEN b.book_number <= 39 THEN 1 ELSE 2 END) as testament
          FROM verses v
          JOIN books b ON v.book_number = b.book_number
          WHERE v.text LIKE ?
          LIMIT 50
        `;
      } else {
        bookTable = tables.find((t: any) => t.name.endsWith("_boky"))?.name;
        verseTable = tables.find((t: any) => t.name.endsWith("_andininy"))?.name;
        q = `
          SELECT CAST(v.a_toko AS INTEGER) as chapter, v.a_and as verse, v.a_text as text, b.b_name as bookName, b.id as bookId, b.b_testid as testament
          FROM ${verseTable} v
          JOIN ${bookTable} b ON v.a_bid = b.id
          WHERE v.a_text LIKE ?
          LIMIT 50
        `;
      }

      const results = await db.getAllAsync(q, [`%${text}%`]);
      setVerseResults(results || []);
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
  }, [search, searchMode, lang, localFiles]);

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

      {/* Lang Picker Header */}
      {showLangPicker && (
        <View className="absolute inset-0 bg-black/70 justify-end z-[100]">
          <TouchableOpacity className="flex-1" onPress={() => setShowLangPicker(false)} />
          <View className="bg-[#1a2233] rounded-t-[40px] p-8 max-h-[85%] border-t border-slate-700">
            <View className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-8" />
            <Text className="text-xl font-bold text-white mb-2 text-center" style={{ fontFamily: 'Lexend_700Bold' }}>Versions Bibliques</Text>
            <Text className="text-slate-500 text-xs mb-8 text-center uppercase tracking-widest font-bold">Gérer vos téléchargements</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {availableVersions.map((version) => {
                const isLocal = localFiles.includes(version.file);
                const isDownloading = downloading[version.id] !== undefined;
                const progress = downloading[version.id] || 0;

                return (
                  <View key={version.id} className="mb-4">
                    <TouchableOpacity
                      onPress={() => {
                        if (isLocal) {
                          setLang(version.id);
                          setShowLangPicker(false);
                          updateSettings({ bibleVersion: version.id });
                        }
                      }}
                      className={cn(
                        "flex-row items-center justify-between p-5 rounded-3xl border",
                        lang === version.id && isLocal ? "bg-[#195de6] border-[#195de6]" : "bg-[#111621] border-slate-800"
                      )}
                    >
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text className={cn("font-bold text-base", (lang === version.id && isLocal) ? "text-white" : "text-slate-300")}>
                            {version.name}
                          </Text>
                          {isLocal && <View className="ml-2 bg-green-500/20 px-2 py-0.5 rounded-full"><Text className="text-green-500 text-[8px] font-bold">LOCAL</Text></View>}
                        </View>
                        <Text className={cn("text-xs mt-1", (lang === version.id && isLocal) ? "text-blue-100" : "text-slate-500")}>
                          {version.language} • {version.size}
                        </Text>
                      </View>

                      <View className="flex-row items-center">
                        {isDownloading ? (
                          <View className="items-center">
                            <ActivityIndicator size="small" color="#195de6" />
                            <Text className="text-[8px] text-blue-400 font-bold mt-1">{Math.round(progress * 100)}%</Text>
                          </View>
                        ) : !isLocal ? (
                          <TouchableOpacity
                            onPress={() => downloadBible(version)}
                            className="bg-white/5 p-3 rounded-2xl border border-white/5"
                          >
                            <CloudDownload size={20} color="#3b82f6" />
                          </TouchableOpacity>
                        ) : (
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              onPress={() => deleteBible(version)}
                              className="bg-red-500/10 p-3 rounded-2xl border border-red-500/20"
                            >
                              <Trash2 size={20} color="#ef4444" />
                            </TouchableOpacity>
                            {lang === version.id && (
                              <View className="w-10 h-10 rounded-full bg-white items-center justify-center">
                                <Text className="text-[#195de6] font-bold text-xs">✓</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                    {isDownloading && (
                      <View className="h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                        <View className="h-full bg-blue-500" style={{ width: `${progress * 100}%` }} />
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Empty State if no Bible downloaded */}
      {!loading && books.length === 0 && (
        <View className="flex-1 justify-center items-center px-10">
          <View className="w-20 h-20 bg-blue-500/10 rounded-full items-center justify-center mb-6">
            <CloudDownload size={40} color="#3b82f6" />
          </View>
          <Text className="text-white font-bold text-xl text-center mb-2">Aucune Bible locale</Text>
          <Text className="text-slate-400 text-center mb-8">Téléchargez une version pour commencer votre lecture, même hors-ligne.</Text>
          <TouchableOpacity
            onPress={() => setShowLangPicker(true)}
            className="bg-[#195de6] px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/30"
          >
            <Text className="text-white font-bold">Explorer les versions</Text>
          </TouchableOpacity>
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
