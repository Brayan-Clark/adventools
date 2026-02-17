import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Music as MusicIcon, Search as SearchIcon, ChevronRight as ChevronRightIcon, ArrowLeft, Hash, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { loadDatabase } from '@/lib/database';
import { StatusBar } from 'expo-status-bar';

export default function Hymnes() {
  const router = useRouter();
  const [hymns, setHymns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNumberPicker, setShowNumberPicker] = useState(false);
  const [hymnNumber, setHymnNumber] = useState("");

  useEffect(() => {
    async function fetchHymns() {
      try {
        const db = await loadDatabase('cantique.db', require('../../assets/databases/cantique.db'));
        let query = "SELECT id, c_num, c_title, c_categories FROM adventiste_cantique";
        let params: any[] = [];

        if (search) {
          query += " WHERE c_title LIKE ? OR c_num = ? OR c_content LIKE ?";
          params = [`%${search}%`, search, `%${search}%`];
        }

        query += " ORDER BY c_num ASC LIMIT 800";
        const result: any = await db.getAllAsync(query, params);
        setHymns(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(fetchHymns, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const goToHymnByNumber = async () => {
    const num = parseInt(hymnNumber);
    if (isNaN(num) || num < 1 || num > 800) return;

    try {
      const db = await loadDatabase('cantique.db', require('../../assets/databases/cantique.db'));
      const result: any = await db.getFirstAsync("SELECT id FROM adventiste_cantique WHERE c_num = ?", [num]);

      if (result) {
        setShowNumberPicker(false);
        setHymnNumber("");
        router.push(`/hymnes/${result.id}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />
      <View className="px-6 py-6 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 rounded-full bg-slate-900 items-center justify-center border border-slate-800">
            <ArrowLeft size={20} color="#94a3b8" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>Hymnes</Text>
        </View>
      </View>

      <View className="px-6 mb-8">
        <View className="relative flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-1 shadow-inner">
          <SearchIcon size={18} color="#64748b" />
          <TextInput
            placeholder="Numéro ou titre..."
            placeholderTextColor="#475569"
            className="flex-1 h-12 ml-3 text-white font-medium"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={hymns}
        keyExtractor={(item) => item.id.toString()}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        removeClippedSubviews={true}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View className="py-20">
              <ActivityIndicator color="#ec4899" />
            </View>
          ) : (
            <View className="py-20 items-center">
              <Text className="text-slate-500">Aucun cantique trouvé</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => router.push(`/hymnes/${item.id}`)}
            className={`flex-row items-center p-5 bg-slate-900/50 border-slate-800/50 mb-3 rounded-2xl border`}
          >
            <View className="w-12 h-12 rounded-2xl bg-pink-500/10 items-center justify-center mr-4">
              <Text className="text-pink-500 font-bold text-sm">{item.c_num}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-bold text-white text-base" style={{ fontFamily: 'Lexend_600SemiBold' }} numberOfLines={1}>{item.c_title}</Text>
              <Text className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{item.c_categories || "Louange"}</Text>
            </View>
            <ChevronRightIcon size={16} color="#475569" />
          </TouchableOpacity>
        )}
      />

      {/* Floating Number Search Button */}
      <TouchableOpacity
        onPress={() => setShowNumberPicker(true)}
        className="absolute bottom-8 right-8 w-16 h-16 rounded-full bg-pink-500 items-center justify-center shadow-2xl shadow-pink-500/40"
      >
        <Hash size={28} color="white" />
      </TouchableOpacity>

      {/* Number Picker Modal */}
      <Modal visible={showNumberPicker} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center px-8">
          <View className="bg-[#1a2233] rounded-3xl p-8 w-full max-w-sm border border-slate-700">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>Recherche rapide</Text>
              <TouchableOpacity onPress={() => { setShowNumberPicker(false); setHymnNumber(""); }} className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center">
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-400 text-sm mb-4">Entrez le numéro du cantique (1-800)</Text>

            <TextInput
              placeholder="Ex: 123"
              placeholderTextColor="#475569"
              className="bg-[#111621] border border-slate-800 rounded-2xl px-6 py-4 text-white text-2xl font-bold text-center mb-6"
              style={{ fontFamily: 'Lexend_700Bold' }}
              value={hymnNumber}
              onChangeText={setHymnNumber}
              keyboardType="number-pad"
              autoFocus
              onSubmitEditing={goToHymnByNumber}
            />

            <TouchableOpacity
              onPress={goToHymnByNumber}
              className="bg-pink-500 rounded-2xl py-4 items-center shadow-lg shadow-pink-500/30"
            >
              <Text className="text-white font-bold text-base">Aller au cantique</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
