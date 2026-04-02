import TrackPlayer, { Event } from 'react-native-track-player';

export default async function PlaybackService() {
  console.log('[AUDIO-SERVICE] Background Task Started');
  
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log('[AUDIO-SERVICE] Event: RemotePlay');
    await TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log('[AUDIO-SERVICE] Event: RemotePause');
    await TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log('[AUDIO-SERVICE] Event: RemoteStop');
    await TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    await TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    await TrackPlayer.skipToPrevious();
  });
}
