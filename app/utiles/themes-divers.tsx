import { BIBLE_REGEX, fetchVerseContent } from '@/lib/bible';
import { useSettings } from '@/lib/settings-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Edit2, Plus, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Theme {
  title: string;
  verses: string[];
}

const DEFAULT_THEMES = [
  {
    title: "VITSY NY VONJENA (Le petit nombre des sauvés)",
    verses: ["Deoteronomia 7:7", "Lioka 12:17"]
  },
  {
    title: "TENY OTA (Paroles pécheresses)",
    verses: ["Ohabolana 10:19"]
  },
  {
    title: "FITORIANA (Prédication / Proclamation)",
    verses: ["Romana 10:14"]
  },
  {
    title: "RAFADY (Atonement / Life in Blood)",
    verses: ["Levitikosy 17:11"]
  },
  {
    title: "FAHENDRENA (Sagesse)",
    verses: ["Deoteronomia 4:5-6"]
  },
  {
    title: "MAZOTO (Diligence / Zèle)",
    verses: ["Eksodosy 15:26", "Hebreo 10:36-39"]
  },
  {
    title: "FIHEMORANA (Apostasie / Recul)",
    verses: ["1 Petera 2:20-21"]
  },
  {
    title: "FINOANA (La Foi)",
    verses: ["1 Korintiana 15"]
  },
  {
    title: "LALANA (La Loi / Le Chemin)",
    verses: ["Romana 8:7-8"]
  },
  {
    title: "EZAKA (Effort / Travail)",
    verses: ["1 Korintiana 15:58"]
  },
  {
    title: "FO (Le Cœur)",
    verses: ["Ohabolana 10:19", "Ohabolana 4:23", "Jeremia 17:9"]
  },
  {
    title: "SABATA (Le Sabbat)",
    verses: [
      "Eksodosy 20:8-11", "Eksodosy 30:6", "Isaia 66:23",
      "Isaia 66:13-14", "Isaia 56:2, 5", "Matio 24:20",
      "Levitikosy 19:30", "Lioka 4:16", "Marka 15:42-43"
    ]
  },
  {
    title: "RAVAKA (Parures / Beauté)",
    verses: ["1 Petera 3:3-5", "1 Timoty 2:9-14", "Isaia 3:18-21"]
  },
  {
    title: "JALY (Souffrance / Épreuve)",
    verses: ["Zakaria 14:12"]
  },
  {
    title: "ANATRA (Conseil / Avertissement)",
    verses: ["Salamo 7:14", "Deoteronomia 8:6-7"]
  },
  {
    title: "FIHAVANANA (Paix / Réconciliation)",
    verses: ["Ohabolana 25:17"]
  },
  {
    title: "OZONA (Malédiction)",
    verses: ["Jeremia 43:10"]
  }
];

export default function ThemesDivers() {
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newThemeTitle, setNewThemeTitle] = useState("");
  const [newThemeVerses, setNewThemeVerses] = useState("");

  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    try {
      const saved = await AsyncStorage.getItem('utiles_themes_divers');
      if (saved) {
        setThemes(JSON.parse(saved));
      } else {
        setThemes(DEFAULT_THEMES);
        await AsyncStorage.setItem('utiles_themes_divers', JSON.stringify(DEFAULT_THEMES));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveThemes = async (updatedThemes: Theme[]) => {
    try {
      setThemes(updatedThemes);
      await AsyncStorage.setItem('utiles_themes_divers', JSON.stringify(updatedThemes));
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copié", "Référence copiée.");
  };

  const handleOpenBible = async (ref: string) => {
    // Parsing logic using BIBLE_REGEX from bible.ts
    const matches = Array.from(ref.matchAll(BIBLE_REGEX));
    if (matches.length > 0) {
      const [match, book, chapter, verses] = matches[0];
      try {
        const res = await fetchVerseContent(globalSettings.bibleVersion, book, chapter, verses || "1", true);
        if (res && res.text && res.bookId) {
          router.push({
            pathname: "/bible/reader",
            params: {
              bookId: String(res.bookId),
              bookName: res.bookName,
              chapter: String(chapter),
              verse: String((verses || "").split(/[-,]/)[0] || "1"),
              lang: globalSettings.bibleVersion,
              testament: res.bookId > 39 ? "2" : "1"
            }
          });
        } else {
          const bibleName = res?.bibleName || globalSettings.bibleVersion;
          Alert.alert("Tsy hita", `Tsy hita ao amin'ny Baiboly ${bibleName} ity andininy ity. (Verset introuvable)`);
          router.push("/bible");
        }
      } catch (e) {
        console.error(e);
        router.push("/bible");
      }
    } else {
      router.push("/bible");
    }
  };

  const handleAddOrEdit = () => {
    if (!newThemeTitle.trim()) return;

    const verseList = newThemeVerses.split(',').map(v => v.trim()).filter(v => v);
    const updatedThemes = [...themes];

    if (editingIndex !== null) {
      updatedThemes[editingIndex] = { title: newThemeTitle, verses: verseList };
    } else {
      updatedThemes.unshift({ title: newThemeTitle, verses: verseList });
    }

    saveThemes(updatedThemes);
    closeModal();
  };

  const deleteTheme = (index: number) => {
    Alert.alert("Supprimer", "Voulez-vous supprimer ce thème ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          const updated = themes.filter((_, i) => i !== index);
          saveThemes(updated);
        }
      }
    ]);
  };

  const openModal = (index: number | null = null) => {
    if (index !== null) {
      setEditingIndex(index);
      setNewThemeTitle(themes[index].title);
      setNewThemeVerses(themes[index].verses.join(', '));
    } else {
      setEditingIndex(null);
      setNewThemeTitle("");
      setNewThemeVerses("");
    }
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setNewThemeTitle("");
    setNewThemeVerses("");
    setEditingIndex(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-white/5">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10">
          <ArrowLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>Thèmes Divers</Text>
          <Text className="text-slate-500 text-xs">Notes et références</Text>
        </View>
        <TouchableOpacity onPress={() => openModal()} className="w-10 h-10 rounded-full bg-emerald-500/10 items-center justify-center border border-emerald-500/20">
          <Plus size={20} color="#10b981" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="pb-20">
          {themes.map((theme, idx) => (
            <View
              key={idx}
              className="bg-slate-900 rounded-[32px] border border-slate-800 p-6 mb-6 shadow-sm overflow-hidden"
            >
              <View className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500/50" />

              <View className="flex-row justify-between items-start mb-4">
                <Text className="text-emerald-500 font-bold text-[10px] uppercase tracking-[0.2em]">Thème Biblique</Text>
                <View className="flex-row gap-4">
                  <TouchableOpacity onPress={() => openModal(idx)}>
                    <Edit2 size={16} color="#475569" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteTheme(idx)}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text className="text-white font-bold text-lg mb-6 leading-tight" style={{ fontFamily: 'Lexend_600SemiBold' }}>
                {theme.title}
              </Text>

              <View className="flex-row flex-wrap gap-2">
                {theme.verses.map((v, vIdx) => (
                  <TouchableOpacity
                    key={vIdx}
                    onPress={() => handleOpenBible(v)}
                    onLongPress={() => copyToClipboard(v)}
                    className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl flex-row items-center"
                  >
                    <Text className="text-slate-300 text-xs font-medium">{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Modal Add/Edit */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[40px] p-8 border-t border-white/10 shadow-2xl">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-xl font-bold text-white">{editingIndex !== null ? "Modifier le Thème" : "Nouveau Thème"}</Text>
              <TouchableOpacity onPress={closeModal} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2 ml-1">Titre du Thème</Text>
            <TextInput
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white mb-6 text-lg"
              placeholder="Ex: LA FOI"
              placeholderTextColor="#475569"
              value={newThemeTitle}
              onChangeText={setNewThemeTitle}
            />

            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2 ml-1">Versets (séparés par une virgule)</Text>
            <TextInput
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white mb-8 text-base min-h-[100px]"
              multiline
              textAlignVertical="top"
              placeholder="Ex: Matio 24:14, Jaona 3:16"
              placeholderTextColor="#475569"
              value={newThemeVerses}
              onChangeText={setNewThemeVerses}
            />

            <TouchableOpacity
              onPress={handleAddOrEdit}
              className="bg-emerald-500 py-5 rounded-2xl items-center shadow-lg shadow-emerald-500/40"
            >
              <Text className="text-white font-bold text-lg">{editingIndex !== null ? "Sauvegarder" : "Ajouter"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View className="absolute bottom-6 self-center bg-slate-800/90 px-6 py-3 rounded-full border border-slate-700 backdrop-blur-md">
        <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest text-center">Appui court : Bible • Appui long : Copier</Text>
      </View>
    </SafeAreaView>
  );
}
