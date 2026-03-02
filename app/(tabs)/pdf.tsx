import { useTranslation } from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronDown, ChevronRight, Clock, CloudDownload, FileText, FolderOpen, Plus, RefreshCw, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ICON_MAP: Record<string, any> = {
  BookOpen,
  FileText,
  FolderOpen,
  Clock
};

const getMimeType = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const mimes: Record<string, string> = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'txt': 'text/plain',
  };
  return mimes[extension || ''] || 'application/octet-stream';
};

export default function PDFLibrary() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [manifest, setManifest] = useState<any>(null);
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [localFiles, setLocalFiles] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [showStore, setShowStore] = useState(false);
  const [recentPdfs, setRecentPdfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userDepartments, setUserDepartments] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  useEffect(() => {
    loadManifest();
    checkLocalFiles();
    loadRecentPdfs();
    loadUserDepartments();
  }, []);

  const loadUserDepartments = async () => {
    try {
      const depts = await AsyncStorage.getItem('profile_departments');
      if (depts) setUserDepartments(JSON.parse(depts));
    } catch (e) {
      console.error(e);
    }
  };

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

      const cachedManifest = await AsyncStorage.getItem('pdf_manifest_cache');
      if (cachedManifest && !manifest) {
        const parsed = JSON.parse(cachedManifest);
        setManifest(parsed);
      }

      const GITHUB_MANIFEST_URL = `https://raw.githubusercontent.com/Brayan-Clark/adventools/data/docs/manifest.json?t=${Date.now()}`;
      const response = await fetch(GITHUB_MANIFEST_URL).catch(() => null);

      if (response && response.ok) {
        const remoteData = await response.json();
        setManifest(remoteData);
        await AsyncStorage.setItem('pdf_manifest_cache', JSON.stringify(remoteData));
      }
    } catch (e) {
      console.log("PDF Manifest sync error - using cache if available");
    } finally {
      setLoading(false);
      setRefreshing(false);
      checkLocalFiles();
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
    } catch (e: any) {
      console.error(e);
      let errorMsg = t('download_failed');
      if (e.message?.includes("Network request failed") || e.message?.includes("network")) {
        errorMsg = t('connection_error');
      }
      Alert.alert("Erreur", errorMsg);
    } finally {
      setDownloading(prev => {
        const next = { ...prev };
        delete next[doc.id];
        return next;
      });
    }
  };

  const deleteFile = async (fileName: string, title: string) => {
    Alert.alert(
      t('delete_hymnal') + " : " + title,
      t('delete_doc_warning'),
      [
        { text: t('cancel'), style: "cancel" },
        {
          text: t('keep_my_notes'),
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(FileSystem.documentDirectory + fileName);
              setLocalFiles(prev => prev.filter(f => f !== fileName));
            } catch (e) {
              console.error(e);
            }
          }
        },
        {
          text: t('delete_all'),
          style: "destructive",
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(FileSystem.documentDirectory + fileName);
              await AsyncStorage.removeItem(`pdf_bookmarks_${fileName}`);
              await AsyncStorage.removeItem(`pdf_notes_${fileName}`);
              setLocalFiles(prev => prev.filter(f => f !== fileName));
              Alert.alert("Succès", t('delete_doc_success'));
            } catch (e) {
              console.error(e);
              Alert.alert("Erreur", t('delete_doc_error'));
            }
          }
        }
      ]
    );
  };

  const openPdf = async (file: string, title: string) => {
    const isPdf = file.toLowerCase().endsWith('.pdf');
    const localPath = `${FileSystem.documentDirectory}${file}`;

    const finalUri = localPath;

    if (!isPdf) {
      const mimeType = getMimeType(file);
      try {
        if (Platform.OS === 'android') {
          const ReactNativeBlobUtil = require('react-native-blob-util').default;
          const cleanPath = finalUri.replace('file://', '');
          await ReactNativeBlobUtil.android.actionViewIntent(cleanPath, mimeType);
        } else {
          await Sharing.shareAsync(finalUri, { UTI: 'public.data', mimeType });
        }
      } catch (e) {
        console.error("Erreur d'ouverture externe:", e);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(finalUri, { mimeType });
        } else {
          alert("Ce format nécessite une application externe pour être ouvert.");
        }
      }
      return;
    }

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

      history = history.filter((h: any) => !(h.type === 'pdf' && h.params?.fileName === file));

      history.unshift(historyItem);
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

  const isDocVisible = (doc: any) => {
    if (userDepartments.includes("Pasteur") || userDepartments.includes("Ancien")) return true;
    if (!doc.tags || doc.tags.length === 0) return true;
    if (doc.tags.includes("Tous")) return true;
    return doc.tags.some((tag: string) => userDepartments.includes(tag));
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
              {selectedCategory ? selectedCategory.title : t('library')}
            </Text>
            <Text className="text-slate-400 text-sm mt-1">
              {selectedCategory ? `${manifest?.documents.filter((d: any) => d.categoryId === selectedCategory.id && localFiles.includes(d.fileName)).length} documents` : t('manage_study_resources')}
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
                    <Text className="text-xs font-bold text-white">{t('loading')}</Text>
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
                  <Text className="text-lg font-bold text-white">{t('recents')}</Text>
                  <TouchableOpacity onPress={() => { }}>
                    <Text className="text-blue-500 text-xs font-bold">{t('history')}</Text>
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
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">{t('my_folders')}</Text>
              <View className="gap-3">
                {manifest?.categories.map((cat: any) => {
                  const Icon = ICON_MAP[cat.icon] || FolderOpen;
                  const localDocs = manifest?.documents.filter((d: any) =>
                    d.categoryId === cat.id && localFiles.includes(d.fileName)
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
                  manifest?.documents.filter((d: any) => d.categoryId === cat.id && localFiles.includes(d.fileName)).length === 0) && (
                    <View className="items-center py-10 opacity-50">
                      <BookOpen size={48} color="#475569" className="mb-4" />
                      <Text className="text-slate-400 text-center font-medium">{t('empty_library')}</Text>
                      <Text className="text-slate-500 text-center text-xs mt-1">{t('explore_catalog')}</Text>
                    </View>
                  )}
              </View>
            </View>
          </>
        ) : (
          <View className="mt-4 pb-20">
            {manifest?.documents
              .filter((d: any) => d.categoryId === selectedCategory.id && localFiles.includes(d.fileName))
              .map((doc: any) => (
                <View key={doc.id} className="mb-3 bg-slate-900/40 border border-slate-800/50 rounded-2xl overflow-hidden shadow-sm">
                  <TouchableOpacity
                    onPress={() => openPdf(doc.fileName, doc.title)}
                    className="flex-row items-center p-4"
                  >
                    <View className="w-12 h-16 bg-slate-800 rounded-lg items-center justify-center mr-4 border border-slate-700/50">
                      <FileText size={24} color={selectedCategory.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-white text-base" numberOfLines={1}>{doc.title}</Text>
                      <Text className="text-xs text-slate-500">{doc.size} • {t('ready_to_read')}</Text>
                    </View>
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
              <Text className="text-xl font-bold text-white">{t('cloud_resources')}</Text>
              <Text className="text-xs text-slate-400">{t('online_library')}</Text>
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
              const cloudDocs = manifest?.documents.filter((d: any) => d.categoryId === cat.id && isDocVisible(d));
              if (cloudDocs.length === 0) return null;
              const isExpanded = !!expandedCategories[cat.id];

              return (
                <View key={cat.id} className="mb-4">
                  <TouchableOpacity
                    onPress={() => toggleCategory(cat.id)}
                    className="flex-row items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50 mb-2"
                  >
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-lg bg-slate-800 items-center justify-center mr-3">
                        <FolderOpen size={16} color={cat.color} />
                      </View>
                      <Text className="text-sm font-bold text-slate-300 uppercase tracking-widest">{cat.title}</Text>
                    </View>
                    <ChevronDown size={20} color="#475569" style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
                  </TouchableOpacity>

                  {isExpanded && cloudDocs.map((doc: any) => {
                    const isDownloaded = localFiles.includes(doc.fileName);
                    const isDownloading = downloading[doc.id] !== undefined;
                    return (
                      <View key={doc.id} className="mb-2 ml-4 bg-slate-950/50 border border-slate-900 rounded-2xl p-4 flex-row items-center">
                        <TouchableOpacity
                          onPress={() => openPdf(doc.fileName, doc.title)}
                          disabled={!isDownloaded}
                          className="flex-row items-center flex-1"
                        >
                          <View className="w-10 h-12 bg-slate-900 rounded items-center justify-center mr-4">
                            <FileText size={20} color={isDownloaded ? "#10b981" : "#475569"} />
                          </View>
                          <View className="flex-1">
                            <Text className="text-white font-bold text-xs" numberOfLines={1}>{doc.title}</Text>
                            <Text className="text-[10px] text-slate-500">{doc.size} • {isDownloaded ? t('on_device') : t('cloud')}</Text>
                          </View>
                        </TouchableOpacity>

                        <View className="flex-row items-center gap-2">
                          {isDownloading ? (
                            <View className="items-end">
                              <Text className="text-[10px] text-blue-500 font-bold mb-1">{Math.round(downloading[doc.id] * 100)}%</Text>
                              <ActivityIndicator size="small" color="#3b82f6" />
                            </View>
                          ) : isDownloaded ? (
                            <>
                              <TouchableOpacity
                                onPress={() => downloadFile(doc)}
                                className="w-9 h-9 rounded-xl bg-blue-600/10 items-center justify-center border border-blue-500/20"
                              >
                                <RefreshCw size={16} color="#3b82f6" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => deleteFile(doc.fileName, doc.title)}
                                className="w-9 h-9 rounded-xl bg-red-500/10 items-center justify-center border border-red-500/20"
                              >
                                <Trash2 size={16} color="#ef4444" />
                              </TouchableOpacity>
                              <View className="w-6 h-6 rounded-full bg-green-500/10 items-center justify-center">
                                <CheckCircle2 size={16} color="#10b981" />
                              </View>
                            </>
                          ) : (
                            <TouchableOpacity
                              onPress={() => downloadFile(doc)}
                              className="w-10 h-10 bg-blue-600 rounded-xl items-center justify-center shadow-lg"
                            >
                              <CloudDownload size={20} color="white" />
                            </TouchableOpacity>
                          )}
                        </View>
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
