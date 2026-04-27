import { loadDatabase } from '@/lib/database';
import { HYMNE_SOURCES } from '@/lib/hymnes';
import { useSettings } from '@/lib/settings-context';
import { getSetting, setSetting, saveHistory } from '@/lib/user-storage';
import { cn } from '@/lib/utils';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, ChevronRight, Edit3, Heart, Music, Save, Share2, X, Grid3X3 } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, KeyboardAvoidingView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function HymneDetail() {
  const router = useRouter();
  const { id, db: dbNameParam } = useLocalSearchParams();
  const dbName = (dbNameParam as string) || 'cantique.db';

  const [hymn, setHymn] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNumberPicker, setShowNumberPicker] = useState(false);
  const [hymnNumber, setHymnNumber] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const { settings: globalSettings } = useSettings();
  const [isFavorite, setIsFavorite] = useState(false);
  const [sameMelodyHymns, setSameMelodyHymns] = useState<any[]>([]);
  const [showMelodyModal, setShowMelodyModal] = useState(false);
  const [previewHymn, setPreviewHymn] = useState<any>(null);

  useEffect(() => {
    checkFavorite();
  }, [id, dbName]);

  useEffect(() => {
    if (hymnNumber.length > 0) {
      const timer = setTimeout(updatePreview, 300);
      return () => clearTimeout(timer);
    } else {
      setPreviewHymn(null);
    }
  }, [hymnNumber]);

  const updatePreview = async () => {
    try {
      const num = parseInt(hymnNumber);
      if (isNaN(num)) return;
      const db = await loadDatabase(dbName, HYMNE_SOURCES[dbName], 'hymnes', 2);
      const result: any = await db.getFirstAsync("SELECT id, c_title, c_num FROM adventiste_cantique WHERE c_num = ?", [num]);
      setPreviewHymn(result);
    } catch (e) {
      setPreviewHymn(null);
    }
  };

  const checkFavorite = async () => {
    try {
      const favorites = await getSetting<number[]>(`hymn_favorites_${dbName}`, []);
      setIsFavorite(favorites.includes(Number(id)));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = async () => {
    try {
      let favorites = await getSetting<number[]>(`hymn_favorites_${dbName}`, []);
      const hymnId = Number(id);

      if (favorites.includes(hymnId)) {
        favorites = favorites.filter((fid: number) => fid !== hymnId);
        setIsFavorite(false);
      } else {
        favorites.push(hymnId);
        setIsFavorite(true);
      }
      await setSetting(`hymn_favorites_${dbName}`, favorites);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    async function fetchHymn() {
      try {
        const hymnId = Number(id);
        if (isNaN(hymnId)) return;

        const db = await loadDatabase(dbName, HYMNE_SOURCES[dbName], 'hymnes', 2);
        const result: any = await db.getFirstAsync("SELECT * FROM adventiste_cantique WHERE id = ?", [hymnId]);

        if (result) {
          // Load edited content if exists
          const localEdit = await getSetting<string | null>(`hymne_edit_${dbName}_${hymnId}`, null);
          if (localEdit) {
            result.c_content = localEdit;
          }

          setHymn(result);
          setEditedContent(result.c_content);

          // Save to history
          try {
            await saveHistory({
              type: 'hymn',
              title: result.c_title || `Cantique ${result.c_num}`,
              subtitle: `${dbName.replace('.db', '').toUpperCase()} • Cantique ${result.c_num}`,
              timestamp: Date.now(),
              params: { id: hymnId, db: dbName }
            });
          } catch (e) {
            console.error("Failed to save hymn history", e);
          }

          // Fetch same melody hymns
          try {
            const sameMelodyRows: any[] = await db.getAllAsync(
              "SELECT m.Id_melodie as num, m.groupe, c.id, c.c_title as title FROM melodie m JOIN adventiste_cantique c ON m.Id_melodie = c.c_num WHERE m.Id_cant = ?",
              [result.c_num]
            );
            setSameMelodyHymns(sameMelodyRows);
          } catch (e) {
            console.error("Failed to fetch same melody hymns", e);
            setSameMelodyHymns([]);
          }
        }
      } catch (e) {
        console.error(e);
        Alert.alert("Erreur", "Base de données introuvable.");
        router.back();
      } finally {
        setLoading(false);
      }
    }
    fetchHymn();
  }, [id, dbName]);

  const goToHymnByNumber = async () => {
    let num = parseInt(hymnNumber);
    if (isNaN(num) || num < 1) return;

    try {
      const db = await loadDatabase(dbName, HYMNE_SOURCES[dbName], 'hymnes', 2);
      const result: any = await db.getFirstAsync("SELECT id FROM adventiste_cantique WHERE c_num = ?", [num]);

      if (result) {
        setShowNumberPicker(false);
        setHymnNumber("");
        router.replace({
          pathname: `/hymnes/[id]`,
          params: { id: result.id, db: dbName }
        });
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
          <Text className="text-[14px] font-black uppercase tracking-[0.1em] text-pink-500" style={{ fontFamily: 'Lexend_700Bold' }}>Cantique {hymn.c_num}</Text>
        </View>
        <View className="flex-row gap-2">
          {sameMelodyHymns.length > 0 && (
            <TouchableOpacity 
              onPress={() => setShowMelodyModal(true)}
              className="w-10 h-10 rounded-full bg-pink-500/10 border border-pink-500/30 items-center justify-center"
            >
              <Music size={18} color="#ec4899" />
            </TouchableOpacity>
          )}
          {sameMelodyHymns.length === 0 && <View className="w-10" />}
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40} className="flex-1">
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

          <View className="mb-48">
            {isEditing ? (
              <View className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                <TextInput
                  multiline
                  className="text-white text-lg leading-7"
                  style={{ fontFamily: 'Lexend_400Regular', minHeight: 300 }}
                  value={editedContent}
                  onChangeText={setEditedContent}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await setSetting(`hymne_edit_${dbName}_${id}`, editedContent);
                      setHymn({ ...hymn, c_content: editedContent });
                      setIsEditing(false);
                      Alert.alert("Succès", "Modification enregistrée avec succès.");
                    } catch (e) {
                      Alert.alert("Erreur", "Impossible d'enregistrer la modification.");
                    }
                  }}
                  className="mt-6 bg-green-600 py-4 rounded-2xl items-center flex-row justify-center"
                >
                  <Save size={20} color="white" className="mr-2" />
                  <Text className="text-white font-bold">Sauvegarder les corrections</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setEditedContent(hymn.c_content);
                    setIsEditing(false);
                  }}
                  className="mt-3 py-2 items-center"
                >
                  <Text className="text-slate-500 font-bold">Annuler</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text className="leading-[40px] text-center text-slate-300" style={{
                fontFamily: globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily,
                fontSize: globalSettings.fontSize + 2 // Base offset for hymns
              }}>
                {hymn.c_content}
              </Text>
            )}

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
      </KeyboardAvoidingView>

      {/* Premium Floating Toolbar */}
      <View className="absolute bottom-8 self-center w-[85%] flex-row justify-between items-center bg-slate-900/95 p-2 rounded-[30px] shadow-2xl border border-slate-800">
        <TouchableOpacity
          onPress={toggleFavorite}
          className={`w-12 h-12 rounded-full items-center justify-center border ${isFavorite ? 'bg-pink-500/10 border-pink-500/30' : 'bg-background-dark border-slate-800'}`}
        >
          <Heart size={20} color={isFavorite ? "#ec4899" : "#94a3b8"} fill={isFavorite ? "#ec4899" : "transparent"} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsEditing(true)}
          className="w-12 h-12 rounded-full items-center justify-center bg-background-dark border border-slate-800"
        >
          <Edit3 size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => {
            const textToCopy = `Cantique ${hymn.c_num}: ${hymn.c_title}\n\n${hymn.c_content}`;
            await Clipboard.setStringAsync(textToCopy);
            Alert.alert("Exporté", "Le chant a été copié dans le presse-papier pour intégration.");
          }}
          className="w-12 h-12 rounded-full items-center justify-center bg-background-dark border border-slate-800"
        >
          <Share2 size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowNumberPicker(true)}
          className="w-14 h-14 rounded-full bg-pink-500 items-center justify-center shadow-xl shadow-pink-500/40"
        >
          <MaterialCommunityIcons name="dialpad" size={28} color="white" />
        </TouchableOpacity>
      </View>


      {/* Premium Custom Keypad Modal */}
      <Modal visible={showNumberPicker} transparent animationType="slide" statusBarTranslucent={true}>
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => { setShowNumberPicker(false); setHymnNumber(""); }} />
          <View className="bg-[#1a2233] rounded-t-[40px] p-8 pb-12 border-t border-slate-700">
            <View className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-8" />
            
            <View className="items-center mb-8">
              <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Numéro du Cantique</Text>
              <View className="flex-row items-center justify-center min-h-[60px]">
                {hymnNumber.length === 0 ? (
                  <Text className="text-slate-700 text-5xl font-black italic">000</Text>
                ) : (
                  <Text className="text-white text-6xl font-black" style={{ fontFamily: 'Lexend_700Bold' }}>{hymnNumber}</Text>
                )}
              </View>
              
              {/* Preview Section */}
              <View className="mt-4 h-14 justify-center items-center px-4 w-full">
                {previewHymn ? (
                  <View className="bg-pink-500/5 border border-pink-500/10 px-5 py-2.5 rounded-2xl flex-row items-center max-w-[90%]">
                    <Music size={14} color="#ec4899" />
                    <Text className="text-pink-500 font-bold text-[13px] ml-3" numberOfLines={1}>{previewHymn.c_title}</Text>
                  </View>
                ) : hymnNumber.length > 0 ? (
                  <Text className="text-slate-600 text-[10px] uppercase font-bold tracking-widest">Aucun chant trouvé</Text>
                ) : null}
              </View>
            </View>

            {/* Custom Grid Keypad */}
            <View className="flex-row flex-wrap justify-between gap-y-4 mb-10">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'DEL', 0, 'GO'].map((key) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    if (key === 'DEL') {
                      setHymnNumber(prev => prev.slice(0, -1));
                    } else if (key === 'GO') {
                      goToHymnByNumber();
                    } else {
                      if (hymnNumber.length < 3) {
                        setHymnNumber(prev => prev + key);
                      }
                    }
                  }}
                  className={cn(
                    "w-[30%] h-20 rounded-[28px] items-center justify-center border",
                    key === 'GO' ? "bg-pink-500 border-pink-400 shadow-lg shadow-pink-500/30" : "bg-slate-900/40 border-slate-800/60"
                  )}
                >
                  {key === 'DEL' ? (
                    <X size={24} color="#64748b" />
                  ) : key === 'GO' ? (
                    <ChevronRight size={32} color="white" />
                  ) : (
                    <Text className="text-white text-3xl font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>{key}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              onPress={() => { setShowNumberPicker(false); setHymnNumber(""); }}
              className="py-2 items-center"
            >
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-widest">Annuler la recherche</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Same Melody Modal */}
      <Modal visible={showMelodyModal} transparent animationType="slide" statusBarTranslucent={true}>
        <View className="flex-1 bg-black/70 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => setShowMelodyModal(false)} />
          <View className="bg-[#1a2233] rounded-t-[40px] p-8 border-t border-slate-700 min-h-[40%]">
            <View className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-8" />
            
            <View className="flex-row items-center justify-center mb-8">
              <View className="w-10 h-10 rounded-full bg-pink-500/20 items-center justify-center mr-4">
                <Music size={20} color="#ec4899" />
              </View>
              <Text className="text-xl font-bold text-white uppercase tracking-widest" style={{ fontFamily: 'Lexend_700Bold' }}>Même Mélodie</Text>
            </View>

            <Text className="text-slate-400 text-center mb-8 px-6 text-xs leading-5">Ces cantiques partagent la même mélodie que le chant actuel.</Text>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
              {sameMelodyHymns.map((m, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setShowMelodyModal(false);
                    router.replace({ pathname: '/hymnes/[id]', params: { id: m.id, db: dbName } });
                  }}
                  className="flex-row items-center p-5 bg-[#111621] border border-slate-800 rounded-3xl mb-4"
                >
                  <View className="w-12 h-12 rounded-2xl bg-pink-500/10 items-center justify-center mr-4">
                    <Text className="text-pink-500 font-bold text-sm">{m.num}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm" numberOfLines={1}>{m.title}</Text>
                    {m.groupe && (
                      <View className="flex-row mt-1">
                        <View className="bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                          <Text className="text-blue-400 text-[8px] font-black uppercase">Groupe {m.groupe}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <ChevronRight size={16} color="#475569" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity 
              onPress={() => setShowMelodyModal(false)}
              className="bg-slate-800 py-4 rounded-2xl items-center mb-4"
            >
              <Text className="text-white font-bold">Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
