import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import Constants from 'expo-constants';

try {
  const TrackPlayer = require('react-native-track-player');
  const { PlaybackService } = require('./lib/audio-service');
  TrackPlayer.registerPlaybackService(() => PlaybackService);
} catch (e) {
  console.warn("TrackPlayer initialization failed", e);
}

// https://docs.expo.dev/router/introduction/#dynamically-import-all-files-in-the-app-directory
export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
