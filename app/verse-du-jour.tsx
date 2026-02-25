import { loadDatabase } from '@/lib/database';
import { useSettings } from '@/lib/settings-context';
import { getRandomVerseReference, VerseReference } from '@/lib/versets-data';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BookmarkPlus, Heart, RefreshCw, Share2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const loadVerseContent = async (lang: string, bookId: number, chapter: string, verse: string) => {
  try {
    const db = await loadDatabase('protestant.db', require('@/assets/bibles/protestant.db'), 'bibles');

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

export default function VerDuJourPage() {
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  const { bookId, chapter, verse, reference, category } = useLocalSearchParams();

  const [currentReference, setCurrentReference] = useState<VerseReference | null>(null);
  const [verseText, setVerseText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const loadNewVerse = async () => {
    try {
      setIsRefreshing(true);

      const randomReference = getRandomVerseReference();
      setCurrentReference(randomReference);

      if (randomReference.bookId && randomReference.chapter && randomReference.verse) {
        const verseContent = await loadVerseContent(
          globalSettings.bibleVersion,
          randomReference.bookId,
          randomReference.chapter.toString(),
          randomReference.verse.toString()
        );

        if (verseContent) {
          setVerseText(verseContent.text);
        } else {
          setVerseText('Verset non trouvé dans la base de données.');
        }
      } else {
        setVerseText('Référence incomplète.');
      }

      // Reset favorite/bookmark status for new verse
      setIsFavorite(false);
      setIsBookmarked(false);
    } catch (error) {
      console.error('Error loading verse:', error);
      setVerseText('Erreur lors du chargement du verset.');
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  const loadInitialVerse = async () => {
    try {
      setIsLoading(true);

      if (bookId && chapter && verse) {
        const ref: VerseReference = {
          id: 0,
          bookId: parseInt(bookId as string),
          chapter: parseInt(chapter as string),
          verse: parseInt(verse as string),
          reference: (reference as string) || '',
          category: (category as string) || '',
          bookName: ''
        };
        setCurrentReference(ref);

        const verseContent = await loadVerseContent(
          globalSettings.bibleVersion,
          ref.bookId,
          ref.chapter.toString(),
          ref.verse.toString()
        );

        if (verseContent) {
          setVerseText(verseContent.text);
        } else {
          setVerseText('Verset non trouvé.');
        }
        setIsLoading(false);
      } else {
        await loadNewVerse();
      }
    } catch (error) {
      console.error('Error loading initial verse:', error);
      await loadNewVerse();
    }
  };

  const checkStatus = async () => {
    if (!currentReference) return;
    try {
      const favs = await AsyncStorage.getItem('bible_favorites');
      const marks = await AsyncStorage.getItem('bible_bookmarks');

      const favorites = favs ? JSON.parse(favs) : [];
      const bookmarks = marks ? JSON.parse(marks) : [];

      const key = `${currentReference.bookId}-${currentReference.chapter}-${currentReference.verse}`;

      setIsFavorite(favorites.some((f: any) => f.key === key));
      setIsBookmarked(bookmarks.some((b: any) => b.key === key));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadInitialVerse();
  }, []);

  useEffect(() => {
    if (currentReference) {
      checkStatus();
    }
  }, [currentReference]);

  const toggleFavorite = async () => {
    if (!currentReference || !verseText) return;
    try {
      const key = `${currentReference.bookId}-${currentReference.chapter}-${currentReference.verse}`;
      const stored = await AsyncStorage.getItem('bible_favorites');
      let favorites = stored ? JSON.parse(stored) : [];

      if (isFavorite) {
        favorites = favorites.filter((f: any) => f.key !== key);
        setIsFavorite(false);
      } else {
        favorites.push({
          key,
          bookId: currentReference.bookId,
          chapter: currentReference.chapter,
          verse: currentReference.verse,
          reference: currentReference.reference,
          text: verseText,
          timestamp: Date.now()
        });
        setIsFavorite(true);
      }
      await AsyncStorage.setItem('bible_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleBookmark = async () => {
    if (!currentReference || !verseText) return;
    try {
      const key = `${currentReference.bookId}-${currentReference.chapter}-${currentReference.verse}`;
      const stored = await AsyncStorage.getItem('bible_bookmarks');
      let bookmarks = stored ? JSON.parse(stored) : [];

      if (isBookmarked) {
        bookmarks = bookmarks.filter((b: any) => b.key !== key);
        setIsBookmarked(false);
      } else {
        bookmarks.push({
          key,
          bookId: currentReference.bookId,
          chapter: currentReference.chapter,
          verse: currentReference.verse,
          reference: currentReference.reference,
          text: verseText,
          timestamp: Date.now()
        });
        setIsBookmarked(true);
      }
      await AsyncStorage.setItem('bible_bookmarks', JSON.stringify(bookmarks));
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = () => {
    if (currentReference && verseText) {
      router.push({
        pathname: '/share/verset',
        params: {
          verseText: encodeURIComponent(verseText),
          verseRef: encodeURIComponent(currentReference.reference)
        }
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Fanahy Masina':
        return 'bg-purple-500';
      case 'Vavaka':
        return 'bg-blue-500';
      case 'Herin\'Andriamanitra':
        return 'bg-orange-500';
      case 'Fitarihan\'Andriamanitra':
        return 'bg-green-500';
      case 'Fiovam-po':
        return 'bg-pink-500';
      case 'Famela-keloka':
        return 'bg-indigo-500';
      case 'Fandresena ny fahotana':
        return 'bg-red-500';
      case 'Fahasitranana':
        return 'bg-emerald-500';
      case 'Hery hanaovana ny sitrapony':
        return 'bg-cyan-500';
      case 'Maha-vavolombelona':
        return 'bg-yellow-600';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-dark">
        <StatusBar barStyle="light-content" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-lg">Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-4 py-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
        >
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1" style={{ fontFamily: 'Lexend_700Bold' }}>
          Verset du Jour
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/versets-categories')}
          className="ml-4 px-3 py-2 bg-slate-700 rounded-lg"
        >
          <Text className="text-white text-sm font-medium" style={{ fontFamily: 'Lexend_500Medium' }}>
            Catégories
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Verse Card */}
        <View className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-primary to-primary/80 mb-8 shadow-2xl shadow-primary/30">
          {/* Background Decorations */}
          <View className="absolute -top-16 -right-16 w-32 h-32 bg-white/10 rounded-full" />
          <View className="absolute -bottom-12 -left-12 w-24 h-24 bg-white/5 rounded-full" />
          <View className="absolute top-1/2 -right-8 w-16 h-16 bg-white/5 rounded-full" />

          <View className="p-8 relative z-10">
            {/* Category Badge */}
            {currentReference && (
              <View className="mb-6">
                <View className={`${getCategoryColor(currentReference.category)} px-4 py-2 rounded-full self-start`}>
                  <Text className="text-white text-xs font-bold uppercase tracking-wider">
                    {currentReference.category}
                  </Text>
                </View>
              </View>
            )}

            {/* Verse Text */}
            {currentReference ? (
              <View>
                <Text
                  className="text-white text-center leading-8 mb-6"
                  style={{
                    fontFamily: globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily,
                    fontSize: 20 * (globalSettings.fontSize / 18),
                    lineHeight: 32
                  }}
                >
                  {verseText}
                </Text>

                {/* Reference */}
                <View className="flex-row items-center">
                  <View className="h-[2px] w-8 bg-white/30 mr-3" />
                  <Text
                    className="text-white font-bold"
                    style={{ fontFamily: 'Lexend_700Bold', fontSize: 16 }}
                  >
                    {currentReference.reference}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="py-12 items-center">
                <Text className="text-white/60 font-bold">Chargement de la versé...</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View className="flex-row justify-between mb-4">
              <TouchableOpacity
                onPress={handleShare}
                className="w-14 h-14 rounded-full bg-white/20 items-center justify-center backdrop-blur-md"
              >
                <Share2 size={22} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleFavorite}
                className={`w-14 h-14 rounded-full items-center justify-center backdrop-blur-md ${isFavorite ? 'bg-red-500' : 'bg-white/20'}`}
              >
                <Heart size={22} color="white" fill={isFavorite ? "white" : "transparent"} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleBookmark}
                className={`w-14 h-14 rounded-full items-center justify-center backdrop-blur-md ${isBookmarked ? 'bg-blue-600' : 'bg-white/20'}`}
              >
                <BookmarkPlus size={22} color="white" fill={isBookmarked ? "white" : "transparent"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Refresh Button */}
        <TouchableOpacity
          onPress={loadNewVerse}
          disabled={isRefreshing}
          className={`w-full rounded-2xl bg-slate-800 p-4 mb-8 flex-row items-center justify-center ${isRefreshing ? 'opacity-50' : ''
            }`}
        >
          <RefreshCw
            size={20}
            color="#94a3b8"
            className={`mr-3 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <Text className="text-slate-300 font-bold text-base">
            {isRefreshing ? 'Chargement...' : 'Nouveau Verset'}
          </Text>
        </TouchableOpacity>

        {/* Inspiration Section */}
        <View className="mb-8">
          <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">
            Méditation
          </Text>
          <View className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <Text className="text-slate-300 leading-6" style={{ fontSize: 16 }}>
              Prenez un moment pour réfléchir à cette parole. Comment peut-elle s'appliquer à votre vie aujourd'hui ?
              Laissez cette vérité transformer votre cœur et vos pensées.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View className="items-center mb-8">
          <Text className="text-slate-600 text-sm">
            Versé du Jour • Adventools
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
