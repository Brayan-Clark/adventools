import { BIBLE_REGEX, fetchVerseContent } from '@/lib/bible';
import { useSettings } from '@/lib/settings-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, BookOpen, Copy, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface VerseEntry {
  ref: string;
  text: string;
}

interface StudySection {
  category: string;
  verses: VerseEntry[];
}

const CATEGORIES_LIST = [
  "I - ASA FITORIANA (Prédication)",
  "II - FANAMBINANA (Prospérité / Bénédiction)",
  "III - FANDROSOANA (Progrès / Avancée)",
  "IV - FITSINGERENAN-TAONA (Cycle / Anniversaire)",
  "V - MPAMANGY (Visite / Compassion)"
];

const DEFAULT_STUDIES = [
  {
    category: "I - ASA FITORIANA (Prédication)",
    verses: [
      { ref: "Matio 24:14", text: "Ary hotononina amin'izao tontolo izao ity filazantsaran'ny fanjakana ity ho vavolombelona amin'ny firenena rehetra, dia vao ho tonga ny farany." },
      { ref: "Matio 28:19", text: "Koa mandehana ianareo, dia ataovy mpianatra ny firenena rehetra, manao batisa azy amin'ny anaran'ny Ray sy ny Zanaka ary ny Fanahy Masina." },
      { ref: "Romana 1:16", text: "Fa tsy menatra ny filazantsara aho; fa herin'Andriamanitra hamonjena izay rehetra mino izany, amin'ny Jiosy aloha, dia amin'ny Jentilisa koa." }
    ]
  },
  {
    category: "II - FANAMBINANA (Prospérité / Bénédiction)",
    verses: [
      { ref: "Asan'ny Apostoly 15:36", text: "Ary rehefa afaka andro vitsivitsy, dia hoy Paoly tamin'i Barnaba: Andao isika hiverina hamangy ny rahalahy any amin'ny tanàna rehetra izay nitoriantsika ny tenin'ny Tompo, hahitantsika izay toetry ny rainy." },
      { ref: "Asan'ny Apostoly 14:3", text: "Ary nitoetra ela teo ihany izy roa lahy ka niteny tamin'ny fahasahiana tao amin'ny Tompo, Izay nanambara ny tenin'ny fahasoavany ary nampanao famantarana sy fahagagana tamin'ny tanany." },
      { ref: "Deoteronomia 28:1-3", text: "Ary raha hihaino tsara ny feon'i Jehovah Andriamanitrao ianao ka hitandrina hanao ny didiny rehetra ... hateraka ho ambony ambonin'ny firenena rehetra ambonin'ny tany ianao." },
      { ref: "Fitomaniana 3:22-23", text: "Ny famindram-pon'i Jehovah no tsy nahalany laniana antsika, fa tsy mitsahatra ny fiantrany. Vaovao isa-maraina izany; lehibe ny fahatokianao." }
    ]
  },
  {
    category: "III - FANDROSOANA (Progrès / Avancée)",
    verses: [
      { ref: "1 Timoty 4:14-15", text: "Aza hotsiratsiraina ny fanomezam-pahasoasana izay ao anatinao ... Hevero tsara izany zavatra izany, dia hitoero, mba hita miharihary amin'ny olona rehetra ny fandrosoanao." },
      { ref: "Eksodosy 14:15", text: "Ary Jehovah niteny tamin'i Mosesy hoe: Nahoana no mitaraina amiko ianao? Lazao amin'ny Zanak'Isiraely mba handroso." }
    ]
  },
  {
    category: "IV - FITSINGERENAN-TAONA (Cycle / Anniversaire)",
    verses: [
      { ref: "Joba 1:4-5", text: "Ary ny zanany lahy nandeha ka nanao fanasana tao an-tranon'izy rehetra avy ... Ary raha vao tapitra ny andro nanaovany fanasana, dia naniraka Joba ka nanamasina azy." },
      { ref: "Ohabolana 10:27", text: "Ny fahatahorana an'i Jehovah no mampitombo andro; fa ny taonan'ny ratsy fanahy hofohezina." },
      { ref: "Jaona 3:36", text: "Izay mino ny Zanaka manana fiainana mandrakizay; fa izay tsy mino ny Zanaka dia tsy hahita fiainana, fa ny fahatezeran'Andriamanitra no mitoetra eo aminy." },
      { ref: "1 Korintiana 16:13", text: "Miambena, miorina tsara amin'ny finoana, mahazava lehilahy, mahereza." }
    ]
  },
  {
    category: "V - MPAMANGY (Visite / Compassion)",
    verses: [
      { ref: "Jakoba 1:27", text: "Izao no fivavahana madio sy tsy misy tsiny eo anatrehan'Andriamanitra Ray: ny mamangy ny kamboty sy ny mpitondratena amin'ny fahoriany, sy ny miaro ny tena tsy ho voaloto amin'izao tontolo izao." }
    ]
  }
];

export default function EtudeSerie() {
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  const [studies, setStudies] = useState<StudySection[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSectionIdx, setEditingSectionIdx] = useState<number | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [verseRef, setVerseRef] = useState("");
  const [verseText, setVerseText] = useState("");
  const [editingVerseIdx, setEditingVerseIdx] = useState<number | null>(null);

  useEffect(() => {
    loadStudies();
  }, []);

  const loadStudies = async () => {
    try {
      const saved = await AsyncStorage.getItem('utiles_etude_serie');
      if (saved) {
        setStudies(JSON.parse(saved));
      } else {
        setStudies(DEFAULT_STUDIES);
        await AsyncStorage.setItem('utiles_etude_serie', JSON.stringify(DEFAULT_STUDIES));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveStudies = async (updated: StudySection[]) => {
    try {
      setStudies(updated);
      await AsyncStorage.setItem('utiles_etude_serie', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenBible = async (ref: string) => {
    const matches = Array.from(ref.matchAll(BIBLE_REGEX));
    if (matches.length > 0) {
      const [match, book, chapter, verses] = matches[0];
      try {
        const res = await fetchVerseContent(globalSettings.bibleVersion, book, chapter, verses || "1");
        if (res && res.bookId) {
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
          Alert.alert("Erreur", "Verset introuvable.");
        }
      } catch (e) { console.error(e); }
    } else {
      router.push("/bible");
    }
  };

  const saveVerse = () => {
    if (!categoryName.trim() || !verseRef.trim()) return;

    let updated = [...studies];
    const newEntry = { ref: verseRef, text: verseText };

    // If we were editing a verse
    if (editingSectionIdx !== null && editingVerseIdx !== null) {
      const oldCategory = updated[editingSectionIdx].category;

      if (oldCategory === categoryName) {
        // Same category, just update the verse
        updated[editingSectionIdx].verses[editingVerseIdx] = newEntry;
      } else {
        // Category changed: remove from old, add to new/existing
        updated[editingSectionIdx].verses.splice(editingVerseIdx, 1);
        if (updated[editingSectionIdx].verses.length === 0) {
          updated.splice(editingSectionIdx, 1);
        }

        // Add to new category
        let targetIdx = updated.findIndex(s => s.category.trim().toLowerCase() === categoryName.trim().toLowerCase());
        if (targetIdx > -1) {
          updated[targetIdx].verses.push(newEntry);
        } else {
          updated.push({ category: categoryName, verses: [newEntry] });
        }
      }
    } else {
      // Adding new verse
      let targetIdx = updated.findIndex(s => s.category.trim().toLowerCase() === categoryName.trim().toLowerCase());
      if (targetIdx > -1) {
        updated[targetIdx].verses.push(newEntry);
      } else {
        updated.push({ category: categoryName, verses: [newEntry] });
      }
    }

    saveStudies(updated);
    setIsModalVisible(false);
    resetForm();
  };

  const handleEditVerse = (sIdx: number, vIdx: number) => {
    const v = studies[sIdx].verses[vIdx];
    setCategoryName(studies[sIdx].category);
    setVerseRef(v.ref);
    setVerseText(v.text);
    setEditingSectionIdx(sIdx);
    setEditingVerseIdx(vIdx);
    setIsModalVisible(true);
  };

  const deleteVerse = (sIdx: number, vIdx: number) => {
    Alert.alert("Supprimer", "Voulez-vous supprimer ce verset ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive", onPress: () => {
          const updated = [...studies];
          updated[sIdx].verses.splice(vIdx, 1);
          if (updated[sIdx].verses.length === 0) updated.splice(sIdx, 1);
          saveStudies(updated);
        }
      }
    ]);
  };

  const resetForm = () => {
    setCategoryName("");
    setVerseRef("");
    setVerseText("");
    setEditingSectionIdx(null);
    setEditingVerseIdx(null);
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copié", "Verset copié.");
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
          <Text className="text-xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>Série d'Études</Text>
          <Text className="text-slate-500 text-xs">Notes d'étude biblique</Text>
        </View>
        <TouchableOpacity onPress={() => setIsModalVisible(true)} className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center border border-blue-500/20">
          <Plus size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {studies.map((section, sIdx) => (
          <View key={sIdx} className="mb-10">
            <View className="flex-row items-center mb-6">
              <View className="w-1.5 h-6 bg-blue-500 rounded-full mr-3" />
              <Text className="text-blue-500 font-bold text-sm tracking-widest uppercase flex-1">{section.category}</Text>
            </View>

            {section.verses.map((v, vIdx) => (
              <View key={vIdx} className="bg-slate-900 rounded-[24px] border border-slate-800 p-6 mb-4 shadow-sm">
                <View className="flex-row justify-between items-start mb-4">
                  <TouchableOpacity
                    onPress={() => handleOpenBible(v.ref)}
                    className="flex-row items-center bg-blue-500/10 px-3 py-1 rounded-full"
                  >
                    <BookOpen size={12} color="#3b82f6" />
                    <Text className="text-blue-400 font-bold text-[10px] ml-1.5 uppercase tracking-tighter">{v.ref}</Text>
                  </TouchableOpacity>
                  <View className="flex-row gap-4">
                    <TouchableOpacity onPress={() => copyToClipboard(`${v.ref}: ${v.text}`)}>
                      <Copy size={16} color="#475569" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleEditVerse(sIdx, vIdx)}>
                      <Pencil size={16} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteVerse(sIdx, vIdx)}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text className="text-slate-300 leading-6 italic" style={{ fontFamily: 'Lexend_400Regular' }}>
                  "{v.text}"
                </Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Modal for adding/editing */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[40px] p-8 border-t border-white/10">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-xl font-bold text-white">{editingVerseIdx !== null ? "Modifier le Verset" : "Ajouter un Verset"}</Text>
              <TouchableOpacity onPress={() => { setIsModalVisible(false); resetForm(); }}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-500 text-[10px] font-bold uppercase mb-2">Catégorie (Sélect. ou Saisir)</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {CATEGORIES_LIST.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategoryName(cat)}
                  className={`px-3 py-2 rounded-xl border ${categoryName === cat ? 'bg-blue-500/20 border-blue-500' : 'bg-white/5 border-white/10'}`}
                >
                  <Text className={`text-[10px] ${categoryName === cat ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>
                    {cat.split(' (')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white mb-6"
              placeholder="Ou saisir une nouvelle catégorie..."
              placeholderTextColor="#475569"
              value={categoryName}
              onChangeText={setCategoryName}
            />

            <Text className="text-slate-500 text-[10px] font-bold uppercase mb-2">Référence</Text>
            <TextInput
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white mb-6"
              placeholder="Ex: Matio 24:14"
              placeholderTextColor="#475569"
              value={verseRef}
              onChangeText={setVerseRef}
            />

            <Text className="text-slate-500 text-[10px] font-bold uppercase mb-2">Texte (Facultatif)</Text>
            <TextInput
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white mb-8 min-h-[80px]"
              placeholder="Contenu du verset..."
              placeholderTextColor="#475569"
              multiline
              value={verseText}
              onChangeText={setVerseText}
            />

            <TouchableOpacity onPress={saveVerse} className="bg-blue-600 py-5 rounded-2xl items-center">
              <Text className="text-white font-bold text-lg">Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
