import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import { getRandomVerseReference, VerseReference } from '@/lib/versets-data';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BookmarkPlus, Heart, MessageSquare, RefreshCw, Share2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormattedBibleText } from '@/components/bible/formatted-text';
import { fetchVerseContentById } from '@/lib/bible';

export default function VerDuJourPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  const { bookId, chapter, verse, reference, category } = useLocalSearchParams();

  const [currentReference, setCurrentReference] = useState<VerseReference | null>(null);
  const [verseText, setVerseText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkComment, setBookmarkComment] = useState('');

  // Bookmark modal
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentText, setCommentText] = useState('');

  const loadNewVerse = async () => {
    try {
      setIsRefreshing(true);

      const randomReference = getRandomVerseReference();
      setCurrentReference(randomReference);

      if (randomReference.bookId && randomReference.chapter && randomReference.verse) {
        const verseContent = await fetchVerseContentById(
          globalSettings.bibleVersion,
          randomReference.bookId,
          randomReference.chapter.toString(),
          randomReference.verse.toString(),
          false
        );

        if (verseContent) {
          setVerseText(verseContent.text);
        } else {
          setVerseText(t('verse_not_found_db'));
        }
      } else {
        setVerseText(t('verse_incomplete'));
      }

      // Reset status for new verse
      setIsFavorite(false);
      setIsBookmarked(false);
      setBookmarkComment('');
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

        const verseContent = await fetchVerseContentById(
          globalSettings.bibleVersion,
          ref.bookId,
          ref.chapter.toString(),
          ref.verse.toString(),
          false
        );

        if (verseContent) {
          setVerseText(verseContent.text);
        } else {
          setVerseText(t('verse_not_found'));
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
      const [favs, marks] = await Promise.all([
        AsyncStorage.getItem('bible_favorites'),
        AsyncStorage.getItem('bible_bookmarks')
      ]);

      const favorites = favs ? JSON.parse(favs) : [];
      const bookmarks = marks ? JSON.parse(marks) : [];

      const key = `${currentReference.bookId}-${currentReference.chapter}-${currentReference.verse}`;

      setIsFavorite(favorites.some((f: any) => f.key === key));

      const bookmark = bookmarks.find((b: any) => b.key === key);
      setIsBookmarked(!!bookmark);
      setBookmarkComment(bookmark?.comment || '');
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
          category: currentReference.category || '',
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

  const openBookmarkModal = async () => {
    if (!currentReference || !verseText) return;
    if (isBookmarked) {
      // Load existing comment
      const stored = await AsyncStorage.getItem('bible_bookmarks');
      const bookmarks = stored ? JSON.parse(stored) : [];
      const key = `${currentReference.bookId}-${currentReference.chapter}-${currentReference.verse}`;
      const existing = bookmarks.find((b: any) => b.key === key);
      setCommentText(existing?.comment || '');
    } else {
      setCommentText('');
    }
    setCommentModalVisible(true);
  };

  const saveBookmark = async () => {
    if (!currentReference || !verseText) return;
    try {
      const key = `${currentReference.bookId}-${currentReference.chapter}-${currentReference.verse}`;
      const stored = await AsyncStorage.getItem('bible_bookmarks');
      let bookmarks = stored ? JSON.parse(stored) : [];

      // Remove existing to update
      bookmarks = bookmarks.filter((b: any) => b.key !== key);

      bookmarks.push({
        key,
        bookId: currentReference.bookId,
        chapter: currentReference.chapter,
        verse: currentReference.verse,
        reference: currentReference.reference,
        category: currentReference.category || '',
        text: verseText,
        comment: commentText.trim(),
        timestamp: Date.now()
      });

      await AsyncStorage.setItem('bible_bookmarks', JSON.stringify(bookmarks));
      setIsBookmarked(true);
      setBookmarkComment(commentText.trim());
      setCommentModalVisible(false);
    } catch (e) {
      console.error(e);
    }
  };

  const removeBookmark = async () => {
    if (!currentReference) return;
    try {
      const key = `${currentReference.bookId}-${currentReference.chapter}-${currentReference.verse}`;
      const stored = await AsyncStorage.getItem('bible_bookmarks');
      let bookmarks = stored ? JSON.parse(stored) : [];
      bookmarks = bookmarks.filter((b: any) => b.key !== key);

      await AsyncStorage.setItem('bible_bookmarks', JSON.stringify(bookmarks));
      setIsBookmarked(false);
      setBookmarkComment('');
      setCommentModalVisible(false);
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

  const CATEGORY_MAP: Record<string, { key: string; color: string }> = {
    'Fanahy Masina': { key: 'cat_fanahy_masina', color: 'bg-purple-500' },
    'Vavaka': { key: 'cat_vavaka', color: 'bg-blue-500' },
    "Herin'Andriamanitra": { key: 'cat_herin_andriamanitra', color: 'bg-orange-500' },
    "Fitarihan'Andriamanitra": { key: 'cat_fitarihan_andriamanitra', color: 'bg-green-500' },
    'Fiovam-po': { key: 'cat_fiovam_po', color: 'bg-pink-500' },
    'Famela-keloka': { key: 'cat_famela_keloka', color: 'bg-indigo-500' },
    'Fandresena ny fahotana': { key: 'cat_fandresena_ny_fahotana', color: 'bg-red-500' },
    'Fahasitranana': { key: 'cat_fahasitranana', color: 'bg-emerald-500' },
    'Hery hanaovana ny sitrapony': { key: 'cat_hery_hanaovana', color: 'bg-cyan-500' },
    'Maha-vavolombelona': { key: 'cat_maha_vavolombelona', color: 'bg-yellow-600' },
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-dark">
        <StatusBar barStyle="light-content" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-lg">{t('loading')}</Text>
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
          {t('verse_of_the_day')}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/versets-categories')}
          className="ml-4 px-3 py-2 bg-slate-700 rounded-lg"
        >
          <Text className="text-white text-sm font-medium" style={{ fontFamily: 'Lexend_500Medium' }}>
            {t('categories')}
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
                <View className={`${CATEGORY_MAP[currentReference.category]?.color || 'bg-gray-500'} px-4 py-2 rounded-full self-start`}>
                  <Text className="text-white text-xs font-bold uppercase tracking-wider">
                    {CATEGORY_MAP[currentReference.category]
                      ? t(CATEGORY_MAP[currentReference.category].key as any)
                      : currentReference.category}
                  </Text>
                </View>
              </View>
            )}

            {/* Verse Text */}
            {currentReference ? (
              <View>
                  <FormattedBibleText 
                    text={verseText}
                    baseFontSize={20 * (globalSettings.fontSize / 18)}
                    baseColor="white"
                    style={{
                      fontFamily: globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily,
                      textAlign: 'center',
                      lineHeight: 32
                    }}
                  />

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
                <Text className="text-white/60 font-bold">{t('verse_loading')}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View className="flex-row justify-between mt-6">
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
                onPress={openBookmarkModal}
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
            {isRefreshing ? t('loading') : t('new_verse')}
          </Text>
        </TouchableOpacity>

        {/* Meditation / Personal Comment Section */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4">
            <MessageSquare size={14} color="#64748b" />
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest ml-2">
              {t('meditation')}
            </Text>
          </View>

          {bookmarkComment ? (
            // Show personal comment if bookmarked
            <TouchableOpacity onPress={openBookmarkModal} activeOpacity={0.8}>
              <View className="bg-blue-500/10 rounded-2xl p-6 border border-blue-500/20">
                <Text className="text-slate-200 leading-6" style={{ fontSize: 16 }}>
                  {bookmarkComment}
                </Text>
                <Text className="text-blue-400 text-xs mt-3 italic">{t('edit' as any)} →</Text>
              </View>
            </TouchableOpacity>
          ) : (
            // Show default meditation text
            <View className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <Text className="text-slate-300 leading-6" style={{ fontSize: 16 }}>
                {t('meditation_intro')}
              </Text>
              {/* Hint to bookmark for personal notes */}
              <TouchableOpacity onPress={openBookmarkModal} className="mt-4 flex-row items-center">
                <BookmarkPlus size={14} color="#3b82f6" />
                <Text className="text-blue-400 text-xs ml-2">{t('note_content_placeholder')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Footer */}
        <View className="items-center mb-8">
          <Text className="text-slate-600 text-sm">
            {t('verse_of_day_footer')}
          </Text>
        </View>
      </ScrollView>

      {/* Bookmark Comment Modal */}
      <Modal visible={commentModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center px-6">
          <View className="bg-slate-900 border border-slate-800 rounded-[32px] p-6">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <BookmarkPlus size={20} color="#3b82f6" />
                <Text className="text-white font-bold text-lg ml-2" style={{ fontFamily: 'Lexend_700Bold' }}>
                  {t('meditation')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)} className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center">
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {currentReference && (
              <View className="bg-slate-800 rounded-2xl p-3 mb-4">
                <Text className="text-slate-400 text-xs" style={{ fontFamily: 'Lexend_400Regular' }}>{currentReference.reference}</Text>
                <Text className="text-slate-300 text-sm mt-1" numberOfLines={2}>{verseText}</Text>
              </View>
            )}

            <TextInput
              className="bg-slate-800 border border-slate-700 p-4 rounded-2xl text-white mb-4"
              value={commentText}
              onChangeText={setCommentText}
              placeholder={t('note_content_placeholder')}
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 120, fontFamily: 'Lexend_400Regular' }}
              autoFocus
            />

            <View className="flex-row gap-3">
              {isBookmarked && (
                <TouchableOpacity onPress={removeBookmark} className="flex-1 p-4 rounded-2xl border border-red-500/30 bg-red-500/10 items-center">
                  <Text className="text-red-400 font-medium">{t('delete')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={saveBookmark} className="flex-1 p-4 rounded-2xl bg-primary items-center">
                <Text className="text-white font-bold">{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
