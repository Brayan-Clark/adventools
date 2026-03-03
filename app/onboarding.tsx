import { useTranslation } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ChevronLeft,
  User,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = 'adventools_onboarding_done';

const EDS_CLASSES = [
  "Lesona Zaza minono (0-12 volana)",
  "Lesona Zazakely (1-3 taona)",
  "Lesona Kilonga (4-6 taona)",
  "Lesona Ankizy (7-9 taona)",
  "Lesona Tanora zandriny (10-12 taona)",
  "Lesona Mantoanto (13-14 taona)",
  "Lesona Zatovo (15-18 taona)",
  "Lesona Tanora zokiny (19-35 taona)",
  "Lesona Lehibe (+ 35 taona)",
];

const STEPS = [
  { id: 'welcome' },
  { id: 'profile' },
  { id: 'preferences' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { updateSettings } = useSettings();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedEDS, setSelectedEDS] = useState('Lesona Lehibe (+ 35 taona)');
  const [departments, setDepartments] = useState<string[]>([]);
  const [availableDepts, setAvailableDepts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Dots progress
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load departments from manifest
    const loadDepts = async () => {
      try {
        const cached = await AsyncStorage.getItem('pdf_manifest_cache');
        if (cached) {
          const data = JSON.parse(cached);
          if (data.departments) setAvailableDepts(data.departments);
        }
        const res = await fetch(`https://raw.githubusercontent.com/Brayan-Clark/adventools/data/assets/docs/manifest.json?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.departments) {
            setAvailableDepts(data.departments);
            await AsyncStorage.setItem('pdf_manifest_cache', JSON.stringify(data));
          }
        }
      } catch (_) { }
    };
    loadDepts();
  }, []);

  const goToStep = (next: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      Animated.parallel([
        Animated.timing(progressAnim, { toValue: next / (STEPS.length - 1), duration: 400, useNativeDriver: false }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const toggleDept = (dept: string) => {
    setDepartments(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const finish = async (skip = false) => {
    setSaving(true);
    try {
      if (!skip) {
        if (name.trim()) await AsyncStorage.setItem('profile_name', name.trim());
        if (photo) await AsyncStorage.setItem('profile_image', photo);
        await AsyncStorage.setItem('profile_eds_class', selectedEDS);
        if (departments.length > 0)
          await AsyncStorage.setItem('profile_departments', JSON.stringify(departments));
      } else {
        // Anonyme : valeurs par défaut
        await AsyncStorage.setItem('profile_name', 'Fianatra Baiboly');
        await AsyncStorage.setItem('profile_eds_class', 'Lesona Lehibe (+ 35 taona)');
      }
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView className="flex-1 bg-[#060d1f]">
      <StatusBar style="light" />

      {/* Progress bar */}
      <View className="px-6 pt-4 pb-2">
        <View className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <Animated.View
            className="h-full bg-[#195de6] rounded-full"
            style={{ width: progressWidth }}
          />
        </View>
        <View className="flex-row justify-between mt-3">
          {STEPS.map((s, i) => (
            <View
              key={s.id}
              className={`w-2 h-2 rounded-full ${i <= step ? 'bg-[#195de6]' : 'bg-slate-700'}`}
            />
          ))}
        </View>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

        {/* ── STEP 0: WELCOME ── */}
        {step === 0 && (
          <View className="flex-1 items-center justify-center px-8">
            {/* Logo / Illustration */}
            <View className="w-32 h-32 rounded-[40px] bg-[#195de6]/20 border border-[#195de6]/30 items-center justify-center mb-10 shadow-2xl shadow-blue-500/20">
              <BookOpen size={60} color="#195de6" />
            </View>

            {/* Badge */}
            <View className="bg-[#195de6]/10 border border-[#195de6]/20 px-4 py-1.5 rounded-full mb-6">
              <Text className="text-[#195de6] text-[10px] font-bold uppercase tracking-[0.3em]">
                Adventools
              </Text>
            </View>

            <Text
              className="text-white text-4xl font-bold text-center mb-4 leading-tight"
              style={{ fontFamily: 'Lexend_700Bold' }}
            >
              Bienvenue ! {'\n'}
              <Text className="text-[#195de6]">Tongasoa !</Text>
            </Text>

            <Text className="text-slate-400 text-center text-base leading-7 mb-16">
              Personnalisez votre expérience en quelques étapes. Vous pouvez aussi passer et le faire plus tard.
            </Text>

            <TouchableOpacity
              onPress={() => goToStep(1)}
              className="w-full bg-[#195de6] py-5 rounded-[24px] flex-row items-center justify-center shadow-lg shadow-blue-500/30 mb-4"
            >
              <Text className="text-white font-bold text-base mr-3" style={{ fontFamily: 'Lexend_700Bold' }}>
                Commencer
              </Text>
              <ArrowRight size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => finish(true)}
              className="w-full py-4 items-center"
            >
              <Text className="text-slate-500 font-medium">
                Passer (rester anonyme)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 1: PROFILE ── */}
        {step === 1 && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Back */}
              <TouchableOpacity
                onPress={() => goToStep(0)}
                className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mb-8"
              >
                <ChevronLeft size={20} color="#94a3b8" />
              </TouchableOpacity>

              <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.3em] mb-2">
                Étape 2 sur 3
              </Text>
              <Text className="text-white text-3xl font-bold mb-2" style={{ fontFamily: 'Lexend_700Bold' }}>
                Votre Profil
              </Text>
              <Text className="text-slate-500 text-sm leading-6 mb-10">
                Ces informations restent sur votre appareil. Tout est optionnel.
              </Text>

              {/* Avatar picker */}
              <View className="items-center mb-10">
                <TouchableOpacity
                  onPress={pickPhoto}
                  activeOpacity={0.8}
                  className="relative"
                >
                  <View className="w-28 h-28 rounded-[32px] bg-slate-900 border-2 border-slate-800 items-center justify-center overflow-hidden shadow-xl">
                    {photo ? (
                      <Image source={{ uri: photo }} className="w-full h-full" />
                    ) : (
                      <User size={48} color="#334155" />
                    )}
                  </View>
                  <View className="absolute -bottom-2 -right-2 w-9 h-9 rounded-2xl bg-[#195de6] items-center justify-center shadow-lg border-2 border-[#060d1f]">
                    <Camera size={16} color="white" />
                  </View>
                </TouchableOpacity>
                {photo && (
                  <TouchableOpacity onPress={() => setPhoto(null)} className="mt-3">
                    <Text className="text-red-400 text-xs">Supprimer la photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Name input */}
              <View className="mb-8">
                <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
                  Nom / Nom d'utilisateur
                </Text>
                <View className="bg-slate-900 border border-slate-800 rounded-2xl flex-row items-center px-4">
                  <User size={18} color="#475569" />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex: Rakoto Jean"
                    placeholderTextColor="#475569"
                    className="flex-1 h-14 ml-3 text-white text-base"
                    style={{ fontFamily: 'Lexend_400Regular' }}
                    maxLength={40}
                    returnKeyType="done"
                  />
                  {name.length > 0 && (
                    <TouchableOpacity onPress={() => setName('')}>
                      <X size={16} color="#475569" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text className="text-slate-600 text-xs mt-2 ml-1">
                  Laissez vide pour rester anonyme
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => goToStep(2)}
                className="bg-[#195de6] py-5 rounded-[24px] flex-row items-center justify-center shadow-lg shadow-blue-500/30"
              >
                <Text className="text-white font-bold text-base mr-3" style={{ fontFamily: 'Lexend_700Bold' }}>
                  Continuer
                </Text>
                <ArrowRight size={20} color="white" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => finish(true)} className="py-4 items-center">
                <Text className="text-slate-600 text-sm">Passer cette étape</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* ── STEP 2: PREFERENCES ── */}
        {step === 2 && (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Back */}
            <TouchableOpacity
              onPress={() => goToStep(1)}
              className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mb-8"
            >
              <ChevronLeft size={20} color="#94a3b8" />
            </TouchableOpacity>

            <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.3em] mb-2">
              Étape 3 sur 3
            </Text>
            <Text className="text-white text-3xl font-bold mb-2" style={{ fontFamily: 'Lexend_700Bold' }}>
              Préférences
            </Text>
            <Text className="text-slate-500 text-sm leading-6 mb-8">
              Modifiable à tout moment dans les paramètres.
            </Text>

            {/* EDS Class */}
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
              Classe EDS (École du Sabbat)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-8"
              contentContainerStyle={{ paddingRight: 8 }}
            >
              {EDS_CLASSES.map((cls) => (
                <TouchableOpacity
                  key={cls}
                  onPress={() => setSelectedEDS(cls)}
                  className={`px-4 py-3 rounded-2xl mr-3 border ${selectedEDS === cls
                      ? 'bg-[#195de6] border-[#195de6]'
                      : 'bg-slate-900 border-slate-800'
                    }`}
                >
                  <Text
                    className={`text-xs font-bold ${selectedEDS === cls ? 'text-white' : 'text-slate-400'
                      }`}
                    numberOfLines={1}
                  >
                    {cls}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Departments */}
            {availableDepts.length > 0 && (
              <>
                <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
                  Mes Départements (optionnel)
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-8">
                  {availableDepts.map((dept) => {
                    const selected = departments.includes(dept);
                    return (
                      <TouchableOpacity
                        key={dept}
                        onPress={() => toggleDept(dept)}
                        className={`px-4 py-2.5 rounded-2xl border flex-row items-center ${selected
                            ? 'bg-[#195de6]/15 border-[#195de6]/40'
                            : 'bg-slate-900 border-slate-800'
                          }`}
                      >
                        {selected && (
                          <Check size={12} color="#195de6" style={{ marginRight: 6 }} />
                        )}
                        <Text
                          className={`text-xs font-bold ${selected ? 'text-[#195de6]' : 'text-slate-400'
                            }`}
                        >
                          {dept}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Summary card */}
            <View className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 mb-8">
              <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4">
                Récapitulatif
              </Text>
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-xl bg-[#195de6]/20 items-center justify-center mr-3">
                  <User size={16} color="#195de6" />
                </View>
                <Text className="text-slate-300 text-sm flex-1">
                  {name.trim() || 'Anonyme'}
                </Text>
              </View>
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-xl bg-[#195de6]/20 items-center justify-center mr-3">
                  <BookOpen size={16} color="#195de6" />
                </View>
                <Text className="text-slate-300 text-sm flex-1" numberOfLines={1}>
                  {selectedEDS}
                </Text>
              </View>
              {departments.length > 0 && (
                <View className="flex-row items-start">
                  <View className="w-8 h-8 rounded-xl bg-[#195de6]/20 items-center justify-center mr-3 mt-0.5">
                    <Check size={16} color="#195de6" />
                  </View>
                  <Text className="text-slate-300 text-sm flex-1">
                    {departments.join(', ')}
                  </Text>
                </View>
              )}
            </View>

            {/* Finish button */}
            <TouchableOpacity
              onPress={() => finish(false)}
              disabled={saving}
              className="bg-[#195de6] py-5 rounded-[24px] flex-row items-center justify-center shadow-xl shadow-blue-500/30"
            >
              {saving ? (
                <Text className="text-white font-bold text-base" style={{ fontFamily: 'Lexend_700Bold' }}>
                  Enregistrement...
                </Text>
              ) : (
                <>
                  <Check size={20} color="white" style={{ marginRight: 10 }} />
                  <Text className="text-white font-bold text-base" style={{ fontFamily: 'Lexend_700Bold' }}>
                    Commencer Adventools
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}
