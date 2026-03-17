import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Download,
  FileText,
  Globe,
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

// Conditional import for PDF
let Pdf: any;
try {
  Pdf = require('react-native-pdf').default;
} catch (e) {
  console.log("react-native-pdf not available");
}

const WEB_BASE = "https://inverse.sspmadventist.org";
const OFFLINE_LESSONS_PREFIX = "adventools_ss_offline_";
const LESSONS_DIR = `${FileSystem.documentDirectory}ss_offline/`;

const SS_LANGUAGES = [
  { code: 'mg', label: 'Malagasy', flag: '🇲🇬' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

const getApiBase = (lang: string) => `https://inverse.sspmadventist.org/api/v3/${lang}/ss`;
const getAbsgBase = (lang: string) => `https://absg.sspmadventist.org/api/v3/${lang}/ss`;
const getStorageKey = (lang: string) => `adventools_ss_data_${lang}`;

const parseDate = (dStr: string) => {
  if (!dStr || typeof dStr !== 'string') return new Date(0);
  // Handle "DD/MM/YYYY" or "YYYY-MM-DD" or similar
  const dateStr = dStr.split(' ')[0]; // Take first part if range
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
  }
  return new Date(dateStr);
};

const formatDateRange = (start: string | undefined, end: string | undefined) => {
  if (!start || !end || typeof start !== 'string' || typeof end !== 'string') return "";
  try {
    const sParts = start.split('/');
    const eParts = end.split('/');
    if (sParts.length < 3 || eParts.length < 3) return "";
    return `${sParts.slice(1).join('/')} — ${eParts.slice(1).join('/')}`;
  } catch (e) {
    return "";
  }
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
    square?: string;
  };
  startDate: string;
  endDate: string;
  index: string;
  lessons?: Lesson[];
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

interface PdfResource {
  src: string;
  title: string;
  id: string;
}

interface ContentBlock {
  id: string;
  type: string;
  markdown?: string;
  items?: ContentBlock[];
  data?: any;
  nested?: boolean;
  image?: string;
  caption?: string;
}

interface Segment {
  id: string;
  title: string;
  date?: string;
  name?: string;
  type?: string;
  blocks?: ContentBlock[];
  pdf?: PdfResource[];
}

interface WeeklyLesson {
  title: string;
  segments: Segment[];
  introduction?: string;
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
  const [selectedLang, setSelectedLang] = useState<string>('mg');
  const [showLangPicker, setShowLangPicker] = useState(false);

  // Persistence for language across screen re-mounts
  useEffect(() => {
    const loadSavedLang = async () => {
      const saved = await AsyncStorage.getItem('adventools_ss_selected_lang');
      if (saved) setSelectedLang(saved);
      else if (globalSettings.language && globalSettings.language.toLowerCase().includes('anglais')) setSelectedLang('en');
      else if (globalSettings.language && globalSettings.language.toLowerCase().includes('français')) setSelectedLang('fr');
    };
    loadSavedLang();
  }, [globalSettings.language]);

  const changeLang = async (l: string) => {
    setSelectedLang(l);
    setShowLangPicker(false);
    await AsyncStorage.setItem('adventools_ss_selected_lang', l);
  };

  // Offline state
  const [downloadedQuarterlies, setDownloadedQuarterlies] = useState<string[]>([]);

  // Verse Modal state
  const [verseModalVisible, setVerseModalVisible] = useState(false);
  const [verseTitle, setVerseTitle] = useState("");
  const [verseContent, setVerseContent] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      checkDownloaded();
    }, [selectedLang])
  );

  useEffect(() => {
    loadInitialData();
  }, [selectedLang]);

  const checkDownloaded = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(LESSONS_DIR);
      if (!dirInfo.exists) {
        setDownloadedQuarterlies([]);
        return;
      }
      const files = await FileSystem.readDirectoryAsync(LESSONS_DIR);
      const downloaded = files
        .filter(f => f.endsWith(".json"))
        .map(f => f.replace(".json", ""));
      setDownloadedQuarterlies(downloaded);
    } catch (e) {
      console.error(e);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const storageKey = getStorageKey(selectedLang);
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        setQuarterlyList(JSON.parse(stored));
      } else {
        setQuarterlyList([]);
      }

      // Fetch fresh
      let url = `${getApiBase(selectedLang)}/index.json`;
      if (selectedLang === 'en') url = `${getAbsgBase(selectedLang)}/index.json`;

      const response = await fetch(url).catch(() => null);
      let items: QuarterlyItem[] = [];

      if (response && response.ok) {
        const data = await response.json();
        data.groups.forEach((group: any) => {
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

      items.sort((a, b) => {
        const dateA = parseDate(a.startDate);
        const dateB = parseDate(b.startDate);
        return dateB.getTime() - dateA.getTime();
      });

      if (items.length > 0) {
        setQuarterlyList(items);
        await AsyncStorage.setItem(storageKey, JSON.stringify(items));
      }
    } catch (e) {
      console.error("Error loading initial data", e);
    } finally {
      setLoading(false);
    }
  };

  const isQuarterlyCurrent = (q: QuarterlyItem | Quarterly) => {
    if (!q || !q.startDate || !q.endDate || typeof q.startDate !== 'string') return false;
    const now = new Date();
    try {
      const start = parseDate(q.startDate);
      const end = parseDate(q.endDate);
      return now >= start && now <= end;
    } catch (e) {
      return false;
    }
  };

  const isLessonToday = (lesson: Lesson) => {
    if (!lesson.startDate || !lesson.endDate || typeof lesson.startDate !== 'string') return false;
    const now = new Date();
    // Normalize to midnight for comparison
    now.setHours(0, 0, 0, 0);
    try {
      const start = parseDate(lesson.startDate);
      const end = parseDate(lesson.endDate);
      // Lesson usually ends on Friday night, so we include Saturday morning if needed, 
      // but Sabbath School logic usually follows Saturday-to-Friday.
      return now >= start && now <= end;
    } catch (e) {
      return false;
    }
  };

  const getTodayLessonId = (q: Quarterly) => {
    if (!q.startDate) return undefined;

    // 1. Use real lesson dates if available
    if (q.lessons && q.lessons.length > 0) {
      const found = q.lessons.find(l => isLessonToday(l));
      if (found) {
        const idStr = (found.id && typeof found.id === 'string') ? found.id : "";
        return idStr.includes('-') ? idStr.split('-').pop() : idStr;
      }
    }

    // 2. Fallback: calculate week number based on quarterly start date
    try {
      const start = parseDate(q.startDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const diffTime = now.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0) {
        // 1. Find if a lesson explicitly covers today (best for children/mission)
        if (q.lessons) {
          const found = q.lessons.find(l => isLessonToday(l));
          if (found) {
            const idStr = (found.id && typeof found.id === 'string') ? found.id : "";
            const lNum = idStr.split('-').pop();
            if (lNum) return lNum;
          }
        }

        // 2. Fallback to weekly calculation
        const weekNum = Math.floor(diffDays / 7) + 1;
        if (weekNum >= 1 && weekNum <= 13) {
          return weekNum.toString().padStart(2, '0');
        }
      }
    } catch (e) { }

    return undefined;
  };

  const fetchQuarterlyDetail = async (id: string, indexPath?: string) => {
    setLoading(true);
    setSelectedQuarterly(null);
    try {
      const cacheKey = `adventools_ss_q_detail_${selectedLang}_${id}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const json = JSON.parse(cached);
        setSelectedQuarterly(json);
        loadLessonTitles(json);
      }

      const storedItem = quarterlyList.find(q => q.id === id);
      const itemIndex = indexPath || storedItem?.index;

      let url: string;
      if (itemIndex) {
        const subdomain = (itemIndex.includes('/mg/') || itemIndex.includes('-cq')) ? 'inverse' : 'absg';
        url = `https://${subdomain}.sspmadventist.org/api/v3/${itemIndex}/index.json`;
      } else {
        const qPath = id.replace(`${selectedLang}-`, '').replace(/-/g, '/');
        const subdomain = id.includes('-cq') ? 'inverse' : 'absg';
        url = `https://${subdomain}.sspmadventist.org/api/v3/${selectedLang}/${qPath}/index.json`;
      }

      const response = await fetch(url).catch(() => null);
      if (response && response.ok) {
        const json = await response.json();
        setSelectedQuarterly(json);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(json));
        loadLessonTitles(json);
      } else if (!cached) {
        throw new Error("Impossible de charger les données et aucun cache disponible.");
      }
    } catch (e: any) {
      console.error(e);
      if (!selectedQuarterly) {
        Alert.alert(t('connection_error'), t('check_connection'));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLessonTitles = (q: Quarterly) => {
    const isBabies = q.id.includes('-bb-') || q.id.includes('babies');
    const isGuide = q.id.includes('-pb') || q.id.includes('-pth') || q.id.includes('guide');
    const weekLabel = selectedLang === 'mg' ? 'Herinandro' : (selectedLang === 'fr' ? 'Semaine' : (t('week' as any) || 'Week'));
    const lessons = q.lessons || Array.from({ length: isBabies ? 3 : 13 }, (_, i) => ({
      id: `${q.id}-${(i + 1).toString().padStart(2, '0')}`,
      title: isGuide ? `${cleanSspmMarkdown(q.title)} - Part ${i + 1}` : `${weekLabel} ${i + 1}`
    }));

    try {
      const titles: Record<string, string> = {};
      lessons.forEach((l: any) => {
        const lIdStr = (l.id && typeof l.id === 'string') ? l.id : "";
        const lId = lIdStr.split('-').pop();
        if (lId && l.title) titles[lId] = l.title;
      });
      setLessonTitlesMap(titles);

      const prefix = `${selectedLang}-`;
      lessons.forEach((l: any) => {
        const lIdStr = (l.id && typeof l.id === 'string') ? l.id : "";
        const lId = lIdStr.split('-').pop();
        if (lId) {
          // Si le titre par défaut est basé sur le mot semaine, herinandro, etc, on essaye de ramener le vrai
          const currentTitle = titles[lId] || '';
          if (currentTitle.includes('Herinandro') || currentTitle.includes('Semaine') || currentTitle.includes('Week') || currentTitle.includes('Part')) {
            let lUrl: string;
            if (q.index) {
              const sub = (q.index.includes('/mg/') || q.id.includes('-cq')) ? 'inverse' : 'absg';
              lUrl = `https://${sub}.sspmadventist.org/api/v3/${q.index}/${lId}/index.json`;
            } else {
              const qPart = q.id.replace(prefix, '').replace('mg-', '').replace('ss-', '').replace('aij-', '').replace('explore-', '').replace(/-/g, '/');
              const sub = (q.id.includes('-cq')) ? 'inverse' : 'absg';
              const section = (q.id.includes('-bb-') || q.id.includes('-aij-') || q.id.includes('babies')) ? 'aij' : (q.id.includes('explore') || q.id.includes('mission-spotlight')) ? 'explore' : 'ss';
              lUrl = `https://${sub}.sspmadventist.org/api/v3/${selectedLang}/${section}/${qPart}/${lId}/index.json`;
            }

            fetch(lUrl).then(res => res.text()).then(text => {
              if (text.trim().startsWith('{')) {
                const lJson = JSON.parse(text);
                if (lJson.title) {
                  setLessonTitlesMap(prev => ({ ...prev, [lId]: cleanSspmMarkdown(lJson.title) }));
                }
              }
            }).catch(() => { });
          }
        }
      });
    } catch (e) {
      console.error("Error loading titles", e);
    }
  };

  const downloadFullQuarterly = async (q: Quarterly) => {
    if (downloadingAll) return;
    setDownloadingAll(true);
    let successCount = 0;
    try {
      const dirInfo = await FileSystem.getInfoAsync(LESSONS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(LESSONS_DIR, { intermediates: true });
      }

      let quarterlyPath = q.index;
      if (!quarterlyPath) {
        const langPrefix = `${selectedLang}-`;
        const qId = q.id.replace(langPrefix, '').replace('mg-', '').replace('ss-', '').replace('aij-', '').replace('explore-', '');
        let section = 'ss';
        if (q.id.includes('-bb-') || q.id.includes('-aij-') || q.id.includes('babies')) {
          section = 'aij';
        } else if (q.id.includes('mission-spotlight') || q.id.includes('explore')) {
          section = 'explore';
        }
        quarterlyPath = `${selectedLang}/${section}/${qId}`;
      }

      const subdomain = (quarterlyPath.includes('/mg/') || quarterlyPath.includes('-cq')) ? 'inverse' : 'absg';
      const lessons = q.lessons || Array.from({ length: 13 }, (_, i) => ({
        id: `${q.id}-${(i + 1).toString().padStart(2, '0')}`
      }));

      const lessonsData: Record<string, WeeklyLesson> = {};
      const batchSize = 3;
      for (let i = 0; i < lessons.length; i += batchSize) {
        const batch = lessons.slice(i, i + batchSize);
        await Promise.all(batch.map(async (lesson, idx) => {
          try {
            const lessonId = (lesson.id && typeof lesson.id === 'string')
              ? (lesson.id.includes('-') ? lesson.id.split('-').pop() : lesson.id)
              : ((i + idx + 1).toString().padStart(2, '0'));

            // Try multiple sections (ss, aij, explore)
            const sections = ['ss', 'aij', 'explore'];
            if (quarterlyPath.includes('/aij/') || quarterlyPath.includes('/explore/')) {
              // Move existing section to front
              const currentSect = quarterlyPath.split('/')[1];
              if (sections.includes(currentSect)) {
                sections.splice(sections.indexOf(currentSect), 1);
                sections.unshift(currentSect);
              }
            }

            let lessonJson = null;
            for (const section of sections) {
              if (lessonJson) break;
              const pathAttempt = quarterlyPath.replace(/\/(ss|aij|explore)\//, `/${section}/`);
              const url = `https://${subdomain}.sspmadventist.org/api/v3/${pathAttempt}/${lessonId}/index.json`;
              const res = await fetch(url).catch(() => null);
              if (res && res.ok) {
                const text = await res.text();
                if (text.trim().startsWith('{')) {
                  lessonJson = JSON.parse(text);
                }
              }
            }

            if (!lessonJson && q) {
              const qLessons = q.lessons || (q as any).resources || [];
              const lessonInfo: any = qLessons.find((l: any) => l.id === lesson.id || (l.id && l.id.endsWith(`-${lessonId}`)) || (l.id && l.id.endsWith(`-${lesson.id}`)));

              if (lessonInfo) {
                if (lessonInfo.index) {
                  try {
                    const url = `https://${subdomain}.sspmadventist.org/api/v3/${lessonInfo.index}/index.json`;
                    const res = await fetch(url).catch(() => null);
                    if (res && res.ok) {
                      const text = await res.text();
                      if (text.trim().startsWith('{')) {
                        lessonJson = JSON.parse(text);
                      }
                    }
                  } catch (e) { }
                }

                if (!lessonJson && (lessonInfo.description || lessonInfo.introduction)) {
                  lessonJson = {
                    id: lessonId,
                    title: lessonInfo.title || q.title,
                    segments: [{
                      id: `${lessonId}-content`,
                      title: lessonInfo.title || q.title,
                      type: 'markdown',
                      blocks: [{
                        id: 'content-block',
                        type: 'markdown',
                        markdown: lessonInfo.description || lessonInfo.introduction
                      }]
                    }]
                  };
                }

                if (!lessonJson && lessonInfo.share?.shareGroups) {
                  const pdfFiles = lessonInfo.share.shareGroups.find((g: any) => g.type === 'file' || g.title === 'PDF')?.files;
                  if (pdfFiles && pdfFiles.length > 0) {
                    lessonJson = {
                      id: lessonId,
                      title: lessonInfo.title || q.title,
                      segments: [{
                        id: `${lessonId}-pdf`,
                        title: pdfFiles[0].title || lessonInfo.title,
                        type: 'pdf',
                        pdf: pdfFiles
                      }]
                    };
                  }
                }
              }
            }

            if (!lessonJson) {
              const resourceUrl = `https://${subdomain}.sspmadventist.org/api/v3/${selectedLang}/ss/resources/${lessonId}/index.json`;
              try {
                const res = await fetch(resourceUrl).catch(() => null);
                if (res && res.ok) {
                  const text = await res.text();
                  if (text.trim().startsWith('{')) {
                    lessonJson = JSON.parse(text);
                  }
                }
              } catch (e) { }
            }

            if (!lessonJson && q) {
              if ((q as any).introduction || q.description) {
                lessonJson = {
                  id: lessonId,
                  title: q.title,
                  segments: [{
                    id: `${lessonId}-intro`,
                    title: q.title,
                    type: 'markdown',
                    blocks: [{
                      id: 'intro-block',
                      type: 'markdown',
                      markdown: (q as any).introduction || q.description
                    }]
                  }]
                };
              }

              if (!lessonJson) {
                const pdfFiles = (q as any).share?.shareGroups?.find((g: any) => g.type === 'file' || g.title === 'PDF')?.files;
                const pdfLink = (q as any).share?.shareGroups?.find((g: any) => g.type === 'link')?.links?.find((l: any) => l.src.endsWith('.pdf'));

                if (pdfFiles && pdfFiles.length > 0) {
                  lessonJson = {
                    id: lessonId,
                    title: q.title,
                    segments: [{
                      id: `${lessonId}-pdf`,
                      title: pdfFiles[0].title || q.title,
                      type: 'pdf',
                      pdf: pdfFiles
                    }]
                  };
                } else if (pdfLink) {
                  lessonJson = {
                    id: lessonId,
                    title: q.title,
                    segments: [{
                      id: `${lessonId}-pdf`,
                      title: q.title,
                      type: 'pdf',
                      pdf: [{ id: '1', title: q.title, src: pdfLink.src }]
                    }]
                  };
                }
              }
            }

            if (lessonJson) {
              let normalized = lessonJson;
              if (!lessonJson.segments && lessonJson.lessons) normalized = { ...lessonJson, segments: lessonJson.lessons };
              if (lessonId) {
                lessonsData[lessonId] = normalized;
                successCount++;
              }
            }
          } catch (le) { console.error("Lesson DL error", le); }
        }));
        await new Promise(r => setTimeout(r, 100));
      }

      if (successCount === 0) throw new Error("Impossible de télécharger le contenu");

      const downloadId = `${selectedLang}_${q.id}`;
      const filePath = `${LESSONS_DIR}${downloadId}.json`;
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(lessonsData));

      await AsyncStorage.setItem(`adventools_ss_q_detail_${downloadId}`, JSON.stringify(q));

      setDownloadedQuarterlies(prev => prev.includes(downloadId) ? prev : [...prev, downloadId]);
      Alert.alert(t('success'), `${t('download_success')} (${successCount} leçons)`);
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
              const downloadId = `${selectedLang}_${qId}`;
              const filePath = `${LESSONS_DIR}${downloadId}.json`;
              const info = await FileSystem.getInfoAsync(filePath);
              if (info.exists) {
                await FileSystem.deleteAsync(filePath);
              }
              await AsyncStorage.removeItem(`adventools_ss_q_detail_${downloadId}`);
              setDownloadedQuarterlies(prev => prev.filter(id => id !== downloadId));
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
    setReadingLesson(null);
    setActiveSegmentIdx(0);
    try {
      const downloadId = `${selectedLang}_${quarterlyId}`;
      const filePath = `${LESSONS_DIR}${downloadId}.json`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(filePath);
        const offlineData = JSON.parse(content);
        if (offlineData[lessonId]) {
          setReadingLesson(offlineData[lessonId]);
          setLoading(false);
          autoSelectSegment(offlineData[lessonId]);
          return;
        }
      }

      let quarterlyPath = selectedQuarterly?.index;
      const langPrefix = `${selectedLang}-`;

      if (!quarterlyPath) {
        let qId = quarterlyId.replace(langPrefix, '').replace('mg-', '').replace('ss-', '').replace('aij-', '').replace('explore-', '');
        let section = 'ss';
        if (quarterlyId.includes('-bb-') || quarterlyId.includes('-aij-') || quarterlyId.includes('babies')) {
          section = 'aij';
        } else if (quarterlyId.includes('mission-spotlight') || quarterlyId.includes('explore')) {
          section = 'explore';
        }
        quarterlyPath = `${selectedLang}/${section}/${qId}`;
      }

      const subdomain = (quarterlyPath.includes('/mg/') || quarterlyPath.includes('-cq')) ? 'inverse' : 'absg';
      let shortLessonId = lessonId.split('-').pop() || "";
      if (shortLessonId.length === 1) shortLessonId = shortLessonId.padStart(2, '0');

      // Attempt multiple sections if the first fails (ss vs aij vs explore vs resources)
      const sections = ['ss', 'aij', 'explore'];
      if (quarterlyPath.includes('/aij/') || quarterlyPath.includes('/explore/')) {
        const sectionsInPath = quarterlyPath.split('/');
        const currentSect = sectionsInPath.find(s => sections.includes(s));
        if (currentSect) {
          sections.splice(sections.indexOf(currentSect), 1);
          sections.unshift(currentSect);
        }
      }

      let finalJson: any = null;
      let lastError: any = null;

      for (const section of sections) {
        if (finalJson) break;
        try {
          const pathAttempt = quarterlyPath.replace(/\/(ss|aij|explore)\//, `/${section}/`);
          const url = `https://${subdomain}.sspmadventist.org/api/v3/${pathAttempt}/${shortLessonId}/index.json`;

          const response = await fetch(url);
          if (response.ok) {
            const text = await response.text();
            if (text.trim().startsWith('{')) {
              finalJson = JSON.parse(text);
              break;
            }
          }
        } catch (e) {
          lastError = e;
        }
      }

      if (!finalJson && selectedQuarterly) {
        // Fallback: Check if the quarterly lessons have specific indices (common in explore)
        const qLessons = selectedQuarterly.lessons || (selectedQuarterly as any).resources || [];
        const lessonInfo: any = qLessons.find((l: any) => l.id === lessonId || (l.id && l.id.endsWith(`-${shortLessonId}`)) || (l.id && l.id.endsWith(`-${lessonId}`)));

        if (lessonInfo) {
          if (lessonInfo.index) {
            try {
              const url = `https://${subdomain}.sspmadventist.org/api/v3/${lessonInfo.index}/index.json`;
              const res = await fetch(url);
              if (res.ok) {
                const text = await res.text();
                if (text.trim().startsWith('{')) {
                  finalJson = JSON.parse(text);
                }
              }
            } catch (e) { }
          }

          // Fallback: Use lesson description or introduction (common for Mission/Explore)
          if (!finalJson && (lessonInfo.description || lessonInfo.introduction)) {
            finalJson = {
              id: lessonId,
              title: lessonInfo.title || selectedQuarterly.title,
              segments: [{
                id: `${lessonId}-content`,
                title: lessonInfo.title || selectedQuarterly.title,
                type: 'markdown',
                blocks: [{
                  id: 'content-block',
                  type: 'markdown',
                  markdown: lessonInfo.description || lessonInfo.introduction
                }]
              }]
            };
          }

          // Fallback: Check for PDFs in the lesson itself
          if (!finalJson && lessonInfo.share?.shareGroups) {
            const pdfFiles = lessonInfo.share.shareGroups.find((g: any) => g.type === 'file' || g.title === 'PDF')?.files;
            if (pdfFiles && pdfFiles.length > 0) {
              finalJson = {
                id: lessonId,
                title: lessonInfo.title || selectedQuarterly.title,
                segments: [{
                  id: `${lessonId}-pdf`,
                  title: pdfFiles[0].title || lessonInfo.title,
                  type: 'pdf',
                  pdf: pdfFiles
                }]
              };
            }
          }
        }
      }

      if (!finalJson) {
        // Fallback: try resource hash
        const resourceUrl = `https://${subdomain}.sspmadventist.org/api/v3/${selectedLang}/ss/resources/${shortLessonId}/index.json`;
        try {
          const res = await fetch(resourceUrl);
          if (res.ok) {
            const text = await res.text();
            if (text.trim().startsWith('{')) {
              finalJson = JSON.parse(text);
            }
          }
        } catch (e) { }
      }

      if (!finalJson && selectedQuarterly) {
        // Fallback 1: Use the quarterly itself as content if it's a single-resource book
        if ((selectedQuarterly as any).introduction || selectedQuarterly.description) {
          finalJson = {
            id: lessonId,
            title: selectedQuarterly.title,
            segments: [{
              id: `${lessonId}-intro`,
              title: selectedQuarterly.title,
              type: 'markdown',
              blocks: [{
                id: 'intro-block',
                type: 'markdown',
                markdown: (selectedQuarterly as any).introduction || selectedQuarterly.description
              }]
            }]
          };
        }

        // Fallback 2: Check for PDFs in shareGroups (link or file)
        if (!finalJson) {
          const pdfFiles = (selectedQuarterly as any).share?.shareGroups?.find((g: any) => g.type === 'file' || g.title === 'PDF')?.files;
          const pdfLink = (selectedQuarterly as any).share?.shareGroups?.find((g: any) => g.type === 'link')?.links?.find((l: any) => l.src.endsWith('.pdf'));

          if (pdfFiles && pdfFiles.length > 0) {
            finalJson = {
              id: lessonId,
              title: selectedQuarterly.title,
              segments: [{
                id: `${lessonId}-pdf`,
                title: pdfFiles[0].title || selectedQuarterly.title,
                type: 'pdf',
                pdf: pdfFiles
              }]
            };
          } else if (pdfLink) {
            finalJson = {
              id: lessonId,
              title: selectedQuarterly.title,
              segments: [{
                id: `${lessonId}-pdf`,
                title: selectedQuarterly.title,
                type: 'pdf',
                pdf: [{ id: '1', title: selectedQuarterly.title, src: pdfLink.src }]
              }]
            };
          }
        }
      }

      if (!finalJson) {
        const errorText = (lastError as any)?.message || `Impossible de charger le contenu (${quarterlyPath}/${shortLessonId})`;
        throw new Error(errorText);
      }

      let normalizedData = finalJson;
      if (!finalJson.segments && finalJson.lessons) {
        normalizedData = { ...finalJson, segments: finalJson.lessons };
      }

      setReadingLesson(normalizedData);
      autoSelectSegment(normalizedData);
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
        const dateStr = (s.date && typeof s.date === 'string') ? s.date.trim() : "";

        // Handle range: "28/12/2024 - 03/01/2025" or with en-dash/em-dash
        if (dateStr.includes('-') || dateStr.includes('—') || dateStr.includes('–')) {
          const separator = dateStr.includes(' — ') ? ' — ' : dateStr.includes(' – ') ? ' – ' : ' - ';
          const parts = dateStr.split(separator);
          if (parts.length === 2) {
            const start = parseDate(parts[0].trim());
            const end = parseDate(parts[1].trim());
            return today >= start && today <= end;
          }
        }

        const sDate = parseDate(dateStr);
        return sDate.getTime() === today.getTime();
      });
    }
    setActiveSegmentIdx(foundIdx >= 0 ? foundIdx : 0);
  };

  const categories = useMemo(() => {
    const apiCats = Array.from(new Set(quarterlyList.map(item => item.groupTitle)))
      .filter(title => !!title && title.trim() !== '');
    return apiCats;
  }, [quarterlyList]);

  const matchCategory = (groupTitle: string, active: string): boolean => {
    if (!active) return true;
    const g = groupTitle.toLowerCase();
    const a = active.toLowerCase();
    return g.includes(a) || a.includes(g);
  };

  const filteredQuarterlies = useMemo(() => {
    if (!activeCategory) return quarterlyList;
    return quarterlyList.filter(item => matchCategory(item.groupTitle, activeCategory));
  }, [quarterlyList, activeCategory]);

  useEffect(() => {
    if (categories.length === 0) return;
    if (!activeCategory) return;
    const hasMatch = categories.some(cat => matchCategory(cat, activeCategory));
    if (!hasMatch) {
      setActiveCategory(categories[0]);
    }
  }, [categories]);

  useEffect(() => {
    setActiveCategory('');
  }, [selectedLang]);

  useEffect(() => {
    if (selectedLang !== 'mg') return;
    const loadEDS = async () => {
      try {
        const storedEDS = await AsyncStorage.getItem('profile_eds_class');
        if (storedEDS) setActiveCategory(storedEDS);
      } catch (e) {
        console.error(e);
      }
    };
    loadEDS();
  }, [selectedLang]);

  const cleanSspmMarkdown = (md: string) => {
    if (!md) return "";
    return md
      .replace(/\\\\\n/g, '\n')                 // Handle double backslash at end of line
      // Ultra-robust styled tag cleaning supporting nested braces (up to 3 levels)
      .replace(/\\?(\^)?\[([^\]]+)\]\(\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})\s*\)/g, '$2')
      .replace(/<span[^>]*>([\s\S]*?)<\/span>/g, '$1') // Strip span tags but keep content
      .replace(/<[^>]+>/g, '')                  // Strip other HTML tags
      .replace(/\{#.*?\}/g, '')                 // Remove custom ID anchors
      .replace(/Lesona faha/gi, 'Herinandro')   // Malagasy: Lesson -> Week
      .replace(/Leçon\s*(?=\d)/gi, 'Semaine ')  // French: Leçon -> Semaine
      .replace(/Lesson\s*(?=\d)/gi, 'Week ')    // English: Lesson -> Week
      .replace(/\n{3,}/g, '\n\n')               // Normalize multiple newlines
      .trim();
  };

  const extractTextRecursive = (block: ContentBlock): string => {
    let text = block.markdown || "";
    if (block.items && Array.isArray(block.items)) {
      const childrenText = block.items.map(i => extractTextRecursive(i)).filter(t => !!t).join("\n");
      text += (text && childrenText ? "\n" : "") + childrenText;
    }
    return text;
  };

  const handleShare = async () => {
    if (!selectedQuarterly || !readingLesson) return;
    try {
      const segment = readingLesson.segments[activeSegmentIdx];
      let cleanContent = "";

      if (segment.blocks && segment.blocks.length > 0) {
        const rawMarkdown = segment.blocks.map(b => extractTextRecursive(b)).join('\n\n');
        cleanContent = cleanSspmMarkdown(rawMarkdown);
      } else if (segment.type === 'pdf' && segment.pdf) {
        cleanContent = segment.pdf.map(p => `${p.title}: ${p.src}`).join('\n');
      }

      const quarterlyId = selectedQuarterly.id.replace('mg-ss-', '');
      const s0 = readingLesson.segments?.[0];
      const lessonId = (s0?.id && typeof s0.id === 'string') ? s0.id.split('-').slice(-2, -1)[0] : undefined;
      const dayId = (segment.name && typeof segment.name === 'string') ? segment.name : (activeSegmentIdx + 1).toString();
      const url = `${WEB_BASE}/${quarterlyId}/${lessonId}/${dayId}`;

      await RNShare.share({
        title: segment.title,
        message: `${segment.title}\n\n${cleanContent}\n\nNakana tao amin'ny Adventools\n${url}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleLinkPress = (url: string, data?: any) => {
    if (url.startsWith('sspmBible://')) {
      const bibleKey = url.replace('sspmBible://', '');
      if (data?.bible?.[bibleKey]) {
        const verseObj = data.bible[bibleKey];
        const fullText = extractTextRecursive(verseObj);

        // Clean title: 1Sam19 -> 1 Sam 19
        const formattedTitle = bibleKey.replace(/([0-9]+)/g, ' $1 ').replace(/\s+/g, ' ').trim();
        setVerseTitle(formattedTitle);
        setVerseContent(cleanSspmMarkdown(fullText));
        setVerseModalVisible(true);
        return false;
      }
    }
    Linking.openURL(url).catch(() => { });
    return true;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-slate-500 mt-4 font-medium">{t('loading')}</Text>
        </View>
      );
    }

    if (readingLesson) {
      const segment = readingLesson.segments[activeSegmentIdx];
      return (
        <View className="flex-1">
          <View className="px-6 py-2 border-b border-white/5 bg-background-dark/80 backdrop-blur-md">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {readingLesson.segments.map((s, idx) => {
                const isSelected = idx === activeSegmentIdx;
                return (
                  <TouchableOpacity
                    key={s.id || idx}
                    onPress={() => setActiveSegmentIdx(idx)}
                    className={`px-5 py-2 rounded-2xl mr-2 border ${isSelected ? 'bg-primary border-primary' : 'bg-slate-900 border-slate-800'}`}
                  >
                    <Text className={`font-bold text-[11px] ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                      {cleanSspmMarkdown(s.title).toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
            {segment ? (
              <>
                <View className="mb-8 p-6 bg-slate-900 rounded-[32px] border border-white/5 relative overflow-hidden shadow-xl shadow-black/20">
                  <View className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl opacity-50" />
                  <View className="flex-row items-center mb-3">
                    <Text className="text-primary font-bold text-[10px] uppercase tracking-[0.2em]">{segment.date || t('daily_study')}</Text>
                    {segment.type === 'pdf' && (
                      <View className="ml-3 px-2 py-0.5 bg-blue-500/20 rounded-full border border-blue-500/30">
                        <Text className="text-blue-400 font-bold text-[8px] uppercase">PDF</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-white text-2xl font-bold leading-tight" style={{ fontFamily: 'Lexend_700Bold' }}>{cleanSspmMarkdown(segment.title)}</Text>

                  <TouchableOpacity
                    onPress={handleShare}
                    className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10"
                  >
                    <Share size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {readingLesson.introduction && activeSegmentIdx === 0 && (
                  <View className="mb-8 p-6 bg-slate-400/5 rounded-3xl border border-white/5">
                    <View className="flex-row items-center mb-4">
                      <View className="w-1 h-4 bg-primary rounded-full mr-3" />
                      <Text className="text-white font-bold text-sm uppercase tracking-widest">{(t as any)('introduction') || 'Introduction'}</Text>
                    </View>
                    <Markdown
                      style={{
                        body: { color: '#94a3b8', fontSize: 13, lineHeight: 20, fontFamily: globalSettings.fontFamily },
                        strong: { color: '#cbd5e1', fontWeight: 'bold' }
                      }}
                    >
                      {cleanSspmMarkdown(readingLesson.introduction)}
                    </Markdown>
                  </View>
                )}

                {segment.type === 'pdf' && segment.pdf ? (
                  <View className="mt-4 mb-8">
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Documents disponibles</Text>
                    {segment.pdf.map((pdf, pIdx) => (
                      <TouchableOpacity
                        key={pdf.id || pIdx}
                        onPress={() => {
                          const fileName = pdf.src.split('/').pop() || 'document.pdf';
                          // For now, navigate to viewer or open URL
                          // Ideally we verify if downloaded or use public URL
                          router.push({
                            pathname: '/pdf/viewer',
                            params: {
                              uri: pdf.src,
                              title: pdf.title,
                              fileName: fileName
                            }
                          });
                        }}
                        className="bg-slate-900 p-5 rounded-3xl mb-3 flex-row items-center border border-white/5"
                      >
                        <View className="w-12 h-12 rounded-2xl bg-blue-500/10 items-center justify-center mr-4">
                          <FileText size={24} color="#3b82f6" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white font-bold text-base">{pdf.title}</Text>
                          <Text className="text-slate-500 text-xs mt-1">Format PDF • Ouvrir le lecteur</Text>
                        </View>
                        <ChevronRight size={20} color="#475569" />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : segment.blocks && segment.blocks.length > 0 ? (
                  segment.blocks.map((block, bIdx) => {
                    const renderBlockRecursive = (b: ContentBlock, idx: number, parentData?: any) => {
                      let content: React.ReactNode[] = [];
                      const blockData = b.data || parentData;

                      if (b.markdown) {
                        content.push(
                          <Markdown
                            key={`${b.id || idx}_md`}
                            onLinkPress={(url) => handleLinkPress(url, blockData)}
                            style={{
                              body: { color: '#cbd5e1', fontSize: globalSettings.fontSize, lineHeight: globalSettings.fontSize * 1.6, fontFamily: globalSettings.fontFamily },
                              heading1: { color: '#f8fafc', fontWeight: 'bold', marginTop: 30, marginBottom: 15, fontFamily: 'Lexend_700Bold' },
                              heading2: { color: '#3b82f6', fontWeight: 'bold', marginTop: 25, marginBottom: 10, fontFamily: 'Lexend_600SemiBold' },
                              heading3: { color: '#3b82f6', marginTop: 20, marginBottom: 10, fontFamily: 'Lexend_600SemiBold' },
                              strong: { color: '#f8fafc', fontWeight: 'bold' },
                              italic: { fontStyle: 'italic' },
                              blockquote: { backgroundColor: '#1e293b', borderLeftColor: '#3b82f6', borderLeftWidth: 4, padding: 10, marginVertical: 10 },
                              link: { color: '#3b82f6', textDecorationLine: 'none' }
                            }}
                          >
                            {cleanSspmMarkdown(b.markdown)}
                          </Markdown>
                        );
                      }

                      if (b.image) {
                        content.push(
                          <View key={`${b.id || idx}_img`} className="my-6 rounded-3xl overflow-hidden border border-white/5">
                            <Image
                              source={{ uri: b.image }}
                              style={{ width: '100%', height: 200 }}
                              resizeMode="cover"
                            />
                            {b.caption && (
                              <View className="bg-slate-900 p-4">
                                <Text className="text-slate-400 text-xs italic text-center">{b.caption}</Text>
                              </View>
                            )}
                          </View>
                        );
                      }

                      if (b.items && Array.isArray(b.items)) {
                        b.items.forEach((item, ii) => {
                          content.push(renderBlockRecursive(item, ii, blockData));
                        });
                      }

                      if (b.type === 'blockquote') {
                        return (
                          <View key={b.id || idx} className="bg-slate-900/50 border-l-4 border-primary p-4 my-3 rounded-r-xl">
                            {content}
                          </View>
                        );
                      }

                      return <View key={b.id || idx}>{content}</View>;
                    };

                    return renderBlockRecursive(block, bIdx);
                  })
                ) : (
                  <View className="flex-1 items-center justify-center py-20">
                    <Text className="text-slate-500">{t('no_content')}</Text>
                  </View>
                )}
              </>
            ) : (
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-slate-500">{t('no_content')}</Text>
              </View>
            )}
            <View className="h-20" />
          </ScrollView>
        </View>
      );
    }

    if (selectedQuarterly) {
      const downloadId = `${selectedLang}_${selectedQuarterly.id}`;
      const isDownloaded = downloadedQuarterlies.includes(downloadId);
      const isCurrent = isQuarterlyCurrent(selectedQuarterly);
      // Use lessons, or resources as fallback for Mission Spotlight-like resources
      const rawLessons = selectedQuarterly.lessons || (selectedQuarterly as any).resources || [];

      // Dynamic lesson count for categories that don't specify lessons (e.g. Babies)
      const isBabies = selectedQuarterly.id.includes('-bb-') || selectedQuarterly.id.includes('babies');
      const isGuide = selectedQuarterly.id.includes('-pb') || selectedQuarterly.id.includes('-pth') || selectedQuarterly.id.includes('guide');

      const weekLabel = selectedLang === 'mg' ? 'Herinandro' : (selectedLang === 'fr' ? 'Semaine' : (t('week' as any) || 'Week'));
      const lessons = rawLessons.length > 0 ? rawLessons : Array.from({ length: isBabies ? 3 : 13 }, (_, i) => ({
        id: `${selectedQuarterly.id}-${(i + 1).toString().padStart(2, '0')}`,
        title: isGuide ? `${cleanSspmMarkdown(selectedQuarterly.title)} - Part ${i + 1}` : `${weekLabel} ${i + 1}`,
        startDate: "",
        endDate: "",
        index: selectedQuarterly.index ? `${selectedQuarterly.index}/${(i + 1).toString().padStart(2, '0')}` : "",
        name: (i + 1).toString()
      }));

      const todayLessonId = getTodayLessonId(selectedQuarterly);

      return (
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          {/* Quarterly Card */}
          <View className="bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 mb-8 p-6 flex-row items-center">
            {selectedQuarterly.covers?.portrait ? (
              <Image source={{ uri: selectedQuarterly.covers.portrait }} className="w-20 h-28 rounded-lg mr-4" />
            ) : (
              <View className="w-20 h-28 rounded-lg mr-4 bg-slate-800 items-center justify-center">
                <BookOpen size={24} color="#475569" />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-white font-bold text-lg mb-1">{cleanSspmMarkdown(selectedQuarterly.title)}</Text>
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

            {todayLessonId && (
              <TouchableOpacity
                onPress={() => fetchWeeklyLesson(selectedQuarterly.id, todayLessonId)}
                className="px-5 py-2 rounded-2xl bg-primary border shadow-lg shadow-primary/20 border-primary/20 flex-row items-center"
              >
                <BookOpen size={14} color="white" />
                <Text className="text-white font-bold text-[11px] ml-2">{t('read_today')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="pb-10">
            {lessons.map((lesson: any, index: number) => {
              const lessonIdStr = (lesson.id && typeof lesson.id === 'string') ? lesson.id : "";
              const lessonNum = lessonIdStr.split('-').pop() || "";
              const isToday = lessonNum === todayLessonId;
              const actualTitle = lessonTitlesMap[lessonNum] || cleanSspmMarkdown((lesson as Lesson).title);

              return (
                <TouchableOpacity
                  key={lesson.id}
                  onPress={() => fetchWeeklyLesson(selectedQuarterly.id, lessonNum)}
                  className={`mb-4 rounded-[32px] overflow-hidden ${isToday ? 'border-2 border-primary' : 'bg-slate-900 border border-slate-800'}`}
                >
                  <View className={`p-5 flex-row items-center ${isToday ? 'bg-primary' : 'bg-slate-900'}`}>
                    <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${isToday ? 'bg-white/20' : 'bg-slate-800'}`}>
                      <Text className={`text-lg font-bold ${isToday ? 'text-white' : 'text-slate-400'}`}>{index + 1}</Text>
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Text
                          className={`font-bold text-base ${isToday ? 'text-white' : 'text-slate-300'}`}
                          numberOfLines={1}
                          style={{ fontFamily: 'Lexend_600SemiBold' }}
                        >
                          {cleanSspmMarkdown(actualTitle)}
                        </Text>
                        {isToday && (
                          <View className="ml-2 bg-white/20 px-2 py-0.5 rounded-full">
                            <Text className="text-white text-[8px] font-bold uppercase tracking-tighter">{t('updated')}</Text>
                          </View>
                        )}
                      </View>
                      <Text className={`text-[10px] uppercase tracking-tighter ${isToday ? 'text-blue-100' : 'text-slate-500'}`}>
                        {(lesson as Lesson).startDate} {(lesson as Lesson).startDate ? "—" : ""} {(lesson as Lesson).endDate}
                      </Text>
                    </View>

                    <View className={`w-10 h-10 rounded-full items-center justify-center ${isToday ? 'bg-white/20' : 'bg-slate-800/50'}`}>
                      <ChevronRight size={18} color={isToday ? "white" : "#475569"} />
                    </View>
                  </View>

                  {isToday && (
                    <View className="bg-white/10 px-5 py-3 flex-row items-center justify-between">
                      <Text className="text-white/80 text-[10px] font-medium">{t('daily_study')}</Text>
                      <Text className="text-white text-[10px] font-bold uppercase tracking-widest">{t('read_today')} →</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      );
    }

    return (
      <View className="flex-1 px-6">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-4 max-h-16">
          <TouchableOpacity
            onPress={() => setActiveCategory('')}
            className={`px-6 py-2 rounded-full mr-3 ${!activeCategory ? 'bg-primary' : 'bg-slate-900 border border-slate-800'}`}
          >
            <Text className={`font-bold text-xs ${!activeCategory ? 'text-white' : 'text-slate-400'}`}>
              {t('categories')} ·{quarterlyList.length}
            </Text>
          </TouchableOpacity>
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
                  onPress={() => fetchQuarterlyDetail(item.id, item.index)}
                  style={{ width: (width - 60) / 2 }}
                  className="bg-slate-900 rounded-[24px] overflow-hidden border border-slate-800 mb-6"
                >
                  <View className="relative">
                    <Image source={{ uri: item.covers.portrait }} className="w-full h-48" resizeMode="cover" />
                    {downloadedQuarterlies.includes(`${selectedLang}_${item.id}`) && (
                      <View className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 items-center justify-center">
                        <CheckCircle size={14} color="white" />
                      </View>
                    )}
                  </View>
                  <View className="p-4">
                    <Text className="text-primary font-bold text-[8px] uppercase tracking-widest mb-1" numberOfLines={1}>
                      {formatDateRange(item.startDate, item.endDate)}
                    </Text>
                    <Text className="text-white text-sm font-bold mb-1 h-10" numberOfLines={2} style={{ fontFamily: 'Lexend_700Bold' }}>
                      {cleanSspmMarkdown(item.title)}
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
              <Text className="text-white text-xl font-bold mb-3 text-center" style={{ fontFamily: 'Lexend_700Bold' }}>
                {t('no_content')}
              </Text>
              <Text className="text-slate-500 text-center leading-6">
                {t('check_connection_to_view')}
              </Text>
              {categories.length > 0 && (
                <TouchableOpacity
                  onPress={() => setActiveCategory(categories[0])}
                  className="mt-8 bg-primary/10 px-8 py-3 rounded-2xl border border-primary/20"
                >
                  <Text className="text-primary font-bold">{categories[0]}</Text>
                </TouchableOpacity>
              )}
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
            <Text className="text-xl font-bold text-white pr-2" style={{ fontFamily: 'Lexend_700Bold' }} numberOfLines={1}>
              {readingLesson ? cleanSspmMarkdown(readingLesson.title) : selectedQuarterly ? cleanSspmMarkdown(selectedQuarterly.title) : t('sabbath_school_lessons')}
            </Text>
            <View className="flex-row items-center">
              <Text className="text-slate-500 text-xs mr-2">
                {readingLesson ? t('daily_study') : SS_LANGUAGES.find(l => l.code === selectedLang)?.label || 'Sekoly Sabata'}
              </Text>
              {!readingLesson && !selectedQuarterly && (
                <TouchableOpacity
                  onPress={() => setShowLangPicker(true)}
                  className="flex-row items-center bg-primary/20 px-3 py-1 rounded-full border border-primary/30"
                >
                  <Globe size={12} color="#3b82f6" />
                  <Text className="text-primary font-bold text-[10px] ml-1 uppercase">{t('language') || 'Language'}</Text>
                  <ChevronRight size={10} color="#3b82f6" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {!readingLesson && !selectedQuarterly && (
          <TouchableOpacity
            onPress={loadInitialData}
            className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10"
          >
            <RefreshCw size={18} color="#94a3b8" />
          </TouchableOpacity>
        )
        }
      </View>

      {renderContent()}

      {/* Language Picker Modal */}
      <Modal
        visible={showLangPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLangPicker(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowLangPicker(false)}
          className="flex-1 bg-black/60 items-center justify-center px-10"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            className="w-full bg-slate-900 rounded-[32px] border border-slate-800 p-6"
          >
            <Text className="text-white text-lg font-bold mb-6 text-center">{t('choose_language')}</Text>
            {SS_LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => changeLang(lang.code)}
                className={`flex-row items-center p-4 rounded-2xl mb-3 border ${selectedLang === lang.code ? 'bg-primary/20 border-primary' : 'bg-white/5 border-white/5'}`}
              >
                <Text className="text-2xl mr-4">{lang.flag}</Text>
                <Text className={`text-base font-bold flex-1 ${selectedLang === lang.code ? 'text-primary' : 'text-white'}`}>{lang.label}</Text>
                {selectedLang === lang.code && <CheckCircle size={20} color="#3b82f6" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Verse Modal */}
      <Modal
        visible={verseModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setVerseModalVisible(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-slate-900 rounded-t-[40px] p-8 border-t border-white/10">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-primary font-bold text-xl">{verseTitle}</Text>
              <TouchableOpacity
                onPress={() => setVerseModalVisible(false)}
                className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
              >
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView className="max-h-[60vh]" showsVerticalScrollIndicator={false}>
              <Markdown
                style={{
                  body: { color: '#e2e8f0', fontSize: globalSettings.fontSize, lineHeight: globalSettings.fontSize * 1.6, fontFamily: globalSettings.fontFamily, fontStyle: 'italic' },
                  strong: { color: '#f8fafc', fontWeight: 'bold' },
                  heading3: { color: '#3b82f6', marginTop: 15, marginBottom: 5, fontFamily: 'Lexend_600SemiBold' }
                }}
              >
                {verseContent}
              </Markdown>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
