import { loadDatabase } from '@/lib/database';
import { useSettings } from '@/lib/settings-context';
import { getAllVerseReferences, getVerseReferencesByCategory, VerseReference } from '@/lib/versets-data';
import { useRouter } from 'expo-router';
import { ArrowLeft, Heart, Share2 } from 'lucide-react-native';
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

export default function VersetsCategoriesPage() {
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [verses, setVerses] = useState<Array<VerseReference & { text?: string }>>([]);
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
              console.error(`Error loading verse ${reference.reference}:`, error);
              return {
                ...reference,
                text: 'Texte non trouvé'
              };
            }
          }
          return {
            ...reference,
            text: 'Texte non trouvé'
          };
        })
      );
      
      setVerses(versesWithContent);
    } catch (error) {
      console.error('Error loading verses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = (verse: VerseReference & { text?: string }) => {
    const verseText = verse.text || 'Texte du verset';
    const verseRef = verse.reference;
    
    router.push({
      pathname: '/share/verset',
      params: {
        verseText: encodeURIComponent(verseText),
        verseRef: encodeURIComponent(verseRef)
      }
    });
  };

  const handleBookmark = async (verse: VerseReference & { text?: string }) => {
    try {
      // Logique pour ajouter aux favoris (à implémenter)
      console.log('Bookmark verse:', verse);
    } catch (error) {
      console.error('Error bookmarking verse:', error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-slate-800 px-4 py-4 flex-row items-center">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mr-4"
        >
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1" style={{ fontFamily: 'Lexend_700Bold' }}>
          Versets par Catégories
        </Text>
      </View>

      {/* Categories */}
      <View className="bg-slate-700 px-1 py-4 border-b border-slate-600">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 mx-1 rounded-full ${selectedCategory === category.id ? category.color : 'bg-slate-600'}`}
            >
              <Text 
                className={`text-sm font-medium ${selectedCategory === category.id ? 'text-white' : 'text-slate-300'}`}
                style={{ fontFamily: 'Lexend_500Medium' }}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-4 py-6">
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-slate-400 mt-4" style={{ fontFamily: 'Lexend_400Regular' }}>
              Chargement des versets...
            </Text>
          </View>
        ) : verses.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-slate-400 text-center" style={{ fontFamily: 'Lexend_400Regular' }}>
              Aucun verset trouvé dans cette catégorie
            </Text>
          </View>
        ) : (
          <View className="space-y-12">
            {verses.map((verse, index) => (
              <View key={verse.id || index} className="bg-slate-800 rounded-xl p-5 my-2 shadow-sm border border-slate-700">
                {/* Category Badge */}
                <View className="flex-row items-center mb-4">
                  <View className={`px-3 py-1 rounded-full ${CATEGORIES.find(c => c.id === verse.category)?.color || 'bg-slate-500'}`}>
                    <Text className="text-white text-xs font-medium" style={{ fontFamily: 'Lexend_500Medium' }}>
                      {verse.category}
                    </Text>
                  </View>
                  <Text className="text-slate-400 text-xs ml-auto" style={{ fontFamily: 'Lexend_400Regular' }}>
                    {verse.reference}
                  </Text>
                </View>

                {/* Verse Text */}
                <Text 
                  className="text-slate-200 mb-5 leading-7" 
                  style={{ 
                    fontFamily: globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily,
                    fontSize: 16 * (globalSettings.fontSize / 18)
                  }}
                >
                  "{verse.text}"
                </Text>

                {/* Actions */}
                <View className="flex-row justify-end space-x-4">
                  <TouchableOpacity
                    onPress={() => handleShare(verse)}
                    className="p-3 rounded-lg"
                  >
                    <Share2 size={18} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleBookmark(verse)}
                    className="p-3 rounded-lg"
                  >
                    <Heart size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
