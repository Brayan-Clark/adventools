import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, FolderOpen, BookOpen, Clock, FileText, ChevronRight, Plus, Download, X, CloudDownload, Trash2, CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import localManifest from '@/assets/docs/manifest.json';

const ICON_MAP: Record<string, any> = {
  BookOpen,
  FileText,
  FolderOpen,
  Clock
};

const BUNDLED_ASSETS: Record<string, any> = {
  'HFM.pdf': require('@/assets/docs/HFM.pdf'),
  'IFM.pdf': require('@/assets/docs/Ilay Fitiavana Mandresy (IFM).pdf'),
};

export default function PDFLibrary() {
  const [search, setSearch] = useState("");
  const [manifest, setManifest] = useState<any>(null);
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [localFiles, setLocalFiles] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [showStore, setShowStore] = useState(false);
  const [recentPdfs, setRecentPdfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadManifest();
    checkLocalFiles();
    loadRecentPdfs();
  }, []);

  const loadRecentPdfs = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem('app_history');
      if (storedHistory) {
        const history = JSON.parse(storedHistory);
        const pdfHistory = history.filter((h: any) => h.type === 'pdf');
        setRecentPdfs(pdfHistory.slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadManifest = async (force = false) => {
    try {
      if (force) setRefreshing(true);

      // 1. Initial load from local manifest if not already set
      if (!manifest) setManifest(localManifest);

      // 2. Attempt to sync with GitHub (Online) with anti-cache
      const GITHUB_MANIFEST_URL = `https://raw.githubusercontent.com/Brayan-Clark/adventools/main/assets/docs/manifest.json?t=${Date.now()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const response = await fetch(GITHUB_MANIFEST_URL, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const remoteData = await response.json();
        setManifest(remoteData);
      }
    } catch (e) {
      console.log("Using local/cached manifest (offline or sync error)");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkLocalFiles = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);
      setLocalFiles(files);
    } catch (e) {
      console.error(e);
    }
  };

  const downloadFile = async (doc: any) => {
    if (doc.isAsset) return;
    try {
      setDownloading(prev => ({ ...prev, [doc.id]: 0 }));
      const callback = (downloadProgress: any) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        setDownloading(prev => ({ ...prev, [doc.id]: progress }));
      };
      const downloadResumable = FileSystem.createDownloadResumable(
        doc.url,
        FileSystem.documentDirectory + doc.fileName,
        {},
        callback
      );
      const result = await downloadResumable.downloadAsync();
      if (result) {
        setLocalFiles(prev => [...prev, doc.fileName]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(prev => {
        const next = { ...prev };
        delete next[doc.id];
        return next;
      });
    }
  };

  const deleteFile = async (fileName: string) => {
    try {
      await FileSystem.deleteAsync(FileSystem.documentDirectory + fileName);
      setLocalFiles(prev => prev.filter(f => f !== fileName));
    } catch (e) {
      console.error(e);
    }
  };

  const openPdf = async (file: string, title: string) => {
    const isPdf = file.toLowerCase().endsWith('.pdf');
    const localPath = `${FileSystem.documentDirectory}${file}`;

    // Check if it's an asset or dynamic file
    const doc = manifest?.documents.find((d: any) => d.fileName === file);
    let finalUri = "";

    if (doc?.isAsset) {
      // Use the static mapping instead of dynamic require
      const assetModule = BUNDLED_ASSETS[file];
      if (assetModule) {
        const asset = Asset.fromModule(assetModule);
        await asset.downloadAsync();
        finalUri = asset.localUri || "";
      }
    } else {
      finalUri = localPath;
    }

    if (!isPdf) {
      // If it's not a PDF, use system sharing/preview
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(finalUri, { UTI: 'public.data', mimeType: 'application/octet-stream' });
      } else {
        alert("Ce format nécessite une application externe pour être ouvert.");
      }
      return;
    }

    // For PDFs, use our internal viewer
    try {
      const historyItem = {
        type: 'pdf',
        title: title,
        subtitle: 'Document PDF',
        timestamp: Date.now(),
        params: { fileName: file, title: title }
      };

      const existingHistory = await AsyncStorage.getItem('app_history');
      let history = existingHistory ? JSON.parse(existingHistory) : [];

      // Strict deduplication by fileName (more reliable than title)
      history = history.filter((h: any) => !(h.type === 'pdf' && h.params?.fileName === file));

      history.unshift(historyItem);
      // Keep only 20 items in background storage, but we only show 5 in UI
      await AsyncStorage.setItem('app_history', JSON.stringify(history.slice(0, 20)));
      loadRecentPdfs();
    } catch (e) {
      console.error(e);
    }

    router.push({
      pathname: '/pdf/viewer',
      params: { fileName: file, title: title }
    });
  };

  const SmartCover = ({ title, categoryId, size = "md" }: { title: string, categoryId: string, size?: "sm" | "md" }) => {
    const cat = manifest?.categories.find((c: any) => c.id === categoryId);
    const initials = title.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
      <View
        className={`rounded-xl border border-white/10 overflow-hidden items-center justify-center ${size === "sm" ? "w-10 h-14" : "w-full aspect-[3/4]"}`}
        style={{ backgroundColor: cat?.color || '#334155' }}
      >
        <View className="absolute inset-x-0 top-0 h-1/4 bg-black/10" />
        <View className="absolute inset-x-0 bottom-0 h-1/6 bg-white/10" />
        <Text className={`${size === "sm" ? "text-[10px]" : "text-2xl"} font-bold text-white/40`}>{initials}</Text>
        <View className="absolute top-2 left-2 right-2">
          <Text className={`${size === "sm" ? "text-[6px]" : "text-[8px]"} text-white/60 font-medium uppercase tracking-tighter`} numberOfLines={1}>{cat?.title}</Text>
        </View>
      </View>
    );
  };

  if (loading && !manifest) {
    return (
      <SafeAreaView className="flex-1 bg-background-dark justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />

      <View className="px-6 py-4 flex-row justify-between items-center">
        <View className="flex-row items-center">
          {selectedCategory && (
            <TouchableOpacity onPress={() => setSelectedCategory(null)} className="mr-4 w-10 h-10 rounded-full bg-slate-800 items-center justify-center border border-slate-700">
              <ArrowLeft size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
          <View>
            <Text className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>
              {selectedCategory ? selectedCategory.title : "Bibliothèque"}
            </Text>
            <Text className="text-slate-400 text-sm mt-1">
              {selectedCategory ? `${manifest?.documents.filter((d: any) => d.categoryId === selectedCategory.id && (d.isAsset || localFiles.includes(d.fileName))).length} documents` : "Gérez vos ressources d'étude"}
            </Text>
          </View>
        </View>
        {!selectedCategory && (
          <TouchableOpacity onPress={() => setShowStore(true)} className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center border border-blue-500">
            <Plus size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {Object.entries(downloading).map(([id, progress]) => {
          const doc = manifest?.documents.find((d: any) => d.id === id);
          return (
            <View key={id} className="mb-6 w-full bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center gap-3">
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <View>
                    <Text className="text-xs font-bold text-white">Téléchargement...</Text>
                    <Text className="text-[10px] text-slate-400" numberOfLines={1}>{doc?.title}</Text>
                  </View>
                </View>
                <Text className="text-[10px] font-bold text-blue-500">{Math.round(progress * 100)}%</Text>
              </View>
              <View className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                <View className="bg-blue-500 h-1 rounded-full" style={{ width: `${progress * 100}%` }} />
              </View>
            </View>
          );
        })}

        {!selectedCategory ? (
          <>
            {recentPdfs.length > 0 && (
              <View className="mb-8 mt-4">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-lg font-bold text-white">Récents</Text>
                  <TouchableOpacity onPress={() => { }}>
                    <Text className="text-blue-500 text-xs font-bold">Historique</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
                  {recentPdfs.map((pdf, index) => {
                    const docInfo = manifest?.documents.find((d: any) => d.fileName === pdf.params.fileName);
                    return (
                      <TouchableOpacity
                        key={index}
                        className="mr-6 w-32"
                        onPress={() => openPdf(pdf.params.fileName, pdf.title)}
                      >
                        <SmartCover title={pdf.title} categoryId={docInfo?.categoryId} />
                        <Text className="text-slate-200 text-xs font-bold mt-2 truncate" numberOfLines={1}>{pdf.title}</Text>
                        <Text className="text-slate-500 text-[9px] uppercase tracking-widest">{docInfo?.size || 'Disponible'}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View className="mb-8 mt-4">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Mes Dossiers</Text>
              <View className="gap-3">
                {manifest?.categories.map((cat: any) => {
                  const Icon = ICON_MAP[cat.icon] || FolderOpen;
                  const localDocs = manifest?.documents.filter((d: any) =>
                    d.categoryId === cat.id && (d.isAsset || localFiles.includes(d.fileName))
                  );
                  if (localDocs.length === 0) return null;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategory(cat)}
                      className="flex-row items-center w-full p-4 bg-slate-900/50 border border-slate-800/50 rounded-2xl active:bg-slate-800"
                    >
                      <View className="w-12 h-12 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: cat.bg }}>
                        <Icon size={22} color={cat.color} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-white text-base">{cat.title}</Text>
                        <Text className="text-xs text-slate-500">{localDocs.length} document{localDocs.length > 1 ? 's' : ''}</Text>
                      </View>
                      <ChevronRight size={20} color="#334155" />
                    </TouchableOpacity>
                  );
                })}
                {manifest?.categories.every((cat: any) =>
                  manifest?.documents.filter((d: any) => d.categoryId === cat.id && (d.isAsset || localFiles.includes(d.fileName))).length === 0) && (
                    <View className="items-center py-10 opacity-50">
                      <BookOpen size={48} color="#475569" className="mb-4" />
                      <Text className="text-slate-400 text-center font-medium">Votre bibliothèque est vide.</Text>
                      <Text className="text-slate-500 text-center text-xs mt-1">Utilisez le bouton + pour explorer le catalogue.</Text>
                    </View>
                  )}
              </View>
            </View>
          </>
        ) : (
          <View className="mt-4 pb-20">
            {manifest?.documents
              .filter((d: any) => d.categoryId === selectedCategory.id && (d.isAsset || localFiles.includes(d.fileName)))
              .map((doc: any) => (
                <View key={doc.id} className="mb-3 bg-slate-900/40 border border-slate-800/50 rounded-2xl overflow-hidden">
                  <TouchableOpacity
                    onPress={() => openPdf(doc.fileName, doc.title)}
                    className="flex-row items-center p-4"
                  >
                    <View className="w-12 h-16 bg-slate-800 rounded-lg items-center justify-center mr-4 border border-slate-700/50">
                      <FileText size={24} color={selectedCategory.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-white text-base" numberOfLines={1}>{doc.title}</Text>
                      <Text className="text-xs text-slate-500">{doc.size} • Prêt à lire</Text>
                    </View>
                    {!doc.isAsset && (
                      <TouchableOpacity onPress={() => deleteFile(doc.fileName)} className="p-2 mr-2">
                        <Trash2 size={18} color="#475569" />
                      </TouchableOpacity>
                    )}
                    <ChevronRight size={20} color="#334155" />
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showStore} animationType="slide" transparent>
        <SafeAreaView className="flex-1 bg-slate-950">
          <View className="px-6 py-4 flex-row justify-between items-center border-b border-slate-800">
            <View className="flex-1">
              <Text className="text-xl font-bold text-white">Ressources Cloud</Text>
              <Text className="text-xs text-slate-400">Bibliothèque Adventiste en ligne</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => loadManifest(true)}
                disabled={refreshing}
                className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center"
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <Clock size={20} color="#3b82f6" />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowStore(false)} className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center">
                <X size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView className="flex-1 px-6 pt-6">
            {manifest?.categories.map((cat: any) => {
              const cloudDocs = manifest?.documents.filter((d: any) => d.categoryId === cat.id);
              if (cloudDocs.length === 0) return null;
              return (
                <View key={cat.id} className="mb-8">
                  <View className="flex-row items-center mb-4">
                    <View className="w-6 h-6 rounded bg-slate-800 items-center justify-center mr-2">
                      <FolderOpen size={14} color={cat.color} />
                    </View>
                    <Text className="text-sm font-bold text-slate-300 uppercase tracking-widest">{cat.title}</Text>
                  </View>
                  {cloudDocs.map((doc: any) => {
                    const isDownloaded = localFiles.includes(doc.fileName) || doc.isAsset;
                    const isDownloading = downloading[doc.id] !== undefined;
                    return (
                      <View key={doc.id} className="mb-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-row items-center">
                        <View className="w-10 h-12 bg-slate-800 rounded items-center justify-center mr-4">
                          <FileText size={20} color={isDownloaded ? "#10b981" : "#475569"} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white font-bold" numberOfLines={1}>{doc.title}</Text>
                          <Text className="text-[10px] text-slate-500">{doc.size} • {isDownloaded ? 'Déjà sur le téléphone' : 'Disponible au téléchargement'}</Text>
                        </View>
                        {isDownloaded ? (
                          <View className="w-8 h-8 rounded-full bg-green-500/10 items-center justify-center">
                            <CheckCircle2 size={18} color="#10b981" />
                          </View>
                        ) : isDownloading ? (
                          <View className="items-end">
                            <Text className="text-[10px] text-blue-500 font-bold mb-1">{Math.round(downloading[doc.id] * 100)}%</Text>
                            <ActivityIndicator size="small" color="#3b82f6" />
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => downloadFile(doc)}
                            className="w-10 h-10 bg-blue-600 rounded-xl items-center justify-center shadow-lg"
                          >
                            <CloudDownload size={20} color="white" />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <TouchableOpacity
        className="absolute bottom-10 right-6 w-16 h-16 rounded-3xl bg-blue-600 items-center justify-center shadow-2xl shadow-blue-600/50 border border-white/20"
        onPress={() => setShowStore(true)}
      >
        <Plus size={32} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
