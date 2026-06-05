import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import 'react-native-get-random-values';
import { widgetTaskHandler } from './widgets/widget-task-handler';

// Register the Android Widget background task
registerWidgetTaskHandler(widgetTaskHandler);

// Register the background playback service for React Native Track Player.
try {
  const TP = require('react-native-track-player');
  const TrackPlayer = TP.default || TP;
  // IMPORTANT: Use .default for the exported service task
  TrackPlayer.registerPlaybackService(() => require('./lib/audio-service').default);
} catch (e) {
  console.warn('[TrackPlayer] registerPlaybackService failed:', e);
}

export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
