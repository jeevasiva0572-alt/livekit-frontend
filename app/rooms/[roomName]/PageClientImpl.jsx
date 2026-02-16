'use client';
import { useEffect, useState } from 'react';
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
    useLocalParticipant,
    useParticipants,
    useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';

import StudentHandRaise from './StudentHandRaise';
import StudentTextDoubt from './StudentTextDoubt';
import TeacherHandPanel from './TeacherHandPanel';
import TeacherVideoController from './TeacherVideoController';
import StudentVideoViewer from './StudentVideoViewer';
import AISidebar from './AISidebar';

import ParticipantList from './ParticipantList';

import { speakText, stopSpeaking } from '@/app/lib/aiTTS';

import HistorySidebar from './HistorySidebar';

import { HiOutlineHandRaised } from "react-icons/hi2";

/* ---------------- TEACHER ONLY UI ---------------- */
function TeacherOnlyUI({ doubts, onShowDoubts, onShowHistory }) {
    const { localParticipant } = useLocalParticipant();

    let role = '';
    try {
        role = localParticipant?.metadata
            ? JSON.parse(localParticipant.metadata).role
            : '';
    } catch {
        role = localParticipant?.metadata || '';
    }

    if (role !== 'teacher') return null;

    const unreadCount = doubts.filter(d => !d.answer).length;

    return (
        <>
            {/* 📁 Teacher Upload/Class tool */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 14,
                    left: '50%',
                    transform: 'translateX(-365px)',
                    zIndex: 100,
                }}
            >
                <TeacherVideoController />
            </div>

            {/* 🔔 Notifications & History (Near Leave button) */}
            <div style={{
                position: 'absolute',
                bottom: 14,
                left: '50%',
                transform: 'translateX(365px)',
                zIndex: 100,
                display: 'flex',
                gap: '12px'
            }}>
                {/* 📜 History Button */}
                <button
                    onClick={onShowHistory}
                    title="View History"
                    style={{
                        width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                    📜
                </button>

                {/* 💬 AI Assistant / Doubt Notification */}
                <button
                    onClick={onShowDoubts}
                    title="Open AI Assistant"
                    style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: unreadCount > 0 ? '#f44336' : 'rgba(33, 150, 243, 0.2)',
                        border: unreadCount > 0 ? 'none' : '1px solid rgba(33, 150, 243, 0.4)',
                        color: '#fff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        position: 'relative',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = unreadCount > 0 ? '#d32f2f' : 'rgba(33, 150, 243, 0.4)'}
                    onMouseOut={(e) => e.currentTarget.style.background = unreadCount > 0 ? '#f44336' : 'rgba(33, 150, 243, 0.2)'}
                >
                    {unreadCount > 0 ? '💬' : '🤖'}
                    {unreadCount > 0 && (
                        <span style={{
                            position: 'absolute', top: -5, right: -5, background: '#fff',
                            color: '#f44336', borderRadius: '50%', width: 20, height: 20,
                            fontSize: '0.75rem', fontWeight: 'bold', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}>
                            {unreadCount}
                        </span>
                    )}
                </button>
            </div>
        </>
    );
}

/* ---------------- STUDENT ONLY UI ---------------- */
function StudentOnlyUI({ participants, showAI, setShowAI, doubtsWithAnswers, isHandRaised, onToggleHand }) {
    const { localParticipant } = useLocalParticipant();
    const [showPeople, setShowPeople] = useState(false);

    let role = '';
    try {
        role = localParticipant?.metadata
            ? JSON.parse(localParticipant.metadata).role
            : '';
    } catch {
        role = localParticipant?.metadata || '';
    }

    if (role !== 'student') return null;

    return (
        <>
            {/* 📺 Student video viewer (Full Screen Background) */}
            <StudentVideoViewer />

            {/* ✋ Hand raise - positioned BEFORE Microphone button */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 14,
                    left: '50%',
                    transform: 'translateX(-465px)',
                    zIndex: 100,
                }}
            >
                <StudentHandRaise isHandRaised={isHandRaised} onToggle={onToggleHand} />
            </div>

            {/* 🎤 Ask doubt & 👥 People - Right side controls */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 14,
                    right: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 100,
                }}
            >
                {/* 🤖 AI Sidebar Toggle removed for students */}

                {/* 💬 Ask doubt - ONLY VISIBLE IF HAND IS RAISED */}
                {isHandRaised && <StudentTextDoubt />}

                {/* 👥 People Button */}
                <button
                    onClick={() => setShowPeople(!showPeople)}
                    style={{
                        padding: '0 16px',
                        height: '44px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '16px',
                        fontWeight: 500,
                        fontFamily: 'Inter, sans-serif',
                        transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                >
                    <span style={{ fontSize: '18px' }}>👥</span>
                    People
                    <span style={{
                        background: '#2196F3',
                        color: '#fff',
                        borderRadius: '10px',
                        minWidth: '20px',
                        height: '20px',
                        padding: '0 6px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                    }}>
                        {participants.length}
                    </span>
                </button>
            </div>

            {/* 👥 Participant List Popup */}
            {showPeople && <ParticipantList onClose={() => setShowPeople(false)} />}
        </>
    );
}

/* ---------------- PAGE CLIENT ---------------- */
/* ---------------- MAIN ROOM CONTENT ---------------- */
function RoomContent() {
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();
    const [doubts, setDoubts] = useState([]); // Pending doubts (Teacher only)
    const [doubtsWithAnswers, setDoubtsWithAnswers] = useState([]); // Solved doubts (All)
    const [showAI, setShowAI] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [loadingAI, setLoadingAI] = useState(null);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const room = useRoomContext();

    let role = '';
    try {
        role = localParticipant?.metadata
            ? JSON.parse(localParticipant.metadata).role
            : '';
    } catch {
        role = localParticipant?.metadata || '';
    }

    // Listen for AI results and new doubts
    useEffect(() => {
        if (!room) return;
        const handleData = (payload) => {
            try {
                const msg = JSON.parse(new TextDecoder().decode(payload));

                // Teacher: Receive new doubts
                if (msg.action === 'STUDENT_DOUBT' && role === 'teacher') {
                    const doubtId = msg.id || Date.now();
                    const newDoubt = {
                        ...msg,
                        id: doubtId
                    };
                    setDoubts(prev => [...prev, newDoubt]);

                    // AUTO-COLLECT: Add to history immediately using ID
                    setDoubtsWithAnswers(prev => {
                        if (prev.some(d => d.id === doubtId)) return prev;
                        return [...prev, { id: doubtId, name: msg.name, text: msg.text, answer: null }];
                    });
                }

                // AI Result: Broadcast to everyone
                if (msg.action === 'AI_ANSWER_BROADCAST') {
                    // Everyone gets it in history
                    setDoubtsWithAnswers(prev => {
                        const exists = prev.find(d => d.id === msg.id);
                        if (exists) {
                            // Update the existing entry with the answer
                            return prev.map(d => (d.id === msg.id) ? { ...d, answer: msg.answer } : d);
                        }
                        return [...prev, msg];
                    });

                    // Only Teacher opens sidebar for active management
                    if (role === 'teacher') {
                        setShowAI(true);
                    }

                    // Everyone/Student gets audio
                    if (msg.answer) {
                        const audioString = `${msg.name} asked: ${msg.text}. The answer is: ${msg.answer}`;
                        speakText(audioString);
                    }
                }

                // STOP AI AUDIO
                if (msg.action === 'STOP_AUDIO') {
                    stopSpeaking();
                }
            } catch { }
        };
        room.on('dataReceived', handleData);
        return () => room.off('dataReceived', handleData);
    }, [room, role]);

    /* 👩‍🏫 Teacher Handlers (Centralized) */
    const askAI = async (doubt) => {
        if (!doubt) return;
        setLoadingAI(doubt.id);
        try {
            const res = await fetch('http://localhost:3001/ask-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: doubt.text }),
            });
            const data = await res.json();
            const answer = data.answer || 'No answer received.';

            // Store locally for teacher preview
            setDoubts(prev => prev.map(d => d.id === doubt.id ? { ...d, answer } : d));
        } catch (e) {
            console.error('AI error', e);
        } finally {
            setLoadingAI(null);
        }
    };

    const sendToStudent = (doubt) => {
        if (!doubt.answer || !room) return;

        room.localParticipant.publishData(
            new TextEncoder().encode(
                JSON.stringify({
                    action: 'AI_ANSWER_BROADCAST',
                    id: doubt.id,
                    text: doubt.text,
                    answer: doubt.answer,
                    name: doubt.name
                })
            ),
            { reliable: true }
        );

        // Mark as broadcasting instead of removing
        setDoubts(prev => prev.map(d => d.id === doubt.id ? { ...d, isBroadcasting: true } : d));
    };

    const stopAIAudio = () => {
        if (!room) return;
        room.localParticipant.publishData(
            new TextEncoder().encode(
                JSON.stringify({ action: 'STOP_AUDIO' })
            ),
            { reliable: true }
        );
        stopSpeaking(); // Also stop locally
    };

    const resolveDoubt = (id) => {
        const doubt = doubts.find(d => d.id === id);
        if (doubt) {
            // Ensure entry in history has the answer if available locally
            setDoubtsWithAnswers(prev => {
                const exists = prev.find(h => h.id === doubt.id);
                if (exists) {
                    return prev.map(h => (h.id === doubt.id) ? { ...h, answer: doubt.answer || h.answer } : h);
                }
                return [...prev, { id: doubt.id, name: doubt.name, text: doubt.text, answer: doubt.answer }];
            });
        }
        setDoubts(prev => prev.filter(d => d.id !== id));
    };

    const updateDoubtText = (id, newText) => {
        setDoubts(prev => prev.map(d => d.id === id ? { ...d, text: newText } : d));
        // Also update history to prevent duplicates
        setDoubtsWithAnswers(prev => prev.map(h => h.id === id ? { ...h, text: newText } : h));
    };

    return (
        <>
            {/* 🔊 REQUIRED: hear others */}
            <RoomAudioRenderer />

            {/* 🎥 Full screen Teacher Video renders here when active */}
            <StudentOnlyUI
                participants={participants}
                showAI={showAI}
                setShowAI={setShowAI}
                doubtsWithAnswers={doubtsWithAnswers}
                isHandRaised={isHandRaised}
                onToggleHand={() => setIsHandRaised(!isHandRaised)}
            />

            {/* 📜 Dedicated History Sidebar (Teacher Only) - Now on FAR RIGHT */}
            {role === 'teacher' && showHistory && (
                <HistorySidebar
                    doubtsWithAnswers={doubtsWithAnswers}
                    right={0}
                    onClose={() => setShowHistory(false)}
                />
            )}

            {/* 🤖 Centralized AI Sidebar (Teacher Only) - Shifting left if History is open */}
            {role === 'teacher' && showAI && (
                <AISidebar
                    role={role}
                    doubts={doubts}
                    loadingAI={loadingAI}
                    onAskAI={askAI}
                    onSendToStudent={sendToStudent}
                    onStopAudio={stopAIAudio}
                    onUpdateDoubt={updateDoubtText}
                    onResolve={resolveDoubt}
                    onClose={() => setShowAI(false)}
                    right={showHistory ? 380 : 0}
                />
            )}

            {/* 🎥 Control bar + Optional default logic */}
            <VideoConference
                components={{
                    Chat: () => null,
                    ParticipantGrid: role === 'student' ? () => null : undefined
                }}
            />

            {/* 👩‍🏫 Teacher hand raise list */}
            <TeacherHandPanel />

            {/* 👩‍🏫 Teacher-only controls & notifications */}
            <TeacherOnlyUI
                doubts={doubts}
                onShowDoubts={() => setShowAI(true)}
                onShowHistory={() => setShowHistory(true)}
            />
        </>
    );
}

/* ---------------- PAGE CLIENT ---------------- */
export function PageClientImpl({ token, url }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <p style={{ color: 'white', padding: 20 }}>Joining room…</p>;
    }

    return (
        <LiveKitRoom
            token={token}
            serverUrl={url}
            connect
            video
            audio
            data-lk-theme="default"
            style={{ height: '100vh', position: 'relative', background: '#000' }}
        >
            <RoomContent />
        </LiveKitRoom>
    );
}


