import { BIBLE_REGEX, fetchVerseContent } from '@/lib/bible';
import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import { deleteNoteFromDb, getAllNotes, getFolders, saveFolders, saveHistory, saveNote } from '@/lib/user-storage';
import { cn, saveFilePermanently } from '@/lib/utils';
import { AudioPlayer, VideoPlayer, DrawModal, NoteCard } from '@/components/notes';
import type { Note } from '@/components/notes';
import { Audio } from 'expo-av';
import { useVideoPlayer, VideoView } from 'expo-video';

import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bold, BookOpen, Camera, Check, ChevronRight, Edit, Eraser, Folder, Footprints, Heading, Highlighter, Italic, LayoutGrid, List, Mic, Music, Palette, Pause, Play, Plus, Search, Share2, Square, StickyNote, Trash2, Undo2, Video, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, PanResponder, Platform, Image as RNImage, ScrollView, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
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

import { BackHandler } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';


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

const NOTE_TEMPLATES = [
    {
        id: 'blank',
        title: 'Note Vierge',
        icon: 'StickyNote',
        description: 'Une page blanche pour vos pensées spontanées.',
        content: '',
        color: '#1e293b'
    },
    {
        id: 'bible_study',
        title: 'Étude Biblique',
        icon: 'BookOpen',
        description: 'Structure SOAP pour approfondir les Écritures.',
        content: '# 📖 Étude Biblique\n\n**Verset Clé :** \n\n## 📝 Observation\n*Qu\'est-ce que ce passage dit ?*\n\n\n## 💡 Application\n*Comment puis-je appliquer cela aujourd\'hui ?*\n\n\n## 🙏 Prière\n*Ma réponse à Dieu...*\n',
        color: '#1e3a8a'
    },
    {
        id: 'sermon',
        title: 'Prédication',
        icon: 'Mic',
        description: 'Prenez des notes structurées pendant le culte.',
        content: '# ⛪ Notes de Prédication\n**Date :** ' + new Date().toLocaleDateString() + '\n**Prédicateur :** \n**Thème :** \n\n## 🔑 Points Clés\n- \n\n## 📜 Versets Cités\n- \n\n## ✨ Réflexion Personnelle\n\n',
        color: '#4c1d95'
    },
    {
        id: 'journal',
        title: 'Réflexion du Jour',
        icon: 'Footprints',
        description: 'Enregistrez votre marche avec Dieu quotidiennement.',
        content: '# ☀️ Ma Journée avec le Seigneur\n\n## 🙌 Gratitude\n*Aujourd\'hui, je suis reconnaissant pour :*\n\n\n## 💪 Défis & Victoires\n\n\n## 🎯 Engagement\n*Demain, je souhaite...*\n',
        color: '#064e3b'
    }
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



// --- COMPONENTS --- (Extracted to @/components/notes)
// AudioPlayer, VideoPlayer, DrawModal, NoteCard are now in components/notes/

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
    const [editingFolderName, setEditingFolderName] = useState<string | null>(null); // null = create mode, string = rename mode
    const [folderActionSheet, setFolderActionSheet] = useState<string | null>(null); // folder name shown in action sheet
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

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
        onConfirm?: () => void;
    }>({ visible: false, title: '', message: '', type: 'info' });

    const textInputRef = useRef<TextInput>(null);
    const { settings: globalSettings } = useSettings();

    // --- CORE LOGIC ---

    const { id: noteIdParam, action } = useLocalSearchParams();

    useFocusEffect(
        useCallback(() => {
            loadInitialData();
        }, [])
    );

    useEffect(() => {
        if (noteIdParam && notes.length > 0) {
            const note = notes.find(n => n.id === noteIdParam);
            if (note) {
                setEditingNote(note);
                setIsPreviewMode(true);
            }
        }
    }, [noteIdParam, notes]);

    useEffect(() => {
        if (action === 'new') {
            // Automatically open a new text note when requested by the Quick Action
            handleCreateNote('text');
            // Clear the param to prevent re-triggering if the component re-renders
            router.setParams({ action: undefined });
        }
    }, [action]);

    useEffect(() => {
        const backAction = () => {
            if (editingNote) {
                closeNote();
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [editingNote]);

    const closeNote = async () => {
        if (editingNote) {
            await handleSaveNote();
            setEditingNote(null);
            router.setParams({ id: undefined });
        }
    };

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

        // Discard if empty (no title, no content, no attachments)
        const isEmpty = !editingNote.title.trim() && 
                        (!editingNote.content.trim() || NOTE_TEMPLATES.some(t => t.content === editingNote.content)) && 
                        (!editingNote.attachments?.images?.length) && 
                        (!editingNote.attachments?.videos?.length) && 
                        (!editingNote.attachments?.voice?.length);
        
        if (isEmpty) {
            await deleteNoteFromDb(editingNote.id);
            setNotes(notes.filter(n => n.id !== editingNote.id));
            return;
        }

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
        setAlertConfig({
            visible: true,
            title: "Supprimer la note",
            message: "Êtes-vous sûr de vouloir supprimer cette réflexion ? Cette action est irréversible.",
            type: 'error',
            onConfirm: async () => {
                await deleteNoteFromDb(id);
                setNotes(notes.filter(n => n.id !== id));
            }
        });
    };

    const addNote = () => {
        setShowNoteTypeModal(true);
    };

    const handleCreateNote = (type: 'text' | 'draw', template?: any) => {
        const n: Note = { 
            id: Date.now().toString(), 
            type, 
            title: template?.title || "", 
            content: template?.content || "", 
            date: Date.now(), 
            color: template?.color,
            folder: selectedFolder !== 'all' ? selectedFolder : undefined 
        };
        setEditingNote(n); 
        setIsPreviewMode(type === 'draw');
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
            setAlertConfig({
              visible: true,
              title: "Erreur",
              message: "Impossible d'insérer le média.",
              type: 'error'
            });
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
                allowsEditing: mediaType === 'Images', 
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
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Microphone bloqué", "L'autorisation du micro est nécessaire pour enregistrer.");
                return;
            }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            if (recording) { try { await recording.stopAndUnloadAsync(); } catch (e) { } }
            const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(newRecording);
            setIsRecording(true);
            setRecordDuration(0);
            if (recordInterval.current) clearInterval(recordInterval.current);
            recordInterval.current = setInterval(() => setRecordDuration(prev => prev + 1), 1000);
        } catch (err) {
            console.error("Start Recording error:", err);
            setIsRecording(false);
            setRecording(null);
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
                    insertMarkdown(`[audio: ${pUri}]`, '');
                } else {
                    const updatedAttachments = { ...editingNote.attachments, voice: [...(editingNote.attachments?.voice || []), { uri: pUri, duration: recordDuration }] };
                    const updatedNote = { ...editingNote, attachments: updatedAttachments };
                    setEditingNote(updatedNote);
                    const updatedNotesList = notes.map(n => n.id === updatedNote.id ? updatedNote : n);
                    await saveAllNotes(updatedNotesList.find(n => n.id === updatedNote.id) ? updatedNotesList : [updatedNote, ...notes]);
                }
            }
        } catch (e) { console.error("Stop Recording Error", e); } finally {
            setRecording(null); setRecordDuration(0); setShowVoiceModal(false); setRecordMode('attachment');
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
        output = output.replace(/\[\^(\d+)\](?!\:)/g, (match, ref) => `[${ref}](#footnote-ref:${ref})`);
        output = output.replace(/^\[\^(\d+)\]:\s*(.*)$/gm, (match, ref, text) => `[${text}](#footnote-def:${ref})`);
        output = output.replace(/<mark style="background-color:\s*(#[a-fA-F0-9]+)">([\s\S]*?)<\/mark>/gi, (match, color, content) => `[${content}](#highlight:${color})`);
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
                        <RNImage source={{ uri }} style={{ width: '100%', height: 220, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)' }} resizeMode="cover" />
                    </TouchableOpacity>
                );
            }
            if (videoMatch) return <View key={index} className="my-4"><VideoPlayer uri={videoMatch[1].trim()} /></View>;
            if (audioMatch) return <View key={index} className="my-2"><AudioPlayer uri={audioMatch[1].trim()} /></View>;
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
                        image: () => null
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
        if (url.startsWith('#highlight:') || url.startsWith('#inline-') || url.startsWith('#footnote-')) return false;
        return true;
    };

    const filteredNotes = notes.filter(n => {
        const m = (n.title + n.content).toLowerCase().includes(search.toLowerCase());
        return selectedFolder === 'all' ? m : m && n.folder === selectedFolder;
    });

    const markdownStyles = {
        body: { color: '#e2e8f0', fontSize: 18, lineHeight: 30, fontFamily: 'Lexend_400Regular' },
        heading1: { color: '#ffffff', fontSize: 28, fontFamily: 'Lexend_700Bold', marginTop: 20, marginBottom: 10 },
        heading2: { color: '#60a5fa', fontSize: 24, fontFamily: 'Lexend_700Bold', marginTop: 15, marginBottom: 8 },
        heading3: { color: '#60a5fa', fontSize: 20, fontFamily: 'Lexend_600SemiBold', marginTop: 12, marginBottom: 6 },
        strong: { fontFamily: 'Lexend_700Bold', color: '#ffffff' },
        em: { fontStyle: 'italic', color: '#cbd5e1', fontFamily: 'Lexend_400Regular' },
        link: { color: '#60a5fa', textDecorationLine: 'none', fontWeight: 'bold' },
        list_item: { color: '#cbd5e1', marginBottom: 5, fontFamily: 'Lexend_400Regular' },
        blockquote: { backgroundColor: '#1e293b', borderLeftColor: '#3b82f6', borderLeftWidth: 4, paddingHorizontal: 15, paddingVertical: 10, marginVertical: 10, borderRadius: 8 },
        code_inline: { backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#fbbf24', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 16 },
        code_block: { backgroundColor: '#0f172a', color: '#94a3b8', padding: 15, borderRadius: 12, marginVertical: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
        fence: { backgroundColor: '#0f172a', color: '#94a3b8', padding: 15, borderRadius: 12, marginVertical: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
        table: { borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 8 },
        tr: { borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
        th: { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#ffffff', fontWeight: 'bold', padding: 8, fontFamily: 'Lexend_700Bold' },
        td: { color: '#cbd5e1', padding: 8, fontFamily: 'Lexend_400Regular' },
        hr: { backgroundColor: 'rgba(255, 255, 255, 0.1)', height: 1, marginVertical: 20 }
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
                        <TouchableOpacity
                          key={f}
                          onPress={() => setSelectedFolder(f)}
                          onLongPress={() => setFolderActionSheet(f)}
                          className={cn("px-6 py-4 rounded-3xl mr-3 border", selectedFolder === f ? "bg-white/10 border-white/20" : "bg-white/5 border-white/10")}
                        >
                            <Text className={cn("font-bold text-sm", selectedFolder === f ? "text-primary" : "text-slate-500")}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={() => { setEditingFolderName(null); setNewFolderName(""); setShowFolderModal(true); }} className="w-14 h-14 rounded-[22px] bg-white/5 border border-dashed border-white/20 items-center justify-center"><Plus size={20} color="#94a3b8" /></TouchableOpacity>
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

            <Modal visible={!!editingNote} animationType="slide" statusBarTranslucent onRequestClose={closeNote}>
                <View className="flex-1 bg-[#0d1117]">
                    <SafeAreaView edges={['top']} className="bg-[#0d1117] border-b border-white/5">
                        <View className="flex-row justify-between items-center px-6 py-4">
                            <TouchableOpacity onPress={closeNote} className="w-12 h-12 rounded-full bg-white/5 items-center justify-center border border-white/10"><X size={24} color="#94a3b8" /></TouchableOpacity>
                            <View className="flex-row items-center gap-2">
                                <TouchableOpacity onPress={() => setShowColorPicker(!showColorPicker)} className={cn("w-12 h-12 rounded-full items-center justify-center", showColorPicker ? "bg-primary/20" : "bg-white/5")}>
                                    <Palette size={20} color={showColorPicker ? "#60a5fa" : "#8b949e"} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={async () => { if (!isPreviewMode) await handleSaveNote(); setIsPreviewMode(!isPreviewMode); }}
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
                                    {NOTE_COLORS.map(c => <TouchableOpacity key={c.value} onPress={() => updateCurrentNoteState({ color: c.value })} style={{ backgroundColor: c.value }} className={cn("w-12 h-12 rounded-full border-2 mr-3", editingNote?.color === c.value ? "border-white" : "border-transparent")} />)}
                                    <TouchableOpacity onPress={() => { setCustomColorInput(editingNote?.color || "#"); setColorPromptType('note'); setShowColorPrompt(true); }} className="w-12 h-12 rounded-full border-2 border-dashed border-white/40 items-center justify-center"><Plus size={20} color="white" /></TouchableOpacity>
                                </ScrollView>
                            </View>
                        )}
                        {showHighlighter && !isPreviewMode && (
                            <View className="px-6 py-4 bg-white/5 border-b border-white/5">
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-2">
                                    {HIGHLIGHT_COLORS.map(c => <TouchableOpacity key={c.id} onPress={() => { insertMarkdown(`<mark style="background-color: ${c.text}">`, '</mark>'); setShowHighlighter(false); }} style={{ backgroundColor: c.text }} className="w-12 h-12 rounded-full border-2 border-white/20 mr-4" />)}
                                    <TouchableOpacity onPress={() => { setCustomColorInput("#"); setColorPromptType('highlight'); setShowColorPrompt(true); }} className="w-12 h-12 rounded-full border-2 border-dashed border-white/40 items-center justify-center mr-4"><Plus size={20} color="white" /></TouchableOpacity>
                                </ScrollView>
                            </View>
                        )}
                        <ScrollView className="flex-1 px-6 pt-2" keyboardShouldPersistTaps="handled">
                            {editingNote && (
                                <>
                                    <View className="mb-6">
                                        <Text className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">{new Date(editingNote.date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                                        <View className="flex-row items-start justify-between">
                                            <TextInput placeholder={t('note_title_placeholder')} placeholderTextColor="#475569" className="text-3xl font-bold text-white flex-1 mr-4" multiline style={{ fontFamily: 'Lexend_700Bold' }} value={editingNote.title} onChangeText={t => updateCurrentNoteState({ title: t })} />
                                            <TouchableOpacity onPress={() => setShowFolderModal(true)} className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl flex-row items-center mt-1"><Folder size={14} color="#3b82f6" className="mr-2" /><Text className="text-white/60 text-xs font-bold">{editingNote.folder || t('category')}</Text></TouchableOpacity>
                                        </View>
                                    </View>
                                    {showAttachments && (
                                        <View className="mb-10 bg-white/5 rounded-[40px] p-8 border border-white/10">
                                            <View className="flex-row justify-between items-center mb-8">
                                                <Text className="text-white/40 font-bold text-xs uppercase tracking-widest">Pièces Jointes</Text>
                                                <View className="flex-row gap-3">
                                                    <TouchableOpacity onPress={() => pickMedia(false, 'All')} className="w-10 h-10 bg-primary/20 rounded-xl items-center justify-center"><LayoutGrid size={18} color="#3b82f6" /></TouchableOpacity>
                                                    <TouchableOpacity onPress={() => pickMedia(true, 'Images')} className="w-10 h-10 bg-primary/20 rounded-xl items-center justify-center"><Camera size={18} color="#3b82f6" /></TouchableOpacity>
                                                    <TouchableOpacity onPress={() => pickMedia(true, 'Videos')} className="w-10 h-10 bg-primary/20 rounded-xl items-center justify-center"><Video size={18} color="#3b82f6" /></TouchableOpacity>
                                                    <TouchableOpacity onPress={() => { setRecordMode('attachment'); setShowVoiceModal(true); }} className="w-10 h-10 bg-primary/20 rounded-xl items-center justify-center"><Mic size={18} color="#3b82f6" /></TouchableOpacity>
                                                </View>
                                            </View>
                                            <ScrollView horizontal className="mb-4">{editingNote.attachments?.videos?.map((u, i) => (
                                                <TouchableOpacity key={i} className="mr-4"><View className="w-24 h-24 rounded-2xl bg-black items-center justify-center border border-white/20"><Play size={20} color="white" /></View><TouchableOpacity onPress={() => { const nv = editingNote.attachments?.videos?.filter((_, x) => x !== i); updateCurrentNoteState({ attachments: { ...editingNote.attachments, videos: nv } }) }} className="absolute -top-1 -right-1 w-6 h-6 bg-black rounded-full items-center justify-center"><X size={12} color="white" /></TouchableOpacity></TouchableOpacity>
                                            ))}</ScrollView>
                                            <ScrollView horizontal className="mb-4">{editingNote.attachments?.images?.map((u, i) => (
                                                <TouchableOpacity key={i} onPress={() => setSelectedImage(u)} className="mr-4"><RNImage source={{ uri: u }} className="w-24 h-24 rounded-2xl" /><TouchableOpacity onPress={() => { const ni = editingNote.attachments?.images?.filter((_, x) => x !== i); updateCurrentNoteState({ attachments: { ...editingNote.attachments, images: ni } }) }} className="absolute -top-1 -right-1 w-6 h-6 bg-black rounded-full items-center justify-center"><X size={12} color="white" /></TouchableOpacity></TouchableOpacity>
                                            ))}</ScrollView>
                                            {editingNote.attachments?.voice?.map((v, i) => <AudioPlayer key={i} uri={v.uri} onDelete={() => { const nv = editingNote.attachments?.voice?.filter((_, x) => x !== i); updateCurrentNoteState({ attachments: { ...editingNote.attachments, voice: nv } }); }} />)}
                                        </View>
                                    )}
                                    {editingNote.type === 'draw' && editingNote.attachments?.images?.length ? (
                                        <View className="mb-10">
                                            <TouchableOpacity onPress={() => setSelectedImage(editingNote.attachments!.images![editingNote.attachments!.images!.length - 1])}><RNImage source={{ uri: editingNote.attachments.images[editingNote.attachments.images.length - 1] }} className="w-full aspect-square rounded-[40px] bg-white" resizeMode="contain" /></TouchableOpacity>
                                            <TouchableOpacity onPress={() => setShowDrawModal(true)} className="absolute bottom-4 right-4 bg-purple-600 w-12 h-12 rounded-full items-center justify-center shadow-lg"><Palette size={20} color="white" /></TouchableOpacity>
                                        </View>
                                    ) : null}
                                    {isPreviewMode ? (
                                        <View className="pb-32">{renderNoteContent(editingNote.content)}</View>
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
                                    <TouchableOpacity onPress={() => insertMarkdown('**', '**')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center"><Bold size={20} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => insertMarkdown('*', '*')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center mx-2"><Italic size={20} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => insertMarkdown('# ', '')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center"><Heading size={20} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => insertMarkdown('- ', '')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center mx-2"><List size={20} color="#8b949e" /></TouchableOpacity>
                                    <View className="w-[1px] h-10 bg-white/10 mx-3" />
                                    <TouchableOpacity onPress={() => { const refNum = (editingNote.content.match(/\[\^(\d+)\]/g)?.length || 0) + 1; insertMarkdown(`[^${refNum}]`, `\n\n[^${refNum}]: `); }} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center"><Footprints size={20} color="#8b949e" /></TouchableOpacity>
                                    <View className="w-[1px] h-10 bg-white/10 mx-3" />
                                    <TouchableOpacity onPress={() => pickAndInsertMedia('image')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center"><Camera size={20} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => pickAndInsertMedia('video')} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center mx-2"><Video size={20} color="#8b949e" /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setRecordMode('inline'); setShowVoiceModal(true); }} className="w-12 h-14 bg-white/5 rounded-2xl items-center justify-center"><Mic size={20} color="#8b949e" /></TouchableOpacity>
                                    <View className="w-[1px] h-10 bg-white/10 mx-3" />
                                    <TouchableOpacity onPress={() => setShowHighlighter(!showHighlighter)} className={cn("w-12 h-14 rounded-2xl items-center justify-center", showHighlighter ? "bg-primary/20" : "bg-white/5")}><Highlighter size={20} color={showHighlighter ? "#60a5fa" : "#8b949e"} /></TouchableOpacity>
                                </ScrollView>
                            </View>
                        )}
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            <Modal visible={showVoiceModal} transparent animationType="slide">
                <SafeAreaView className="flex-1 justify-end">
                    <View className="bg-[#1c2128] m-4 rounded-[40px] p-8 border border-white/10 items-center">
                        <Text className="text-white/40 font-bold text-xs uppercase tracking-[4px] mb-8">Vocal</Text>
                        <View className="items-center mb-10">
                            <Text className="text-5xl font-mono text-white mb-2">{Math.floor(recordDuration / 60)}:{String(recordDuration % 60).padStart(2, '0')}</Text>
                            <Text className="text-red-500 animate-pulse font-bold text-xs">{isRecording ? "EN COURS" : "PRÊT"}</Text>
                        </View>
                        <View className="flex-row gap-6 items-center">
                            <TouchableOpacity onPress={() => isRecording ? stopRecording(false) : setShowVoiceModal(false)} className="w-16 h-16 rounded-full bg-white/5 items-center justify-center"><X size={24} color="#94a3b8" /></TouchableOpacity>
                            <TouchableOpacity onPress={isRecording ? () => stopRecording(true) : startRecording} className={cn("w-24 h-24 rounded-full items-center justify-center", isRecording ? "bg-red-500" : "bg-primary")}>{isRecording ? <Square size={32} color="white" fill="white" /> : <Mic size={40} color="white" />}</TouchableOpacity>
                            <TouchableOpacity onPress={() => isRecording ? stopRecording(true) : null} disabled={!isRecording} className={cn("w-16 h-16 rounded-full bg-white/5 items-center justify-center", !isRecording && "opacity-20")}><Check size={24} color={isRecording ? "#3b82f6" : "#94a3b8"} /></TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>

            <Modal visible={!!selectedImage} transparent animationType="fade">
                <View className="flex-1 bg-black">
                    <TouchableOpacity onPress={() => setSelectedImage(null)} className="absolute top-12 right-6 z-50 w-12 h-12 bg-white/10 rounded-full items-center justify-center"><X size={24} color="white" /></TouchableOpacity>
                    {(() => {
                        const inlineImages = editingNote?.content?.match(/\[image:\s*([^\]]+)\]/gi)?.map(m => m.match(/\[image:\s*([^\]]+)\]/i)![1]) || [];
                        const attachmentImages = editingNote?.attachments?.images || [];
                        const allImages = Array.from(new Set([...attachmentImages, ...inlineImages]));
                        const currentIndex = allImages.indexOf(selectedImage!);
                        return (
                            <>
                                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: (currentIndex >= 0 ? currentIndex : 0) * windowWidth, y: 0 }}>
                                    {allImages.map((img, idx) => <View key={idx} style={{ width: windowWidth }} className="justify-center items-center"><RNImage source={{ uri: img }} className="w-full h-full" resizeMode="contain" /></View>)}
                                </ScrollView>
                                <View className="absolute bottom-12 w-full items-center"><View className="bg-black/50 px-6 py-3 rounded-full"><Text className="text-white font-bold text-xs">{(currentIndex >= 0 ? currentIndex : 0) + 1} / {allImages.length}</Text></View></View>
                            </>
                        );
                    })()}
                </View>
            </Modal>

            <DrawModal visible={showDrawModal} onClose={() => setShowDrawModal(false)} initialUri={editingNote?.type === 'draw' && editingNote.attachments?.images?.length ? editingNote.attachments.images[editingNote.attachments.images.length - 1] : undefined} onSave={(u) => { if (editingNote) { const ni = editingNote.type === 'draw' ? [u] : [...(editingNote.attachments?.images || []), u]; updateCurrentNoteState({ attachments: { ...editingNote.attachments, images: ni } }); } setShowDrawModal(false); }} />

            <Modal visible={showFolderModal} transparent animationType="slide">
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-[#0f172a] rounded-t-[40px] p-8">
                        <View className="flex-row justify-between items-center mb-8">
                            <View>
                              <Text className="text-white font-bold text-2xl">
                                {editingFolderName ? `Renommer "${editingFolderName}"` : 'Dossiers'}
                              </Text>
                              {!editingFolderName && <Text className="text-slate-500 text-xs mt-1">Maintenez appuyé une catégorie pour la renommer ou supprimer</Text>}
                            </View>
                            <TouchableOpacity onPress={() => { setShowFolderModal(false); setEditingFolderName(null); setNewFolderName(""); }}><X size={24} color="#94a3b8" /></TouchableOpacity>
                        </View>

                        {/* Folder list — shown only in selection/create mode (not rename mode) */}
                        {!editingFolderName && (
                          <ScrollView className="max-h-[200px] mb-8">
                            <View className="flex-row flex-wrap gap-3">
                              <TouchableOpacity
                                onPress={() => { if (editingNote) updateCurrentNoteState({ folder: undefined }); setShowFolderModal(false); }}
                                className={cn("px-6 py-4 rounded-3xl border", !editingNote?.folder ? "bg-primary border-primary" : "bg-white/5 border-white/10")}
                              >
                                <Text className={cn("font-bold text-sm", !editingNote?.folder ? "text-white" : "text-slate-400")}>Aucun</Text>
                              </TouchableOpacity>
                              {folders.map(f => (
                                <View key={f} className="flex-row items-center">
                                  <TouchableOpacity
                                    onPress={() => { if (editingNote) updateCurrentNoteState({ folder: f }); setShowFolderModal(false); }}
                                    className={cn("px-6 py-4 rounded-l-3xl border-y border-l", editingNote?.folder === f ? "bg-primary border-primary" : "bg-white/5 border-white/10")}
                                  >
                                    <Text className={cn("font-bold text-sm", editingNote?.folder === f ? "text-white" : "text-slate-400")}>{f}</Text>
                                  </TouchableOpacity>
                                  {/* Edit button per folder */}
                                  <TouchableOpacity
                                    onPress={() => { setEditingFolderName(f); setNewFolderName(f); }}
                                    className={cn("px-3 py-4 rounded-r-3xl border-y border-r items-center justify-center", editingNote?.folder === f ? "bg-primary/80 border-primary" : "bg-white/5 border-white/10")}
                                  >
                                    <Edit size={12} color={editingNote?.folder === f ? "white" : "#64748b"} />
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </View>
                          </ScrollView>
                        )}

                        {/* Input: create new OR rename existing */}
                        <View className="flex-row gap-3">
                            <TextInput
                              placeholder={editingFolderName ? `Nouveau nom pour "${editingFolderName}"` : "Nouveau dossier..."}
                              placeholderTextColor="#475569"
                              className="flex-1 bg-white/5 p-5 rounded-3xl text-white font-bold"
                              value={newFolderName}
                              onChangeText={setNewFolderName}
                              autoFocus={!!editingFolderName}
                            />
                            <TouchableOpacity
                              onPress={async () => {
                                if (!newFolderName.trim()) { setShowFolderModal(false); setEditingFolderName(null); setNewFolderName(""); return; }
                                if (editingFolderName) {
                                  // Rename: replace old name with new name everywhere
                                  const trimmed = newFolderName.trim();
                                  const u = folders.map(x => x === editingFolderName ? trimmed : x);
                                  setFolders(u);
                                  await saveFolders(u);
                                  // Update notes that had the old folder name
                                  const updatedNotes = notes.map(n => n.folder === editingFolderName ? { ...n, folder: trimmed } : n);
                                  setNotes(updatedNotes);
                                  await Promise.all(updatedNotes.filter(n => n.folder === trimmed && notes.find(o => o.id === n.id)?.folder === editingFolderName).map(n => saveNote(n)));
                                  if (selectedFolder === editingFolderName) setSelectedFolder(trimmed);
                                  if (editingNote?.folder === editingFolderName) updateCurrentNoteState({ folder: trimmed });
                                  setEditingFolderName(null);
                                } else {
                                  // Create new
                                  const trimmed = newFolderName.trim();
                                  const u = Array.from(new Set([...folders, trimmed]));
                                  setFolders(u);
                                  await saveFolders(u);
                                  if (editingNote) updateCurrentNoteState({ folder: trimmed });
                                  setShowFolderModal(false);
                                }
                                setNewFolderName("");
                              }}
                              className="w-16 bg-blue-600 rounded-3xl items-center justify-center"
                            >
                              <Check size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        {editingFolderName && (
                          <TouchableOpacity onPress={() => { setEditingFolderName(null); setNewFolderName(""); }} className="mt-4 items-center">
                            <Text className="text-slate-500 text-sm">Annuler le renommage</Text>
                          </TouchableOpacity>
                        )}
                        <View className="h-10" />
                    </View>
                </View>
            </Modal>

            <Modal visible={!!detectedVerse} animationType="slide" transparent>
                <SafeAreaView className="flex-1 bg-black/60 justify-end">
                    <View className="bg-slate-900 m-4 rounded-[40px] p-8">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-white font-bold text-xl">{detectedVerse?.book} {detectedVerse?.chapter}:{detectedVerse?.verses}</Text>
                            <TouchableOpacity onPress={() => setDetectedVerse(null)}><X size={20} color="#94a3b8" /></TouchableOpacity>
                        </View>
                        <ScrollView className="max-h-[250px] mb-8">{verseLoading ? <ActivityIndicator color="#3b82f6" /> : <Text className="text-slate-200 text-lg leading-7 italic">"{verseContent}"</Text>}</ScrollView>
                        <TouchableOpacity onPress={() => { if (currentVerseBookId) router.push({ pathname: "/bible/reader", params: { bookId: String(currentVerseBookId), bookName: detectedVerse?.book || '', chapter: String(detectedVerse?.chapter || '1'), verse: String((detectedVerse?.verses || "").split(/[-,]/)[0] || "1"), lang: globalSettings.bibleVersion, testament: "1" } }); setDetectedVerse(null); }} className="bg-blue-600 py-5 rounded-3xl items-center"><Text className="text-white font-bold text-lg">Ouvrir dans la Bible</Text></TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>

            <Modal visible={showColorPrompt} transparent animationType="slide">
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-[#0f172a] rounded-t-[40px] p-8">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-white font-bold text-xl">Couleur personnalisée</Text>
                            <TouchableOpacity onPress={() => setShowColorPrompt(false)}><X size={24} color="#94a3b8" /></TouchableOpacity>
                        </View>
                        <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-1 mb-6">
                            <View style={{ backgroundColor: customColorInput }} className="w-8 h-8 rounded-full mr-3" />
                            <TextInput placeholder="#FFFFFF" placeholderTextColor="#475569" className="flex-1 h-12 text-white font-bold text-lg" value={customColorInput} onChangeText={setCustomColorInput} autoCapitalize="characters" maxLength={7} />
                        </View>
                        <View className="mb-10 items-center">
                            <View onLayout={(e) => setPickerSize(e.nativeEvent.layout)} className="w-full aspect-square rounded-3xl overflow-hidden mb-6 bg-white">
                                <LinearGradient colors={[`hsl(${pickerH}, 100%, 50%)`, 'white']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} className="flex-1">
                                    <LinearGradient colors={['transparent', 'black']} className="flex-1">
                                        <View {...PanResponder.create({ onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderGrant: (e) => { const s = (e.nativeEvent.locationX / pickerSize.width) * 100; const v = 100 - (e.nativeEvent.locationY / pickerSize.height) * 100; setPickerS(s); setPickerV(v); setCustomColorInput(hsvToHex(pickerH, s, v)); }, onPanResponderMove: (e) => { const s = (e.nativeEvent.locationX / pickerSize.width) * 100; const v = 100 - (e.nativeEvent.locationY / pickerSize.height) * 100; setPickerS(s); setPickerV(v); setCustomColorInput(hsvToHex(pickerH, s, v)); } }).panHandlers} className="flex-1" />
                                    </LinearGradient>
                                </LinearGradient>
                            </View>
                            <LinearGradient colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="w-full h-10 rounded-full">
                                <View {...PanResponder.create({ onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderGrant: (e) => { const h = (e.nativeEvent.locationX / pickerSize.width) * 360; setPickerH(h); setCustomColorInput(hsvToHex(h, pickerS, pickerV)); }, onPanResponderMove: (e) => { const h = (e.nativeEvent.locationX / pickerSize.width) * 360; setPickerH(h); setCustomColorInput(hsvToHex(h, pickerS, pickerV)); } }).panHandlers} className="flex-1" />
                            </LinearGradient>
                        </View>
                        <TouchableOpacity onPress={() => { if (/^#[0-9A-F]{3,6}$/i.test(customColorInput)) { if (colorPromptType === 'note') updateCurrentNoteState({ color: customColorInput }); else insertMarkdown(`<mark style="background-color: ${customColorInput}">`, '</mark>'); setShowColorPrompt(false); } }} className="w-full p-5 rounded-3xl bg-primary items-center"><Text className="text-white font-bold text-lg">Appliquer</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showNoteTypeModal} transparent animationType="slide">
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-[#0f172a] rounded-t-[40px] p-8">
                        <View className="items-center mb-8">
                            <View className="w-12 h-1.5 bg-white/10 rounded-full mb-6" />
                            <Text className="text-white text-2xl font-bold mb-2">{t('create_note')}</Text>
                        </View>
                        <ScrollView className="max-h-[400px] mb-6">
                            {NOTE_TEMPLATES.map((tmpl) => {
                                const IconComponent = tmpl.id === 'blank' ? StickyNote : (tmpl.id === 'bible_study' ? BookOpen : (tmpl.id === 'sermon' ? Mic : Footprints));
                                return (
                                    <TouchableOpacity key={tmpl.id} onPress={() => handleCreateNote('text', tmpl)} className="bg-white/5 p-6 rounded-3xl flex-row items-center mb-4 border border-white/10">
                                        <View style={{ backgroundColor: tmpl.color + '20' }} className="w-12 h-12 rounded-2xl items-center justify-center mr-4"><IconComponent size={24} color={tmpl.color} /></View>
                                        <View className="flex-1"><Text className="text-white font-bold text-lg">{tmpl.title}</Text><Text className="text-white/40 text-xs">{tmpl.description}</Text></View>
                                    </TouchableOpacity>
                                );
                            })}
                            <TouchableOpacity onPress={() => handleCreateNote('draw')} className="bg-white/5 p-6 rounded-3xl flex-row items-center border border-white/10"><View className="w-12 h-12 rounded-2xl bg-purple-500/20 items-center justify-center mr-4"><Palette size={24} color="#a78bfa" /></View><View className="flex-1"><Text className="text-white font-bold text-lg">Dessin</Text><Text className="text-white/40 text-xs">Exprimez vos idées visuellement.</Text></View></TouchableOpacity>
                        </ScrollView>
                        <TouchableOpacity onPress={() => setShowNoteTypeModal(false)} className="py-5 bg-white/5 rounded-3xl items-center"><Text className="text-white/60 font-bold">{t('cancel')}</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── Folder Action Sheet (dark themed, replaces Alert.alert) ── */}
            <Modal visible={!!folderActionSheet} transparent animationType="slide">
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => setFolderActionSheet(null)}
                  className="flex-1 bg-black/70 justify-end"
                >
                    <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
                        <View className="bg-[#0f172a] rounded-t-[40px] p-8 border-t border-white/10">
                            {/* Handle bar */}
                            <View className="w-12 h-1.5 bg-white/10 rounded-full self-center mb-6" />

                            {/* Category name */}
                            <View className="flex-row items-center mb-8">
                                <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center mr-4 border border-primary/20">
                                    <Folder size={18} color="#3b82f6" />
                                </View>
                                <View>
                                    <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Catégorie</Text>
                                    <Text className="text-white text-xl font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>{folderActionSheet}</Text>
                                </View>
                            </View>

                            {/* Actions */}
                            <View className="gap-3 mb-4">
                                {/* Rename */}
                                <TouchableOpacity
                                    onPress={() => {
                                        const f = folderActionSheet!;
                                        setFolderActionSheet(null);
                                        setEditingFolderName(f);
                                        setNewFolderName(f);
                                        setShowFolderModal(true);
                                    }}
                                    className="flex-row items-center bg-white/5 border border-white/10 p-5 rounded-3xl"
                                >
                                    <View className="w-10 h-10 rounded-2xl bg-blue-500/10 items-center justify-center mr-4">
                                        <Edit size={18} color="#60a5fa" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white font-bold text-base">Renommer</Text>
                                        <Text className="text-slate-500 text-xs mt-0.5">Changer le nom de cette catégorie</Text>
                                    </View>
                                    <ChevronRight size={16} color="#475569" />
                                </TouchableOpacity>

                                {/* Delete */}
                                <TouchableOpacity
                                    onPress={() => {
                                        const f = folderActionSheet!;
                                        setFolderActionSheet(null);
                                        setAlertConfig({
                                            visible: true,
                                            title: `Supprimer "${f}"`,
                                            message: `Voulez-vous supprimer cette catégorie ? Les notes qu'elle contient ne seront pas supprimées.`,
                                            type: 'error',
                                            onConfirm: async () => {
                                                const u = folders.filter(x => x !== f);
                                                setFolders(u);
                                                await saveFolders(u);
                                                if (selectedFolder === f) setSelectedFolder("all");
                                            }
                                        });
                                    }}
                                    className="flex-row items-center bg-red-500/5 border border-red-500/20 p-5 rounded-3xl"
                                >
                                    <View className="w-10 h-10 rounded-2xl bg-red-500/10 items-center justify-center mr-4">
                                        <Trash2 size={18} color="#ef4444" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-red-400 font-bold text-base">Supprimer</Text>
                                        <Text className="text-slate-500 text-xs mt-0.5">Supprimer uniquement la catégorie</Text>
                                    </View>
                                    <ChevronRight size={16} color="#475569" />
                                </TouchableOpacity>
                            </View>

                            {/* Cancel */}
                            <TouchableOpacity
                                onPress={() => setFolderActionSheet(null)}
                                className="bg-white/5 border border-white/10 py-5 rounded-3xl items-center"
                            >
                                <Text className="text-slate-400 font-bold">Annuler</Text>
                            </TouchableOpacity>
                            <View className="h-6" />
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            <PremiumAlert 
              visible={alertConfig.visible}
              title={alertConfig.title}
              message={alertConfig.message}
              type={alertConfig.type}
              onConfirm={alertConfig.onConfirm}
              onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
            />
        </SafeAreaView>
    );
}
