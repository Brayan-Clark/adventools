import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { checkMobileDataWarning } from '@/lib/data-saver';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle,
  ChevronRight,
  Download,
  FileText,
  Globe,
  Languages,
  RefreshCw,
  Share,
  Square,
  Trash2,
  X,
  PlayCircle,
  Headphones,
  FileDown,
  StickyNote,
  Edit,
  Footprints,
  Music,
  Bold,
  Italic,
  List,
  Heading,
  Camera,
  Video as VideoIcon,
  Mic,
  Database,
  HardDrive,
  Copy
} from 'lucide-react-native';
import { getAllNotes, saveNote } from '@/lib/user-storage';
import { cleanSspmMarkdown, stripMarkdownLinks, parseDate, formatDateRange } from '@/lib/utils';
import { QuarterlyItemSchema, QuarterlySchema, WeeklyLessonSchema, safeValidate } from '@/lib/schemas';
import { useToast } from '@/lib/toast-context';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, Alert, BackHandler, Image, KeyboardAvoidingView, Linking, Modal, Platform, Share as RNShare, ScrollView, TextInput, TouchableOpacity, useWindowDimensions, View, Pressable } from 'react-native';
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

const getShareSignature = (lang: string) => {
  switch (lang?.toLowerCase()) {
    case 'mg':
      return "Nakana tao amin'ny Adventools";
    case 'fr':
      return "Extrait de l'application Adventools";
    case 'en':
    default:
      return "Retrieved from Adventools";
  }
};

const getApiBase = (lang: string) => `https://inverse.sspmadventist.org/api/v3/${lang}/ss`;
const getAbsgBase = (lang: string) => `https://absg.sspmadventist.org/api/v3/${lang}/ss`;
const getStorageKey = (lang: string) => `adventools_ss_data_${lang}`;


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
  id?: string;
  title: string;
  segments: Segment[];
  introduction?: string;
  cover?: string;
  startDate?: string;
  audio?: any[];
  video?: any[];
  pdf?: any[];
}

import QuestionBlock from '@/components/lessons/QuestionBlock';
import SegmentSelector from '@/components/lessons/SegmentSelector';
import LessonHeader from '@/components/lessons/LessonHeader';
import QuarterlyCard from '@/components/lessons/QuarterlyCard';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { AppText as Text } from '@/components/ui/AppText';


const highlightReactTree = (
  element: any,
  sentenceHighlights: Record<string, string>,
  blockKey: string,
  introKey: string | undefined,
  paragraphIndex: number,
  sentenceRanges: Array<{ text: string; start: number; end: number }>,
  tracker: { offset: number }
): any => {
  if (!element) return element;

  if (Array.isArray(element)) {
    return element.map(child => highlightReactTree(child, sentenceHighlights, blockKey, introKey, paragraphIndex, sentenceRanges, tracker));
  }

  if (typeof element !== 'object' || !element.props) {
    return element;
  }

  let newChildren = element.props.children;
  if (newChildren) {
    if (typeof newChildren === 'string') {
      const textContent = newChildren;

      const rawParts: string[] = [];
      let lastIndex = 0;
      const regex = /[.!?]+(?:\s+|$)/g;
      let match;
      while ((match = regex.exec(textContent)) !== null) {
        const sentenceEnd = match.index + match[0].length;
        rawParts.push(textContent.substring(lastIndex, sentenceEnd));
        lastIndex = sentenceEnd;
      }
      if (lastIndex < textContent.length) {
        rawParts.push(textContent.substring(lastIndex));
      }

      let runningOffset = tracker.offset;

      const elements = rawParts.map((part, partIdx) => {
        if (part.length === 0) return null;

        const startOffset = runningOffset;
        const endOffset = startOffset + part.length;
        runningOffset = endOffset;

        let matchedHighlightColor: string | null = null;
        sentenceRanges.forEach((range, sentIdx) => {
          const sentKey = blockKey 
            ? `${blockKey}_p${paragraphIndex}_sent_${sentIdx}` 
            : (introKey ? `${introKey}_p${paragraphIndex}_sent_${sentIdx}` : `p${paragraphIndex}_sent_${sentIdx}`);
          
          const sentHighlight = sentenceHighlights[sentKey];
          if (sentHighlight) {
            if (startOffset < range.end && range.start < endOffset) {
              matchedHighlightColor = sentHighlight;
            }
          }
        });

        const existingStyle = element.props.style || {};
        return (
          <Text
            key={partIdx}
            style={matchedHighlightColor ? [
              existingStyle,
              {
                backgroundColor: matchedHighlightColor,
                color: '#ffffff',
              }
            ] : existingStyle}
          >
            {part}
          </Text>
        );
      }).filter(Boolean);

      tracker.offset = runningOffset;

      return React.cloneElement(element, {
        children: elements
      });
    } else {
      newChildren = highlightReactTree(newChildren, sentenceHighlights, blockKey, introKey, paragraphIndex, sentenceRanges, tracker);
      return React.cloneElement(element, { children: newChildren });
    }
  }

  return element;
};

export default function LesonaSekolySabata() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { settings: globalSettings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [quarterlyList, setQuarterlyList] = useState<QuarterlyItem[]>([]);
  const [selectedQuarterly, setSelectedQuarterly] = useState<Quarterly | null>(null);
  const [readingLesson, setReadingLesson] = useState<WeeklyLesson | null>(null);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);
  const [currentLessonId, setCurrentLessonId] = useState("");
  const [activeCategory, setActiveCategory] = useState("Lesona Lehibe (+ 35 taona)");
  const [lessonTitlesMap, setLessonTitlesMap] = useState<Record<string, string>>({});
  const [selectedLang, setSelectedLang] = useState<string>('mg');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const { qId: qIdParam, lId: lIdParam } = useLocalSearchParams();

  // Premium Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
    onConfirm?: () => void;
  }>({ visible: false, title: '', message: '', type: 'info' });

  // Storage State
  const [storageModalVisible, setStorageModalVisible] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ totalSize: 0, count: 0 });

  const calculateStorage = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(LESSONS_DIR);
      if (!dirInfo.exists) {
        setStorageInfo({ totalSize: 0, count: 0 });
        return;
      }
      const files = await FileSystem.readDirectoryAsync(LESSONS_DIR);
      let total = 0;
      let count = 0;
      for (const f of files) {
        if (f.endsWith('.json')) {
          const info = await FileSystem.getInfoAsync(LESSONS_DIR + f);
          if (info.exists) {
            total += (info as any).size || 0;
            count++;
          }
        }
      }
      setStorageInfo({ totalSize: total, count });
    } catch (e) {
      console.error(e);
    }
  };

  const clearStorage = async () => {
    try {
      const protectedFiles = new Set<string>();
      
      // 1. Collect all protected files from downloaded quarterlies
      for (const downloadId of downloadedQuarterlies) {
        const jsonPath = `${LESSONS_DIR}${downloadId}.json`;
        protectedFiles.add(jsonPath);
        
        try {
          const content = await FileSystem.readAsStringAsync(jsonPath);
          // Simple regex to find all local FileSystem URIs inside the JSON
          const matches = content.match(/file:\/\/[^"]+ss_offline\/[^"\\]+/g);
          if (matches) {
            matches.forEach(m => protectedFiles.add(m));
          }
        } catch (e) {
          // File might not exist or error reading
        }
      }
      
      // 2. Iterate over directory and delete non-protected files
      const files = await FileSystem.readDirectoryAsync(LESSONS_DIR);
      let deletedCount = 0;
      for (const f of files) {
        const fullPath = `${LESSONS_DIR}${f}`;
        if (!protectedFiles.has(fullPath)) {
          await FileSystem.deleteAsync(fullPath, { idempotent: true });
          deletedCount++;
        }
      }
      
      // 3. Re-calculate remaining storage size
      const newFiles = await FileSystem.readDirectoryAsync(LESSONS_DIR);
      let total = 0;
      for (const f of newFiles) {
        if (f.endsWith('.json') && f !== 'storage_info.json') {
           const info = await FileSystem.getInfoAsync(LESSONS_DIR + f);
           if (info.exists) {
             total += (info as any).size || 0;
           }
        }
      }
      
      setStorageInfo({ totalSize: total, count: downloadedQuarterlies.length });
      setStorageModalVisible(false);
      showToast(`${deletedCount} fichiers temporaires purgés`, 'success');
    } catch (e) {
      console.error(e);
      showToast(t('error'), 'error');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    const loadSavedLang = async () => {
      const saved = await AsyncStorage.getItem('adventools_ss_selected_lang');
      if (saved) setSelectedLang(saved);
      else if (globalSettings.language && globalSettings.language.toLowerCase().includes('anglais')) setSelectedLang('en');
      else if (globalSettings.language && globalSettings.language.toLowerCase().includes('français')) setSelectedLang('fr');
    };
    loadSavedLang();
  }, [globalSettings.language]);

  useEffect(() => {
    if (qIdParam && !selectedQuarterly) {
      fetchQuarterlyDetail(qIdParam as string);
    }
  }, [qIdParam]);

  useEffect(() => {
    if (lIdParam && selectedQuarterly && !readingLesson) {
      fetchWeeklyLesson(selectedQuarterly.id, lIdParam as string);
    }
  }, [lIdParam, selectedQuarterly]);

  useEffect(() => {
    const backAction = () => {
      if (readingLesson) {
        setReadingLesson(null);
        setCurrentLessonId("");
        router.setParams({ lId: undefined });
        return true;
      }
      if (selectedQuarterly) {
        setSelectedQuarterly(null);
        router.setParams({ qId: undefined });
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [readingLesson, selectedQuarterly]);

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

  // Highlights State
  const [highlights, setHighlights] = useState<Record<string, string>>({});
  const [highlightPaletteVisible, setHighlightPaletteVisible] = useState(false);
  const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(null);

  // Sentence-Level Highlights State
  const [sentenceHighlights, setSentenceHighlights] = useState<Record<string, string>>({});
  const [isHighlightModeActive, setIsHighlightModeActive] = useState(false);
  const [activeHighlightColor, setActiveHighlightColor] = useState('rgba(251, 191, 36, 0.35)');
  const [activeHighlightOpacity, setActiveHighlightOpacity] = useState(0.35);
  const [isHighlighterPanelExpanded, setIsHighlighterPanelExpanded] = useState(false);

  // Completed Days State
  const [completedDays, setCompletedDays] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadHighlightsAndCompletions = async () => {
      try {
        const storedHighlights = await AsyncStorage.getItem('ss_highlights');
        if (storedHighlights) {
          setHighlights(JSON.parse(storedHighlights));
        }
        const storedSentHighlights = await AsyncStorage.getItem('ss_sentence_highlights');
        if (storedSentHighlights) {
          setSentenceHighlights(JSON.parse(storedSentHighlights));
        }
        const storedCompletions = await AsyncStorage.getItem('ss_completed_days');
        if (storedCompletions) {
          setCompletedDays(JSON.parse(storedCompletions));
        }
      } catch (e) {
        console.error("Error loading highlights/completions", e);
      }
    };
    loadHighlightsAndCompletions();
  }, []);

  const saveHighlight = async (key: string, color: string) => {
    try {
      const newHighlights = { ...highlights };
      if (color) {
        newHighlights[key] = color;
      } else {
        delete newHighlights[key];
      }
      setHighlights(newHighlights);
      await AsyncStorage.setItem('ss_highlights', JSON.stringify(newHighlights));
      setHighlightPaletteVisible(false);
    } catch (e) {
      console.error("Error saving highlight", e);
    }
  };

  const handleSentencePress = async (sentKey: string) => {
    try {
      const newHighlights = { ...sentenceHighlights };
      if (newHighlights[sentKey]) {
        delete newHighlights[sentKey];
      } else {
        newHighlights[sentKey] = activeHighlightColor;
      }
      setSentenceHighlights(newHighlights);
      await AsyncStorage.setItem('ss_sentence_highlights', JSON.stringify(newHighlights));
    } catch (e) {
      console.error("Error saving sentence highlight", e);
    }
  };

  const updateHighlightColor = (rgb: string, opacity: number) => {
    setActiveHighlightColor(`rgba(${rgb}, ${opacity})`);
    setActiveHighlightOpacity(opacity);
  };

  const toggleDayCompletion = async (dayKey: string) => {
    try {
      const newCompletions = { ...completedDays };
      newCompletions[dayKey] = !newCompletions[dayKey];
      setCompletedDays(newCompletions);
      await AsyncStorage.setItem('ss_completed_days', JSON.stringify(newCompletions));
    } catch (e) {
      console.error("Error saving day completion", e);
    }
  };

  const splitBlockIntoSentences = (markdown: string) => {
    const plainText = cleanSspmMarkdown(markdown);
    return plainText.match(/[^.!?]+[.!?]+(\s+|$)/g) || [plainText];
  };

  // Quick Note state
  const [quickNoteModalVisible, setQuickNoteModalVisible] = useState(false);
  const [editingQuickNote, setEditingQuickNote] = useState<any>(null);

  // Quick Note Voice Recording
  const [quickRecording, setQuickRecording] = useState<any>(null);
  const [isQuickRecording, setIsQuickRecording] = useState(false);
  const [quickRecordDuration, setQuickRecordDuration] = useState(0);
  const quickRecordIntervalRef = useRef<any>(null);
  const [showQuickVoiceModal, setShowQuickVoiceModal] = useState(false);

  useEffect(() => {
    return () => {
      if (quickRecordIntervalRef.current) {
        clearInterval(quickRecordIntervalRef.current);
      }
    };
  }, []);

  const startQuickRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Microphone bloqué", "L'autorisation du micro est nécessaire pour enregistrer.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      if (quickRecording) { 
        try { await quickRecording.stopAndUnloadAsync(); } catch (e) { } 
      }
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setQuickRecording(newRecording);
      setIsQuickRecording(true);
      setQuickRecordDuration(0);
      if (quickRecordIntervalRef.current) clearInterval(quickRecordIntervalRef.current);
      quickRecordIntervalRef.current = setInterval(() => setQuickRecordDuration(prev => prev + 1), 1000);
    } catch (err) {
      console.error("Start Quick Recording error:", err);
      setIsQuickRecording(false);
      setQuickRecording(null);
    }
  };

  const stopQuickRecording = async (save: boolean = true) => {
    if (!quickRecording) return;
    try {
      if (quickRecordIntervalRef.current) clearInterval(quickRecordIntervalRef.current);
      setIsQuickRecording(false);
      await (quickRecording as Audio.Recording).stopAndUnloadAsync();
      const uri = (quickRecording as Audio.Recording).getURI();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      if (save && uri && editingQuickNote) {
        const pUri = await saveFilePermanently(uri, 'voice');
        const tag = `[audio: ${pUri}]`;
        insertMarkdownToQuickNote(tag, '');
      }
    } catch (e) { 
      console.error("Stop Quick Recording Error", e); 
    } finally {
      setQuickRecording(null); 
      setQuickRecordDuration(0); 
      setShowQuickVoiceModal(false);
    }
  };

  const openNoteForVerse = async (title: string) => {
    try {
      // Look for an existing note in the global journal for this verse/lesson
      const allNotes = await getAllNotes();
      let existingNote = allNotes.find((n: any) => n.title === title);
      
      if (!existingNote) {
        // New note: pre-fill with the verse content so the user can annotate it
        existingNote = {
          id: Date.now().toString() + Math.random().toString(),
          type: 'text',
          title: title,
          content: verseContent ? `> ${verseContent}\n\n` : '',
          date: Date.now(),
          color: '#1e293b'
        };
      }
      
      setEditingQuickNote(existingNote);
      setQuickNoteModalVisible(true);
    } catch (error) {
      console.error("Error opening note for verse", error);
    }
  };

  const saveFilePermanently = async (uri: string, type: 'image' | 'voice' | 'video'): Promise<string> => {
    try {
      const docDir = FileSystem.documentDirectory;
      if (!docDir) return uri;

      const notesDir = `${docDir}adventools_notes/`;
      const dirInfo = await FileSystem.getInfoAsync(notesDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(notesDir, { intermediates: true });
      }
      const filename = `${type}_${Date.now()}.${uri.split('.').pop() || 'tmp'}`;
      const newUri = `${notesDir}${filename}`;
      await FileSystem.copyAsync({ from: uri, to: newUri });
      return newUri;
    } catch (e) {
      console.error("Failed to save file permanently", e);
      return uri;
    }
  };

  const handleSaveQuickNote = async () => {
    if (!editingQuickNote) return;
    try {
      // Save to the global journal — this is the "Journal d'étude" from the verse modal
      await saveNote(editingQuickNote);
      setQuickNoteModalVisible(false);
      showToast(t('note_saved' as any) || "Note enregistrée dans votre journal.", 'success');
    } catch (error) {
      console.error("Error saving quick note", error);
    }
  };

  const insertMarkdownToQuickNote = (before: string, after: string = '') => {
    if (!editingQuickNote) return;
    const prev = editingQuickNote.content;
    // We don't have selection state in QuickNoteModal yet, so we append at end or we add selection state
    setEditingQuickNote({ ...editingQuickNote, content: prev + before + after });
  };

  const pickAndInsertMediaToQuickNote = async (type: 'image' | 'video' | 'audio') => {
    try {
      if (type === 'audio') {
        const r = await DocumentPicker.getDocumentAsync({
          type: 'audio/*',
          copyToCacheDirectory: true
        });

        if (!r.canceled && editingQuickNote && r.assets && r.assets.length > 0) {
          const asset = r.assets[0];
          const permanentUri = await saveFilePermanently(asset.uri, 'voice');
          const tag = `[audio: ${permanentUri}]`;
          insertMarkdownToQuickNote(tag, '');
        }
      } else {
        let options: any = {
          mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: type === 'image',
          quality: 0.8,
        };

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;

        const r = await ImagePicker.launchImageLibraryAsync(options);

        if (!r.canceled && editingQuickNote) {
          const asset = r.assets[0];
          const permanentUri = await saveFilePermanently(asset.uri, type === 'video' ? 'video' : 'image');
          const tag = `[${type}: ${permanentUri}]`;
          insertMarkdownToQuickNote(tag, '');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      checkDownloaded();
    }, [selectedLang])
  );
  
  // Custom hardware back button handling
  useEffect(() => {
    const onBackPress = () => {
      if (readingLesson) {
        setReadingLesson(null);
        setCurrentLessonId("");
        return true;
      }
      if (selectedQuarterly) {
        setSelectedQuarterly(null);
        return true;
      }
      return false;
    };

    const handler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => handler.remove();
  }, [readingLesson, selectedQuarterly]);

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

      // Fetch fresh with cache busting
      let url = `${getApiBase(selectedLang)}/index.json?t=${Date.now()}`;
      if (selectedLang === 'en') url = `${getAbsgBase(selectedLang)}/index.json?t=${Date.now()}`;

      const response = await fetch(url).catch(() => null);
      let items: QuarterlyItem[] = [];

      if (response && response.ok) {
        const data = await response.json();
        if (data && data.groups) {
          data.groups.forEach((group: any) => {
            if (group.resources) {
              group.resources.forEach((res: any) => {
                const validated = QuarterlyItemSchema.safeParse({
                  ...res,
                  groupTitle: group.title || ""
                });
                if (validated.success) {
                  items.push(validated.data);
                } else {
                  console.warn("[Zod] QuarterlyItem validation failed:", validated.error.format());
                }
              });
            }
          });
        }
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
      const downloadId = `${selectedLang}_${id}`;
      const cacheKey = `adventools_ss_q_detail_${downloadId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const json = JSON.parse(cached);
        setSelectedQuarterly(json);
        loadLessonTitles(json);
        
        // If it's already downloaded, we don't need to fetch from network
        if (downloadedQuarterlies.includes(downloadId)) {
          setLoading(false);
          return;
        }
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

      const response = await fetch(`${url}?t=${Date.now()}`).catch(() => null);
      if (response && response.ok) {
        const json = await response.json();
        const validated = safeValidate(QuarterlySchema, json, json);
        setSelectedQuarterly(validated);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(validated));
        loadLessonTitles(validated);
      } else if (!cached) {
        throw new Error("Impossible de charger les données et aucun cache disponible.");
      }
    } catch (e: any) {
      console.error(e);
      if (!selectedQuarterly) {
        setAlertConfig({
          visible: true,
          title: t('connection_error'),
          message: t('check_connection'),
          type: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLessonTitles = async (q: Quarterly) => {
    const isBabies = q.id.includes('-bb-') || q.id.includes('babies');
    const isGuide = q.id.includes('-pb') || q.id.includes('-pth') || q.id.includes('guide');
    const weekLabel = selectedLang === 'mg' ? 'Herinandro' : (selectedLang === 'fr' ? 'Semaine' : (t('week' as any) || 'Week'));
    const lessons = q.lessons || Array.from({ length: isBabies ? 3 : 13 }, (_, i) => ({
      id: `${q.id}-${(i + 1).toString().padStart(2, '0')}`,
      title: isGuide ? `${cleanSspmMarkdown(q.title)} - Part ${i + 1}` : `${weekLabel} ${i + 1}`
    }));

    try {
      const titles: Record<string, string> = {};
      
      // Load cached titles from AsyncStorage first
      const cacheKey = `adventools_ss_lesson_titles_${selectedLang}_${q.id}`;
      const cachedTitlesStr = await AsyncStorage.getItem(cacheKey);
      let cachedTitles: Record<string, string> = {};
      if (cachedTitlesStr) {
        try {
          cachedTitles = JSON.parse(cachedTitlesStr);
        } catch (_) {}
      }

      lessons.forEach((l: any) => {
        const lIdStr = (l.id && typeof l.id === 'string') ? l.id : "";
        const lId = lIdStr.split('-').pop();
        if (lId) {
          const lTitle = cachedTitles[lId] || l.title || l.name || "";
          if (lTitle) titles[lId] = lTitle;
        }
      });
      setLessonTitlesMap(titles);

      const prefix = `${selectedLang}-`;
      
      // Helper function to check if a title is a generic placeholder and needs a fetch
      const isPlaceholderTitle = (tName: string): boolean => {
        const low = tName.trim().toLowerCase();
        return !low || 
               low.includes('herinandro') || 
               low.includes('semaine') || 
               low.includes('week') || 
               low.includes('part') ||
               low.includes('lesson') ||
               low.includes('leçon') ||
               low.includes('lecon') ||
               low.includes('andro') ||
               !!low.match(/^(lesson|leçon|lecon|andro|week|herinandro|semaine)\s*\d+/i);
      };

      const lessonsToFetch = lessons.filter((l: any) => {
        const lIdStr = (l.id && typeof l.id === 'string') ? l.id : "";
        const lId = lIdStr.split('-').pop();
        if (!lId) return false;
        
        // If we already have a real title in cachedTitles (not a placeholder), don't fetch
        if (cachedTitles[lId] && !isPlaceholderTitle(cachedTitles[lId])) {
          return false;
        }

        const currentTitle = titles[lId] || '';
        return isPlaceholderTitle(currentTitle);
      });

      if (lessonsToFetch.length === 0) return;

      // US-14: Batch fetch titles (3 at a time) to avoid network saturation
      const batchSize = 3;
      let hasNewTitles = false;
      for (let i = 0; i < lessonsToFetch.length; i += batchSize) {
        const batch = lessonsToFetch.slice(i, i + batchSize);
        await Promise.all(batch.map(async (l: any) => {
          const lId = l.id.split('-').pop();
          if (!lId) return;

          let lUrl: string;
          if (q.index) {
            const sub = (q.index.includes('/mg/') || q.id.includes('-cq')) ? 'inverse' : 'absg';
            lUrl = `https://${sub}.sspmadventist.org/api/v3/${q.index}/${lId}/index.json`;
          } else {
            const qPart = q.id.replace(prefix, '').replace('mg-', '').replace('ss-', '').replace('aij-', '').replace('explore-', '').replace(/-/g, '/');
            const sub = (q.id.includes('-cq')) ? 'inverse' : 'absg';
            const section = (q.id.includes('-bb-') || q.id.includes('-aij-') || q.id.includes('babies')) ? 'aij' : (q.id.includes('explore') || q.id.includes('mission-spotlight')) ? 'explore' : 'ss';
            lUrl = `https://${sub}.sspmadventist.org/api/v3/${selectedLang}/${section}/${qPart}/${lId}/index.json?t=${Date.now()}`;
          }

          try {
            const res = await fetch(lUrl);
            const text = await res.text();
            if (text.trim().startsWith('{')) {
              const lJson = JSON.parse(text);
              if (lJson.title) {
                const cleanedTitle = cleanSspmMarkdown(lJson.title);
                titles[lId] = cleanedTitle;
                cachedTitles[lId] = cleanedTitle;
                hasNewTitles = true;
                setLessonTitlesMap(prev => ({ ...prev, [lId]: cleanedTitle }));
              }
            }
          } catch (e) {
            // Silently fail for background title loading
          }
        }));
        // Small delay between batches
        if (i + batchSize < lessonsToFetch.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      if (hasNewTitles) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedTitles));
      }
    } catch (e) {
      console.error("Error loading titles", e);
    }
  };

  const downloadAndCacheFile = async (url: string, prefix: string): Promise<string> => {
    if (!url || !url.startsWith('http')) return url;
    try {
      const fileName = url.split('/').pop()?.split('?')[0] || `file_${Date.now()}`;
      const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const localUri = `${LESSONS_DIR}${prefix}_${cleanFileName}`;
      
      const info = await FileSystem.getInfoAsync(localUri);
      if (info.exists) return localUri;

      await FileSystem.downloadAsync(url, localUri);
      return localUri;
    } catch (e) {
      console.error("Download file error", url, e);
      return url;
    }
  };

  const downloadFullQuarterly = async (q: Quarterly) => {
    if (downloadingAll) return;

    checkMobileDataWarning("Téléchargement complet du Trimestre", async () => {
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

      // Download Quarterly Covers
      const qPrefix = `q_${q.id}`;
      if (q.covers) {
        if (q.covers.portrait) q.covers.portrait = await downloadAndCacheFile(q.covers.portrait, qPrefix);
        if (q.covers.landscape) q.covers.landscape = await downloadAndCacheFile(q.covers.landscape, qPrefix);
        if (q.covers.square) q.covers.square = await downloadAndCacheFile(q.covers.square, qPrefix);
      }

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
              const currentSect = quarterlyPath.split('/')[1];
              if (sections.includes(currentSect)) {
                sections.splice(sections.indexOf(currentSect), 1);
                sections.unshift(currentSect);
              }
            }

            let lessonJson = null;
            let networkError = false;
            for (const section of sections) {
              if (lessonJson) break;
              const pathAttempt = quarterlyPath.replace(/\/(ss|aij|explore)\//, `/${section}/`);
              const url = `https://${subdomain}.sspmadventist.org/api/v3/${pathAttempt}/${lessonId}/index.json?t=${Date.now()}`;
              try {
                const res = await fetch(url);
                if (res.ok) {
                  const text = await res.text();
                  if (text.trim().startsWith('{')) {
                    lessonJson = JSON.parse(text);
                  }
                }
              } catch (e) {
                networkError = true;
              }
            }

            if (networkError && !lessonJson) {
               throw new Error("Network failed during download");
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
              }
            }

            if (lessonJson) {
              const lPrefix = `l_${q.id}_${lessonId}`;
              
              // Download Lesson Cover
              if (lessonJson.cover) {
                lessonJson.cover = await downloadAndCacheFile(lessonJson.cover, lPrefix);
              }

              // Download PDFs in segments
              if (lessonJson.segments) {
                for (let s of lessonJson.segments) {
                  if (s.type === 'pdf' && s.pdf) {
                    for (let p of s.pdf) {
                      if (p.src) {
                        p.src = await downloadAndCacheFile(p.src, lPrefix);
                      }
                    }
                  }
                }
              }

              const storageKey = `${OFFLINE_LESSONS_PREFIX}${selectedLang}_${q.id}_${lessonId}.json`;
              await FileSystem.writeAsStringAsync(`${LESSONS_DIR}${storageKey}`, JSON.stringify(lessonJson));
              
              // Map to lessonsData for the quarterly summary file
              if (lessonId) {
                lessonsData[lessonId] = lessonJson;
              }
              successCount++;
            }
          } catch (le) { 
            console.error("Lesson DL error", le); 
            throw le; 
          }
        }));
        await new Promise(r => setTimeout(r, 100));
      }

      if (successCount === 0) throw new Error("Impossible de télécharger le contenu");

      const downloadId = `${selectedLang}_${q.id}`;
      const filePath = `${LESSONS_DIR}${downloadId}.json`;
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(lessonsData));

      await AsyncStorage.setItem(`adventools_ss_q_detail_${downloadId}`, JSON.stringify(q));

      setDownloadedQuarterlies(prev => prev.includes(downloadId) ? prev : [...prev, downloadId]);
      showToast(`${t('download_success')} (${successCount} leçons)`, 'success');
    } catch (e) {
      console.error(e);
      setAlertConfig({
        visible: true,
        title: t('error'),
        message: t('download_failed'),
        type: 'error'
      });
      } finally {
        setDownloadingAll(false);
      }
    });
  };

  const deleteQuarterly = async (qId: string) => {
    setAlertConfig({
      visible: true,
      title: t('delete_offline'),
      message: t('confirm_delete_all'),
      type: 'error',
      onConfirm: async () => {
        try {
          const downloadId = `${selectedLang}_${qId}`;
          const filePath = `${LESSONS_DIR}${downloadId}.json`;
          const info = await FileSystem.getInfoAsync(filePath);
          if (info.exists) {
            await FileSystem.deleteAsync(filePath);
          }
          await AsyncStorage.removeItem(`adventools_ss_q_detail_${downloadId}`);
          setDownloadedQuarterlies(prev => prev.filter(id => id !== downloadId));
          showToast(t('delete_success'), 'success');
        } catch (e) {
          console.error(e);
          showToast(t('delete_doc_error'), 'error');
        }
      }
    });
  };


  const enhanceLessonWithMedia = async (lesson: WeeklyLesson, quarterlyId: string, lessonId: string) => {
    let finalJson: any = { ...lesson };
    try {
      const qClean = quarterlyId.replace(/^[a-z]{2}-/, "").replace("ss-", "");
      let shortLessonId = lessonId.split('-').pop() || "";
      if (shortLessonId.length === 1) shortLessonId = shortLessonId.padStart(2, '0');

      const ad_qId = qClean;
      const audioUrl = `https://sabbath-school.adventech.io/api/v2/${selectedLang}/quarterlies/${ad_qId}/audio.json`;
      const videoUrl = `https://sabbath-school.adventech.io/api/v2/${selectedLang}/quarterlies/${ad_qId}/video.json`;
      const v2LessonUrl = `https://sabbath-school.adventech.io/api/v2/${selectedLang}/quarterlies/${ad_qId}/lessons/${shortLessonId}/index.json`;
      
      const [audioRes, videoRes, v2LessonRes] = await Promise.all([
        fetch(audioUrl).catch(() => null),
        fetch(videoUrl).catch(() => null),
        fetch(v2LessonUrl).catch(() => null)
      ]);
      
      const targetPattern = `${ad_qId}/${shortLessonId}`;
      
      if (v2LessonRes && v2LessonRes.ok) {
        try {
          const v2Data = await v2LessonRes.json();
          if (v2Data.pdfs && v2Data.pdfs.length > 0) finalJson.pdf = v2Data.pdfs;
          if (v2Data.cover && !finalJson.cover) finalJson.cover = v2Data.cover;
        } catch (je) { console.log("JSON Parse error v2Lesson"); }
      }

      if (audioRes && audioRes.ok) {
        try {
          const audioData = await audioRes.json();
          if (Array.isArray(audioData)) {
            const lessonAudio = audioData.filter((t: any) => 
               (t.target && t.target.includes(targetPattern)) || 
               (t.targetIndex && t.targetIndex === lessonId)
            );
            if (lessonAudio.length > 0) finalJson.audio = lessonAudio;
          }
        } catch (je) { console.log("JSON Parse error audio"); }
      }
      
      if (videoRes && videoRes.ok) {
        try {
          const videoData = await videoRes.json();
          if (Array.isArray(videoData)) {
            let lessonVideo: any[] = [];
            videoData.forEach((v: any) => {
               if (v.clips && Array.isArray(v.clips)) {
                  const clips = v.clips.filter((c: any) => 
                     (c.target && (c.target.includes(targetPattern) || c.target.includes(lessonId))) || 
                     (c.targetIndex && (c.targetIndex === lessonId || c.targetIndex.includes(targetPattern)))
                  );
                  lessonVideo = lessonVideo.concat(clips);
               }
            });
            if (lessonVideo.length > 0) finalJson.video = lessonVideo;
          }
        } catch (je) { console.log("JSON Parse error video"); }
      }
      
      // Mission Quarterly specific enhancement (Direct from adventistmission.org)
      const isMission = quarterlyId.toLowerCase().includes('mission') || 
                        quarterlyId.toLowerCase().includes('mq') ||
                        (selectedQuarterly?.title && selectedQuarterly.title.toLowerCase().includes('mission'));

      if (isMission) {
         const parts = quarterlyId.split('-');
         const yearFull = parts.find(p => p.match(/^\d{4}$/)) || new Date().getFullYear().toString();
         const quarterPart = parts.find(p => p.match(/^0[1-4]$|^[1-4]$/)) || "02";
         
         const YY = yearFull.substring(2);
         const Q = parseInt(quarterPart);
         const W = parseInt(shortLessonId) || 1;
         
         const mqaPdf = `https://am.adventistmission.org/mqa${YY}q${Q}.pdf`;
         const storyUrl = `https://am.adventistmission.org/a${YY}${Q}${W}`;
         
         if (!finalJson.pdf) finalJson.pdf = [];
         if (!finalJson.pdf.some((p: any) => p.src === mqaPdf)) {
             finalJson.pdf.unshift({ src: mqaPdf, title: `Mission Quarterly PDF (Q${Q} ${yearFull})` });
         }
         
         // Fallback for missing/scanty content in segments
         if (finalJson.segments) {
           finalJson.segments.forEach((seg: any) => {
              const hasActualStory = seg.blocks && seg.blocks.some((b: any) => b.markdown && b.markdown.length > 200);
              if (!hasActualStory) {
                 if (!seg.blocks) seg.blocks = [];
                 seg.blocks.push({
                    type: 'markdown',
                    markdown: `### Mission Story - Week ${W}\n\n[**Cliquez ici pour lire l'histoire complète sur le web**](${storyUrl})\n\nLe contenu textuel complet n'est pas fourni dans ce flux. Veuillez utiliser le bouton **PDF d'archive** en haut à droite (icône orange) pour lire le manuel officiel.`
                 });
              }
           });
         }
      }
      
      setReadingLesson(prev => prev ? ({ ...prev, ...finalJson }) : finalJson);
    } catch (e) {
       console.log("Global media error:", e);
    }
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
          setCurrentLessonId(lessonId);
          setLoading(false);
          autoSelectSegment(offlineData[lessonId]);
          enhanceLessonWithMedia(offlineData[lessonId], quarterlyId, lessonId);
          return;
        }
      }

      let quarterlyPath = selectedQuarterly?.index;
      const langPrefix = `${selectedLang}-`;

      const storageKey = `${OFFLINE_LESSONS_PREFIX}${selectedLang}_${quarterlyId}_${lessonId}.json`;
      const localUri = `${LESSONS_DIR}${storageKey}`;
      const localInfo = await FileSystem.getInfoAsync(localUri);
      
      if (localInfo.exists) {
        const localContent = await FileSystem.readAsStringAsync(localUri);
        const localJson = JSON.parse(localContent);
        setReadingLesson(localJson);
        autoSelectSegment(localJson);
        setLoading(false);
        return;
      }

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
      
      const validated = safeValidate(WeeklyLessonSchema, normalizedData, normalizedData);
      enhanceLessonWithMedia(validated, quarterlyId, lessonId);
      normalizedData = validated;

      setReadingLesson(normalizedData);
      setCurrentLessonId(lessonId);
      autoSelectSegment(normalizedData);
    } catch (e: any) {
      console.error("Error fetching weekly lesson", e);
      setAlertConfig({
        visible: true,
        title: t('error'),
        message: `${t('no_content')}: ${e.message}`,
        type: 'error'
      });
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
        cleanContent = stripMarkdownLinks(rawMarkdown);
      } else if (segment.type === 'pdf' && segment.pdf) {
        cleanContent = segment.pdf.map(p => `${p.title}: ${p.src}`).join('\n');
      }

      const quarterlyId = selectedQuarterly.id.replace('mg-ss-', '');
      const s0 = readingLesson.segments?.[0];
      const lessonId = (s0?.id && typeof s0.id === 'string') ? s0.id.split('-').slice(-2, -1)[0] : undefined;
      const dayId = (segment.name && typeof segment.name === 'string') ? segment.name : (activeSegmentIdx + 1).toString();
      const url = `${WEB_BASE}/${quarterlyId}/${lessonId}/${dayId}`;

      const signature = getShareSignature(selectedLang);

      await RNShare.share({
        title: segment.title,
        message: `${segment.title}\n\n${cleanContent}\n\n${signature}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleLinkPress = (url: string, data?: any) => {
    if (url.startsWith('sspmBible://')) {
      const bibleKey = decodeURIComponent(url.replace('sspmBible://', ''));
      
      // Look up and format the verses
      let combinedText = "";
      const matchedKeys: string[] = [];
      
      if (data?.bible?.[bibleKey]) {
        const verseObj = data.bible[bibleKey];
        combinedText = extractTextRecursive(verseObj);
        matchedKeys.push(bibleKey);
      } else {
        const normTarget = bibleKey.toLowerCase().replace(/[\s\.]/g, '');
        const exactNormKey = Object.keys(data?.bible || {}).find(k => 
          k.toLowerCase().replace(/[\s\.]/g, '') === normTarget
        );
        if (exactNormKey) {
          combinedText = extractTextRecursive(data.bible[exactNormKey]);
          matchedKeys.push(exactNormKey);
        } else {
          const bookMatch = bibleKey.match(/^([0-9]*\s*[a-zA-Z\s\.]+)/);
          const bookPrefix = bookMatch ? bookMatch[1].replace(/[\s\.]/g, '') : '';
          
          const parts = bibleKey.split(/[;]+/);
          let currentBook = bookPrefix;
          
          parts.forEach(part => {
            let cleanPart = part.trim();
            if (!cleanPart) return;
            
            const startsWithBook = /^[0-9]*\s*[a-zA-Z]/.test(cleanPart);
            if (!startsWithBook && currentBook) {
              cleanPart = currentBook + cleanPart;
            } else {
              const partBookMatch = cleanPart.match(/^([0-9]*\s*[a-zA-Z\s\.]+)/);
              if (partBookMatch) {
                currentBook = partBookMatch[1].replace(/[\s\.]/g, '');
              }
            }
            
            const normPart = cleanPart.toLowerCase().replace(/[\s\.]/g, '');
            
            const foundKey = Object.keys(data?.bible || {}).find(k => {
              const normKey = k.toLowerCase().replace(/[\s\.]/g, '');
              return normKey === normPart || normPart.includes(normKey) || normKey.includes(normPart);
            });
            
            if (foundKey) {
              const partText = extractTextRecursive(data.bible[foundKey]);
              if (partText) {
                combinedText += (combinedText ? "\n\n" : "") + `**${foundKey}**\n${partText}`;
                matchedKeys.push(foundKey);
              }
            } else {
              const refMatch = cleanPart.match(/^([a-zA-Z0-9]+)\s*([0-9]+):([0-9,\-]+)$/);
              if (refMatch) {
                const book = refMatch[1];
                const chapter = refMatch[2];
                const versesStr = refMatch[3];
                const individualVerses = versesStr.split(',');
                
                individualVerses.forEach(vStr => {
                  const compositeRef = `${book}${chapter}:${vStr}`;
                  const normComp = compositeRef.toLowerCase().replace(/[\s\.]/g, '');
                  const foundCompKey = Object.keys(data?.bible || {}).find(k => 
                    k.toLowerCase().replace(/[\s\.]/g, '') === normComp
                  );
                  if (foundCompKey) {
                    const partText = extractTextRecursive(data.bible[foundCompKey]);
                    if (partText) {
                      combinedText += (combinedText ? "\n\n" : "") + `**${foundCompKey}**\n${partText}`;
                      matchedKeys.push(foundCompKey);
                    }
                  }
                });
              }
            }
          });
        }
      }
      
      if (combinedText) {
        // Clean title: Deuteronome4:7-10;8:2,3 -> Deuteronome 4:7-10; 8:2,3
        const formattedTitle = bibleKey
          .replace(/([a-zA-Z]+)([0-9]+)/g, '$1 $2') // Space between book and chapter
          .replace(/;\s*([0-9]+)/g, '; $1') // Space after semicolon
          .replace(/\s+/g, ' ')
          .trim();
        setVerseTitle(formattedTitle);
        setVerseContent(stripMarkdownLinks(combinedText));
        setVerseModalVisible(true);
        return false;
      } else {
        // If not found in cache, fall back to opening local SQLite Bible reader!
        const parsed = bibleKey.match(/^([0-9]*\s*[a-zA-Z]+)\s*([0-9]+)(?::([0-9]+))?/);
        if (parsed) {
          const bookName = parsed[1].trim();
          const chapter = parseInt(parsed[2], 10);
          const verse = parsed[3] ? parseInt(parsed[3], 10) : 1;
          
          router.push({
            pathname: '/bible/reader',
            params: {
              bookName: bookName,
              chapter: chapter,
              verse: verse,
              lang: selectedLang
            }
          });
          return false;
        }
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
          <View className="py-2 border-b border-white/5 bg-background-dark/80 backdrop-blur-md">
            <SegmentSelector 
              segments={readingLesson.segments}
              activeSegmentIdx={activeSegmentIdx}
              onSelectSegment={setActiveSegmentIdx}
              cleanTitle={cleanSspmMarkdown}
              lang={selectedLang}
              completedDays={completedDays}
              quarterlyId={selectedQuarterly?.id}
              lessonId={currentLessonId}
            />
          </View>

          <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets={true} keyboardShouldPersistTaps="handled">
            {segment ? (
              <>
                <LessonHeader 
                  readingLesson={readingLesson}
                  selectedQuarterly={selectedQuarterly}
                  segment={segment}
                  onShare={handleShare}
                />

                {readingLesson.introduction && activeSegmentIdx === 0 && (
                  (() => {
                    const introKey = selectedQuarterly ? `${selectedQuarterly.id}_${currentLessonId}_intro` : null;
                    const introHighlight = introKey ? highlights[introKey] : null;
                    return (
                      <Pressable
                        onLongPress={() => {
                          if (introKey) {
                            setSelectedBlockKey(introKey);
                            setHighlightPaletteVisible(true);
                          }
                        }}
                        delayLongPress={400}
                        className="mb-8"
                        disabled={isHighlightModeActive}
                      >
                        <View 
                          style={introHighlight ? { 
                            backgroundColor: introHighlight, 
                            borderRadius: 24, 
                            padding: 16 
                          } : undefined}
                          className={introHighlight ? "" : "p-6 bg-slate-400/5 rounded-3xl border border-white/5"}
                        >
                          <View className="flex-row items-center mb-4">
                            <View className="w-1 h-4 bg-primary rounded-full mr-3" />
                            <Text className="text-white font-bold text-sm uppercase tracking-widest">{(t as any)('introduction') || 'Introduction'}</Text>
                          </View>
                          <Markdown
                            style={{
                              body: { color: '#94a3b8', fontSize: Math.max(13, globalSettings.fontSize * 0.8), lineHeight: Math.max(20, globalSettings.fontSize * 1.3), fontFamily: globalSettings.fontFamily === 'Inter_400Regular' ? 'Inter_400Regular' : globalSettings.fontFamily === 'Poppins_400Regular' ? 'Poppins_400Regular' : globalSettings.fontFamily === 'Lora_400Regular' ? 'Lora_400Regular' : globalSettings.fontFamily !== 'System' ? globalSettings.fontFamily : 'Lexend_400Regular' },
                              text: { color: '#94a3b8', fontSize: Math.max(13, globalSettings.fontSize * 0.8), lineHeight: Math.max(20, globalSettings.fontSize * 1.3), fontFamily: globalSettings.fontFamily === 'Inter_400Regular' ? 'Inter_400Regular' : globalSettings.fontFamily === 'Poppins_400Regular' ? 'Poppins_400Regular' : globalSettings.fontFamily === 'Lora_400Regular' ? 'Lora_400Regular' : globalSettings.fontFamily !== 'System' ? globalSettings.fontFamily : 'Lexend_400Regular' },
                              strong: { color: '#cbd5e1', fontWeight: globalSettings.fontFamily !== 'System' ? 'normal' : 'bold', fontFamily: globalSettings.fontFamily === 'Inter_400Regular' ? 'Inter_700Bold' : globalSettings.fontFamily === 'Poppins_400Regular' ? 'Poppins_700Bold' : globalSettings.fontFamily === 'Lora_400Regular' ? 'Lora_700Bold' : globalSettings.fontFamily !== 'System' ? globalSettings.fontFamily : 'Lexend_700Bold' },
                              italic: { fontStyle: globalSettings.fontFamily !== 'System' ? 'normal' : 'italic' }
                            }}
                            rules={{
                              paragraph: (node, children, parent, styles) => {
                                const extractText = (n: any): string => {
                                  if (!n) return '';
                                  if (n.type === 'softbreak' || n.type === 'hardbreak') return ' ';
                                  if (n.children && n.children.length > 0) {
                                    return n.children.map(extractText).join('');
                                  }
                                  return n.content || '';
                                };
                                const plainText = (node.children || []).map((c: any) => extractText(c)).join('');
                                const sentenceSplit = plainText.replace(/([.!?]+)\s+/g, '$1\n');
                                const rawSentences = sentenceSplit.split('\n').filter((s: string) => s.trim().length > 0);
                                const sentences = rawSentences.length > 0 ? rawSentences : [plainText];

                                if (!isHighlightModeActive) {
                                  const hasAnyHighlight = sentences.some((s, sentIdx) => {
                                    const sentKey = introKey ? `${introKey}_p${node.index}_sent_${sentIdx}` : `p${node.index}_sent_${sentIdx}`;
                                    return !!sentenceHighlights[sentKey];
                                  });

                                  if (!hasAnyHighlight) {
                                    return (
                                      <View key={node.key} style={{ marginBottom: 12 }}>
                                        {children}
                                      </View>
                                    );
                                  }

                                  let currentStart = 0;
                                  const sentenceRanges = sentences.map((sentence) => {
                                    const start = plainText.indexOf(sentence, currentStart);
                                    if (start !== -1) {
                                      currentStart = start + sentence.length;
                                      return { text: sentence, start, end: start + sentence.length };
                                    }
                                    const fallbackStart = currentStart;
                                    currentStart = fallbackStart + sentence.length;
                                    return { text: sentence, start: fallbackStart, end: fallbackStart + sentence.length };
                                  });

                                  const highlightedChildren = highlightReactTree(
                                    children,
                                    sentenceHighlights,
                                    "",
                                    introKey || undefined,
                                    node.index,
                                    sentenceRanges,
                                    { offset: 0 }
                                  );

                                  return (
                                    <View key={node.key} style={{ marginBottom: 12 }}>
                                      {highlightedChildren}
                                    </View>
                                  );
                                }

                                return (
                                  <View key={node.key} style={{ marginBottom: 12 }}>
                                    <Text style={styles.text}>
                                      {sentences.map((sentence, sentIdx) => {
                                        const sentKey = introKey ? `${introKey}_p${node.index}_sent_${sentIdx}` : `p${node.index}_sent_${sentIdx}`;
                                        const sentHighlight = sentenceHighlights[sentKey];
                                        return (
                                          <Text
                                            key={sentIdx}
                                            onPress={() => { if (sentKey) handleSentencePress(sentKey); }}
                                            style={sentHighlight ? {
                                              backgroundColor: sentHighlight,
                                              color: '#ffffff',
                                              fontFamily: styles.text?.fontFamily,
                                              fontSize: styles.text?.fontSize,
                                              lineHeight: styles.text?.lineHeight,
                                            } : styles.text}
                                          >
                                            {sentence}
                                          </Text>
                                        );
                                      })}
                                    </Text>
                                  </View>
                                );
                              },
                              image: (node) => (
                                <Image
                                  key={node.key}
                                  source={{ uri: node.attributes.src }}
                                  style={{ width: '100%', height: 200, borderRadius: 12, marginVertical: 10 }}
                                  resizeMode="cover"
                                />
                              )
                            }}
                          >
                            {cleanSspmMarkdown(readingLesson.introduction)}
                          </Markdown>
                        </View>
                      </Pressable>
                    );
                  })()
                )}

                {segment.type === 'pdf' && segment.pdf ? (
                  <View className="mt-4 mb-8">
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Documents disponibles</Text>
                    {segment.pdf.map((pdf, pIdx) => (
                      <TouchableOpacity
                        key={pdf.id || pIdx}
                        onPress={() => {
                          const fileName = pdf.src.split('/').pop() || 'document.pdf';
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
                        const isCustom = globalSettings.fontFamily !== 'System';
                        let cFont = 'Lexend_400Regular';
                        let cFontBold = 'Lexend_700Bold';
                        let cFontSemiBold = 'Lexend_600SemiBold';
                        let cWeightBold: any = 'bold';
                        let cStyleItalic: any = 'italic';

                        if (isCustom) {
                           cFont = globalSettings.fontFamily;
                           if (cFont === 'Inter_400Regular') {
                             cFontBold = 'Inter_700Bold';
                             cFontSemiBold = 'Inter_600SemiBold';
                             cWeightBold = 'normal';
                             cStyleItalic = 'normal';
                           } else if (cFont === 'Poppins_400Regular') {
                             cFontBold = 'Poppins_700Bold';
                             cFontSemiBold = 'Poppins_600SemiBold';
                             cWeightBold = 'normal';
                             cStyleItalic = 'normal';
                           } else if (cFont === 'Lora_400Regular') {
                             cFontBold = 'Lora_700Bold';
                             cFontSemiBold = 'Lora_600SemiBold';
                             cWeightBold = 'normal';
                             cStyleItalic = 'normal';
                           } else {
                             cFontBold = globalSettings.fontFamily;
                             cFontSemiBold = globalSettings.fontFamily;
                             cWeightBold = 'normal';
                             cStyleItalic = 'normal';
                           }
                        }

                        const blockKey = selectedQuarterly ? `${selectedQuarterly.id}_${currentLessonId}_${activeSegmentIdx}_${b.id || idx}` : null;
                        const highlightColor = blockKey ? highlights[blockKey] : null;
                        content.push(
                          <Pressable
                            key={`${b.id || idx}_md`}
                            onLongPress={() => {
                              if (blockKey) {
                                setSelectedBlockKey(blockKey);
                                setHighlightPaletteVisible(true);
                              }
                            }}
                            delayLongPress={400}
                            disabled={isHighlightModeActive}
                          >
                            <View 
                              style={highlightColor ? { 
                                backgroundColor: highlightColor, 
                                borderRadius: 16, 
                                paddingHorizontal: 12, 
                                paddingVertical: 8, 
                                marginVertical: 4 
                              } : undefined}
                            >
                              <Markdown
                                onLinkPress={(url) => handleLinkPress(url, blockData)}
                                style={{
                                  body: { color: '#e2e8f0', fontSize: globalSettings.fontSize, lineHeight: globalSettings.fontSize * 1.6, fontFamily: cFont, letterSpacing: globalSettings.letterSpacing || 0 },
                                  text: { color: '#e2e8f0', fontSize: globalSettings.fontSize, lineHeight: globalSettings.fontSize * 1.6, fontFamily: cFont, letterSpacing: globalSettings.letterSpacing || 0 },
                                  heading1: { color: '#f8fafc', fontWeight: cWeightBold, marginTop: 30, marginBottom: 15, fontFamily: cFontBold },
                                  heading2: { color: '#60a5fa', fontWeight: cWeightBold, marginTop: 25, marginBottom: 10, fontFamily: cFontSemiBold },
                                  heading3: { color: '#60a5fa', marginTop: 20, marginBottom: 10, fontFamily: cFontSemiBold },
                                  strong: { color: '#ffffff', fontWeight: cWeightBold, fontFamily: cFontBold },
                                  italic: { fontStyle: cStyleItalic, fontFamily: cFont },
                                  blockquote: { backgroundColor: '#1e293b', borderLeftColor: '#3b82f6', borderLeftWidth: 4, padding: 16, marginVertical: 12, borderRadius: 8 },
                                  link: { color: '#60a5fa', textDecorationLine: 'none', fontWeight: cWeightBold },
                                  paragraph: { marginBottom: 12 }
                                }}
                                rules={{
                                  paragraph: (node, children, parent, styles) => {
                                    const extractText = (n: any): string => {
                                      if (!n) return '';
                                      if (n.type === 'softbreak' || n.type === 'hardbreak') return ' ';
                                      if (n.children && n.children.length > 0) {
                                        return n.children.map(extractText).join('');
                                      }
                                      return n.content || '';
                                    };
                                    const plainText = (node.children || []).map((c: any) => extractText(c)).join('');
                                    const sentenceSplit = plainText.replace(/([.!?]+)\s+/g, '$1\n');
                                    const rawSentences = sentenceSplit.split('\n').filter((s: string) => s.trim().length > 0);
                                    const sentences = rawSentences.length > 0 ? rawSentences : [plainText];

                                    if (!isHighlightModeActive) {
                                      const hasAnyHighlight = sentences.some((s, sentIdx) => {
                                        const sentKey = blockKey ? `${blockKey}_p${node.index}_sent_${sentIdx}` : `p${node.index}_sent_${sentIdx}`;
                                        return !!sentenceHighlights[sentKey];
                                      });

                                      if (!hasAnyHighlight) {
                                        return (
                                          <View key={node.key} style={{ marginBottom: 12 }}>
                                            {children}
                                          </View>
                                        );
                                      }

                                      let currentStart = 0;
                                      const sentenceRanges = sentences.map((sentence) => {
                                        const start = plainText.indexOf(sentence, currentStart);
                                        if (start !== -1) {
                                          currentStart = start + sentence.length;
                                          return { text: sentence, start, end: start + sentence.length };
                                        }
                                        const fallbackStart = currentStart;
                                        currentStart = fallbackStart + sentence.length;
                                        return { text: sentence, start: fallbackStart, end: fallbackStart + sentence.length };
                                      });

                                      const highlightedChildren = highlightReactTree(
                                        children,
                                        sentenceHighlights,
                                        blockKey || "",
                                        undefined,
                                        node.index,
                                        sentenceRanges,
                                        { offset: 0 }
                                      );

                                      return (
                                        <View key={node.key} style={{ marginBottom: 12 }}>
                                          {highlightedChildren}
                                        </View>
                                      );
                                    }

                                    return (
                                      <View key={node.key} style={{ marginBottom: 12 }}>
                                        <Text style={styles.text}>
                                          {sentences.map((sentence, sentIdx) => {
                                            const sentKey = blockKey ? `${blockKey}_p${node.index}_sent_${sentIdx}` : `p${node.index}_sent_${sentIdx}`;
                                            const sentHighlight = sentenceHighlights[sentKey];
                                            return (
                                              <Text
                                                key={sentIdx}
                                                onPress={() => { if (sentKey) handleSentencePress(sentKey); }}
                                                style={sentHighlight ? {
                                                  backgroundColor: sentHighlight,
                                                  color: '#ffffff',
                                                  fontFamily: styles.text?.fontFamily,
                                                  fontSize: styles.text?.fontSize,
                                                  lineHeight: styles.text?.lineHeight,
                                                } : styles.text}
                                              >
                                                {sentence}
                                              </Text>
                                            );
                                          })}
                                        </Text>
                                      </View>
                                    );
                                  },
                                  image: (node) => (
                                    <Image
                                      key={node.key}
                                      source={{ uri: node.attributes.src }}
                                      style={{ width: '100%', height: 200, borderRadius: 12, marginVertical: 10 }}
                                      resizeMode="cover"
                                    />
                                  )
                                }}
                              >
                                {cleanSspmMarkdown(b.markdown)}
                              </Markdown>
                            </View>
                          </Pressable>
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

                      if (b.type === 'question' || b.type === 'textarea' || b.type === 'input') {
                        return (
                          <QuestionBlock
                            key={b.id || idx}
                            block={b}
                            content={content}
                            lessonId={currentLessonId}
                          />
                        );
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
                {/* Daily Study Completion Toggle Button */}
                {selectedQuarterly && (
                  (() => {
                    const dayKey = `${selectedQuarterly.id}_${currentLessonId}_${activeSegmentIdx}`;
                    const isCompleted = !!completedDays[dayKey];
                    return (
                      <TouchableOpacity
                        onPress={() => toggleDayCompletion(dayKey)}
                        className={`mt-10 mb-6 p-6 rounded-3xl border flex-row items-center justify-between ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}
                      >
                        <View className="flex-row items-center flex-1 mr-4">
                          <View className={`w-10 h-10 rounded-2xl items-center justify-center mr-4 ${isCompleted ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
                            {isCompleted ? <CheckCircle size={20} color="#10b981" /> : <Square size={20} color="#94a3b8" />}
                          </View>
                          <View className="flex-1">
                            <Text className={`font-bold text-base ${isCompleted ? 'text-emerald-400' : 'text-slate-200'}`}>
                              {isCompleted ? "Étude du jour complétée !" : "Marquer l'étude comme complétée"}
                            </Text>
                            <Text className="text-slate-500 text-xs mt-1">
                              {isCompleted ? "Bravo ! Continuez votre progression quotidienne." : "Suivez votre assiduité et vos progrès spirituels."}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })()
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
          <QuarterlyCard 
            item={selectedQuarterly}
            variant="detail"
            onDownload={() => downloadFullQuarterly(selectedQuarterly)}
            onDelete={() => deleteQuarterly(selectedQuarterly.id)}
            isDownloaded={downloadedQuarterlies.includes(`${selectedLang}_${selectedQuarterly.id}`)}
            isCurrent={isQuarterlyCurrent(selectedQuarterly)}
            downloadingAll={downloadingAll}
            t={t as any}
          />

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
                <QuarterlyCard 
                  key={item.id}
                  item={item}
                  variant="list"
                  width={width}
                  isDownloaded={downloadedQuarterlies.includes(`${selectedLang}_${item.id}`)}
                  onPress={() => fetchQuarterlyDetail(item.id, item.index)}
                  t={t as any}
                />
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
      <View className="px-4 py-4 flex-row items-center justify-between border-b border-white/5">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => {
              if (readingLesson) {
                setReadingLesson(null);
                setCurrentLessonId("");
                router.setParams({ lId: undefined });
              }
              else if (selectedQuarterly) {
                setSelectedQuarterly(null);
                router.setParams({ qId: undefined });
              }
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
            </View>
          </View>
        </View>

        {!readingLesson && !selectedQuarterly && (
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => {
                calculateStorage();
                setStorageModalVisible(true);
              }}
              className="w-10 h-10 rounded-full bg-slate-900 items-center justify-center border border-white/5"
            >
              <HardDrive size={18} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowLangPicker(true)}
              className="w-10 h-10 rounded-full bg-slate-900 items-center justify-center border border-white/5"
            >
              <Globe size={18} color="#94a3b8" />
              <View className="absolute -top-1 -right-1 bg-primary px-1.5 py-0.5 rounded-md border border-slate-900 shadow-sm">
                 <Text className="text-[7px] text-white font-bold uppercase">{selectedLang}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={loadInitialData}
              className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10"
            >
              <RefreshCw size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {renderContent()}
      </KeyboardAvoidingView>

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

      {/* Highlight Color Palette Modal */}
      <Modal
        visible={highlightPaletteVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setHighlightPaletteVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setHighlightPaletteVisible(false)}
          className="flex-1 bg-black/60 justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            className="w-full bg-slate-900 rounded-t-[40px] border-t border-slate-800 p-8 pb-10"
          >
            <Text className="text-white text-lg font-bold mb-6 text-center">Surligner le paragraphe</Text>
            
            <View className="flex-row justify-around items-center mb-8">
              {/* Yellow */}
              <TouchableOpacity
                onPress={() => saveHighlight(selectedBlockKey || '', 'rgba(251, 191, 36, 0.35)')}
                className="w-12 h-12 rounded-full items-center justify-center bg-amber-500 border border-amber-400"
              />
              {/* Green */}
              <TouchableOpacity
                onPress={() => saveHighlight(selectedBlockKey || '', 'rgba(52, 211, 153, 0.35)')}
                className="w-12 h-12 rounded-full items-center justify-center bg-emerald-500 border border-emerald-400"
              />
              {/* Blue */}
              <TouchableOpacity
                onPress={() => saveHighlight(selectedBlockKey || '', 'rgba(59, 130, 246, 0.35)')}
                className="w-12 h-12 rounded-full items-center justify-center bg-blue-500 border border-blue-400"
              />
              {/* Purple */}
              <TouchableOpacity
                onPress={() => saveHighlight(selectedBlockKey || '', 'rgba(139, 92, 246, 0.35)')}
                className="w-12 h-12 rounded-full items-center justify-center bg-violet-500 border border-violet-400"
              />
              {/* Pink */}
              <TouchableOpacity
                onPress={() => saveHighlight(selectedBlockKey || '', 'rgba(236, 72, 153, 0.35)')}
                className="w-12 h-12 rounded-full items-center justify-center bg-pink-500 border border-pink-400"
              />
            </View>

            {/* Clear highlight button */}
            <TouchableOpacity
              onPress={() => saveHighlight(selectedBlockKey || '', '')}
              className="flex-row items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/5 mb-3"
            >
              <Trash2 size={16} color="#ef4444" className="mr-2" />
              <Text className="text-red-500 font-bold text-sm">Effacer le surlignage</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHighlightPaletteVisible(false)}
              className="flex-row items-center justify-center p-4 bg-slate-800 rounded-2xl border border-slate-700"
            >
              <Text className="text-slate-300 font-bold text-sm">Annuler</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Verse View Replacement - Absolute positioning for perfect selection support */}
      {verseModalVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View className="bg-slate-900 rounded-t-[40px] p-8 border-t border-white/10 max-h-[90%] shadow-2xl">
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-1">
                <Text className="text-primary font-bold text-xl">{verseTitle}</Text>
              </View>
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={() => {
                    import('expo-clipboard').then(Clipboard => {
                      Clipboard.setStringAsync(verseContent);
                      showToast(t('copied' as any) || "Copié !", 'success');
                    });
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 items-center justify-center mr-2"
                >
                  <Copy size={18} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setVerseModalVisible(false)}
                  className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
                >
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
              <Markdown
                style={{
                  body: { 
                    color: '#f1f5f9', 
                    fontSize: 18 * (globalSettings.fontSize / 16), 
                    lineHeight: 28 * (globalSettings.fontSize / 16), 
                    textAlign: 'left',
                    fontFamily: globalSettings.fontFamily === 'Inter_400Regular' ? 'Inter_400Regular' : globalSettings.fontFamily === 'Poppins_400Regular' ? 'Poppins_400Regular' : globalSettings.fontFamily === 'Lora_400Regular' ? 'Lora_400Regular' : globalSettings.fontFamily !== 'System' ? globalSettings.fontFamily : 'Lexend_400Regular'
                  },
                  strong: { 
                    color: '#3b82f6', 
                    fontWeight: 'bold',
                    fontFamily: globalSettings.fontFamily === 'Inter_400Regular' ? 'Inter_700Bold' : globalSettings.fontFamily === 'Poppins_400Regular' ? 'Poppins_700Bold' : globalSettings.fontFamily === 'Lora_400Regular' ? 'Lora_700Bold' : globalSettings.fontFamily !== 'System' ? globalSettings.fontFamily : 'Lexend_700Bold'
                  }
                }}
              >
                {verseContent}
              </Markdown>
            </ScrollView>

            <TouchableOpacity 
              onPress={() => {
                setVerseModalVisible(false);
                setTimeout(() => openNoteForVerse(verseTitle), 300);
              }}
              className="bg-primary/20 p-5 rounded-3xl border border-primary/30 flex-row items-center justify-center"
            >
              <StickyNote size={20} color="#3b82f6" className="mr-3" />
              <Text className="text-primary font-bold text-base">Journal d'étude</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quick Note Modal */}
      <Modal
        visible={quickNoteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setQuickNoteModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-black/80 justify-end">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
            <View className="bg-slate-900 rounded-t-[40px] p-8 border-t border-white/10 max-h-[95%]">
              <View className="flex-row justify-between items-center mb-6">
                <View className="flex-row items-center flex-1 mr-4">
                   <View className="w-10 h-10 rounded-2xl bg-primary/20 items-center justify-center mr-3">
                      <StickyNote size={20} color="#3b82f6" />
                   </View>
                   <View className="flex-1">
                      <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-0.5">Note de verset</Text>
                      <Text className="text-white font-bold text-xl" numberOfLines={1}>{editingQuickNote?.title}</Text>
                   </View>
                </View>
                <TouchableOpacity
                  onPress={() => setQuickNoteModalVisible(false)}
                  className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
                >
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
                <TextInput
                  className="text-slate-200 text-lg leading-7 mb-6 p-4 bg-white/5 rounded-3xl border border-white/10"
                  placeholder="Écrivez vos pensées..."
                  placeholderTextColor="#475569"
                  multiline
                  textAlignVertical="top"
                  autoFocus
                  style={{ 
                    fontFamily: globalSettings.fontFamily !== 'System' ? globalSettings.fontFamily : 'Lexend_400Regular', 
                    fontSize: globalSettings.fontSize,
                    lineHeight: globalSettings.fontSize * 1.5,
                    fontStyle: globalSettings.fontFamily !== 'System' ? 'normal' : undefined,
                    fontWeight: globalSettings.fontFamily !== 'System' ? 'normal' : undefined,
                    minHeight: 200 
                  }}
                  value={editingQuickNote?.content}
                  onChangeText={(t) => setEditingQuickNote({...editingQuickNote, content: t})}
                />

                <View className="flex-row items-center mb-6">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    <TouchableOpacity onPress={() => insertMarkdownToQuickNote('**', '**')} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center mr-2"><Bold size={18} color="#8b949e" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => insertMarkdownToQuickNote('*', '*')} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center mr-2"><Italic size={18} color="#8b949e" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => insertMarkdownToQuickNote('# ', '')} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center mr-2"><Heading size={18} color="#8b949e" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => insertMarkdownToQuickNote('- ', '')} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center mr-2"><List size={18} color="#8b949e" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                        const refNum = (editingQuickNote.content.match(/\[\^(\d+)\]/g)?.length || 0) + 1;
                        insertMarkdownToQuickNote(`[^${refNum}]`, '');
                        setEditingQuickNote({ ...editingQuickNote, content: editingQuickNote.content + `\n\n[^${refNum}]: ` });
                    }} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center mr-2"><Footprints size={18} color="#8b949e" /></TouchableOpacity>
                    
                    <View className="w-[1px] h-8 bg-white/10 mx-2 self-center" />
                    
                    <TouchableOpacity onPress={() => pickAndInsertMediaToQuickNote('image')} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center mr-2"><Camera size={18} color="#8b949e" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => pickAndInsertMediaToQuickNote('video')} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center mr-2"><VideoIcon size={18} color="#8b949e" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => pickAndInsertMediaToQuickNote('audio')} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center mr-2"><Music size={18} color="#8b949e" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowQuickVoiceModal(true)} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center mr-2"><Mic size={18} color="#8b949e" /></TouchableOpacity>
                  </ScrollView>
                </View>
              </ScrollView>
              
              <TouchableOpacity
                onPress={handleSaveQuickNote}
                className="bg-primary p-5 rounded-3xl flex-row items-center justify-center shadow-lg shadow-primary/20"
              >
                <Text className="text-white font-bold text-lg">Enregistrer dans le journal</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Quick Note Voice Recording Modal */}
      <Modal visible={showQuickVoiceModal} transparent animationType="slide">
          <SafeAreaView className="flex-1 bg-black/50 justify-end">
              <View className="bg-[#1c2128] m-4 rounded-[40px] p-8 border border-white/10 items-center shadow-2xl">
                  <Text className="text-white/40 font-bold text-xs uppercase tracking-[4px] mb-8">Enregistreur Vocal d'Étude</Text>
                  <View className="items-center mb-10">
                      <Text className="text-5xl font-mono text-white mb-2">{Math.floor(quickRecordDuration / 60)}:{String(quickRecordDuration % 60).padStart(2, '0')}</Text>
                      <Text className="text-red-500 animate-pulse font-bold text-xs">{isQuickRecording ? "ENREGISTREMENT EN COURS" : "PRÊT"}</Text>
                  </View>
                  <View className="flex-row gap-6 items-center">
                      <TouchableOpacity onPress={() => isQuickRecording ? stopQuickRecording(false) : setShowQuickVoiceModal(false)} className="w-16 h-16 rounded-full bg-white/5 items-center justify-center"><X size={24} color="#94a3b8" /></TouchableOpacity>
                      <TouchableOpacity onPress={isQuickRecording ? () => stopQuickRecording(true) : startQuickRecording} className={`w-24 h-24 rounded-full items-center justify-center ${isQuickRecording ? "bg-red-500" : "bg-primary"}`}>{isQuickRecording ? <Square size={32} color="white" fill="white" /> : <Mic size={40} color="white" />}</TouchableOpacity>
                      <TouchableOpacity onPress={() => isQuickRecording ? stopQuickRecording(true) : null} disabled={!isQuickRecording} className={`w-16 h-16 rounded-full bg-white/5 items-center justify-center ${!isQuickRecording ? "opacity-20" : ""}`}><Check size={24} color={isQuickRecording ? "#3b82f6" : "#94a3b8"} /></TouchableOpacity>
                  </View>
              </View>
          </SafeAreaView>
      </Modal>
      {/* Storage Management Modal */}
      <Modal visible={storageModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setStorageModalVisible(false)} 
            className="flex-1" 
          />
          <View className="bg-slate-900 rounded-t-[40px] border-t border-white/10 p-8 pb-12 shadow-2xl">
            <View className="w-12 h-1.5 bg-white/10 rounded-full self-center mb-8" />
            
            <View className="flex-row items-center justify-between mb-8">
              <View>
                <Text className="text-white text-2xl font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>Stockage</Text>
                <Text className="text-slate-500 text-sm mt-1">Gérez vos contenus hors-ligne</Text>
              </View>
              <View className="w-16 h-16 rounded-3xl bg-primary/10 items-center justify-center border border-primary/20">
                <Database size={32} color="#3b82f6" />
              </View>
            </View>

            <View className="bg-white/5 rounded-3xl p-6 border border-white/5 mb-8">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-slate-400 font-medium">Trimestres en cache</Text>
                <Text className="text-white font-bold text-lg">{storageInfo.count}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-400 font-medium">Espace total occupé</Text>
                <Text className="text-primary font-bold text-lg">{formatSize(storageInfo.totalSize)}</Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setStorageModalVisible(false)}
                className="flex-1 bg-white/5 py-5 rounded-3xl items-center border border-white/10"
              >
                <Text className="text-slate-400 font-bold">Fermer</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  setAlertConfig({
                    visible: true,
                    title: "Nettoyer le cache ?",
                    message: "Ceci effacera tous les fichiers temporaires de lecture pour libérer de l'espace. Vos leçons explicitement téléchargées hors-ligne ne seront pas supprimées.",
                    type: 'info',
                    onConfirm: clearStorage
                  });
                }}
                className="flex-[1.5] bg-red-500/10 py-5 rounded-3xl items-center border border-red-500/20"
              >
                <Text className="text-red-500 font-bold">Vider le cache</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PremiumAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
        onConfirm={alertConfig.onConfirm}
        confirmText={alertConfig.onConfirm ? t('ok') : 'OK'}
        cancelText={t('cancel')}
      />

      {/* Floating Highlighter Panel */}
      {readingLesson && (
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
            className={`w-14 h-14 rounded-full items-center justify-center shadow-2xl border ${isHighlightModeActive ? 'bg-amber-500 border-amber-400 shadow-amber-500/40' : 'bg-slate-900 border-white/10 shadow-black/80'}`}
          >
            <Edit size={22} color={isHighlightModeActive ? '#ffffff' : '#94a3b8'} />
            {isHighlightModeActive && (
              <View className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border border-slate-900" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
