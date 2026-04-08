import { Audio } from 'expo-av';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, Pause, Play, Rewind, FastForward, SkipBack, SkipForward, Repeat, Heart, List, Share2, Radio as RadioIcon } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View, Alert, Image, Dimensions, Animated, Platform, PermissionsAndroid, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../../lib/settings-context';
import { useTranslation } from '../../lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Images par défaut
const DEFAULT_BIBLE_IMAGE = require('../../assets/images/Livre.png');
const DEFAULT_APP_ICON = require('../../assets/images/icon.png');
const DEFAULT_REMOTE_LOGO = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/images/logo-player.png';

const { width } = Dimensions.get('window');

let TrackPlayer: any = null;
let AppKilledPlaybackBehavior: any = null;
let Capability: any = null;
let State: any = null;
try {
  const tpModule = require('react-native-track-player');
  TrackPlayer = tpModule.default || tpModule;
  AppKilledPlaybackBehavior = tpModule.AppKilledPlaybackBehavior;
  Capability = tpModule.Capability;
  State = tpModule.State;
} catch (e) {
  console.warn("TrackPlayer module not found", e);
}

// Standard Android Media Session action codes for reliability
const CAPABILITIES = {
  PLAY: Capability?.Play ?? 0,
  PAUSE: Capability?.Pause ?? 1,
  STOP: Capability?.Stop ?? 2,
  SKIP_NEXT: Capability?.SkipToNext ?? 3,
  SKIP_PREV: Capability?.SkipToPrevious ?? 4,
  SEEK: Capability?.SeekTo ?? 9,
  JUMP_FWD: Capability?.JumpForward ?? 11,
  JUMP_BWD: Capability?.JumpBackward ?? 12,
};


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
  // NOTE: We do NOT use useKeepAwake() here.
  // For radio playback, we WANT the screen to be able to turn off while audio
  // continues in the background via the RNTP foreground service.
  // useKeepAwake() would keep the screen on and drain battery.

  // Helper pour obtenir l'image correcte
  const getInitialArtwork = (p: any) => {
    if (p.artwork && p.artwork.startsWith('http')) return p.artwork;
    // On peut comparer avec la traduction ou une chaîne fixe si on sait que c'est de la bible
    if (p.subtext && (p.subtext.toLowerCase().includes('bible') || p.subtext.toLowerCase().includes('chant'))) {
      // Note: Le user a demandé Bible.png pour la bible
      if (p.subtext.toLowerCase().includes('bible')) return DEFAULT_BIBLE_IMAGE;
    }
    return DEFAULT_APP_ICON;
  };

  const getArtwork = (art: any, sub: string) => {
    if (art && typeof art === 'string' && art.startsWith('http')) return { uri: art };
    if (art && typeof art !== 'string') return art;
    if (sub && sub.toLowerCase().includes('bible')) return DEFAULT_BIBLE_IMAGE;
    return DEFAULT_APP_ICON;
  };

  const [currentTrack, setCurrentTrack] = useState({
    title: params.title,
    url: resolveAudioUrl(params.url),
    isLocal: params.isLocal === 'true',
    subtext: params.subtext,
    artist: params.artist,
    artwork: getInitialArtwork(params)
  });

  const playlist = useRef<any[]>(params.playlist ? JSON.parse(params.playlist).map((item: any) => ({
    ...item,
    artwork: (item.artwork && item.artwork.startsWith('http')) ? item.artwork :
      (item.subtext && item.subtext.toLowerCase().includes('bible')) ? DEFAULT_BIBLE_IMAGE : DEFAULT_APP_ICON
  })) : []);
  const currentIndex = useRef<number>(params.index ? parseInt(params.index) : -1);
  const [autoPlay, setAutoPlay] = useState(false);

  // Persistent Auto Play Setting
  useEffect(() => {
    const loadAutoPlay = async () => {
      try {
        const val = await AsyncStorage.getItem('audio_autoplay');
        if (val !== null) setAutoPlay(val === 'true');
      } catch (e) { }
    };
    loadAutoPlay();
  }, []);

  const saveAutoPlay = async (val: boolean) => {
    setAutoPlay(val);
    try {
      await AsyncStorage.setItem('audio_autoplay', val ? 'true' : 'false');
    } catch (e) { }
  };
  const [showPlaylist, setShowPlaylist] = useState(false);
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
  const syncIntervalRef = useRef<any>(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // ─── Extracted sync interval so it can be restarted from any code path ───
  const startSyncInterval = (TP: any) => {
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(async () => {
      try {
        if (!isTPActive.current) return;
        const pbState = await TP.getPlaybackState();
        const state = pbState.state ?? pbState;
        const currentIdx = await TP.getCurrentTrack();

        if (currentIdx !== null && currentIdx !== currentIndex.current && playlist.current[currentIdx]) {
          const next = playlist.current[currentIdx];
          currentIndex.current = currentIdx;
          setCurrentTrack({
            title: next.title,
            url: resolveAudioUrl(next.url),
            isLocal: next.isLocal,
            subtext: next.subtext || '',
            artist: next.artist,
            artwork: next.artwork // Déjà processé dans la playlist ref
          });
        }

        const isReallyPlaying = state === (State?.Playing ?? 'playing') || state === 'playing' || state === 3;
        const isReallyBuffering = state === (State?.Buffering ?? 'buffering') || state === 'buffering' || state === 6;

        setIsPlaying(isReallyPlaying);
        setIsBuffering(isReallyBuffering);

        const pos = await TP.getPosition();
        const dur = await TP.getDuration();
        if (pos !== undefined && !isNaN(pos)) setPosition(pos);
        if (dur !== undefined && !isNaN(dur) && dur > 0) setDuration(dur);
      } catch (_) { }
    }, 500);
  };

  useEffect(() => {
    initPlayer();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
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
    // 1. Request Notification Permission (Android 13+)
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: "Permission de notification",
            message: "Adventools a besoin d'afficher le lecteur dans la barre de notifications.",
            buttonNeutral: "Plus tard",
            buttonNegative: "Annuler",
            buttonPositive: "OK"
          }
        );
      } catch (e) { }
    }

    // 2. Try to initialize TrackPlayer (Requires Native APK)
    if (TrackPlayer) {
      try {
        const success = await setupTrackPlayer();
        if (success) {
          isTPActive.current = true;
          return; // Success!
        }
      } catch (e: any) {
        Alert.alert("Erreur Lecteur Natif", "Le lecteur haute performance n'a pas pu démarrer. Assurez-vous d'utiliser l'APK mis à jour.\n\nErreur: " + (e?.message || e));
      }
    }

    // 3. Last resort fallback
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
        interruptionModeAndroid: 1, // Interrupt
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
        async (status: any) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            setIsBuffering(status.isBuffering);
            setPosition(status.positionMillis / 1000);
            setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);

            if (status.didJustFinish && !status.isLooping) {
              // Read from storage for latest autoplay state
              try {
                const val = await AsyncStorage.getItem('audio_autoplay');
                if (val === 'true') {
                  handleTrackFinish();
                } else {
                  await newSound.pauseAsync();
                }
              } catch (_) {
                handleTrackFinish(); // Default to old behavior if storage fails
              }
            }
          }
        }
      );
      soundRef.current = newSound;
    } catch (e) { } finally { setIsBuffering(false); }
  };


  const setupTrackPlayer = async (): Promise<boolean> => {
    const TP = TrackPlayer;
    if (!TP) return false;

    // 1. Setup player (idempotent — OK if already initialized)
    try {
      await TP.setupPlayer({ waitForBuffer: true });
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (!msg.includes('already') && !msg.includes('initialized')) return false;
    }

    // 2. Configure capabilities & behaviour (RNTP v4 valid options only)
    try {
      await TP.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior?.ContinuePlayback ?? 1,
          notificationIntent: 'adventools:///audio/player',
          alwaysPauseOnInterruption: true,
        },
        progressUpdateEventInterval: 2,
        capabilities: [
          CAPABILITIES.PLAY, CAPABILITIES.PAUSE, CAPABILITIES.STOP,
          CAPABILITIES.SEEK, CAPABILITIES.SKIP_NEXT, CAPABILITIES.SKIP_PREV,
          CAPABILITIES.JUMP_FWD, CAPABILITIES.JUMP_BWD,
        ],
        compactCapabilities: [
          CAPABILITIES.PLAY, CAPABILITIES.PAUSE,
          CAPABILITIES.SKIP_NEXT, CAPABILITIES.SKIP_PREV,
        ],
        notificationCapabilities: [
          CAPABILITIES.PLAY, CAPABILITIES.PAUSE, CAPABILITIES.STOP,
          CAPABILITIES.SKIP_NEXT, CAPABILITIES.SKIP_PREV,
        ],
      });
    } catch (e: any) {
      return false;
    }

    // 3. Queue tracks and start playback
    try {
      const activeTrackIdx = await TP.getCurrentTrack();
      const activeTrack = activeTrackIdx !== null ? await TP.getTrack(activeTrackIdx) : null;

      // SYNC / NO-CUT LOGIC:
      // If we are already playing a track, just sync UI and don't reset
      if (activeTrack && (!currentTrack.url || activeTrack.url === currentTrack.url)) {
        setCurrentTrack({
          title: activeTrack.title,
          url: activeTrack.url,
          artist: activeTrack.artist || 'Adventools',
          artwork: (activeTrack.artwork && String(activeTrack.artwork).startsWith('http')) ? activeTrack.artwork :
            (activeTrack.artist && activeTrack.artist.toLowerCase().includes('bible')) ? DEFAULT_BIBLE_IMAGE : DEFAULT_APP_ICON,
          subtext: activeTrack.artist,
          isLocal: false
        });
        currentIndex.current = activeTrackIdx!;

        const queue = await TP.getQueue();
        if (queue && queue.length > 0) playlist.current = queue;

        setIsPlaying(true);
        isTPActive.current = true;
        // ✅ IMPORTANT: restart sync interval even when re-opening from notification
        startSyncInterval(TP);
        return true;
      }

      // Start a NEW session (RESET REQUIRED)
      if (!currentTrack.url && playlist.current.length === 0) return false;

      await TP.reset();

      const AGENT = USER_AGENT;
      if (playlist.current.length > 0) {
        const tracks = playlist.current.map((item: any, idx: number) => ({
          id: `track-${idx}`,
          url: resolveAudioUrl(item.url),
          title: item.title,
          artist: item.artist || item.subtext || 'Adventools',
          artwork: item.artwork,
          headers: { 'User-Agent': AGENT, 'Referer': 'https://www.hymnes.net/' },
        }));
        await TP.add(tracks);
        if (currentIndex.current >= 0 && currentIndex.current < tracks.length) {
          await TP.skip(currentIndex.current);
        }
      } else if (currentTrack.url) {
        await TP.add({
          id: 'track-0',
          url: currentTrack.url,
          title: currentTrack.title,
          artist: currentTrack.artist || currentTrack.subtext || 'Adventools',
          artwork: currentTrack.artwork,
          headers: { 'User-Agent': AGENT, 'Referer': 'https://www.hymnes.net/' },
        });
      }

      await TP.play();
      setIsPlaying(true);
    } catch (e: any) {
      return false;
    }

    // 4. Start interval via shared helper
    startSyncInterval(TP);

    return true;
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
        // ✅ Reset position/duration immediately so the bar doesn't freeze
        setPosition(0);
        setDuration(0);
        startSyncInterval(TrackPlayer);
      } else {
        const nextIdx = currentIndex.current + 1;
        const next = playlist.current[nextIdx];
        currentIndex.current = nextIdx;
        setPosition(0);
        setDuration(0);
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
        // ✅ Reset position/duration immediately so the bar doesn't freeze
        setPosition(0);
        setDuration(0);
        startSyncInterval(TrackPlayer);
      } else {
        const prevIdx = currentIndex.current - 1;
        const prev = playlist.current[prevIdx];
        currentIndex.current = prevIdx;
        setPosition(0);
        setDuration(0);
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
          State?.Playing,
          State?.Buffering,
          'playing',
          'buffering',
          3, // Playing (RNTP v3 numeric fallback)
          6  // Buffering (RNTP v3 numeric fallback)
        ].filter(Boolean);

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
    } catch (e) { }
  };

  const skipBackward = async () => {
    try {
      const currentPos = isTPActive.current ? await TrackPlayer.getPosition() : position;
      if (typeof currentPos !== 'number' || isNaN(currentPos)) return;
      const newPos = Math.max(0, currentPos - 15);
      if (isTPActive.current) await TrackPlayer.seekTo(newPos);
      else if (soundRef.current) await soundRef.current.setPositionAsync(newPos * 1000);
    } catch (e) { }
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
          source={typeof currentTrack.artwork === 'string' ? { uri: currentTrack.artwork } : currentTrack.artwork}
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

          {playlist.current.length > 0 ? (
            <TouchableOpacity
              onPress={() => setShowPlaylist(true)}
              className={`w-10 h-10 rounded-full items-center justify-center shadow-lg ${autoPlay ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-white/10 border border-white/20'}`}
            >
              <List size={20} color={autoPlay ? "#3b82f6" : "#f8fafc"} />
            </TouchableOpacity>
          ) : (
            <View className="w-10 h-10" />
          )}
        </View>

        <View className="flex-1 items-center justify-center px-8">
          {/* Spinning Artwork */}
          <Animated.View
            style={{ transform: [{ rotate: rotation }] }}
            className="w-64 h-64 bg-slate-900 rounded-full border-4 border-white/10 shadow-2xl items-center justify-center mb-12 overflow-hidden relative"
          >
            <Image
              source={typeof currentTrack.artwork === 'string' ? { uri: currentTrack.artwork } : currentTrack.artwork}
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

          {/* Main Controls - Enhanced with seek buttons */}
          <View className="w-full items-center mb-10">
            <View className="flex-row items-center justify-between w-full px-2">
              <TouchableOpacity onPress={playPrev} disabled={currentIndex.current <= 0} className={`w-12 h-12 items-center justify-center ${currentIndex.current <= 0 ? 'opacity-20' : 'opacity-100'}`}>
                <SkipBack size={28} color="#f8fafc" fill="#f8fafc" />
              </TouchableOpacity>

              <TouchableOpacity onPress={skipBackward} className="w-12 h-12 items-center justify-center bg-white/5 rounded-full border border-white/10">
                <Rewind size={22} color="#f8fafc" />
              </TouchableOpacity>

              <TouchableOpacity onPress={togglePlayPause} className="w-20 h-20 rounded-full bg-white items-center justify-center shadow-2xl mx-2">
                {(isBuffering && !isPlaying && currentTrack.subtext !== 'En direct') ? (
                  <ActivityIndicator color="#0f172a" size="large" />
                ) : isPlaying ? (
                  <Pause size={36} color="#0f172a" fill="#0f172a" />
                ) : (
                  <Play size={36} color="#0f172a" fill="#0f172a" className="ml-1" />
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={skipForward} className="w-12 h-12 items-center justify-center bg-white/5 rounded-full border border-white/10">
                <FastForward size={22} color="#f8fafc" />
              </TouchableOpacity>

              <TouchableOpacity onPress={playNext} disabled={currentIndex.current >= playlist.current.length - 1} className={`w-12 h-12 items-center justify-center ${currentIndex.current >= playlist.current.length - 1 ? 'opacity-20' : 'opacity-100'}`}>
                <SkipForward size={28} color="#f8fafc" fill="#f8fafc" />
              </TouchableOpacity>
            </View>

            {/* Seek labels */}
            <View className="flex-row justify-center w-full mt-2 gap-16">
              <Text className="text-white/20 text-[8px] font-black uppercase tracking-tighter w-12 text-center">-15s</Text>
              <View className="w-20" />
              <Text className="text-white/20 text-[8px] font-black uppercase tracking-tighter w-12 text-center">+15s</Text>
            </View>
          </View>

          {/* Auto Play Option */}
          <View className="w-full px-4 pt-4 border-t border-white/5">
            <TouchableOpacity
              onPress={() => saveAutoPlay(!autoPlay)}
              className={`flex-row items-center justify-between p-4 rounded-2xl border ${autoPlay ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/10'}`}
            >
              <View className="flex-row items-center">
                <View className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${autoPlay ? 'bg-indigo-500/20' : 'bg-white/10'}`}>
                  <Repeat size={16} color={autoPlay ? '#818cf8' : '#64748b'} />
                </View>
                <View>
                  <Text className={`text-sm font-bold ${autoPlay ? 'text-indigo-400' : 'text-slate-400'}`} style={{ fontFamily: fontFamilyBold }}>
                    LECTURE AUTOMATIQUE
                  </Text>
                  <Text className="text-[10px] text-slate-500" style={{ fontFamily: fontFamilyValue }}>
                    {autoPlay ? 'Passer au morceau suivant automatiquement' : 'S\'arrêter à la fin du morceau'}
                  </Text>
                </View>
              </View>
              <View className={`w-10 h-6 rounded-full px-1 justify-center ${autoPlay ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                <View className={`w-4 h-4 bg-white rounded-full ${autoPlay ? 'self-end' : 'self-start'}`} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Playlist Overlay */}
        {showPlaylist && (
          <View className="absolute inset-0 bg-slate-950 z-50">
            <SafeAreaView className="flex-1">
              <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/5">
                <Text className="text-white font-bold text-xl" style={{ fontFamily: fontFamilyBold }}>File d'attente</Text>
                <TouchableOpacity onPress={() => setShowPlaylist(false)} className="w-10 h-10 items-center justify-center rounded-full bg-white/5">
                  <ChevronDown size={24} color="#f8fafc" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={playlist.current}
                keyExtractor={(_, i) => `list-${i}`}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={async () => {
                      if (isTPActive.current) {
                        await TrackPlayer.skip(index);
                        await TrackPlayer.play();
                      } else {
                        currentIndex.current = index;
                        setCurrentTrack({
                          title: item.title,
                          url: resolveAudioUrl(item.url),
                          isLocal: item.isLocal || false,
                          subtext: item.subtext || currentTrack.subtext,
                          artist: item.artist,
                          artwork: item.artwork || 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/images/logo-player.png'
                        });
                      }
                      setShowPlaylist(false);
                    }}
                    className={`flex-row items-center p-3 rounded-2xl mb-2 ${index === currentIndex.current ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-white/5 border border-transparent'}`}
                  >
                    <View className="w-10 h-10 rounded-lg bg-slate-800 items-center justify-center overflow-hidden">
                      <Image source={getArtwork(item.artwork || currentTrack.artwork, item.subtext || currentTrack.subtext)} className="w-full h-full" />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className={`text-sm font-bold ${index === currentIndex.current ? 'text-blue-400' : 'text-white'}`} numberOfLines={1}>{item.title}</Text>
                      <Text className="text-xs text-slate-500" numberOfLines={1}>{item.artist || item.subtext}</Text>
                    </View>
                    {index === currentIndex.current && isPlaying && (
                      <ActivityIndicator size="small" color="#3b82f6" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </SafeAreaView>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
