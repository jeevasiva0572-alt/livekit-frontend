'use client';
import { useEffect, useRef, useState } from 'react';
import { useRoomContext, useRemoteParticipants } from '@livekit/components-react';
import { Track } from 'livekit-client';

export default function StudentVideoPanel() {
    const room = useRoomContext();
    const remoteParticipants = useRemoteParticipants();

    const videoRef = useRef(null);
    const containerRef = useRef(null);

    const [teacherParticipant, setTeacherParticipant] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showTeacherVideo, setShowTeacherVideo] = useState(false);
    const [videoTrack, setVideoTrack] = useState(null);

    /* ---------------- FIND TEACHER ---------------- */
    useEffect(() => {
        const teacher = remoteParticipants.find(p => {
            try { return JSON.parse(p.metadata || '{}').role === 'teacher'; }
            catch { return false; }
        });
        setTeacherParticipant(teacher || null);
    }, [remoteParticipants]);

    /* ---------------- MANAGE TRACK SUBSCRIPTION ---------------- */
    useEffect(() => {
        if (!teacherParticipant) {
            setVideoTrack(null);
            setShowTeacherVideo(false);
            return;
        }

        const isLessonVideoTrack = (track) => {
            if (track.kind !== Track.Kind.Video) return false;
            // ✅ The custom captureStream track is NOT from the camera.
            // Camera tracks have source === Camera; our captureStream track = Unknown.
            // Also accept by name as a secondary check.
            const bySource = track.source !== Track.Source.Camera;
            const byName = track.name === 'teacher-video';
            console.log(`🔍 Video track — source: ${track.source}, name: "${track.name}", bySource: ${bySource}, byName: ${byName}`);
            return bySource || byName;
        };

        const handleTrackSubscribed = (track) => {
            if (isLessonVideoTrack(track)) {
                console.log('🎥 Lesson video track subscribed — setting videoTrack');
                setVideoTrack(track);
            }
        };

        const handleTrackUnsubscribed = (track) => {
            if (isLessonVideoTrack(track)) {
                console.log('❌ Lesson video track unsubscribed');
                setVideoTrack(null);
                setShowTeacherVideo(false);
            }
        };

        teacherParticipant.on('trackSubscribed', handleTrackSubscribed);
        teacherParticipant.on('trackUnsubscribed', handleTrackUnsubscribed);

        // Late join: teacher already sharing — check existing subscribed tracks
        teacherParticipant.videoTrackPublications.forEach((pub) => {
            if (pub.isSubscribed && pub.track && isLessonVideoTrack(pub.track)) {
                console.log('🔄 Late join: found existing lesson video track');
                setVideoTrack(pub.track);
                setShowTeacherVideo(true); // Ensure viewer is visible on late join
            }
        });

        return () => {
            teacherParticipant.off('trackSubscribed', handleTrackSubscribed);
            teacherParticipant.off('trackUnsubscribed', handleTrackUnsubscribed);
        };
    }, [teacherParticipant]);

    /* ---------------- ATTACH VIDEO VIA srcObject ---------------- */
    // ✅ Always runs because videoRef.current always exists (element never unmounts)
    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        if (!videoTrack || !showTeacherVideo) {
            // Clear the player when not in use
            if (videoEl.srcObject) {
                videoEl.pause();
                videoEl.srcObject = null;
            }
            return;
        }

        const rawTrack = videoTrack.mediaStreamTrack;
        if (!rawTrack) {
            console.warn('⚠️ videoTrack has no mediaStreamTrack yet');
            return;
        }

        console.log('🔗 Attaching lesson video via srcObject. Track state:', rawTrack.readyState);

        const stream = new MediaStream([rawTrack]);
        videoEl.srcObject = stream;
        videoEl.muted = true; // keep muted for autoplay policy; audio handled by RoomAudioRenderer
        videoEl.play().catch(e => console.warn('Autoplay blocked:', e));

        return () => {
            videoEl.pause();
            videoEl.srcObject = null;
        };
    }, [videoTrack, showTeacherVideo]);

    /* ---------------- LIVEKIT SIGNALS ---------------- */
    useEffect(() => {
        if (!room) return;

        const handleData = payload => {
            try {
                const msg = JSON.parse(new TextDecoder().decode(payload));

                if (msg.action === 'VIDEO_START') {
                    console.log('📡 VIDEO_START — showing viewer, duration:', msg.duration);
                    setShowTeacherVideo(true);
                    if (isFinite(msg.duration) && msg.duration > 0) setDuration(msg.duration);
                }

                if (msg.action === 'VIDEO_STOP') {
                    console.log('📡 VIDEO_STOP — hiding viewer');
                    setShowTeacherVideo(false);
                    setVideoTrack(null);
                    setCurrentTime(0);
                    setDuration(0);
                }

                if (msg.action === 'VIDEO_TIME_UPDATE') {
                    setCurrentTime(msg.currentTime);
                    if (isFinite(msg.duration) && msg.duration > 0) {
                        setDuration(msg.duration);
                        setShowTeacherVideo(true); // Safety: reveal if we missed the start event
                    }
                }
            } catch { }
        };

        room.on('dataReceived', handleData);
        return () => room.off('dataReceived', handleData);
    }, [room]);

    const formatTime = s => {
        if (!isFinite(s) || s <= 0) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // ✅ ALWAYS render the container — hide via CSS (display:none), never unmount.
    // This ensures videoRef.current always exists when the track subscription fires,
    // preventing the timing race that caused the black screen.
    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '90vh',
                background: '#000',
                zIndex: 1,
                display: showTeacherVideo ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
            }}
        >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    background: '#000',
                }}
            />

            {/* ⏱ Time overlay */}
            <div style={{
                position: 'absolute',
                bottom: 4,
                left: 20,
                color: '#fff',
                padding: '6px 12px',
                fontFamily: 'monospace',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: 4,
                zIndex: 10,
            }}>
                {formatTime(currentTime)} / {formatTime(duration)}
            </div>
        </div>
    );
}
