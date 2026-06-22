import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Search as SearchIcon, X, StickyNote, BookOpen, ChevronRight, ChevronDown, History, Music } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import { initUserStorage } from '@/lib/user-storage';
import { decryptData } from '@/lib/security';
import * as FileSystem from 'expo-file-system/legacy';
import { cleanSspmMarkdown } from '@/lib/utils';
import { AppText as Text } from '@/components/ui/AppText';
import { loadDatabase } from '@/lib/database';
import { HYMNE_SOURCES } from '@/lib/hymnes';
import { getAvailableBibles, DB_SOURCES, checkAndDownloadBible } from '@/lib/bible';


const OFFLINE_LESSONS_PREFIX = "adventools_ss_offline_";
const LESSONS_DIR = `${FileSystem.documentDirectory}ss_offline/`;
const RECENT_SEARCHES_KEY = 'adventools_recent_searches';
const MAX_RECENT = 8;

interface SearchResult {
  id: string;
  type: 'note' | 'lesson' | 'hymn' | 'bible';
  title: string;
  subtitle: string;
  excerpt: string;
  params: any;
}

// Accent/case-insensitive normalization (matches the search comparison).
const normalize = (text: string) =>
  text ? text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase() : '';

/**
 * Finds the [start, end) range of the first occurrence of `rawQuery` inside
 * `text`, comparing accent/case-insensitively while returning indices into the
 * ORIGINAL text (so highlighting keeps the original accents). Returns null if
 * there is no match.
 */
const findMatchRange = (text: string, rawQuery: string): [number, number] | null => {
  const q = normalize(rawQuery);
  if (!q || !text) return null;
  let normStr = '';
  const map: number[] = []; // map[normIndex] -> original index
  for (let i = 0; i < text.length; i++) {
    const nc = normalize(text[i]);
    for (let k = 0; k < nc.length; k++) { normStr += nc[k]; map.push(i); }
  }
  const idx = normStr.indexOf(q);
  if (idx === -1) return null;
  return [map[idx], map[idx + q.length - 1] + 1];
};

/** Renders `text` with the first match of `query` highlighted in blue. */
const HighlightedText = ({ text, query, className, numberOfLines }: { text: string; query: string; className?: string; numberOfLines?: number }) => {
  const range = findMatchRange(text, query);
  if (!range) {
    return <Text className={className} numberOfLines={numberOfLines}>{text}</Text>;
  }
  const [s, e] = range;
  return (
    <Text className={className} numberOfLines={numberOfLines}>
      {text.slice(0, s)}
      <Text style={{ color: '#3b82f6', fontFamily: 'Lexend_700Bold' }}>{text.slice(s, e)}</Text>
      {text.slice(e)}
    </Text>
  );
};

export default function SearchScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();
  const { settings: globalSettings } = useSettings();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    note: true,
    lesson: true,
    hymn: true,
    bible: true
  });

  useEffect(() => {
    // Perform search after a small debounce
    const delayDebounceFn = setTimeout(() => {
      if (query.length >= 2) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Load recent searches once on mount.
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) setRecentSearches(JSON.parse(stored));
      } catch (e) { /* non-blocking */ }
    })();
  }, []);

  // Persist a term to the recent-searches list (most recent first, deduped).
  const saveRecentSearch = async (term: string) => {
    const cleaned = term.trim();
    if (cleaned.length < 2) return;
    const next = [cleaned, ...recentSearches.filter(s => normalize(s) !== normalize(cleaned))].slice(0, MAX_RECENT);
    setRecentSearches(next);
    try { await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)); } catch (e) { /* non-blocking */ }
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    try { await AsyncStorage.removeItem(RECENT_SEARCHES_KEY); } catch (e) { /* non-blocking */ }
  };

  const normalizeText = (text: string) => {
    return text ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
  };

  // Escape SQL LIKE wildcards (% and _) so typing them searches literally
  // instead of matching everything. Used together with `ESCAPE '\'` in queries.
  const escapeLike = (text: string) =>
    text.replace(/[\\%_]/g, (c) => `\\${c}`);

  const performSearch = async (searchTerm: string) => {
    setLoading(true);
    const allResults: SearchResult[] = [];
    const lowerQuery = normalizeText(searchTerm);

    try {
      // 1. Search in Notes (SQLite)
      // Since content is encrypted, we MUST fetch all notes and decrypt them in JS to search.
      const db = await initUserStorage();
      const notes: any[] = await db.getAllAsync('SELECT * FROM notes');

      for (const note of notes) {
        const decryptedContent = note.content ? decryptData(note.content) : '';
        const normTitle = normalizeText(note.title);
        const normContent = normalizeText(decryptedContent);
        
        if (normTitle.includes(lowerQuery) || normContent.includes(lowerQuery)) {
          allResults.push({
            id: note.id,
            type: 'note',
            title: note.title || t('untitled_note'),
            subtitle: t('personal_note' as any) || 'Note Personnelle',
            excerpt: getExcerpt(decryptedContent, lowerQuery),
            params: { id: note.id }
          });
        }
      }

      // 2. Search in Offline Lessons (FileSystem)
      const dirInfo = await FileSystem.getInfoAsync(LESSONS_DIR);
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(LESSONS_DIR);
        const lessonFiles = files.filter(f => f.startsWith(OFFLINE_LESSONS_PREFIX) && f.endsWith('.json'));

        for (const fileName of lessonFiles) {
          try {
            const content = await FileSystem.readAsStringAsync(`${LESSONS_DIR}${fileName}`);
            const lessonJson = JSON.parse(content);
            
            // Check title
            const lessonTitle = lessonJson.title || '';
            let foundInLesson = false;

            // Search in segments
            if (lessonJson.segments) {
              for (const segment of lessonJson.segments) {
                const segmentTitle = segment.title || '';
                let segmentContent = '';
                
                if (segment.blocks) {
                  segmentContent = segment.blocks.map((b: any) => b.markdown || '').join(' ');
                }

                if (normalizeText(lessonTitle).includes(lowerQuery) || 
                    normalizeText(segmentTitle).includes(lowerQuery) || 
                    normalizeText(segmentContent).includes(lowerQuery)) {
                  
                  const quarterlyId = fileName.split('_')[4] || ''; // Rough extraction
                  
                  allResults.push({
                    id: `${lessonJson.id}_${segment.id}`,
                    type: 'lesson',
                    title: cleanSspmMarkdown(segmentTitle),
                    subtitle: `${t('lesson' as any)} • ${cleanSspmMarkdown(lessonTitle)}`,
                    excerpt: getExcerpt(segmentContent, lowerQuery),
                    params: { 
                      quarterlyId: quarterlyId, 
                      lessonId: lessonJson.id 
                    }
                  });
                  foundInLesson = true;
                  break; // Only one result per file to avoid noise
                }
              }
            }
          } catch (e) {
            console.error("Error reading lesson file for search", fileName, e);
          }
        }
      }

      // 3. Search in Cantiques (Hymns)
      try {
        const dbHymnes = await loadDatabase('cantique.db', HYMNE_SOURCES['cantique.db'], 'hymnes');
        const likeTerm = `%${escapeLike(searchTerm)}%`;
        const hymns: any[] = await dbHymnes.getAllAsync("SELECT id, c_title, c_num, c_categories, c_content FROM adventiste_cantique WHERE c_title LIKE ? ESCAPE '\\' OR c_content LIKE ? ESCAPE '\\' LIMIT 10", [likeTerm, likeTerm]);
        for (const hymn of hymns) {
          allResults.push({
            id: `hymn_${hymn.id}`,
            type: 'hymn',
            title: `${hymn.c_num} - ${hymn.c_title}`,
            subtitle: t('hymns') || 'Cantiques',
            excerpt: getExcerpt(hymn.c_content || '', lowerQuery),
            params: { id: hymn.id, db: 'cantique.db' }
          });
        }
      } catch(e) { console.error("Search Hymn error", e); }

      // 4. Search in Bible
      try {
        const bibles = await getAvailableBibles();
        const config = bibles.find(b => b.id === globalSettings.bibleVersion) || bibles[0];
        if (config) {
          await checkAndDownloadBible(config);
          const dbBible = await loadDatabase(config.file, DB_SOURCES[config.file], 'bibles');
          const tables: any = await dbBible.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
          const isCloud = tables.some((t: any) => t.name === 'books');
          
          if (isCloud) {
            const queryBible = `
              SELECT book_number as bookId, chapter, verse, text, 
                    (SELECT long_name FROM books WHERE book_number = verses.book_number) as bookName
              FROM verses
              WHERE text LIKE ? ESCAPE '\\'
              LIMIT 15
            `;
            const verseResults: any[] = await dbBible.getAllAsync(queryBible, [`%${escapeLike(searchTerm)}%`]);
            for (const v of verseResults) {
              allResults.push({
                id: `bible_${v.bookId}_${v.chapter}_${v.verse}`,
                type: 'bible',
                title: `${v.bookName} ${v.chapter}:${v.verse}`,
                subtitle: t('bible') || 'Bible',
                excerpt: getExcerpt(v.text || '', lowerQuery),
                params: {
                  bookId: v.bookId,
                  bookName: v.bookName,
                  testament: v.bookId <= 39 ? 1 : 2,
                  chapter: v.chapter,
                  verse: v.verse,
                  lang: config.id
                }
              });
            }
          } else {
             const bookTable = tables.find((t: any) => t.name.endsWith("_boky"))?.name;
             const verseTable = tables.find((t: any) => t.name.endsWith("_andininy"))?.name;
             if (bookTable && verseTable) {
               const queryBible = `
                SELECT CAST(v.a_toko AS INTEGER) as chapter, v.a_and as verse, v.a_text as text, b.b_name as bookName, b.id as bookId, b.b_testid as testament
                FROM ${verseTable} v
                JOIN ${bookTable} b ON v.a_bid = b.id
                WHERE v.a_text LIKE ? ESCAPE '\\'
                LIMIT 15
              `;
              const verseResults: any[] = await dbBible.getAllAsync(queryBible, [`%${escapeLike(searchTerm)}%`]);
              for (const v of verseResults) {
                allResults.push({
                  id: `bible_${v.bookId}_${v.chapter}_${v.verse}`,
                  type: 'bible',
                  title: `${v.bookName} ${v.chapter}:${v.verse}`,
                  subtitle: t('bible') || 'Bible',
                  excerpt: getExcerpt(v.text || '', lowerQuery),
                  params: {
                    bookId: v.bookId,
                    bookName: v.bookName,
                    testament: v.testament,
                    chapter: v.chapter,
                    verse: v.verse,
                    lang: config.id
                  }
                });
              }
             }
          }
        }
      } catch(e) { console.error("Search Bible error", e); }

      setResults(allResults);
    } catch (e) {
      console.error("Search error", e);
    } finally {
      setLoading(false);
    }
  };

  const getExcerpt = (text: string, lowerQuery: string) => {
    const cleanText = cleanSspmMarkdown(text);
    const normText = normalizeText(cleanText);
    const index = normText.indexOf(lowerQuery);
    if (index === -1) return cleanText.substring(0, 100) + '...';
    
    const start = Math.max(0, index - 40);
    const end = Math.min(cleanText.length, index + 60);
    return (start > 0 ? '...' : '') + cleanText.substring(start, end).trim() + (end < cleanText.length ? '...' : '');
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />
      
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="px-6 py-4 flex-row items-center gap-4 border-b border-white/5">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
          >
            <ArrowLeft size={20} color="#94a3b8" />
          </TouchableOpacity>
          
          <View className="flex-1 flex-row items-center bg-white/5 rounded-2xl px-4 h-12 border border-white/10">
            <SearchIcon size={18} color="#475569" />
            <TextInput
              placeholder={t('search_placeholder')}
              placeholderTextColor="#475569"
              className="flex-1 ml-3 text-white text-base"
              autoFocus
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => saveRecentSearch(query)}
              returnKeyType="search"
              style={{ fontFamily: 'Lexend_400Regular' }}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <X size={18} color="#475569" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-slate-500 mt-4">Recherche en cours...</Text>
          </View>
        ) : query.length < 2 ? (
          <View>
            {recentSearches.length > 0 && (
              <View className="mb-8">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <History size={14} color="#94a3b8" />
                    <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">{t('recents')}</Text>
                  </View>
                  <TouchableOpacity onPress={clearRecentSearches} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text className="text-[11px] text-slate-500">Effacer</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <TouchableOpacity
                      key={term}
                      onPress={() => setQuery(term)}
                      className="flex-row items-center bg-white/5 border border-white/10 rounded-full px-4 py-2"
                    >
                      <History size={12} color="#475569" />
                      <Text className="text-slate-300 text-[12px] ml-2" style={{ fontFamily: 'Lexend_400Regular' }}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          <View className="py-12 items-center opacity-20">
            <SearchIcon size={80} color="#94a3b8" />
            <Text className="text-white font-bold text-xl mt-6 text-center">{t('what_are_you_looking_for')}</Text>
            <View className="bg-white/5 rounded-2xl p-5 mt-4 border border-white/5">
              <Text className="text-slate-400 text-center leading-6 mb-2">{t('global_search_scope') || "Cette recherche globale inclut :"}</Text>
              <View className="flex-row items-center mt-2">
                <StickyNote size={14} color="#10b981" className="mr-2" />
                <Text className="text-slate-300 font-bold">{t('personal_notes') || "Vos notes personnelles"}</Text>
              </View>
              <View className="flex-row items-center mt-3">
                <BookOpen size={14} color="#3b82f6" className="mr-2" />
                <Text className="text-slate-300 font-bold">{t('sabbath_school_lessons') || "Les leçons de l'École du Sabbat"}</Text>
              </View>
              <View className="flex-row items-center mt-3">
                <Music size={14} color="#ec4899" className="mr-2" />
                <Text className="text-slate-300 font-bold">{t('hymns') || "Cantiques"}</Text>
              </View>
              <View className="flex-row items-center mt-3">
                <BookOpen size={14} color="#6366f1" className="mr-2" />
                <Text className="text-slate-300 font-bold">{t('holy_bible') || "Bible"}</Text>
              </View>
            </View>
          </View>
          </View>
        ) : results.length > 0 ? (
          <View>
            <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">{results.length} Résultats trouvés</Text>
            
            {['note', 'lesson', 'hymn', 'bible'].map((type) => {
              const nq = normalize(query);
              // Relevance: results whose title matches the query rank first.
              const typeResults = results
                .filter(r => r.type === type)
                .sort((a, b) => (normalize(b.title).includes(nq) ? 1 : 0) - (normalize(a.title).includes(nq) ? 1 : 0));
              if (typeResults.length === 0) return null;

              const isExpanded = expandedGroups[type] ?? true;
              let groupTitle = '';
              let GroupIcon = BookOpen;
              let iconColor = '#3b82f6';

              if (type === 'note') {
                groupTitle = t('personal_notes') || "Notes Personnelles";
                GroupIcon = StickyNote;
                iconColor = '#10b981';
              } else if (type === 'lesson') {
                groupTitle = t('sabbath_school_lessons') || "École du Sabbat";
                GroupIcon = BookOpen;
                iconColor = '#3b82f6';
              } else if (type === 'hymn') {
                groupTitle = t('hymns') || "Cantiques";
                GroupIcon = Music;
                iconColor = '#ec4899';
              } else if (type === 'bible') {
                groupTitle = t('bible') || "Bible";
                GroupIcon = BookOpen;
                iconColor = '#6366f1';
              }

              return (
                <View key={type} className="mb-6">
                  <TouchableOpacity 
                    onPress={() => setExpandedGroups(prev => ({ ...prev, [type]: !isExpanded }))}
                    className="flex-row items-center justify-between bg-slate-900/80 px-4 py-3 rounded-2xl mb-3 border border-slate-800"
                  >
                    <View className="flex-row items-center">
                      <GroupIcon size={16} color={iconColor} className="mr-2" />
                      <Text className="text-white font-bold text-sm">{groupTitle} ({typeResults.length})</Text>
                    </View>
                    <View style={{ transform: [{ rotate: isExpanded ? '0deg' : '-90deg' }] }}>
                      <ChevronDown size={16} color="#94a3b8" />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && typeResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        saveRecentSearch(query);
                        if (item.type === 'note') {
                          router.push({ pathname: '/notes', params: item.params });
                        } else if (item.type === 'hymn') {
                          router.push({ pathname: '/hymnes/[id]', params: item.params });
                        } else if (item.type === 'bible') {
                          router.push({ pathname: '/bible/reader', params: item.params });
                        } else {
                          router.push({ 
                            pathname: '/utiles/lesona', 
                            params: { 
                              qId: item.params.quarterlyId, 
                              lId: item.params.lessonId 
                            } 
                          });
                        }
                      }}
                      className="bg-slate-900/30 border border-white/5 rounded-2xl p-4 mb-3 flex-row items-center ml-2"
                    >
                      <View className="flex-1 mr-3">
                        <HighlightedText text={item.title} query={query} className="text-white font-bold text-[13px] mb-1" numberOfLines={1} />
                        <HighlightedText text={item.excerpt} query={query} className="text-slate-400 text-[11px] leading-4" numberOfLines={2} />
                      </View>
                      <ChevronRight size={16} color="#334155" />
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
          </View>
        ) : (
          <View className="py-20 items-center opacity-40">
            <X size={60} color="#94a3b8" />
            <Text className="text-white font-bold text-lg mt-4">Aucun résultat</Text>
            <Text className="text-slate-500 text-center mt-2">Nous n'avons rien trouvé pour "{query}".</Text>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
