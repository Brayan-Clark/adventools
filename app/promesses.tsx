import { loadDatabase } from '@/lib/database';
import { useSettings } from '@/lib/settings-context';
import { getAllVerseReferences, getVerseReferencesByCategory, VerseReference } from '@/lib/versets-data';
import { useRouter } from 'expo-router';
import { ArrowLeft, BookmarkPlus, Heart, Share2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const loadVerseContent = async (lang: string, bookId: number, chapter: string, verse: string) => {
  try {
    const db = await loadDatabase('protestant.db', require('@/assets/databases/protestant.db'));
    
    const tables: any[] = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
    const bookTable = tables.find((t: any) => t.name.endsWith("_boky"))?.name;
    const verseTable = tables.find((t: any) => t.name.endsWith("_andininy"))?.name;

    if (!bookTable || !verseTable) return null;

    const verseQuery = `
      SELECT a_and as verse, a_text as text, b_name as book, a_toko as chapter
      FROM ${verseTable}
      JOIN ${bookTable} ON ${verseTable}.a_bid = ${bookTable}.id
      WHERE ${verseTable}.a_bid = ? AND a_toko = ? AND a_and = ?
    `;

    const result: any = await db.getFirstAsync(verseQuery, [bookId, parseInt(chapter), parseInt(verse)]);
    if (!result) return null;

    return {
      text: result.text,
      book: result.book,
      bookId: bookId,
      chapter: parseInt(chapter),
      verses: verse
    };
  } catch (error) {
    console.error('Error loading verse content:', error);
    return null;
  }
};

const CATEGORIES = [
  { id: 'all', name: 'Toutes', color: 'bg-slate-500' },
  { id: 'Fanahy Masina', name: 'Fanahy Masina', color: 'bg-purple-500' },
  { id: 'Vavaka', name: 'Vavaka', color: 'bg-blue-500' },
  { id: "Herin'Andriamanitra", name: "Herin'Andriamanitra", color: 'bg-orange-500' },
  { id: "Fitarihan'Andriamanitra", name: "Fitarihan'Andriamanitra", color: 'bg-green-500' },
  { id: 'Fiovam-po', name: 'Fiovam-po', color: 'bg-pink-500' },
];

export default function PromessesPage() {
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [verses, setVerses] = useState<VerseReference[]>([]);
  const [versesWithText, setVersesWithText] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVerses();
  }, [selectedCategory]);

  const loadVerses = async () => {
    try {
      setIsLoading(true);
      
      // Obtenir les références selon la catégorie
      const references = selectedCategory === 'all' 
        ? getAllVerseReferences()
        : getVerseReferencesByCategory(selectedCategory);
      
      setVerses(references);
      
      // Récupérer le texte pour chaque référence
      const versesWithContent = await Promise.all(
        references.map(async (reference: VerseReference) => {
          if (reference.bookId && reference.chapter && reference.verse) {
            try {
              const verseContent = await loadVerseContent(
                globalSettings.bibleVersion,
                reference.bookId,
                reference.chapter.toString(),
                reference.verse.toString()
              );
              
              return {
                ...reference,
                text: verseContent?.text || 'Texte non trouvé'
              };
            } catch (error) {
              return {
                ...reference,
                text: 'Erreur de chargement'
              };
            }
          }
          return {
            ...reference,
            text: 'Référence incomplète'
          };
        })
      );
      
      setVersesWithText(versesWithContent);
    } catch (error) {
      console.error('Error loading verses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = (verse: any) => {
    const verseText = verse.text || 'Texte du verset';
    const verseRef = verse.reference || 'Référence';
    
    router.push({
      pathname: '/share/verset',
      params: {
        verseText: encodeURIComponent(verseText),
        verseRef: encodeURIComponent(verseRef)
      }
    });
  };

  const getCategoryColor = (category: string) => {
    const categoryObj = CATEGORIES.find(c => c.id === category);
    return categoryObj ? categoryObj.color : 'bg-gray-500';
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center"
        >
          <ArrowLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
        
        <Text className="text-xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>
          Promesses
        </Text>
        
        <View className="w-10" />
      </View>

      {/* Category Filters */}
      <View className="px-6 mb-6">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full mr-3 ${
                selectedCategory === category.id 
                  ? `${category.color} opacity-100` 
                  : 'bg-slate-800 opacity-60'
              }`}
            >
              <Text className={`text-xs font-bold uppercase tracking-wider ${
                selectedCategory === category.id ? 'text-white' : 'text-slate-400'
              }`}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Verses List */}
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator color="#3b82f6" size="large" />
            <Text className="text-slate-400 mt-4">Chargement des promesses...</Text>
          </View>
        ) : versesWithText.length > 0 ? (
          versesWithText.map((verse, index) => (
            <View 
              key={verse.id || index}
              className="relative overflow-hidden rounded-2xl bg-slate-800/50 mb-4 border border-slate-700"
            >
              {/* Category Badge */}
              <View className="absolute top-4 right-4">
                <View className={`${getCategoryColor(verse.category)} px-3 py-1 rounded-full`}>
                  <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
                    {verse.category}
                  </Text>
                </View>
              </View>

              <View className="p-6">
                {/* Verse Text */}
                <Text 
                  className="text-slate-200 leading-7 mb-4 pr-16" 
                  style={{
                    fontFamily: globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily,
                    fontSize: 16 * (globalSettings.fontSize / 18),
                    lineHeight: 28
                  }}
                >
                  "{verse.text}"
                </Text>
                
                {/* Reference */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="h-[1px] w-4 bg-slate-600 mr-2" />
                    <Text 
                      className="text-slate-400 font-bold text-sm" 
                      style={{ fontFamily: 'Lexend_700Bold' }}
                    >
                      {verse.reference}
                    </Text>
                  </View>
                  
                  {/* Action Buttons */}
                  <View className="flex-row items-center space-x-2">
                    <TouchableOpacity
                      onPress={() => handleShare(verse)}
                      className="w-8 h-8 rounded-full bg-slate-700 items-center justify-center"
                    >
                      <Share2 size={14} color="#94a3b8" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="w-8 h-8 rounded-full bg-slate-700 items-center justify-center"
                    >
                      <Heart size={14} color="#94a3b8" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="w-8 h-8 rounded-full bg-slate-700 items-center justify-center"
                    >
                      <BookmarkPlus size={14} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-slate-500 text-center">
              Aucune promesse trouvée dans cette catégorie
            </Text>
          </View>
        )}
        
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
