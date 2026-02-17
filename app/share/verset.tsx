import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, Download, Copy, Instagram, Twitter, Facebook, MessageCircle, X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const BACKGROUNDS = [
  '#0f172a',
  'linear-gradient(to right, #4f46e5, #ec4899)', // Simulated gradient
  'linear-gradient(to bottom, #111827, #374151)',
  '#3b82f6',
  '#f59e0b',
  '#10b981',
];

// Fallback images for gradients in React Native
const GRADIENT_COLORS = [
  ['#0f172a', '#1e293b'],
  ['#4f46e5', '#ec4899'],
  ['#111827', '#374151'],
  ['#2563eb', '#60a5fa'],
  ['#d97706', '#fbbf24'],
  ['#059669', '#34d399'],
];

export default function ShareVerse() {
  const { verseText, verseRef } = useLocalSearchParams();
  const router = useRouter();
  const [selectedBg, setSelectedBg] = useState(0);

  // Default text if none provided
  const text = verseText ? decodeURIComponent(verseText as string) : "Car Dieu a tant aimé le monde qu'il a donné son Fils unique...";
  const reference = verseRef ? decodeURIComponent(verseRef as string) : "Jean 3:16";

  const handleShare = (platform: string) => {
    // Implement actual sharing logic here (using Share API or Linking)
    console.log(`Sharing to ${platform}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center backdrop-blur-md">
          <X size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">Partager le verset</Text>
        <TouchableOpacity className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center shadow-lg shadow-blue-600/30">
          <Share2 size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Preview Card */}
        <View className="items-center justify-center py-8 px-6">
          <LinearGradient
            colors={GRADIENT_COLORS[selectedBg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="w-full aspect-square rounded-[32px] p-8 justify-center items-center shadow-2xl shadow-black/50 border border-white/10 relative overflow-hidden"
          >
            {/* Decorative elements */}
            <View className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
            <View className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl -ml-6 -mb-6" />

            <View className="items-center">
              <Text className="text-white text-center font-serif text-2xl leading-9 italic mb-6 shadow-sm" style={{ fontFamily: 'serif' }}>
                "{text}"
              </Text>
              <View className="h-px w-12 bg-white/30 mb-6" />
              <Text className="text-white/80 font-bold tracking-widest uppercase text-sm">
                {reference}
              </Text>
            </View>

            <View className="absolute bottom-6 flex-row items-center opacity-60">
              <View className="w-4 h-4 rounded-full bg-white mr-2" />
              <Text className="text-white text-[10px] font-bold">ADVENTOOLS</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Customization Options */}
        <View className="px-6 mb-8">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 ml-1">Style de fond</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 px-2">
            {GRADIENT_COLORS.map((colors, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedBg(index)}
                className={`w-14 h-14 rounded-xl mr-3 border-2 ${selectedBg === index ? 'border-white scale-110' : 'border-transparent'} overflow-hidden shadow-lg`}
              >
                <LinearGradient colors={colors} className="flex-1" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Share Actions */}
        <View className="px-6">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 ml-1">Partager sur</Text>
          <View className="flex-row justify-between mb-4">
            <TouchableOpacity onPress={() => handleShare('instagram')} className="flex-1 bg-slate-800/50 py-4 rounded-2xl items-center mr-2 border border-slate-700/50">
              <Instagram size={24} color="#e1306c" className="mb-2" />
              <Text className="text-slate-300 text-xs font-medium">Stories</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleShare('whatsapp')} className="flex-1 bg-slate-800/50 py-4 rounded-2xl items-center mx-2 border border-slate-700/50">
              <MessageCircle size={24} color="#25D366" className="mb-2" />
              <Text className="text-slate-300 text-xs font-medium">WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleShare('facebook')} className="flex-1 bg-slate-800/50 py-4 rounded-2xl items-center ml-2 border border-slate-700/50">
              <Facebook size={24} color="#1877F2" className="mb-2" />
              <Text className="text-slate-300 text-xs font-medium">Facebook</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row justify-between">
            <TouchableOpacity onPress={() => handleShare('copy')} className="flex-1 bg-slate-800/80 py-4 rounded-2xl items-center mr-2 flex-row justify-center gap-2">
              <Copy size={18} color="white" />
              <Text className="text-white text-sm font-bold">Copier</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleShare('save')} className="flex-1 bg-slate-800/80 py-4 rounded-2xl items-center ml-2 flex-row justify-center gap-2">
              <Download size={18} color="white" />
              <Text className="text-white text-sm font-bold">Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
