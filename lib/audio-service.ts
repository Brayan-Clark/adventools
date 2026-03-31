export async function PlaybackService() {
    let TrackPlayer;
    let Event;
    try {
        const TP = require('react-native-track-player');
        TrackPlayer = TP.default || TP;
        Event = require('react-native-track-player').Event;
    } catch(e) { return; }

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, () => {
        TrackPlayer.skipToNext();
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
        TrackPlayer.skipToPrevious();
    });

    TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event: any) => {
        const position = await TrackPlayer.getPosition();
        await TrackPlayer.seekTo(position + event.interval);
    });

    TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event: any) => {
        const position = await TrackPlayer.getPosition();
        await TrackPlayer.seekTo(Math.max(0, position - event.interval));
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event: any) => {
        TrackPlayer.seekTo(event.position);
    });
}
