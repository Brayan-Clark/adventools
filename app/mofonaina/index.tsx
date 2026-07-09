import { Stack, router } from 'expo-router';
import { ChevronLeft, Calendar, Share2, WifiOff, RefreshCw, Bookmark, Heart, Clock, Volume2, Square, Edit, BookOpen } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View, Share, Alert, Image, ImageBackground, Dimensions, StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncMofonaina, getMofonainaForDate, Mofonaina, syncAllModules, getAllMofonainaForQuarter } from '../../lib/mofonaina';
import { BIBLE_REGEX, fetchVerseContent, getAvailableBibles } from '../../lib/bible';
import { useTranslation } from '../../lib/i18n';
import { useToast } from '../../lib/toast-context';
import { useSettings } from '../../lib/settings-context';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumDatePicker } from '@/components/ui/PremiumDatePicker';
import { AppText as Text } from '@/components/ui/AppText';


const { width, height } = Dimensions.get('window');

const FAVORITES_STORAGE_KEY = 'mofonaina_favorites';

export default function MofonainaScreen() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { settings: globalSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [mofonaina, setMofonaina] = useState<Mofonaina | null>(null);
  const [quarterList, setQuarterList] = useState<Mofonaina[]>([]);
  const [showQuarterModal, setShowQuarterModal] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sentenceHighlights, setSentenceHighlights] = useState<Record<string, string>>({});
  
  const [isHighlightModeActive, setIsHighlightModeActive] = useState(false);
  const [isHighlighterPanelExpanded, setIsHighlighterPanelExpanded] = useState(false);
  const [activeHighlightColor, setActiveHighlightColor] = useState('rgba(251, 191, 36, 0.35)');
  const [activeHighlightOpacity, setActiveHighlightOpacity] = useState(0.35);

  const updateHighlightColor = (rgb: string, opacity: number) => {
    setActiveHighlightColor(`rgba(${rgb}, ${opacity})`);
    setActiveHighlightOpacity(opacity);
  };

  // Track selected date
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading favorites", e);
    }
  };

  const loadHighlights = async (dateStr: string) => {
    try {
      const stored = await AsyncStorage.getItem(`mofonaina_sentence_highlights_${dateStr}`);
      if (stored) {
        setSentenceHighlights(JSON.parse(stored));
      } else {
        setSentenceHighlights({});
      }
    } catch (e) {
      console.error("Error loading highlights", e);
      setSentenceHighlights({});
    }
  };

  const handleSentencePress = async (sentKey: string) => {
    if (!isHighlightModeActive) return;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`;

    try {
      const newHighlights = { ...sentenceHighlights };
      if (newHighlights[sentKey]) {
        delete newHighlights[sentKey];
      } else {
        newHighlights[sentKey] = activeHighlightColor;
      }
      setSentenceHighlights(newHighlights);
      await AsyncStorage.setItem(`mofonaina_sentence_highlights_${dateStr}`, JSON.stringify(newHighlights));
    } catch (e) {
      console.error("Error saving highlight", e);
    }
  };

  const splitIntoSentences = (text: string) => {
    // Improved regex that splits by sentences but preserves all characters including trailing quotes/parentheses
    return text.match(/[^.!?]+[.!?]+[\s"”’»>)]*|.+/g) || [text];
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const toggleFavorite = async () => {
    if (!mofonaina) return;
    
    // Normalize date string (YYYY-MM-DD)
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`;

    try {
      let newFavorites = [...favorites];
      if (favorites.includes(dateStr)) {
        newFavorites = newFavorites.filter(d => d !== dateStr);
      } else {
        newFavorites.push(dateStr);
      }
      setFavorites(newFavorites);
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (e) {
      console.error("Error saving favorite", e);
    }
  };

  const isFavorite = () => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`;
    return favorites.includes(dateStr);
  };

  const fetchMofonainaForDate = async (targetDate: Date) => {
    setLoading(true);
    try {
      const networkState = await NetInfo.fetch();
      setIsConnected(networkState.isConnected);

      await syncMofonaina(false);
      const data = await getMofonainaForDate(targetDate);
      
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;
      await loadHighlights(dateStr);

      setMofonaina(data);
      
      const allQ = await getAllMofonainaForQuarter();
      setQuarterList(allQ);
    } catch (error) {
      console.error('Failed to load mofonaina', error);
      setMofonaina(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setLoading(true);
    try {
      // Sync everything!
      await syncAllModules();
      
      const todayData = await getMofonainaForDate(currentDate);
      setMofonaina(todayData);
      setAlertConfig({
        visible: true,
        title: t('success'),
        message: t('sync_complete') || 'Mise à jour réussie',
        type: 'success'
      });
    } catch (e) {
      setAlertConfig({
        visible: true,
        title: t('error'),
        message: t('sync_failed') || 'Échec de la mise à jour',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMofonainaForDate(currentDate);
  }, [currentDate]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  };

  // Parse a scripture reference like "Estera 6" or "Estera 6:1" into book/chapter/verse.
  // Tries the Bible-aware regex first, then a tolerant fallback so Malagasy book
  // names still resolve (fetchVerseContent matches the book name with a LIKE query).
  const parseScriptureRef = (ref: string): { book: string; chapter: string; verse: string } | null => {
    BIBLE_REGEX.lastIndex = 0;
    const m = BIBLE_REGEX.exec(ref);
    if (m) {
      return { book: m[1], chapter: m[2], verse: (m[3] || '').trim().split(/[\s,;\-]/)[0] || '1' };
    }
    const fm = ref.trim().match(/^(.+?)\s+(\d+)(?::\s*(\d+))?/);
    if (fm) {
      return { book: fm[1].trim(), chapter: fm[2], verse: fm[3] || '1' };
    }
    return null;
  };

  const openChapterInBible = async () => {
    const ref = mofonaina?.toerana_soratra_masina;
    if (!ref) return;
    try {
      const parsed = parseScriptureRef(ref);
      if (!parsed) { showToast(`${t('no_verse_found')} ${ref}`, 'info'); return; }

      // The reference is in Malagasy, so prefer a Malagasy bible, then the user's
      // selected version, then whatever is installed.
      const bibles = await getAvailableBibles();
      const best = bibles.find(b => b.language?.toLowerCase() === 'malagasy')
        || bibles.find(b => b.id === globalSettings.bibleVersion)
        || bibles[0];
      if (!best) { showToast(t('db_not_found' as any), 'error'); return; }

      const res: any = await fetchVerseContent(best.id, parsed.book, parsed.chapter, '1', false);
      if (res && res.bookId) {
        router.push({
          pathname: '/bible/reader',
          params: {
            bookId: String(res.bookId),
            bookName: res.bookName || parsed.book,
            chapter: String(parsed.chapter),
            verse: String(parsed.verse),
            lang: best.id,
            testament: '1',
          },
        });
      } else {
        showToast(`${t('no_verse_found')} ${ref}`, 'info');
      }
    } catch (e) {
      showToast(t('error'), 'error');
    }
  };

  const shareMofonaina = async () => {
    if (!mofonaina) return;
    try {
      const textToShare = `${mofonaina.lohateny_andro}\n\n"${mofonaina.andininy_soratra_masina}"\n${mofonaina.toerana_soratra_masina}\n\n${mofonaina.mofon_aina}\n\nLoharano: ${mofonaina.loharano || ''}`;
      await Share.share({
        message: textToShare,
        title: 'Mofon\'aina'
      });
    } catch (error) {
      console.error(error);
    }
  };

  const transliterateMalagasyForFrenchTTS = (text: string) => {
    if (!text) return "";
    let phonetic = text.toLowerCase();
    
    // 1. Correction des lettres pour l'accentuation
    phonetic = phonetic.replace(/o/g, "ou");
    phonetic = phonetic.replace(/j/g, "dz");
    phonetic = phonetic.replace(/tr/g, "tch");
    phonetic = phonetic.replace(/dr/g, "dj");
    // Empêcher que le 's' entre deux voyelles ne devienne un son 'z'
    phonetic = phonetic.replace(/([aeiouy])s([aeiouy])/g, "$1ss$2");

    // 2. Ajustement de la Ponctuation et de l'Intonation
    // En malgache, l'intonation ne monte pas au milieu de la phrase. 
    // La voix française monte la voix aux virgules. On remplace donc la virgule par un point
    // pour forcer la voix à garder une intonation descendante/neutre.
    phonetic = phonetic.replace(/,/g, ".");
    
    // Pour prendre plus de temps après un vrai point (fin de phrase),
    // on ajoute des points de suspension pour forcer un silence plus long.
    phonetic = phonetic.replace(/\./g, ". ... ");

    return phonetic;
  };

  const toggleTTS = async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    
    if (mofonaina) {
      const textToRead = `${mofonaina.lohateny_andro}. ${mofonaina.andininy_soratra_masina}. ${mofonaina.toerana_soratra_masina}. ${mofonaina.mofon_aina}`;
      const phoneticText = transliterateMalagasyForFrenchTTS(textToRead);
      
      setIsSpeaking(true);
      Speech.speak(phoneticText, {
        language: 'fr-FR',
        pitch: 1.0,
        rate: 0.85, // Légèrement plus lent pour une meilleure diction
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
    }
  };

  // Ensure TTS stops when unmounting
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const formatDate = (date: Date) => {
    const localeMap: Record<string, string> = {
      'English': 'en-US',
      'Français': 'fr-FR',
      'Malagasy': 'mg-MG'
    };
    const locale = localeMap[globalSettings.language] || 'fr-FR';
    
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Font adjustments handled dynamically by AppText

  return (
    <View className="flex-1 bg-[#020617]">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <PremiumDatePicker
        visible={showDatePicker}
        currentDate={currentDate}
        favoriteDates={favorites}
        onClose={() => setShowDatePicker(false)}
        onSelect={(date) => {
          setCurrentDate(date);
          setShowDatePicker(false);
        }}
      />
      
      {/* Background Header Image */}
      <View className="absolute top-0 left-0 right-0 h-[45%]">
        <Image 
          source={require('../../assets/images/mofonaina_bg.jpg')} 
          className="w-full h-full"
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(2, 6, 23, 0.5)', '#020617']}
          className="absolute inset-0"
        />
      </View>

      {/* Floating Header */}
      <SafeAreaView edges={['top']} className="z-20">
        <View className="flex-row items-center justify-between px-6 py-2">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-black/30 border border-white/10 items-center justify-center backdrop-blur-md"
          >
            <ChevronLeft size={20} color="#f8fafc" />
          </TouchableOpacity>
          
          <View className="flex-row items-center gap-2">
            <TouchableOpacity 
              onPress={handleManualSync}
              disabled={loading}
              className="w-10 h-10 rounded-2xl bg-black/30 border border-white/10 items-center justify-center backdrop-blur-md"
            >
              <RefreshCw size={18} color={loading ? "#475569" : "#f8fafc"} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={toggleTTS}
              className={`w-10 h-10 rounded-2xl border items-center justify-center backdrop-blur-md relative ${isSpeaking ? 'bg-pink-500/20 border-pink-500/50' : 'bg-black/30 border-white/10'}`}
            >
              <View className="absolute -top-1 -right-1 bg-blue-500 rounded-full px-1 py-0.5 border border-slate-900 z-10">
                <Text className="text-[6px] font-black text-white">BETA</Text>
              </View>
              {isSpeaking ? (
                 <Square size={14} color="#ec4899" fill="#ec4899" />
              ) : (
                 <Volume2 size={18} color="#f8fafc" />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              className="w-10 h-10 rounded-2xl bg-black/30 border border-white/10 items-center justify-center backdrop-blur-md"
            >
              <Calendar size={18} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={shareMofonaina}
              className="w-10 h-10 rounded-2xl bg-black/30 border border-white/10 items-center justify-center backdrop-blur-md"
            >
              <Share2 size={18} color="#f8fafc" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: height * 0.15, paddingBottom: 60 }}
      >
        <View className="px-6">
          {/* Top Title Section */}
          <View className="mb-8">
            <Text className="text-white/60 text-[10px] font-bold uppercase tracking-[4px] mb-2">
              {t('daily_bread') || 'Mofon\'aina'}
            </Text>
            <Text className="text-white text-4xl font-bold leading-tight">
              {mofonaina ? mofonaina.lohateny_andro : formatDate(currentDate)}
            </Text>
            
            <View className="flex-row items-center mt-4 gap-4">
               <View className="flex-row items-center">
                  <Clock size={12} color="#94a3b8" />
                  <Text className="text-slate-400 text-[10px] ml-1.5 font-bold uppercase tracking-wider">
                    {formatDate(currentDate)}
                  </Text>
               </View>
               {isConnected === false && (
                  <View className="flex-row items-center">
                    <WifiOff size={12} color="#ef4444" />
                    <Text className="text-red-500 text-[10px] ml-1.5 font-bold uppercase tracking-wider">{t('check_connection')}</Text>
                  </View>
               )}
            </View>
          </View>

          {loading ? (
            <View className="items-center justify-center py-20 bg-slate-900/40 rounded-[40px] border border-white/5">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="text-slate-400 mt-4 font-medium">{t('loading')}...</Text>
            </View>
          ) : mofonaina ? (
            <View>
              {/* Verse Card */}
              <LinearGradient 
                colors={['rgba(59, 130, 246, 0.15)', 'rgba(30, 58, 138, 0.05)']}
                start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                className="rounded-[32px] border border-blue-500/20 p-6 mb-8 overflow-hidden relative"
              >
                 <View className="absolute -top-10 -right-10 opacity-5">
                    <BookOpen size={180} color="#3b82f6" />
                 </View>
                 <View className="w-12 h-12 rounded-2xl bg-blue-500/20 items-center justify-center mb-4 border border-blue-500/30">
                    <Bookmark size={24} color="#60a5fa" />
                 </View>
                 <Text className="text-blue-50 font-medium italic leading-relaxed mb-6 text-2xl tracking-wide shadow-sm">
                    "{mofonaina.andininy_soratra_masina}"
                 </Text>
                 <View className="flex-row items-center justify-between border-t border-blue-500/20 pt-4">
                    <TouchableOpacity className="flex-row items-center flex-1 mr-3 bg-blue-500/10 py-2.5 px-4 rounded-xl" onPress={openChapterInBible} activeOpacity={0.6}>
                       <BookOpen size={16} color="#60a5fa" />
                       <Text className="text-blue-300 font-bold ml-2 uppercase tracking-wider text-xs" numberOfLines={1}>
                          {mofonaina.toerana_soratra_masina}
                       </Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center w-11 h-11 bg-blue-500/10 rounded-xl justify-center" onPress={toggleFavorite}>
                       <Heart size={22} color={isFavorite() ? "#ec4899" : "#60a5fa"} fill={isFavorite() ? "#ec4899" : "transparent"} />
                    </TouchableOpacity>
                 </View>
              </LinearGradient>

              {/* Main Content Card */}
              <View className="bg-white/5 rounded-[40px] border border-white/5 p-8 mb-8">
                {mofonaina.mofon_aina.split('\n').filter(p => p.trim() !== '').map((paragraph, pIndex) => (
                  <Text key={`p_${pIndex}`} className="leading-[32px] text-justify text-lg mb-4 text-slate-200">
                    {splitIntoSentences(paragraph).map((sentence, sIndex) => {
                      const key = `p${pIndex}_s${sIndex}`;
                      const highlightColor = sentenceHighlights[key];
                      
                      return (
                        <Text 
                          key={key} 
                          onPress={() => handleSentencePress(key)}
                          suppressHighlighting={true}
                          style={highlightColor ? { backgroundColor: highlightColor, color: '#ffffff' } : undefined}
                        >
                          {sentence}
                        </Text>
                      );
                    })}
                  </Text>
                ))}

                {mofonaina.loharano && (
                  <View className="mt-8 pt-6 border-t border-white/5 flex-row items-center justify-between">
                    <View>
                      <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">{t('author')}</Text>
                      <Text className="text-white font-bold text-sm">{mofonaina.loharano}</Text>
                    </View>
                    <View className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
                       <Text className="text-white/20 font-bold text-xl">”</Text>
                    </View>
                  </View>
                )}
              </View>

               {/* Quarterly Info Footer */}
              <TouchableOpacity onPress={() => setShowQuarterModal(true)} activeOpacity={0.8} className="bg-slate-900/40 rounded-[32px] p-6 border border-white/5 flex-row items-center">
                 <View className="w-14 h-14 rounded-2xl bg-blue-500/20 items-center justify-center mr-5">
                    <Text className="text-primary font-bold text-lg">{mofonaina.telovolana.taona}</Text>
                 </View>
                 <View className="flex-1">
                   <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">{t('quarter_number')} {mofonaina.telovolana.laharana} • VOIR TOUT</Text>
                   <Text className="text-white font-bold text-sm leading-tight">{mofonaina.telovolana.lohateny_lehibe}</Text>
                 </View>
                 <ChevronLeft size={20} color="#64748b" style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center justify-center py-20 bg-slate-900/40 rounded-[40px] border border-white/5">
              <Text className="text-slate-400 font-medium">{t('no_content')}</Text>
              {new Date().toDateString() !== currentDate.toDateString() && (
                <TouchableOpacity onPress={() => setCurrentDate(new Date())} className="mt-6 bg-primary px-6 py-3 rounded-2xl">
                  <Text className="text-white font-bold">{t('read_today')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Highlighter Panel */}
      <View style={{ position: 'absolute', right: 20, bottom: 20, zIndex: 100, alignItems: 'flex-end' }}>
        {isHighlighterPanelExpanded && (
          <View className="bg-slate-950/95 border border-slate-800 rounded-3xl p-4 mb-3 shadow-2xl backdrop-blur-md items-center w-72">
            <Text className="text-white text-xs font-bold mb-3 uppercase tracking-wider">Style du surligneur</Text>
            
            {/* Colors */}
            <View className="flex-row justify-around w-full mb-4">
              {[
                { rgb: '251, 191, 36', bg: 'bg-amber-400' },
                { rgb: '52, 211, 153', bg: 'bg-emerald-400' },
                { rgb: '59, 130, 246', bg: 'bg-blue-400' },
                { rgb: '139, 92, 246', bg: 'bg-violet-400' },
                { rgb: '236, 72, 153', bg: 'bg-pink-400' },
              ].map((c) => {
                const isActive = activeHighlightColor.includes(c.rgb);
                return (
                  <TouchableOpacity
                    key={c.rgb}
                    onPress={() => updateHighlightColor(c.rgb, activeHighlightOpacity)}
                    className={`w-8 h-8 rounded-full ${c.bg} items-center justify-center border-2 ${isActive ? 'border-white' : 'border-transparent'}`}
                  />
                );
              })}
            </View>

            {/* Opacity Presets */}
            <Text className="text-slate-400 text-[10px] font-bold mb-2 uppercase tracking-tight">Transparence : {Math.round(activeHighlightOpacity * 100)}%</Text>
            <View className="flex-row justify-between w-full bg-slate-900 p-1 rounded-2xl border border-white/5">
              {[0.2, 0.4, 0.6, 0.8].map((op) => {
                const isActive = activeHighlightOpacity === op;
                const rgbStr = activeHighlightColor.match(/rgba?\((\d+,\s*\d+,\s*\d+)/)?.[1] || '251, 191, 36';
                return (
                  <TouchableOpacity
                    key={op}
                    onPress={() => updateHighlightColor(rgbStr, op)}
                    className={`flex-1 py-1 rounded-xl items-center justify-center ${isActive ? 'bg-primary' : 'bg-transparent'}`}
                  >
                    <Text className={`font-bold text-[10px] ${isActive ? 'text-white' : 'text-slate-400'}`}>{op * 100}%</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Glowing Float Highlighter Toggle Button */}
        <TouchableOpacity
          onPress={() => {
            setIsHighlightModeActive(!isHighlightModeActive);
            setIsHighlighterPanelExpanded(!isHighlightModeActive);
          }}
          className={`w-14 h-14 rounded-full items-center justify-center shadow-lg border-2 ${
            isHighlightModeActive ? 'bg-amber-500 border-amber-300 shadow-amber-500/50' : 'bg-slate-800 border-slate-700 shadow-black/50'
          }`}
        >
          <Edit size={24} color={isHighlightModeActive ? '#ffffff' : '#94a3b8'} />
        </TouchableOpacity>
      </View>

      {/* Quarter List Modal */}
      <Modal visible={showQuarterModal} animationType="slide" transparent={true} onRequestClose={() => setShowQuarterModal(false)}>
        <View className="flex-1 bg-[#020617]/95 backdrop-blur-xl">
          <SafeAreaView className="flex-1">
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/10">
              <Text className="text-white font-bold text-lg">Liste du Trimestre</Text>
              <TouchableOpacity onPress={() => setShowQuarterModal(false)} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
                <ChevronLeft size={20} color="#f8fafc" style={{ transform: [{ rotate: '-90deg' }] }} />
              </TouchableOpacity>
            </View>
            <ScrollView className="flex-1 px-4 pt-4">
              {quarterList.map((item, index) => {
                const itemDate = new Date(item.daty);
                const isSelected = item.daty === mofonaina?.daty;
                return (
                  <TouchableOpacity
                    key={`q_item_${index}`}
                    onPress={() => {
                      setCurrentDate(itemDate);
                      setShowQuarterModal(false);
                    }}
                    className={`mb-3 p-4 rounded-2xl border ${isSelected ? 'bg-primary/20 border-primary/50' : 'bg-slate-900 border-white/5'} flex-row items-center`}
                  >
                    <View className="w-12 h-12 rounded-xl bg-black/30 items-center justify-center mr-4">
                      <Text className="text-white font-bold text-lg">{itemDate.getDate()}</Text>
                      <Text className="text-slate-400 text-[10px] uppercase">{itemDate.toLocaleString('fr-FR', { month: 'short' })}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className={`font-bold text-sm mb-1 ${isSelected ? 'text-primary' : 'text-white'}`} numberOfLines={1}>{item.lohateny_andro}</Text>
                      <Text className="text-slate-400 text-xs italic" numberOfLines={1}>{item.toerana_soratra_masina}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View className="h-10" />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

    </View>
  );
}
