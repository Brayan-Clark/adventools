import { Audio } from 'expo-av';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, Pause, Play, Rewind, FastForward } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { useSettings } from '../../lib/settings-context';

// Safe dynamic import to prevent crash in Expo Go
let TrackPlayer: any = null;
try {
  // Only try to require it if we are NOT in expo go or if we want to risk it
  // But for safety during dev, we'll mostly rely on expo-av
  if (Constants.appOwnership !== 'expo') {
    TrackPlayer = require('react-native-track-player');
  }
} catch (e) {
  // Silent fail
}

export default function AudioPlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as any;
  const { title, url, isLocal, subtext } = params;
  
  const { settings: globalSettings } = useSettings();
  const fontFamilyValue = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  // State for Player
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  // Fallback sound object (Expo-AV)
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    initPlayer();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [url]);

  const initPlayer = async () => {
    // If we're in a proper build and TrackPlayer is available
    if (TrackPlayer && TrackPlayer.default) {
      try {
        await setupTrackPlayer();
        return;
      } catch (e) {
        console.warn("TrackPlayer setup failed, falling back to Expo AV", e);
      }
    }

    // Fallback or Dev mode (Expo Go)
    await setupExpoAV();
  };

  const setupExpoAV = async () => {
    try {
      setIsBuffering(true);
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status: any) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            setIsBuffering(status.isBuffering);
            setPosition(status.positionMillis / 1000);
            setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
          }
        }
      );
      soundRef.current = newSound;
    } catch (e) {
      console.error("ExpoAV error:", e);
    } finally {
      setIsBuffering(false);
    }
  };

  const setupTrackPlayer = async () => {
    const TP = TrackPlayer.default || TrackPlayer;
    await TP.setupPlayer();
    await TP.updateOptions({
      capabilities: [1, 2, 3, 4, 10, 11] // Play, Pause, etc.
    });
    await TP.reset();
    await TP.add({
      id: 'track',
      url: url,
      title: title,
      artist: 'Adventools',
    });
    await TP.play();
  };

  const togglePlayPause = async () => {
    if (soundRef.current) {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    }
  };

  const skipForward = async () => {
    if (soundRef.current) await soundRef.current.setPositionAsync((position + 15) * 1000);
  };

  const skipBackward = async () => {
    if (soundRef.current) await soundRef.current.setPositionAsync(Math.max(0, position - 15) * 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
      
      <View className="flex-row items-center justify-between px-6 pt-4 pb-4">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center p-0"
        >
          <ChevronDown size={24} color="#f8fafc" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 items-center justify-center px-8 pb-10">
        <View className="w-full aspect-square bg-slate-900 rounded-[40px] border border-slate-800 shadow-2xl items-center justify-center mb-10 overflow-hidden">
             <View className="w-32 h-32 rounded-full bg-blue-500/10 border border-blue-500/20 items-center justify-center">
               <Text className="text-5xl">🎵</Text>
             </View>
        </View>

        <Text className="text-white font-bold text-2xl text-center mb-2" style={{ fontFamily: fontFamilyBold }} numberOfLines={2}>
          {title}
        </Text>
        <Text className="text-slate-400 text-sm text-center mb-12" style={{ fontFamily: fontFamilyValue }}>
          {subtext} {isLocal === 'true' && '(Hors ligne)'}
        </Text>

        <View className="w-full mb-10">
           <View className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
             <View className="h-full bg-blue-500 rounded-full" style={{ width: `${progressPercent}%` }} />
           </View>
           <View className="flex-row justify-between mt-3">
             <Text className="text-slate-500 text-xs font-medium tracking-wide" style={{ fontFamily: fontFamilyValue }}>{formatTime(position)}</Text>
             <Text className="text-slate-500 text-xs font-medium tracking-wide" style={{ fontFamily: fontFamilyValue }}>{formatTime(duration)}</Text>
           </View>
        </View>

        <View className="flex-row items-center justify-center w-full">
           <TouchableOpacity onPress={skipBackward} className="w-14 h-14 rounded-full bg-slate-900 items-center justify-center mx-4">
             <Rewind size={24} color="#94a3b8" />
           </TouchableOpacity>

           <TouchableOpacity onPress={togglePlayPause} className="w-20 h-20 rounded-full bg-blue-600 items-center justify-center shadow-lg shadow-blue-500/30">
             {isBuffering && !isPlaying ? (
               <ActivityIndicator color="white" size="large" />
             ) : isPlaying ? (
               <Pause size={32} color="#ffffff" fill="#ffffff" />
             ) : (
               <Play size={32} color="#ffffff" fill="#ffffff" className="ml-1" />
             )}
           </TouchableOpacity>

           <TouchableOpacity onPress={skipForward} className="w-14 h-14 rounded-full bg-slate-900 items-center justify-center mx-4">
             <FastForward size={24} color="#94a3b8" />
           </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
