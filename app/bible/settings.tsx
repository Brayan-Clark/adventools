import { useSettings } from '@/lib/settings-context';
import { cn } from '@/lib/utils';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlignLeft, ChevronLeft, Info, MoveHorizontal, Sparkles } from 'lucide-react-native';
import React from 'react';
import { Alert, PanResponder, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function ModernSlider({ value, min, max, onChange, step = 1 }: { value: number, min: number, max: number, onChange: (val: number) => void, step?: number }) {
  const [layoutWidth, setLayoutWidth] = React.useState(0);
  const widthRef = React.useRef(0);
  const propsRef = React.useRef({ min, max, onChange, step });

  React.useEffect(() => {
    propsRef.current = { min, max, onChange, step };
  }, [min, max, onChange, step]);

  const handleTouch = (x: number) => {
    const { min, max, onChange, step } = propsRef.current;
    if (widthRef.current <= 0) return;
    const percentage = Math.max(0, Math.min(1, x / widthRef.current));
    const rawValue = min + percentage * (max - min);
    const steppedValue = Math.round(rawValue / (step || 1)) * (step || 1);
    onChange(Number(steppedValue.toFixed(2)));
  };

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: (evt) => {
        handleTouch(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        handleTouch(evt.nativeEvent.locationX);
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <View
      className="flex-1 h-12 justify-center"
      style={{ paddingHorizontal: 0 }}
      {...panResponder.panHandlers}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setLayoutWidth(w);
        widthRef.current = w;
      }}
    >
      <View pointerEvents="none" className="h-1.5 bg-slate-800 rounded-full w-full relative justify-center">
        <View
          className="absolute h-full bg-primary rounded-full"
          style={{ width: `${percentage}%` }}
        />
        <View
          className="w-6 h-6 rounded-full bg-white absolute shadow-lg shadow-black"
          style={{ left: `${percentage}%`, marginLeft: -12 }}
        />
      </View>
    </View>
  );
}

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
            <View className="h-48 bg-[#111621]">
              <ScrollView className="p-8" showsVerticalScrollIndicator={true}>
                <Text style={{
                  fontSize: settings.fontSize,
                  lineHeight: settings.fontSize * settings.lineHeight,
                  letterSpacing: settings.letterSpacing,
                  fontFamily: settings.fontFamily === 'System' ? undefined : settings.fontFamily,
                  color: '#cbd5e1'
                }}>
                  [1] Tamin'ny voalohany Andriamanitra nahary ny lanitra sy ny tany. {"\n\n"}
                  [2] Ary ny tany dia tsy nisy endrika sady foana; ary aizina no tambonin'ny lalina. {"\n\n"}
                  [3] Ary Andriamanitra nanao hoe: "Misy mazava" ; dia nisy mazava. {"\n\n"}
                  [4] Ary hitan'Andriamanitra fa tsara ny mazava; ary nampisarahin'Andriamanitra ny mazava sy ny aizina.
                </Text>
              </ScrollView>
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
                <ModernSlider
                  value={settings.fontSize}
                  min={12} max={30}
                  onChange={(v) => updateSettings({ fontSize: v })}
                />
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
                <ModernSlider
                  value={settings.lineHeight}
                  min={1} max={2.5}
                  step={0.1}
                  onChange={(v) => updateSettings({ lineHeight: v })}
                />
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
                <ModernSlider
                  value={settings.letterSpacing}
                  min={-1} max={3}
                  step={0.1}
                  onChange={(v) => updateSettings({ letterSpacing: v })}
                />
                <MoveHorizontal size={22} color="#cbd5e1" />
              </View>
            </View>

          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
