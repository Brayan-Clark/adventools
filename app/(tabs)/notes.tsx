import { BIBLE_REGEX, fetchVerseContent } from '@/lib/bible';
import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import { deleteNoteFromDb, getAllNotes, getFolders, saveFolders, saveHistory, saveNote } from '@/lib/user-storage';
import { cn } from '@/lib/utils';
import { Audio } from 'expo-av';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bold, Camera, Check, Edit, Eraser, Folder, Footprints, Heading, Highlighter, Italic, LayoutGrid, List, Mic, Music, Palette, Pause, Play, Plus, Search, Share2, Square, StickyNote, Trash2, Undo2, Video, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, PanResponder, Platform, Image as RNImage, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';

// --- STYLES & CONSTANTS ---

const HIGHLIGHT_COLORS = [
    { id: 'yellow', bg: 'rgba(253, 224, 71, 0.3)', text: '#fde047', border: 'rgba(253, 224, 71, 0.4)' },
    { id: 'green', bg: 'rgba(74, 222, 128, 0.3)', text: '#4ade80', border: 'rgba(74, 222, 128, 0.4)' },
    { id: 'blue', bg: 'rgba(96, 165, 250, 0.3)', text: '#60a5fa', border: 'rgba(96, 165, 250, 0.4)' },
    { id: 'red', bg: 'rgba(248, 113, 113, 0.3)', text: '#f87171', border: 'rgba(248, 113, 113, 0.4)' },
    { id: 'purple', bg: 'rgba(167, 139, 250, 0.3)', text: '#a78bfa', border: 'rgba(167, 139, 250, 0.4)' },
    { id: 'cyan', bg: 'rgba(34, 211, 238, 0.3)', text: '#22d3ee', border: 'rgba(34, 211, 238, 0.4)' },
];

const NOTE_COLORS = [
    { label: 'Slate', value: '#1e293b', border: '#334155' },
    { label: 'Azure', value: '#1e3a8a', border: '#1e40af' },
    { label: 'Indigo', value: '#312e81', border: '#3730a3' },
    { label: 'Emerald', value: '#064e3b', border: '#065f46' },
    { label: 'Teal', value: '#134e4a', border: '#0f766e' },
    { label: 'Rose', value: '#881337', border: '#9f1239' },
    { label: 'Crimson', value: '#7f1d1d', border: '#b91c1c' },
    { label: 'Amber', value: '#78350f', border: '#92400e' },
    { label: 'Brown', value: '#451a03', border: '#78350f' },
    { label: 'Violet', value: '#4c1d95', border: '#5b21b6' },
];

const FULL_PALETTE = [
    '#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#f1f5f9',
    '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca',
    '#7c2d12', '#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7',
    '#064e3b', '#065f46', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0',
    '#0c4a6e', '#075985', '#0369a1', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd',
    '#1e3a8a', '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe',
    '#4c1d95', '#5b21b6', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ede9fe',
    '#831843', '#9d174d', '#be123c', '#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#fff1f2',
];

// Helper to convert HSV to HEX (simplified)
const hsvToHex = (h: number, s: number, v: number) => {
    s /= 100; v /= 100;
    const k = (n: number) => (n + h / 60) % 6;
    const f = (n: number) => v * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
    const rgb = [f(5), f(3), f(1)].map(x => Math.floor(x * 255).toString(16).padStart(2, '0'));
    return `#${rgb.join('')}`.toUpperCase();
};

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
        videos?: string[];
        voice?: { uri: string, duration?: number }[];
    };
}

// --- HELPERS ---

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

// --- COMPONENTS ---

const AudioPlayer = ({ uri, onDelete }: { uri: string, onDelete?: () => void }) => {
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
        <View className="flex-row items-center mb-2">
            <TouchableOpacity
                onPress={isPlaying ? pauseSound : playSound}
                className="bg-white/5 p-4 rounded-3xl border border-white/10 flex-1 flex-row items-center"
            >
                <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                    {isPlaying ? <Pause size={18} color="#3b82f6" /> : <Play size={18} color="#3b82f6" />}
                </View>
                <View className="ml-4 flex-1">
                    <Text className="text-white font-bold text-xs">Vocal</Text>
                    <Text className="text-white/40 text-[9px]">{isPlaying ? "Lecture en cours..." : "Cliquer pour écouter"}</Text>
                </View>
            </TouchableOpacity>
            
            {onDelete && (
                <TouchableOpacity 
                    onPress={onDelete}
                    className="ml-3 w-10 h-10 bg-red-500/10 rounded-2xl items-center justify-center border border-red-500/20"
                >
                    <Trash2 size={18} color="#f87171" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const VideoPlayer = ({ uri }: { uri: string }) => {
    const player = useVideoPlayer(uri, (p) => {
        p.loop = false;
    });

    return (
        <View className="mb-4 rounded-[32px] overflow-hidden border border-white/10 bg-black">
            <VideoView
                player={player}
                nativeControls
                contentFit="contain"
                style={{ width: '100%', height: 250 }}
            />
        </View>
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
    const { width: windowWidth } = useWindowDimensions();
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
    const [showColorPrompt, setShowColorPrompt] = useState(false);
    const [colorPromptType, setColorPromptType] = useState<'note' | 'highlight'>('note');
    const [customColorInput, setCustomColorInput] = useState("#");
    const [pickerH, setPickerH] = useState(0);
    const [pickerS, setPickerS] = useState(100);
    const [pickerV, setPickerV] = useState(100);
    const [pickerSize, setPickerSize] = useState({ width: 300, height: 300 });

    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordDuration, setRecordDuration] = useState(0);
    const [recordMode, setRecordMode] = useState<'attachment' | 'inline'>('attachment');
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [showNoteTypeModal, setShowNoteTypeModal] = useState(false);
    const recordInterval = useRef<any>(null);

    const [detectedVerse, setDetectedVerse] = useState<{ book: string, chapter: string, verses: string, bookId?: number } | null>(null);
    const [verseContent, setVerseContent] = useState<string | null>(null);
    const [currentVerseBookId, setCurrentVerseBookId] = useState<number | null>(null);
    const [verseLoading, setVerseLoading] = useState(false);

    const textInputRef = useRef<TextInput>(null);
    const { settings: globalSettings } = useSettings();

    // --- CORE LOGIC ---

    const { id: noteIdParam } = useLocalSearchParams();

    useEffect(() => { loadInitialData(); }, []);

    useEffect(() => {
        if (noteIdParam && notes.length > 0) {
            const note = notes.find(n => n.id === noteIdParam);
            if (note) {
                setEditingNote(note);
                setIsPreviewMode(true);
            }
        }
    }, [noteIdParam, notes]);

    const loadInitialData = async () => {
        try {
            const [savedNotes, savedFolders] = await Promise.all([
                getAllNotes(),
                getFolders()
            ]);
            setNotes(savedNotes);
            setFolders(savedFolders);
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
        } catch (e) { console.error(e); }
    };

    const updateCurrentNoteState = (partialNote: Partial<Note>) => {
        setEditingNote(prev => prev ? ({ ...prev, ...partialNote }) : null);
    };

    const handleSaveNote = async () => {
        if (!editingNote) return;
        await saveNote(editingNote);
        const exists = notes.find(n => n.id === editingNote.id);
        const updated = exists ? notes.map(n => n.id === editingNote.id ? editingNote : n) : [editingNote, ...notes];
        setNotes(updated);
    };

    const addToHistory = async (note: Note) => {
        try {
            await saveHistory({
                type: 'note',
                title: note.title || t('untitled_note'),
                subtitle: `Note • ${new Date(note.date).toLocaleDateString("fr-FR")}`,
                timestamp: Date.now(),
                params: { id: note.id }
            });
        } catch (e) {
            console.error("Failed to add note to history", e);
        }
    };

    const deleteNote = (id: string) => {
        Alert.alert("Supprimer", "Retirer cette note ?", [
            { text: "Annuler", style: "cancel" },
            {
                text: "Supprimer", style: "destructive", onPress: async () => {
                    await deleteNoteFromDb(id);
                    setNotes(notes.filter(n => n.id !== id));
                }
            }
        ]);
    };

    const addNote = () => {
        setShowNoteTypeModal(true);
    };

    const handleCreateNote = (type: 'text' | 'draw') => {
        const n: Note = { 
            id: Date.now().toString(), 
            type, 
            title: "", 
            content: "", 
            date: Date.now(), 
            folder: selectedFolder !== 'all' ? selectedFolder : undefined 
        };
        setEditingNote(n); 
        setIsPreviewMode(false);
        setShowNoteTypeModal(false);
        if (type === 'draw') setShowDrawModal(true);
    };

    const pickAndInsertMedia = async (type: 'image' | 'video' | 'audio') => {
        try {
            let options: any = {
                mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: type === 'image',
                quality: 0.8,
            };

            const r = await ImagePicker.launchImageLibraryAsync(options);

            if (!r.canceled && editingNote) {
                const asset = r.assets[0];
                const permanentUri = await saveFilePermanently(asset.uri, type === 'audio' ? 'voice' : (type === 'video' ? 'video' : 'image'));
                
                const tag = `[${type}: ${permanentUri}]`;
                insertMarkdown(tag, '');
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Erreur", "Impossible d'insérer le média.");
        }
    };

    const pickMedia = async (useCamera: boolean = false, mediaType: 'Images' | 'Videos' | 'All' = 'All') => {
        try {
            const { status } = useCamera
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert("Permission refusée", "L'accès à la caméra ou à la galerie est nécessaire.");
                return;
            }

            const options = {
                mediaTypes: ImagePicker.MediaTypeOptions[mediaType],
                allowsEditing: mediaType === 'Images', // Only edit photos
                quality: 0.8,
                videoMaxDuration: 120,
            };

            const r = useCamera
                ? await ImagePicker.launchCameraAsync(options)
                : await ImagePicker.launchImageLibraryAsync(options);

            if (!r.canceled && editingNote) {
                const asset = r.assets[0];
                const isVid = asset.type === 'video';
                const permanentUri = await saveFilePermanently(asset.uri, isVid ? 'video' : 'image');

                const updatedAttachments = { ...editingNote.attachments };
                if (isVid) {
                    updatedAttachments.videos = [...(updatedAttachments.videos || []), permanentUri];
                } else {
                    updatedAttachments.images = [...(updatedAttachments.images || []), permanentUri];
                }

                const updatedNote = { ...editingNote, attachments: updatedAttachments };
                setEditingNote(updatedNote);

                const updatedNotesList = notes.map(n => n.id === updatedNote.id ? updatedNote : n);
                await saveAllNotes(updatedNotesList.find(n => n.id === updatedNote.id) ? updatedNotesList : [updatedNote, ...notes]);
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Erreur", "Impossible d'accéder aux médias.");
        }
    };

    const startRecording = async () => {
        try {
            // Always request directly if not granted
            const { status } = await Audio.requestPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    "Microphone bloqué",
                    "L'autorisation du micro est nécessaire pour enregistrer. Veuillez l'activer dans les paramètres de votre appareil.",
                    [{ text: "OK" }]
                );
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            if (recording) {
                try { await recording.stopAndUnloadAsync(); } catch (e) { }
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
            await (recording as Audio.Recording).stopAndUnloadAsync();
            const uri = (recording as Audio.Recording).getURI();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

            if (save && uri && editingNote) {
                const pUri = await saveFilePermanently(uri, 'voice');
                
                if (recordMode === 'inline') {
                    const tag = `[audio: ${pUri}]`;
                    insertMarkdown(tag, '');
                } else {
                    const updatedAttachments = {
                        ...editingNote.attachments,
                        voice: [...(editingNote.attachments?.voice || []), { uri: pUri, duration: recordDuration }]
                    };
                    const updatedNote = { ...editingNote, attachments: updatedAttachments };
                    setEditingNote(updatedNote);

                    // Auto-save immediately to prevent data loss
                    const updatedNotesList = notes.map(n => n.id === updatedNote.id ? updatedNote : n);
                    await saveAllNotes(updatedNotesList.find(n => n.id === updatedNote.id) ? updatedNotesList : [updatedNote, ...notes]);
                }
            }
        } catch (e) {
            console.error("Stop Recording Error", e);
        } finally {
            setRecording(null);
            setRecordDuration(0);
            setShowVoiceModal(false);
            setRecordMode('attachment'); // Reset
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
        
        // Footnotes References [^1]
        output = output.replace(/\[\^(\d+)\](?!\:)/g, (match, ref) => `[${ref}](#footnote-ref:${ref})`);
        
        // Footnotes Definitions [^1]: text
        output = output.replace(/^\[\^(\d+)\]:\s*(.*)$/gm, (match, ref, text) => `[${text}](#footnote-def:${ref})`);

        output = output.replace(/<mark style="background-color:\s*(#[a-fA-F0-9]+)">([\s\S]*?)<\/mark>/gi, (match, color, content) => {
            return `[${content}](#highlight:${color})`;
        });
        return output;
    };

    const renderNoteContent = (text: string) => {
        if (!text) return <Text className="text-white/20 italic">{t('no_content')}</Text>;

        const parts = text.split(/(\[(?:image|video|audio):\s*[^\]]+\])/gi);

        return parts.map((part, index) => {
            const imageMatch = part.match(/\[image:\s*([^\]]+)\]/i);
            const videoMatch = part.match(/\[video:\s*([^\]]+)\]/i);
            const audioMatch = part.match(/\[audio:\s*([^\]]+)\]/i);

            if (imageMatch) {
                const uri = imageMatch[1].trim();
                return (
                    <TouchableOpacity key={index} onPress={() => setSelectedImage(uri)} className="my-4">
                        <RNImage 
                            source={{ uri }} 
                            style={{ width: '100%', height: 220, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)' }} 
                            resizeMode="cover" 
                        />
                    </TouchableOpacity>
                );
            }
            if (videoMatch) {
                return <View key={index} className="my-4"><VideoPlayer uri={videoMatch[1].trim()} /></View>;
            }
            if (audioMatch) {
                return <View key={index} className="my-2"><AudioPlayer uri={audioMatch[1].trim()} /></View>;
            }

            return (
                <Markdown
                    key={index}
                    style={markdownStyles as any}
                    onLinkPress={handleVerseClick}
                    rules={{
                        link: (node, children, parent, styles) => {
                            const url = node.attributes.href;
                            if (url.startsWith('#highlight:')) {
                                const color = url.replace('#highlight:', '');
                                return <Text key={node.key} style={{ backgroundColor: color, color: '#000', borderRadius: 4, paddingHorizontal: 2, fontSize: 18 }}>{children}</Text>;
                            }
                            if (url.startsWith('#footnote-ref:')) {
                                const ref = url.replace('#footnote-ref:', '');
                                return <Text key={node.key} style={{ fontSize: 12, color: '#3b82f6', verticalAlign: 'top', fontWeight: 'bold' }}> {ref}</Text>;
                            }
                            if (url.startsWith('#footnote-def:')) {
                                const ref = url.replace('#footnote-def:', '');
                                return (
                                    <View key={node.key} className="flex-row mt-4 pt-4 border-t border-white/5">
                                        <Text className="text-primary font-bold mr-2 text-xs">{ref}.</Text>
                                        <Text className="text-white/40 text-xs flex-1 italic">{children}</Text>
                                    </View>
                                );
                            }
                            return <Text key={node.key} style={styles.link} onPress={() => handleVerseClick(url)}>{children}</Text>;
                        },
                        image: () => null // Handled hybridly
                    }}
                >
                    {processContent(part)}
                </Markdown>
            );
        });
    };

    const handleVerseClick = (url: string) => {
        if (url.startsWith('#verse:')) {
            const parts = url.replace('#verse:', '').split('/');
            setDetectedVerse({ book: decodeURIComponent(parts[0]), chapter: parts[1], verses: parts[2] || "" });
            return false;
        }
        if (url.startsWith('#highlight:')) return false;
        if (url.startsWith('#inline-')) return false;
        if (url.startsWith('#footnote-')) return false;
        return true;
    };

    const filteredNotes = notes.filter(n => {
        const m = (n.title + n.content).toLowerCase().includes(search.toLowerCase());
        return selectedFolder === 'all' ? m : m && n.folder === selectedFolder;
    });

    // --- RENDERING ---

    const markdownStyles = {
        body: { color: '#e2e8f0', fontSize: 18, lineHeight: 30, fontFamily: 'Lexend_400Regular' },
        heading1: { color: '#ffffff', fontSize: 28, fontFamily: 'Lexend_700Bold', marginTop: 20, marginBottom: 10 },
        heading2: { color: '#ffffff', fontSize: 24, fontFamily: 'Lexend_700Bold', marginTop: 15, marginBottom: 8 },
        heading3: { color: '#ffffff', fontSize: 20, fontFamily: 'Lexend_600SemiBold', marginTop: 12, marginBottom: 6 },
        strong: { fontFamily: 'Lexend_700Bold', color: '#ffffff' },
        em: { fontStyle: 'italic', color: '#cbd5e1' },
        link: { color: '#3b82f6', textDecorationLine: 'none' },
        list_item: { color: '#cbd5e1', marginBottom: 5 },
        blockquote: {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderLeftColor: '#3b82f6',
            borderLeftWidth: 4,
            paddingHorizontal: 15,
            paddingVertical: 10,
            marginVertical: 10,
            borderRadius: 8,
        },
        code_inline: {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fbbf24',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            fontSize: 16,
        },
        code_block: {
            backgroundColor: '#0f172a',
            color: '#94a3b8',
            padding: 15,
            borderRadius: 12,
            marginVertical: 10,
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.05)',
        },
        fence: {
            backgroundColor: '#0f172a',
            color: '#94a3b8',
            padding: 15,
            borderRadius: 12,
            marginVertical: 10,
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.05)',
        },
        table: {
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
        },
        tr: {
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        },
        th: {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 'bold',
            padding: 8,
        },
        td: {
            color: '#cbd5e1',
            padding: 8,
        },
        hr: {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            height: 1,
            marginVertical: 20,
        }
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
                        <TouchableOpacity key={f} onPress={() => setSelectedFolder(f)} onLongPress={() => { Alert.alert("Supprimer le dossier", f, [{ text: "Annuler" }, { text: "Supprimer", style: "destructive", onPress: async () => { const u = folders.filter(x => x !== f); setFolders(u); await saveFolders(u); if (selectedFolder === f) setSelectedFolder("all"); } }]) }} className={cn("px-6 py-4 rounded-3xl mr-3 border", selectedFolder === f ? "bg-white/10 border-white/20" : "bg-white/5 border-white/10")}>
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
                <View className="flex-1 bg-[#0d1117]">
                    <SafeAreaView edges={['top']} className="bg-[#0d1117] border-b border-white/5">
                        <View className="flex-row justify-between items-center px-6 py-4">
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
                    </SafeAreaView>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">

                        {showColorPicker && (
                            <View className="px-6 py-4 bg-white/5 border-b border-white/5">
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-2">
                                    {NOTE_COLORS.map(c => (
                                        <TouchableOpacity key={c.value} onPress={() => updateCurrentNoteState({ color: c.value })} style={{ backgroundColor: c.value }} className={cn("w-12 h-12 rounded-full border-2 mr-3", editingNote?.color === c.value ? "border-white" : "border-transparent")} />
                                    ))}
                                    <TouchableOpacity
                                        onPress={() => {
                                            setCustomColorInput(editingNote?.color || "#");
                                            setColorPromptType('note');
                                            setShowColorPrompt(true);
                                        }}
                                        className="w-12 h-12 rounded-full border-2 border-dashed border-white/40 items-center justify-center"
                                    >
                                        <Plus size={20} color="white" />
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        )}

                        {showHighlighter && !isPreviewMode && (
                            <View className="px-6 py-4 bg-white/5 border-b border-white/5">
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-2">
                                    {HIGHLIGHT_COLORS.map(c => (
                                        <TouchableOpacity
                                            key={c.id}
                                            onPress={() => {
                                                insertMarkdown(`<mark style="background-color: ${c.text}">`, '</mark>');
                                                setShowHighlighter(false);
                                            }}
                                            style={{ backgroundColor: c.text }}
                                            className="w-12 h-12 rounded-full border-2 border-white/20 mr-4"
                                        />
                                    ))}
                                    <TouchableOpacity
                                        onPress={() => {
                                            setCustomColorInput("#");
                                            setColorPromptType('highlight');
                                            setShowColorPrompt(true);
                                        }}
                                        className="w-12 h-12 rounded-full border-2 border-dashed border-white/40 items-center justify-center mr-4"
                                    >
                                        <Plus size={20} color="white" />
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        )}

                        <ScrollView className="flex-1 px-6 pt-2" keyboardShouldPersistTaps="handled">
                            {editingNote && (
                                <>
                                    <View className="flex-row justify-between items-center mb-8">
                                        <View>
                                            <Text className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">{new Date(editingNote.date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
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
                                                <View className="flex-row gap-3">
                                                    <TouchableOpacity onPress={() => pickMedia(false, 'All')} activeOpacity={0.6} className="w-12 h-12 bg-primary/20 rounded-2xl items-center justify-center border border-primary/20">
                                                        <LayoutGrid size={20} color="#3b82f6" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => pickMedia(true, 'Images')} activeOpacity={0.6} className="w-12 h-12 bg-primary/20 rounded-2xl items-center justify-center border border-primary/20">
                                                        <Camera size={20} color="#3b82f6" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => pickMedia(true, 'Videos')} activeOpacity={0.6} className="w-12 h-12 bg-primary/20 rounded-2xl items-center justify-center border border-primary/20">
                                                        <Video size={20} color="#3b82f6" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => { setRecordMode('attachment'); setShowVoiceModal(true); }} activeOpacity={0.6} className="w-12 h-12 bg-primary/20 rounded-2xl items-center justify-center border border-primary/20">
                                                        <Mic size={20} color="#3b82f6" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <ScrollView horizontal className="mb-4">{editingNote.attachments?.videos?.map((u, i) => (
                                                <TouchableOpacity key={i} className="mr-4">
                                                    <View className="w-32 h-32 rounded-3xl bg-black items-center justify-center border border-white/20">
                                                        <Play size={24} color="white" />
                                                    </View>
                                                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); const nv = editingNote.attachments?.videos?.filter((_, x) => x !== i); updateCurrentNoteState({ attachments: { ...editingNote.attachments, videos: nv } }) }} className="absolute -top-2 -right-2 w-8 h-8 bg-black/80 rounded-full items-center justify-center border border-white/20">
                                                        <X size={16} color="white" />
                                                    </TouchableOpacity>
                                                </TouchableOpacity>
                                            ))}</ScrollView>
                                            <ScrollView horizontal className="mb-8">{editingNote.attachments?.images?.map((u, i) => (
                                                <TouchableOpacity key={i} onPress={() => setSelectedImage(u)} className="mr-4">
                                                    <RNImage source={{ uri: u }} className="w-32 h-32 rounded-3xl" />
                                                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); const ni = editingNote.attachments?.images?.filter((_, x) => x !== i); updateCurrentNoteState({ attachments: { ...editingNote.attachments, images: ni } }) }} className="absolute -top-2 -right-2 w-8 h-8 bg-black/80 rounded-full items-center justify-center border border-white/20">
                                                        <X size={16} color="white" />
                                                    </TouchableOpacity>
                                                </TouchableOpacity>
                                            ))}</ScrollView>
                                            {editingNote.attachments?.voice?.map((v, i) => (
                                                <AudioPlayer 
                                                    key={i} 
                                                    uri={v.uri} 
                                                    onDelete={() => {
                                                        const nv = editingNote.attachments?.voice?.filter((_, x) => x !== i);
                                                        updateCurrentNoteState({ attachments: { ...editingNote.attachments, voice: nv } });
                                                    }}
                                                />
                                            ))}
                                        </View>
                                    )}

                                    {isPreviewMode ? (
                                        <View className="pb-32">
                                            {editingNote.type === 'draw' && editingNote.attachments?.images?.length ? (
                                                <TouchableOpacity onPress={() => setSelectedImage(editingNote.attachments!.images![editingNote.attachments!.images!.length - 1])}>
                                                    <RNImage source={{ uri: editingNote.attachments.images[editingNote.attachments.images.length - 1] }} className="w-full aspect-square rounded-[40px] mb-10 bg-white" resizeMode="contain" />
                                                </TouchableOpacity>
                                            ) : null}

                                            {renderNoteContent(editingNote.content)}

                                            {/* Attachments Grouped at bottom */}
                                            <View className="mt-12 pt-10 border-t border-white/5">
                                                <Text className="text-white/20 font-bold text-[10px] uppercase tracking-[4px] mb-8">Pièces Jointes & Médias</Text>
                                                
                                                {((editingNote.attachments?.images?.length || 0) > (editingNote.type === 'draw' ? 1 : 0)) && (
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8">
                                                        {editingNote.attachments?.images?.map((u, i) => (
                                                            (editingNote.type === 'draw' && i === editingNote.attachments!.images!.length - 1) ? null :
                                                                <TouchableOpacity key={i} onPress={() => setSelectedImage(u)}>
                                                                    <RNImage source={{ uri: u }} className="w-72 h-48 rounded-[40px] mr-4 border border-white/10" resizeMode="cover" />
                                                                </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                )}

                                                {editingNote.attachments?.videos?.map((v, i) => <VideoPlayer key={i} uri={v} />)}
                                                {editingNote.attachments?.voice?.map((v, i) => <AudioPlayer key={i} uri={v.uri} />)}
                                            </View>
                                        </View>
                                    ) : (
                                        <TextInput ref={textInputRef} multiline textAlignVertical="top" placeholder={t('note_content_placeholder')} placeholderTextColor="#475569" className="text-xl text-slate-200 leading-8 min-h-[400px] mb-40" style={{ fontFamily: 'Lexend_400Regular' }} value={editingNote.content || ""} onChangeText={t => updateCurrentNoteState({ content: t })} onSelectionChange={e => setSelection(e.nativeEvent.selection)} />
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

                                    {/* Formatting */}
                                    <TouchableOpacity onPress={() => insertMarkdown('**', '**')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center"><Bold size={20} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => insertMarkdown('*', '*')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center mx-2"><Italic size={20} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => insertMarkdown('# ', '')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center"><Heading size={20} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => insertMarkdown('- ', '')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center mx-2"><List size={20} color="#8b949e" /></TouchableOpacity>

                                    <View className="w-[1px] h-10 bg-white/10 mx-3" />

                                    {/* Advanced Formatting */}
                                    <TouchableOpacity onPress={() => {
                                        const refNum = (editingNote.content.match(/\[\^(\d+)\]/g)?.length || 0) + 1;
                                        const newRef = `[^${refNum}]`;
                                        const newDef = `\n\n[^${refNum}]: `;
                                        
                                        const { start, end } = selection;
                                        const prev = editingNote.content;
                                        const contentWithRef = prev.substring(0, start) + newRef + prev.substring(end);
                                        
                                        updateCurrentNoteState({ content: contentWithRef + newDef });
                                    }} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center"><Footprints size={20} color="#8b949e" /></TouchableOpacity>
                                    
                                    <View className="w-[1px] h-10 bg-white/10 mx-3" />

                                    {/* Inline Media */}
                                    <TouchableOpacity onPress={() => pickAndInsertMedia('image')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center"><Camera size={20} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => pickAndInsertMedia('video')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center mx-2"><Video size={20} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setRecordMode('inline'); setShowVoiceModal(true); }} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center"><Mic size={20} color="#8b949e" /></TouchableOpacity>

                                    <View className="w-[1px] h-10 bg-white/10 mx-3" />

                                    <TouchableOpacity onPress={() => setShowHighlighter(!showHighlighter)} className={cn("w-12 h-14 rounded-2xl items-center justify-center", showHighlighter ? "bg-primary/20 border-primary" : "bg-white/5 border-white/10")}><Highlighter size={20} color={showHighlighter ? "#60a5fa" : "#8b949e"} /></TouchableOpacity>
                                </ScrollView>
                            </View>
                        )}
                    </KeyboardAvoidingView>
                </View>
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
                <View className="flex-1 bg-black">
                    <TouchableOpacity onPress={() => setSelectedImage(null)} className="absolute top-12 right-6 z-50 w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                        <X size={24} color="white" />
                    </TouchableOpacity>
                    
                    {(() => {
                        const inlineImages = editingNote?.content?.match(/\[image:\s*([^\]]+)\]/gi)?.map(m => m.match(/\[image:\s*([^\]]+)\]/i)![1]) || [];
                        const attachmentImages = editingNote?.attachments?.images || [];
                        const allImages = Array.from(new Set([...attachmentImages, ...inlineImages]));
                        const currentIndex = allImages.indexOf(selectedImage!);
                        
                        return (
                            <>
                                <ScrollView 
                                    horizontal 
                                    pagingEnabled 
                                    showsHorizontalScrollIndicator={false}
                                    contentOffset={{ x: (currentIndex >= 0 ? currentIndex : 0) * windowWidth, y: 0 }}
                                >
                                    {allImages.map((img, idx) => (
                                        <View key={idx} style={{ width: windowWidth }} className="justify-center items-center">
                                            <RNImage source={{ uri: img }} className="w-full h-full" resizeMode="contain" />
                                        </View>
                                    ))}
                                </ScrollView>

                                <View className="absolute bottom-12 w-full items-center">
                                    <View className="bg-black/50 px-6 py-3 rounded-full border border-white/10">
                                        <Text className="text-white font-bold text-xs uppercase tracking-widest">
                                            {(currentIndex >= 0 ? currentIndex : 0) + 1} / {allImages.length}
                                        </Text>
                                    </View>
                                </View>
                            </>
                        );
                    })()}
                </View>
            </Modal>

            <DrawModal visible={showDrawModal} onClose={() => setShowDrawModal(false)} initialUri={editingNote?.type === 'draw' && editingNote.attachments?.images?.length ? editingNote.attachments.images[editingNote.attachments.images.length - 1] : undefined} onSave={(u) => { if (editingNote) updateCurrentNoteState({ attachments: { ...editingNote.attachments, images: [...(editingNote.attachments?.images || []), u] } }); setShowDrawModal(false); }} />

            <Modal visible={showFolderModal} transparent animationType="fade">
                <View className="flex-1 bg-black/60 justify-center px-10">
                    <View className="bg-[#1a2233] rounded-[40px] p-10 border border-slate-700 shadow-2xl">
                        <Text className="text-white font-bold text-xl mb-6">Ajouter un dossier</Text>
                        <TextInput
                            placeholder={t('folder_name_placeholder')}
                            placeholderTextColor="#475569"
                            className="bg-white/5 border border-white/10 p-5 rounded-2xl text-white mb-8"
                            value={newFolderName}
                            onChangeText={setNewFolderName}
                        />
                        <View className="flex-row gap-4">
                            <TouchableOpacity onPress={() => setShowFolderModal(false)} className="flex-1 p-5 rounded-2xl bg-white/5 items-center"><Text className="text-slate-400 font-bold">{t('cancel')}</Text></TouchableOpacity>
                            <TouchableOpacity onPress={async () => {
                                if (newFolderName) {
                                    const u = [...folders, newFolderName];
                                    setFolders(u);
                                    await saveFolders(u);
                                    if (editingNote) updateCurrentNoteState({ folder: newFolderName });
                                }
                                setShowFolderModal(false);
                                setNewFolderName("");
                            }} className="flex-1 p-5 rounded-2xl bg-primary items-center"><Text className="text-white font-bold">{t('create')}</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={!!detectedVerse} animationType="slide" transparent>
                <SafeAreaView className="flex-1 bg-black/60 justify-end">
                    <View className="bg-slate-900 m-4 rounded-[40px] p-8 border border-white/10">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-white font-bold text-xl">{detectedVerse?.book} {detectedVerse?.chapter}:{detectedVerse?.verses}</Text>
                            <TouchableOpacity onPress={() => setDetectedVerse(null)} className="w-10 h-10 bg-white/5 rounded-full items-center justify-center"><X size={20} color="#94a3b8" /></TouchableOpacity>
                        </View>
                        <ScrollView className="max-h-[300px] mb-8">{verseLoading ? <ActivityIndicator color="#3b82f6" /> : <Text className="text-slate-200 text-xl leading-8 italic font-medium">"{verseContent}"</Text>}</ScrollView>
                        <TouchableOpacity onPress={() => { if (currentVerseBookId) router.push({ pathname: "/bible/reader", params: { bookId: String(currentVerseBookId), bookName: detectedVerse?.book || '', chapter: String(detectedVerse?.chapter || '1'), verse: String((detectedVerse?.verses || "").split(/[-,]/)[0] || "1"), lang: globalSettings.bibleVersion, testament: "1" } }); setDetectedVerse(null); }} className="bg-blue-600 py-5 rounded-3xl items-center"><Text className="text-white font-bold text-lg">{t('open_in_bible')}</Text></TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Custom Color Prompt Modal */}
            <Modal visible={showColorPrompt} transparent animationType="slide">
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-[#0f172a] rounded-t-[40px] p-8 border-t border-white/10 shadow-2xl">
                        <View className="flex-row justify-between items-center mb-6">
                            <View>
                                <Text className="text-white font-bold text-xl">{colorPromptType === 'note' ? "Couleur de la note" : "Surlignage"}</Text>
                                <Text className="text-slate-500 text-xs">Choisissez une nuance premium</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowColorPrompt(false)} className="w-10 h-10 bg-white/5 rounded-full items-center justify-center">
                                <X size={20} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-1 mb-6">
                            <View style={{ backgroundColor: customColorInput }} className="w-8 h-8 rounded-full border border-white/20 mr-3" />
                            <TextInput
                                placeholder="#FFFFFF"
                                placeholderTextColor="#475569"
                                className="flex-1 h-12 text-white font-bold text-lg"
                                value={customColorInput}
                                onChangeText={(t) => {
                                    setCustomColorInput(t);
                                    // If valid hex, try to update HSV (complex, but optional for now)
                                }}
                                autoCapitalize="characters"
                                maxLength={7}
                            />
                        </View>

                        <View className="mb-10 items-center">
                            <View
                                onLayout={(e) => {
                                    const { width, height } = e.nativeEvent.layout;
                                    setPickerSize({ width, height });
                                }}
                                className="w-full aspect-square rounded-3xl overflow-hidden border border-white/10 mb-6 bg-white"
                            >
                                <LinearGradient colors={[`hsl(${pickerH}, 100%, 50%)`, 'white']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} className="flex-1">
                                    <LinearGradient colors={['transparent', 'black']} className="flex-1">
                                        <View
                                            {...PanResponder.create({
                                                onStartShouldSetPanResponder: () => true,
                                                onMoveShouldSetPanResponder: () => true,
                                                onPanResponderGrant: (e, gs) => {
                                                    const { locationX, locationY } = e.nativeEvent;
                                                    const s = Math.max(0, Math.min(100, (locationX / pickerSize.width) * 100));
                                                    const v = Math.max(0, Math.min(100, 100 - (locationY / pickerSize.height) * 100));
                                                    setPickerS(s); setPickerV(v);
                                                    setCustomColorInput(hsvToHex(pickerH, s, v));
                                                },
                                                onPanResponderMove: (e, gs) => {
                                                    const { locationX, locationY } = e.nativeEvent;
                                                    const s = Math.max(0, Math.min(100, (locationX / pickerSize.width) * 100));
                                                    const v = Math.max(0, Math.min(100, 100 - (locationY / pickerSize.height) * 100));
                                                    setPickerS(s); setPickerV(v);
                                                    setCustomColorInput(hsvToHex(pickerH, s, v));
                                                }
                                            }).panHandlers}
                                            className="flex-1"
                                        >
                                            <View
                                                pointerEvents="none"
                                                style={{ left: `${pickerS}%`, bottom: `${pickerV}%`, transform: [{ translateX: -10 }, { translateY: 10 }] }}
                                                className="w-5 h-5 rounded-full border-2 border-white absolute shadow-lg z-50"
                                            />
                                        </View>
                                    </LinearGradient>
                                </LinearGradient>
                            </View>

                            <LinearGradient colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="w-full h-10 rounded-full border border-white/10">
                                <View
                                    onLayout={(e) => { /* Reuse or separate width if different */ }}
                                    {...PanResponder.create({
                                        onStartShouldSetPanResponder: () => true,
                                        onMoveShouldSetPanResponder: () => true,
                                        onPanResponderGrant: (e, gs) => {
                                            const h = Math.max(0, Math.min(360, (e.nativeEvent.locationX / pickerSize.width) * 360));
                                            setPickerH(h);
                                            setCustomColorInput(hsvToHex(h, pickerS, pickerV));
                                        },
                                        onPanResponderMove: (e, gs) => {
                                            const h = Math.max(0, Math.min(360, (e.nativeEvent.locationX / pickerSize.width) * 360));
                                            setPickerH(h);
                                            setCustomColorInput(hsvToHex(h, pickerS, pickerV));
                                        }
                                    }).panHandlers}
                                    className="flex-1"
                                >
                                    <View pointerEvents="none" style={{ left: `${(pickerH / 360) * 100}%`, transform: [{ translateX: -12 }] }} className="w-6 h-full bg-white rounded-full border-2 border-black/20 shadow-xl" />
                                </View>
                            </LinearGradient>
                        </View>

                        <View className="flex-row flex-wrap justify-between gap-y-2 mb-8">
                            {FULL_PALETTE.slice(0, 16).map(c => (
                                <TouchableOpacity key={c} onPress={() => { setCustomColorInput(c); /* Update HSV would be better but complex */ }} style={{ backgroundColor: c }} className="w-[11%] aspect-square rounded-full border border-white/10" />
                            ))}
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                if (/^#[0-9A-F]{3,6}$/i.test(customColorInput)) {
                                    if (colorPromptType === 'note') {
                                        updateCurrentNoteState({ color: customColorInput });
                                    } else {
                                        insertMarkdown(`<mark style="background-color: ${customColorInput}">`, '</mark>');
                                        setShowHighlighter(false);
                                    }
                                    setShowColorPrompt(false);
                                } else {
                                    Alert.alert("Erreur", "Format de couleur invalide");
                                }
                            }}
                            className="w-full p-5 rounded-3xl bg-primary items-center shadow-xl shadow-primary/20"
                        >
                            <Text className="text-white font-bold text-lg">Appliquer la couleur</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {/* Note Type Modal */}
            <Modal visible={showNoteTypeModal} transparent animationType="fade">
                <View className="flex-1 bg-black/80 items-center justify-center px-6">
                    <View className="w-full bg-[#1c2128] rounded-[40px] p-8 border border-white/10 shadow-2xl">
                        <Text className="text-white text-2xl font-bold mb-2 text-center" style={{ fontFamily: 'Lexend_700Bold' }}>{t('create_note')}</Text>
                        <Text className="text-white/40 text-sm mb-10 text-center">{t('choose_note_type') || 'Choisissez le type de note'}</Text>
                        
                        <View className="flex-row gap-4">
                            <TouchableOpacity 
                                onPress={() => handleCreateNote('text')}
                                className="flex-1 bg-white/5 p-8 rounded-[35px] items-center border border-white/10"
                            >
                                <View className="w-16 h-16 rounded-3xl bg-blue-500/20 items-center justify-center mb-4">
                                    <Edit size={32} color="#60a5fa" />
                                </View>
                                <Text className="text-white font-bold text-lg">{t('text')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => handleCreateNote('draw')}
                                className="flex-1 bg-white/5 p-8 rounded-[35px] items-center border border-white/10"
                            >
                                <View className="w-16 h-16 rounded-3xl bg-purple-500/20 items-center justify-center mb-4">
                                    <Palette size={32} color="#a78bfa" />
                                </View>
                                <Text className="text-white font-bold text-lg">{t('drawing') || 'Dessin'}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                            onPress={() => setShowNoteTypeModal(false)}
                            className="mt-10 py-4 bg-white/5 rounded-2xl items-center border border-white/5"
                        >
                            <Text className="text-white/60 font-bold uppercase tracking-widest text-xs">{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
