import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Info, Type, AlignLeft, MoveHorizontal, Check, Palette, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '@/lib/settings-context';
import { cn } from '@/lib/utils';

export default function BibleSettings() {
  const router = useRouter();
  const { settings, updateSettings, isLoading } = useSettings();

  const fonts = [
    { label: 'Système', value: 'System' },
    { label: 'Rosemary', value: 'Rosemary' },
    { label: 'Choco', value: 'Choco' },
    { label: 'Cool', value: 'Cool' },
    { label: 'OpenSans', value: 'OpenSans' },
    { label: 'Alice', value: 'Alice' },
    { label: 'Comfortaa', value: 'Comfortaa' },
  ];

  if (isLoading) return null;

  const fontConfig = fonts.find(f => f.value === settings.fontFamily) || fonts[0];

  return (
    <SafeAreaView className="flex-1 bg-[#0f172a]">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/5">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10">
          <ChevronLeft size={20} color="#cbd5e1" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>
          Apparence
        </Text>
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10"
          onPress={() => Alert.alert("Aide", "Ces réglages s'appliquent à toute l'application.")}
        >
          <Info size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Preview Card - Stunning Design */}
        <View className="p-6">
          <View className="bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
            <View className="bg-white/5 px-6 py-3 border-b border-white/5 flex-row items-center">
              <Sparkles size={14} color="#3b82f6" className="mr-2" />
              <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aperçu du texte</Text>
            </View>
            <View className="p-8 bg-[#111621]">
              <Text style={{
                fontSize: settings.fontSize,
                lineHeight: settings.fontSize * settings.lineHeight,
                letterSpacing: settings.letterSpacing,
                fontFamily: settings.fontFamily === 'System' ? undefined : settings.fontFamily,
                color: '#cbd5e1'
              }}>
                [1] Tamin'ny voalohany Andriamanitra nahary ny lanitra sy ny tany. {"\n\n"}
                [2] Ary ny tany dia tsy nisy endrika sady foana; ary aizina no tambonin'ny lalina.
              </Text>
            </View>
          </View>
        </View>

        <View className="px-6 pb-20">
          {/* Font Selection - Grid style */}
          <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 ml-4">Police d'écriture</Text>
          <View className="flex-row flex-wrap gap-3 mb-8">
            {fonts.map((f) => (
              <TouchableOpacity
                key={f.value}
                onPress={() => updateSettings({ fontFamily: f.value })}
                className={cn(
                  "px-5 py-3 rounded-2xl border transition-all",
                  settings.fontFamily === f.value
                    ? "bg-primary border-primary shadow-lg shadow-primary/20"
                    : "bg-white/5 border-white/10"
                )}
              >
                <Text
                  className={cn("text-sm", settings.fontFamily === f.value ? "text-white font-bold" : "text-slate-400")}
                  style={{ fontFamily: f.value === 'System' ? undefined : f.value }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sliders Area */}
          <View className="bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-8">

            {/* Font Size */}
            <View>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-slate-200 font-bold">Taille du texte</Text>
                <Text className="text-primary font-bold">{settings.fontSize}px</Text>
              </View>
              <View className="flex-row items-center gap-4">
                <Text className="text-slate-500 text-xs">Aa</Text>
                <View className="flex-1 h-1.5 bg-slate-800 rounded-full relative justify-center">
                  <View
                    className="absolute h-full bg-primary rounded-full"
                    style={{ width: `${((settings.fontSize - 12) / 18) * 100}%` }}
                  />
                  <TouchableOpacity
                    activeOpacity={1}
                    className="w-6 h-6 rounded-full bg-white absolute shadow-lg shadow-black"
                    style={{ left: `${((settings.fontSize - 12) / 18) * 100}%`, marginLeft: -12 }}
                  />
                  <ScrollView
                    horizontal
                    scrollEnabled={false}
                    contentContainerStyle={{ width: '100%', height: 40 }}
                    onTouchStart={(e) => {
                      const x = e.nativeEvent.locationX;
                      const width = Dimensions.get('window').width - 110;
                      const val = Math.round(12 + (x / width) * 18);
                      updateSettings({ fontSize: Math.min(30, Math.max(12, val)) });
                    }}
                  />
                </View>
                <Text className="text-slate-200 text-lg font-bold">Aa</Text>
              </View>
            </View>

            {/* Line Height */}
            <View className="mt-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-slate-200 font-bold">Espacement des lignes</Text>
                <Text className="text-primary font-bold">{settings.lineHeight.toFixed(1)}</Text>
              </View>
              <View className="flex-row items-center gap-4">
                <AlignLeft size={16} color="#64748b" />
                <View className="flex-1 h-1.5 bg-slate-800 rounded-full relative justify-center">
                  <View
                    className="absolute h-full bg-primary rounded-full"
                    style={{ width: `${((settings.lineHeight - 1) / 1.5) * 100}%` }}
                  />
                  <TouchableOpacity
                    activeOpacity={1}
                    className="w-6 h-6 rounded-full bg-white absolute shadow-lg shadow-black"
                    style={{ left: `${((settings.lineHeight - 1) / 1.5) * 100}%`, marginLeft: -12 }}
                  />
                  <ScrollView
                    horizontal
                    scrollEnabled={false}
                    contentContainerStyle={{ width: '100%', height: 40 }}
                    onTouchStart={(e) => {
                      const x = e.nativeEvent.locationX;
                      const width = Dimensions.get('window').width - 110;
                      const val = 1 + (x / width) * 1.5;
                      updateSettings({ lineHeight: Number(val.toFixed(1)) });
                    }}
                  />
                </View>
                <AlignLeft size={22} color="#cbd5e1" />
              </View>
            </View>

            {/* Letter Spacing */}
            <View className="mt-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-slate-200 font-bold">Espacement des lettres</Text>
                <Text className="text-primary font-bold">{settings.letterSpacing.toFixed(1)}</Text>
              </View>
              <View className="flex-row items-center gap-4">
                <MoveHorizontal size={16} color="#64748b" />
                <View className="flex-1 h-1.5 bg-slate-800 rounded-full relative justify-center">
                  <View
                    className="absolute h-full bg-primary rounded-full"
                    style={{ width: `${((settings.letterSpacing + 1) / 4) * 100}%` }}
                  />
                  <TouchableOpacity
                    activeOpacity={1}
                    className="w-6 h-6 rounded-full bg-white absolute shadow-lg shadow-black"
                    style={{ left: `${((settings.letterSpacing + 1) / 4) * 100}%`, marginLeft: -12 }}
                  />
                  <ScrollView
                    horizontal
                    scrollEnabled={false}
                    contentContainerStyle={{ width: '100%', height: 40 }}
                    onTouchStart={(e) => {
                      const x = e.nativeEvent.locationX;
                      const width = Dimensions.get('window').width - 110;
                      const val = -1 + (x / width) * 4;
                      updateSettings({ letterSpacing: Number(val.toFixed(1)) });
                    }}
                  />
                </View>
                <MoveHorizontal size={22} color="#cbd5e1" />
              </View>
            </View>

          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
