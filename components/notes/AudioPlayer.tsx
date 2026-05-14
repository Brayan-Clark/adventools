/**
 * US-08: AudioPlayer — Extracted from notes.tsx for maintainability.
 * Self-contained voice note playback component.
 */
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Audio } from 'expo-av';
import { Pause, Play, Trash2 } from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';


interface AudioPlayerProps {
  uri: string;
  onDelete?: () => void;
}

export const AudioPlayer = ({ uri, onDelete }: AudioPlayerProps) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const playSound = async () => {
    if (sound) {
      await sound.playAsync();
      setIsPlaying(true);
      return;
    }
    const { sound: newSound } = await Audio.Sound.createAsync({ uri });
    setSound(newSound);
    newSound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.didJustFinish) setIsPlaying(false);
    });
    await newSound.playAsync();
    setIsPlaying(true);
  };

  const pauseSound = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  return (
    <View className="flex-row items-center mb-2">
      <TouchableOpacity
        onPress={isPlaying ? pauseSound : playSound}
        className="bg-white/5 p-4 rounded-3xl border border-white/10 flex-1 flex-row items-center"
      >
        <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
          {isPlaying ? <Pause size={18} color="#3b82f6" /> : <Play size={18} color="#3b82f6" />}
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-white font-bold text-xs">Vocal</Text>
          <Text className="text-white/40 text-[9px]">{isPlaying ? "Lecture en cours..." : "Cliquer pour écouter"}</Text>
        </View>
      </TouchableOpacity>

      {onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          className="ml-3 w-10 h-10 bg-red-500/10 rounded-2xl items-center justify-center border border-red-500/20"
        >
          <Trash2 size={18} color="#f87171" />
        </TouchableOpacity>
      )}
    </View>
  );
};
