/**
 * US-08: VideoPlayer — Extracted from notes.tsx for maintainability.
 * Self-contained video note playback component using expo-video.
 */
import React from 'react';
import { View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

interface VideoPlayerProps {
  uri: string;
}

export const VideoPlayer = ({ uri }: VideoPlayerProps) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  return (
    <View className="mb-4 rounded-[32px] overflow-hidden border border-white/10 bg-black">
      <VideoView
        player={player}
        nativeControls
        contentFit="contain"
        style={{ width: '100%', height: 250 }}
      />
    </View>
  );
};
