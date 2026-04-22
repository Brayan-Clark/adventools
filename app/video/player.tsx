import { useVideoPlayer, VideoView } from 'expo-video';
import { useKeepAwake } from 'expo-keep-awake';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Info, Maximize, Play, Pause } from 'lucide-react-native';
import React, { useState, useRef } from 'react';
import { Text, TouchableOpacity, View, Dimensions, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../lib/settings-context';
import { useTranslation } from '../../lib/i18n';

const { width } = Dimensions.get('window');

export default function UniversalVideoPlayer() {
  useKeepAwake();
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams() as any;
  const { url, title, subtext } = params;

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.play();
  });

  // Handle headers and changes
  React.useEffect(() => {
    if (!isStreaming) {
      player.replace({
        uri: url,
        metadata: { title },
        headers: {
          'User-Agent': 'ExoPlayer',
          'Referer': 'https://3abnplus.tv/'
        }
      });
    }
  }, [url]);

  // Sync state
  React.useEffect(() => {
    const subscription = player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying);
    });
    const statusSub = player.addListener('statusChange', (event) => {
      if (event.status === 'readyToPlay') setIsLoading(false);
    });
    return () => {
      subscription.remove();
      statusSub.remove();
    };
  }, [player]);

  const { settings: globalSettings } = useSettings();
  const fontFamilyBold = 'Lexend_700Bold';
  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;

  const isYouTube = url?.includes('youtube.com') || url?.includes('youtu.be');
  const isVimeo = url?.includes('vimeo.com');
  const isWebStream = params.isWebStream === 'true';
  const isStreaming = isYouTube || isVimeo || isWebStream;

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getVimeoId = (url: string) => {
    const regExp = /vimeo\.com\/(?:video\/)?(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const renderVideo = () => {
    if (isYouTube) {
      const id = getYouTubeId(url);
      return (
        <WebView
          style={{ flex: 1, backgroundColor: 'black' }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsFullscreenVideo={true}
          onLoadEnd={() => setIsLoading(false)}
          source={{ 
            uri: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&modestbranding=1&rel=0`,
            headers: { 'Referer': 'https://www.fanantenanahoanao.org/' }
          }}
        />
      );
    }

    if (isVimeo) {
      const id = getVimeoId(url);
      return (
        <WebView
          style={{ flex: 1, backgroundColor: 'black' }}
          javaScriptEnabled={true}
          onLoadEnd={() => setIsLoading(false)}
          source={{ uri: `https://player.vimeo.com/video/${id}?autoplay=1` }}
        />
      );
    }

    if (isWebStream) {
      return (
        <WebView
          style={{ flex: 1, backgroundColor: 'black' }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          onLoadEnd={() => setIsLoading(false)}
          source={{ uri: url }}
        />
      );
    }

    const isM3U8 = url?.toLowerCase().includes('.m3u8');

    return (
      <View className="flex-1 bg-black justify-center">
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%' }}
          nativeControls
          contentFit="contain"
          allowsFullscreen
        />
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <Stack.Screen options={{ headerShown: false, orientation: 'all' }} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/5">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 items-center justify-center"
        >
          <ChevronLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        
        <View className="flex-1 px-4 items-center">
          <Text className="text-white font-bold text-base text-center" style={{ fontFamily: fontFamilyBold }} numberOfLines={1}>{title || 'Video Player'}</Text>
          <Text className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-0.5" style={{ fontFamily }}>{subtext || 'Adventools Media'}</Text>
        </View>

        <TouchableOpacity className="w-10 h-10 rounded-full bg-white/5 border border-white/10 items-center justify-center">
          <Info size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Video Container */}
      <View className="flex-1 bg-black relative justify-center">
        {renderVideo()}
        
        {isLoading && (
          <View className="absolute inset-0 items-center justify-center bg-slate-950/50">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-white/40 text-[10px] mt-4 font-bold uppercase tracking-widest" style={{ fontFamily }}>{t('loading_stream')}</Text>
          </View>
        )}
      </View>

      {/* Footer Info (Only shown in portrait) */}
      <View className="p-8">
         <View className="bg-white/5 border border-white/10 p-5 rounded-3xl">
            <View className="flex-row items-center mb-4">
               <View className="w-2 h-2 rounded-full bg-blue-500 mr-3 shadow-lg shadow-blue-500/50" />
               <Text className="text-white font-bold text-sm" style={{ fontFamily: fontFamilyBold }}>{t('details_video')}</Text>
            </View>
            <Text className="text-white/60 text-xs leading-5" style={{ fontFamily }}>
               {t('video_source_info').replace('{{source}}', isYouTube ? 'YouTube' : isVimeo ? 'Vimeo' : isWebStream ? (t('online') || 'une chaîne partenaire') : (t('stored') || 'nos serveurs sécurisés'))}
            </Text>
         </View>
      </View>
    </SafeAreaView>
  );
}
