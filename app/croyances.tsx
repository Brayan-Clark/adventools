import { BIBLE_REGEX, fetchVerseContent, getAvailableBibles } from '@/lib/bible';
import { useSettings } from '@/lib/settings-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, Quote, Sparkles, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, LayoutAnimation, Modal, Platform, ScrollView, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BELIEFS_FR = [
  {
    id: 1,
    title: "Les Saintes Écritures",
    description: "L'Ancien et le Nouveau Testament sont la Parole de Dieu écrite, inspirée divinement. Elles sont la révélation infaillible de la volonté de Dieu, la norme du caractère, le critère de l'expérience et le fondement souverain des doctrines.",
    verses: ["2 Timothée 3:16,17", "2 Pierre 1:20,21", "Psaumes 119:105", "Jean 17:17"]
  },
  {
    id: 2,
    title: "La Trinité",
    description: "Il y a un seul Dieu, composé de trois personnes coéternelles : le Père, le Fils et le Saint-Esprit. Dieu est immortel, omnipotent, omniscient, souverain et omniprésent.",
    verses: ["Genèse 1:26", "Matthieu 28:19", "2 Corinthiens 13:14", "Éphésiens 4:4-6"]
  },
  {
    id: 3,
    title: "Le Père",
    description: "Dieu le Père éternel est le Créateur, la source, le soutien et le souverain de toute la création. Il est juste, saint, miséricordieux et compatissant.",
    verses: ["Genèse 1:1", "Deutéronome 4:35", "Jean 14:9"]
  },
  {
    id: 4,
    title: "Le Fils",
    description: "Dieu le Fils éternel s'est incarné en Jésus-Christ. C'est par Lui que tout a été créé, que le caractère de Dieu est révélé, que s'accomplit le salut de l'humanité et que le monde est jugé.",
    verses: ["Jean 1:1-3", "Colossiens 1:15-19", "Romains 6:23", "Philippiens 2:5-11"]
  },
  {
    id: 5,
    title: "Le Saint-Esprit",
    description: "Dieu, l'Esprit éternel, a participé activement à la création, à l'incarnation et à la rédemption. Il a inspiré les écrivains de la Bible, a rempli la vie du Christ de puissance, et régénère et transforme ceux qui répondent favorablement à l'image de Dieu.",
    verses: ["Genèse 1:1,2", "Luc 1:35", "Actes 1:8", "Jean 14:16-18,26"]
  },
  {
    id: 6,
    title: "La Création",
    description: "Dieu a créé toutes choses en six jours et s'est reposé le septième jour. L'homme et la femme ont été créés à l'image de Dieu.",
    verses: ["Genèse 1:1-31", "Exode 20:8-11"]
  },
  {
    id: 7,
    title: "La Nature de l'Homme",
    description: "L'homme et la femme ont été créés à l'image de Dieu avec individualité, capacité de penser et de faire. Bien que créés libres, ils sont mortels, soumis à la mort.",
    verses: ["Genèse 1:26-28", "Psaumes 8:4-8", "Romains 5:12"]
  },
  {
    id: 8,
    title: "Le Grand Conflit",
    description: "Toute l'humanité est impliquée dans un grand conflit entre le Christ et Satan concernant le caractère de Dieu, sa loi et sa souveraineté sur l'univers.",
    verses: ["Genèse 3:15", "Ésaïe 14:12-14", "Apocalypse 12:4-9"]
  },
  {
    id: 9,
    title: "La Vie, la Mort et la Résurrection du Christ",
    description: "La vie sans péché, la mort expiatoire et la résurrection du Christ constituent l'unique provision pour le salut humain.",
    verses: ["Romains 5:8-10", "1 Corinthiens 15:3,4", "Jean 3:16"]
  },
  {
    id: 10,
    title: "L'Expérience du Salut",
    description: "Dans son amour infini, Dieu a fait de Christ, qui n'a pas connu le péché, péché pour nous, afin que nous devenions en Lui justice de Dieu.",
    verses: ["Jean 3:16", "Éphésiens 2:8-10", "Romains 10:17"]
  },
  {
    id: 11,
    title: "Croître en Christ",
    description: "Par sa mort sur la croix, Jésus a triomphé des forces du mal. Sa puissance régénératrice nous permet de vivre une vie sainte.",
    verses: ["Psaumes 1:1,2", "Romains 8:3,4", "Colossiens 2:14,15"]
  },
  {
    id: 12,
    title: "L'Église",
    description: "L'Église est la communauté des croyants qui reconnaissent Jésus-Christ comme Seigneur et Sauveur.",
    verses: ["Matthieu 16:13-20", "Éphésiens 1:22,23", "1 Pierre 2:9"]
  },
  {
    id: 13,
    title: "Le Reste et sa Mission",
    description: "Un reste est appelé à garder les commandements de Dieu et la foi en Jésus, proclamant que l'heure du jugement est venue et annonçant la proximité de la seconde venue du Christ.",
    verses: ["Apocalypse 12:17", "Apocalypse 14:6-12"]
  },
  {
    id: 14,
    title: "L'Unité du Corps du Christ",
    description: "L'Église est un seul corps avec plusieurs membres, appelés de toute nation, race, langue et peuple.",
    verses: ["Psaumes 133:1", "Romains 12:4,5", "Éphésiens 4:1-6"]
  },
  {
    id: 15,
    title: "Le Baptême",
    description: "Par le baptême par immersion, nous confessons notre foi en la mort et la résurrection de Jésus-Christ et témoignons de notre mort au péché et de notre décision de mener une vie nouvelle.",
    verses: ["Romains 6:1-6", "Colossiens 2:12,13", "Actes 2:38"]
  },
  {
    id: 16,
    title: "La Sainte Cène",
    description: "La Sainte Cène est une participation aux emblèmes du corps et du sang de Jésus comme expression de foi en Lui.",
    verses: ["1 Corinthiens 10:16,17", "Matthieu 26:26-29"]
  },
  {
    id: 17,
    title: "Les Dons Spirituels et les Ministères",
    description: "Dieu accorde à tous les membres de son Église à toutes les époques des dons spirituels.",
    verses: ["Romains 12:4-8", "1 Corinthiens 12:1-11", "Éphésiens 4:8,11-16"]
  },
  {
    id: 18,
    title: "Le Don de Prophétie",
    description: "Le don de prophétie est l'une des marques distinctives de l'Église du reste et s'est manifesté dans le ministère d'Ellen G. White.",
    verses: ["Joël 2:28,29", "Actes 2:14-21", "Apocalypse 12:17", "Apocalypse 19:10"]
  },
  {
    id: 19,
    title: "La Loi de Dieu",
    description: "Les grands principes de la loi de Dieu sont incorporés dans les dix commandements et illustrés dans la vie du Christ.",
    verses: ["Exode 20:1-17", "Psaumes 19:7-14", "Matthieu 5:17-20", "Romains 8:3,4"]
  },
  {
    id: 20,
    title: "Le Sabbat",
    description: "Le Créateur miséricordieux s'est reposé le septième jour et l'a institué comme mémorial de la création pour toute l'humanité. Il est un jour de repos, de culte et de service.",
    verses: ["Genèse 2:1-3", "Exode 20:8-11", "Ézéchiel 20:12,20", "Luc 4:16"]
  },
  {
    id: 21,
    title: "La Gestion Chrétienne de la Vie",
    description: "Nous sommes les économes de Dieu, et il nous a confié le temps, les occasions, les aptitudes, les possessions, les biens de la terre et les ressources du sol.",
    verses: ["1 Chroniques 29:14", "Matthieu 25:14-29", "2 Corinthiens 9:6-9"]
  },
  {
    id: 22,
    title: "La Conduite Chrétienne",
    description: "Nous sommes appelés à être un peuple pieux qui pense, ressent et agit en harmonie avec les principes du ciel.",
    verses: ["Romains 12:1,2", "1 Corinthiens 10:31", "2 Corinthiens 7:1"]
  },
  {
    id: 23,
    title: "Le Mariage et la Famille",
    description: "Le mariage a été divinement institué en Éden et confirmé par Jésus comme une union à vie entre un homme et une femme.",
    verses: ["Genèse 2:18-25", "Matthieu 19:4-6", "Éphésiens 5:21-33"]
  },
  {
    id: 24,
    title: "Le Ministère du Christ dans le Sanctuaire Céleste",
    description: "Il y a un sanctuaire dans le ciel, le véritable tabernacle que le Seigneur a dressé et non un homme.",
    verses: ["Hébreux 8:1,2", "Daniel 7:9,10", "Apocalypse 14:6,7"]
  },
  {
    id: 25,
    title: "La Seconde Venue du Christ",
    description: "La seconde venue du Christ est l'espérance bénie de l'Église, le grand point culminant de l'Évangile.",
    verses: ["Jean 14:1-3", "Actes 1:9-11", "1 Thessaloniciens 4:16,17"]
  },
  {
    id: 26,
    title: "La Mort et la Résurrection",
    description: "La rétribution du péché est la mort. Mais Dieu, qui seul est immortel, accordera la vie éternelle à ses rachetés.",
    verses: ["Romains 6:23", "Jean 5:28,29", "1 Thessaloniciens 4:13-17"]
  },
  {
    id: 27,
    title: "Le Millénium et la Fin du Péché",
    description: "Le millénium est le règne de mille ans du Christ avec ses saints dans le ciel entre la première et la seconde résurrection.",
    verses: ["Apocalypse 20:1-10", "1 Corinthiens 6:2,3"]
  },
  {
    id: 28,
    title: "La Nouvelle Terre",
    description: "Dans la nouvelle Terre, où la justice habitera, Dieu fournira un foyer éternel pour les rachetés et un environnement parfait pour la vie éternelle, l'amour, la joie et l'apprentissage en Sa présence.",
    verses: ["Ésaïe 65:17-25", "2 Pierre 3:13", "Apocalypse 21:1-7"]
  }
];

const BELIEFS_MG = [
  {
    id: 1,
    title: "Ny Soratra Masina",
    description: "Ny Testamenta Taloha sy ny Testamenta Vaovao no Tenin'Andriamanitra voasoratra, nampitain'ny herin'ny Fanahy Masina. Izy no fanambarana tsy mety diso ny sitrapony, fanevan'ny toetra, fizahan-toetra ny fanandramana, ary fototra iorenan'ny fampianarana.",
    verses: ["2 Timoty 3:16,17", "2 Petera 1:20,21", "Salamo 119:105", "Jaona 17:17"]
  },
  {
    id: 2,
    title: "Ny Andriamanitra Telo Izay Iray",
    description: "Andriamanitra iray ihany no misy, nefa persona telo miara-maharitra mandrakizay: ny Ray, ny Zanaka ary ny Fanahy Masina. Andriamanitra tsy mety maty Izy, tsitoha, mahalala ny zavatra rehetra, ary manjaka amin'izao tontolo izao.",
    verses: ["Genesisy 1:26", "Matio 28:19", "2 Korintiana 13:13", "Efesiana 4:4-6"]
  },
  {
    id: 3,
    title: "Ny Ray",
    description: "Andriamanitra Ray mandrakizay no Mpamorona, Loharano, Mpamelona ary Mpitantana ny zavaboary rehetra. Marina sy masina Izy, ary be famindram-po sy be fitiavana.",
    verses: ["Genesisy 1:1", "Deoteronomia 4:35", "Jaona 14:9"]
  },
  {
    id: 4,
    title: "Ny Zanaka",
    description: "Andriamanitra Zanaka mandrakizay dia tonga olona tao amin'i Jesosy Kristy. Amin'ny alalany no namoronana ny zavatra rehetra, sy nanehoana ny toetran'Andriamanitra, ary nanatantterahana ny famonjena.",
    verses: ["Jaona 1:1-3", "Kolosiana 1:15-19", "Romana 6:23", "Filipiana 2:5-11"]
  },
  {
    id: 5,
    title: "Ny Fanahy Masina",
    description: "Andriamanitra Fanahy mandrakizay dia nandray anjara mavitrika tamin'ny famoronana sy ny fanavotana. Izy no nanome ny heriny ny mpanoratra ny Baiboly sy nanome hery ny fiainan'i Kristy.",
    verses: ["Genesisy 1:1,2", "Lioka 1:35", "Asa 1:8", "Jaona 14:16-18,26"]
  },
  {
    id: 6,
    title: "Ny Famoronana",
    description: "Andriamanitra no namorona ny zavatra rehetra tao anatin'ny enina andro, ary nitsahatra tamin'ny andro fahafito Izy. Ny lehilahy sy ny vehivavy dia natao araka ny endrik'Andriamanitra.",
    verses: ["Genesisy 1:1-31", "Eksodosy 20:8-11"]
  },
  {
    id: 7,
    title: "Ny Toetry ny Olombelona",
    description: "Ny lehilahy sy ny vehivavy dia natao araka ny endrik'Andriamanitra. Na dia natao malalaka aza izy ireo, dia mety maty ary iharan'ny fahafatesana noho ny ota.",
    verses: ["Genesisy 1:26-28", "Salamo 8:4-8", "Romana 5:12"]
  },
  {
    id: 8,
    title: "Ny Ady Lehibe",
    description: "Ny olombelona rehetra dia tafiditra ao anatin'ny ady lehibe eo amin'i Kristy sy i Satana, mahakasika ny toetran'Andriamanitra sy ny lalàny.",
    verses: ["Genesisy 3:15", "Isaia 14:12-14", "Apokalypsy 12:4-9"]
  },
  {
    id: 9,
    title: "Ny Fiainana sy Fitsanganan'i Kristy",
    description: "Ny fiainany tsy nisy ota, ny fahafatesany teo amin'ny hazo fijaliana ary ny fitsanganany tamin'ny maty no hany fitaovana tokana hahazoana famonjena.",
    verses: ["Romana 5:8-10", "1 Korintiana 15:3,4", "Jaona 3:16"]
  },
  {
    id: 10,
    title: "Ny Fanandramana ny Famonjena",
    description: "Noho ny fitiavany tsy hita ritra, Andriamanitra dia nanao an'i Kristy, Ilay tsy nisy ota, ho ota ho antsika, mba ho tonga fahamarinan'Andriamanitra ao Aminy isika.",
    verses: ["Jaona 3:16", "Efesiana 2:8-10", "Romana 10:17"]
  },
  {
    id: 11,
    title: "Ny Fitomboana ao amin'i Kristy",
    description: "Tamin'ny fahafatesany teo amin'ny hazo fijaliana, Jesosy dia nandresy ny herin'ny maizina. Ny heriny no mampianatra antsika hiaina amin'ny fahamasinana.",
    verses: ["Salamo 1:1,2", "Romana 8:3,4", "Kolosiana 2:14,15"]
  },
  {
    id: 12,
    title: "Ny Fiangonana",
    description: "Ny Fiangonana dia ny fikambanan'ny mpino izay manaiky an'i Jesosy Kristy ho Tompo sy Mpamonjy.",
    verses: ["Matio 16:13-20", "Efesiana 1:22,23", "1 Petera 2:9"]
  },
  {
    id: 13,
    title: "Ny Sisa sy ny Iraka nampanaovina azy",
    description: "Misy sisa nantsoina hitandrina ny didin'Andriamanitra sy ny finoana an'i Jesosy, bo mitory fa tonga ny amin'ny fitsarana.",
    verses: ["Apokalypsy 12:17", "Apokalypsy 14:6-12"]
  },
  {
    id: 14,
    title: "Ny Firaisan'ny Tenan'i Kristy",
    description: "Ny Fiangonana dia tena iray ihany nefa maro rantsana, nantsoina avy tamin'ny firenena sy samy hafa fiteny rehetra.",
    verses: ["Salamo 133:1", "Romana 12:4,5", "Efesiana 4:1-6"]
  },
  {
    id: 15,
    title: "Ny Batisa",
    description: "Amin'ny alalan'ny batisa (fidirana anaty rano), no anehoantsika ny finoantsika ny fahafatesana sy ny fitsanganan'i Jesosy Kristy.",
    verses: ["Romana 6:1-6", "Kolosiana 2:12,13", "Asa 2:38"]
  },
  {
    id: 16,
    title: "Ny Fanasan'ny Tompo",
    description: "Ny Fanasan'ny Tompo dia fandraisana anjara amin'ny mariky ny tenan'i Jesosy sy ny rany ho fanehoana ny finoana Azy.",
    verses: ["1 Korintiana 10:16,17", "Matio 26:26-29"]
  },
  {
    id: 17,
    title: "Ny Fanomezam-pahasoavana",
    description: "Andriamanitra dia manome fanomezam-pahasoavana ara-panahy ho an'ny mpino rehetra ho fampandrosoana ny fiangonana.",
    verses: ["Romana 12:4-8", "1 Korintiana 12:1-11", "Efesiana 4:8,11-16"]
  },
  {
    id: 18,
    title: "Ny Fanomezam-pahasoavana ho Mpaminany",
    description: "Ny fanomezam-pahasoavana ho mpaminany dia iray amin'ireo marika mampiavaka ny fiangonana sisa, ary hita tamin'ny asa nataon'i Ellen G. White.",
    verses: ["Joela 3:1,2", "Asa 2:14-21", "Apokalypsy 12:17", "Apokalypsy 19:10"]
  },
  {
    id: 19,
    title: "Ny Lalàn'Andriamanitra",
    description: "Ny fitsipika lehibe amin'ny lalàn'Andriamanitra dia hita ao amin'ny didy folo ary nasehon'i Kristy tamin'ny fiainany.",
    verses: ["Eksodosy 20:1-17", "Salamo 19:7-14", "Matio 5:17-20", "Romana 8:3,4"]
  },
  {
    id: 20,
    title: "Ny Sabata",
    description: "Ny Mpamorona dia nitsahatra tamin'ny andro fahafito ary nanokana izany ho fahatsiarovana ny famoronana. Andro fitsaharana sy fanompoana izany.",
    verses: ["Genesisy 2:1-3", "Eksodosy 20:8-11", "Ezekiela 20:12,20", "Lioka 4:16"]
  },
  {
    id: 21,
    title: "Ny Fitondran-draharaha Kristiana",
    description: "Isika dia mpitandrina ny fananan'Andriamanitra: fotoana, fahafahana, talenta, ary ny harena rehetra eo am-pelatanantsika.",
    verses: ["1 Tantara 29:14", "Matio 25:14-29", "2 Korintiana 9:6-9"]
  },
  {
    id: 22,
    title: "Ny Fitondrantena Kristiana",
    description: "Antsoina isika mba ho olona masina amin'ny fisainana sy ny fiteny ary ny asa, mifanaraka amin'ny fitsipiky ny lanitra.",
    verses: ["Romana 12:1,2", "1 Korintiana 10:31", "2 Korintiana 7:1"]
  },
  {
    id: 23,
    title: "Ny Fanambadiana sy ny Fianakaviana",
    description: "Andriamanitra no nanorina ny fanambadiana tany Edena ho firaisan'ny lehilahy iray sy vehivavy iray mandra-pahafaty.",
    verses: ["Genesisy 2:18-25", "Matio 19:4-6", "Efesiana 5:21-33"]
  },
  {
    id: 24,
    title: "Ny Fanompoan'i Kristy any an-danitra",
    description: "Misy fitoerana masina any an-danitra, izay sary tany am-boalohany, natsangan'ny Tompo fa tsy olona.",
    verses: ["Hebreo 8:1,2", "Daniela 7:9,10", "Apokalypsy 14:6,7"]
  },
  {
    id: 25,
    title: "Ny Fiavian'i Kristy Fanindroany",
    description: "Ny fiavian'i Kristy fanindroany no fanantenana finaritra ho an'ny fiangonana sy fara-tampon'ny Filazantsara.",
    verses: ["Jaona 14:1-3", "Asa 1:9-11", "1 Tesaloniana 4:16,17"]
  },
  {
    id: 26,
    title: "Ny Fahafatesana sy ny Fitsanganan'ny maty",
    description: "Ny tambin'ny ota dia fahafatesana. Fa Andriamanitra kosa dia hanome fiainana mandrakizay ho an'ireo voavotra.",
    verses: ["Romana 6:23", "Jaona 5:28,29", "1 Tesaloniana 4:13-17"]
  },
  {
    id: 27,
    title: "Ny Mileniosy sy ny Fifaranan'ny ota",
    description: "Ny Mileniosy dia ny fanjakana arivo taona hiarahan'i Kristy sy ny olony masina any an-danitra.",
    verses: ["Apokalypsy 20:1-10", "1 Korintiana 6:2,3"]
  },
  {
    id: 28,
    title: "Ny Tany Vaovao",
    description: "Ao amin'ny Tany Vaovao, izay hitoeran'ny fahamarinana, Andriamanitra dia hanome trano mandrakizay ho an'ny voavotra.",
    verses: ["Isaia 65:17-25", "2 Petera 3:13", "Apokalypsy 21:1-7"]
  }
];

export default function CroyancesPage() {
  const { settings: globalSettings } = useSettings();
  const [lang, setLang] = useState<'FR' | 'MG'>('FR');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Verse Modal state
  const [verseModalVisible, setVerseModalVisible] = useState(false);
  const [verseTitle, setVerseTitle] = useState("");
  const [verseContent, setVerseContent] = useState("");
  const [loadingVerse, setLoadingVerse] = useState(false);

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const beliefs = lang === 'FR' ? BELIEFS_FR : BELIEFS_MG;

  const handleOpenVerse = async (ref: string) => {
    const matches = Array.from(ref.matchAll(BIBLE_REGEX));
    if (matches.length > 0) {
      setLoadingVerse(true);
      setVerseTitle(ref);
      setVerseContent("");
      setVerseModalVisible(true);

      const [match, book, chapter, verses] = matches[0];
      try {
        const bibles = await getAvailableBibles();
        // Priority logic:
        // 1. Bible in the matching language (French if lang === 'FR')
        // 2. Default Bible from settings
        // 3. Any available Bible (usually MG65)
        const uiLang = lang === 'FR' ? 'french' : 'malagasy';
        const bestBible = bibles.find(b => b.language.toLowerCase() === uiLang)
          || bibles.find(b => b.id === globalSettings.bibleVersion)
          || bibles[0];

        const res = await fetchVerseContent(bestBible.id, book, chapter, verses || "1", true);
        if (res && res.text) {
          setVerseContent(res.text);
          // Update title with the version name if it's not the default one to be clear
          if (bestBible.id !== 'MG') {
            setVerseTitle(`${ref} (${bestBible.id})`);
          }
        } else {
          const bibleName = res?.bibleName || bestBible.name;
          if (lang === 'FR') {
            setVerseContent(`Ce verset n'est pas disponible dans votre version choisie : ${bibleName}.`);
          } else {
            setVerseContent(`Tsy hita ity andininy ity ao amin'ny Baiboly ${bibleName} ampiasainao.`);
          }
        }
      } catch (e) {
        setVerseContent(lang === 'FR' ? "Hadisoana teo am-pamakiana ny Baiboly frantsay." : "Hadisoana teo am-pamakiana ny Baiboly.");
      } finally {
        setLoadingVerse(false);
      }
    } else {
      Alert.alert("Info", `Reference: ${ref}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/5">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10">
            <ArrowLeft size={20} color="#94a3b8" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>
              {lang === 'FR' ? "28 Croyances" : "Finoana Fototra 28"}
            </Text>
            <Text className="text-slate-500 text-xs">
              {lang === 'FR' ? "Fondements de la foi" : "Foto-piorenan'ny finoana"}
            </Text>
          </View>
        </View>

        {/* Language Switcher */}
        <View className="flex-row bg-slate-800 rounded-full p-1 border border-slate-700">
          <TouchableOpacity
            onPress={() => setLang('FR')}
            className={`px-3 py-1 rounded-full ${lang === 'FR' ? 'bg-primary shadow-sm' : ''}`}
          >
            <Text className={`text-[10px] font-bold ${lang === 'FR' ? 'text-white' : 'text-slate-500'}`}>FR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setLang('MG')}
            className={`px-3 py-1 rounded-full ${lang === 'MG' ? 'bg-primary shadow-sm' : ''}`}
          >
            <Text className={`text-[10px] font-bold ${lang === 'MG' ? 'text-white' : 'text-slate-500'}`}>MG</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {/* Intro Card */}
        <View className="bg-blue-600/10 border border-blue-500/20 rounded-[32px] p-6 mb-8 flex-row items-center shadow-lg shadow-blue-500/5">
          <View className="w-12 h-12 bg-blue-600/20 rounded-2xl items-center justify-center mr-4">
            <Sparkles size={24} color="#3b82f6" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold mb-1">
              {lang === 'FR' ? "Notre Seul Crédo" : "Ny hany Finoanay"}
            </Text>
            <Text className="text-slate-400 text-xs leading-5">
              {lang === 'FR'
                ? "Les Adventistes n'ont d'autre crédo que la Bible seule."
                : "Ny Baiboly irery ihany no hany foto-pampianaran'ny Advantista."}
            </Text>
          </View>
        </View>

        {/* List of Beliefs */}
        <View className="pb-32">
          {beliefs.map((belief) => {
            const isExpanded = expandedId === belief.id;
            return (
              <TouchableOpacity
                key={belief.id}
                onPress={() => toggleExpand(belief.id)}
                activeOpacity={0.7}
                className={`bg-slate-900 mb-4 rounded-[24px] border border-slate-800 overflow-hidden shadow-sm ${isExpanded ? 'border-primary/40 bg-slate-900/80' : ''}`}
              >
                <View className="p-5 flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-4">
                    <View className={`w-8 h-8 rounded-lg items-center justify-center mr-4 ${isExpanded ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-slate-800'}`}>
                      <Text className="text-white font-bold text-xs">{belief.id}</Text>
                    </View>
                    <Text className={`text-sm font-bold flex-1 ${isExpanded ? 'text-white' : 'text-slate-300'}`} style={{ fontFamily: 'Lexend_600SemiBold' }}>
                      {belief.title}
                    </Text>
                  </View>
                  {isExpanded ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#475569" />}
                </View>

                {isExpanded && (
                  <View className="px-5 pb-6">
                    <View className="h-[1px] bg-slate-800/50 mb-5" />

                    <Text className="text-slate-300 leading-7 mb-8 text-[15px]" style={{ fontFamily: 'Lexend_400Regular' }}>
                      {belief.description}
                    </Text>

                    <View className="bg-background-dark/30 rounded-[20px] p-5 border border-slate-800/50">
                      <View className="flex-row items-center mb-4">
                        <Quote size={12} color="#3b82f6" className="mr-2" />
                        <Text className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                          {lang === 'FR' ? "RÉFÉRENCES BIBLIQUES" : "ANDININY ARAKA NY BAIBOLY"}
                        </Text>
                      </View>
                      <View className="flex-row flex-wrap gap-2">
                        {belief.verses.map((v, i) => (
                          <TouchableOpacity
                            key={i}
                            onPress={() => handleOpenVerse(v)}
                            className="bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20"
                          >
                            <Text className="text-blue-400 text-[11px] font-bold">{v}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Verse Modal */}
      <Modal visible={verseModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-[40px] p-8 border-t border-white/10" style={{ maxHeight: '80%' }}>
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center">
                <BookOpen size={20} color="#3b82f6" className="mr-3" />
                <Text className="text-xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>{verseTitle}</Text>
              </View>
              <TouchableOpacity onPress={() => setVerseModalVisible(false)} className="w-8 h-8 rounded-full bg-white/5 items-center justify-center">
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {loadingVerse ? (
                <View className="py-10">
                  <ActivityIndicator color="#3b82f6" />
                </View>
              ) : (
                <Text
                  className="text-slate-300 leading-8 italic py-4"
                  style={{
                    fontSize: globalSettings.fontSize + 2,
                    fontFamily: globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily
                  }}
                >
                  {verseContent}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Footer Branding */}
      <View className="absolute bottom-0 left-0 right-0 p-5 items-center bg-background-dark/90 backdrop-blur-xl border-t border-white/5">
        <Text className="text-slate-600 text-[9px] uppercase font-bold tracking-[0.2em]">Union des églises adventistes • Madagascar</Text>
      </View>
    </SafeAreaView>
  );
}
