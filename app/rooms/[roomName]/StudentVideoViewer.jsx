'use client';
// Version: Fixed-Playback-1.1
import { useEffect, useRef, useState } from 'react';
import { useRoomContext, useLocalParticipant, useTracks, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';

export default function StudentVideoPanel({ isHero = false, ignoreLocal = false }) {
    const room = useRoomContext();
    const screenShareTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);
    const { localParticipant } = useLocalParticipant();

    const containerRef = useRef(null);
    const videoRef = useRef(null);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showTeacherVideo, setShowTeacherVideo] = useState(false);

    const presenterTrack = screenShareTracks.find(t => {
        if (ignoreLocal && t.participant === localParticipant) return false;
        return true;
    });

    useEffect(() => {
        console.log('📡 [StudentVideoViewer] Track Status:', {
            hasTracks: screenShareTracks.length > 0,
            presenterTrackFound: !!presenterTrack,
            isHero,
            showTeacherVideo
        });
    }, [screenShareTracks.length, !!presenterTrack, isHero, showTeacherVideo]);

    const [isPaused, setIsPaused] = useState(true);

    // Smooth local time advancement (UI only)
    useEffect(() => {
        if (isPaused || showTeacherVideo === false) return;
        const interval = setInterval(() => {
            setCurrentTime(prev => {
                if (prev >= duration && duration > 0) return prev;
                return prev + 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isPaused, showTeacherVideo, duration]);

    // Listen to teacher signals
    useEffect(() => {
        if (!room) return;

        const handleData = payload => {
            try {
                const msg = JSON.parse(new TextDecoder().decode(payload));

                if (msg.action === 'VIDEO_START' || msg.action === 'VIDEO_RESUME') {
                    if (!isHero) setShowTeacherVideo(true);
                    setIsPaused(false);
                    if (msg.duration && isFinite(msg.duration)) setDuration(msg.duration);
                    if (typeof msg.currentTime === 'number') setCurrentTime(msg.currentTime);
                }

                if (msg.action === 'VIDEO_STOP') {
                    if (!isHero) setShowTeacherVideo(false);
                    setIsPaused(true);
                }

                if (msg.action === 'VIDEO_TIME_UPDATE') {
                    if (msg.duration && isFinite(msg.duration) && msg.duration > 0) {
                        setDuration(msg.duration);
                    }
                    if (typeof msg.currentTime === 'number') {
                        const drift = Math.abs(currentTime - msg.currentTime);
                        // Only snap if drift is significant to avoid jumps
                        if (drift > 2.0) {
                            setCurrentTime(msg.currentTime);
                        }
                    }
                }

                if (msg.action === 'VIDEO_PAUSE') {
                    setIsPaused(true);
                    if (typeof msg.currentTime === 'number') setCurrentTime(msg.currentTime);
                }
            } catch { }
        };

        room.on('dataReceived', handleData);
        return () => room.off('dataReceived', handleData);
    }, [room, isHero, currentTime]);

    // Fullscreen
    useEffect(() => {
        const fs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', fs);
        return () => document.removeEventListener('fullscreenchange', fs);
    }, []);

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(() => { });
        } else {
            document.exitFullscreen();
        }
    };

    const formatTime = s => {
        if (!s || !isFinite(s) || s < 0) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    if (!showTeacherVideo && !isHero) {
        return <div style={{ minHeight: '10px' }} />;
    }

    // Use a unique key based on the track SID to force a complete remount of the video element
    const trackKey = presenterTrack?.publication?.trackSid || 'no-track';

    return (
        <div
            ref={containerRef}
            style={{
                position: isFullscreen ? 'fixed' : (isHero ? 'relative' : 'absolute'),
                top: isFullscreen ? 0 : (isHero ? 0 : 80),
                left: isFullscreen ? 0 : (isHero ? 0 : 20),
                width: isFullscreen ? '100vw' : (isHero ? '100%' : 420),
                height: isHero ? '100%' : 'auto',
                aspectRatio: '16/9',
                background: '#000',
                border: isHero ? 'none' : '2px solid #8ab4f8',
                zIndex: isFullscreen ? 9999 : 50,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}
        >
            {/* HUD Status */}
            {isHero && (
                <div style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    padding: '4px 8px',
                    background: 'rgba(0,0,0,0.6)',
                    color: presenterTrack?.publication?.track ? '#81c995' : '#f28b82',
                    fontSize: '10px',
                    borderRadius: '4px',
                    zIndex: 100,
                    border: '1px solid rgba(255,255,255,0.1)',
                    pointerEvents: 'none'
                }}>
                    Status: {presenterTrack?.publication?.track ? 'Connected' : 'Waiting...'}
                </div>
            )}

            {!isHero && (
                <div style={{ padding: '8px 12px', color: '#fff' }}>
                    <b>📺 Screen Share</b>
                    <button onClick={toggleFullscreen} style={{ float: 'right', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>⛶</button>
                </div>
            )}

            <div style={{ flex: 1, position: 'relative', background: '#000', overflow: 'hidden' }}>
                {presenterTrack?.publication?.track ? (
                    <VideoTrack
                        key={trackKey}
                        trackRef={presenterTrack}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                        }}
                    />
                ) : (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                        fontSize: '14px'
                    }}>
                        Waiting for host to share...
                    </div>
                )}
            </div>

            <div style={{
                color: '#fff',
                padding: '6px 12px',
                fontFamily: 'monospace',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                alignItems: 'center'
            }}>
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                <button onClick={toggleFullscreen} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>⛶</button>
            </div>
        </div>
    );
}
