'use client';

import { useEffect, useRef, useState } from 'react';
import { DataPacket_Kind } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import { TeacherVideoPublisher } from './TeacherVideoPublisher';
import { speakText } from '@/app/lib/aiTTS';

export default function TeacherVideoController() {
    const room = useRoomContext();

    const videoRef = useRef(null);
    const publisherRef = useRef(null);
    const publishedRef = useRef(false);

    const [videoFile, setVideoFile] = useState(null);
    const [videoURL, setVideoURL] = useState(null);

    const [popupName, setPopupName] = useState(null);

    // 🔒 Class control
    const [classStarted, setClassStarted] = useState(false);

    // 🎤 Student doubts (Removed — handled in Sidebar)

    /* ---------------- INIT ---------------- */
    useEffect(() => {
        if (!room) return;

        publisherRef.current = new TeacherVideoPublisher(room);

        // ⭐ IMPORTANT (student finds teacher using metadata)
        room.localParticipant.setMetadata(
            JSON.stringify({ role: 'teacher' })
        );
    }, [room]);

    /* ---------------- VIDEO FILE ---------------- */
    useEffect(() => {
        if (!videoFile) return;

        const url = URL.createObjectURL(videoFile);
        setVideoURL(url);

        // reset class state
        setClassStarted(false);
        publishedRef.current = false;
        setPopupName(null);

        return () => URL.revokeObjectURL(url);
    }, [videoFile]);

    /* ---------------- START CLASS ---------------- */
    const startClass = async () => {
        if (!videoRef.current || publishedRef.current) return;

        const ok = window.confirm('Do you want to start the class now?');
        if (!ok) return;

        try {
            // publish video track
            await publisherRef.current.publishVideo(videoRef.current);
            publishedRef.current = true;

            await videoRef.current.play();

            // notify students
            room.localParticipant.publishData(
                new TextEncoder().encode(
                    JSON.stringify({
                        action: 'VIDEO_START',
                        duration: videoRef.current.duration,
                    })
                ),
                { reliable: true }
            );

            setClassStarted(true);
            console.log('✅ Class started');
        } catch (e) {
            console.error('Error starting class', e);
        }
    };

    /* ---------------- LIVEKIT DATA ---------------- */
    useEffect(() => {
        if (!room) return;

        const handleData = async (payload, _participant, kind) => {
            if (kind !== DataPacket_Kind.RELIABLE) return;

            try {
                const msg = JSON.parse(new TextDecoder().decode(payload));

                /* ✋ HAND RAISE */
                if (msg.action === 'HAND_RAISE') {
                    setPopupName(msg.name);

                    const isPlaying =
                        classStarted &&
                        videoRef.current &&
                        !videoRef.current.paused;

                    // auto pause class video
                    if (isPlaying) {
                        videoRef.current.pause();

                        await speakText(
                             `${msg.name}, you raised your hand. Do you have any doubts? If so, please click the ‘Ask a Doubt’ button to submit your question.`
                        );
                    }

                    // auto hide popup
                    setTimeout(() => setPopupName(null), 4000);
                }
            } catch (e) {
                console.error('Invalid data message', e);
            }
        };

        room.on('dataReceived', handleData);
        return () => room.off('dataReceived', handleData);
    }, [room, classStarted]);

    const fileInputRef = useRef(null);

    return (
        <div style={{ position: 'relative' }}>
            {/* 🎥 Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                accept="video/*"
                onChange={e => setVideoFile(e.target.files[0])}
                style={{ display: 'none' }}
            />

            {/* 🎥 Circular Upload Button (styled like LiveKit controls) */}
            <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload Video Class"
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#222',
                    border: '1px solid #444',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    transition: 'background 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#333'}
                onMouseOut={(e) => e.currentTarget.style.background = '#222'}
            >
                📁
            </button>

            {/* 📺 Class Management Panel (Only visible after file picked) */}
            {(videoURL || classStarted) && (
                <div style={{
                    position: 'absolute',
                    bottom: 60,
                    left: 0,
                    width: 320,
                    background: '#111',
                    border: '1px solid #333',
                    borderRadius: 12,
                    padding: 16,
                    color: '#fff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    zIndex: 100,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h4 style={{ margin: 0 }}>👩‍🏫 Class Control</h4>
                        <button
                            onClick={() => { setVideoURL(null); setClassStarted(false); }}
                            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* 🎥 Video preview */}
                    {videoURL && (
                        <video
                            ref={videoRef}
                            src={videoURL}
                            controls
                            style={{
                                width: '100%',
                                borderRadius: 8,
                                maxHeight: 180,
                                background: '#000'
                            }}
                        />
                    )}

                    {/* ▶ Start Class */}
                    {videoURL && !classStarted && (
                        <button
                            onClick={startClass}
                            style={{
                                marginTop: 12,
                                width: '100%',
                                padding: '10px',
                                fontWeight: 'bold',
                                background: '#4CAF50',
                                color: '#fff',
                                borderRadius: 8,
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            ▶ Start Class
                        </button>
                    )}

                    {classStarted && (
                        <div style={{ marginTop: 10, color: '#4CAF50', fontWeight: 'bold', textAlign: 'center' }}>
                            🟢 Class handles active
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
