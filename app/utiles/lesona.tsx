import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Download,
  RefreshCw,
  Share,
  Trash2,
  X
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Share as RNShare,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE = "https://inverse.sspmadventist.org/api/v3/mg/ss";
const WEB_BASE = "https://inverse.sspmadventist.org/mg";
const STORAGE_KEY = "adventools_ss_data";
const OFFLINE_LESSONS_PREFIX = "adventools_ss_offline_";

const parseDate = (dStr: string) => {
  if (!dStr) return new Date(0);
  if (dStr.includes('/')) {
    const [d, m, y] = dStr.split('/');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  return new Date(dStr);
};

interface Lesson {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  index: string;
  name: string;
}

interface Quarterly {
  id: string;
  title: string;
  description: string;
  covers: {
    portrait: string;
    landscape: string;
  };
  startDate: string;
  endDate: string;
  lessons: Lesson[];
}

interface QuarterlyItem {
  id: string;
  title: string;
  description: string;
  covers: {
    portrait: string;
    landscape: string;
  };
  startDate: string;
  endDate: string;
  index: string;
  groupTitle: string;
}

interface ContentBlock {
  id: string;
  type: string;
  markdown: string;
  data?: any;
}

interface Segment {
  id: string;
  title: string;
  date: string;
  name?: string;
  blocks: ContentBlock[];
}

interface WeeklyLesson {
  title: string;
  segments: Segment[];
}

export default function LesonaSekolySabata() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { settings: globalSettings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [quarterlyList, setQuarterlyList] = useState<QuarterlyItem[]>([]);
  const [selectedQuarterly, setSelectedQuarterly] = useState<Quarterly | null>(null);
  const [readingLesson, setReadingLesson] = useState<WeeklyLesson | null>(null);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);
  const [activeCategory, setActiveCategory] = useState("Lesona Lehibe (+ 35 taona)");
  const [lessonTitlesMap, setLessonTitlesMap] = useState<Record<string, string>>({});

  // Offline state
  const [downloadedQuarterlies, setDownloadedQuarterlies] = useState<string[]>([]);

  // Verse Modal state
  const [verseModalVisible, setVerseModalVisible] = useState(false);
  const [verseTitle, setVerseTitle] = useState("");
  const [verseContent, setVerseContent] = useState("");

  useEffect(() => {
    loadInitialData();
    checkDownloaded();
  }, []);

  const checkDownloaded = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const downloaded = keys
        .filter(k => k.startsWith(OFFLINE_LESSONS_PREFIX))
        .map(k => k.replace(OFFLINE_LESSONS_PREFIX, ""));
      setDownloadedQuarterlies(downloaded);
    } catch (e) {
      console.error(e);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setQuarterlyList(JSON.parse(stored));
      }

      const response = await fetch(`${API_BASE}/index.json`);
      const json = await response.json();

      const items: QuarterlyItem[] = [];
      if (json.groups) {
        json.groups.forEach((group: any) => {
          if (group.resources) {
            group.resources.forEach((res: any) => {
              items.push({
                id: res.id,
                title: res.title,
                description: res.description,
                covers: res.covers,
                startDate: res.startDate,
                endDate: res.endDate,
                index: res.index,
                groupTitle: group.title
              });
            });
          }
        });
      }

      // Sort: Newest at top
      items.sort((a, b) => {
        const [da, ma, ya] = a.startDate.split('/');
        const [db, mb, yb] = b.startDate.split('/');
        const dateA = new Date(parseInt(ya), parseInt(ma) - 1, parseInt(da));
        const dateB = new Date(parseInt(yb), parseInt(mb) - 1, parseInt(db));
        return dateB.getTime() - dateA.getTime();
      });

      setQuarterlyList(items);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Error loading initial data", e);
    } finally {
      setLoading(false);
    }
  };

  const isQuarterlyCurrent = (q: QuarterlyItem | Quarterly) => {
    if (!q.startDate || !q.endDate) return false;
    const now = new Date();
    const [sD, sM, sY] = q.startDate.split('/');
    const [eD, eM, eY] = q.endDate.split('/');
    const start = new Date(parseInt(sY), parseInt(sM) - 1, parseInt(sD));
    const end = new Date(parseInt(eY), parseInt(eM) - 1, parseInt(eD));
    return now >= start && now <= end;
  };

  const fetchQuarterlyDetail = async (id: string) => {
    setLoading(true);
    // Clear previous titles to avoid showing titles from another quarterly
    setLessonTitlesMap({});

    try {
      const cacheKey = `adventools_ss_q_detail_${id}`;

      // Try to load from cache first for better offline experience
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const json = JSON.parse(cached);
        setSelectedQuarterly(json);
        loadLessonTitles(json);
      }

      const qId = id.replace('mg-ss-', '');
      const subdomain = id.includes('-cq') ? 'inverse' : 'absg';
      const url = `https://${subdomain}.sspmadventist.org/api/v3/mg/ss/${qId}/index.json`;

      const response = await fetch(url).catch(() => null);
      if (response && response.ok) {
        const json = await response.json();
        setSelectedQuarterly(json);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(json));
        // Try to load lesson titles
        loadLessonTitles(json);
      } else if (!cached) {
        throw new Error("Impossible de charger les données et aucun cache disponible.");
      }
    } catch (e: any) {
      console.error(e);
      // If we already have cached data, don't alert unless it's a critical failure
      if (!selectedQuarterly) {
        Alert.alert(t('connection_error'), t('check_connection'));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLessonTitles = async (q: Quarterly) => {
    try {
      // 1. Check Offline first
      const offlineDataStr = await AsyncStorage.getItem(`${OFFLINE_LESSONS_PREFIX}${q.id}`);
      let titles: Record<string, string> = {};
      if (offlineDataStr) {
        const offlineData = JSON.parse(offlineDataStr);
        Object.keys(offlineData).forEach(id => {
          if (offlineData[id].title) titles[id] = offlineData[id].title;
        });
        setLessonTitlesMap(titles);
      }

      // 2. Fetch missing titles in the background if needed
      // For now, let's at least try the current lesson if not available
      const qId = q.id.replace('mg-ss-', '');
      const subdomain = q.id.includes('-cq') ? 'inverse' : 'absg';

      // We only fetch a few if they are missing to avoid too many requests
      const lessonsToFetch = (q.lessons || Array.from({ length: 13 }, (_, i) => ({
        id: (i + 1).toString().padStart(2, '0')
      }))).slice(0, 14);

      for (const lesson of lessonsToFetch) {
        const lId = lesson.id.includes('-') ? lesson.id.split('-').pop()! : lesson.id;
        if (!titles[lId]) {
          // Fetch title in background
          const lUrl = `https://${subdomain}.sspmadventist.org/api/v3/mg/ss/${qId}/${lId}/index.json`;
          fetch(lUrl).then(res => res.json()).then(lJson => {
            if (lJson.title) {
              setLessonTitlesMap(prev => ({ ...prev, [lId]: lJson.title }));
            }
          }).catch(() => { });
        }
      }
    } catch (e) {
      console.error("Error loading titles", e);
    }
  };

  const downloadFullQuarterly = async (q: Quarterly) => {
    setDownloadingAll(true);
    try {
      const qId = q.id.replace('mg-ss-', '');
      const subdomain = q.id.includes('-cq') ? 'inverse' : 'absg';
      const lessonsData: Record<string, WeeklyLesson> = {};

      const lessons = q.lessons || Array.from({ length: 13 }, (_, i) => ({
        id: `${q.id}-${(i + 1).toString().padStart(2, '0')}`
      }));

      for (const lesson of lessons) {
        const lessonId = lesson.id.split('-').pop();
        const url = `https://${subdomain}.sspmadventist.org/api/v3/mg/ss/${qId}/${lessonId}/index.json`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          let normalized = json;
          if (!json.segments && json.lessons) normalized = { ...json, segments: json.lessons };
          lessonsData[lessonId!] = normalized;
        }
      }

      await AsyncStorage.setItem(`${OFFLINE_LESSONS_PREFIX}${q.id}`, JSON.stringify(lessonsData));

      // Also cache the quarterly detail (index) to ensure offline access to the list
      await AsyncStorage.setItem(`adventools_ss_q_detail_${q.id}`, JSON.stringify(q));

      setDownloadedQuarterlies(prev => [...prev, q.id]);
      Alert.alert(t('success'), t('download_success'));
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), t('download_failed'));
    } finally {
      setDownloadingAll(false);
    }
  };

  const deleteQuarterly = async (qId: string) => {
    Alert.alert(
      t('delete_offline'),
      t('confirm_delete_all'),
      [
        { text: t('cancel'), style: "cancel" },
        {
          text: t('ok'),
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(`${OFFLINE_LESSONS_PREFIX}${qId}`);
              setDownloadedQuarterlies(prev => prev.filter(id => id !== qId));
              Alert.alert(t('success'), t('delete_success'));
            } catch (e) {
              console.error(e);
              Alert.alert(t('error'), t('delete_doc_error'));
            }
          }
        }
      ]
    );
  };

  const fetchWeeklyLesson = async (quarterlyId: string, lessonId: string) => {
    setLoading(true);
    setReadingLesson(null); // Clear previous content
    try {
      // 1. Check Offline
      const offlineDataStr = await AsyncStorage.getItem(`${OFFLINE_LESSONS_PREFIX}${quarterlyId}`);
      if (offlineDataStr) {
        const offlineData = JSON.parse(offlineDataStr);
        if (offlineData[lessonId]) {
          setReadingLesson(offlineData[lessonId]);
          setLoading(false);
          // Auto-select segment
          autoSelectSegment(offlineData[lessonId]);
          return;
        }
      }

      // 2. Fetch Online
      const qId = quarterlyId.replace('mg-ss-', '');
      const subdomain = quarterlyId.includes('-cq') ? 'inverse' : 'absg';
      const url = `https://${subdomain}.sspmadventist.org/api/v3/mg/ss/${qId}/${lessonId}/index.json`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const json = await response.json();
      if (!json || (!json.segments && !json.lessons)) {
        throw new Error("Invalid lesson data format");
      }

      // Some APIs might return differently, let's normalize
      let normalizedData = json;
      if (!json.segments && json.lessons) {
        normalizedData = { ...json, segments: json.lessons };
      }

      setReadingLesson(normalizedData);
      autoSelectSegment(normalizedData);

      // Sauvegarde automatique pour accès hors-ligne (Auto-cache)
      try {
        const offlineDataStr = await AsyncStorage.getItem(`${OFFLINE_LESSONS_PREFIX}${quarterlyId}`);
        let offlineData = offlineDataStr ? JSON.parse(offlineDataStr) : {};
        offlineData[lessonId] = normalizedData;
        await AsyncStorage.setItem(`${OFFLINE_LESSONS_PREFIX}${quarterlyId}`, JSON.stringify(offlineData));
      } catch (e) {
        console.error("Auto-cache error", e);
      }
    } catch (e: any) {
      console.error("Error fetching weekly lesson", e);
      Alert.alert(t('error'), `${t('no_content')}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const autoSelectSegment = (lesson: WeeklyLesson) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let foundIdx = 0;
    if (lesson.segments) {
      foundIdx = lesson.segments.findIndex((s: any) => {
        if (!s.date) return false;
        // Format could be DD/MM/YYYY
        const parts = s.date.split('/');
        if (parts.length === 3) {
          const [d, m, y] = parts;
          const sDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
          return sDate.getTime() === today.getTime();
        }
        return false;
      });
    }
    setActiveSegmentIdx(foundIdx >= 0 ? foundIdx : 0);
  };

  const categories = useMemo(() => {
    const standardCats = [
      "Lesona Zaza minono (0-12 volana)",
      "Lesona Zazakely (1-3 taona)",
      "Lesona Kilonga (4-6 taona)",
      "Lesona Ankizy (7-9 taona)",
      "Lesona Tanora zandriny (10-12 taona)",
      "Lesona Mantoanto (13-14 taona)",
      "Lesona Zatovo (15-18 taona)",
      "Lesona Tanora zokiny (19-35 taona)",
      "Lesona Lehibe (+ 35 taona)"
    ];

    // Filter out API categories that already map to standard ones (case-insensitive)
    const apiCats = Array.from(new Set(quarterlyList.map(item => item.groupTitle)))
      .filter(title => {
        const t = title.toLowerCase();
        return t !== "tanora zokiny" &&
          t !== "lesona lehibe" &&
          t !== "lesona tanora zokiny";
      });
    const allCats = Array.from(new Set([...standardCats, ...apiCats]));
    return allCats;
  }, [quarterlyList]);

  const filteredQuarterlies = useMemo(() => {
    const activeLower = activeCategory.toLowerCase();
    return quarterlyList.filter(item => {
      const groupLower = item.groupTitle.toLowerCase();

      // Smart matching for the two main categories
      if (activeLower.includes("lehibe (+ 35 taona)") && groupLower === "lesona lehibe") return true;
      if (activeLower.includes("tanora zokiny (19-35 taona)")) {
        return groupLower === "lesona tanora zokiny" || groupLower === "tanora zokiny";
      }

      // Fallback: Exact match for everything else
      return item.groupTitle === activeCategory;
    });
  }, [quarterlyList, activeCategory]);

  // Load EDS from settings on mount
  useEffect(() => {
    const loadEDS = async () => {
      try {
        const storedEDS = await AsyncStorage.getItem('profile_eds_class');
        if (storedEDS) setActiveCategory(storedEDS);
      } catch (e) {
        console.error(e);
      }
    };
    loadEDS();
  }, []);

  const handleShare = async () => {
    if (!selectedQuarterly || !readingLesson) return;
    try {
      const segment = readingLesson.segments[activeSegmentIdx];
      const rawMarkdown = segment?.blocks?.map(b => b.markdown).join('\n\n') || "";

      // Clean the content for human reading
      const cleanContent = rawMarkdown
        .replace(/\^\[(\d+)\]\(\{.*?\}\)/g, '[$1]') // Superset markers
        .replace(/\{#.*?\}/g, '') // Anchor markers
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links (just keep text)
        .replace(/\n{3,}/g, '\n\n') // Excessive lines
        .trim();

      const quarterlyId = selectedQuarterly.id.replace('mg-ss-', '');
      const lessonId = readingLesson.segments[0].id.split('-').slice(-2, -1)[0];
      const dayId = segment.name;
      const url = `${WEB_BASE}/${quarterlyId}/${lessonId}/${dayId}`;

      await RNShare.share({
        title: segment.title,
        message: `${segment.title}\n\n${cleanContent}\n\nNakana tao amin'ny Adventools\n${url}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const cleanVerseContent = (text: string) => {
    // Replace markers like ^[7]({"style":{"text":{"offset":"sup"}}}) with just [7]
    return text.replace(/\^\[(\d+)\]\(\{.*?\}\)/g, ' [$1] ')
      .replace(/\n{3,}/g, '\n\n') // Remove excessive empty lines
      .trim();
  };

  const formatVerseTitle = (ref: string) => {
    // Input example: "1Pet315" -> "1 Pet 3:15"
    // Input example: "Col15-Col16" -> "Col 1:5-6" (Note: some APIs return weird patterns)

    // 1. Add space between book name and numbers
    let formatted = ref.replace(/(\D+)(\d+)/g, (match, book, numbers) => {
      // If book is something like "1Pet", it stays "1Pet"
      // Let's at least ensure there is a space before the chapter
      return `${book} ${numbers}`;
    });

    // 2. If it's a technical sequence like "John207-John208", it usually means John 20:7-8
    // Let's try to detect the common parts
    if (formatted.includes('-')) {
      const parts = formatted.split('-');
      if (parts.length === 2) {
        // Attempt to extract book, chapter, verse
        // This is tricky without a full parser, but let's do common sense:
        // If the second part has the same letters, remove them
        const letters2 = parts[1].match(/[a-zA-Z]+/);
        const letters1 = parts[0].match(/[a-zA-Z]+/);
        if (letters1 && letters2 && letters1[0] === letters2[0]) {
          parts[1] = parts[1].replace(/[a-zA-Z]+/, '').trim();
        }

        // Try to insert colon in chapter/verse if it's long digits (e.g. 207 -> 20:7)
        // Usually last 2 digits are verse
        const addColon = (s: string) => {
          if (s.length >= 3) {
            const verse = s.slice(-2);
            const chapter = s.slice(0, -2);
            return `${chapter}:${parseInt(verse).toString()}`; // 207 -> 20:7, 315 -> 3:15
          }
          return s;
        };

        return `${addColon(parts[0])} - ${addColon(parts[1])}`;
      }
    }

    // Single ref like 1Pet315
    const addColon = (s: string) => {
      const match = s.match(/(.*?)\s*(\d+)$/);
      if (match) {
        const book = match[1];
        const num = match[2];
        if (num.length >= 2) {
          const verse = num.slice(-2);
          const chapter = num.slice(0, -2);
          return `${book} ${chapter}:${parseInt(verse).toString()}`;
        }
      }
      return s;
    };

    return addColon(formatted);
  };

  const isLessonToday = (lesson: Lesson) => {
    if (!lesson.startDate || !lesson.endDate) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = parseDate(lesson.startDate);
    const end = parseDate(lesson.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    return now >= start && now <= end;
  };

  const getTodayLessonId = (q: Quarterly) => {
    if (q.lessons && q.lessons.length > 0) {
      const found = q.lessons.find(l => isLessonToday(l));
      if (found) return found.id.split('-').pop();
    }
    if (q.startDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const start = parseDate(q.startDate);
      const diff = now.getTime() - start.getTime();
      const weekNum = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
      if (weekNum >= 1 && weekNum <= 14) {
        return weekNum.toString().padStart(2, '0');
      }
    }
    return null;
  };

  const handleLinkPress = (url: string) => {
    if (url.startsWith('sspmBible://')) {
      const ref = url.replace('sspmBible://', '');
      const segment = readingLesson?.segments?.[activeSegmentIdx];
      if (segment && segment.blocks) {
        // Find if this reference is in the data.bible
        for (const block of segment.blocks) {
          if (block.data?.bible && block.data.bible[ref]) {
            const bibleData = block.data.bible[ref];
            // Flatten the bible content
            let text = "";
            const processItems = (items: any[]) => {
              items.forEach(item => {
                if (item.markdown) text += item.markdown + "\n\n";
                if (item.items) processItems(item.items);
              });
            };
            if (bibleData.items) processItems(bibleData.items);

            setVerseTitle(formatVerseTitle(ref));
            setVerseContent(cleanVerseContent(text));
            setVerseModalVisible(true);
            return;
          }
        }
      }
      Alert.alert(t('bible'), `${t('searching_bible')}: ${ref}`);
    } else {
      Linking.openURL(url);
    }
  };

  const renderContent = () => {
    if (loading && !readingLesson && !selectedQuarterly) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      );
    }

    if (readingLesson) {
      const segment = readingLesson.segments?.[activeSegmentIdx];
      const markdown = segment?.blocks?.map(b => b.markdown).join('\n\n') || "";

      return (
        <View className="flex-1">
          {/* Day Selector - Improved & Larger */}
          <View className="bg-slate-900 border-b border-white/10">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            >
              {readingLesson.segments?.map((s, idx) => {
                const isActive = activeSegmentIdx === idx;
                // Use full title but with ellipsis if needed
                const dayTitle = s.title || `${t('day')} ${idx + 1}`;

                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setActiveSegmentIdx(idx)}
                    className={`px-4 py-4 rounded-[20px] mr-3 border-2 items-center justify-center min-w-[120px] max-w-[200px] ${isActive ? 'bg-primary border-primary shadow-lg shadow-primary/30' : 'bg-slate-800 border-slate-700'}`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase tracking-widest text-center ${isActive ? 'text-white' : 'text-slate-400'}`}
                      style={{ fontFamily: 'Lexend_600SemiBold' }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {dayTitle}
                    </Text>
                    <Text className={`text-[9px] mt-1 ${isActive ? 'text-white/80' : 'text-slate-500'}`}>{s.date || ""}</Text>
                  </TouchableOpacity>
                );
              }) || null}
            </ScrollView>
          </View>

          <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
            {segment ? (
              <>
                <Text className="text-primary font-bold text-lg mb-2 uppercase tracking-widest" style={{ fontFamily: globalSettings.fontFamily }}>{segment.date}</Text>
                <Text className="text-white text-4xl font-bold mb-6" style={{ fontFamily: 'Lexend_700Bold' }}>{segment.title}</Text>
                <Markdown
                  onLinkPress={(url) => {
                    handleLinkPress(url);
                    return false; // Return false to prevent default browser behavior
                  }}
                  style={{
                    body: {
                      color: '#cbd5e1',
                      fontSize: globalSettings.fontSize,
                      fontFamily: globalSettings.fontFamily,
                      lineHeight: globalSettings.fontSize * globalSettings.lineHeight,
                      paddingBottom: 100
                    },
                    heading3: { color: '#3b82f6', marginTop: 20, marginBottom: 10, fontFamily: 'Lexend_600SemiBold' },
                    strong: { color: '#f8fafc', fontWeight: 'bold' },
                    italic: { fontStyle: 'italic' },
                    blockquote: { backgroundColor: '#1e293b', borderLeftColor: '#3b82f6', borderLeftWidth: 4, padding: 10, marginVertical: 10 },
                    link: { color: '#3b82f6', textDecorationLine: 'none' }
                  }}
                >
                  {markdown}
                </Markdown>
              </>
            ) : (
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-slate-500">{t('no_content')}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    if (selectedQuarterly) {
      const isDownloaded = downloadedQuarterlies.includes(selectedQuarterly.id);
      const isCurrent = isQuarterlyCurrent(selectedQuarterly);

      return (
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          <View className="bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 mb-8 p-6 flex-row items-center">
            <Image source={{ uri: selectedQuarterly.covers.portrait }} className="w-20 h-28 rounded-lg mr-4" />
            <View className="flex-1">
              <Text className="text-white font-bold text-lg mb-1">{selectedQuarterly.title}</Text>
              <Text className="text-slate-500 text-xs leading-5" numberOfLines={3}>{selectedQuarterly.description}</Text>

              <View className="flex-row items-center mt-4">
                <TouchableOpacity
                  onPress={() => downloadFullQuarterly(selectedQuarterly)}
                  disabled={downloadingAll || (isDownloaded && !isCurrent)}
                  className={`flex-row items-center px-4 py-2 rounded-full self-start ${isDownloaded ? 'bg-emerald-500/10' : 'bg-primary/10'}`}
                >
                  {downloadingAll ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                  ) : isDownloaded ? (
                    <CheckCircle size={14} color="#10b981" />
                  ) : (
                    <Download size={14} color="#3b82f6" />
                  )}
                  <Text className={`ml-2 text-[10px] font-bold ${isDownloaded ? 'text-emerald-500' : 'text-primary'}`}>
                    {isDownloaded ? (isCurrent ? t('updated') : t('offline_available')) : t('download_all')}
                  </Text>
                </TouchableOpacity>

                {isDownloaded && (
                  <TouchableOpacity
                    onPress={() => deleteQuarterly(selectedQuarterly.id)}
                    className="ml-3 w-8 h-8 rounded-full bg-red-500/10 items-center justify-center border border-red-500/20"
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View className="flex-row items-center justify-between mt-8 mb-6 ml-1">
            <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('program_of_study')}</Text>

            {isQuarterlyCurrent(selectedQuarterly) && (
              <TouchableOpacity
                onPress={() => {
                  const lessonId = getTodayLessonId(selectedQuarterly);
                  if (lessonId) {
                    fetchWeeklyLesson(selectedQuarterly.id, lessonId);
                  } else {
                    Alert.alert(t('sabbath_school_lessons'), t('no_content'));
                  }
                }}
                className="px-5 py-2 rounded-2xl bg-primary border shadow-lg shadow-primary/20 border-primary/20 flex-row items-center"
              >
                <BookOpen size={14} color="white" />
                <Text className="text-white font-bold text-[11px] ml-2">{t('read_today')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="pb-10">
            {(selectedQuarterly.lessons || Array.from({ length: 13 }, (_, i) => ({
              id: `${selectedQuarterly.id}-${(i + 1).toString().padStart(2, '0')}`,
              title: `${t('lesson_number')} ${i + 1}`,
              startDate: "", endDate: "", index: "",
              name: (i + 1).toString().padStart(2, '0')
            }))).map((lesson, index) => {
              const lessonNum = lesson.id.split('-').pop() || (index + 1).toString().padStart(2, '0');
              const isToday = lesson.startDate ? isLessonToday(lesson) : lessonNum === getTodayLessonId(selectedQuarterly);
              const actualTitle = lessonTitlesMap[lessonNum] || lesson.title;

              return (
                <TouchableOpacity
                  key={lesson.id}
                  onPress={() => fetchWeeklyLesson(selectedQuarterly.id, lessonNum)}
                  className={`mb-4 rounded-[28px] border overflow-hidden p-[1px] ${isToday ? 'bg-primary border-primary' : 'bg-slate-800/30'}`}
                >
                  <View className={`rounded-[27px] p-5 flex-row items-center ${isToday ? 'bg-primary/10' : 'bg-slate-900'}`}>
                    <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${isToday ? 'bg-primary' : 'bg-slate-800'}`}>
                      <Text className={`text-lg font-bold ${isToday ? 'text-white' : 'text-slate-400'}`}>{index + 1}</Text>
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Text
                          className={`font-bold text-base ${isToday ? 'text-white' : 'text-slate-300'}`}
                          numberOfLines={1}
                          style={{ fontFamily: isToday ? 'Lexend_700Bold' : 'Lexend_600SemiBold' }}
                        >
                          {actualTitle}
                        </Text>
                      </View>
                      <Text className={`text-[10px] uppercase tracking-tighter ${isToday ? 'text-blue-400' : 'text-slate-500'}`}>
                        {lesson.startDate ? `${lesson.startDate} — ${lesson.endDate}` : `Herinandro faha ${index + 1}`}
                      </Text>
                    </View>

                    {isToday ? (
                      <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                        <ChevronRight size={18} color="white" />
                      </View>
                    ) : (
                      <ChevronRight size={18} color="#475569" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      );
    }

    return (
      <View className="flex-1 px-6">
        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-4 max-h-16">
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              className={`px-6 py-2 rounded-full mr-3 ${activeCategory === cat ? 'bg-primary' : 'bg-slate-900 border border-slate-800'}`}
            >
              <Text className={`font-bold text-xs ${activeCategory === cat ? 'text-white' : 'text-slate-400'}`}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView className="flex-1 pt-2" showsVerticalScrollIndicator={false}>
          {filteredQuarterlies.length > 0 ? (
            <View className="flex-row flex-wrap justify-between">
              {filteredQuarterlies.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => fetchQuarterlyDetail(item.id)}
                  style={{ width: (width - 60) / 2 }}
                  className="bg-slate-900 rounded-[24px] overflow-hidden border border-slate-800 mb-6"
                >
                  <View className="relative">
                    <Image source={{ uri: item.covers.portrait }} className="w-full h-48" resizeMode="cover" />
                    {downloadedQuarterlies.includes(item.id) && (
                      <View className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 items-center justify-center">
                        <CheckCircle size={14} color="white" />
                      </View>
                    )}
                  </View>
                  <View className="p-4">
                    <Text className="text-primary font-bold text-[8px] uppercase tracking-widest mb-1" numberOfLines={1}>
                      {item.startDate.split('/').slice(1).join('/')} — {item.endDate.split('/').slice(1).join('/')}
                    </Text>
                    <Text className="text-white text-sm font-bold mb-1 h-10" numberOfLines={2} style={{ fontFamily: 'Lexend_700Bold' }}>
                      {item.title}
                    </Text>
                    <View className="flex-row items-center justify-between mt-1">
                      <Text className="text-slate-500 text-[10px] italic" numberOfLines={1}>{item.groupTitle}</Text>
                      <ChevronRight size={12} color="#475569" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-20 px-10">
              <View className="w-20 h-20 rounded-full bg-slate-900 items-center justify-center mb-6 border border-slate-800">
                <BookOpen size={32} color="#475569" />
              </View>
              <Text className="text-white text-xl font-bold mb-3 text-center" style={{ fontFamily: 'Lexend_700Bold' }}>Ho avy tsy ho ela</Text>
              <Text className="text-slate-500 text-center leading-6">
                Mbola eo am-panomanana ny votoatiny ho an'ity sokajy ity ny mpandrindra. Miandrasa kely fa ho avy tsy ho ela izany.
              </Text>

              <TouchableOpacity
                onPress={() => setActiveCategory("Tanora zokiny")}
                className="mt-8 bg-primary/10 px-8 py-3 rounded-2xl border border-primary/20"
              >
                <Text className="text-primary font-bold">Hiverina amin'ny Tanora</Text>
              </TouchableOpacity>
            </View>
          )}
          <View className="h-20" />
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/5">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => {
              if (readingLesson) setReadingLesson(null);
              else if (selectedQuarterly) setSelectedQuarterly(null);
              else router.back();
            }}
            className="mr-4 w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10"
          >
            <ArrowLeft size={20} color="#94a3b8" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }} numberOfLines={1}>
              {readingLesson ? readingLesson.title : selectedQuarterly ? selectedQuarterly.title : "Sekoly Sabata"}
            </Text>
            <Text className="text-slate-500 text-xs">
              {readingLesson ? "Fandalinana" : "Sekoly Sabata Malagasy"}
            </Text>
          </View>
        </View>
        <View className="flex-row">
          {readingLesson && (
            <TouchableOpacity onPress={handleShare} className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center border border-primary/20 mr-2">
              <Share size={18} color="#3b82f6" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={loadInitialData}
            disabled={loading}
            className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center border border-slate-700"
          >
            <RefreshCw size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {renderContent()}

      {/* Bible Verse Modal */}
      <Modal visible={verseModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[40px] p-8 border-t border-white/10" style={{ maxHeight: '80%' }}>
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center">
                <BookOpen size={20} color="#3b82f6" className="mr-3" />
                <Text className="text-xl font-bold text-white">{verseTitle}</Text>
              </View>
              <TouchableOpacity onPress={() => setVerseModalVisible(false)} className="w-8 h-8 rounded-full bg-white/5 items-center justify-center">
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-slate-300 leading-7 italic py-4" style={{ fontSize: globalSettings.fontSize, fontFamily: globalSettings.fontFamily }}>{verseContent}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
