import { loadDatabase } from '@/lib/database';
import { useSettings } from '@/lib/settings-context';
import { cn } from '@/lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Globe, Palette, Share2, Type, X, CloudDownload, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { getBibleConfigs, BibleConfig } from '@/lib/bible';

export default function BibleReader() {
  const router = useRouter();
  const { bookId, bookName, testament: testamentParam, chapter: chapterParam, verse: verseParam, lang: langParam } = useLocalSearchParams();
  const [testament, setTestament] = useState<string>(testamentParam as string || "1");
  const [chapter, setChapter] = useState(Number(chapterParam) || 1);
  const [chaptersCount, setChaptersCount] = useState(0);
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const { settings: globalSettings } = useSettings();

  const [availableVersions, setAvailableVersions] = useState<BibleConfig[]>([]);
  const [localFiles, setLocalFiles] = useState<string[]>([]);
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [lang, setLang] = useState<string>((langParam as string) || globalSettings.bibleVersion || 'MG65');

  useEffect(() => {
    setAvailableVersions(getBibleConfigs());
    checkLocalFiles();
  }, []);

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
  const [currentBookName, setCurrentBookName] = useState(bookName);
  const flatListRef = React.useRef<FlatList>(null);
  const [highlights, setHighlights] = useState<Record<string, any>>({});
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [selectedVerse, setSelectedVerse] = useState<{ verse: number, text: string } | null>(null);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [wordHighlights, setWordHighlights] = useState<Record<string, any>>({});
  const [wordSelectMode, setWordSelectMode] = useState(false);
  const [selectedWordColor, setSelectedWordColor] = useState('#facc15');
  const [tempWordHighlights, setTempWordHighlights] = useState<Record<number, string>>({});

  useEffect(() => {
    loadHighlights();
    loadBookmarks();
    loadWordHighlights();
  }, [chapter, bookId, lang]);

  // Open study mode and clone existing highlights for this verse
  const enterStudyMode = () => {
    if (!selectedVerse) return;
    const existing = wordHighlights[selectedVerse.verse.toString()] || {};
    setTempWordHighlights({ ...existing });
    setWordSelectMode(true);
  };

  const saveStudyResults = async () => {
    if (!selectedVerse) return;
    const vKey = selectedVerse.verse.toString();
    const newWh = { ...wordHighlights };

    if (Object.keys(tempWordHighlights).length === 0) {
      delete newWh[vKey];
    } else {
      newWh[vKey] = tempWordHighlights;
    }

    setWordHighlights(newWh);
    await AsyncStorage.setItem(`word_highlights_${lang}_${bookId}_${chapter}`, JSON.stringify(newWh));
    setWordSelectMode(false);
    setSelectedVerse(null);
  };

  const loadWordHighlights = async () => {
    try {
      const stored = await AsyncStorage.getItem(`word_highlights_${lang}_${bookId}_${chapter}`);
      setWordHighlights(stored ? JSON.parse(stored) : {});
    } catch (e) { console.error(e); }
  };

  const saveWordHighlight = async (verseNum: number, wordIndex: number, color: string | null) => {
    try {
      const vKey = verseNum.toString();
      const newWh = { ...wordHighlights };
      const verseWh = { ...(newWh[vKey] || {}) };

      if (color) {
        verseWh[wordIndex] = color;
      } else {
        delete verseWh[wordIndex];
      }

      if (Object.keys(verseWh).length === 0) {
        delete newWh[vKey];
      } else {
        newWh[vKey] = verseWh;
      }

      setWordHighlights(newWh);
      await AsyncStorage.setItem(`word_highlights_${lang}_${bookId}_${chapter}`, JSON.stringify(newWh));
    } catch (e) { console.error(e); }
  };

  const loadBookmarks = async () => {
    try {
      const stored = await AsyncStorage.getItem(`bookmarks_${lang}_${bookId}_${chapter}`);
      setBookmarks(stored ? JSON.parse(stored) : {});
    } catch (e) {
      console.error(e);
    }
  };

  const toggleBookmark = async (verseNum: number) => {
    try {
      const key = verseNum.toString();
      const newBookmarks = { ...bookmarks };
      newBookmarks[key] = !newBookmarks[key];
      if (!newBookmarks[key]) delete newBookmarks[key];
      setBookmarks(newBookmarks);
      await AsyncStorage.setItem(`bookmarks_${lang}_${bookId}_${chapter}`, JSON.stringify(newBookmarks));
    } catch (e) {
      console.error(e);
    }
  };

  const loadHighlights = async () => {
    try {
      const stored = await AsyncStorage.getItem(`highlights_${lang}_${bookId}_${chapter}`);
      setHighlights(stored ? JSON.parse(stored) : {});
    } catch (e) {
      console.error(e);
    }
  };

  const saveHighlight = async (verseNum: number, type: 'bg' | 'text', color: string | null) => {
    try {
      const key = verseNum.toString();
      const newHighlights = { ...highlights };

      const current = newHighlights[key] || {};
      const safeCurrent = typeof current === 'string' ? { bg: current } : { ...current };

      if (color) {
        safeCurrent[type] = color;
      } else {
        delete safeCurrent[type];
      }

      if (!safeCurrent.bg && !safeCurrent.text) {
        delete newHighlights[key];
      } else {
        newHighlights[key] = safeCurrent;
      }

      setHighlights(newHighlights);
      await AsyncStorage.setItem(`highlights_${lang}_${bookId}_${chapter}`, JSON.stringify(newHighlights));
    } catch (e) { console.error(e); }
  };

  const changeChapter = (delta: number) => {
    const next = chapter + delta;
    if (next < 1) return;
    setChapter(next);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  // Update chapter when chapterParam changes
  useEffect(() => {
    if (chapterParam) {
      const newChapter = Number(chapterParam);
      if (!isNaN(newChapter) && newChapter > 0) {
        setChapter(newChapter);
      }
    }
  }, [chapterParam]);

  // Scroll to verse after verses are loaded
  useEffect(() => {
    if (verseParam && verses.length > 0 && flatListRef.current) {
      const targetVerse = Number(verseParam);
      if (!isNaN(targetVerse)) {
        // Find index of the verse
        const verseIndex = verses.findIndex(v => Number(v.verse) === targetVerse);
        if (verseIndex !== -1) {
          // Delay to ensure FlatList is rendered
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: verseIndex,
              animated: true,
              viewPosition: 0.2 // Position at 20% from top
            });
          }, 300);
        }
      }
    }
  }, [verseParam, verses]);

  useEffect(() => {
    async function loadData() {
      if (!bookId) return;
      setLoading(true);
      try {
        const config = availableVersions.find(v => v.id === lang) || availableVersions.find(v => v.isDefault) || availableVersions[0];
        if (!config) {
          setLoading(false);
          return;
        }

        console.log(`[BibleReader] Loading ${lang} - Book: ${bookId}, Chapter: ${chapter}`);
        const db = await loadDatabase(config.file);

        // Dynamically discover table names and schema
        const tables: any = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
        const isNewSchema = tables.some((t: any) => t.name === 'verses');

        let bookTable, verseTable, colId, colName, colVerseBid, colVerseToko, colVerseAnd, colVerseText;

        if (isNewSchema) {
          bookTable = 'books';
          verseTable = 'verses';
          colId = 'book_number';
          colName = 'long_name';
          colVerseBid = 'book_number';
          colVerseToko = 'chapter';
          colVerseAnd = 'verse';
          colVerseText = 'text';
        } else {
          bookTable = tables.find((t: any) => t.name.endsWith("_boky"))?.name;
          verseTable = tables.find((t: any) => t.name.endsWith("_andininy"))?.name;
          colId = 'id';
          colName = 'b_name';
          colVerseBid = 'a_bid';
          colVerseToko = 'a_toko';
          colVerseAnd = 'a_and';
          colVerseText = 'a_text';
        }

        const colTestId = isNewSchema ? `(CASE WHEN ${colId} <= 39 THEN 1 ELSE 2 END)` : 'b_testid';

        if (!bookTable || !verseTable) {
          console.error("[BibleReader] Tables not found");
          setLoading(false);
          return;
        }

        const bookIdNum = Number(bookId);

        // Get book name and testament in selected language
        const bookInfo: any = await db.getFirstAsync(`
          SELECT ${colName} as name, ${colTestId} as testamentId FROM ${bookTable} WHERE ${colId} = ?
        `, [bookIdNum]);

        if (bookInfo) {
          setCurrentBookName(bookInfo.name);
          setTestament(String(bookInfo.testamentId));
        }

        // Get total chapters for this book
        const countResult: any = await db.getFirstAsync(`
          SELECT COUNT(DISTINCT ${colVerseToko}) as count FROM ${verseTable} WHERE ${colVerseBid} = ?
        `, [bookIdNum]);

        if (countResult) {
          setChaptersCount(countResult.count);
        }

        // Get verses
        const chapterNum = Number(chapter);
        const versesResult: any = await db.getAllAsync(`
          SELECT ${colVerseAnd} as verse, ${colVerseText} as text 
          FROM ${verseTable} 
          WHERE ${colVerseBid} = ? AND CAST(${colVerseToko} AS INTEGER) = ?
            ORDER BY CAST(${colVerseAnd} AS INTEGER) ASC
        `, [bookIdNum, isNaN(chapterNum) ? 1 : chapterNum]);

        setVerses(versesResult || []);
        console.log(`[BibleReader] Loaded ${versesResult?.length || 0} verses in ${lang}`);

        // Save to History (inside try block to access bookInfo)
        try {
          const historyItem = {
            type: 'bible',
            title: `${bookInfo?.name || 'Bible'} ${chapter}`,
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
      } catch (e) {
        console.error("[BibleReader] Load Error:", e);
      } finally {
        setLoading(false);
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

        <TouchableOpacity
          onPress={() => setShowBookmarksModal(true)}
          className="p-2 -mr-2"
        >
          <Bookmark size={24} color={Object.keys(bookmarks).length > 0 ? "#195de6" : "#64748b"} fill={Object.keys(bookmarks).length > 0 ? "#195de6" : "transparent"} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={loading ? [] : verses}
        keyExtractor={(item) => item.verse.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 0 }}
        onScrollToIndexFailed={(info) => {
          console.log('Scroll to index failed:', info);
        }}
        ListHeaderComponent={
          <>
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

              {loading && (
                <View className="py-10">
                  <ActivityIndicator color="#195de6" />
                </View>
              )}
            </View>
          </>
        }
        renderItem={({ item: v }) => {
          const h = highlights[v.verse.toString()];
          const bg = typeof h === 'string' ? h : h?.bg;
          const userTextColor = typeof h === 'object' ? h?.text : undefined;
          const isBookmarked = bookmarks[v.verse.toString()];
          const vWh = wordHighlights[v.verse.toString()] || {};
          const words = v.text.split(' ');

          return (
            <View className="px-7">
              <TouchableOpacity
                onLongPress={() => setSelectedVerse(v)}
                delayLongPress={300}
                activeOpacity={0.7}
                className={cn(
                  "mb-4 rounded-xl px-2 py-1 relative",
                  wordSelectMode && selectedVerse?.verse === v.verse ? "border-2 border-blue-500/50 bg-blue-500/5" : ""
                )}
                style={bg ? { backgroundColor: bg } : {}}
              >
                {isBookmarked && (
                  <View className="absolute -left-5 top-1">
                    <Bookmark size={24} color="#195de6" fill="#195de6" />
                  </View>
                )}
                <Text
                  className="text-slate-300"
                  style={{
                    fontSize: globalSettings.fontSize,
                    lineHeight: globalSettings.fontSize * globalSettings.lineHeight,
                    letterSpacing: globalSettings.letterSpacing,
                    fontFamily: globalSettings.fontFamily === 'System' ? undefined : globalSettings.fontFamily,
                    color: userTextColor || '#cbd5e1'
                  }}
                >
                  <Text className="text-[10px] font-bold text-slate-500 mr-1">
                    {v.verse}
                  </Text>
                  {" "}
                  {words.map((word: string, idx: number) => (
                    <Text
                      key={idx}
                      style={{ color: vWh[idx] || userTextColor || '#cbd5e1' }}
                    >
                      {word}{" "}
                    </Text>
                  ))}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListFooterComponent={
          <View className="px-6 py-6 flex-row justify-between items-center pb-12">
            <TouchableOpacity
              onPress={() => changeChapter(-1)}
              disabled={Number(chapter) <= 1}
              className={`flex-row items-center px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 ${Number(chapter) <= 1 ? 'opacity-0' : ''}`}
            >
              <ChevronLeft size={18} color="white" />
              <Text className="text-white font-bold ml-2 text-sm">Précédent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => changeChapter(1)}
              className="flex-row items-center px-4 py-3 rounded-2xl bg-[#195de6] shadow-lg shadow-blue-900/40"
            >
              <Text className="text-white font-bold mr-2 text-sm">Suivant</Text>
              <ChevronRight size={18} color="white" />
            </TouchableOpacity>
          </View>
        }
      />

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
      {/* Verse Action Modal */}
      <Modal visible={!!selectedVerse} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 bg-black/60 justify-end"
          activeOpacity={1}
          onPress={() => setSelectedVerse(null)}
        >
          <View className="bg-[#1a2233] rounded-t-[30px] p-6 border-t border-slate-700">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-bold text-lg">{currentBookName} {chapter}:{selectedVerse?.verse}</Text>
              <TouchableOpacity onPress={() => setSelectedVerse(null)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Colors BG */}
            <Text className="text-slate-400 text-xs font-bold uppercase mb-3 tracking-widest">Surligner</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-4 mb-6">
              {[
                { color: '#facc1520', border: '#facc15', name: 'Jaune' },
                { color: '#4ade8020', border: '#4ade80', name: 'Vert' },
                { color: '#f8717120', border: '#f87171', name: 'Rouge' },
                { color: '#60a5fa20', border: '#60a5fa', name: 'Bleu' },
              ].map((c) => {
                const h = highlights[selectedVerse?.verse.toString() || ''];
                const bg = typeof h === 'string' ? h : h?.bg;
                return (
                  <TouchableOpacity
                    key={c.name}
                    onPress={() => saveHighlight(selectedVerse!.verse, 'bg', c.color)}
                    className="w-12 h-12 rounded-full border-2 items-center justify-center mr-2"
                    style={{ backgroundColor: c.color, borderColor: c.border }}
                  >
                    {bg === c.color && <Check size={16} color="white" />}
                  </TouchableOpacity>
                )
              })}
              <TouchableOpacity
                onPress={() => saveHighlight(selectedVerse!.verse, 'bg', null)}
                className="w-12 h-12 rounded-full border border-slate-600 items-center justify-center bg-slate-800"
              >
                <X size={16} color="white" />
              </TouchableOpacity>
            </ScrollView>

            {/* Colors Text */}
            <Text className="text-slate-400 text-xs font-bold uppercase mb-3 tracking-widest">Couleur Texte</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-4 mb-8">
              {[
                { color: '#facc15', name: 'Jaune' },
                { color: '#4ade80', name: 'Vert' },
                { color: '#f87171', name: 'Rouge' },
                { color: '#38bdf8', name: 'Bleu' },
                { color: '#ffffff', name: 'Blanc' },
              ].map((c) => {
                const h = highlights[selectedVerse?.verse.toString() || ''];
                const txt = typeof h === 'object' ? h?.text : undefined;
                return (
                  <TouchableOpacity
                    key={c.name}
                    onPress={() => saveHighlight(selectedVerse!.verse, 'text', c.color)}
                    className="w-12 h-12 rounded-full border border-slate-700 items-center justify-center mr-2"
                    style={{ backgroundColor: '#1e293b' }}
                  >
                    <View className="w-6 h-6 rounded-full" style={{ backgroundColor: c.color }} />
                    {txt === c.color && <View className="absolute inset-0 items-center justify-center"><Check size={16} color={c.color === '#ffffff' ? 'black' : 'white'} /></View>}
                  </TouchableOpacity>
                )
              })}
              <TouchableOpacity
                onPress={() => saveHighlight(selectedVerse!.verse, 'text', null)}
                className="w-12 h-12 rounded-full border border-slate-600 items-center justify-center bg-slate-800"
              >
                <X size={16} color="white" />
              </TouchableOpacity>
            </ScrollView>

            {/* Word Select Color Picker (Only if mode is active) */}
            {wordSelectMode && (
              <View className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <Text className="text-blue-400 text-[10px] font-bold uppercase mb-3 tracking-widest text-center">Couleur du mot sélectionné</Text>
                <View className="flex-row justify-center gap-4">
                  {['#facc15', '#4ade80', '#f87171', '#38bdf8', '#ffffff'].map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setSelectedWordColor(c)}
                      className="w-10 h-10 rounded-full border-2 items-center justify-center shadow-lg"
                      style={{ backgroundColor: c, borderColor: selectedWordColor === c ? 'white' : 'transparent' }}
                    >
                      {selectedWordColor === c && <Check size={16} color={c === '#ffffff' ? 'black' : 'white'} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Actions */}
            <View className="gap-3">
              <TouchableOpacity
                onPress={enterStudyMode}
                className={cn(
                  "flex-row items-center justify-center p-4 rounded-xl border bg-slate-800 border-slate-700"
                )}
              >
                {wordSelectMode ? <Check size={20} color="white" className="mr-3" /> : <Palette size={20} color="white" className="mr-3" />}
                <Text className="text-white font-bold">{wordSelectMode ? "Enregistrer l'étude" : "Mode Étude (Mots)"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  shareVerse(selectedVerse!.verse, selectedVerse!.text);
                  setSelectedVerse(null);
                }}
                className="flex-row items-center justify-center bg-slate-800 p-4 rounded-xl border border-slate-700"
              >
                <Share2 size={20} color="white" className="mr-3" />
                <Text className="text-white font-bold">Partager l'image</Text>
              </TouchableOpacity>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(`${currentBookName} ${chapter}:${selectedVerse?.verse}\n${selectedVerse?.text}`);
                    Alert.alert("Copié", "Verset copié dans le presse-papier");
                    setSelectedVerse(null);
                  }}
                  className="flex-1 bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex-row items-center justify-center"
                >
                  <Copy size={18} color="white" className="mr-2" />
                  <Text className="text-white font-bold">Copier</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    toggleBookmark(selectedVerse!.verse);
                    setSelectedVerse(null);
                  }}
                  className={`flex-1 p-4 rounded-xl border flex-row items-center justify-center ${bookmarks[selectedVerse?.verse.toString() || ''] ? 'bg-blue-600/20 border-blue-600' : 'bg-slate-800/80 border-slate-700'}`}
                >
                  <Bookmark size={18} color={bookmarks[selectedVerse?.verse.toString() || ''] ? "#195de6" : "white"} fill={bookmarks[selectedVerse?.verse.toString() || ''] ? "#195de6" : "transparent"} className="mr-2" />
                  <Text className={bookmarks[selectedVerse?.verse.toString() || ''] ? "text-blue-400 font-bold" : "text-white font-bold"}>Signet</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View className="h-8" />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Study Mode Modal */}
      <Modal visible={wordSelectMode} transparent animationType="slide">
        <View className="flex-1 bg-black/95 justify-center p-6">
          <View className="bg-[#1a2233] rounded-[40px] p-8 border border-white/10 shadow-2xl">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-primary text-[10px] font-bold uppercase tracking-widest mb-1">Mode Étude Tactile</Text>
                <Text className="text-white font-bold text-xl">{currentBookName} {chapter}:{selectedVerse?.verse}</Text>
              </View>
              <TouchableOpacity onPress={() => setWordSelectMode(false)} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Preview Area */}
            <View className="bg-[#111621] p-6 rounded-3xl mb-8 border border-white/5">
              <Text style={{
                fontSize: 22,
                lineHeight: 34,
                color: '#cbd5e1',
                fontFamily: 'Lexend_400Regular',
                textAlign: 'center'
              }}>
                {(selectedVerse?.text.split(' ') || []).map((word, idx) => (
                  <Text
                    key={idx}
                    onPress={() => {
                      const newTemp = { ...tempWordHighlights };
                      if (newTemp[idx] === selectedWordColor) {
                        delete newTemp[idx];
                      } else {
                        newTemp[idx] = selectedWordColor;
                      }
                      setTempWordHighlights(newTemp);
                    }}
                    style={{
                      color: tempWordHighlights[idx] || '#cbd5e1'
                    }}
                  >
                    {word}{" "}
                  </Text>
                ))}
              </Text>
            </View>

            {/* Color Palette for Words */}
            <View className="flex-row justify-center gap-3 mb-10">
              {['#facc15', '#4ade80', '#f87171', '#38bdf8', '#ffffff'].map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSelectedWordColor(c)}
                  className="w-12 h-12 rounded-full border-2 items-center justify-center"
                  style={{ backgroundColor: c, borderColor: selectedWordColor === c ? 'white' : 'transparent' }}
                >
                  {selectedWordColor === c && <Check size={20} color={c === '#ffffff' ? 'black' : 'white'} />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setTempWordHighlights({})}
                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 items-center justify-center"
              >
                <X size={20} color="white" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={saveStudyResults}
              className="bg-primary py-5 rounded-2xl items-center shadow-xl shadow-primary/30"
            >
              <Text className="text-white font-bold text-lg">Appliquer au texte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Signets */}
      <Modal visible={showBookmarksModal} transparent animationType="slide">
        <TouchableOpacity
          className="flex-1 bg-black/60 justify-end"
          activeOpacity={1}
          onPress={() => setShowBookmarksModal(false)}
        >
          <View className="bg-[#1a2233] rounded-t-[40px] p-8 max-h-[80%] border-t border-slate-800">
            <View className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-8" />
            <Text className="text-xl font-bold text-white mb-6 text-center" style={{ fontFamily: 'Lexend_700Bold' }}>Signets - {currentBookName} {chapter}</Text>

            {Object.keys(bookmarks).length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {Object.keys(bookmarks).sort((a, b) => parseInt(a) - parseInt(b)).map((vNum) => {
                  const vText = verses.find(v => v.verse.toString() === vNum)?.text || "";
                  return (
                    <TouchableOpacity
                      key={vNum}
                      onPress={() => {
                        setShowBookmarksModal(false);
                        const index = verses.findIndex(v => v.verse.toString() === vNum);
                        if (index !== -1) {
                          flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 });
                        }
                      }}
                      className="bg-[#111621] p-4 rounded-2xl mb-3 border border-slate-800"
                    >
                      <View className="flex-row items-center mb-2">
                        <Bookmark size={14} color="#195de6" fill="#195de6" />
                        <Text className="text-blue-400 font-bold text-xs ml-2">Verset {vNum}</Text>
                      </View>
                      <Text className="text-slate-400 text-sm italic" numberOfLines={2}>{vText}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View className="py-20 items-center">
                <Bookmark size={48} color="#1e293b" />
                <Text className="text-slate-500 mt-4">Aucun signet dans ce chapitre</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setShowBookmarksModal(false)}
              className="mt-6 bg-[#195de6] py-4 rounded-2xl items-center"
            >
              <Text className="text-white font-bold">Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Selection Langue */}
      {
        showLangPicker && (
          <View className="absolute inset-0 bg-black/70 justify-end z-[100]">
            <TouchableOpacity className="flex-1" onPress={() => setShowLangPicker(false)} />
            <View className="bg-[#1a2233] rounded-t-[40px] p-8 max-h-[70%] border-t border-slate-700">
              <View className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-8" />
              <Text className="text-xl font-bold text-white mb-8 text-center" style={{ fontFamily: 'Lexend_700Bold' }}>Choisir une langue</Text>
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
        )
      }

      {/* Modal Selection Chapitre */}
      {
        showChapterPicker && (
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
        )
      }

      {/* Modal Paramètres */}
      {
        showSettings && (
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
            {/* New content for Settings Group and Items */}
            {/* Assuming SettingsGroup and SettingItem are custom components */}
            {/* This part of the snippet was malformed, so I'm placing it logically */}
            {/* If these components are not defined, this will cause an error */}
            {/* For the purpose of this edit, I'm assuming they exist and are imported */}
            {/* This section is added based on the user's provided snippet, assuming it's meant to extend settings */}
            {/* <SettingsGroup title="Support">
            <SettingItem
              icon={<Info size={18} color="#64748b" />}
              label="À Propos d'Adventools"
              onPress={() => router.push('/settings/about' as any)}
            />
            <SettingItem
              icon={<Heart size={18} color="#ef4444" />}
              label="Soutenir le projet (Don)"
              onPress={() => router.push('/settings/don' as any)}
            />
          </SettingsGroup> */}
            <TouchableOpacity
              onPress={() => setShowSettings(false)}
              className="bg-[#195de6] py-4 rounded-2xl items-center"
            >
              <Text className="text-white font-bold">Terminer</Text>
            </TouchableOpacity>
          </View>
        )
      }
    </View >
  );
}
