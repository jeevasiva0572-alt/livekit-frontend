'use client';
// Refreshed code for build
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DataPacket_Kind } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import { TeacherVideoPublisher } from './TeacherVideoPublisher';
import './TeacherVideoController.css'; // Import custom styles
import { speakText } from '@/app/lib/aiTTS';
import { socket } from '../../../lib/socket';

export default function TeacherVideoController({
    videoFile,
    setVideoFile,
    videoURL,
    classStarted,
    startClass,
    stopClass,
    videoRef,
    studentDoubt,
    setStudentDoubt,
    aiAnswer,
    setAiAnswer
}) {
    const room = useRoomContext();
    const fileInputRef = useRef(null);
    const [loadingAI, setLoadingAI] = useState(false);

    /* AI */
    const askAI = async () => {
        if (!studentDoubt) return;

        setLoadingAI(true);
        try {
            const res = await fetch('http://localhost:3001/ask-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: studentDoubt.text }),
            });
            const data = await res.json();
            setAiAnswer(data.answer);
        } finally {
            setLoadingAI(false);
        }
    };

    return (
        <>
            <div className="teacher-controls">
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#9aa0a6' }}>Share a video lesson</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={e => setVideoFile(e.target.files[0])}
                        style={{ fontSize: '12px', color: '#e8eaed' }}
                    />
                </div>

                {videoURL && (
                    <>
                        {/* Only show preview if class HAS NOT started */}
                        {!classStarted && (
                            <div className="video-preview-container" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #3c4043', background: '#000', marginBottom: '12px' }}>
                                <video
                                    ref={videoRef}
                                    src={videoURL}
                                    playsInline
                                    controls
                                    style={{ width: '100%', display: 'block' }}
                                />
                            </div>
                        )}

                        {!classStarted ? (
                            <button
                                onClick={startClass}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    fontWeight: '500',
                                    background: '#8ab4f8',
                                    color: '#202124',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    marginTop: '10px'
                                }}
                            >
                                Start Presentation
                            </button>
                        ) : (
                            <button
                                onClick={stopClass}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    fontWeight: '500',
                                    background: '#ea4335',
                                    color: 'white',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    marginTop: '10px'
                                }}
                            >
                                Stop Presentation
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* 🎤 Sidebar Doubt & AI Area */}
            {(studentDoubt || aiAnswer) && (
                <div style={{
                    marginTop: '24px',
                    padding: '20px',
                    background: 'rgba(30, 41, 59, 0.4)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(138, 180, 248, 0.2)',
                    borderRadius: '16px',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
                }}>
                    {studentDoubt && (
                        <div style={{
                            marginBottom: aiAnswer ? 20 : 0,
                            padding: 16,
                            background: 'rgba(138, 180, 248, 0.08)',
                            borderLeft: '4px solid #8ab4f8',
                            borderRadius: '8px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <strong style={{ color: '#8ab4f8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    🎤 Received Doubt
                                </strong>
                                <span style={{ fontSize: '11px', color: '#94A3B8' }}>{studentDoubt.name}</span>
                            </div>
                            <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: '1.5', color: '#E2E8F0' }}>
                                {studentDoubt.text}
                            </p>

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <button
                                    onClick={askAI}
                                    disabled={loadingAI}
                                    style={{
                                        background: '#3c4043',
                                        border: '1px solid #5f6368',
                                        color: '#FFFFFF',
                                        padding: '6px 14px',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        flex: 1
                                    }}
                                >
                                    🤖 {loadingAI ? 'AI...' : 'Ask AI'}
                                </button>
                            </div>
                        </div>
                    )}

                    {aiAnswer && (
                        <div style={{
                            padding: 16,
                            background: 'rgba(129, 201, 149, 0.08)',
                            borderLeft: '4px solid #81c995',
                            borderRadius: '8px',
                            animation: 'slideUp 0.4s ease-out'
                        }}>
                            <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: '1.5', color: '#E2E8F0' }}>
                                {aiAnswer}
                            </p>
                            <button
                                onClick={() => speakText(aiAnswer)}
                                style={{
                                    background: '#1E40AF',
                                    border: 'none',
                                    color: '#FFFFFF',
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#1e3a8a'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#1E40AF'}
                            >
                                🔊 Broadcast Answer
                            </button>
                        </div>
                    )}
                    <style>{`
                        @keyframes slideUp {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </div>
            )}
        </>
    );
}
