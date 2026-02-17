import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, Play, Bookmark, Music, Hash, X } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { loadDatabase } from '@/lib/database';
import { StatusBar } from 'expo-status-bar';

export default function HymneDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [hymn, setHymn] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNumberPicker, setShowNumberPicker] = useState(false);
  const [hymnNumber, setHymnNumber] = useState("");

  useEffect(() => {
    async function fetchHymn() {
      try {
        const hymnId = Number(id);
        if (isNaN(hymnId)) return;

        const db = await loadDatabase('cantique.db', require('../../assets/databases/cantique.db'));
        const result = await db.getFirstAsync("SELECT * FROM adventiste_cantique WHERE id = ?", [hymnId]);
        setHymn(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchHymn();
  }, [id]);

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

  if (loading || !hymn) {
    return (
      <View className="flex-1 justify-center items-center bg-background-dark">
        <ActivityIndicator color="#ec4899" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />
      <View className="px-6 py-6 flex-row justify-between items-center border-b border-slate-800/50">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center">
          <ArrowLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-500">Cantique {hymn.c_num}</Text>
        </View>
        <TouchableOpacity className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center">
          <Share2 size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-8 pt-10" showsVerticalScrollIndicator={false}>
        <View className="items-center mb-12">
          <View className="w-20 h-20 rounded-[30px] bg-pink-500/10 items-center justify-center mb-8 border border-pink-500/20 shadow-2xl shadow-pink-500/20">
            <Music size={36} color="#ec4899" />
          </View>
          <Text className="text-3xl font-bold text-white text-center uppercase mb-3 leading-tight" style={{ fontFamily: 'Lexend_700Bold' }}>
            {hymn.c_title}
          </Text>
          <View className="flex-row items-center bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800">
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Tonalité: {hymn.c_key} • {hymn.c_categories || "Louange"}
            </Text>
          </View>
          <View className="h-1 w-12 bg-pink-500 rounded-full mt-10 shadow-lg shadow-pink-500/50" />
        </View>

        <View className="mb-32">
          <Text className="text-xl leading-[40px] text-center text-slate-300" style={{ fontFamily: 'Lexend_400Regular' }}>
            {hymn.c_content}
          </Text>

          {hymn.C_author && hymn.C_author !== "undefined" && (
            <View className="mt-16 items-center">
              <View className="h-[1px] w-20 bg-slate-800 mb-6" />
              <Text className="text-sm text-slate-500 italic font-medium">
                Auteur: {hymn.C_author}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Premium Floating Player Toolbar - Hidden for now as requested
      <View className="absolute bottom-10 self-center w-[85%] flex-row justify-between items-center bg-slate-900 p-3 rounded-[35px] shadow-2xl border border-slate-800">
        <TouchableOpacity className="w-14 h-14 rounded-full items-center justify-center bg-background-dark border border-slate-800">
          <Bookmark size={22} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity className="w-16 h-16 rounded-full bg-pink-500 items-center justify-center shadow-xl shadow-pink-500/40 transform scale-110">
          <Play size={28} color="white" fill="white" />
        </TouchableOpacity>

        <TouchableOpacity className="w-14 h-14 rounded-full items-center justify-center bg-background-dark border border-slate-800">
          <Share2 size={22} color="#94a3b8" />
        </TouchableOpacity>
      </View>
      */}

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
