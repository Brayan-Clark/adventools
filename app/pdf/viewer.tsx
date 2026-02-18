import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Modal, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ZoomIn, ZoomOut, Bookmark, FileText, Menu, X, Save, Edit3, Trash2, ChevronRight, AlertCircle } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Conditional import to avoid crash on Expo Go immediate import
let Pdf: any;
try {
  Pdf = require('react-native-pdf').default;
} catch (e) {
  console.log("react-native-pdf not available");
}

const DOCUMENTS: Record<string, any> = {
  'HFM.pdf': require('../../assets/docs/HFM.pdf'),
  'IFM.pdf': require('../../assets/docs/Ilay Fitiavana Mandresy (IFM).pdf'),
};

export default function PdfViewer() {
  const { fileName, title } = useLocalSearchParams();
  const router = useRouter();
  const [source, setSource] = useState<{ uri: string, cache: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Study states
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [showStudyMenu, setShowStudyMenu] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNoteText, setCurrentNoteText] = useState("");

  const isExpoGo = Constants.appOwnership === 'expo';
  const pdfRef = React.useRef<any>(null);

  useEffect(() => {
    if (fileName) {
      loadStudyData();
    }
  }, [fileName]);

  const loadStudyData = async () => {
    try {
      const bKey = `pdf_bookmarks_${fileName}`;
      const nKey = `pdf_notes_${fileName}`;
      const [storedBookmarks, storedNotes] = await Promise.all([
        AsyncStorage.getItem(bKey),
        AsyncStorage.getItem(nKey)
      ]);

      if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));
      if (storedNotes) setNotes(JSON.parse(storedNotes));
    } catch (e) {
      console.error("Failed to load study data", e);
    }
  };

  const toggleBookmark = async () => {
    try {
      const newBookmarks = bookmarks.includes(currentPage)
        ? bookmarks.filter(p => p !== currentPage)
        : [...bookmarks, currentPage].sort((a, b) => a - b);

      setBookmarks(newBookmarks);
      await AsyncStorage.setItem(`pdf_bookmarks_${fileName}`, JSON.stringify(newBookmarks));
    } catch (e) {
      console.error(e);
    }
  };

  const saveNote = async () => {
    try {
      const newNotes = { ...notes, [currentPage]: currentNoteText };
      if (!currentNoteText.trim()) {
        delete newNotes[currentPage];
      }
      setNotes(newNotes);
      await AsyncStorage.setItem(`pdf_notes_${fileName}`, JSON.stringify(newNotes));
      setShowNoteModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNote = async (page: number) => {
    try {
      const newNotes = { ...notes };
      delete newNotes[page];
      setNotes(newNotes);
      await AsyncStorage.setItem(`pdf_notes_${fileName}`, JSON.stringify(newNotes));
    } catch (e) {
      console.error(e);
    }
  };

  const jumpToPage = (page: number) => {
    if (pdfRef.current) {
      pdfRef.current.setPage(page);
      setShowStudyMenu(false);
    }
  };

  useEffect(() => {
    async function preparePdf() {
      if (isExpoGo) {
        setLoading(false);
        return; // Don't try loading asset if native module missing
      }

      try {
        if (!fileName || typeof fileName !== 'string') {
          setError("Fichier non spécifié");
          return;
        }

        const assetModule = DOCUMENTS[fileName];

        if (assetModule) {
          // It's a bundled asset
          const asset = Asset.fromModule(assetModule);
          await asset.downloadAsync();

          if (asset.localUri) {
            setSource({ uri: asset.localUri, cache: true });
          } else {
            const dest = `${FileSystem.documentDirectory}${fileName}`;
            await FileSystem.copyAsync({ from: asset.uri, to: dest });
            setSource({ uri: dest, cache: true });
          }
        } else {
          // Check if it's in document directory (downloaded)
          const localPath = `${FileSystem.documentDirectory}${fileName}`;
          const info = await FileSystem.getInfoAsync(localPath);
          if (info.exists) {
            setSource({ uri: localPath, cache: true });
          } else {
            setError("Fichier introuvable localement : " + fileName);
          }
        }
      } catch (e) {
        console.error("Error loading PDF:", e);
        setError("Erreur chargement PDF");
      } finally {
        setLoading(false);
      }
    }
    preparePdf();
  }, [fileName]);

  if (isExpoGo) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center px-6">
        <StatusBar style="light" />
        <View className="bg-slate-900 p-8 rounded-3xl border border-slate-700 items-center">
          <AlertCircle size={48} color="#ef4444" className="mb-4" />
          <Text className="text-white font-bold text-xl mb-2 text-center">Module Natif Manquant</Text>
          <Text className="text-slate-400 text-center mb-6 leading-6">
            Le lecteur PDF utilise `react-native-pdf` qui est une librairie native. Elle ne fonctionne pas dans Expo Go standard.
          </Text>
          <Text className="text-slate-300 text-center font-bold mb-6 bg-slate-800 p-3 rounded-lg overflow-hidden">
            npx expo run:android
          </Text>
          <TouchableOpacity onPress={() => router.back()} className="bg-slate-700 w-full py-4 rounded-xl items-center">
            <Text className="text-white font-bold">Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-4 py-4 flex-row items-center justify-between bg-slate-900 border-b border-slate-800 z-10">
        <View className="flex-row items-center flex-1 mr-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 w-10 h-10 rounded-full bg-slate-800 items-center justify-center border border-slate-700">
            <ArrowLeft size={20} color="#cbd5e1" />
          </TouchableOpacity>
          <View>
            <Text className="text-white font-bold text-sm" numberOfLines={1}>{title || fileName}</Text>
            <Text className="text-[10px] text-slate-400">Page {currentPage} sur {totalPages}</Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={toggleBookmark}
            className={`p-2 rounded-lg border ${bookmarks.includes(currentPage) ? 'bg-blue-500/10 border-blue-500' : 'bg-slate-800 border-slate-700'}`}
          >
            <Bookmark size={20} color={bookmarks.includes(currentPage) ? "#3b82f6" : "#cbd5e1"} fill={bookmarks.includes(currentPage) ? "#3b82f6" : "transparent"} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setCurrentNoteText(notes[currentPage] || "");
              setShowNoteModal(true);
            }}
            className={`p-2 rounded-lg border ${notes[currentPage] ? 'bg-green-500/10 border-green-500' : 'bg-slate-800 border-slate-700'}`}
          >
            <FileText size={20} color={notes[currentPage] ? "#10b981" : "#cbd5e1"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowStudyMenu(true)} className="p-2 bg-slate-800 rounded-lg border border-slate-700">
            <Menu size={20} color="#cbd5e1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 justify-center items-center bg-gray-900">
        {loading ? (
          <ActivityIndicator size="large" color="#195de6" />
        ) : error ? (
          <Text className="text-red-500">{error}</Text>
        ) : source && Pdf ? (
          <Pdf
            ref={pdfRef}
            source={source}
            style={{ flex: 1, width: Dimensions.get('window').width }}
            scale={scale}
            minScale={1.0}
            maxScale={3.0}
            spacing={10}
            fitPolicy={0}
            enablePaging={false}
            onPageChanged={(page: number, total: number) => {
              setCurrentPage(page);
              setTotalPages(total);
            }}
            onLoadComplete={(total: number) => {
              setTotalPages(total);
            }}
            onError={(error: any) => {
              console.error(error);
              setError("Erreur affichage PDF: " + error);
            }}
            trustAllCerts={false}
          />
        ) : null}
      </View>

      {/* Floating Zoom Controls */}
      <View className="absolute bottom-10 right-6 flex-col gap-3">
        <TouchableOpacity onPress={() => setScale(s => Math.min(s + 0.25, 3))} className="w-12 h-12 bg-slate-900/90 border border-slate-700 rounded-full items-center justify-center shadow-xl">
          <ZoomIn size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setScale(s => Math.max(s - 0.25, 1))} className="w-12 h-12 bg-slate-900/90 border border-slate-700 rounded-full items-center justify-center shadow-xl">
          <ZoomOut size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Study Menu Modal (Sidebar) */}
      <Modal visible={showStudyMenu} animationType="slide" transparent>
        <View className="flex-1 flex-row">
          <TouchableOpacity className="flex-1 bg-black/50" onPress={() => setShowStudyMenu(false)} />
          <View className="w-80 bg-slate-900 border-l border-slate-800 p-6 pt-12">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-xl font-bold text-white">Étude du document</Text>
              <TouchableOpacity onPress={() => setShowStudyMenu(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Bookmarks Section */}
              <View className="mb-8">
                <View className="flex-row items-center mb-4">
                  <Bookmark size={18} color="#3b82f6" className="mr-2" />
                  <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest">Marque-pages</Text>
                </View>
                {bookmarks.length === 0 ? (
                  <Text className="text-slate-600 text-xs italic ml-7">Aucun marque-page</Text>
                ) : (
                  bookmarks.map(page => (
                    <TouchableOpacity
                      key={page}
                      onPress={() => jumpToPage(page)}
                      className="flex-row items-center py-3 ml-7 border-b border-slate-800/50"
                    >
                      <Text className="text-white font-medium flex-1">Page {page}</Text>
                      <ChevronRight size={16} color="#475569" />
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* Notes Section */}
              <View className="mb-8">
                <View className="flex-row items-center mb-4">
                  <FileText size={18} color="#10b981" className="mr-2" />
                  <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest">Vos Notes</Text>
                </View>
                {Object.keys(notes).length === 0 ? (
                  <Text className="text-slate-600 text-xs italic ml-7">Aucune note</Text>
                ) : (
                  Object.entries(notes).sort(([a], [b]) => Number(a) - Number(b)).map(([page, text]) => (
                    <TouchableOpacity
                      key={page}
                      onPress={() => jumpToPage(Number(page))}
                      className="py-3 ml-7 border-b border-slate-800/50"
                    >
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-green-500 font-bold text-[10px]">PAGE {page}</Text>
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); deleteNote(Number(page)); }}>
                          <Trash2 size={12} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                      <Text className="text-slate-300 text-xs" numberOfLines={2}>{text}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Note Edit Modal */}
      <Modal visible={showNoteModal} animationType="fade" transparent>
        <View className="flex-1 bg-black/70 justify-center px-6">
          <View className="bg-slate-900 rounded-3xl p-6 border border-slate-800">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-bold text-lg">Note - Page {currentPage}</Text>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TextInput
              multiline
              autoFocus
              className="bg-slate-800/50 text-white p-4 rounded-2xl mb-6 text-base leading-6 border border-slate-700"
              style={{ minHeight: 150, textAlignVertical: 'top' }}
              value={currentNoteText}
              onChangeText={setCurrentNoteText}
              placeholder="Écrivez votre commentaire ici..."
              placeholderTextColor="#475569"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowNoteModal(false)}
                className="flex-1 py-4 items-center bg-slate-800 rounded-2xl"
              >
                <Text className="text-slate-400 font-bold">Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveNote}
                className="flex-[2] py-4 items-center bg-green-600 rounded-2xl flex-row justify-center"
              >
                <Save size={18} color="white" className="mr-2" />
                <Text className="text-white font-bold">Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
