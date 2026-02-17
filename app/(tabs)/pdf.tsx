import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, FolderOpen, BookOpen, Clock, FileText, ChevronRight, Plus, Download, X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const RECENT_FILES = [
  { id: 1, title: "Hymnes et Farantsa Masina", date: "Ouvert il y a 2h", type: "PDF", cover: require('@/assets/images/adaptive-icon.png') }, // Placeholder cover
  { id: 2, title: "Ilay Fitiavana Mandresy", date: "Ouvert hier", type: "PDF", cover: require('@/assets/images/icon.png') },
  { id: 3, title: "Plan de lecture 2026", date: "Ouvert mar. 14", type: "PDF", cover: null },
];

const FOLDERS = [
  { id: 1, title: "Études Bibliques", info: "5 fichiers • 120 Mo", icon: BookOpen, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
  { id: 2, title: "Théologie Systématique", info: "3 fichiers • 450 Mo", icon: FileText, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
  { id: 3, title: "Historique de l'Église", info: "8 fichiers • 85 Mo", icon: Clock, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
  { id: 4, title: "Anciens Documents", info: "24 fichiers • 32 Mo", icon: FolderOpen, color: "#64748b", bg: "rgba(100, 116, 139, 0.1)" },
];

const documents = [
  { id: 1, title: "Hymnes et Farantsa Masina (HFM)", file: "HFM.pdf", size: "432 KB" },
  { id: 2, title: "Ilay Fitiavana Mandresy (IFM)", file: "IFM.pdf", size: "3.1 MB" },
];

export default function PDFLibrary() {
  const [search, setSearch] = useState("");
  const router = useRouter();

  const openPdf = (file: string, title: string) => {
    router.push({
      pathname: '/pdf/viewer',
      params: { fileName: file, title: title }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>Bibliothèque</Text>
          <Text className="text-slate-400 text-sm mt-1">Gérez vos ressources d'étude</Text>
        </View>
        <TouchableOpacity className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center border border-slate-700">
          <Search size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>

        {/* Import Progress Card (Animated Simulation) */}
        <View className="mb-8 w-full bg-slate-800/80 border border-slate-700/50 rounded-2xl p-4 shadow-lg">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-blue-500/20 items-center justify-center">
                <Download size={20} color="#3b82f6" />
              </View>
              <View>
                <Text className="text-sm font-bold text-white">Importation en cours...</Text>
                <Text className="text-xs text-slate-400">Commentaire_Romains_Vol1.pdf</Text>
              </View>
            </View>
            <TouchableOpacity>
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View className="w-full bg-slate-700 rounded-full h-1.5 mb-2 overflow-hidden">
            <View className="bg-blue-500 h-1.5 rounded-full w-[45%]" />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[10px] text-slate-400 font-medium">1.2 MB / 4.5 MB</Text>
            <Text className="text-[10px] text-slate-400 font-medium">45%</Text>
          </View>
        </View>

        {/* Recent Files */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-white">Récents</Text>
            <TouchableOpacity><Text className="text-blue-500 text-xs font-bold">Tout voir</Text></TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
            {RECENT_FILES.map((file, index) => (
              <TouchableOpacity
                key={file.id}
                className="mr-4 w-32"
                onPress={() => index < 2 ? openPdf(documents[index].file, documents[index].title) : null}
              >
                <View className="aspect-[3/4] rounded-xl bg-slate-800 border border-slate-700/50 mb-2 overflow-hidden relative shadow-md">
                  {file.cover ? (
                    <Image source={file.cover} className="w-full h-full opacity-80" resizeMode="cover" />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <FileText size={32} color="#64748b" />
                    </View>
                  )}
                  <View className="absolute inset-0 bg-black/20" />
                  <View className="absolute bottom-2 left-2 bg-blue-600 px-1.5 py-0.5 rounded">
                    <Text className="text-[9px] font-bold text-white">PDF</Text>
                  </View>
                </View>
                <Text className="text-slate-200 text-xs font-bold truncate" numberOfLines={1}>{file.title}</Text>
                <Text className="text-slate-500 text-[10px]">{file.date}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Folders List */}
        <View className="mb-24">
          <Text className="text-lg font-bold text-white mb-4">Dossiers</Text>
          <View className="gap-3">
            {FOLDERS.map((folder) => (
              <TouchableOpacity key={folder.id} className="flex-row items-center w-full p-3 bg-slate-800/40 border border-slate-800/50 rounded-2xl active:bg-slate-800 transition-colors">
                <View className="w-12 h-12 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: folder.bg }}>
                  <folder.icon size={22} color={folder.color} />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-white text-base">{folder.title}</Text>
                  <Text className="text-xs text-slate-500">{folder.info}</Text>
                </View>
                <ChevronRight size={20} color="#64748b" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-8 right-6 w-14 h-14 rounded-full bg-blue-600 items-center justify-center shadow-lg shadow-blue-600/30 border border-white/10"
        onPress={() => { }}
      >
        <Plus size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
