import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Folder, MonitorPlay, Music, BookOpen } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings } from '../../lib/settings-context';
import { useTranslation } from '../../lib/i18n';

export default function VideoHubScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings: globalSettings } = useSettings();

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  const FOLDERS = [
    { id: 'tv', title: 'TV en direct', icon: MonitorPlay, color: 'text-pink-500', bg: 'bg-pink-500/20', isStreaming: true },
    { id: 'musique', title: 'Gospel Songs', icon: Music, color: 'text-violet-500', bg: 'bg-violet-500/20', isStreaming: false },
    { id: 'etudes', title: 'Études Bibliques', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/20', isStreaming: false },
  ];

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
            Vidéos & TV
          </Text>
        </View>

        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-slate-400 text-sm mb-6 leading-6" style={{ fontFamily }}>
           Sélectionnez une catégorie pour visionner le contenu multimédia.
        </Text>

        <View className="flex-row flex-wrap justify-between gap-y-4 mb-20">
          {FOLDERS.map((folder) => {
            const Icon = folder.icon;
            return (
              <TouchableOpacity
                key={folder.id}
                onPress={() => {
                  router.push({
                    pathname: '/video/[collection]',
                    params: { collection: folder.id, title: folder.title }
                  } as any);
                }}
                className="w-[48%] bg-slate-900 rounded-[24px] border border-slate-800 p-5 shadow-xl mb-4"
              >
                <View className={`w-12 h-12 rounded-full ${folder.bg} items-center justify-center mb-4`}>
                  <Icon size={20} color={folder.bg.includes('pink') ? '#ec4899' : folder.bg.includes('violet') ? '#8b5cf6' : '#3b82f6'} />
                </View>

                <Text className="text-white font-bold text-base mb-1 leading-tight" style={{ fontFamily: fontFamilyBold }}>
                  {folder.title}
                </Text>

                <View className="flex-row items-center mt-2">
                  <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-wider" style={{ fontFamily: fontFamilyBold }}>
                    Vidéo
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
      </ScrollView>
    </SafeAreaView>
  );
}
