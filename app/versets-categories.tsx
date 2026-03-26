import { FormattedBibleText } from '@/components/bible/formatted-text';
import { fetchVerseContentById } from '@/lib/bible';
import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import { getAllVerseReferences, getVerseReferencesByCategory, VerseReference } from '@/lib/versets-data';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ArrowLeft, BookmarkPlus, Heart, MessageSquare, Share2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


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

export default function VersetsCategoriesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings: globalSettings } = useSettings();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [verses, setVerses] = useState<Array<VerseReference & { text?: string; comment?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const [bookmarkKeys, setBookmarkKeys] = useState<Set<string>>(new Set());

  // Comment modal state
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentVerse, setCommentVerse] = useState<(VerseReference & { text?: string }) | null>(null);
  const [isEditingComment, setIsEditingComment] = useState(false);

  useEffect(() => {
    loadStoredKeys();
  }, []);

  useEffect(() => {
    loadVerses();
  }, [selectedCategory, favoriteKeys, bookmarkKeys]);

  const loadStoredKeys = async () => {
    try {
      const [favStored, bmkStored] = await Promise.all([
        AsyncStorage.getItem('bible_favorites'),
        AsyncStorage.getItem('bible_bookmarks')
      ]);
      const favorites = favStored ? JSON.parse(favStored) : [];
      const bookmarks = bmkStored ? JSON.parse(bmkStored) : [];
      setFavoriteKeys(new Set(favorites.map((f: any) => f.key)));
      setBookmarkKeys(new Set(bookmarks.map((b: any) => b.key)));
    } catch (e) {
      console.error('Error loading stored keys:', e);
    }
  };

  const loadVerses = async () => {
    try {
      setIsLoading(true);

      let references: (VerseReference & { text?: string; comment?: string })[];

      if (selectedCategory === 'favorites') {
        const stored = await AsyncStorage.getItem('bible_favorites');
        const favorites = stored ? JSON.parse(stored) : [];
        references = favorites.map((f: any) => ({
          id: 0,
          bookId: f.bookId,
          chapter: f.chapter,
          verse: f.verse,
          reference: f.reference,
          category: f.category || '',
          bookName: f.bookName || '',
          text: f.text
        }));
        setVerses(references);
        setIsLoading(false);
        return;
      }

      if (selectedCategory === 'bookmarks') {
        const stored = await AsyncStorage.getItem('bible_bookmarks');
        const bookmarks = stored ? JSON.parse(stored) : [];
        references = bookmarks.map((b: any) => ({
          id: 0,
          bookId: b.bookId,
          chapter: b.chapter,
          verse: b.verse,
          reference: b.reference,
          category: b.category || '',
          bookName: b.bookName || '',
          text: b.text,
          comment: b.comment || ''
        }));
        setVerses(references);
        setIsLoading(false);
        return;
      }

      const rawRefs = selectedCategory === 'all'
        ? getAllVerseReferences()
        : getVerseReferencesByCategory(selectedCategory);

      setVerses(rawRefs);

      const versesWithContent = await Promise.all(
        rawRefs.map(async (reference: VerseReference) => {
          if (reference.bookId && reference.chapter && reference.verse) {
            try {
              const verseContent = await fetchVerseContentById(
                globalSettings.bibleVersion,
                reference.bookId,
                reference.chapter.toString(),
                reference.verse.toString(),
                false
              );
              return {
                ...reference,
                text: verseContent?.text || t('verse_not_found')
              };
            } catch (error) {
              return { ...reference, text: t('verse_not_found') };
            }
          }
          return { ...reference, text: t('verse_not_found') };
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
    router.push({
      pathname: '/share/verset',
      params: {
        verseText: encodeURIComponent(verse.text || ''),
        verseRef: encodeURIComponent(verse.reference)
      }
    });
  };

  // ===== FAVORITES =====
  const toggleFavorite = async (verse: VerseReference & { text?: string }) => {
    if (!verse.bookId || !verse.chapter || !verse.verse) return;
    try {
      const key = `${verse.bookId}-${verse.chapter}-${verse.verse}`;
      const stored = await AsyncStorage.getItem('bible_favorites');
      let favorites = stored ? JSON.parse(stored) : [];
      const isFav = favoriteKeys.has(key);

      if (isFav) {
        favorites = favorites.filter((f: any) => f.key !== key);
        const newKeys = new Set(favoriteKeys);
        newKeys.delete(key);
        setFavoriteKeys(newKeys);
      } else {
        favorites.push({
          key,
          bookId: verse.bookId,
          chapter: verse.chapter,
          verse: verse.verse,
          reference: verse.reference,
          category: verse.category || '',
          text: verse.text || '',
          timestamp: Date.now()
        });
        const newKeys = new Set(favoriteKeys);
        newKeys.add(key);
        setFavoriteKeys(newKeys);
      }

      await AsyncStorage.setItem('bible_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error('Error toggling favorite:', e);
    }
  };

  const isVerseFavorite = (verse: VerseReference) => {
    if (!verse.bookId || !verse.chapter || !verse.verse) return false;
    return favoriteKeys.has(`${verse.bookId}-${verse.chapter}-${verse.verse}`);
  };

  // ===== BOOKMARKS (with comments) =====
  const openBookmarkModal = async (verse: VerseReference & { text?: string }) => {
    if (!verse.bookId || !verse.chapter || !verse.verse) return;
    const key = `${verse.bookId}-${verse.chapter}-${verse.verse}`;
    const isAlreadyBookmarked = bookmarkKeys.has(key);

    if (isAlreadyBookmarked) {
      // Load existing comment for editing
      const stored = await AsyncStorage.getItem('bible_bookmarks');
      const bookmarks = stored ? JSON.parse(stored) : [];
      const existing = bookmarks.find((b: any) => b.key === key);
      setCommentText(existing?.comment || '');
      setIsEditingComment(true);
    } else {
      setCommentText('');
      setIsEditingComment(false);
    }

    setCommentVerse(verse);
    setCommentModalVisible(true);
  };

  const saveBookmark = async () => {
    if (!commentVerse || !commentVerse.bookId) return;
    try {
      const key = `${commentVerse.bookId}-${commentVerse.chapter}-${commentVerse.verse}`;
      const stored = await AsyncStorage.getItem('bible_bookmarks');
      let bookmarks = stored ? JSON.parse(stored) : [];

      // Remove if already existing (to update)
      bookmarks = bookmarks.filter((b: any) => b.key !== key);

      bookmarks.push({
        key,
        bookId: commentVerse.bookId,
        chapter: commentVerse.chapter,
        verse: commentVerse.verse,
        reference: commentVerse.reference,
        category: commentVerse.category || '',
        text: commentVerse.text || '',
        comment: commentText.trim(),
        timestamp: Date.now()
      });

      await AsyncStorage.setItem('bible_bookmarks', JSON.stringify(bookmarks));

      const newKeys = new Set(bookmarkKeys);
      newKeys.add(key);
      setBookmarkKeys(newKeys);

      setCommentModalVisible(false);
      setCommentVerse(null);
      setCommentText('');
    } catch (e) {
      console.error('Error saving bookmark:', e);
    }
  };

  const removeBookmark = async () => {
    if (!commentVerse || !commentVerse.bookId) return;
    try {
      const key = `${commentVerse.bookId}-${commentVerse.chapter}-${commentVerse.verse}`;
      const stored = await AsyncStorage.getItem('bible_bookmarks');
      let bookmarks = stored ? JSON.parse(stored) : [];
      bookmarks = bookmarks.filter((b: any) => b.key !== key);

      await AsyncStorage.setItem('bible_bookmarks', JSON.stringify(bookmarks));

      const newKeys = new Set(bookmarkKeys);
      newKeys.delete(key);
      setBookmarkKeys(newKeys);

      setCommentModalVisible(false);
      setCommentVerse(null);
      setCommentText('');
    } catch (e) {
      console.error('Error removing bookmark:', e);
    }
  };

  const isVerseBookmarked = (verse: VerseReference) => {
    if (!verse.bookId || !verse.chapter || !verse.verse) return false;
    return bookmarkKeys.has(`${verse.bookId}-${verse.chapter}-${verse.verse}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-4 py-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1" style={{ fontFamily: 'Lexend_700Bold' }}>
          {t('categories')}
        </Text>
      </View>

      {/* Categories */}
      <View className="px-1 py-4 border-b border-slate-600">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
          {/* Static special categories */}
          {[
            { id: 'all', name: t('categories'), color: 'bg-slate-500' },
            { id: 'favorites', name: `❤️ ${t('favorites')}`, color: 'bg-red-500' },
            { id: 'bookmarks', name: `📌 ${t('meditation')}`, color: 'bg-blue-500' },
          ].map((category) => (
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
          {/* Dynamic translated categories */}
          {Object.entries(CATEGORY_MAP).map(([id, { key, color }]) => (
            <TouchableOpacity
              key={id}
              onPress={() => setSelectedCategory(id)}
              className={`px-4 py-2 mx-1 rounded-full ${selectedCategory === id ? color : 'bg-slate-600'}`}
            >
              <Text
                className={`text-sm font-medium ${selectedCategory === id ? 'text-white' : 'text-slate-300'}`}
                style={{ fontFamily: 'Lexend_500Medium' }}
              >
                {t(key as any)}
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
              {t('loading')}
            </Text>
          </View>
        ) : verses.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-slate-400 text-center" style={{ fontFamily: 'Lexend_400Regular' }}>
              {(selectedCategory === 'favorites' || selectedCategory === 'bookmarks') ? t('no_results') : t('no_verse_found')}
            </Text>
          </View>
        ) : (
          <View className="space-y-12">
            {verses.map((verse, index) => {
              const isFav = isVerseFavorite(verse);
              const isBmk = isVerseBookmarked(verse);
              return (
                <View key={`${verse.bookId}-${verse.chapter}-${verse.verse}-${index}`} className="bg-slate-800 rounded-xl p-5 my-2 shadow-sm border border-slate-700">
                  {/* Category Badge */}
                  <View className="flex-row items-center mb-4">
                    <View className={`px-3 py-1 rounded-full ${CATEGORY_MAP[verse.category]?.color || 'bg-slate-500'}`}>
                      <Text className="text-white text-xs font-medium" style={{ fontFamily: 'Lexend_500Medium' }}>
                        {CATEGORY_MAP[verse.category] ? t(CATEGORY_MAP[verse.category].key as any) : verse.category}
                      </Text>
                    </View>
                    <Text className="text-slate-400 text-xs ml-auto" style={{ fontFamily: 'Lexend_400Regular' }}>
                      {verse.reference}
                    </Text>
                  </View>

                  {/* Verse Text */}
                  <FormattedBibleText 
                    text={verse.text || ''}
                    baseFontSize={16 * (globalSettings.fontSize / 18)}
                    baseColor="#e2e8f0"
                    style={{
                      fontFamily: globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily,
                      marginBottom: 12,
                      lineHeight: 28
                    }}
                  />

                  {/* Comment preview (for bookmarked verses) */}
                  {verse.comment ? (
                    <View className="bg-slate-700/40 border border-slate-700 rounded-xl p-3 mb-3">
                      <View className="flex-row items-center mb-1">
                        <MessageSquare size={12} color="#94a3b8" />
                        <Text className="text-slate-500 text-[10px] ml-1 uppercase font-bold tracking-wider">{t('meditation')}</Text>
                      </View>
                      <Text className="text-slate-300 text-sm leading-5">{verse.comment}</Text>
                    </View>
                  ) : null}

                  {/* Actions */}
                  <View className="flex-row justify-end gap-2">
                    <TouchableOpacity
                      onPress={() => handleShare(verse)}
                      className="p-3 rounded-xl bg-blue-500/10"
                    >
                      <Share2 size={18} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => toggleFavorite(verse)}
                      className={`p-3 rounded-xl ${isFav ? 'bg-red-500/20' : 'bg-slate-700/50'}`}
                    >
                      <Heart size={18} color="#ef4444" fill={isFav ? "#ef4444" : "transparent"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => openBookmarkModal(verse)}
                      className={`p-3 rounded-xl ${isBmk ? 'bg-blue-500/20' : 'bg-slate-700/50'}`}
                    >
                      <BookmarkPlus size={18} color="#3b82f6" fill={isBmk ? "#3b82f6" : "transparent"} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bookmark Comment Modal */}
      <Modal visible={commentModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center px-6">
          <View className="bg-slate-900 border border-slate-800 rounded-[32px] p-6">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <BookmarkPlus size={20} color="#3b82f6" />
                <Text className="text-white font-bold text-lg ml-2" style={{ fontFamily: 'Lexend_700Bold' }}>
                  {isEditingComment ? t('edit' as any) : t('meditation')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)} className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center">
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {commentVerse && (
              <View className="bg-slate-800 rounded-2xl p-3 mb-4">
                <Text className="text-slate-400 text-xs" style={{ fontFamily: 'Lexend_400Regular' }}>{commentVerse.reference}</Text>
                <Text className="text-slate-300 text-sm mt-1" numberOfLines={2}>{commentVerse.text}</Text>
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
              {isEditingComment && (
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
