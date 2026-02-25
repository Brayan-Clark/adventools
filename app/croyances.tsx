import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, ChevronDown, ChevronUp, Quote, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BELIEFS = [
  {
    id: 1,
    title: "Les Saintes Écritures",
    description: "L'Ancien et le Nouveau Testament sont la Parole de Dieu écrite, inspirée divinement. Elles sont la révélation infaillible de la volonté de Dieu, la norme du caractère, le critère de l'expérience et le fondement souverain des doctrines.",
    verses: "2 Timothée 3:16,17 ; 2 Pierre 1:20,21 ; Psaumes 119:105 ; Jean 17:17."
  },
  {
    id: 2,
    title: "La Trinité",
    description: "Il y a un seul Dieu, composé de trois personnes coéternelles : le Père, le Fils et le Saint-Esprit. Dieu est immortel, omnipotent, omniscient, souverain et omniprésent.",
    verses: "Genèse 1:26 ; Matthieu 28:19 ; 2 Corinthiens 13:14 ; Éphésiens 4:4-6."
  },
  {
    id: 3,
    title: "Le Père",
    description: "Dieu le Père éternel est le Créateur, la source, le soutien et le souverain de toute la création. Il est juste, saint, miséricordieux et compatissant.",
    verses: "Genèse 1:1 ; Deutéronome 4:35 ; Jean 14:9."
  },
  {
    id: 4,
    title: "Le Fils",
    description: "Dieu le Fils éternel s'est incarné en Jésus-Christ. C'est par Lui que tout a été créé, que le caractère de Dieu est révélé, que s'accomplit le salut de l'humanité et que le monde est jugé.",
    verses: "Jean 1:1-3 ; Colossiens 1:15-19 ; Romains 6:23 ; Philippiens 2:5-11."
  },
  {
    id: 5,
    title: "Le Saint-Esprit",
    description: "Dieu, l'Esprit éternel, a participé activement à la création, à l'incarnation et à la rédemption. Il a inspiré les écrivains de la Bible, a rempli la vie du Christ de puissance, et régénère et transforme ceux qui répondent favorablement à l'image de Dieu.",
    verses: "Genèse 1:1,2 ; Luc 1:35 ; Actes 1:8 ; Jean 14:16-18,26."
  },
  {
    id: 6,
    title: "La Création",
    description: "Dieu a créé toutes choses en six jours et s'est reposé le septième jour. L'homme et la femme ont été créés à l'image de Dieu.",
    verses: "Genèse 1:1-31 ; Exode 20:8-11."
  },
  {
    id: 7,
    title: "La Nature de l'Homme",
    description: "L'homme et la femme ont été créés à l'image de Dieu avec individualité, capacité de penser et de faire. Bien que créés libres, ils sont mortels, soumis à la mort.",
    verses: "Genèse 1:26-28 ; Psaumes 8:4-8 ; Romains 5:12."
  },
  {
    id: 8,
    title: "Le Grand Conflit",
    description: "Toute l'humanité est impliquée dans un grand conflit entre le Christ et Satan concernant le caractère de Dieu, sa loi et sa souveraineté sur l'univers.",
    verses: "Genèse 3:15 ; Ésaïe 14:12-14 ; Apocalypse 12:4-9."
  },
  {
    id: 9,
    title: "La Vie, la Mort et la Résurrection du Christ",
    description: "La vie sans péché, la mort expiatoire et la résurrection du Christ constituent l'unique provision pour le salut humain.",
    verses: "Romains 5:8-10 ; 1 Corinthiens 15:3,4 ; Jean 3:16."
  },
  {
    id: 10,
    title: "L'Expérience du Salut",
    description: "Dans son amour infini, Dieu a fait de Christ, qui n'a pas connu le péché, péché pour nous, afin que nous devenions en Lui justice de Dieu.",
    verses: "Jean 3:16 ; Éphésiens 2:8-10 ; Romains 10:17."
  },
  {
    id: 11,
    title: "Croître en Christ",
    description: "Par sa mort sur la croix, Jésus a triomphé des forces du mal. Sa puissance régénératrice nous permet de vivre une vie sainte.",
    verses: "Psaumes 1:1,2 ; Romains 8:3,4 ; Colossiens 2:14,15."
  },
  {
    id: 12,
    title: "L'Église",
    description: "L'Église est la communauté des croyants qui reconnaissent Jésus-Christ comme Seigneur et Sauveur.",
    verses: "Matthieu 16:13-20 ; Éphésiens 1:22,23 ; 1 Pierre 2:9."
  },
  {
    id: 13,
    title: "Le Reste et sa Mission",
    description: "Un reste est appelé à garder les commandements de Dieu et la foi en Jésus, proclamant que l'heure du jugement est venue et annonçant la proximité de la seconde venue du Christ.",
    verses: "Apocalypse 12:17 ; Apocalypse 14:6-12."
  },
  {
    id: 14,
    title: "L'Unité du Corps du Christ",
    description: "L'Église est un seul corps avec plusieurs membres, appelés de toute nation, race, langue et peuple.",
    verses: "Psaumes 133:1 ; Romains 12:4,5 ; Éphésiens 4:1-6."
  },
  {
    id: 15,
    title: "Le Baptême",
    description: "Par le baptême par immersion, nous confessons notre foi en la mort et la résurrection de Jésus-Christ et témoignons de notre mort au péché et de notre décision de mener une vie nouvelle.",
    verses: "Romains 6:1-6 ; Colossiens 2:12,13 ; Actes 2:38."
  },
  {
    id: 16,
    title: "La Sainte Cène",
    description: "La Sainte Cène est une participation aux emblèmes du corps et du sang de Jésus comme expression de foi en Lui.",
    verses: "1 Corinthiens 10:16,17 ; Matthieu 26:26-29."
  },
  {
    id: 17,
    title: "Les Dons Spirituels et les Ministères",
    description: "Dieu accorde à tous les membres de son Église à toutes les époques des dons spirituels.",
    verses: "Romains 12:4-8 ; 1 Corinthiens 12:1-11 ; Éphésiens 4:8,11-16."
  },
  {
    id: 18,
    title: "Le Don de Prophétie",
    description: "Le don de prophétie est l'une des marques distinctives de l'Église du reste et s'est manifesté dans le ministère d'Ellen G. White.",
    verses: "Joël 2:28,29 ; Actes 2:14-21 ; Apocalypse 12:17 ; Apocalypse 19:10."
  },
  {
    id: 19,
    title: "La Loi de Dieu",
    description: "Les grands principes de la loi de Dieu sont incorporés dans les dix commandements et illustrés dans la vie du Christ.",
    verses: "Exode 20:1-17 ; Psaumes 19:7-14 ; Matthieu 5:17-20 ; Romains 8:3,4."
  },
  {
    id: 20,
    title: "Le Sabbat",
    description: "Le Créateur miséricordieux s'est reposé le septième jour et l'a institué comme mémorial de la création pour toute l'humanité. Il est un jour de repos, de culte et de service.",
    verses: "Genèse 2:1-3 ; Exode 20:8-11 ; Ézéchiel 20:12,20 ; Luc 4:16."
  },
  {
    id: 21,
    title: "La Gestion Chrétienne de la Vie",
    description: "Nous sommes les économes de Dieu, et il nous a confié le temps, les occasions, les aptitudes, les possessions, les biens de la terre et les ressources du sol.",
    verses: "1 Chroniques 29:14 ; Matthieu 25:14-29 ; 2 Corinthiens 9:6-9."
  },
  {
    id: 22,
    title: "La Conduite Chrétienne",
    description: "Nous sommes appelés à être un peuple pieux qui pense, ressent et agit en harmonie avec les principes du ciel.",
    verses: "Romains 12:1,2 ; 1 Corinthiens 10:31 ; 2 Corinthiens 7:1."
  },
  {
    id: 23,
    title: "Le Mariage et la Famille",
    description: "Le mariage a été divinement institué en Éden et confirmé par Jésus comme une union à vie entre un homme et une femme.",
    verses: "Genèse 2:18-25 ; Matthieu 19:4-6 ; Éphésiens 5:21-33."
  },
  {
    id: 24,
    title: "Le Ministère du Christ dans le Sanctuaire Céleste",
    description: "Il y a un sanctuaire dans le ciel, le véritable tabernacle que le Seigneur a dressé et non un homme.",
    verses: "Hébreux 8:1,2 ; Daniel 7:9,10 ; Apocalypse 14:6,7."
  },
  {
    id: 25,
    title: "La Seconde Venue du Christ",
    description: "La seconde venue du Christ est l'espérance bénie de l'Église, le grand point culminant de l'Évangile.",
    verses: "Jean 14:1-3 ; Actes 1:9-11 ; 1 Thessaloniciens 4:16,17."
  },
  {
    id: 26,
    title: "La Mort et la Résurrection",
    description: "La rétribution du péché est la mort. Mais Dieu, qui seul est immortel, accordera la vie éternelle à ses rachetés.",
    verses: "Romains 6:23 ; Jean 5:28,29 ; 1 Thessaloniciens 4:13-17."
  },
  {
    id: 27,
    title: "Le Millénium et la Fin du Péché",
    description: "Le millénium est le règne de mille ans du Christ avec ses saints dans le ciel entre la première et la seconde résurrection.",
    verses: "Apocalypse 20:1-10 ; 1 Corinthiens 6:2,3."
  },
  {
    id: 28,
    title: "La Nouvelle Terre",
    description: "Dans la nouvelle Terre, où la justice habitera, Dieu fournira un foyer éternel pour les rachetés et un environnement parfait pour la vie éternelle, l'amour, la joie et l'apprentissage en Sa présence.",
    verses: "Ésaïe 65:17-25 ; 2 Pierre 3:13 ; Apocalypse 21:1-7."
  }
];

export default function CroyancesPage() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-white/5">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10">
          <ArrowLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>28 Croyances</Text>
          <Text className="text-slate-500 text-xs">Fondements de la foi adventiste</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {/* Intro Card */}
        <View className="bg-blue-600/10 border border-blue-500/20 rounded-[32px] p-6 mb-8 flex-row items-center">
          <View className="w-12 h-12 bg-blue-600/20 rounded-2xl items-center justify-center mr-4">
            <Sparkles size={24} color="#3b82f6" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold mb-1">Notre Seul Crédo</Text>
            <Text className="text-slate-400 text-xs leading-5">Les Adventistes n'ont d'autre crédo que la Bible seule.</Text>
          </View>
        </View>

        {/* List of Beliefs */}
        <View className="pb-20">
          {BELIEFS.map((belief) => {
            const isExpanded = expandedId === belief.id;
            return (
              <TouchableOpacity
                key={belief.id}
                onPress={() => toggleExpand(belief.id)}
                activeOpacity={0.7}
                className={`bg-slate-900 mb-4 rounded-[24px] border border-slate-800 overflow-hidden ${isExpanded ? 'border-primary/50' : ''}`}
              >
                <View className="p-5 flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-4">
                    <View className={`w-8 h-8 rounded-lg items-center justify-center mr-4 ${isExpanded ? 'bg-primary' : 'bg-slate-800'}`}>
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
                    <View className="h-[1px] bg-slate-800 mb-5" />

                    <Text className="text-slate-300 leading-6 mb-6" style={{ fontFamily: 'Lexend_400Regular' }}>
                      {belief.description}
                    </Text>

                    <View className="bg-background-dark/50 rounded-2xl p-4 border border-slate-800">
                      <View className="flex-row items-center mb-3">
                        <Quote size={12} color="#195de6" className="mr-2" />
                        <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Références Bibliques</Text>
                      </View>
                      <Text className="text-blue-400 text-xs font-medium italic leading-5">
                        {belief.verses}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Branding */}
      <View className="absolute bottom-0 left-0 right-0 p-4 items-center bg-background-dark/80 backdrop-blur-md">
        <Text className="text-slate-600 text-[10px] uppercase font-bold tracking-widest">Union des églises adventistes</Text>
      </View>
    </SafeAreaView>
  );
}
