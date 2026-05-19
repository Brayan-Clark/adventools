/**
 * US-08: AudioPlayer — Redesigned for Samsung Notes experience.
 * Self-contained premium voice note playback component with duration, progress bars and playback speed multipliers.
 */
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Pause, Play, Trash2, RotateCcw } from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';

interface AudioPlayerProps {
  uri: string;
  onDelete?: () => void;
}

export const AudioPlayer = ({ uri, onDelete }: AudioPlayerProps) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const loadSound = async () => {
    setIsLoading(true);
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, rate: rate, shouldCorrectPitch: true },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
    } catch (e) {
      console.error("Failed to load sound", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } else {
      await loadSound();
    }
  };

  const toggleRate = async () => {
    let nextRate = 1.0;
    if (rate === 1.0) nextRate = 1.5;
    else if (rate === 1.5) nextRate = 2.0;
    else nextRate = 1.0;

    setRate(nextRate);
    if (sound) {
      await sound.setRateAsync(nextRate, true);
    }
  };

  const resetSound = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      setPosition(0);
    }
  };

  const formatTime = (millis: number) => {
    if (!millis || isNaN(millis)) return '00:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View className="bg-white/5 border border-white/10 p-5 rounded-[28px] mb-3 flex-row items-center justify-between shadow-lg">
      <TouchableOpacity
        onPress={handlePlayPause}
        className="w-12 h-12 rounded-full bg-primary items-center justify-center border border-white/10"
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : isPlaying ? (
          <Pause size={18} color="white" fill="white" />
        ) : (
          <Play size={18} color="white" className="ml-0.5" fill="white" />
        )}
      </TouchableOpacity>

      <View className="flex-1 mx-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-white font-bold text-xs">Note Vocale</Text>
          <Text className="text-white/40 text-[10px]">
            {formatTime(position)} / {formatTime(duration || 0)}
          </Text>
        </View>
        <View className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <View
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-primary rounded-full"
          />
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={toggleRate}
          className="bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl min-w-[42px] items-center"
        >
          <Text className="text-primary font-bold text-[10px]">{rate.toFixed(1)}x</Text>
        </TouchableOpacity>

        {sound && (
          <TouchableOpacity
            onPress={resetSound}
            className="w-8 h-8 rounded-xl bg-white/5 items-center justify-center border border-white/5"
          >
            <RotateCcw size={14} color="#94a3b8" />
          </TouchableOpacity>
        )}

        {onDelete && (
          <TouchableOpacity
            onPress={onDelete}
            className="w-8 h-8 rounded-xl bg-red-500/10 items-center justify-center border border-red-500/20"
          >
            <Trash2 size={14} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
