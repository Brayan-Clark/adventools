import TrackPlayer, { Event } from 'react-native-track-player';
import { getSetting } from './user-storage';

export default async function PlaybackService() {

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    await TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    await TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    await TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    await TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    await TrackPlayer.skipToPrevious();
  });

  // Handle Auto-Play logic: stop after each track if disabled
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
    // If the track changed and it's not a manual skip
    if (event.track !== undefined && event.lastTrack !== undefined) {
      try {
        const autoPlay = await getSetting<any>('audio_autoplay', false);
        const isAutoPlayDisabled = autoPlay === false || autoPlay === 'false';
        if (isAutoPlayDisabled) {
          await TrackPlayer.pause();
        }
      } catch (e) {
        console.warn('[AUDIO-SERVICE] Failed to check auto-play state:', e);
      }
    }
  });
}
