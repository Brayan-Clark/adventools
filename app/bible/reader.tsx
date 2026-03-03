import { loadDatabase } from '@/lib/database';
import { useSettings } from '@/lib/settings-context';
import { cn } from '@/lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Globe, Palette, Share2, Type, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { BibleConfig, checkAndDownloadBible, DB_SOURCES, getAvailableBibles } from '@/lib/bible';

export default function BibleReader() {
  const router = useRouter();
  const { bookId, bookName, testament, testamentName, chapter: chapterParam, verse: verseParam, lang: langParam } = useLocalSearchParams();
  const [chapter, setChapter] = useState(Number(chapterParam) || 1);
  const [chaptersCount, setChaptersCount] = useState(0);
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const { settings: globalSettings } = useSettings();
  const [availableBibles, setAvailableBibles] = useState<BibleConfig[]>([]);
  const [lang, setLang] = useState<string>((langParam as string) || globalSettings.bibleVersion || 'MG');
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
  const [highlightVerse, setHighlightVerse] = useState<number | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      async function init() {
        const bibles = await getAvailableBibles();
        setAvailableBibles(bibles);
      }
      init();
    }, [])
  );

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
          // Trigger highlight
          setHighlightVerse(targetVerse);

          // Clear highlight after 3 seconds
          const timer = setTimeout(() => {
            setHighlightVerse(null);
          }, 3000);

          // Delay to ensure FlatList is rendered
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: verseIndex,
              animated: true,
              viewPosition: 0.2 // Position at 20% from top
            });
          }, 300);

          return () => clearTimeout(timer);
        }
      }
    }
  }, [verseParam, verses]);

  useEffect(() => {
    async function loadData() {
      if (!bookId || availableBibles.length === 0) return;
      setLoading(true);
      try {
        const config = availableBibles.find(b => b.id === lang) || availableBibles[0];
        console.log(`[BibleReader] Loading ${lang} - Book: ${bookId}, Chapter: ${chapter}`);

        // Ensure file exists
        await checkAndDownloadBible(config);

        const db = await loadDatabase(config.file, DB_SOURCES[config.file], 'bibles');

        // Dynamically discover table names
        const tables: any = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
        const isCloud = tables.some((t: any) => t.name === 'books');

        const bookIdNum = Number(bookId);
        let bookInfo: any;
        let countResult: any;
        let versesResult: any;

        if (isCloud) {
          // New Cloud Schema
          bookInfo = await db.getFirstAsync(`SELECT long_name as name FROM books WHERE book_number = ?`, [bookIdNum]);
          countResult = await db.getFirstAsync(`SELECT COUNT(DISTINCT chapter) as count FROM verses WHERE book_number = ?`, [bookIdNum]);

          versesResult = await db.getAllAsync(`
            SELECT verse as verse, text as text 
            FROM verses 
            WHERE book_number = ? AND CAST(chapter AS INTEGER) = ?
            ORDER BY CAST(verse AS INTEGER) ASC
          `, [bookIdNum, chapter]);
        } else {
          // Legacy Schema
          const bookTable = tables.find((t: any) => t.name.endsWith("_boky"))?.name;
          const verseTable = tables.find((t: any) => t.name.endsWith("_andininy"))?.name;

          if (bookTable && verseTable) {
            bookInfo = await db.getFirstAsync(`SELECT b_name as name FROM ${bookTable} WHERE id = ?`, [bookIdNum]);
            countResult = await db.getFirstAsync(`SELECT COUNT(DISTINCT a_toko) as count FROM ${verseTable} WHERE a_bid = ?`, [bookIdNum]);

            versesResult = await db.getAllAsync(`
              SELECT a_and as verse, a_text as text 
              FROM ${verseTable} 
              WHERE a_bid = ? AND CAST(a_toko AS INTEGER) = ?
              ORDER BY CAST(a_and AS INTEGER) ASC
            `, [bookIdNum, chapter]);
          }
        }

        if (bookInfo) setCurrentBookName(bookInfo.name);
        if (countResult) setChaptersCount(countResult.count);
        setVerses(versesResult || []);

        // Save to History
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
          history = history.filter((h: any) => h.title !== historyItem.title);
          history.unshift(historyItem);
          await AsyncStorage.setItem('app_history', JSON.stringify(history.slice(0, 5)));
        } catch (e) { }
      } catch (e) {
        console.error("[BibleReader] Load Error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [bookId, chapter, lang, availableBibles]);

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
          <Text className="text-white font-bold text-xs ml-2 tracking-wider">
            {availableBibles.find(b => b.id === lang)?.language || lang}
          </Text>
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
                  {testamentName || (Number(testament) === 3 ? 'Testamenta Vaovao' : Number(testament) === 2 ? 'Apokrif' : 'Testamenta Taloha')}
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
          const isBookmarked = !!bookmarks[v.verse.toString()];
          const vWh = wordHighlights[v.verse.toString()] || {};
          const words = v.text.split(' ');

          const handleSelectVerse = () => {
            setSelectedVerse({ verse: Number(v.verse), text: v.text });
          };

          return (
            <View className="px-7">
              <TouchableOpacity
                onPress={() => !wordSelectMode && handleSelectVerse()}
                onLongPress={handleSelectVerse}
                delayLongPress={300}
                activeOpacity={0.7}
                className={cn(
                  "mb-4 rounded-xl px-2 py-1 relative",
                  wordSelectMode && Number(selectedVerse?.verse) === Number(v.verse) ? "border-2 border-blue-500/50 bg-blue-500/5" : "",
                  highlightVerse === Number(v.verse) ? "bg-blue-500/20 shadow-lg shadow-blue-500/30" : ""
                )}
                style={bg && highlightVerse !== Number(v.verse) ? { backgroundColor: bg } : {}}
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
                  {(() => {
                    let inTag = false;
                    return words.map((word: string, idx: number) => {
                      const segments = word.split(/(<n>|<\/n>|<pb>|<\/pb>)/g);
                      return (
                        <React.Fragment key={idx}>
                          {segments.map((seg, sIdx) => {
                            if (seg === '<n>') {
                              inTag = true;
                              return <Text key={sIdx}>{"\n"}</Text>;
                            }
                            if (seg === '</n>') {
                              inTag = false;
                              return <Text key={sIdx}>{"\n"}</Text>;
                            }
                            if (seg === '<pb>' || seg === '</pb>') {
                              // page break: just add a line break, no style change
                              return <Text key={sIdx}>{"\n"}</Text>;
                            }
                            if (!seg) return null;

                            return (
                              <Text
                                key={sIdx}
                                style={{
                                  color: vWh[idx] || userTextColor || (inTag ? '#93c5fd' : '#cbd5e1'),
                                  fontWeight: inTag ? 'bold' : 'normal',
                                  fontStyle: inTag ? 'italic' : 'normal',
                                  fontSize: inTag ? globalSettings.fontSize * 0.85 : globalSettings.fontSize
                                }}
                              >
                                {seg}
                              </Text>
                            );
                          })}
                          <Text>{" "}</Text>
                        </React.Fragment>
                      );
                    });
                  })()}
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
                {(() => {
                  let inTag = false;
                  return (selectedVerse?.text.split(' ') || []).map((word, idx) => {
                    const segments = word.split(/(<n>|<\/n>|<pb>|<\/pb>)/g);
                    return (
                      <React.Fragment key={idx}>
                        {segments.map((seg, sIdx) => {
                          if (seg === '<n>') {
                            inTag = true;
                            return <Text key={sIdx}>{"\n"}</Text>;
                          }
                          if (seg === '</n>') {
                            inTag = false;
                            return <Text key={sIdx}>{"\n"}</Text>;
                          }
                          if (seg === '<pb>' || seg === '</pb>') {
                            return <Text key={sIdx}>{"\n"}</Text>;
                          }
                          if (!seg) return null;

                          return (
                            <Text
                              key={sIdx}
                              onPress={() => {
                                const newTemp = { ...tempWordHighlights };
                                if (newTemp[idx] === selectedWordColor) {
                                  delete newTemp[idx];
                                } else {
                                  newTemp[idx] = selectedWordColor;
                                }
                                setTempWordHighlights(newTemp);
                              }}
                              className={inTag ? "text-blue-300 font-bold italic" : ""}
                              style={{
                                color: tempWordHighlights[idx] || (inTag ? '#93c5fd' : '#cbd5e1'),
                                fontSize: inTag ? 20 : 22
                              }}
                            >
                              {seg}
                            </Text>
                          );
                        })}
                        <Text>{" "}</Text>
                      </React.Fragment>
                    );
                  });
                })()}
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

              <TouchableOpacity
                onPress={() => { setShowLangPicker(false); router.push({ pathname: '/bible/store' as any }); }}
                className="flex-row items-center bg-blue-600/20 border border-blue-600 p-4 rounded-2xl mb-6"
              >
                <Globe size={20} color="#3b82f6" className="mr-3" />
                <Text className="text-blue-400 font-bold">Gérer les versions (Store)</Text>
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
