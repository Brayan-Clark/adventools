import { BIBLE_REGEX, fetchVerseContent } from '@/lib/bible';
import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import { cn } from '@/lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bold, BookOpen, Camera, Check, ChevronRight, Code, Edit, Folder, Eraser, Heading, Highlighter, Italic, LayoutGrid, List, Mic, Palette, Plus, Quote, Search, Share2, StickyNote, Trash2, X, Play, Square, Pause, Undo2 } from 'lucide-react-native';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, ScrollView, Share, Text, TextInput, TouchableOpacity, View, Image as RNImage } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';

// --- STYLES & CONSTANTS ---

const HIGHLIGHT_COLORS = [
  { id: 'yellow', bg: 'rgba(253, 224, 71, 0.3)', text: '#fde047', border: 'rgba(253, 224, 71, 0.4)' },
  { id: 'green', bg: 'rgba(74, 222, 128, 0.3)', text: '#4ade80', border: 'rgba(74, 222, 128, 0.4)' },
  { id: 'blue', bg: 'rgba(96, 165, 250, 0.3)', text: '#60a5fa', border: 'rgba(96, 165, 250, 0.4)' },
  { id: 'red', bg: 'rgba(248, 113, 113, 0.3)', text: '#f87171', border: 'rgba(248, 113, 113, 0.4)' },
];

const NOTE_COLORS = [
  { label: 'Slate', value: '#1e293b', border: '#334155' },
  { label: 'Azure', value: '#1e3a8a', border: '#1e40af' },
  { label: 'Emerald', value: '#064e3b', border: '#065f46' },
  { label: 'Rose', value: '#881337', border: '#9f1239' },
  { label: 'Amber', value: '#78350f', border: '#92400e' },
  { label: 'Violet', value: '#4c1d95', border: '#5b21b6' },
];

// --- TYPES ---

interface Note {
  id: string;
  type: 'text' | 'draw';
  title: string;
  content: string;
  date: number;
  color?: string;
  folder?: string;
  attachments?: {
    images?: string[];
    voice?: { uri: string, duration?: number }[];
  };
}

// --- HELPERS ---

const saveFilePermanently = async (uri: string, type: 'image' | 'voice'): Promise<string> => {
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

// --- COMPONENTS ---

const AudioPlayer = ({ uri }: { uri: string }) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        return sound ? () => { sound.unloadAsync(); } : undefined;
    }, [sound]);

    const playSound = async () => {
        if (sound) {
            await sound.playAsync();
            setIsPlaying(true);
            return;
        }
        const { sound: newSound } = await Audio.Sound.createAsync({ uri });
        setSound(newSound);
        newSound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.didJustFinish) setIsPlaying(false);
        });
        await newSound.playAsync();
        setIsPlaying(true);
    };

    const pauseSound = async () => {
        if (sound) {
            await sound.pauseAsync();
            setIsPlaying(false);
        }
    };

    return (
        <TouchableOpacity 
            onPress={isPlaying ? pauseSound : playSound}
            className="bg-white/5 p-4 rounded-3xl border border-white/10 mb-2 flex-row items-center"
        >
            <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                {isPlaying ? <Pause size={18} color="#3b82f6" /> : <Play size={18} color="#3b82f6" />}
            </View>
            <View className="ml-4 flex-1">
                <Text className="text-white font-bold text-xs">Vocal</Text>
                <Text className="text-white/40 text-[9px]">{isPlaying ? "Lecture en cours..." : "Cliquer pour écouter"}</Text>
            </View>
        </TouchableOpacity>
    );
};

const DrawModal = ({ visible, onClose, onSave, initialUri }: { visible: boolean, onClose: () => void, onSave: (uri: string) => void, initialUri?: string }) => {
    const [paths, setPaths] = useState<Array<{ d: string, color: string, width: number }>>([]);
    const [currentPath, setCurrentPath] = useState('');
    const [color, setColor] = useState('#000000');
    const [width, setWidth] = useState(3);
    const [isEraser, setIsEraser] = useState(false);
    const viewShotRef = useRef<any>(null);

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
            const { locationX, locationY } = evt.nativeEvent;
            setCurrentPath(`M${locationX},${locationY}`);
        },
        onPanResponderMove: (evt) => {
            const { locationX, locationY } = evt.nativeEvent;
            setCurrentPath(prev => `${prev} L${locationX},${locationY}`);
        },
        onPanResponderRelease: () => {
            if (currentPath) {
                setPaths(prev => [...prev, { d: currentPath, color: isEraser ? '#FFFFFF' : color, width: isEraser ? width * 2 : width }]);
                setCurrentPath('');
            }
        },
    });

    const handleSave = async () => {
        if (viewShotRef.current) {
            try {
                const uri = await viewShotRef.current.capture();
                const permanentUri = await saveFilePermanently(uri, 'image');
                onSave(permanentUri);
            } catch (e) { console.error("Capture failed", e); }
        }
    };

    return (
        <Modal visible={visible} animationType="slide" statusBarTranslucent>
            <SafeAreaView className="flex-1 bg-white">
                <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-100">
                    <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
                        <X size={20} color="#475569" />
                    </TouchableOpacity>
                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity onPress={() => setPaths([])} className="w-8 h-8 items-center justify-center"><Trash2 size={20} color="#94a3b8" /></TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} className="w-8 h-8 items-center justify-center"><Check size={20} color="#3b82f6" /></TouchableOpacity>
                    </View>
                </View>
                
                <ViewShot ref={viewShotRef} style={{ flex: 1, backgroundColor: 'white' }} options={{ format: "jpg", quality: 0.9 }}>
                    <View className="flex-1" {...panResponder.panHandlers}>
                        {initialUri && (
                            <RNImage source={{ uri: initialUri }} className="absolute inset-0 w-full h-full opacity-50" resizeMode="contain" />
                        )}
                        <Svg className="flex-1">
                            {paths.map((p, i) => <Path key={i} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
                            {currentPath ? <Path d={currentPath} stroke={isEraser ? '#FFFFFF' : color} strokeWidth={isEraser ? width * 2 : width} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
                        </Svg>
                    </View>
                </ViewShot>

                <View className="bg-white border-t border-slate-100 p-6 pb-12">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                        {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#000000', '#64748b'].map(c => (
                            <TouchableOpacity key={c} onPress={() => setColor(c)} style={{ backgroundColor: c, opacity: color === c ? 1 : 0.8 }} className={cn("w-10 h-10 rounded-full mr-4 shadow-sm", color === c ? "border-2 border-white" : "")} />
                        ))}
                    </ScrollView>
                    <View className="flex-row justify-between items-center">
                        <View className="flex-row gap-6 items-center">
                            <TouchableOpacity onPress={() => setIsEraser(false)} className={cn("p-2 rounded-xl", !isEraser ? "bg-slate-100" : "")}>
                                <Edit size={24} color={!isEraser ? "#3b82f6" : "#475569"} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsEraser(true)} className={cn("p-2 rounded-xl", isEraser ? "bg-slate-100" : "")}>
                                <Eraser size={24} color={isEraser ? "#ef4444" : "#475569"} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setPaths(paths.slice(0, -1))} className="p-2"><Undo2 size={24} color="#94a3b8" /></TouchableOpacity>
                        </View>
                        <View className="flex-row items-center bg-slate-100 px-4 py-2 rounded-3xl">
                            <TouchableOpacity onPress={() => setWidth(Math.max(1, width - 1))} className="p-2"><Text className="text-slate-600 font-bold">-</Text></TouchableOpacity>
                            <Text className="text-slate-600 font-bold w-6 text-center">{width}</Text>
                            <TouchableOpacity onPress={() => setWidth(Math.min(20, width + 1))} className="p-2"><Text className="text-slate-600 font-bold">+</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const NoteCard = ({ note, onPress, onDelete }: { note: Note, onPress: () => void, onDelete: () => void }) => {
  const { t } = useTranslation();
  const hasImage = note.attachments?.images && note.attachments.images.length > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderColor: note.color ? note.color : 'rgba(255, 255, 255, 0.08)',
      }}
      className="p-5 rounded-[32px] border-2 mb-1 overflow-hidden"
    >
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
          {new Date(note.date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}
        </Text>
        <TouchableOpacity onPress={onDelete} className="p-1">
          <X size={14} color="rgba(255, 255, 255, 0.2)" />
        </TouchableOpacity>
      </View>

      <Text className="font-bold text-white text-lg leading-tight mb-2" style={{ fontFamily: 'Lexend_600SemiBold' }}>
        {note.title || t('untitled_note')}
      </Text>

      {note.type === 'draw' && hasImage ? (
        <TouchableOpacity onPress={onPress}>
            <RNImage source={{ uri: note.attachments?.images![note.attachments!.images!.length - 1] }} className="w-full h-32 rounded-2xl mb-3 bg-white/5" resizeMode="cover" />
        </TouchableOpacity>
      ) : (
        <Text className="text-sm text-white/60 leading-5 mb-4" numberOfLines={4}>
            {note.content.replace(/[#*`]/g, '') || t('no_content')}
        </Text>
      )}

      <View className="flex-row justify-between items-center mt-2">
        {note.folder ? (
          <View className="bg-white/10 px-3 py-1.5 rounded-full border border-white/5 flex-row items-center">
            <Folder size={10} color="#94a3b8" className="mr-1.5" />
            <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{note.folder}</Text>
          </View>
        ) : <View />}
        <View className="w-8 h-8 rounded-full bg-white/5 items-center justify-center">
          <Edit size={12} color="#475569" />
        </View>
      </View>

      {note.color && (
        <View style={{ position: 'absolute', top: -20, right: -20, width: 40, height: 40, backgroundColor: note.color, opacity: 0.15, borderRadius: 20 }} />
      )}
    </TouchableOpacity>
  );
};

// --- MAIN PAGE ---

export default function Notes() {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [search, setSearch] = useState("");
  
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showHighlighter, setShowHighlighter] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const recordInterval = useRef<any>(null);

  const [detectedVerse, setDetectedVerse] = useState<{ book: string, chapter: string, verses: string, bookId?: number } | null>(null);
  const [verseContent, setVerseContent] = useState<string | null>(null);
  const [currentVerseBookId, setCurrentVerseBookId] = useState<number | null>(null);
  const [verseLoading, setVerseLoading] = useState(false);

  const textInputRef = useRef<TextInput>(null);
  const { settings: globalSettings } = useSettings();

  // --- CORE LOGIC ---

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
        const [savedNotes, savedFolders] = await Promise.all([
            AsyncStorage.getItem("adventools_notes"),
            AsyncStorage.getItem("adventools_folders")
        ]);
        if (savedNotes) setNotes(JSON.parse(savedNotes));
        if (savedFolders) setFolders(JSON.parse(savedFolders));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (detectedVerse) {
        setVerseLoading(true);
        // On active le stripNotes (5ème argument à true)
        fetchVerseContent(globalSettings.bibleVersion, detectedVerse.book, String(detectedVerse.chapter), detectedVerse.verses, true)
            .then(res => {
                if (res && res.text) {
                    setVerseContent(res.text);
                    if (res.bookId) setCurrentVerseBookId(res.bookId);
                } else {
                    setVerseContent(t('verse_not_found') || "Verset non trouvé");
                }
            })
            .catch(e => {
                console.error(e);
                setVerseContent("Erreur de chargement du verset");
            })
            .finally(() => setVerseLoading(false));
    } else {
        setCurrentVerseBookId(null);
        setVerseContent(null);
    }
  }, [detectedVerse?.book, detectedVerse?.chapter, detectedVerse?.verses]);

  const saveAllNotes = async (updatedNotes: Note[]) => {
    try {
        setNotes(updatedNotes);
        await AsyncStorage.setItem("adventools_notes", JSON.stringify(updatedNotes));
    } catch (e) { console.error(e); }
  };

  const updateCurrentNoteState = (partialNote: Partial<Note>) => {
    setEditingNote(prev => prev ? ({ ...prev, ...partialNote }) : null);
  };

  const handleSaveNote = async () => {
    if (!editingNote) return;
    const exists = notes.find(n => n.id === editingNote.id);
    const updated = exists ? notes.map(n => n.id === editingNote.id ? editingNote : n) : [editingNote, ...notes];
    await saveAllNotes(updated);
  };

  const addToHistory = async (note: Note) => {
    try {
      const historyItem = {
        type: 'note',
        title: note.title || t('untitled_note'),
        subtitle: new Date(note.date).toLocaleDateString(),
        timestamp: Date.now(),
        params: { noteId: note.id }
      };
      const existingHistory = await AsyncStorage.getItem('app_history');
      let history = existingHistory ? JSON.parse(existingHistory) : [];
      history = history.filter((h: any) => !(h.type === 'note' && h.params?.noteId === note.id));
      history.unshift(historyItem);
      await AsyncStorage.setItem('app_history', JSON.stringify(history.slice(0, 5)));
    } catch (e) { console.error(e); }
  };

  const addNote = () => {
    Alert.alert("Créer une note", null as any, [
        { text: "📝 Texte", onPress: () => {
            const n: Note = { id: Date.now().toString(), type: 'text', title: "", content: "", date: Date.now(), folder: selectedFolder !== 'all' ? selectedFolder : undefined };
            setEditingNote(n); setIsPreviewMode(false);
        }},
        { text: "🎨 Dessin", onPress: () => {
            const n: Note = { id: Date.now().toString(), type: 'draw', title: "Nouveau dessin", content: "", date: Date.now(), folder: selectedFolder !== 'all' ? selectedFolder : undefined };
            setEditingNote(n); setIsPreviewMode(false); setShowDrawModal(true);
        }},
        { text: "Annuler", style: 'cancel' }
    ]);
  };

  const deleteNote = (id: string) => {
    Alert.alert("Supprimer", "Retirer cette note ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => saveAllNotes(notes.filter(n => n.id !== id)) }
    ]);
  };

  const pickImage = async (useCamera: boolean = false) => {
    try {
        const { status } = useCamera 
            ? await ImagePicker.requestCameraPermissionsAsync() 
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
            Alert.alert("Permission refusée", "Nous avons besoin de votre permission pour accéder à vos photos.");
            return;
        }

        const r = useCamera 
            ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 })
            : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
        
        if (!r.canceled && editingNote) {
            const permanentUri = await saveFilePermanently(r.assets[0].uri, 'image');
            const updatedImages = [...(editingNote.attachments?.images || []), permanentUri];
            updateCurrentNoteState({ attachments: { ...editingNote.attachments, images: updatedImages } });
        }
    } catch (e) {
        console.error(e);
        Alert.alert("Erreur", "Impossible d'ouvrir l'appareil photo ou la galerie.");
    }
  };

  const startRecording = async () => {
    try {
        const { status, canAskAgain } = await Audio.getPermissionsAsync();
        
        let finalStatus = status;
        if (status !== 'granted' && canAskAgain) {
            const { status: newStatus } = await Audio.requestPermissionsAsync();
            finalStatus = newStatus;
        }

        if (finalStatus !== 'granted') {
            Alert.alert(
                "Microphone désactivé",
                "Adventools a besoin de votre autorisation pour enregistrer. Allez dans les réglages de votre téléphone pour activer le micro.",
                [{ text: "OK" }]
            );
            return;
        }
        
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        if (recording) {
            try { await recording.stopAndUnloadAsync(); } catch (e) {}
        }

        const { recording: newRecording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        
        setRecording(newRecording);
        setIsRecording(true);
        setRecordDuration(0);
        
        if (recordInterval.current) clearInterval(recordInterval.current);
        recordInterval.current = setInterval(() => {
            setRecordDuration(prev => prev + 1);
        }, 1000);
        
    } catch (err) { 
        console.error("Start Recording error:", err);
        setIsRecording(false);
        setRecording(null);
        Alert.alert("Erreur Mic", "Impossible de démarrer l'enregistrement. Cela peut arriver si une autre application utilise déjà le micro.");
    }
  };

  const stopRecording = async (save: boolean = true) => {
    if (!recording) return;
    try {
        if (recordInterval.current) clearInterval(recordInterval.current);
        setIsRecording(false);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        
        if (save && uri && editingNote) {
            const pUri = await saveFilePermanently(uri, 'voice');
            const updatedVoice = [...(editingNote.attachments?.voice || []), { uri: pUri, duration: recordDuration }];
            updateCurrentNoteState({ attachments: { ...editingNote.attachments, voice: updatedVoice } });
        }
    } catch (e) {
        console.error("Stop Recording Error", e);
    } finally {
        setRecording(null);
        setRecordDuration(0);
        setShowVoiceModal(false);
    }
  };

  const insertMarkdown = (before: string, after: string = '') => {
    if (!editingNote) return;
    const { start, end } = selection;
    const prev = editingNote.content;
    const newContent = prev.substring(0, start) + before + prev.substring(start, end) + after + prev.substring(end);
    updateCurrentNoteState({ content: newContent });
    setTimeout(() => textInputRef.current?.focus(), 100);
  };

  const processContent = (text: string) => {
    let output = text.replace(BIBLE_REGEX, (match, b, c, v) => `[${match}](#verse:${encodeURIComponent(b.trim())}/${c}/${v ? v.trim() : ''})`);
    output = output.replace(/<mark style="background-color:\s*(#[a-fA-F0-9]+)">([\s\S]*?)<\/mark>/gi, (match, color, content) => {
        return `[${content}](#highlight:${color})`;
    });
    return output;
  };

  const handleVerseClick = (url: string) => {
    if (url.startsWith('#verse:')) {
      const parts = url.replace('#verse:', '').split('/');
      setDetectedVerse({ book: decodeURIComponent(parts[0]), chapter: parts[1], verses: parts[2] || "" });
      return false;
    }
    if (url.startsWith('#highlight:')) return false;
    return true;
  };

  const filteredNotes = notes.filter(n => {
    const m = (n.title + n.content).toLowerCase().includes(search.toLowerCase());
    return selectedFolder === 'all' ? m : m && n.folder === selectedFolder;
  });

  // --- RENDERING ---

  const markdownStyles = {
    body: { color: '#e2e8f0', fontSize: 18, lineHeight: 30, fontFamily: 'Lexend_400Regular' },
    heading2: { color: '#ffffff', fontSize: 24, fontFamily: 'Lexend_700Bold', marginTop: 15, marginBottom: 8 },
    strong: { fontFamily: 'Lexend_700Bold', color: '#ffffff' },
    em: { fontStyle: 'italic' },
    link: { color: '#3b82f6', textDecorationLine: 'none' },
    list_item: { color: '#cbd5e1', marginBottom: 5 }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#020617]">
        <StatusBar style="light" />
        
        <View className="px-6 pt-6">
            <View className="flex-row justify-between items-center mb-8">
                <View>
                    <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[4px] mb-1">{t('study_journal')}</Text>
                    <Text className="text-4xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>{t('my_journal')}</Text>
                </View>
                <TouchableOpacity onPress={addNote} className="w-16 h-16 rounded-[24px] bg-primary items-center justify-center shadow-2xl shadow-primary/40 border border-white/20">
                    <Plus size={32} color="white" />
                </TouchableOpacity>
            </View>

            <View className="flex-row items-center bg-white/5 border border-white/10 rounded-[28px] px-6 h-16 mb-8">
                <Search size={20} color="#475569" />
                <TextInput placeholder={t('search_note_placeholder')} placeholderTextColor="#475569" className="flex-1 ml-4 text-white text-base" value={search} onChangeText={setSearch} />
                {search.length > 0 && <TouchableOpacity onPress={() => setSearch("")}><X size={20} color="#475569" /></TouchableOpacity>}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                <TouchableOpacity onPress={() => setSelectedFolder("all")} className={cn("px-6 py-4 rounded-3xl mr-3 border", selectedFolder === "all" ? "bg-primary border-primary" : "bg-white/5 border-white/10")}>
                    <Text className={cn("font-bold text-sm", selectedFolder === "all" ? "text-white" : "text-slate-400")}>{t('all_notes')}</Text>
                </TouchableOpacity>
                {folders.map(f => (
                    <TouchableOpacity key={f} onPress={() => setSelectedFolder(f)} onLongPress={() => { Alert.alert("Supprimer le dossier", f, [{text:"Annuler"}, {text:"Supprimer", style:"destructive", onPress:() => {const u = folders.filter(x=>x!==f); setFolders(u); AsyncStorage.setItem("adventools_folders", JSON.stringify(u)); if(selectedFolder===f) setSelectedFolder("all");}}]) }} className={cn("px-6 py-4 rounded-3xl mr-3 border", selectedFolder === f ? "bg-white/10 border-white/20" : "bg-white/5 border-white/10")}>
                        <Text className={cn("font-bold text-sm", selectedFolder === f ? "text-primary" : "text-slate-500")}>{f}</Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setShowFolderModal(true)} className="w-14 h-14 rounded-[22px] bg-white/5 border border-dashed border-white/20 items-center justify-center"><Plus size={20} color="#94a3b8" /></TouchableOpacity>
            </ScrollView>
        </View>

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {filteredNotes.length > 0 ? (
                <View className="flex-row gap-4">
                    <View className="flex-1 gap-4">{filteredNotes.filter((_, i) => i % 2 === 0).map(n => <NoteCard key={n.id} note={n} onPress={() => { setEditingNote(n); setIsPreviewMode(true); addToHistory(n); }} onDelete={() => deleteNote(n.id)} />)}</View>
                    <View className="flex-1 gap-4">{filteredNotes.filter((_, i) => i % 2 !== 0).map(n => <NoteCard key={n.id} note={n} onPress={() => { setEditingNote(n); setIsPreviewMode(true); addToHistory(n); }} onDelete={() => deleteNote(n.id)} />)}</View>
                </View>
            ) : (
                <View className="w-full items-center py-32 opacity-20"><StickyNote size={80} color="#94a3b8" /><Text className="text-white font-bold text-xl mt-6">{t('no_notes_found')}</Text></View>
            )}
        </ScrollView>

        <Modal visible={!!editingNote} animationType="slide" statusBarTranslucent>
            <SafeAreaView className="flex-1 bg-[#0d1117]">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                    <View className="flex-row justify-between items-center px-6 py-4 border-b border-white/5">
                        <TouchableOpacity onPress={async () => { await handleSaveNote(); setEditingNote(null); }} className="w-12 h-12 rounded-full bg-white/5 items-center justify-center border border-white/10"><X size={24} color="#94a3b8" /></TouchableOpacity>
                        <View className="flex-row items-center gap-2">
                            <TouchableOpacity onPress={() => setShowColorPicker(!showColorPicker)} className={cn("w-12 h-12 rounded-full items-center justify-center", showColorPicker ? "bg-primary/20" : "bg-white/5")}>
                                <Palette size={20} color={showColorPicker ? "#60a5fa" : "#8b949e"} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={async () => {
                                    if (!isPreviewMode) {
                                        await handleSaveNote();
                                        setShowAttachments(false);
                                        setShowColorPicker(false);
                                    }
                                    setIsPreviewMode(!isPreviewMode);
                                }} 
                                className={cn("px-6 py-3 rounded-3xl border-2", isPreviewMode ? "bg-white/5 border-white/10" : "bg-primary/20 border-primary")}
                            >
                                <Text className={cn("text-xs font-bold", isPreviewMode ? "text-white" : "text-primary")}>{isPreviewMode ? t('edit').toUpperCase() : t('finish').toUpperCase()}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showColorPicker && (
                        <View className="px-6 py-4 bg-white/5 border-b border-white/5 flex-row gap-3">
                            {NOTE_COLORS.map(c => (
                                <TouchableOpacity key={c.value} onPress={() => updateCurrentNoteState({ color: c.value })} style={{ backgroundColor: c.value }} className={cn("w-10 h-10 rounded-full border-2", editingNote?.color === c.value ? "border-white" : "border-transparent")} />
                            ))}
                        </View>
                    )}

                    {showHighlighter && !isPreviewMode && (
                        <View className="px-6 py-4 bg-white/5 border-b border-white/5 flex-row justify-around">
                            {['#fde047', '#86efac', '#93c5fd', '#f9a8d4'].map(c => (
                                <TouchableOpacity 
                                    key={c} 
                                    onPress={() => {
                                        insertMarkdown(`<mark style="background-color: ${c}">`, '</mark>');
                                        setShowHighlighter(false);
                                    }}
                                    style={{ backgroundColor: c }}
                                    className="w-10 h-10 rounded-full border-2 border-white/20"
                                />
                            ))}
                        </View>
                    )}

                    <ScrollView className="flex-1 px-6 pt-6" keyboardShouldPersistTaps="handled">
                        {editingNote && (
                            <>
                                <View className="flex-row justify-between items-center mb-8">
                                    <View>
                                        <Text className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">{new Date(editingNote.date).toLocaleDateString("fr-FR", { day:'numeric', month:'long', year:'numeric' })}</Text>
                                        <TextInput placeholder={t('note_title_placeholder')} placeholderTextColor="#475569" className="text-3xl font-bold text-white max-w-[250px]" value={editingNote.title} onChangeText={t => updateCurrentNoteState({ title: t })} />
                                    </View>
                                    <TouchableOpacity onPress={() => setShowFolderModal(true)} className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex-row items-center">
                                        <LayoutGrid size={14} color="#94a3b8" className="mr-2" /><Text className="text-white/60 text-xs font-bold">{editingNote.folder || "Catégorie"}</Text>
                                    </TouchableOpacity>
                                </View>

                                {showAttachments && (
                                    <View className="mb-10 bg-white/5 rounded-[40px] p-8 border border-white/10">
                                        <View className="flex-row justify-between items-center mb-8">
                                            <Text className="text-white/40 font-bold text-xs uppercase tracking-widest">Pièces Jointes</Text>
                                            <View className="flex-row gap-4">
                                                <TouchableOpacity onPress={() => pickImage(false)} activeOpacity={0.6} className="w-14 h-14 bg-primary/20 rounded-2xl items-center justify-center border border-primary/20 shadow-sm">
                                                    <Plus size={24} color="#3b82f6" />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => pickImage(true)} activeOpacity={0.6} className="w-14 h-14 bg-primary/20 rounded-2xl items-center justify-center border border-primary/20 shadow-sm">
                                                    <Camera size={24} color="#3b82f6" />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => setShowVoiceModal(true)} activeOpacity={0.6} className="w-14 h-14 bg-primary/20 rounded-2xl items-center justify-center border border-primary/20 shadow-sm">
                                                    <Mic size={24} color="#3b82f6" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <ScrollView horizontal className="mb-8">{editingNote.attachments?.images?.map((u, i) => (
                                            <TouchableOpacity key={i} onPress={() => setSelectedImage(u)} className="mr-4">
                                                <RNImage source={{ uri: u }} className="w-32 h-32 rounded-3xl" />
                                                <TouchableOpacity onPress={(e) => { e.stopPropagation(); const ni = editingNote.attachments?.images?.filter((_, x) => x !== i); updateCurrentNoteState({ attachments: { ...editingNote.attachments, images: ni } })}} className="absolute -top-2 -right-2 w-8 h-8 bg-black/80 rounded-full items-center justify-center border border-white/20">
                                                    <X size={16} color="white" />
                                                </TouchableOpacity>
                                            </TouchableOpacity>
                                        ))}</ScrollView>
                                        {editingNote.attachments?.voice?.map((v, i) => <AudioPlayer key={i} uri={v.uri} />)}
                                    </View>
                                )}

                                {isPreviewMode ? (
                                    <View className="pb-32">
                                        {editingNote.type === 'draw' && editingNote.attachments?.images?.length ? (
                                            <TouchableOpacity onPress={() => setSelectedImage(editingNote.attachments!.images![editingNote.attachments!.images!.length - 1])}>
                                                <RNImage source={{ uri: editingNote.attachments.images[editingNote.attachments.images.length-1] }} className="w-full aspect-square rounded-[40px] mb-10 bg-white" resizeMode="contain" />
                                            </TouchableOpacity>
                                        ) : null}
                                        
                                        {((editingNote.attachments?.images?.length || 0) > (editingNote.type === 'draw' ? 1 : 0)) && (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-10">
                                                {editingNote.attachments?.images?.map((u, i) => (
                                                    (editingNote.type === 'draw' && i === editingNote.attachments!.images!.length - 1) ? null :
                                                    <TouchableOpacity key={i} onPress={() => setSelectedImage(u)}>
                                                        <RNImage source={{ uri: u }} className="w-72 h-48 rounded-[40px] mr-4 border border-white/10" resizeMode="cover" />
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        )}

                                        <Markdown 
                                            style={markdownStyles as any} 
                                            onLinkPress={handleVerseClick}
                                            rules={{
                                                link: (node, children, parent, styles) => {
                                                    const url = node.attributes.href;
                                                    if (url.startsWith('#highlight:')) {
                                                        const color = url.replace('#highlight:', '');
                                                        return <Text key={node.key} style={{ backgroundColor: color, color: '#000', borderRadius: 4, paddingHorizontal: 2, fontSize: 18 }}>{children}</Text>;
                                                    }
                                                    return <Text key={node.key} style={styles.link} onPress={() => handleVerseClick(url)}>{children}</Text>;
                                                }
                                            }}
                                        >
                                            {processContent(editingNote.content || (editingNote.type === 'draw' ? "" : `*${t('no_content')}*`))}
                                        </Markdown>

                                        {editingNote.attachments?.voice?.length ? (
                                            <View className="mt-10 pt-10 border-t border-white/5">
                                                <Text className="text-white/20 font-bold text-[10px] uppercase tracking-[4px] mb-6">Notes Vocales</Text>
                                                {editingNote.attachments.voice.map((v, i) => <AudioPlayer key={i} uri={v.uri} />)}
                                            </View>
                                        ) : null}
                                    </View>
                                ) : (
                                    <TextInput ref={textInputRef} multiline placeholder={t('note_content_placeholder')} placeholderTextColor="#475569" className="text-xl text-slate-200 leading-8 min-h-[400px] mb-40" style={{ fontFamily: 'Lexend_400Regular' }} value={editingNote.content} onChangeText={t => updateCurrentNoteState({ content: t })} onSelectionChange={e => setSelection(e.nativeEvent.selection)} />
                                )}
                            </>
                        )}
                    </ScrollView>

                    {!isPreviewMode && editingNote && (
                        <View className="bg-[#161b22] border-t border-white/10 pb-12 pt-4 px-6">
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                <TouchableOpacity onPress={() => setShowAttachments(!showAttachments)} className={cn("w-14 h-14 rounded-2xl items-center justify-center", showAttachments ? "bg-primary/20" : "bg-white/5")}><Plus size={24} color={showAttachments ? "#60a5fa" : "#8b949e"} /></TouchableOpacity>
                                <TouchableOpacity onPress={() => setShowDrawModal(true)} className="w-14 h-14 bg-white/5 rounded-2xl items-center justify-center ml-3"><Edit size={24} color="#8b949e" /></TouchableOpacity>
                                
                                <View className="w-[1px] h-10 bg-white/10 mx-3" />
                                
                                <TouchableOpacity onPress={() => insertMarkdown('**', '**')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center"><Bold size={20} color="#8b949e" /></TouchableOpacity>
                                <TouchableOpacity onPress={() => insertMarkdown('*', '*')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center mx-2"><Italic size={20} color="#8b949e" /></TouchableOpacity>
                                <TouchableOpacity onPress={() => insertMarkdown('# ', '')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center"><Heading size={20} color="#8b949e" /></TouchableOpacity>
                                <TouchableOpacity onPress={() => insertMarkdown('- ', '')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center mx-2"><List size={20} color="#8b949e" /></TouchableOpacity>
                                
                                <TouchableOpacity onPress={() => setShowHighlighter(!showHighlighter)} className={cn("w-12 h-14 rounded-2xl items-center justify-center", showHighlighter ? "bg-primary/20 border-primary" : "bg-white/5 border-white/10")}><Highlighter size={20} color={showHighlighter ? "#60a5fa" : "#8b949e"} /></TouchableOpacity>
                            </ScrollView>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>

        {/* Voice Recorder Modal */}
        <Modal visible={showVoiceModal} transparent animationType="slide">
            <SafeAreaView className="flex-1 justify-end">
                <View className="bg-[#1c2128] m-4 rounded-[40px] p-8 border border-white/10 shadow-2xl items-center">
                    <Text className="text-white/40 font-bold text-xs uppercase tracking-[4px] mb-8">Enregistrement Vocal</Text>
                    
                    <View className="items-center mb-10">
                        <Text className="text-5xl font-mono text-white mb-2">{Math.floor(recordDuration / 60)}:{String(recordDuration % 60).padStart(2, '0')}</Text>
                        <Text className="text-red-500 animate-pulse font-bold text-xs">{isRecording ? "ENREGISTREMENT EN COURS" : "PRÊT"}</Text>
                    </View>

                    <View className="flex-row gap-6 items-center">
                        <TouchableOpacity 
                            onPress={() => isRecording ? stopRecording(false) : setShowVoiceModal(false)}
                            className="w-16 h-16 rounded-full bg-white/5 items-center justify-center border border-white/10"
                        >
                            <X size={24} color="#94a3b8" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={isRecording ? () => stopRecording(true) : startRecording}
                            className={cn("w-24 h-24 rounded-full items-center justify-center shadow-xl", isRecording ? "bg-red-500" : "bg-primary")}
                        >
                            {isRecording ? <Square size={32} color="white" fill="white" /> : <Mic size={40} color="white" />}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => isRecording ? stopRecording(true) : null}
                            disabled={!isRecording}
                            className={cn("w-16 h-16 rounded-full bg-white/5 items-center justify-center border border-white/10", !isRecording && "opacity-20")}
                        >
                            <Check size={24} color={isRecording ? "#3b82f6" : "#94a3b8"} />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>

        <Modal visible={!!selectedImage} transparent animationType="fade">
            <View className="flex-1 bg-black justify-center items-center">
                <TouchableOpacity onPress={() => setSelectedImage(null)} className="absolute top-12 right-6 z-10 w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                    <X size={24} color="white" />
                </TouchableOpacity>
                {selectedImage && (
                    <RNImage source={{ uri: selectedImage }} className="w-full h-full" resizeMode="contain" />
                )}
                <View className="absolute bottom-12 flex-row gap-4">
                     <TouchableOpacity onPress={() => { /* Share logic if needed */ }} className="w-14 h-14 bg-white/10 rounded-full items-center justify-center">
                        <Share2 size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

        <DrawModal visible={showDrawModal} onClose={() => setShowDrawModal(false)} initialUri={editingNote?.type === 'draw' && editingNote.attachments?.images?.length ? editingNote.attachments.images[editingNote.attachments.images.length-1] : undefined} onSave={(u) => { if(editingNote) updateCurrentNoteState({ attachments: { ...editingNote.attachments, images: [...(editingNote.attachments?.images || []), u] } }); setShowDrawModal(false); }} />

        <Modal visible={showFolderModal} transparent animationType="fade">
            <SafeAreaView className="flex-1 bg-black/80 justify-center px-8">
                <View className="bg-[#1c2128] p-8 rounded-[40px] border border-white/10">
                    <Text className="text-xl font-bold text-white mb-6 text-center">{t('new_folder_title')}</Text>
                    <TextInput autoFocus placeholder={t('folder_name_placeholder')} placeholderTextColor="#475569" className="bg-white/5 text-white p-5 rounded-2xl border border-white/10 mb-6" value={newFolderName} onChangeText={setNewFolderName} />
                    <View className="flex-row gap-4">
                        <TouchableOpacity onPress={() => setShowFolderModal(false)} className="flex-1 py-4"><Text className="text-white/40 text-center">{t('cancel')}</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => {const u = [...folders, newFolderName]; setFolders(u); AsyncStorage.setItem("adventools_folders", JSON.stringify(u)); if(editingNote) updateCurrentNoteState({ folder: newFolderName }); setShowFolderModal(false); setNewFolderName("");}} className="flex-1 bg-primary py-4 rounded-2xl"><Text className="text-white font-bold text-center">{t('create')}</Text></TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>

        <Modal visible={!!detectedVerse} animationType="slide" transparent>
            <SafeAreaView className="flex-1 bg-black/60 justify-end">
                <View className="bg-slate-900 m-4 rounded-[40px] p-8 border border-white/10">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-white font-bold text-xl">{detectedVerse?.book} {detectedVerse?.chapter}:{detectedVerse?.verses}</Text>
                        <TouchableOpacity onPress={() => setDetectedVerse(null)} className="w-10 h-10 bg-white/5 rounded-full items-center justify-center"><X size={20} color="#94a3b8" /></TouchableOpacity>
                    </View>
                    <ScrollView className="max-h-[300px] mb-8">{verseLoading ? <ActivityIndicator color="#3b82f6" /> : <Text className="text-slate-200 text-xl leading-8 italic font-medium">"{verseContent}"</Text>}</ScrollView>
                    <TouchableOpacity onPress={() => { if(currentVerseBookId) router.push({ pathname: "/bible/reader", params: { bookId: String(currentVerseBookId), bookName: detectedVerse?.book || '', chapter: String(detectedVerse?.chapter || '1'), verse: String((detectedVerse?.verses || "").split(/[-,]/)[0] || "1"), lang: globalSettings.bibleVersion, testament: "1" } }); setDetectedVerse(null); }} className="bg-blue-600 py-5 rounded-3xl items-center"><Text className="text-white font-bold text-lg">{t('open_in_bible')}</Text></TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    </SafeAreaView>
  );
}
