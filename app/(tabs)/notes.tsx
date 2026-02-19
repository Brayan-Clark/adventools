import { loadDatabase } from '@/lib/database';
import { cn } from '@/lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Bold, BookOpen, Check, Code, Edit, Eye, Heading, Italic, Link as LinkIcon, List, Plus, Quote, Search, StickyNote, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Note {
  id: string;
  title: string;
  content: string;
  date: number;
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const textInputRef = React.useRef<TextInput>(null);
  const router = useRouter();
  const params = useLocalSearchParams();

  // State for detected bible verse modal
  const [detectedVerse, setDetectedVerse] = useState<{ book: string, chapter: string, verses: string } | null>(null);
  const [verseContent, setVerseContent] = useState<string | null>(null);
  const [verseLoading, setVerseLoading] = useState(false);
  const [targetBookId, setTargetBookId] = useState<number | null>(null);
  const [resolvedBookName, setResolvedBookName] = useState<string>('');

  useEffect(() => {
    loadNotes();
  }, []);

  // Handle opening specific note from history/params
  useEffect(() => {
    if (params.noteId && notes.length > 0) {
      const targetNote = notes.find(n => n.id === String(params.noteId));
      if (targetNote) {
        setEditingNote(targetNote);
        setIsPreviewMode(true);
      }
    }
  }, [params.noteId, notes]);

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
      // Remove duplicate by id
      history = history.filter((h: any) => !(h.type === 'note' && h.params?.noteId === note.id));
      history.unshift(historyItem);
      await AsyncStorage.setItem('app_history', JSON.stringify(history.slice(0, 5)));
    } catch (e) {
      console.error("Failed to save note history", e);
    }
  };

  // Fetch verse content when detectedVerse changes
  useEffect(() => {
    async function fetchVerse() {
      if (!detectedVerse) {
        setVerseContent(null);
        setResolvedBookName('');
        return;
      }

      setVerseLoading(true);
      try {
        const db = await loadDatabase('protestant.db', require('../../assets/databases/protestant.db'));

        // Dynamically find table names
        const tables: any[] = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
        const bookTable = tables.find(t => t.name.endsWith("_boky"))?.name;
        const verseTable = tables.find(t => t.name.endsWith("_andininy"))?.name;

        if (!bookTable || !verseTable) {
          setVerseContent(`Structure DB incompatible: Tables _boky/_andininy introuvables. Tables: ${tables.map(t => t.name).join(',')}`);
          setVerseLoading(false);
          return;
        }

        // 1. Find Book ID
        // Hardcoded mapping for common abbreviations
        const BOOK_MAP: Record<string, string> = {
          'gen': 'Genesisy', 'eks': 'Eksodosy', 'lev': 'Levitikosy', 'nom': 'Nomery', 'deo': 'Deotoronomia',
          'jos': 'Josoa', 'mpits': 'Mpitsara', 'rota': 'Rota', '1sam': '1 Samoela', '2sam': '2 Samoela',
          '1mpanj': '1 Mpanjaka', '2mpanj': '2 Mpanjaka', '1tant': '1 Tantara', '2tant': '2 Tantara',
          'ezra': 'Ezra', 'neh': 'Nehemia', 'est': 'Estera', 'joba': 'Joba', 'sal': 'Salamo', 'ohab': 'Ohabolana',
          'mpito': 'Mpitoriteny', 'tonon': "Tonon-kiran'i Solomona", 'isa': 'Isaia', 'jer': 'Jeremia',
          'fitom': 'Fitomaniana', 'ezek': 'Ezekiela', 'dan': 'Daniela',
          'mat': 'Matio', 'mar': 'Marka', 'lio': 'Lioka', 'jao': 'Jaona', 'asa': "Asan'ny Apostoly",
          'rom': 'Romana', '1kor': '1 Korintiana', '2kor': '2 Korintiana', 'gal': 'Galatiana',
          'efe': 'Efesiana', 'filip': 'Filipiana', 'kol': 'Kolosiana',
          '1tes': '1 Tesaloniana', '2tes': '2 Tesaloniana', '1tim': '1 Timoty', '2tim': '2 Timoty',
          'tit': 'Titosy', 'file': 'Filemona', 'heb': 'Hebreo', 'jak': 'Jakoba',
          '1pet': '1 Petera', '2pet': '2 Petera', '1jao': '1 Jaona', '2jao': '2 Jaona', '3jao': '3 Jaona',
          'jod': 'Joda', 'apok': 'Apokalypsy'
        };

        const cleanDetectedBook = detectedVerse.book.replace(/[\.\s]/g, '').toLowerCase();

        // First, try to get the full name from our mapping
        let searchBookName = BOOK_MAP[cleanDetectedBook];

        // If not found in map, try with first 3 letters
        if (!searchBookName && cleanDetectedBook.length >= 3) {
          const shortName = cleanDetectedBook.substring(0, 3);
          searchBookName = BOOK_MAP[shortName];
        }

        // If still not found, use the original cleaned name
        if (!searchBookName) {
          searchBookName = detectedVerse.book;
        }

        // Search in database ignoring spaces, hyphens and quotes for maximum compatibility
        const bookQuery = `
          SELECT id, b_name 
          FROM ${bookTable} 
          WHERE REPLACE(REPLACE(REPLACE(LOWER(b_name), ' ', ''), '-', ''), "'", '') LIKE ? 
          LIMIT 1
        `;
        const searchPattern = `%${searchBookName.toLowerCase().replace(/[\s\-\']/g, '')}%`;

        let bookRes: any = await db.getFirstAsync(bookQuery, [searchPattern]);

        if (!bookRes) {
          setVerseContent(`Livre "${detectedVerse.book}" introuvable dans la base.`);
          setVerseLoading(false);
          return;
        }

        setTargetBookId(bookRes.id);
        setResolvedBookName(bookRes.b_name); // Store the full book name

        // Use the discovered verse table for the query
        const verseTableName = verseTable; // Capture for closure if needed, though block-scoped let is fine.

        // 2. Parse Verses
        const versePart = detectedVerse.verses;
        let query = `SELECT a_and, a_text FROM ${verseTable} WHERE a_bid = ? AND a_toko = ?`;
        let params: any[] = [bookRes.id, detectedVerse.chapter];

        if (versePart) {
          // Remove all spaces for easier parsing
          const cleanVerses = versePart.replace(/\s/g, '');

          if (cleanVerses.includes('-')) {
            const parts = cleanVerses.split('-');
            if (parts.length === 2 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))) {
              query += ` AND a_and BETWEEN ? AND ?`;
              params.push(parseInt(parts[0]), parseInt(parts[1]));
            }
          } else if (cleanVerses.includes(',')) {
            const nums = cleanVerses.split(',').map(n => parseInt(n)).filter(n => !isNaN(n));
            if (nums.length > 0) {
              query += ` AND a_and IN (${nums.join(',')})`;
            }
          } else {
            const num = parseInt(cleanVerses);
            if (!isNaN(num)) {
              query += ` AND a_and = ?`;
              params.push(num);
            }
          }
        }

        const versesRes: any[] = await db.getAllAsync(query, params);

        if (versesRes && versesRes.length > 0) {
          const text = versesRes.map(v => `${v.a_and}. ${v.a_text}`).join('\n\n');
          setVerseContent(text);
        } else {
          setVerseContent("Verset introuvable.");
        }

      } catch (e) {
        console.error(e);
        setVerseContent("Erreur de chargement.");
      } finally {
        setVerseLoading(false);
      }
    }

    fetchVerse();
  }, [detectedVerse]);

  const loadNotes = async () => {
    const saved = await AsyncStorage.getItem("adventools_notes");
    if (saved) setNotes(JSON.parse(saved));
  };

  const autoSave = async () => {
    if (!editingNote) return;
    const exists = notes.find(n => n.id === editingNote.id);
    let updated;
    if (exists) {
      updated = notes.map(n => n.id === editingNote.id ? editingNote : n);
    } else {
      updated = [editingNote, ...notes];
    }
    await AsyncStorage.setItem("adventools_notes", JSON.stringify(updated));
    setNotes(updated);
  };

  const handleManualSave = () => {
    autoSave();
    setEditingNote(null);
    setIsPreviewMode(false);
  };

  const addNote = () => {
    setEditingNote({
      id: Date.now().toString(),
      title: "",
      content: "",
      date: Date.now(),
    });
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

  const insertMarkdown = (before: string, after: string = '') => {
    if (!editingNote) return;
    const content = editingNote.content || "";
    const { start, end } = selection;
    const selectedText = content.substring(start, end);
    const newContent = content.substring(0, start) + before + (selectedText || '') + after + content.substring(end);

    setEditingNote({ ...editingNote, content: newContent });

    setTimeout(() => {
      const newPosition = start + before.length + selectedText.length + after.length;
      textInputRef.current?.setNativeProps({ selection: { start: newPosition, end: newPosition } });
    }, 10);
  };

  const togglePreview = () => {
    if (!isPreviewMode) {
      // Switching to Preview -> Auto Save
      autoSave();
    }
    setIsPreviewMode(!isPreviewMode);
  };

  const BIBLE_BOOKS = "Gen|Eks|Lev|Nom|Deo|Jos|Mpits|Rota|1Sam|2Sam|1Mpanj|2Mpanj|1Tant|2Tant|Ezra|Neh|Est|Joba|Sal|Ohab|Mpito|Tonon|Isa|Jer|Fitom|Ezek|Dan|Hosea|Joela|Amosa|Obad|Jon|Mika|Nah|Hab|Zef|Hag|Zak|Mal|Mat|Mar|Lio|Jao|Asa|Rom|1Kor|2Kor|Gal|Efe|Filip|Kol|1Tes|2Tes|1Tim|2Tim|Tit|File|Heb|Jak|1Pet|2Pet|1Jao|2Jao|3Jao|Jod|Apok|Genesisy|Eksodosy|Levitikosy|Nomery|Deoteronomia|Josoa|Mpitsara|Rota|1Samoela|2Samoela|1Mpanjaka|2Mpanjaka|1Tantara|2Tantara|Ezra|Nehemia|Estera|Joba|Salamo|Ohabolana|Mpitoriteny|Tonon-kiran'i Solomona|Isaia|Jeremia|Fitomaniana|Ezekiela|Daniela|Hosea|Joela|Amosa|Obadia|Jona|Mika|Nahoma|Habakoka|Zefania|Hagay|Zakaria|Malakia|Matio|Marka|Lioka|Jaona|Asan'ny Apostoly|Romana|Romanina|1Korintiana|2Korintiana|Galatiana|Efesiana|Filipiana|Kolosiana|1Tesaloniana|2Tesaloniana|1Timoty|2Timoty|Titosy|Filemona|Hebreo|Jakoba|1Petera|2Petera|1Jaona|2Jaona|3Jaona|Joda|Apokalypsy";
  // Regex construction: (Book) (Chapter) : (Verses part)
  const BIBLE_REGEX = new RegExp(`\\b(${BIBLE_BOOKS})\\.?\\s{0,1}(\\d+)\\s{0,1}(?::\\s{0,1}([\\d\\s\\-,]+))?(?:\\.?\\s{0,1})\\b`, 'gi');

  const handleVerseClick = (url: string) => {
    // Use #verse: format instead of bible:// to avoid Android intent issues
    if (url.startsWith('#verse:')) {
      const data = url.replace('#verse:', '');
      const parts = data.split('/');
      if (parts.length >= 2) {
        setDetectedVerse({
          book: decodeURIComponent(parts[0]),
          chapter: parts[1],
          verses: parts[2] || ""
        });
      }
      return false; // Prevent default
    }
    return true;
  };

  const processContent = (text: string) => {
    if (!text) return "";
    return text.replace(BIBLE_REGEX, (match, book, chapter, verses) => {
      // Use #verse: format instead of bible:// to avoid external URL handling
      return `[${match}](#verse:${encodeURIComponent(book.trim())}/${chapter}/${verses ? verses.trim() : ''})`;
    });
  };

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const markdownStyles = StyleSheet.create({
    body: { color: '#adbac7', fontSize: 16, lineHeight: 28, fontFamily: 'Lexend_400Regular' },
    heading1: { color: '#ffffff', fontSize: 28, fontFamily: 'Lexend_700Bold', marginTop: 24, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#373e47', paddingBottom: 8 },
    heading2: { color: '#ffffff', fontSize: 24, fontFamily: 'Lexend_700Bold', marginTop: 20, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#373e47', paddingBottom: 6 },
    link: { color: '#539bf5', textDecorationLine: 'none', fontWeight: '600' as '600' },
  });

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />
      <View className="px-6 py-6 border-b border-slate-800/50">
        <View className="flex-row justify-between items-center mb-8">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 rounded-full bg-slate-900 items-center justify-center border border-slate-800">
              <ArrowLeft size={20} color="#94a3b8" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>Mes Notes</Text>
          </View>
          <TouchableOpacity onPress={addNote} className="w-12 h-12 rounded-[18px] bg-primary items-center justify-center shadow-xl shadow-primary/40">
            <Plus size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="relative flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-1">
          <Search size={18} color="#64748b" />
          <TextInput
            placeholder="Rechercher une note..."
            placeholderTextColor="#475569"
            className="flex-1 h-12 ml-3 text-white font-medium"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="flex-row flex-wrap justify-between">
          {filteredNotes.map((note) => (
            <TouchableOpacity
              key={note.id}
              onPress={() => {
                setEditingNote(note);
                setIsPreviewMode(true);
                addToHistory(note);
              }}
              activeOpacity={0.7}
              className="w-[48%] bg-slate-800/50 p-4 rounded-2xl mb-4 border border-slate-700/50 relative overflow-hidden"
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text className="font-bold text-white text-base leading-tight flex-1 mr-1" numberOfLines={2}>
                  {note.title || "Note sans titre"}
                </Text>
              </View>

              <Text className="text-xs text-slate-400 mb-3 leading-4" numberOfLines={4}>
                {note.content?.replace(/[#*`]/g, '') || "Aucun contenu..."}
              </Text>

              <View className="flex-row justify-between items-center mt-auto pt-2 border-t border-slate-700/30">
                <Text className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  {new Date(note.date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      "Supprimer",
                      "Voulez-vous vraiment supprimer cette note ?",
                      [
                        { text: "Annuler", style: "cancel" },
                        { text: "Supprimer", style: "destructive", onPress: () => deleteNote(note.id) }
                      ]
                    );
                  }}
                  className="p-1.5 -mr-2 bg-red-500/10 rounded-full"
                >
                  <Trash2 size={12} color="#ef4444" opacity={0.8} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
          {filteredNotes.length === 0 && (
            <View className="w-full items-center py-20">
              <StickyNote size={32} color="#475569" />
              <Text className="text-slate-500 font-medium tracking-tight mt-4">Aucune note pour le moment</Text>
            </View>
          )}
        </View>
        <View className="h-24" />
      </ScrollView>

      {/* Editor Modal */}
      <Modal visible={!!editingNote} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView className="flex-1 bg-background-dark">
          <StatusBar style="light" />
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-800/50 bg-[#0d1117]">
            <TouchableOpacity onPress={() => { setEditingNote(null); setIsPreviewMode(false); }} className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center border border-slate-700">
              <X size={20} color="#8b949e" />
            </TouchableOpacity>

            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={togglePreview}
                className={cn(
                  "px-4 py-2 rounded-full flex-row items-center gap-2 border",
                  !isPreviewMode ? "bg-[#1f6feb] border-[#1f6feb]" : "bg-[#21262d] border-[#30363d]"
                )}
              >
                {!isPreviewMode ? <Eye size={16} color="white" /> : <Edit size={16} color="#8b949e" />}
                <Text className={cn("text-xs font-bold", !isPreviewMode ? "text-white" : "text-[#c9d1d9]")}>
                  {!isPreviewMode ? "Aperçu" : "Éditer"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleManualSave} className="w-10 h-10 rounded-full bg-[#238636] items-center justify-center shadow-lg border border-[rgba(240,246,252,0.1)]">
                <Check size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-[#0d1117]">
            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
              <TextInput
                placeholder="Titre de la note"
                placeholderTextColor="#6e7681"
                className="text-2xl font-bold text-white mb-6 border-b border-slate-800 pb-4"
                style={{ fontFamily: 'Lexend_700Bold' }}
                value={editingNote?.title}
                onChangeText={(txt) => setEditingNote(prev => prev ? { ...prev, title: txt } : null)}
              />

              {isPreviewMode ? (
                <View className="pb-40">
                  <Markdown style={markdownStyles} onLinkPress={handleVerseClick}>
                    {processContent(editingNote?.content || "*Aucun contenu*")}
                  </Markdown>
                </View>
              ) : (
                <TextInput
                  ref={textInputRef}
                  placeholder="Écrivez votre réflexion ici... (Markdown supporté)"
                  placeholderTextColor="#6e7681"
                  className="text-lg leading-7 text-[#c9d1d9] pb-40 min-h-[300px]"
                  style={{ fontFamily: 'Lexend_400Regular' }}
                  multiline
                  textAlignVertical="top"
                  value={editingNote?.content}
                  onChangeText={(txt) => setEditingNote(prev => prev ? { ...prev, content: txt } : null)}
                  onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                />
              )}
            </ScrollView>
            {!isPreviewMode && (
              <View className="bg-[#161b22] border-t border-[#30363d] px-2 py-3">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 px-2">
                  <TouchableOpacity onPress={() => insertMarkdown('**', '**')} className="w-10 h-10 bg-[#21262d] rounded-lg items-center justify-center border border-[#30363d]"><Bold size={18} color="#8b949e" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => insertMarkdown('*', '*')} className="w-10 h-10 bg-[#21262d] rounded-lg items-center justify-center border border-[#30363d]"><Italic size={18} color="#8b949e" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => insertMarkdown('# ', '')} className="w-10 h-10 bg-[#21262d] rounded-lg items-center justify-center border border-[#30363d]"><Heading size={18} color="#8b949e" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => insertMarkdown('- ', '')} className="w-10 h-10 bg-[#21262d] rounded-lg items-center justify-center border border-[#30363d]"><List size={18} color="#8b949e" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => insertMarkdown('> ', '')} className="w-10 h-10 bg-[#21262d] rounded-lg items-center justify-center border border-[#30363d]"><Quote size={18} color="#8b949e" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => insertMarkdown('`', '`')} className="w-10 h-10 bg-[#21262d] rounded-lg items-center justify-center border border-[#30363d]"><Code size={18} color="#8b949e" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => insertMarkdown('[', '](url)')} className="w-10 h-10 bg-[#21262d] rounded-lg items-center justify-center border border-[#30363d]"><LinkIcon size={18} color="#8b949e" /></TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Detected Verse Modal */}
      <Modal visible={!!detectedVerse} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-center items-center px-6">
          <View className="bg-[#161b22] w-full p-6 rounded-3xl border border-[#30363d] shadow-2xl relative max-h-[80%]">
            <TouchableOpacity onPress={() => setDetectedVerse(null)} className="absolute top-4 right-4 p-2 bg-[#21262d] rounded-full z-10">
              <X size={16} color="#8b949e" />
            </TouchableOpacity>
            <View className="flex-row items-center mb-4">
              <BookOpen size={20} color="#1f6feb" className="mr-3" />
              <Text className="text-white text-lg font-bold">
                {resolvedBookName || detectedVerse?.book} {detectedVerse?.chapter}{detectedVerse?.verses ? `:${detectedVerse.verses}` : ''}
              </Text>
            </View>
            <ScrollView className="bg-[#0d1117] rounded-xl border border-[#30363d] mb-6 max-h-64" contentContainerStyle={{ padding: 16 }}>
              {verseLoading ? (
                <ActivityIndicator color="#1f6feb" />
              ) : (
                <Text className="text-[#c9d1d9] text-base leading-7 font-serif italic">
                  {verseContent || "Chargement..."}
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              className="bg-[#1f6feb] w-full py-3.5 rounded-xl items-center"
              disabled={!targetBookId}
              onPress={() => {
                if (!targetBookId || !detectedVerse?.chapter) {
                  Alert.alert('Erreur', 'Impossible d\'ouvrir ce verset dans la Bible.');
                  return;
                }

                console.log('Navigation params:', {
                  bookId: targetBookId,
                  chapter: detectedVerse.chapter,
                  verses: detectedVerse.verses
                });

                setDetectedVerse(null);

                // Extract first verse number if range (e.g., "16" from "16-18" or "16,17")
                let verseNum = null;
                if (detectedVerse.verses) {
                  const match = detectedVerse.verses.match(/^\d+/);
                  if (match) verseNum = match[0];
                }

                router.push({
                  pathname: '/bible/reader',
                  params: {
                    bookId: String(targetBookId),
                    chapter: String(detectedVerse.chapter),
                    verse: verseNum || undefined
                  }
                });
              }}
            >
              <Text className="text-white font-bold">Ouvrir dans la Bible</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
