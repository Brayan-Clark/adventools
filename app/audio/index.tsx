import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Folder, PlayCircle, Headphones, Music, BookOpen } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings } from '../../lib/settings-context';
import { useTranslation } from '../../lib/i18n';

const ICON_MAP = {
  Music,
  BookOpen,
  Folder,
  Headphones,
  PlayCircle
} as any;

export default function AudioScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();
  const { settings: globalSettings } = useSettings();
  const [folders, setFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  useEffect(() => {
    fetchManifest();
  }, []);

  const fetchManifest = async () => {
    try {
      setIsLoading(true);
      const url = `https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/manifest.json`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFolders(data);
    } catch (e) {
      console.error("Audio manifest error:", e);
      // Fallback if fetch fails
      setFolders([
        { id: 'playbacks', title: t('hymns_audio'), count: 420, color: 'text-emerald-500', bg: 'bg-emerald-500/20', icon: 'Music' },
        { id: 'bible', title: t('bible_audio'), count: 66, color: 'text-amber-500', bg: 'bg-amber-500/20', icon: 'BookOpen' },
        { id: 'etudes', title: t('bible_studies'), count: 8, color: 'text-violet-500', bg: 'bg-violet-500/20', icon: 'Folder' },
        { id: 'radio', title: t('podcasts_streaming'), count: 1, color: 'text-blue-500', bg: 'bg-blue-500/20', isStreaming: true, icon: 'PlayCircle' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getTranslatedTitle = (folder: any) => {
    const lang = currentLang as string;
    if (lang === 'English' && folder.title_en) return folder.title_en;
    return folder.title;
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-4 border-b border-slate-800/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center"
        >
          <ChevronLeft size={20} color="#f8fafc" />
        </TouchableOpacity>

        <View className="flex-1 items-center justify-center px-2">
          <Text className="text-white font-bold text-lg" style={{ fontFamily: fontFamilyBold }}>
            {t('audio_praise')}
          </Text>
        </View>

        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-slate-400 text-sm mb-6 leading-6" style={{ fontFamily }}>
           {t('study_resources')}
        </Text>

        {isLoading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between gap-y-4 mb-20">
            {folders.map((folder) => {
              const Icon = ICON_MAP[folder.icon] || Folder;
              const title = getTranslatedTitle(folder);
              return (
                <TouchableOpacity
                  key={folder.id}
                  onPress={() => {
                    if (folder.id === 'radio') {
                      router.push('/audio/radio');
                    } else if (folder.id === 'bible') {
                      router.push('/audio/bible');
                    } else if (folder.id === 'playbacks') {
                      router.push('/audio/playbacks');
                    } else if (folder.id === 'etudes') {
                      router.push('/audio/etudes' as any);
                    } else if (folder.id === 'ecole-de-sabbat') {
                      router.push('/audio/sabbath-school');
                    }
                  }}
                  className="w-[48%] bg-slate-900 rounded-[24px] border border-slate-800 p-5 shadow-xl mb-4"
                >
                  <View className={`w-12 h-12 rounded-full ${folder.bg} items-center justify-center mb-4`}>
                    <Icon size={20} color={folder.bg.includes('emerald') ? '#10b981' : folder.bg.includes('amber') ? '#f59e0b' : folder.bg.includes('violet') ? '#8b5cf6' : folder.bg.includes('rose') ? '#f43f5e' : '#3b82f6'} />
                  </View>

                  <Text className="text-white font-bold text-base mb-1 leading-tight" style={{ fontFamily: fontFamilyBold }}>
                    {title}
                  </Text>

                  <View className="flex-row items-center mt-2">
                    {folder.isStreaming ? (
                      <PlayCircle size={12} color="#94a3b8" />
                    ) : (
                      <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-wider" style={{ fontFamily: fontFamilyBold }}>
                        Audio
                      </Text>
                    )}
                    {folder.isStreaming && (
                      <Text className="text-red-500 text-[10px] uppercase font-bold tracking-wider ml-1" style={{ fontFamily: fontFamilyBold }}>
                        LIVE
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
