import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Folder, MonitorPlay, Music, BookOpen, AlertCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings } from '../../lib/settings-context';
import { useTranslation } from '../../lib/i18n';

const ICON_MAP = {
  MonitorPlay,
  Music,
  BookOpen,
  Folder
} as any;

export default function VideoHubScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();
  const { settings: globalSettings } = useSettings();
  const [folders, setFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchManifest();
  }, []);

  const fetchManifest = async () => {
    try {
      setIsLoading(true);
      setError(false);
      const url = `https://raw.githubusercontent.com/Brayan-Clark/adventools/data/video/manifest.json`;
      const response = await fetch(url);
      const data = await response.json();
      
      // Map icons string to component
      const processed = data.map((item: any) => ({
        ...item,
        icon: ICON_MAP[item.icon] || Folder
      }));
      
      setFolders(processed);
    } catch (e) {
      console.error("Video manifest error:", e);
      setError(true);
      // Fallback
      setFolders([
        { id: 'tv', title: t('live_tv'), icon: MonitorPlay, color: 'text-pink-500', bg: 'bg-pink-500/20', isStreaming: true },
        { id: 'musique', title: t('gospel_songs'), icon: Music, color: 'text-violet-500', bg: 'bg-violet-500/20', isStreaming: false },
        { id: 'etudes', title: t('video_bible_studies'), icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/20', isStreaming: false },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  const getTranslatedTitle = (folder: any) => {
    const lang = currentLang as string;
    if (lang === 'English' && folder.title_en) return folder.title_en;
    if (lang === 'Malagasy' && folder.title_mg) return folder.title_mg;
    if (lang === 'Deutsch' && folder.title_de) return folder.title_de;
    if (lang === 'Español' && folder.title_es) return folder.title_es;
    if (lang === 'Português' && folder.title_pt) return folder.title_pt;
    if (lang === '中文' && folder.title_zh) return folder.title_zh;
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
            {t('video_and_tv')}
          </Text>
        </View>

        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-slate-400 text-sm mb-6 leading-6" style={{ fontFamily }}>
           {t('video_description')}
        </Text>

        {isLoading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#ec4899" />
            <Text className="text-slate-500 text-xs mt-4" style={{ fontFamily }}>{t('loading')}</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between gap-y-4 mb-20">
            {folders.map((folder) => {
              const Icon = folder.icon;
              const title = getTranslatedTitle(folder);
              return (
                <TouchableOpacity
                  key={folder.id}
                  onPress={() => {
                    if (folder.id === 'ecole-de-sabbat') {
                        router.push('/video/sabbath-school');
                    } else {
                        router.push({
                            pathname: '/video/[collection]',
                            params: { collection: folder.id, title: title }
                        } as any);
                    }
                  }}
                  className="w-[48%] bg-slate-900 rounded-[24px] border border-slate-800 p-5 shadow-xl mb-4"
                >
                  <View className={`w-12 h-12 rounded-full ${folder.bg} items-center justify-center mb-4`}>
                    <Icon size={20} color={folder.color || (folder.bg.includes('pink') ? '#ec4899' : folder.bg.includes('violet') ? '#8b5cf6' : '#3b82f6')} />
                  </View>

                  <Text className="text-white font-bold text-base mb-1 leading-tight" style={{ fontFamily: fontFamilyBold }}>
                    {title}
                  </Text>

                  <View className="flex-row items-center mt-2">
                    <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-wider" style={{ fontFamily: fontFamilyBold }}>
                      {t('video') || 'Vidéo'}
                    </Text>
                    {folder.isStreaming && (
                      <Text className="text-red-500 text-[10px] uppercase font-bold tracking-wider ml-1" style={{ fontFamily: fontFamilyBold }}>
                        • LIVE
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
