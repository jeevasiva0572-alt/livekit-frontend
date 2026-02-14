'use client';
// Refreshed code for build (Professional icons, emojis removed)
// ✅ UPDATED: Google Meet-like grid behavior using JS-driven columns (no :has() rules)

import { useEffect, useState, useRef } from 'react';
import {
    LiveKitRoom,
    GridLayout,
    ParticipantTile,
    RoomAudioRenderer,
    useLocalParticipant,
    useTracks,
    useRoomContext,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

import {
    FiMic,
    FiMicOff,
    FiVideo,
    FiVideoOff,
    FiUsers,
    FiShield,
    FiMonitor,
} from 'react-icons/fi';
import { MdLogout } from 'react-icons/md';

import StudentHandRaise from './StudentHandRaise';
import StudentVoiceDoubt from './StudentVoiceDoubt';
import StudentVideoViewer from './StudentVideoViewer';
import ParticipantList from './ParticipantList';
import { TeacherVideoPublisher } from './TeacherVideoPublisher';
import { speakText } from '@/app/lib/aiTTS';
import { socket } from '../../../lib/socket';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import GreenRoom from './GreenRoom';
import { MdDriveFolderUpload } from 'react-icons/md';

/* ---------------- Meet-like Grid Hook ---------------- */
function pickCols(count, width) {
    // Mobile
    if (width <= 768) {
        if (count <= 2) return 1;
        return 2;
    }

    // Small laptop / tablet
    if (width <= 1024) {
        if (count <= 4) return 2;
        if (count <= 6) return 2; // keep faces big
        return 3;
    }

    // Laptop (1366–1440)
    if (width <= 1440) {
        if (count === 1) return 1;
        if (count === 2) return 2;
        if (count <= 4) return 2;
        if (count <= 6) return 2; // IMPORTANT: 5-6 => 2 cols on laptop
        if (count <= 9) return 3;
        return 4;
    }

    // Desktop
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    if (count <= 9) return 3;
    return 4;
}

/**
 * ✅ Sets:
 *  - .lk-grid-layout { --lk-cols: N }
 *  - .lk-grid-layout[data-count="X"]
 *
 * Works even when participants join/leave or container resizes.
 */
function useMeetGridLayout(wrapperRef) {
    useEffect(() => {
        const wrapper = wrapperRef?.current;
        if (!wrapper) return;

        const getGridEl = () => wrapper.querySelector('.lk-grid-layout');

        let ro;
        let mo;
        let rafId;

        const update = () => {
            const el = getGridEl();
            if (!el) return;

            const tiles = el.querySelectorAll('.lk-participant-tile');
            const count = tiles.length;

            el.setAttribute('data-count', String(count));

            const width = el.clientWidth || wrapper.clientWidth || window.innerWidth;
            const cols = pickCols(count, width);

            el.style.setProperty('--lk-cols', String(cols));
        };

        const safeUpdate = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(update);
        };

        safeUpdate();

        // Resize observer for layout changes
        ro = new ResizeObserver(safeUpdate);
        ro.observe(wrapper);

        // Mutation observer for participant changes
        mo = new MutationObserver(safeUpdate);
        mo.observe(wrapper, { childList: true, subtree: true });

        window.addEventListener('resize', safeUpdate);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', safeUpdate);
            if (ro) ro.disconnect();
            if (mo) mo.disconnect();
        };
    }, [wrapperRef]);
}

/* ---------------- PAGE CLIENT ---------------- */
export function PageClientImpl({ token: initialToken, url: initialUrl, roomName }) {
    const [token, setToken] = useState(initialToken);
    const [url, setUrl] = useState(initialUrl);
    const [mounted, setMounted] = useState(false);
    const [activeParticipants, setActiveParticipants] = useState([]);
    const [waitingParticipants, setWaitingParticipants] = useState([]);
    const [userRole, setUserRole] = useState(''); // 'teacher' or 'student'
    const [isPresenting, setIsPresenting] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [isAutoAccept, setIsAutoAccept] = useState(false);

    // Green Room State
    const [isPreJoin, setIsPreJoin] = useState(true);
    const [initialMediaState, setInitialMediaState] = useState({ mic: true, cam: true });

    const router = useRouter();

    // Combined initialization effect
    useEffect(() => {
        console.log('🚀 Initializing Room:', { roomName, hasInitialToken: !!initialToken });

        // Save props to sessionStorage if they exist (enables refresh persistence)
        if (initialToken) sessionStorage.setItem(`lk_token_${roomName}`, initialToken);
        if (initialUrl) sessionStorage.setItem(`lk_url_${roomName}`, initialUrl);

        let activeToken = token || initialToken;
        let activeUrl = url || initialUrl;

        if (!activeToken || !activeUrl) {
            const decodedRoom = decodeURIComponent(roomName);
            console.log('📝 Attempting to hydrate from sessionStorage for room:', decodedRoom);
            activeToken = sessionStorage.getItem(`lk_token_${decodedRoom}`);
            activeUrl = sessionStorage.getItem(`lk_url_${decodedRoom}`);

            if (activeToken && activeUrl) {
                console.log('✅ Hydrated from storage');
                setToken(activeToken);
                setUrl(activeUrl);
            } else {
                const keys = Object.keys(sessionStorage).filter((k) => k.startsWith('lk_'));
                console.error('❌ No credentials found!', {
                    roomName,
                    decodedRoom,
                    initialToken: !!initialToken,
                    initialUrl: !!initialUrl,
                    sessionToken: !!activeToken,
                    sessionUrl: !!activeUrl,
                    availableKeys: keys,
                });

                toast.error(`Missing credentials for room: ${decodedRoom}. Please join via Home.`, {
                    id: 'cred-error',
                    duration: 5000,
                });
            }
        }

        if (activeToken && activeUrl) {
            setMounted(true);

            // Connect socket
            if (!socket.connected) socket.connect();

            const onParticipantsUpdate = (data) => {
                console.log('👥 Participants Update Received:', data);
                setActiveParticipants(data.active || []);
                setWaitingParticipants(data.waiting || []);
            };

            const onWaitingRoomUpdate = (waitingList) => {
                console.log('⏳ Waiting Room Update Received:', waitingList);
                setWaitingParticipants(waitingList);
            };

            const onPresentationStart = () => {
                console.log('📺 Presentation Started');
                setIsPresenting(true);
            };

            const onPresentationStop = () => {
                console.log('🛑 Presentation Stopped');
                setIsPresenting(false);
            };

            const onKicked = () => {
                alert('You have been removed from the meeting.');
                router.push('/');
            };

            const onMeetingEnded = () => {
                alert('The host has ended the meeting.');
                router.push('/');
            };

            socket.on('update_participants', onParticipantsUpdate);
            socket.on('waiting_room_update', onWaitingRoomUpdate);
            socket.on('kicked', onKicked);
            socket.on('meeting_ended', onMeetingEnded);
            socket.on('presentation_start', onPresentationStart);
            socket.on('presentation_stop', onPresentationStop);

            const onRoomState = (state) => {
                console.log('🏠 Room State Received:', state);
                if (typeof state.isPresenting === 'boolean') setIsPresenting(state.isPresenting);
                if (typeof state.isLocked === 'boolean') setIsLocked(state.isLocked);
                if (typeof state.isAutoAccept === 'boolean') setIsAutoAccept(state.isAutoAccept);
            };
            socket.on('room_state', onRoomState);

            const onRoomStatusUpdate = (data) => {
                if (data.isLocked !== undefined) setIsLocked(data.isLocked);
                if (data.isAutoAccept !== undefined) setIsAutoAccept(data.isAutoAccept);
            };
            socket.on('room_status_update', onRoomStatusUpdate);

            // Rejoin logic
            try {
                const base64Url = activeToken.split('.')[1];
                if (!base64Url) throw new Error('Token is not a valid JWT (missing payload segment)');
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
                const payload = JSON.parse(atob(padded));
                const name = payload.sub || payload.identity;
                const metadata = JSON.parse(payload.metadata || '{}');
                const role = metadata.role || '';

                if (name && role) {
                    setUserRole(role);
                    console.log('🔑 Session Role Detected:', role, 'Name:', name);

                    const emitRejoin = () => {
                        console.log('📡 Emitting Rejoin Event...');
                        socket.emit('rejoin', { room: roomName, name, role });
                    };

                    if (socket.connected) emitRejoin();
                    else socket.once('connect', emitRejoin);
                }
            } catch (e) {
                console.error('Failed to decode token for rejoin', e);
            }

            // URL Cleanup
            if (typeof window !== 'undefined' && window.location.search) {
                const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
                window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
            }

            return () => {
                socket.off('update_participants', onParticipantsUpdate);
                socket.off('waiting_room_update', onWaitingRoomUpdate);
                socket.off('kicked', onKicked);
                socket.off('meeting_ended', onMeetingEnded);
                socket.off('presentation_start', onPresentationStart);
                socket.off('presentation_stop', onPresentationStop);
                socket.off('room_state', onRoomState);
                socket.off('room_status_update', onRoomStatusUpdate);
            };
        }
    }, [roomName, initialToken, initialUrl, token, url, router]);

    if (!mounted) {
        return (
            <div
                style={{
                    height: '100vh',
                    background: '#F1F5F9',
                    color: '#1E293B',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Inter, system-ui, sans-serif',
                }}
            >
                {!token || !url ? (
                    <div
                        style={{
                            textAlign: 'center',
                            maxWidth: '430px',
                            padding: '48px',
                            background: 'white',
                            borderRadius: '24px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            border: '1px solid #E2E8F0',
                        }}
                    >
                        <div
                            style={{
                                width: '64px',
                                height: '64px',
                                background: '#FEE2E2',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 24px',
                                color: '#EF4444',
                            }}
                        >
                            <FiShield size={32} />
                        </div>
                        <h2
                            style={{
                                color: '#0F172A',
                                fontSize: '24px',
                                fontWeight: '700',
                                marginBottom: '12px',
                                letterSpacing: '-0.5px',
                            }}
                        >
                            Access Denied
                        </h2>
                        <p style={{ color: '#64748B', fontSize: '16px', lineHeight: '1.5', marginBottom: '32px' }}>
                            Meeting credentials not found. To ensure security, please join through the home page.
                        </p>
                        <button
                            onClick={() => router.push('/')}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: '#2563EB',
                                border: 'none',
                                borderRadius: '12px',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '16px',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#1D4ED8')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#2563EB')}
                        >
                            Back to Home
                        </button>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div
                            className="spinner"
                            style={{
                                width: '48px',
                                height: '48px',
                                border: '4px solid #E2E8F0',
                                borderTop: '4px solid #2563EB',
                                borderRadius: '50%',
                                margin: '0 auto 24px',
                                animation: 'spin 1s linear infinite',
                            }}
                        />
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                        <h2 style={{ color: '#0F172A', fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                            Entering Room
                        </h2>
                        <p style={{ color: '#64748B', fontSize: '14px' }}>Preparing your professional classroom...</p>
                    </div>
                )}
            </div>
        );
    }

    if (isPreJoin) {
        return (
            <GreenRoom
                roomName={roomName}
                onJoin={(mediaState) => {
                    setInitialMediaState(mediaState);
                    setIsPreJoin(false);
                }}
            />
        );
    }

    return (
        <LiveKitRoom
            token={token}
            serverUrl={url}
            connect={true}
            video={initialMediaState.cam}
            audio={initialMediaState.mic}
            data-lk-theme="default"
            style={{ height: '100vh', position: 'relative' }}
        >
            <RoomContent
                isPresenting={isPresenting}
                userRole={userRole}
                activeParticipants={activeParticipants}
                waitingParticipants={waitingParticipants}
                roomName={roomName}
                isLocked={isLocked}
                isAutoAccept={isAutoAccept}
                setActiveParticipants={setActiveParticipants}
            />
        </LiveKitRoom>
    );
}

function RoomContent({
    isPresenting,
    userRole,
    activeParticipants,
    setActiveParticipants,
    waitingParticipants,
    roomName,
    isLocked,
    isAutoAccept,
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeSidebarTab, setActiveSidebarTab] = useState(userRole === 'teacher' ? 'presentation' : 'people');

    /* --- PERSISTENT TEACHER VIDEO ENGINE --- */
    const room = useRoomContext();
    const videoRef = useRef(null);
    const publisherRef = useRef(null);
    const publishedRef = useRef(false);
    const [videoFile, setVideoFile] = useState(null);
    const [videoURL, setVideoURL] = useState(null);
    const [classStarted, setClassStarted] = useState(false);
    const [studentDoubt, setStudentDoubt] = useState(null);
    const [aiAnswer, setAiAnswer] = useState('');

    // ✅ Wrapper ref for Meet grid hook
    const gridWrapperRef = useRef(null);
    useMeetGridLayout(gridWrapperRef);

    useEffect(() => {
        if (!room || userRole?.toLowerCase() !== 'teacher') return;
        publisherRef.current = new TeacherVideoPublisher(room);

        // Host notification (One time only)
        toast('You are Host', {
            duration: 3000,
            position: 'top-center'
        });
    }, [room, userRole]);

    // Listen for doubts and hand raises centrally
    useEffect(() => {
        if (!room) return;

        const handleData = (payload, participant) => {
            try {
                const msg = JSON.parse(new TextDecoder().decode(payload));
                const senderName = participant?.identity || msg.name || 'Student';

                if (msg.action === 'STUDENT_DOUBT') {
                    setStudentDoubt({ name: senderName, text: msg.text });
                    setAiAnswer('');

                    // speakText(`${senderName} says: ${msg.text}`);
                    toast(
                        (t) => (
                            <div
                                style={{
                                    maxWidth: '300px',
                                    maxHeight: '120px',
                                    overflowY: 'auto',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                <strong style={{ display: 'block', marginBottom: '6px' }}>
                                    ❓ Doubt from {senderName}
                                </strong>
                                <span style={{ fontSize: '14px', lineHeight: '1.4' }}>
                                    {msg.text}
                                </span>
                            </div>
                        ),
                        {
                            style: {
                                borderRadius: '12px',
                                background: '#1e1e1e',
                                color: '#fff',
                                border: '1px solid #8ab4f8',
                                padding: '12px',
                            },
                            duration: 5000,
                        }
                    );

                }

                if (msg.action === 'HAND_RAISE' && msg.raised) {
                    const studName = msg.name;
                    if (classStarted && videoRef.current) {
                        videoRef.current.pause();
                        room.localParticipant.publishData(
                            new TextEncoder().encode(
                                JSON.stringify({
                                    action: 'VIDEO_PAUSE',
                                    currentTime: videoRef.current.currentTime,
                                }),
                            ),
                            { reliable: true },
                        );
                    }
                    //AI Speech
                    speakText(`${studName}. Would you like to ask your doubt?`);
                }

            } catch (e) { }
        };

        room.on('dataReceived', handleData);

        const handleParticipantConnected = (participant) => {
            let role = 'student';
            try {
                if (participant.metadata) {
                    const meta = JSON.parse(participant.metadata);
                    role = meta.role || 'student';
                }
            } catch (e) { }

            // If a teacher joins, notify everyone (especially students)
            if (role === 'teacher') {
                toast.success('Teacher Active', {
                    duration: 5000,
                    position: 'top-center',
                    // icon: '👨‍🏫',
                });
            } else {
                toast.success(`${participant.identity} joined`, {
                    duration: 5000,
                    position: 'top-center',
                    style: { border: '1px solid #4ade80' },
                });
            }

            setActiveParticipants((prev) => {
                const list = prev || [];
                if (list.some((p) => p.name === participant.identity)) return list;
                return [...list, { name: participant.identity, role, id: participant.sid || Date.now() }];
            });
        };

        const handleParticipantDisconnected = (participant) => {
            toast.error(`${participant.identity} left`, {
                duration: 5000,
                position: 'top-center',
                style: { border: '1px solid #f87171' },
            });

            setActiveParticipants((prev) => (prev || []).filter((p) => p.name !== participant.identity));
        };

        room.on('participantConnected', handleParticipantConnected);
        room.on('participantDisconnected', handleParticipantDisconnected);

        // Teacher-only listeners moved down
        if (userRole?.toLowerCase() === 'teacher') {
            room.on('dataReceived', handleData);
        }

        return () => {
            room.off('dataReceived', handleData);
            room.off('participantConnected', handleParticipantConnected);
            room.off('participantDisconnected', handleParticipantDisconnected);
        };
    }, [room, userRole, classStarted]);

    useEffect(() => {
        if (!videoFile) return;
        const url = URL.createObjectURL(videoFile);
        setVideoURL(url);
        setClassStarted(false);
        publishedRef.current = false;
        return () => URL.revokeObjectURL(url);
    }, [videoFile]);

    const startClass = async () => {
        if (!videoRef.current || !room || !publisherRef.current) return;
        if (!window.confirm('Do you want to start the class now?')) return;

        try {
            // Force cleanup of any old tracks before publishing new ones
            await publisherRef.current.stopPublishing();
            publishedRef.current = false;

            setClassStarted(true);
        } catch (e) {
            console.error('Failed to prepare for class start:', e);
        }
    };

    const publishVideo = async () => {
        if (!videoRef.current || !room || !publisherRef.current) return;
        try {
            console.log('🎬 Attempting to publish video...');
            await new Promise((r) => setTimeout(r, 150));

            // Double check cleanup
            if (publishedRef.current) {
                await publisherRef.current.stopPublishing();
            }

            await publisherRef.current.publishVideo(videoRef.current);
            publishedRef.current = true;

            room.localParticipant.publishData(
                new TextEncoder().encode(
                    JSON.stringify({
                        action: 'VIDEO_START',
                        duration: videoRef.current.duration || 0,
                    }),
                ),
                { reliable: true },
            );

            socket.emit('presentation_start', { room: room.name });
            console.log('✅ Video published successfully');
        } catch (e) {
            console.error('❌ Failed to publish video:', e);
            publishedRef.current = false;
        }
    };

    const handleVideoPlay = async () => {
        if (!room?.localParticipant || userRole !== 'teacher' || !videoRef.current) return;

        if (classStarted && !publishedRef.current) {
            await publishVideo();
        }

        room.localParticipant.publishData(
            new TextEncoder().encode(
                JSON.stringify({
                    action: 'VIDEO_RESUME',
                    currentTime: videoRef.current.currentTime,
                }),
            ),
            { reliable: true },
        );
    };

    const handleVideoPause = () => {
        if (!room?.localParticipant || userRole !== 'teacher' || !videoRef.current) return;
        room.localParticipant.publishData(
            new TextEncoder().encode(
                JSON.stringify({
                    action: 'VIDEO_PAUSE',
                    currentTime: videoRef.current.currentTime,
                }),
            ),
            { reliable: true },
        );
    };

    const handleVideoEnded = async () => {
        if (!room?.localParticipant || userRole !== 'teacher' || !videoRef.current) return;
        await stopClass();
    };

    useEffect(() => {
        if (classStarted && videoURL && videoRef.current && !publishedRef.current && room) {
            const initVideo = async () => {
                try {
                    await videoRef.current.play();
                    if (!publishedRef.current) await publishVideo();
                } catch (e) {
                    console.error('Failed to init portal video:', e);
                }
            };
            const timer = setTimeout(initVideo, 100);
            return () => clearTimeout(timer);
        }
    }, [classStarted, videoURL, room]);

    const stopClass = async () => {
        if (!classStarted || !room || !publisherRef.current) return;
        console.log('🛑 Stopping class...');
        try {
            await publisherRef.current.stopPublishing();
            publishedRef.current = false;

            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }

            room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ action: 'VIDEO_STOP' })), {
                reliable: true,
            });

            socket.emit('presentation_stop', { room: room.name });
            setClassStarted(false);
            console.log('✅ Class stopped');
        } catch (e) {
            console.error('Failed to stop class:', e);
        }
    };

    // 🕒 PERIODIC TIME SYNC (Teacher side)
    useEffect(() => {
        if (!room || userRole !== 'teacher' || !classStarted || !videoRef.current) return;

        const broadcastTime = () => {
            if (videoRef.current && !videoRef.current.paused) {
                room.localParticipant.publishData(
                    new TextEncoder().encode(
                        JSON.stringify({
                            action: 'VIDEO_TIME_UPDATE',
                            currentTime: videoRef.current.currentTime,
                            duration: videoRef.current.duration,
                        }),
                    ),
                    { reliable: false },
                );
            }
        };

        const interval = setInterval(broadcastTime, 4000);
        return () => clearInterval(interval);
    }, [room, userRole, classStarted]);

    // Only camera tracks (no presentation track shown in grid)
    const allTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
    const filteredTracks = allTracks;

    return (
        <>
            <RoomAudioRenderer />

            {/* ✅ REPLACED: Old :has() CSS removed, new Meet-like CSS added */}
            <style>{`
       /* =======================
   Google Meet Style Grid
   JS controls --lk-cols and data-count
   ======================= */

.lk-grid-layout {
  display: grid !important;
  width: 100% !important;
  height: 100% !important;
  padding: 8px !important;
  gap: 8px !important;

  grid-template-columns: repeat(var(--lk-cols, 1), minmax(0, 1fr)) !important;
  grid-auto-rows: 1fr !important;

  place-items: center !important;
  align-content: center !important;
  justify-content: center !important;

  overflow: hidden !important;
}

.lk-participant-tile {
  width: 100% !important;
  height: 100% !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  background: #202124 !important;
  position: relative !important;
  transition: box-shadow 0.2s ease !important;
}

.lk-participant-tile video {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}

/* 1 participant: bigger centered */
.lk-grid-layout[data-count="1"] {
  padding: 12px !important;
}
.lk-grid-layout[data-count="1"] .lk-participant-tile {
  width: min(1200px, 100%) !important;
  height: min(720px, 100%) !important;
}

.lk-participant-tile:hover {
  box-shadow: 0 0 0 2px #8ab4f8 !important;
}

/* =========================================================
   ✅ ONE CONTAINER: Mute icon + Name together (single pill)
   ========================================================= */

/* Make metadata bar as the pill container */
.lk-participant-metadata {
  position: absolute !important;
  bottom: 8px !important;
  left: 8px !important;
  z-index: 12 !important;

  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;

  padding: 6px 10px !important;
  border-radius: 10px !important;

  color: #fff !important;

  max-width: calc(100% - 16px) !important;
  overflow: hidden !important;
}

/* Remove separate mic box styling — keep icon inline */
.lk-audio-indicator {
  position: static !important;
  inset: auto !important;

  width: auto !important;
  height: auto !important;

  padding: 0 !important;
  margin: 0 !important;

  background: transparent !important;
  border: none !important;
  box-shadow: none !important;

  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Fix svg size */
.lk-audio-indicator svg {
  width: 16px !important;
  height: 16px !important;
}

/* Make name text inline (NOT absolute) */
.lk-participant-name {
  position: static !important;
  bottom: auto !important;
  left: auto !important;

  background: transparent !important;
  padding: 0 !important;
  border-radius: 0 !important;

  color: #fff !important;
  font-size: 12px !important;
  font-weight: 600 !important;

  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

/* ❌ REMOVE duplicate top-right mute indicator (you already have icon in pill) */
.lk-grid-layout [data-lk-audio-muted="true"] .lk-participant-tile::after,
.lk-grid-layout [data-lk-audio-muted="true"] .lk-participant-tile::before {
  content: none !important;
}

/* ---------------- Laptop Responsive ---------------- */
@media (max-width: 1440px) {
  .lk-grid-layout { padding: 6px !important; gap: 6px !important; }
  .lk-participant-tile { border-radius: 6px !important; }

  .lk-participant-metadata {
    bottom: 6px !important;
    left: 6px !important;
    padding: 5px 9px !important;
    border-radius: 9px !important;
  }

  .lk-participant-name { font-size: 11px !important; }
  .lk-grid-layout[data-count="1"] .lk-participant-tile {
    width: min(1100px, 100%) !important;
    height: min(640px, 100%) !important;
  }
}

@media (max-width: 1280px) {
  .lk-grid-layout { padding: 6px !important; gap: 6px !important; }
  .lk-grid-layout[data-count="1"] .lk-participant-tile {
    width: min(980px, 100%) !important;
    height: min(560px, 100%) !important;
  }
  .lk-participant-name { font-size: 10px !important; }
}

@media (max-width: 1024px) {
  .lk-grid-layout { padding: 4px !important; gap: 4px !important; }
  .lk-participant-tile { border-radius: 5px !important; }

  .lk-participant-metadata {
    bottom: 6px !important;
    left: 6px !important;
    padding: 5px 9px !important;
  }

  .lk-participant-name { font-size: 10px !important; }
  .lk-grid-layout[data-count="1"] .lk-participant-tile {
    width: 100% !important;
    height: auto !important;
    min-height: 220px !important;
  }
}

@media (max-width: 768px) {
  .lk-grid-layout { padding: 4px !important; gap: 4px !important; }
  .lk-participant-tile { border-radius: 4px !important; }

  .lk-participant-metadata {
    bottom: 6px !important;
    left: 6px !important;
    padding: 5px 9px !important;
  }

  .lk-participant-name { font-size: 10px !important; }
  .lk-grid-layout[data-count="1"] .lk-participant-tile {
    width: 100% !important;
    height: auto !important;
    min-height: 200px !important;
  }
}

      `}</style>

            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: isSidebarOpen ? '360px' : '0',
                    bottom: '80px',
                    display: 'flex',
                    background: '#1a1a1a',
                    overflow: 'hidden',
                    transition: 'right 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {/* 1. VIDEO GRID AREA */}
                <div
                    ref={gridWrapperRef}
                    style={{
                        width: isPresenting || (userRole === 'teacher' && classStarted)
                            ? userRole === 'teacher'
                                ? '360px'
                                : '0px'
                            : '100%',
                        height: '100%',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: '#202124',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 5,
                        overflow: 'hidden',
                        opacity: isPresenting && !isSidebarOpen && userRole === 'student' ? 0 : 1,
                        order: 1,
                    }}
                >
                    <GridLayout tracks={filteredTracks} style={{ height: 'calc(100vh - 80px)' }}>
                        <ParticipantTile />
                    </GridLayout>
                </div>

                {/* 2. HERO AREA (PRESENTATION) */}
                <div
                    style={{
                        flex: isPresenting ? 1 : 0,
                        height: '100%',
                        position: 'relative',
                        background: '#000',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: isPresenting || (userRole === 'teacher' && classStarted) ? 'block' : 'none',
                        zIndex: 10,
                        order: userRole === 'student' ? 2 : 1,
                    }}
                >
                    {userRole === 'teacher' ? (
                        <TeacherHeroVideo
                            isPresenting={isPresenting}
                            videoRef={videoRef}
                            videoURL={videoURL}
                            classStarted={classStarted}
                            userRole={userRole}
                            room={room}
                            onPlay={handleVideoPlay}
                            onPause={handleVideoPause}
                            onEnded={handleVideoEnded}
                        />
                    ) : (
                        <StudentVideoViewer isHero={true} />
                    )}
                </div>
            </div>

            {/* BOTTOM CONTROL BAR */}
            <CustomBottomControlBar
                userRole={userRole}
                roomName={roomName}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                activeSidebarTab={activeSidebarTab}
                setActiveSidebarTab={setActiveSidebarTab}
                activeParticipants={activeParticipants}
                waitingParticipants={waitingParticipants}
            />

            {/* Participant List & Host Controls */}
            {isSidebarOpen && (
                <ParticipantListWrapper
                    activeParticipants={activeParticipants}
                    waitingParticipants={waitingParticipants}
                    roomName={roomName}
                    initialRole={userRole}
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                    activeTab={activeSidebarTab}
                    setActiveTab={setActiveSidebarTab}
                    isLocked={isLocked}
                    isAutoAccept={isAutoAccept}
                    teacherVideoProps={{
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
                        setAiAnswer,
                    }}
                />
            )}
        </>
    );
}

function CustomBottomControlBar({
    userRole,
    roomName,
    isSidebarOpen,
    setIsSidebarOpen,
    activeSidebarTab,
    setActiveSidebarTab,
    activeParticipants = [],
    waitingParticipants = [],
}) {
    const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const router = useRouter();

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const toggleMicrophone = async () => {
        await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    };

    const toggleCamera = async () => {
        await localParticipant.setCameraEnabled(!isCameraEnabled);
    };

    const leaveRoom = () => {
        if (confirm('Are you sure you want to leave the meeting?')) {
            router.push('/');
        }
    };

    const toggleSidebar = (tab) => {
        if (isSidebarOpen && activeSidebarTab === tab) {
            setIsSidebarOpen(false);
            return;
        }
        setIsSidebarOpen(true);
        setActiveSidebarTab(tab);
    };

    const baseBtn = {
        height: 44,
        minWidth: 44,
        padding: '0 12px',
        borderRadius: 999,
        background: '#3c4043',
        border: '1px solid #5f6368',
        color: 'white',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'transform 0.08s ease, background 0.2s ease, border 0.2s ease',
        userSelect: 'none',
    };

    const activeBtn = {
        ...baseBtn,
        background: '#8ab4f8',
        color: '#202124',
        border: '1px solid transparent',
    };

    const dangerBtn = {
        ...baseBtn,
        background: '#ea4335',
        border: '1px solid transparent',
    };

    const ghostBtn = {
        ...baseBtn,
        background: 'transparent',
        border: '1px solid transparent',
        color: '#9aa0a6',
        borderRadius: 12,
        padding: '0 10px',
    };

    const ghostActiveBtn = {
        ...ghostBtn,
        color: '#8ab4f8',
        background: 'rgba(138, 180, 248, 0.12)',
    };

    const badgeCount = activeParticipants.length + waitingParticipants.length;

    const prevScreenShareRef = useRef(false);
    useEffect(() => {
        if (userRole !== 'student' || !localParticipant) return;

        const isEnabled = !!localParticipant.isScreenShareEnabled;

        if (isEnabled !== prevScreenShareRef.current) {
            if (isEnabled) socket.emit('presentation_start', { room: roomName });
            else socket.emit('presentation_stop', { room: roomName });

            prevScreenShareRef.current = isEnabled;
        }
    }, [localParticipant?.isScreenShareEnabled, userRole, roomName]);

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: 80,
                background: '#202124',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                zIndex: 1000,
                borderTop: '1px solid #3c4043',
            }}
        >
            {/* LEFT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 220 }}>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{roomName}</span>
                    <span style={{ fontSize: 12, color: '#9aa0a6' }}>{currentTime}</span>
                </div>
            </div>

            {/* CENTER */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {userRole === 'student' && <StudentHandRaise />}

                <button onClick={toggleMicrophone} style={isMicrophoneEnabled ? baseBtn : dangerBtn} title={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}>
                    {isMicrophoneEnabled ? <FiMic size={18} /> : <FiMicOff size={18} />}
                </button>

                <button onClick={toggleCamera} style={isCameraEnabled ? baseBtn : dangerBtn} title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}>
                    {isCameraEnabled ? <FiVideo size={18} /> : <FiVideoOff size={18} />}
                </button>

                {(userRole === 'teacher' || userRole === 'student') && (
                    <button
                        onClick={async () => {
                            if (userRole === 'teacher') {
                                setIsSidebarOpen(true);
                                setActiveSidebarTab('presentation');
                            } else if (localParticipant) {
                                const isEnabled = !!localParticipant.isScreenShareEnabled;
                                await localParticipant.setScreenShareEnabled(!isEnabled);

                                if (!isEnabled) socket.emit('presentation_start', { room: roomName });
                                else socket.emit('presentation_stop', { room: roomName });
                            }
                        }}
                        style={(isSidebarOpen && activeSidebarTab === 'presentation') || localParticipant?.isScreenShareEnabled ? activeBtn : baseBtn}
                        title="Present now"
                    >
                        {userRole === 'teacher' ? <MdDriveFolderUpload size={20} /> : <FiMonitor size={18} />}
                    </button>
                )}

                <button onClick={leaveRoom} style={{ ...dangerBtn, minWidth: 64 }} title="Leave meeting">
                    <MdLogout size={18} />
                </button>

                {userRole === 'student' && <StudentVoiceDoubt />}
            </div>

            {/* RIGHT */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 220, justifyContent: 'flex-end' }}>
                <button onClick={() => toggleSidebar('people')} style={isSidebarOpen && activeSidebarTab === 'people' ? ghostActiveBtn : ghostBtn} title="People">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FiUsers size={18} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>People</span>
                        {badgeCount > 0 && (
                            <span
                                style={{
                                    marginLeft: 6,
                                    background: '#8ab4f8',
                                    color: '#202124',
                                    borderRadius: 999,
                                    padding: '2px 8px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                }}
                            >
                                {badgeCount}
                            </span>
                        )}
                    </div>
                </button>
            </div>
        </div>
    );
}

function TeacherHeroVideo({ videoRef, videoURL, classStarted, onPlay, onPause, onEnded }) {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#000',
                position: 'relative',
            }}
        >
            <StudentVideoViewer isHero={true} ignoreLocal={true} />
            <div id="teacher-hero-portal" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 100, pointerEvents: 'auto' }}>
                {classStarted && videoURL && (
                    <video
                        ref={videoRef}
                        src={videoURL}
                        autoPlay
                        playsInline
                        controls
                        onPlay={onPlay}
                        onPause={onPause}
                        onEnded={onEnded}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            background: '#000',
                        }}
                    />
                )}
            </div>
        </div>
    );
}

function ParticipantListWrapper({ initialRole, ...props }) {
    const { localParticipant } = useLocalParticipant();
    const [isHost, setIsHost] = useState(initialRole === 'teacher');

    useEffect(() => {
        if (localParticipant?.metadata) {
            try {
                const metadata = JSON.parse(localParticipant.metadata);
                if (metadata.role === 'teacher') setIsHost(true);
            } catch (e) {
                console.error('Failed to parse participant metadata', e);
            }
        }
    }, [localParticipant, initialRole]);

    return <ParticipantList {...props} isHost={isHost} role={initialRole} />;
}