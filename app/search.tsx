import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Search as SearchIcon, X, StickyNote, BookOpen, ChevronRight, History } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import { initUserStorage } from '@/lib/user-storage';
import { decryptData } from '@/lib/security';
import * as FileSystem from 'expo-file-system/legacy';
import { cleanSspmMarkdown } from '@/lib/utils';

const OFFLINE_LESSONS_PREFIX = "adventools_ss_offline_";
const LESSONS_DIR = `${FileSystem.documentDirectory}ss_offline/`;

interface SearchResult {
  id: string;
  type: 'note' | 'lesson';
  title: string;
  subtitle: string;
  excerpt: string;
  params: any;
}

export default function SearchScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();
  const { settings: globalSettings } = useSettings();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

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

  const normalizeText = (text: string) => {
    return text ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
  };

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
            subtitle: t('personal_note') || 'Note Personnelle',
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
                    subtitle: `${t('lesson')} • ${cleanSspmMarkdown(lessonTitle)}`,
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
      
      {/* Header / Search Bar */}
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
            style={{ fontFamily: 'Lexend_400Regular' }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={18} color="#475569" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-slate-500 mt-4">Recherche en cours...</Text>
          </View>
        ) : query.length < 2 ? (
          <View className="py-20 items-center opacity-20">
            <SearchIcon size={80} color="#94a3b8" />
            <Text className="text-white font-bold text-xl mt-6 text-center">{t('what_are_you_looking_for')}</Text>
            <View className="bg-white/5 rounded-2xl p-5 mt-4 border border-white/5">
              <Text className="text-slate-400 text-center leading-6 mb-2">{t('global_search_scope')}</Text>
              <View className="flex-row items-center justify-center mt-2">
                <StickyNote size={14} color="#10b981" className="mr-2" />
                <Text className="text-slate-300 font-bold">{t('personal_notes') || "Vos notes personnelles"}</Text>
              </View>
              <View className="flex-row items-center justify-center mt-3">
                <BookOpen size={14} color="#3b82f6" className="mr-2" />
                <Text className="text-slate-300 font-bold">{t('sabbath_school_lessons') || "Les leçons de l'École du Sabbat"}</Text>
              </View>
            </View>
          </View>
        ) : results.length > 0 ? (
          <View>
            <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">{results.length} Résultats trouvés</Text>
            {results.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  if (item.type === 'note') {
                    router.push({ pathname: '/notes', params: item.params });
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
                className="bg-slate-900/50 border border-white/5 rounded-[28px] p-5 mb-4 flex-row items-center"
              >
                <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${item.type === 'note' ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                  {item.type === 'note' ? <StickyNote size={22} color="#10b981" /> : <BookOpen size={22} color="#3b82f6" />}
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-base mb-1" numberOfLines={1}>{item.title}</Text>
                  <Text className="text-slate-500 text-[10px] uppercase font-bold mb-2">{item.subtitle}</Text>
                  <Text className="text-slate-400 text-xs leading-5" numberOfLines={2}>{item.excerpt}</Text>
                </View>
                <ChevronRight size={18} color="#334155" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="py-20 items-center opacity-40">
            <X size={60} color="#94a3b8" />
            <Text className="text-white font-bold text-lg mt-4">Aucun résultat</Text>
            <Text className="text-slate-500 text-center mt-2">Nous n'avons rien trouvé pour "{query}".</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
