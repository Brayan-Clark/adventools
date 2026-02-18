import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Info, Type, AlignLeft, MoveHorizontal } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BibleSettings() {
  const router = useRouter();
  const [fontFamily, setFontFamily] = useState('System');
  const [fontSize, setFontSize] = useState(18);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.5);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('bible_reading_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        setFontFamily(settings.fontFamily || 'System');
        setFontSize(settings.fontSize || 18);
        setLetterSpacing(settings.letterSpacing || 0);
        setLineHeight(settings.lineHeight || 1.5);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveSettings = async (updates: any) => {
    try {
      const current = { fontFamily, fontSize, letterSpacing, lineHeight, ...updates };
      await AsyncStorage.setItem('bible_reading_settings', JSON.stringify(current));
    } catch (e) {
      console.error(e);
    }
  };

  const fonts = ['Système', 'Cool', 'OpenSans', 'Choco', 'Rosemary'];

  return (
    <SafeAreaView className="flex-1 bg-[#111621]">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-800/50">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center border border-slate-700">
          <ChevronLeft size={20} color="#cbd5e1" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>Paramètres</Text>
        <TouchableOpacity className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center border border-slate-700">
          <Info size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Preview Container */}
        <View className="p-8 border-b border-slate-800/50 bg-[#1a2233]/30">
          <Text className="text-slate-200" style={{
            fontSize,
            lineHeight: fontSize * lineHeight,
            letterSpacing,
            fontFamily: fontFamily === 'System' ? undefined : (fontFamily === 'Rosemary' ? 'Lexend_400Regular' : 'Lexend_400Regular') // Fallback for now
          }}>
            [1] [Ny namoronan'Andriamanitra izao tontolo izao] Tamin'ny voalohany Andriamanitra nahary ny lanitra sy ny tany.{"\n\n"}
            [2] Ary ny tany dia tsy nisy endrika sady foana; ary aizina no tambonin'ny lalina. Ary ny fanahin'Andriamanitra nanomba tambonin'ny rano.
          </Text>
        </View>

        <View className="p-6">
          {/* Font Selector */}
          <View className="flex-row border border-slate-700 rounded-xl overflow-hidden mb-8">
            {fonts.map((f, i) => (
              <TouchableOpacity
                key={f}
                onPress={() => { setFontFamily(f); saveSettings({ fontFamily: f }); }}
                className={`flex-1 py-3 items-center justify-center ${fontFamily === f ? 'bg-slate-700' : 'bg-transparent'} ${i < fonts.length - 1 ? 'border-r border-slate-700' : ''}`}
              >
                <Text className={`text-[10px] ${fontFamily === f ? 'text-white font-bold' : 'text-slate-400'}`}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Size Slider */}
          <View className="mb-8">
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Taille de police</Text>
            <View className="flex-row items-center gap-4">
              <Type size={20} color="#64748b" />
              <View className="flex-1 h-2 bg-slate-800 rounded-full relative justify-center">
                {/* Custom Slider Simulation since I might not have the package */}
                <TouchableOpacity
                  className="absolute h-full bg-blue-500 rounded-full"
                  style={{ width: `${((fontSize - 12) / 18) * 100}%` }}
                />
                <TouchableOpacity
                  className="w-6 h-6 rounded-full bg-blue-100 absolute border-4 border-blue-600"
                  style={{ left: `${((fontSize - 12) / 18) * 100}%`, marginLeft: -12 }}
                />
                <ScrollView
                  horizontal
                  scrollEnabled={false}
                  contentContainerStyle={{ width: '100%', height: 40 }}
                  onTouchStart={(e) => {
                    const x = e.nativeEvent.locationX;
                    const width = Dimensions.get('window').width - 100; // corrected
                    const val = Math.round(12 + (x / width) * 18);
                    const safeVal = Math.min(30, Math.max(12, val));
                    setFontSize(safeVal);
                    saveSettings({ fontSize: safeVal });
                  }}
                />
              </View>
              <Text className="text-white font-bold" style={{ fontSize: 20 }}>Aa</Text>
            </View>
          </View>

          {/* Letter Spacing */}
          <View className="mb-8">
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Espacement des lettres</Text>
            <View className="flex-row items-center gap-4">
              <MoveHorizontal size={20} color="#64748b" />
              <View className="flex-1 h-2 bg-slate-800 rounded-full relative justify-center">
                <TouchableOpacity
                  className="absolute h-full bg-blue-500 rounded-full"
                  style={{ width: `${((letterSpacing + 2) / 6) * 100}%` }}
                />
                <TouchableOpacity
                  className="w-6 h-6 rounded-full bg-blue-100 absolute border-4 border-blue-600"
                  style={{ left: `${((letterSpacing + 2) / 6) * 100}%`, marginLeft: -12 }}
                />
                <ScrollView
                  horizontal
                  scrollEnabled={false}
                  contentContainerStyle={{ width: '100%', height: 40 }}
                  onTouchStart={(e) => {
                    const x = e.nativeEvent.locationX;
                    const width = Dimensions.get('window').width - 100;
                    const val = -2 + (x / width) * 6;
                    setLetterSpacing(val);
                    saveSettings({ letterSpacing: val });
                  }}
                />
              </View>
            </View>
          </View>

          {/* Line Height */}
          <View className="mb-8">
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Espacement des lignes</Text>
            <View className="flex-row items-center gap-4">
              <AlignLeft size={20} color="#64748b" />
              <View className="flex-1 h-2 bg-slate-800 rounded-full relative justify-center">
                <TouchableOpacity
                  className="absolute h-full bg-blue-500 rounded-full"
                  style={{ width: `${((lineHeight - 1) / 1.5) * 100}%` }}
                />
                <TouchableOpacity
                  className="w-6 h-6 rounded-full bg-blue-100 absolute border-4 border-blue-600"
                  style={{ left: `${((lineHeight - 1) / 1.5) * 100}%`, marginLeft: -12 }}
                />
                <ScrollView
                  horizontal
                  scrollEnabled={false}
                  contentContainerStyle={{ width: '100%', height: 40 }}
                  onTouchStart={(e) => {
                    const x = e.nativeEvent.locationX;
                    const width = Dimensions.get('window').width - 100;
                    const val = 1 + (x / width) * 1.5;
                    setLineHeight(val);
                    saveSettings({ lineHeight: val });
                  }}
                />
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
