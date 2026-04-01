import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, PlayCircle, Search, Tv } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useSettings } from '../../lib/settings-context';
import { useTranslation } from '../../lib/i18n';

interface VideoItem {
  id: string;
  title: string;
  description: string;
  image: string;
  url: string;
  isWebStream?: boolean;
  isGroup?: boolean;
}

export default function VideoCollectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as any;
  const { collection, title } = params;
  
  const { t } = useTranslation();
  const { settings: globalSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  // Pointing to different JSON manifests based on the collection param
  const MANIFEST_URL = `https://raw.githubusercontent.com/Brayan-Clark/adventools/data/video/collections/${collection}.json`;

  useEffect(() => {
    fetchVideos();
  }, [collection]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const networkState = await NetInfo.fetch();
      setIsConnected(networkState.isConnected);

      if (networkState.isConnected) {
        const response = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          setVideos(data || []);
        }
      }
    } catch (error) {
      console.error('Failed to load videos', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = videos.filter(v => 
     v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
            {title || t('video')}
          </Text>
        </View>
        <View className="w-10 h-10" />
      </View>

      <View className="px-6 pt-6">
        {/* Search */}
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 mb-6">
          <Search size={18} color="#64748b" />
          <TextInput 
            placeholder={t('search_video')} 
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-white text-sm"
            style={{ fontFamily }}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-slate-400 mt-4" style={{ fontFamily }}>{t('loading')}</Text>
          </View>
        ) : !isConnected && videos.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Text className="text-slate-400 text-center" style={{ fontFamily }}>{t('check_connection')}</Text>
          </View>
        ) : videos.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Text className="text-slate-400 text-center" style={{ fontFamily }}>{t('no_video_found')}</Text>
          </View>
        ) : (
          <View className="pb-20">
            {filteredVideos.map((video) => (
              <TouchableOpacity 
                key={video.id} 
                onPress={() => {
                  if (video.isGroup) {
                    router.push({
                      pathname: '/video/[collection]',
                      params: {
                        collection: video.id,
                        title: video.title
                      }
                    });
                  } else {
                    router.push({
                      pathname: '/video/player',
                      params: {
                        title: video.title,
                        url: video.url,
                        subtext: video.description,
                        isWebStream: video.isWebStream ? 'true' : 'false'
                      }
                    });
                  }
                }}
                activeOpacity={0.7}
                className="w-full mb-4 bg-slate-900 rounded-[20px] border border-slate-800 shadow-xl overflow-hidden p-4 flex-row items-center"
              >
                <View className="relative w-28 h-20 rounded-xl bg-slate-950/50 border border-slate-800 overflow-hidden mr-4">
                  <Image 
                    source={{ uri: video.image }} 
                    className="w-full h-full opacity-80"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 items-center justify-center bg-black/20">
                    <PlayCircle size={28} color="white" fill="rgba(0,0,0,0.5)" />
                  </View>
                </View>
                
                <View className="flex-1">
                  <Text className="text-white font-bold text-sm mb-1" style={{ fontFamily: fontFamilyBold }} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <Text className="text-slate-400 text-[10px] leading-4 mb-2" style={{ fontFamily }} numberOfLines={2}>
                    {video.description}
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-wider" style={{ fontFamily: fontFamilyBold }}>
                      {video.isGroup ? (t('folder') || 'Dossier') : (t('video') || 'Vidéo')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
