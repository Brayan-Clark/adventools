import { BIBLE_REGEX, fetchVerseContent } from '@/lib/bible';
import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, BookOpen, Copy, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
      { ref: "Matio 28:19-20", text: "19. koa mandehana ianareo, dia ataovy mpianatra ny firenena rehetra, manao batisa azy ho amin'ny anaran'ny Ray sy ny Zanaka ary ny Fanahy Masina. 20. sady mampianatra azy hitandrina izay rehetra nandidiako anareo; ary, indro, Izaho momba anareo mandrakariva ambara-pahatongan'ny fahataperan'izao tontolo izao." },
      { ref: "Marka 16:15", text: "Ary hoy Izy taminy: Mandehana any amin'izao tontolo izao ianareo, ka mitoria ny filazantsara amin'ny olombelona rehetra." },
      { ref: "Asan'ny Apostoly 1:8", text: "Fa hahazo hery ianareo amin'ny hilatsahan'ny Fanahy Masina aminareo, ary ho vavolombeloko any Jerosalema sy eran'i Jodia sy Samaria ary hatramin'ny faran'ny tany." },
      { ref: "Romana 10:14-15", text: "14. Hataony ahoana ary no fiantso izay tsy ninoany? Ary hataony ahoana no fino izay Olona tsy reny? Ary hataony ahoana no fandre raha tsy misy mpitory? 15. Ary hataony ahoana no fitory, raha tsy nirahina? araka ny voasoratra hoe: Akory ny hatsaran'ny tongotr'iry mitondra teny soa mahafaly!" },
      { ref: "2 Timoty 4:2", text: "mitoria ny teny, mazotoa, na amin'ny fotoana, na tsy amin'ny fotoana, mandrese lahatra, mamporisiha, mananara mafy amin'ny fahari-po sy ny fampianarana rehetra." },
      { ref: "Matio 24:14", text: "Ary hotononina amin'izao tontolo izao ity filazantsaran'ny fanjakana ity ho vavolombelona amin'ny firenena rehetra, dia vao ho tonga ny farany." },
      { ref: "Romana 1:16", text: "Fa tsy menatra ny filazantsara aho; fa herin'Andriamanitra hamonjena izay rehetra mino izany, amin'ny Jiosy aloha, dia amin'ny Jentilisa koa." }
    ]
  },
  {
    category: "II - FANAMBINANA (Prospérité / Bénédiction)",
    verses: [
      { ref: "Salamo 1:1-3", text: "1. Sambatra ny olona izay tsy mandeha eo amin'ny fisainan'ny ratsy fanahy, ary tsy mijanona eo amin'ny lalana falehan'ny mpanota, ary tsy mipetraka eo amin'ny fipetrahan'ny mpaniratsira; 2. Fa ny lalàn'i Jehovah no sitrany; eny ny lalàny no saintsaininy andro aman'alina. 3. Dia tahaka ny hazo ambolena eo amoron'ny rano velona izy, izay mamoa amin'ny fotoany, ny raviny koa tsy mba malazo; ary ny asany rehetra dia ataony lavorary avokoa." },
      { ref: "Ohabolana 10:22", text: "Ny fitahian'i Jehovah no mampanan-karena, Ary tsy azon'ny fisasarana ampiana izany." },
      { ref: "Salamo 128:1-2", text: "1. Sambatra izay rehetra matahotra an'i Jehovah, Dia izay mandeha amin'ny lalany. 2. Fa hohaninao tokoa ny asan'ny tananao; Sambatra sady ambinina ianao." },
      { ref: "3 Jaona 1:2", text: "Ry malala, mangataka aho mba hambinina sy ho salama amin'ny zavatra rehetra anie ianao, tahaka izay anambinana ny fanahinao ihany." },
      { ref: "Deoteronomia 28:2-6", text: "2. ary ho tonga aminao sy ho azonao izao fitahiana rehetra izao, raha mihaino ny feon'i Jehovah Andriamanitrao ianao 3. Hotahina ianao ao an-tanàna, ary hotahina ianao any an-tsaha. 4. Hotahina ny ateraky ny kibonao sy ny vokatry ny taninao ary ny ateraky ny biby fiompinao, dia ny ateraky ny ombinao sy ny ateraky ny ondry aman'osinao. 5. Hotahina ny haronao sy ny vilia fanaova-mofonao. 6. Hotahina ianao, raha miditra; ary hotahina ianao, raha mivoaka." },
      { ref: "Fitomaniana 3:22-23", text: "Ny famindram-pon'i Jehovah no tsy nahalany laniana antsika, fa tsy mitsahatra ny fiantrany. Vaovao isa-maraina izany; lehibe ny fahatokianao." },
      { ref: "Asan'ny Apostoly 15:36", text: "Ary rehefa afaka andro vitsivitsy, dia hoy Paoly tamin'i Barnaba: Andao isika hiverina hamangy ny rahalahy any amin'ny tanàna rehetra izay nitoriantsika ny tenin'ny Tompo, hahitantsika izay toetry ny rainy." },
      { ref: "Asan'ny Apostoly 14:3", text: "Ary nitoetra ela teo ihany izy roa lahy ka niteny tamin'ny fahasahiana tao amin'ny Tompo, Izay nanambara ny tenin'ny fahasoavany ary nampanao famantarana sy fahagagana tamin'ny tanany." }
    ]
  },
  {
    category: "III - FANDROSOANA (Progrès / Avancée)",
    verses: [
      { ref: "Josoa 1:8", text: "Aoka tsy hiala amin'ny vavanao ity bokin'ny lalàna ity, fa saintsaino andro aman'alina, hitandremanao hanao araka izay rehetra voasoratra eo; ary amin'izany dia hahalavorary ny lalanao ianao sady hambinina." },
      { ref: "Ohabolana 4:18", text: "Fa ny lalan'ny marina dia toy ny fipoak'andro maraina, Izay mihamazava mandra-pitataovovonan'ny andro." },
      { ref: "Salamo 37:5", text: "Ankino amin'i Jehovah ny lalanao, ary matokia Azy, fa hataony tanteraka." },
      { ref: "Ohabolana 16:3", text: "Ankino amin'i Jehovah ny asanao, Dia ho lavorary izay kasainao." },
      { ref: "1 Timoty 4:14-15", text: "Aza hotsiratsiraina ny fanomezam-pahasoasana izay ao anatinao ... Hevero tsara izany zavatra izany, dia hitoero, mba hita miharihary amin'ny olona rehetra ny fandrosoanao." },
      { ref: "Eksodosy 14:15", text: "Ary Jehovah niteny tamin'i Mosesy hoe: Nahoana no mitaraina amiko ianao? Lazao amin'ny Zanak'Isiraely mba handroso." }
    ]
  },
  {
    category: "IV - FITSINGERENAN-TAONA (Cycle / Anniversaire)",
    verses: [
      { ref: "Salamo 90:12", text: "Mampianara anay hanisa ny andronay, Hahazoanay fo hendry." },
      { ref: "Salamo 118:24", text: "Ity no andro nataon'i Jehovah; Hifaly sy ho ravoravo amin'izao isika." },
      { ref: "Mpitoriteny 3:1", text: "Ny zavatra rehetra samy manana ny fotoany avy, ary samy manana ny androny avy ny raharaha rehetra atỳ ambanin'ny lanitra:" },
      { ref: "Salamo 103:1-5", text: "1. Misaora an'i Jehovah, ry fanahiko; Ary izay rehetra ato anatiko, misaora ny anarany masina. 2. Misaora an'i Jehovah, ry fanahiko; Ary aza misy hadinoinao ny fitahiany rehetra, 3. Izay mamela ny helokao rehetra, Izay manasitrana ny aretinao rehetra, 4. Izay manavotra ny ainao tsy hidina any an-davaka, Izay manarona famindram-po sy fiantrana anao, 5. Izay mahavoky soa ny vavanao; Ny fahatanoranao mody indray toy ny an'ny voromahery." },
      { ref: "Joba 1:4-5", text: "Ary ny zanany lahy nandeha ka nanao fanasana tao an-tranon'izy rehetra avy ... Ary raha vao tapitra ny andro nanaovany fanasana, dia naniraka Joba ka nanamasina azy." },
      { ref: "Ohabolana 10:27", text: "Ny fahatahorana an'i Jehovah no mampitombo andro; fa ny taonan'ny ratsy fanahy hofohezina." },
      { ref: "Jaona 3:36", text: "Izay mino ny Zanaka manana fiainana mandrakizay; fa izay tsy mino ny Zanaka dia tsy hahita fiainana, fa ny fahatezeran'Andriamanitra no mitoetra eo aminy." },
      { ref: "1 Korintiana 16:13", text: "Miambena, miorina tsara amin'ny finoana, mahazava lehilahy, mahereza." }
    ]
  },
  {
    category: "V - MPAMANGY (Visite / Compassion)",
    verses: [
      { ref: "Hebreo 13:2", text: "Aza manadino ny fampiantranoam-bahiny; fa tamin'izany dia nampiantrano anjely ny sasany, nefa tsy fantany." },
      { ref: "Matio 25:35", text: "fa noana Aho, dia nomenareo hanina; nangetaheta Aho dia nampisotroinareo; nivahiny Aho, dia nampiantranoinareo;" },
      { ref: "Romana 12:13", text: "Miantrà ny olona masina araka izay ilainy; mazotoa mampiantrano vahiny." },
      { ref: "1 Petera 4:9", text: "Mifampiantranoa, ka aza mimonomonona." },
      { ref: "Jakoba 1:27", text: "Izao no fivavahana madio sy tsy misy tsiny eo anatrehan'Andriamanitra Ray: ny mamangy ny kamboty sy ny mpitondratena amin'ny fahoriany, sy ny miaro ny tena tsy ho voaloto amin'izao tontolo izao." }
    ]
  }
];

export default function EtudeSerie() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  const [studies, setStudies] = useState<StudySection[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSectionIdx, setEditingSectionIdx] = useState<number | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [verseRef, setVerseRef] = useState("");
  const [verseText, setVerseText] = useState("");
  const [editingVerseIdx, setEditingVerseIdx] = useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    loadStudies();
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const loadStudies = async () => {
    try {
      const saved = await AsyncStorage.getItem('utiles_etude_serie');
      if (saved) {
        let parsedSaved: StudySection[] = JSON.parse(saved);
        let hasChanges = false;

        // Merge DEFAULT_STUDIES into saved studies
        DEFAULT_STUDIES.forEach(defaultSection => {
          const savedSectionIdx = parsedSaved.findIndex(s => s.category === defaultSection.category);
          
          if (savedSectionIdx === -1) {
            // Category doesn't exist at all, add it completely
            parsedSaved.push(defaultSection);
            hasChanges = true;
          } else {
            // Category exists, check for missing verses
            const savedSection = parsedSaved[savedSectionIdx];
            defaultSection.verses.forEach(defaultVerse => {
              const verseExists = savedSection.verses.some(v => v.ref === defaultVerse.ref);
              if (!verseExists) {
                savedSection.verses.push(defaultVerse);
                hasChanges = true;
              }
            });
          }
        });

        setStudies(parsedSaved);
        if (hasChanges) {
          await AsyncStorage.setItem('utiles_etude_serie', JSON.stringify(parsedSaved));
        }
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
          Alert.alert(t('verse_not_found'), `${t('no_verse_found')} ${ref} ${t('not_found_in_bible')} (${bibleName})`);
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
    Alert.alert(t('delete'), t('delete_note_confirm'), [
      { text: t('cancel'), style: "cancel" },
      {
        text: t('delete'), style: "destructive", onPress: () => {
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
    Alert.alert(t('copy'), t('verse_copied'));
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
          <Text className="text-xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>{t('study_series')}</Text>
          <Text className="text-slate-500 text-xs">{t('bible_study_notes')}</Text>
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
      <Modal visible={isModalVisible} animationType="slide" transparent statusBarTranslucent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-slate-900 rounded-t-[40px] p-8 pb-12 border-t border-white/10 shadow-2xl">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-xl font-bold text-white">{editingVerseIdx !== null ? t('edit_verse') : t('add_verse')}</Text>
              <TouchableOpacity onPress={() => { setIsModalVisible(false); resetForm(); }}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
              <Text className="text-slate-500 text-[10px] font-bold uppercase mb-2">{t('category_selection')}</Text>
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
                placeholder={t('new_category_placeholder')}
                placeholderTextColor="#475569"
                value={categoryName}
                onChangeText={setCategoryName}
              />

              <Text className="text-slate-500 text-[10px] font-bold uppercase mb-2">{t('ref_copied')}</Text>
              <TextInput
                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white mb-6"
                placeholder={t('verse_ref_placeholder')}
                placeholderTextColor="#475569"
                value={verseRef}
                onChangeText={setVerseRef}
              />

              <Text className="text-slate-500 text-[10px] font-bold uppercase mb-2">{t('verse_text_placeholder')}</Text>
              <TextInput
                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white mb-8 min-h-[80px]"
                placeholder={t('verse_text_placeholder')}
                placeholderTextColor="#475569"
                multiline
                value={verseText}
                onChangeText={setVerseText}
              />

              <TouchableOpacity onPress={saveVerse} className="bg-blue-600 py-5 rounded-2xl items-center mb-10">
                <Text className="text-white font-bold text-lg">{t('save')}</Text>
              </TouchableOpacity>
              <View style={{ height: keyboardHeight / (Platform.OS === 'android' ? 1.5 : 1) }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
