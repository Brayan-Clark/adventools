import { loadDatabase } from '@/lib/database';
import { useSettings } from '@/lib/settings-context';
import { cn } from '@/lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Bold, BookOpen, Check, Code, Edit, Eye, Heading, Italic, List, Plus, Quote, Search, StickyNote, Trash2, X, FolderPlus, Folder, Highlighter, Palette, Share2, ListOrdered } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchVerseContent, BIBLE_REGEX } from '@/lib/bible';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const HIGHLIGHT_COLORS = [
  { id: 'yellow', bg: 'rgba(253, 224, 71, 0.3)', text: '#fde047', border: 'rgba(253, 224, 71, 0.4)' },
  { id: 'green', bg: 'rgba(74, 222, 128, 0.3)', text: '#4ade80', border: 'rgba(74, 222, 128, 0.4)' },
  { id: 'blue', bg: 'rgba(96, 165, 250, 0.3)', text: '#60a5fa', border: 'rgba(96, 165, 250, 0.4)' },
  { id: 'red', bg: 'rgba(248, 113, 113, 0.3)', text: '#f87171', border: 'rgba(248, 113, 113, 0.4)' },
];

const TEXT_COLORS = []; // Désactivé temporairement

const NOTE_COLORS = [
  { label: 'Slate', value: '#1e293b', border: '#334155' },
  { label: 'Azure', value: '#1e3a8a', border: '#1e40af' },
  { label: 'Emerald', value: '#064e3b', border: '#065f46' },
  { label: 'Rose', value: '#881337', border: '#9f1239' },
  { label: 'Amber', value: '#78350f', border: '#92400e' },
  { label: 'Violet', value: '#4c1d95', border: '#5b21b6' },
];

interface Note {
  id: string;
  title: string;
  content: string;
  date: number;
  color?: string;
  folder?: string;
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("Toutes");
  const [search, setSearch] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showHighlighter, setShowHighlighter] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const [detectedVerse, setDetectedVerse] = useState<{ book: string, chapter: string, verses: string, bookId?: number } | null>(null);
  const [verseContent, setVerseContent] = useState<string | null>(null);
  const [verseLoading, setVerseLoading] = useState(false);

  const textInputRef = React.useRef<TextInput>(null);
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  const params = useLocalSearchParams();

  useEffect(() => { loadNotes(); loadFolders(); }, []);

  useEffect(() => {
    if (params.noteId && notes.length > 0) {
      const targetNote = notes.find(n => n.id === String(params.noteId));
      if (targetNote) { setEditingNote(targetNote); setIsPreviewMode(true); }
    }
  }, [params.noteId, notes]);

  const loadNotes = async () => {
    const saved = await AsyncStorage.getItem("adventools_notes");
    if (saved) setNotes(JSON.parse(saved));
  };

  const loadFolders = async () => {
    const saved = await AsyncStorage.getItem("adventools_folders");
    if (saved) setFolders(JSON.parse(saved));
  };

  const saveFolders = async (updated: string[]) => {
    setFolders(updated);
    await AsyncStorage.setItem("adventools_folders", JSON.stringify(updated));
  };

  const createFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    if (folders.includes(trimmed)) { Alert.alert("Erreur", "Ce dossier existe déjà"); return; }
    const updated = [...folders, trimmed];
    saveFolders(updated);
    setNewFolderName("");
    setShowFolderModal(false);
    setSelectedFolder(trimmed);
  };

  const deleteFolder = (folderName: string) => {
    Alert.alert("Supprimer le dossier", `Voulez-vous supprimer le dossier "${folderName}" ? Les notes ne seront pas supprimées mais n'auront plus de dossier.`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive", onPress: async () => {
          const updatedFolders = folders.filter(f => f !== folderName);
          saveFolders(updatedFolders);
          const updatedNotes = notes.map(n => n.folder === folderName ? { ...n, folder: undefined } : n);
          setNotes(updatedNotes);
          await AsyncStorage.setItem("adventools_notes", JSON.stringify(updatedNotes));
          if (selectedFolder === folderName) setSelectedFolder("Toutes");
        }
      }
    ]);
  };

  const addToHistory = async (note: Note) => {
    try {
      const historyItem = {
        type: 'note',
        title: note.title || "Note sans titre",
        subtitle: new Date(note.date).toLocaleDateString("fr-FR"),
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

  const autoSave = async (noteToSave: Note) => {
    const exists = notes.find(n => n.id === noteToSave.id);
    const updated = exists ? notes.map(n => n.id === noteToSave.id ? noteToSave : n) : [noteToSave, ...notes];
    await AsyncStorage.setItem("adventools_notes", JSON.stringify(updated));
    setNotes(updated);
  };

  const addNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "",
      content: "",
      date: Date.now(),
      folder: selectedFolder !== "Toutes" ? selectedFolder : undefined,
    };
    setEditingNote(newNote);
    setIsPreviewMode(false);
  };

  const deleteNote = (id: string) => {
    Alert.alert("Supprimer", "Voulez-vous supprimer cette note ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive", onPress: async () => {
          const updated = notes.filter(n => n.id !== id);
          setNotes(updated);
          await AsyncStorage.setItem("adventools_notes", JSON.stringify(updated));
        }
      }
    ]);
  };

  const togglePreview = () => { if (!isPreviewMode && editingNote) autoSave(editingNote); setIsPreviewMode(!isPreviewMode); };

  const insertMarkdown = (before: string, after: string = '') => {
    if (!editingNote) return;
    const { start, end } = selection;
    const prevContent = editingNote.content;
    const selectedText = prevContent.substring(start, end);
    const newContent = prevContent.substring(0, start) + before + selectedText + after + prevContent.substring(end);

    setEditingNote({ ...editingNote, content: newContent });

    // Focus sans changer la sélection brusquement
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  const handleVerseClick = (url: string) => {
    if (url.startsWith('#h:') || url.startsWith('#c:')) return false;
    if (url.startsWith('#verse:')) {
      const parts = url.replace('#verse:', '').split('/');
      setDetectedVerse({ book: decodeURIComponent(parts[0]), chapter: parts[1], verses: parts[2] || "" });
      return false;
    }
    return true;
  };

  const processContent = (text: string) => text.replace(BIBLE_REGEX, (match, book, chapter, verses) => `[${match}](#verse:${encodeURIComponent(book.trim())}/${chapter}/${verses ? verses.trim() : ''})`);

  const shareNote = async (note: Note) => {
    const text = `# ${note.title}\n\n${note.content.replace(/[#*`]/g, '')}`;
    await Share.share({ message: text });
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
    return selectedFolder === "Toutes" ? matchesSearch : matchesSearch && n.folder === selectedFolder;
  });

  useEffect(() => {
    const fetchVerse = async () => {
      if (!detectedVerse) return;
      setVerseLoading(true);
      try {
        const r = await fetchVerseContent(globalSettings.bibleVersion, detectedVerse.book, detectedVerse.chapter, detectedVerse.verses);
        setVerseContent(r ? r.text : "Introuvable");
        if (r?.bookId) {
          setDetectedVerse(prev => prev ? { ...prev, bookId: r.bookId } : null);
        }
      } catch (e) { console.error(e); } finally { setVerseLoading(false); }
    };
    fetchVerse();
  }, [detectedVerse?.book, detectedVerse?.chapter, detectedVerse?.verses]);

  const markdownStyles = {
    body: { color: '#e2e8f0', fontSize: 18, lineHeight: 30, fontFamily: 'Lexend_400Regular' },
    heading1: { color: '#ffffff', fontSize: 30, fontFamily: 'Lexend_700Bold', marginTop: 20, marginBottom: 10 },
    heading2: { color: '#ffffff', fontSize: 24, fontFamily: 'Lexend_700Bold', marginTop: 15, marginBottom: 8 },
    blockquote: { backgroundColor: '#1e293b', borderLeftWidth: 4, borderLeftColor: '#3b82f6', padding: 12, borderRadius: 8, marginVertical: 10 },
    link: { textDecorationLine: 'none', fontWeight: '700' },
    strong: { color: '#fff', fontWeight: 'bold' as 'bold' },
    paragraph: { marginBottom: 10 },
    code_inline: { backgroundColor: '#1e293b', color: '#4ade80', padding: 4, borderRadius: 4 },
    code_block: { backgroundColor: '#1e293b', color: '#e2e8f0', padding: 16, borderRadius: 12, marginVertical: 10 },
    fence: { backgroundColor: '#1e293b', color: '#e2e8f0', padding: 16, borderRadius: 12, marginVertical: 10 },
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0d1117]">
      <StatusBar style="light" />

      {/* HEADER PRINCIPAL */}
      <View className="px-6 pt-6 border-b border-white/5 pb-2">
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10">
              <ArrowLeft size={20} color="#94a3b8" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>Mon Journal</Text>
          </View>
          <TouchableOpacity onPress={addNote} className="w-12 h-12 rounded-2xl bg-primary items-center justify-center shadow-2xl shadow-primary/50">
            <Plus size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* RECHERCHE */}
        <View className="relative flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-1 mb-6">
          <Search size={18} color="#475569" />
          <TextInput
            placeholder="Rechercher une note..."
            placeholderTextColor="#475569"
            className="flex-1 h-12 ml-3 text-white font-medium"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* DOSSIERS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-2">
          <TouchableOpacity
            onPress={() => setSelectedFolder("Toutes")}
            className={cn("px-5 py-2.5 rounded-2xl mr-3 border-2 transition-all", selectedFolder === "Toutes" ? "bg-primary/20 border-primary" : "bg-white/5 border-white/10")}
          >
            <Text className={cn("font-bold text-xs tracking-tight", selectedFolder === "Toutes" ? "text-primary" : "text-slate-500")}>TOUT</Text>
          </TouchableOpacity>
          {folders.map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setSelectedFolder(f)}
              onLongPress={() => deleteFolder(f)}
              className={cn("px-5 py-2.5 rounded-2xl mr-3 border-2 transition-all", selectedFolder === f ? "bg-primary/20 border-primary" : "bg-white/5 border-white/10")}
            >
              <Text className={cn("font-bold text-xs tracking-tight uppercase", selectedFolder === f ? "text-primary" : "text-slate-500")}>{f}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowFolderModal(true)} className="px-5 py-2.5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/20 flex-row items-center">
            <FolderPlus size={16} color="#10b981" className="mr-2" />
            <Text className="text-emerald-500 font-bold text-xs uppercase tracking-tight">Nouveau</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* LISTE DES NOTES */}
      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        {filteredNotes.map((note) => (
          <TouchableOpacity
            key={note.id}
            onPress={() => { setEditingNote(note); setIsPreviewMode(true); addToHistory(note); }}
            style={{ backgroundColor: note.color || '#1e293b', borderColor: NOTE_COLORS.find(c => c.value === note.color)?.border || '#334155' }}
            className="w-full p-6 rounded-[32px] mb-4 border shadow-sm relative overflow-hidden"
          >
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1 mr-4">
                <Text className="font-bold text-white text-xl leading-tight mb-1" style={{ fontFamily: 'Lexend_700Bold' }}>{note.title || "Note sans titre"}</Text>
                {note.folder && (
                  <View className="flex-row items-center">
                    <Folder size={10} color="#94a3b8" className="mr-1" />
                    <Text className="text-[10px] text-white/50 font-bold uppercase tracking-widest">{note.folder}</Text>
                  </View>
                )}
              </View>
              <Text className="text-[10px] font-bold text-white/40 uppercase">{new Date(note.date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}</Text>
            </View>
            <Text className="text-sm text-white/70 mb-6 leading-5" numberOfLines={3}>{note.content.replace(/[#*`]/g, '') || "Aucun contenu..."}</Text>
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center"><BookOpen size={14} color="white" opacity={0.4} className="mr-2" /><Text className="text-[10px] text-white/40 font-medium uppercase tracking-widest">Journal d'étude</Text></View>
              <TouchableOpacity onPress={() => deleteNote(note.id)} className="w-8 h-8 rounded-full bg-black/20 items-center justify-center border border-white/10"><Trash2 size={14} color="#f87171" /></TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
        {filteredNotes.length === 0 && <View className="w-full items-center py-20"><StickyNote size={40} color="#1e293b" /><Text className="text-slate-500 font-medium mt-4">Aucune note ici</Text></View>}
        <View className="h-24" />
      </ScrollView>

      {/* MODAL EDITEUR */}
      <Modal visible={!!editingNote} animationType="slide">
        <SafeAreaView className="flex-1 bg-[#0d1117]">
          {/* Header Editeur */}
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-white/5 bg-[#0d1117]">
            <TouchableOpacity onPress={() => { if (editingNote) autoSave(editingNote); setEditingNote(null); }} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10">
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity onPress={() => shareNote(editingNote!)} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10">
                <Share2 size={18} color="#8b949e" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={togglePreview}
                className={cn(
                  "px-5 py-2.5 rounded-2xl flex-row items-center gap-2 border-2 transition-all",
                  isPreviewMode ? "bg-white/5 border-white/10" : "bg-primary/20 border-primary"
                )}
              >
                {isPreviewMode ? <Edit size={16} color="white" /> : <Check size={16} color="#3b82f6" />}
                <Text className={cn("text-xs font-bold uppercase tracking-tight", isPreviewMode ? "text-white" : "text-primary")}>
                  {isPreviewMode ? "Éditer" : "Terminer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
              {editingNote && (
                <>
                  {/* SÉLECTEUR DE DOSSIER DANS L'ÉDITEUR */}
                  <View className="flex-row items-center mb-6">
                    <Text className="text-[10px] text-white/40 font-bold uppercase tracking-widest mr-4">Dossier :</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <TouchableOpacity
                        onPress={() => setEditingNote({ ...editingNote, folder: undefined })}
                        className={cn("px-4 py-2 rounded-xl mr-2 border", !editingNote.folder ? "bg-primary/20 border-primary" : "bg-white/5 border-white/10")}
                      >
                        <Text className={cn("text-[10px] font-bold", !editingNote.folder ? "text-primary" : "text-white/40")}>AUCUN</Text>
                      </TouchableOpacity>
                      {folders.map(f => (
                        <TouchableOpacity
                          key={f}
                          onPress={() => setEditingNote({ ...editingNote, folder: f })}
                          className={cn("px-4 py-2 rounded-xl mr-2 border", editingNote.folder === f ? "bg-primary border-primary" : "bg-white/5 border-white/10")}
                        >
                          <Text className="text-white text-[10px] font-bold">{f}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* COULEUR DE LA NOTE */}
                  <View className="flex-row gap-3 mb-8">
                    {NOTE_COLORS.map(c => (
                      <TouchableOpacity
                        key={c.value}
                        onPress={() => setEditingNote({ ...editingNote, color: c.value })}
                        style={{ backgroundColor: c.value, borderColor: c.border }}
                        className={cn("w-8 h-8 rounded-full border-2 items-center justify-center", editingNote.color === c.value ? "border-white" : "border-transparent")}
                      >
                        {editingNote.color === c.value && <Check size={14} color="white" />}
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    placeholder="Titre de la note"
                    placeholderTextColor="#475569"
                    className="text-3xl font-bold text-white mb-6"
                    style={{ fontFamily: 'Lexend_700Bold' }}
                    value={editingNote.title}
                    onChangeText={t => setEditingNote({ ...editingNote, title: t })}
                  />

                  {isPreviewMode ? (
                    <View className="pb-40">
                      <Markdown style={markdownStyles as any} onLinkPress={handleVerseClick} rules={{
                        link: (node, children, parent, styles) => {
                          const url = node.attributes.href;

                          // 1. SURLIGNAGE (Background + Text)
                          if (url && url.startsWith('#h:')) {
                            const colorId = url.replace('#h:', '');
                            const color = HIGHLIGHT_COLORS.find(c => c.id === colorId) || HIGHLIGHT_COLORS[0];
                            return (
                              <Text key={node.key} style={{ backgroundColor: color.bg, color: color.text, borderRadius: 4, paddingHorizontal: 4, fontWeight: 'bold' }}>
                                {children}
                              </Text>
                            );
                          }

                          // 2. VERSETS & AUTRES LIENS (Forçage du BLEU ici)
                          return (
                            <Text
                              key={node.key}
                              style={{ color: '#60a5fa', fontWeight: 'bold', textDecorationLine: 'none' }}
                              onPress={() => handleVerseClick(url)}
                            >
                              {children}
                            </Text>
                          );
                        }
                      }}>
                        {processContent(editingNote.content || "*Aucun contenu...*")}
                      </Markdown>
                    </View>
                  ) : (
                    <TextInput
                      ref={textInputRef}
                      multiline
                      textAlignVertical="top"
                      placeholder="Écrivez votre réflexion ici... (Versets détectés automatiquement)"
                      placeholderTextColor="#475569"
                      className="text-lg text-slate-200 leading-7 pb-40 min-h-[300px]"
                      style={{ fontFamily: 'Lexend_400Regular' }}
                      value={editingNote.content}
                      onChangeText={t => setEditingNote({ ...editingNote, content: t })}
                      onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                    />
                  )}
                </>
              )}
            </ScrollView>

            {/* BARRE D'OUTILS (TOOLBAR) */}
            {!isPreviewMode && editingNote && (
              <View className="bg-[#161b22] border-t border-white/10 pb-4">
                {/* Palette de Surlignage */}
                {showHighlighter && (
                  <View className="flex-row justify-around py-3 bg-white/5 border-b border-white/5">
                    {HIGHLIGHT_COLORS.map(c => (
                      <TouchableOpacity key={c.id} onPress={() => { insertMarkdown(`[`, `](#h:${c.id})`); setShowHighlighter(false); }} style={{ backgroundColor: c.bg, borderColor: c.border }} className="w-12 h-10 rounded-xl border items-center justify-center">
                        <View style={{ backgroundColor: c.text }} className="w-1.5 h-4 rounded-full" />
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={() => setShowHighlighter(false)} className="w-10 h-10 items-center justify-center"><X size={18} color="#8b949e" /></TouchableOpacity>
                  </View>
                )}
                {/* Palette de Couleur de Texte */}
                {showTextColor && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-3 bg-white/5 border-b border-white/5 px-4 flex-row">
                    {TEXT_COLORS.map(c => (
                      <TouchableOpacity key={c.id} onPress={() => { insertMarkdown(`[`, `](#c:${c.id})`); setShowTextColor(false); }} style={{ borderColor: c.color }} className="w-10 h-10 rounded-full border items-center justify-center bg-white/5 mr-4">
                        <Text style={{ color: c.color }} className="font-bold text-lg">A</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={() => setShowTextColor(false)} className="w-10 h-10 items-center justify-center"><X size={18} color="#8b949e" /></TouchableOpacity>
                  </ScrollView>
                )}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-4">
                  <View className="flex-row gap-4 px-6">
                    <TouchableOpacity onPress={() => { setShowHighlighter(!showHighlighter); }} className={cn("w-12 h-12 rounded-2xl items-center justify-center border", showHighlighter ? "bg-primary/20 border-primary" : "bg-white/5 border-white/10")}><Highlighter size={20} color={showHighlighter ? "#60a5fa" : "#8b949e"} /></TouchableOpacity>
                    <View className="w-[1px] h-10 bg-white/10 self-center" />
                    <TouchableOpacity onPress={() => insertMarkdown('**', '**')} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center border border-white/10"><Bold size={20} color="#8b949e" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => insertMarkdown('*', '*')} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center border border-white/10"><Italic size={20} color="#8b949e" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => insertMarkdown('# ', '')} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center border border-white/10"><Heading size={20} color="#8b949e" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => insertMarkdown('- ', '')} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center border border-white/10"><List size={20} color="#8b949e" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => insertMarkdown('> ', '')} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center border border-white/10"><Quote size={20} color="#8b949e" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => insertMarkdown('`', '`')} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center border border-white/10"><Code size={20} color="#8b949e" /></TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* MODAL CRÉATION DOSSIER */}
      <Modal visible={showFolderModal} animationType="fade" transparent>
        <SafeAreaView className="flex-1 bg-black/70 justify-center px-8">
          <View className="bg-[#1c2128] p-8 rounded-[40px] border border-white/10 shadow-2xl">
            <Text className="text-xl font-bold text-white mb-6 text-center">Nouveau dossier</Text>
            <TextInput
              autoFocus
              placeholder="Nom du dossier..."
              placeholderTextColor="#475569"
              className="bg-white/5 text-white p-5 rounded-2xl border border-white/10 mb-6 text-lg"
              value={newFolderName}
              onChangeText={setNewFolderName}
            />
            <View className="flex-row gap-4">
              <TouchableOpacity onPress={() => { setShowFolderModal(false); setNewFolderName(""); }} className="flex-1 bg-white/5 py-4 rounded-2xl items-center border border-white/10"><Text className="text-white font-bold">Annuler</Text></TouchableOpacity>
              <TouchableOpacity onPress={createFolder} className="flex-1 bg-primary py-4 rounded-2xl items-center shadow-lg shadow-primary/30"><Text className="text-white font-bold">Créer</Text></TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* DÉTAIL DU VERSET DÉTECTÉ */}
      <Modal visible={!!detectedVerse} animationType="slide" transparent>
        <SafeAreaView className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 mx-4 mb-4 rounded-[40px] p-8 border border-white/10 shadow-2xl">
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center">
                <BookOpen size={24} color="#3b82f6" className="mr-3" />
                <Text className="text-white font-bold text-xl">{detectedVerse?.book} {detectedVerse?.chapter}:{detectedVerse?.verses}</Text>
              </View>
              <TouchableOpacity onPress={() => setDetectedVerse(null)} className="w-10 h-10 bg-white/5 rounded-full items-center justify-center"><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <ScrollView className="max-h-[300px] mb-8">
              {verseLoading ? <ActivityIndicator color="#3b82f6" /> : <Text className="text-slate-200 text-xl leading-8 italic font-medium">"{verseContent}"</Text>}
            </ScrollView>
            <TouchableOpacity
              onPress={() => {
                if (detectedVerse?.bookId) {
                  router.push({
                    pathname: "/bible/reader",
                    params: {
                      bookId: String(detectedVerse.bookId),
                      bookName: detectedVerse.book,
                      chapter: String(detectedVerse.chapter),
                      verse: String((detectedVerse.verses || "").split(/[-,]/)[0] || "1"),
                      lang: globalSettings.bibleVersion,
                      testament: "1"
                    }
                  });
                } else {
                  router.push(`/(tabs)/bible`);
                }
                setDetectedVerse(null);
              }}
              className="bg-blue-600 py-5 rounded-2xl items-center shadow-lg shadow-blue-500/40"
            >
              <Text className="text-white font-bold text-lg">Ouvrir dans la Bible</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}
