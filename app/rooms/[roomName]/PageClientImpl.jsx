'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
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
import AttendanceSidebar from './AttendanceSidebar';
import VoiceDoubt from './VoiceDoubt';

import { HiOutlineHandRaised } from 'react-icons/hi2';

import QuizSidebar from './QuizSidebar';
import StudentQuizView from './StudentQuizView';

/* ---------------- TEACHER ONLY UI ---------------- */
function TeacherOnlyUI({
    doubts,
    onShowDoubts,
    onShowHistory,
    onShowAttendance,
    onShowQuiz,
    onGenerateQuiz,
    onEndMeeting,
    onClassStatusChange,
}) {
    const { localParticipant } = useLocalParticipant();

    let role = '';
    try {
        role = localParticipant?.metadata ? JSON.parse(localParticipant.metadata).role : '';
    } catch {
        role = localParticipant?.metadata || '';
    }

    if (role !== 'teacher') return null;

    const unreadCount = doubts.filter((d) => !d.answer).length;

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    bottom: 14,
                    left: 'calc(50% - 365px)',
                    zIndex: 100,
                }}
            >
                <TeacherVideoController onGenerateQuiz={onGenerateQuiz} onClassStatusChange={onClassStatusChange} />
            </div>

            <div
                style={{
                    position: 'absolute',
                    bottom: 14,
                    left: 'calc(50% + 365px)',
                    zIndex: 100,
                    display: 'flex',
                    gap: '12px',
                }}
            >
                <button
                    onClick={onShowHistory}
                    title="View History"
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                >
                    📜
                </button>

                <button
                    onClick={() => onShowAttendance && onShowAttendance()}
                    title="View Attendance"
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(33, 150, 243, 0.4)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                >
                    📋
                </button>

                <button
                    onClick={() => onShowQuiz && onShowQuiz()}
                    title="View Quiz Results"
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(76, 175, 80, 0.4)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                >
                    📝
                </button>

                <button
                    onClick={onShowDoubts}
                    title="Open AI Assistant"
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: unreadCount > 0 ? '#f44336' : 'rgba(33, 150, 243, 0.2)',
                        border: unreadCount > 0 ? 'none' : '1px solid rgba(33, 150, 243, 0.4)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        position: 'relative',
                        transition: 'all 0.2s',
                    }}
                >
                    {unreadCount > 0 ? '💬' : '🤖'}
                    {unreadCount > 0 && (
                        <span
                            style={{
                                position: 'absolute',
                                top: -5,
                                right: -5,
                                background: '#fff',
                                color: '#f44336',
                                borderRadius: '50%',
                                width: 20,
                                height: 20,
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {unreadCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => {
                        if (window.confirm('Are you sure you want to end the meeting for everyone?')) {
                            onEndMeeting && onEndMeeting();
                        }
                    }}
                    title="End Meeting for Everyone"
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'rgba(244, 67, 54, 0.2)',
                        border: '1px solid rgba(244, 67, 54, 0.4)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s',
                    }}
                >
                    🛑
                </button>
            </div>
        </>
    );
}

/* ---------------- STUDENT ONLY UI ---------------- */
function StudentOnlyUI({
    participants,
    showAI,
    setShowAI,
    doubtsWithAnswers,
    isHandRaised,
    onToggleHand,
    activeQuiz,
    onQuizSubmit,
    onCloseQuiz,
}) {
    const { localParticipant } = useLocalParticipant();
    const [showPeople, setShowPeople] = useState(false);

    let role = '';
    try {
        role = localParticipant?.metadata ? JSON.parse(localParticipant.metadata).role : '';
    } catch {
        role = localParticipant?.metadata || '';
    }

    if (role !== 'student') return null;

    return (
        <>
            <StudentVideoViewer />
            <VoiceDoubt />

            <div style={{ position: 'absolute', bottom: 14, left: 'calc(50% - 465px)', zIndex: 100 }}>
                <StudentHandRaise isHandRaised={isHandRaised} onToggle={onToggleHand} />
            </div>

            <div style={{ position: 'absolute', bottom: 14, right: 20, display: 'flex', alignItems: 'center', gap: 12, zIndex: 100 }}>
                {isHandRaised && <StudentTextDoubt />}

                <button
                    onClick={() => setShowPeople(!showPeople)}
                    style={{
                        padding: '0 16px',
                        height: 44,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 16,
                        fontWeight: 500,
                        fontFamily: 'Inter, sans-serif',
                    }}
                >
                    <span style={{ fontSize: 18 }}>👥</span>
                    People
                    <span
                        style={{
                            background: '#2196F3',
                            color: '#fff',
                            borderRadius: 10,
                            minWidth: 20,
                            height: 20,
                            padding: '0 6px',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                        }}
                    >
                        {participants.length}
                    </span>
                </button>
            </div>

            {activeQuiz && <StudentQuizView quiz={activeQuiz} onSubmit={onQuizSubmit} onClose={onCloseQuiz} />}
            {showPeople && <ParticipantList onClose={() => setShowPeople(false)} />}
        </>
    );
}

/* ---------------- MAIN ROOM CONTENT ---------------- */
function RoomContent() {
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();
    const room = useRoomContext();

    const [doubts, setDoubts] = useState([]);
    const [doubtsWithAnswers, setDoubtsWithAnswers] = useState([]);
    const [showAI, setShowAI] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showAttendance, setShowAttendance] = useState(false);
    const [attendance, setAttendance] = useState({});
    const [loadingAI, setLoadingAI] = useState(null);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [showQuizResults, setShowQuizResults] = useState(false);
    const [classSummary, setClassSummary] = useState(null);
    const [teacherClassStarted, setTeacherClassStarted] = useState(false);
    const [notifications, setNotifications] = useState([]); // Google Meet-style join/leave toasts

    let role = '';
    let meetingTopic = '';
    try {
        const metadata = localParticipant?.metadata ? JSON.parse(localParticipant.metadata) : {};
        role = metadata.role || '';
        meetingTopic = metadata.topic || '';
    } catch {
        role = localParticipant?.metadata || '';
    }

    // ✅ timers map
    const autoAskTimersRef = useRef({});
    // ✅ freeze map (EDIT mode)
    const editFreezeRef = useRef({}); // { [id]: true/false }

    const clearAutoAskTimer = (doubtId) => {
        const t = autoAskTimersRef.current[doubtId];
        if (t) clearTimeout(t);
        delete autoAskTimersRef.current[doubtId];
    };

    const scheduleAutoAsk = (doubtObj, delayMs = 10000) => {
        if (!doubtObj?.id) return;
        if (role !== 'teacher') return;

        clearAutoAskTimer(doubtObj.id);

        autoAskTimersRef.current[doubtObj.id] = setTimeout(() => {
            // ✅ IMPORTANT: if currently editing => DON'T auto send
            if (editFreezeRef.current[doubtObj.id]) {
                return; // stay frozen until SAVE
            }

            setDoubts((prev) => {
                const current = prev.find((d) => d.id === doubtObj.id);
                if (!current) return prev;
                if (current.answer) return prev;
                if (current.isBroadcasting) return prev;

                askAI(current);
                return prev;
            });

            clearAutoAskTimer(doubtObj.id);
        }, delayMs);
    };

    useEffect(() => {
        return () => {
            Object.values(autoAskTimersRef.current).forEach((t) => clearTimeout(t));
            autoAskTimersRef.current = {};
            editFreezeRef.current = {};
        };
    }, []);

    const NoComponent = useMemo(() => () => null, []);
    const customComponents = useMemo(
        () => ({
            Chat: NoComponent,
            ParticipantGrid:
                role === 'teacher' && teacherClassStarted ? NoComponent : role === 'teacher' ? undefined : NoComponent,
        }),
        [role, teacherClassStarted, NoComponent]
    );

    useEffect(() => {
        if (!room || role !== 'teacher') return;

        const updateParticipantStatus = (participant, eventType) => {
            const identity = participant.identity;
            let pRole = 'student';
            try {
                pRole = JSON.parse(participant.metadata || '{}').role || 'student';
            } catch { }

            setAttendance((prev) => {
                const now = Date.now();
                const existing = prev[identity] || {
                    identity,
                    role: pRole,
                    firstJoined: now,
                    lastJoined: now,
                    lastLeft: null,
                    totalStayTime: 0,
                    joinCount: 0,
                    status: 'online',
                };

                if (eventType === 'connected') {
                    return {
                        ...prev,
                        [identity]: {
                            ...existing,
                            lastJoined: now,
                            joinCount: (existing.joinCount || 0) + 1,
                            status: 'online',
                            role: pRole,
                        },
                    };
                } else if (eventType === 'disconnected') {
                    const stayDuration = now - (existing.lastJoined || existing.firstJoined || now);
                    return {
                        ...prev,
                        [identity]: {
                            ...existing,
                            lastLeft: now,
                            totalStayTime: (existing.totalStayTime || 0) + stayDuration,
                            status: 'offline',
                        },
                    };
                }
                return prev;
            });
        };

        room.remoteParticipants.forEach((p) => updateParticipantStatus(p, 'connected'));
        if (room.localParticipant) updateParticipantStatus(room.localParticipant, 'connected');

        const onConnected = (p) => {
            updateParticipantStatus(p, 'connected');
            // Toast notification (skip self)
            if (p.identity !== room.localParticipant?.identity) {
                const id = Date.now() + '-' + Math.random().toString(36).substr(2, 5);
                setNotifications((prev) => [...prev, { id, name: p.identity, type: 'joined' }]);
                setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
            }
        };
        const onDisconnected = (p) => {
            updateParticipantStatus(p, 'disconnected');
            if (p.identity !== room.localParticipant?.identity) {
                const id = Date.now() + '-' + Math.random().toString(36).substr(2, 5);
                setNotifications((prev) => [...prev, { id, name: p.identity, type: 'left' }]);
                setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
            }
        };

        room.on('participantConnected', onConnected);
        room.on('participantDisconnected', onDisconnected);

        return () => {
            room.off('participantConnected', onConnected);
            room.off('participantDisconnected', onDisconnected);
        };
    }, [room, role]);

    const askAI = async (doubt) => {
        if (!doubt) return;

        clearAutoAskTimer(doubt.id);

        setLoadingAI(doubt.id);
        try {
            const res = await fetch('http://localhost:3001/ask-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: doubt.text }),
            });
            const data = await res.json();
            const answer = data.answer || 'No answer received.';

            setDoubts((prev) => prev.map((d) => (d.id === doubt.id ? { ...d, answer } : d)));

            const answeredDoubt = { ...doubt, answer };
            setTimeout(() => sendToStudent(answeredDoubt), 500);
        } catch (e) {
            console.error('AI error', e);
        } finally {
            setLoadingAI(null);
        }
    };

    const sendToStudent = (doubt) => {
        if (!doubt?.answer || !room) return;

        clearAutoAskTimer(doubt.id);

        room.localParticipant.publishData(
            new TextEncoder().encode(
                JSON.stringify({
                    action: 'AI_ANSWER_BROADCAST',
                    id: doubt.id,
                    text: doubt.text,
                    answer: doubt.answer,
                    name: doubt.name,
                })
            ),
            { reliable: true }
        );

        setDoubts((prev) => prev.map((d) => (d.id === doubt.id ? { ...d, isBroadcasting: true } : d)));
    };

    const stopAIAudio = () => {
        if (!room) return;
        room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ action: 'STOP_AUDIO' })), {
            reliable: true,
        });
        stopSpeaking();
    };

    const resolveDoubt = (id) => {
        const doubt = doubts.find((d) => d.id === id);
        clearAutoAskTimer(id);
        delete editFreezeRef.current[id];

        if (doubt) {
            setDoubtsWithAnswers((prev) => {
                const exists = prev.find((h) => h.id === doubt.id);
                if (exists) return prev.map((h) => (h.id === doubt.id ? { ...h, answer: doubt.answer || h.answer } : h));
                return [...prev, { id: doubt.id, name: doubt.name, text: doubt.text, answer: doubt.answer }];
            });
        }
        setDoubts((prev) => prev.filter((d) => d.id !== id));
    };

    // ✅ EDIT CLICK => freeze + stop timer
    const handleEditStart = (id) => {
        editFreezeRef.current[id] = true;
        clearAutoAskTimer(id);
    };

    // ✅ SAVE => unfreeze + start 5 sec timer
    const handleSaveDoubt = (id, newText) => {
        setDoubts((prev) => prev.map((d) => (d.id === id ? { ...d, text: newText } : d)));
        setDoubtsWithAnswers((prev) => prev.map((h) => (h.id === id ? { ...h, text: newText } : h)));

        editFreezeRef.current[id] = false; // ✅ unfreeze

        const updated = doubts.find((d) => d.id === id);
        const doubtObj = updated ? { ...updated, text: newText } : { id, text: newText };

        scheduleAutoAsk(doubtObj, 5000); // ✅ save אחרי 5 sec auto ask
    };

    // old prop => treat as SAVE
    const updateDoubtText = (id, newText) => handleSaveDoubt(id, newText);

    /* QUIZ handlers (unchanged) */
    const handleGenerateQuiz = async () => {
        if (!room) return;

        const studentQuestions = doubtsWithAnswers.map((d) => d.text);
        const finalTopic = meetingTopic || 'General Class';

        try {
            const res = await fetch('http://localhost:3001/generate-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: finalTopic, studentQuestions, roomName: room.name }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Backend error message:', errorText);
                throw new Error(`Server returned ${res.status}: ${errorText.substring(0, 100)}`);
            }

            const data = await res.json();

            if (data.quizId) {
                room.localParticipant.publishData(
                    new TextEncoder().encode(
                        JSON.stringify({
                            action: 'QUIZ_START',
                            quiz: { id: data.quizId, topic: finalTopic, questions: data.questions },
                        })
                    ),
                    { reliable: true }
                );

                setActiveQuiz({ ...data, topic: finalTopic });
                setShowQuizResults(true);

                try {
                    const summaryRes = await fetch('http://localhost:3001/generate-summary', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ topic: finalTopic, studentQuestions }),
                    });
                    const summaryData = await summaryRes.json();
                    if (summaryData.summary) setClassSummary(summaryData.summary);
                } catch (summaryErr) {
                    console.error('Summary generation error', summaryErr);
                }

                alert('✅ Quiz generated and broadcast to all students!');
            }
        } catch (e) {
            console.error('Quiz generation error', e);
            alert('❌ Failed to generate quiz.');
        }
    };

    const handleQuizSubmit = async (answers) => {
        if (!activeQuiz || !localParticipant) return;
        try {
            const res = await fetch('http://localhost:3001/submit-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quizId: activeQuiz.id, studentName: localParticipant.identity, answers }),
            });
            return await res.json();
        } catch (e) {
            console.error('Quiz submission error', e);
            return null;
        }
    };

    const handleEndMeeting = async () => {
        if (!room) return;
        try {
            await fetch('http://localhost:3001/end-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomName: room.name }),
            });

            if (room.state !== 'disconnected') await room.disconnect();
            window.location.href = '/';
        } catch (e) {
            console.error('Failed to end meeting properly', e);
            window.location.href = '/';
        }
    };

    useEffect(() => {
        if (!room) return;

        const handleData = (payload) => {
            try {
                const msg = JSON.parse(new TextDecoder().decode(payload));

                if (msg.action === 'STUDENT_DOUBT' && role === 'teacher') {
                    const doubtId = msg.id || Date.now();
                    const newDoubt = { ...msg, id: doubtId };

                    setDoubts((prev) => [...prev, newDoubt]);

                    setDoubtsWithAnswers((prev) => {
                        if (prev.some((d) => d.id === doubtId)) return prev;
                        return [...prev, { id: doubtId, name: msg.name, text: msg.text, answer: null }];
                    });

                    // new doubt => not frozen
                    editFreezeRef.current[doubtId] = false;

                    scheduleAutoAsk(newDoubt, 10000);
                }

                if (msg.action === 'AI_ANSWER_BROADCAST') {
                    setDoubtsWithAnswers((prev) => {
                        const exists = prev.find((d) => d.id === msg.id);
                        if (exists) return prev.map((d) => (d.id === msg.id ? { ...d, answer: msg.answer } : d));
                        return [...prev, msg];
                    });

                    if (role === 'teacher') setShowAI(true);

                    if (msg.answer) {
                        const audioString = `${msg.name} asked: ${msg.text}. The answer is: ${msg.answer}`;
                        speakText(audioString).catch((err) => console.error('TTS error:', err));
                    }
                }

                if (msg.action === 'STOP_AUDIO') stopSpeaking();
                if (msg.action === 'QUIZ_START' && role === 'student') setActiveQuiz(msg.quiz);
            } catch { }
        };

        room.on('dataReceived', handleData);
        return () => room.off('dataReceived', handleData);
    }, [room, role]);

    return (
        <>
            <RoomAudioRenderer />

            {/* 🔔 Google Meet-style Join/Leave Notifications (Teacher Only) */}
            {role === 'teacher' && notifications.length > 0 && (
                <div
                    style={{
                        position: 'fixed',
                        top: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        pointerEvents: 'none',
                    }}
                >
                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            style={{
                                background: n.type === 'joined' ? 'rgba(30, 136, 229, 0.95)' : 'rgba(120, 120, 120, 0.92)',
                                color: '#fff',
                                padding: '10px 24px',
                                borderRadius: 24,
                                fontSize: 14,
                                fontWeight: 500,
                                fontFamily: 'Inter, Google Sans, sans-serif',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                animation: 'toastSlideIn 0.35s ease-out',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <span style={{ fontSize: 16 }}>{n.type === 'joined' ? '➡️' : '⬅️'}</span>
                            <b>{n.name}</b>{n.type} the meeting
                        </div>
                    ))}
                </div>
            )}

            {/* Toast animation keyframes */}
            <style>{`
        @keyframes toastSlideIn {
          0% { opacity: 0; transform: translateY(-20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

            <StudentOnlyUI
                participants={participants}
                showAI={showAI}
                setShowAI={setShowAI}
                doubtsWithAnswers={doubtsWithAnswers}
                isHandRaised={isHandRaised}
                onToggleHand={() => setIsHandRaised(!isHandRaised)}
                activeQuiz={role === 'student' ? activeQuiz : null}
                onQuizSubmit={handleQuizSubmit}
                onCloseQuiz={() => setActiveQuiz(null)}
            />

            {role === 'teacher' && showHistory && (
                <HistorySidebar doubtsWithAnswers={doubtsWithAnswers} right={0} onClose={() => setShowHistory(false)} />
            )}

            {role === 'teacher' && showAI && (
                <AISidebar
                    role={role}
                    doubts={doubts}
                    loadingAI={loadingAI}
                    onAskAI={askAI}
                    onSendToStudent={sendToStudent}
                    onStopAudio={stopAIAudio}
                    onEditStart={handleEditStart}     // ✅ EDIT -> freeze
                    onSaveDoubt={handleSaveDoubt}     // ✅ SAVE -> 5 sec auto
                    onUpdateDoubt={updateDoubtText}   // backup
                    onResolve={resolveDoubt}
                    onClose={() => setShowAI(false)}
                    right={showHistory ? 380 : 0}
                />
            )}

            {role === 'teacher' && showAttendance && (
                <AttendanceSidebar
                    attendance={attendance}
                    doubtsWithAnswers={doubtsWithAnswers}
                    classSummary={classSummary}
                    topic={meetingTopic}
                    onClose={() => setShowAttendance(false)}
                    right={showHistory || showAI ? 380 : 0}
                />
            )}

            {role === 'teacher' && showQuizResults && activeQuiz && (
                <QuizSidebar
                    quizId={activeQuiz.id || activeQuiz.quizId}
                    topic={activeQuiz.topic}
                    onClose={() => setShowQuizResults(false)}
                    right={showHistory || showAI || showAttendance ? 380 : 0}
                />
            )}

            <VideoConference components={customComponents} />

            <TeacherHandPanel />

            <TeacherOnlyUI
                doubts={doubts}
                onShowDoubts={() => setShowAI(true)}
                onShowHistory={() => setShowHistory(true)}
                onShowAttendance={() => setShowAttendance((prev) => !prev)}
                onShowQuiz={() => setShowQuizResults((prev) => !prev)}
                onGenerateQuiz={handleGenerateQuiz}
                onEndMeeting={handleEndMeeting}
                onClassStatusChange={setTeacherClassStarted}
            />
        </>
    );
}

/* ---------------- PAGE CLIENT ---------------- */
export function PageClientImpl({ token, url }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) return <p style={{ color: 'white', padding: 20 }}>Joining room…</p>;

    return (
        <LiveKitRoom
            token={token}
            serverUrl={url}
            connect={true}
            video={{ enabled: true }}
            audio={{ enabled: true }}
            data-lk-theme="default"
            style={{ height: '100vh', position: 'relative', background: '#000' }}
            onError={(error) => {
                console.error('LiveKit Room Error:', error);
                alert(`Connection Error: ${error.message}`);
            }}
        >
            <RoomContent />
        </LiveKitRoom>
    );
}