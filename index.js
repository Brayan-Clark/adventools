import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Register the background playback service for React Native Track Player.
try {
  const TP = require('react-native-track-player');
  const TrackPlayer = TP.default || TP;
  // IMPORTANT: Use .default for the exported service task
  TrackPlayer.registerPlaybackService(() => require('./lib/audio-service').default);
  console.log('[TrackPlayer] PlaybackService registered successfully');
} catch (e) {
  console.warn('[TrackPlayer] registerPlaybackService failed:', e);
}

export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
