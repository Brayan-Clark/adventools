import { Audio } from 'expo-av';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, Pause, Play, Rewind, FastForward, SkipBack, SkipForward, Repeat, Heart, List, Share2, Radio as RadioIcon } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View, Alert, Image, Dimensions, Animated, Platform, PermissionsAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../../lib/settings-context';
import { useTranslation } from '../../lib/i18n';

const { width } = Dimensions.get('window');

// Safe dynamic import to prevent crash in Expo Go
let TrackPlayer: any = null;
let AppKilledPlaybackBehavior: any = null;
let Capability: any = null;
try {
  if (Constants.appOwnership !== 'expo') {
    const tpModule = require('react-native-track-player');
    TrackPlayer = tpModule.default || tpModule;
    AppKilledPlaybackBehavior = tpModule.AppKilledPlaybackBehavior;
    Capability = tpModule.Capability;
  }
} catch (e) {}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

const resolveAudioUrl = (url: string) => {
  if (!url) return url;
  if (url.includes('drive.google.com')) {
    const id = url.match(/\/d\/([^\/]+)\//) || url.match(/id=([^\&]+)/);
    if (id && id[1]) {
      return `https://drive.google.com/uc?export=download&id=${id[1]}`;
    }
  }
  return url;
};

export default function AudioPlayerScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams() as any;
  
  const [currentTrack, setCurrentTrack] = useState({
    title: params.title,
    url: resolveAudioUrl(params.url),
    isLocal: params.isLocal === 'true',
    subtext: params.subtext,
    artist: params.artist,
    artwork: params.artwork || 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/images/logo-player.png'
  });

  const playlist = useRef<any[]>(params.playlist ? JSON.parse(params.playlist) : []);
  const currentIndex = useRef<number>(params.index ? parseInt(params.index) : -1);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  const { settings: globalSettings } = useSettings();
  const fontFamilyValue = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const isTPActive = useRef(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initPlayer();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    }
  }, [currentTrack.url]);

  useEffect(() => {
    if (isPlaying) {
        startRotation();
    } else {
        stopRotation();
    }
  }, [isPlaying]);

  const startRotation = () => {
    Animated.loop(
        Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 20000,
            useNativeDriver: true
        })
    ).start();
  };

  const stopRotation = () => {
    rotateAnim.stopAnimation();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const initPlayer = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      } catch (e) {}
    }

    if (TrackPlayer && TrackPlayer.default) {
      try {
        await setupTrackPlayer();
        isTPActive.current = true;
        return;
      } catch (e) {
        console.warn("TrackPlayer setup failed", e);
      }
    }
    await setupExpoAV();
  };

  const setupExpoAV = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      setIsBuffering(true);
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { 
          uri: currentTrack.url,
          headers: { 
            'User-Agent': USER_AGENT,
            'Referer': 'https://www.hymnes.net/'
          }
        },
        { shouldPlay: true },
        (status: any) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            setIsBuffering(status.isBuffering);
            setPosition(status.positionMillis / 1000);
            setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
            
            if (status.didJustFinish && !status.isLooping) {
                handleTrackFinish();
            }
          }
        }
      );
      soundRef.current = newSound;
    } catch (e) {} finally { setIsBuffering(false); }
  };

  const setupTrackPlayer = async () => {
    const TP = TrackPlayer.default || TrackPlayer;
    try { await TP.setupPlayer(); } catch (e) {}

    await TP.updateOptions({
      stopWithApp: false,
      alwaysPauseOnInterruption: true,
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior ? AppKilledPlaybackBehavior.ContinuePlayback : 1,
      },
      capabilities: Capability ? [
        Capability.Play, Capability.Pause, Capability.Stop,
        Capability.SeekTo, Capability.SkipToNext, Capability.SkipToPrevious,
        Capability.JumpForward, Capability.JumpBackward,
      ] : [],
      compactCapabilities: Capability ? [Capability.Play, Capability.Pause, Capability.SkipToNext] : [],
      notificationCapabilities: Capability ? [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.Stop] : [],
    });

    await TP.reset();
    
    // If we have a playlist, add all tracks
    if (playlist.current.length > 0) {
        const tracks = playlist.current.map((item, idx) => ({
            id: `track-${idx}`,
            url: resolveAudioUrl(item.url),
            title: item.title,
            artist: item.artist || item.subtext || 'Adventools',
            artwork: item.artwork || 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/images/logo-player.png',
            headers: { 
              'User-Agent': USER_AGENT,
              'Referer': 'https://www.hymnes.net/'
            }
        }));
        await TP.add(tracks);
        if (currentIndex.current >= 0) {
            await TP.skip(currentIndex.current);
        }
    } else {
        await TP.add({
            id: 'single-track',
            url: resolveAudioUrl(currentTrack.url),
            title: currentTrack.title,
            artist: currentTrack.artist || currentTrack.subtext || 'Adventools',
            artwork: currentTrack.artwork,
            headers: { 
              'User-Agent': USER_AGENT,
              'Referer': 'https://www.hymnes.net/'
            }
        });
    }

    await TP.play();
    setIsPlaying(true);

    const sync = setInterval(async () => {
        try {
            const pbState = await TP.getPlaybackState();
            const state = pbState.state || pbState; // Handle both object and constant versions
            const currentIdx = await TP.getCurrentTrack();
            
            if (currentIdx !== null && currentIdx !== currentIndex.current && playlist.current[currentIdx]) {
                const next = playlist.current[currentIdx];
                currentIndex.current = currentIdx;
                setCurrentTrack({
                    title: next.title,
                    url: resolveAudioUrl(next.url),
                    isLocal: next.isLocal,
                    subtext: next.subtext || currentTrack.subtext,
                    artist: next.artist,
                    artwork: next.artwork || 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/images/logo-player.png'
                });
            }

            const isReallyPlaying = state === TP.State.Playing || state === 'playing' || state === 3;
            const isReallyBuffering = state === TP.State.Buffering || state === 'buffering' || state === 6;
            
            setIsPlaying(isReallyPlaying);
            setIsBuffering(isReallyBuffering);
            
            const pos = await TP.getPosition();
            const dur = await TP.getDuration();
            if (pos !== undefined) setPosition(pos);
            if (dur !== undefined && dur > 0) setDuration(dur);
        } catch (e) {}
    }, 500);
    return () => clearInterval(sync);
  };

  const handleTrackFinish = () => {
    if (autoPlay && playlist.current.length > 0 && currentIndex.current < playlist.current.length - 1) {
        playNext();
    }
  };

  const playNext = async () => {
    if (currentIndex.current < playlist.current.length - 1) {
        if (isTPActive.current) {
            await TrackPlayer.skipToNext();
            await TrackPlayer.play();
        } else {
            const nextIdx = currentIndex.current + 1;
            const next = playlist.current[nextIdx];
            currentIndex.current = nextIdx;
            setCurrentTrack({
                title: next.title,
                url: resolveAudioUrl(next.url),
                isLocal: next.isLocal || false,
                subtext: next.subtext || currentTrack.subtext,
                artist: next.artist,
                artwork: next.artwork || 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/images/logo-player.png'
            });
        }
    }
  };

  const playPrev = async () => {
    if (currentIndex.current > 0) {
        if (isTPActive.current) {
            await TrackPlayer.skipToPrevious();
            await TrackPlayer.play();
        } else {
            const prevIdx = currentIndex.current - 1;
            const prev = playlist.current[prevIdx];
            currentIndex.current = prevIdx;
            setCurrentTrack({
                title: prev.title,
                url: resolveAudioUrl(prev.url),
                isLocal: prev.isLocal || false,
                subtext: prev.subtext || currentTrack.subtext,
                artist: prev.artist,
                artwork: prev.artwork || 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/images/logo-player.png'
            });
        }
    }
  };

  const togglePlayPause = async () => {
    if (isTPActive.current) {
        try {
            const pbState = await TrackPlayer.getPlaybackState();
            const state = pbState.state || pbState;
            
            const playingStates = [
                TrackPlayer.State.Playing,
                TrackPlayer.State.Buffering,
                'playing',
                'buffering',
                3, // Playing
                6  // Buffering
            ];
            
            if (playingStates.includes(state)) {
                await TrackPlayer.pause();
                setIsPlaying(false);
            } else {
                await TrackPlayer.play();
                setIsPlaying(true);
            }
        } catch (e) {
            // Fallback: just toggle based on current local state
            if (isPlaying) await TrackPlayer.pause();
            else await TrackPlayer.play();
            setIsPlaying(!isPlaying);
        }
    } else if (soundRef.current) {
      if (isPlaying) await soundRef.current.pauseAsync();
      else await soundRef.current.playAsync();
    }
  };

  const skipForward = async () => {
    try {
        const currentPos = isTPActive.current ? await TrackPlayer.getPosition() : position;
        if (typeof currentPos !== 'number' || isNaN(currentPos)) return;
        const newPos = currentPos + 15;
        if (isTPActive.current) await TrackPlayer.seekTo(newPos);
        else if (soundRef.current) await soundRef.current.setPositionAsync(newPos * 1000);
    } catch (e) {}
  };

  const skipBackward = async () => {
    try {
        const currentPos = isTPActive.current ? await TrackPlayer.getPosition() : position;
        if (typeof currentPos !== 'number' || isNaN(currentPos)) return;
        const newPos = Math.max(0, currentPos - 15);
        if (isTPActive.current) await TrackPlayer.seekTo(newPos);
        else if (soundRef.current) await soundRef.current.setPositionAsync(newPos * 1000);
    } catch (e) {}
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View className="flex-1 bg-slate-950">
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
      
      {/* Background Atmosphere */}
      <View className="absolute inset-0">
          <Image 
            source={{ uri: currentTrack.artwork }} 
            className="absolute inset-0 opacity-30"
            blurRadius={80}
            resizeMode="cover"
          />
          <LinearGradient 
             colors={['rgba(15, 23, 42, 0.6)', 'rgba(15, 23, 42, 0.95)', 'rgb(15, 23, 42)']} 
             className="absolute inset-0"
          />
      </View>

      <SafeAreaView className="flex-1">
        {/* Header - Simple */}
        <View className="flex-row items-center justify-between px-6 pt-2 pb-6">
            <TouchableOpacity 
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-white/10 border border-white/20 items-center justify-center shadow-lg"
            >
                <ChevronDown size={24} color="#f8fafc" />
            </TouchableOpacity>
            
            <View className="items-center">
                <Text className="text-white/40 text-[9px] uppercase font-black tracking-[3px]" style={{ fontFamily: fontFamilyBold }}>LECTURE EN COURS</Text>
                <Text className="text-white text-xs font-bold mt-0.5" numberOfLines={1} style={{ fontFamily: fontFamilyBold }}>{currentTrack.subtext}</Text>
            </View>

            <TouchableOpacity className="w-10 h-10 rounded-full bg-white/10 border border-white/20 items-center justify-center shadow-lg">
                <List size={20} color="#f8fafc" />
            </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center px-8">
            {/* Spinning Artwork */}
            <Animated.View 
                style={{ transform: [{ rotate: rotation }] }}
                className="w-64 h-64 bg-slate-900 rounded-full border-4 border-white/10 shadow-2xl items-center justify-center mb-12 overflow-hidden relative"
            >
                <Image 
                    source={{ uri: currentTrack.artwork }} 
                    className="w-full h-full"
                    resizeMode="cover"
                />
                {currentTrack.subtext === 'En direct' && (
                    <View className="absolute inset-0 bg-slate-900/40 items-center justify-center">
                        <RadioIcon size={64} color="#f8fafc" />
                    </View>
                )}
            </Animated.View>

            {/* Track Info */}
            <View className="w-full mb-2">
                <Text className="text-white font-black text-2xl tracking-tight text-center" style={{ fontFamily: fontFamilyBold }} numberOfLines={1}>
                    {currentTrack.title}
                </Text>
                <Text className="text-blue-400 text-sm font-bold mt-1 text-center" style={{ fontFamily: fontFamilyValue }}>
                    {currentTrack.artist || 'Adventools'} {currentTrack.isLocal && ' • Offline'}
                </Text>
            </View>

            {/* Progress Bar */}
            <View className="w-full mt-10 mb-8">
               <View className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                 <View className="h-full bg-blue-500 rounded-full shadow-lg shadow-blue-500/50" style={{ width: `${progressPercent}%` }} />
               </View>
               <View className="flex-row justify-between mt-3">
                 <Text className="text-white/40 text-[10px] font-bold tracking-widest" style={{ fontFamily: fontFamilyValue }}>{formatTime(position)}</Text>
                 <Text className="text-white/40 text-[10px] font-bold tracking-widest" style={{ fontFamily: fontFamilyValue }}>{formatTime(duration)}</Text>
               </View>
            </View>

            {/* Main Controls */}
            <View className="flex-row items-center justify-between w-full px-2 mb-10">
                <TouchableOpacity onPress={() => setIsLiked(!isLiked)} className="w-12 h-12 items-center justify-center bg-white/5 rounded-2xl border border-white/10">
                    <Heart size={24} color={isLiked ? '#ef4444' : '#f8fafc'} fill={isLiked ? '#ef4444' : 'transparent'} />
                </TouchableOpacity>

                <View className="flex-row items-center">
                    <TouchableOpacity onPress={playPrev} disabled={currentIndex.current <= 0} className={`mx-4 ${currentIndex.current <= 0 ? 'opacity-20' : 'opacity-100'}`}>
                        <SkipBack size={32} color="#f8fafc" fill="#f8fafc" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={togglePlayPause} className="w-20 h-20 rounded-full bg-white items-center justify-center shadow-2xl mx-4 transform scale-110">
                        {(isBuffering && !isPlaying && currentTrack.subtext !== 'En direct') ? (
                            <ActivityIndicator color="#0f172a" size="large" />
                        ) : isPlaying ? (
                            <Pause size={36} color="#0f172a" fill="#0f172a" />
                        ) : (
                            <Play size={36} color="#0f172a" fill="#0f172a" className="ml-1" />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={playNext} disabled={currentIndex.current >= playlist.current.length - 1} className={`mx-4 ${currentIndex.current >= playlist.current.length - 1 ? 'opacity-20' : 'opacity-100'}`}>
                        <SkipForward size={32} color="#f8fafc" fill="#f8fafc" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity className="w-12 h-12 items-center justify-center bg-white/5 rounded-2xl border border-white/10">
                    <Share2 size={24} color="#f8fafc" />
                </TouchableOpacity>
            </View>

            {/* Secondary Controls Bar */}
            <View className="flex-row items-center justify-around w-full bg-white/5 border border-white/10 rounded-3xl py-4 px-6 mb-4">
                <TouchableOpacity onPress={skipBackward} className="items-center flex-1">
                    <Rewind size={22} color="#f8fafc" />
                    <Text className="text-white/40 text-[9px] font-black mt-1 uppercase tracking-tighter">-15s</Text>
                </TouchableOpacity>
                
                <View className="w-[1px] h-6 bg-white/10" />
                
                {/* Dedicated Next Action Label */}
                <TouchableOpacity onPress={playNext} disabled={currentIndex.current >= playlist.current.length - 1} className="items-center flex-1 px-2">
                     <Text className="text-blue-500 text-[10px] font-black uppercase tracking-[2px]">{t('next') || 'SUIVANT'}</Text>
                </TouchableOpacity>

                <View className="w-[1px] h-6 bg-white/10" />

                <TouchableOpacity onPress={skipForward} className="items-center flex-1">
                    <FastForward size={22} color="#f8fafc" />
                    <Text className="text-white/40 text-[9px] font-black mt-1 uppercase tracking-tighter">+15s</Text>
                </TouchableOpacity>

                <View className="w-[1px] h-6 bg-white/10" />

                <TouchableOpacity onPress={() => setAutoPlay(!autoPlay)} className="items-center flex-1">
                    <Repeat size={18} color={autoPlay ? '#10b981' : '#64748b'} />
                    <Text className={`text-[8px] font-black mt-1 uppercase ${autoPlay ? 'text-emerald-500' : 'text-slate-500'}`}>AUTO</Text>
                </TouchableOpacity>
            </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
