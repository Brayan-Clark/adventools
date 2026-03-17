import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, BookOpen, ChevronRight, List, Star, Heart } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UtilesIndex() {
  const { t } = useTranslation();
  const router = useRouter();

  const RESOURCES = [
    {
      id: 'croyances',
      title: t('beliefs'),
      subtitle: t('beliefs_subtitle'),
      icon: <Heart color="#ef4444" size={24} />,
      color: "bg-red-500/10",
      path: "/croyances"
    },
    {
      id: 'etude-serie',
      title: t('study_series'),
      subtitle: t('study_series_subtitle'),
      icon: <Star color="#3b82f6" size={24} />,
      color: "bg-blue-500/10",
      path: "/utiles/etude-serie"
    },
    {
      id: 'themes-divers',
      title: t('themes_divers'),
      subtitle: t('themes_divers_subtitle'),
      icon: <List color="#10b981" size={24} />,
      color: "bg-emerald-500/10",
      path: "/utiles/themes-divers"
    }
  ];

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-white/5">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10">
          <ArrowLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-white" style={{ fontFamily: 'Lexend_700Bold' }}>{t('tools')}</Text>
          <Text className="text-slate-500 text-xs">{t('study_resources')}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>

        {/* Banner with Image Reference */}
        <View className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 mb-8 overflow-hidden">
          <View className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full" />
          <Text className="text-primary font-bold mb-2">{t('personal_notes')}</Text>
          <Text className="text-slate-400 text-xs leading-5">{t('study_intro')}</Text>
        </View>

        <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">{t('folders_header')}</Text>

        <View className="pb-20">
          {RESOURCES.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(item.path as any)}
              className="bg-slate-900 mb-4 rounded-[24px] border border-slate-800 p-5 flex-row items-center"
            >
              <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${item.color}`}>
                {item.icon}
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base mb-0.5" style={{ fontFamily: 'Lexend_600SemiBold' }}>{item.title}</Text>
                <Text className="text-slate-500 text-xs">{item.subtitle}</Text>
              </View>
              <ChevronRight size={18} color="#475569" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
