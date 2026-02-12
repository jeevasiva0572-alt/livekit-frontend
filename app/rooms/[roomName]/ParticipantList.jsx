import { useState, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { socket } from '../../../lib/socket';
import TeacherVideoController from './TeacherVideoController';
import StudentVoiceDoubt from './StudentVoiceDoubt';

export default function ParticipantList({
    activeParticipants = [],
    waitingParticipants = [],
    roomName,
    isHost,
    isOpen,
    setIsOpen,
    activeTab,
    role, // Add role prop
    setActiveTab,
    teacherVideoProps, // New prop
    isLocked,
    isAutoAccept: initialAutoAccept
}) {
    const room = useRoomContext();
    const [hands, setHands] = useState([]);
    const [isAutoAccept, setIsAutoAccept] = useState(initialAutoAccept);

    useEffect(() => {
        setIsAutoAccept(initialAutoAccept);
    }, [initialAutoAccept]);

    // ✋ Listen for Hand Raises and Doubts
    useEffect(() => {
        if (!room) return;

        const handleData = (payload) => {
            try {
                const msg = JSON.parse(new TextDecoder().decode(payload));
                if (msg.action === 'HAND_RAISE') {
                    setHands(prev => {
                        if (prev.some(h => h.name === msg.name)) return prev;
                        return [...prev, { name: msg.name, role: msg.role, id: msg.userId || Date.now() }];
                    });
                } else if (msg.action === 'HAND_LOWER') {
                    setHands(prev => prev.filter(h => h.name !== msg.name));
                }
            } catch { }
        };

        const onStatusUpdate = (data) => {
            if (data.isAutoAccept !== undefined) {
                setIsAutoAccept(data.isAutoAccept);
            }
        };
        socket.on('room_status_update', onStatusUpdate);

        room.on('dataReceived', handleData);
        return () => {
            room.off('dataReceived', handleData);
            socket.off('room_status_update', onStatusUpdate);
        };
    }, [room, role]);

    const lowerHand = (name) => {
        setHands(prev => prev.filter(h => h.name !== name));
    };

    const isStudent = role === 'student';

    return (
        <div style={{
            position: 'absolute',
            right: 0,
            left: 'auto',
            top: 0,
            bottom: 0,
            width: 360,
            background: '#202124',
            borderLeft: '1px solid #3c4043',
            borderRight: 'none',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            color: 'white',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.5)'
        }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #3c4043', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '400' }}>Meeting details</h3>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#9aa0a6', cursor: 'pointer', fontSize: '24px' }}>&times;</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #3c4043' }}>
                <button
                    onClick={() => setActiveTab('people')}
                    style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'people' ? '2px solid #8ab4f8' : '2px solid transparent',
                        color: activeTab === 'people' ? '#8ab4f8' : '#9aa0a6',
                        padding: '12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}
                    title="People"
                >
                    👤
                </button>
                {isHost && (
                    <>
                        <button
                            onClick={() => setActiveTab('presentation')}
                            style={{
                                flex: 1,
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === 'presentation' ? '2px solid #8ab4f8' : '2px solid transparent',
                                color: activeTab === 'presentation' ? '#8ab4f8' : '#9aa0a6',
                                padding: '12px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                            title="Presentation"
                        >
                            📺
                        </button>
                    </>
                )}
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {activeTab === 'people' && (
                    <>
                        {/* ✋ Raised Hands Section (Teacher Only) */}
                        {isHost && hands.length > 0 && (
                            <div style={{ background: 'rgba(138, 180, 248, 0.1)', borderBottom: '1px solid rgba(138, 180, 248, 0.2)' }}>
                                <div style={{ padding: '12px 20px', fontSize: '12px', fontWeight: '500', color: '#8ab4f8', textTransform: 'uppercase' }}>
                                    Raised Hands ({hands.length})
                                </div>
                                {hands.map((h, i) => (
                                    <div key={i} style={{ padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: '16px' }}>✋</span>
                                            <span style={{ fontSize: '14px', fontWeight: '500' }}>{h.name}</span>
                                        </div>
                                        <button
                                            onClick={() => lowerHand(h.name)}
                                            style={{ background: 'none', border: '1px solid #5f6368', color: '#9aa0a6', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                                        >
                                            Lower
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Waiting Room */}
                        {isHost && waitingParticipants.length > 0 && (
                            <div style={{ background: 'rgba(242, 139, 130, 0.1)', borderBottom: '1px solid rgba(242, 139, 130, 0.2)' }}>
                                <div style={{ padding: '12px 20px', fontSize: '12px', fontWeight: '500', color: '#f28b82', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Waiting to join ({waitingParticipants.length})</span>
                                    <button
                                        onClick={() => socket.emit('toggle_auto_accept', { room: roomName, enabled: !isAutoAccept })}
                                        style={{
                                            background: isAutoAccept ? '#8ab4f8' : 'transparent',
                                            border: `1px solid ${isAutoAccept ? '#8ab4f8' : '#5f6368'}`,
                                            color: isAutoAccept ? '#202124' : '#9aa0a6',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '10px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Auto: {isAutoAccept ? 'ON' : 'OFF'}
                                    </button>
                                </div>
                                {waitingParticipants.map((user) => (
                                    <div key={user.id} style={{ padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '500' }}>{user.name}</span>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={() => socket.emit('admit_user', { room: roomName, userId: user.id })}
                                                style={{ background: '#8ab4f8', border: 'none', color: '#202124', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                                            >
                                                Admit
                                            </button>
                                            <button
                                                onClick={() => socket.emit('reject_user', { room: roomName, userId: user.id })}
                                                style={{ background: 'none', border: '1px solid #5f6368', color: '#f28b82', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                            >
                                                Deny
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Active List */}
                        <div style={{ padding: '16px 0' }}>
                            {activeParticipants.map((user) => (
                                <div key={user.id} style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#28292c'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: user.role === 'teacher' ? '#8ab4f8' : '#5f6368', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '500', color: '#202124' }}>
                                            {user.name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: '14px', fontWeight: '400' }}>{user.name || 'Loading...'} {user.id === socket.id ? '(You)' : ''}</span>
                                                {hands.some(h => h.name === user.name) && <span title="Hand raised" style={{ fontSize: '12px' }}>✋</span>}
                                            </div>
                                            {user.role === 'teacher' && <span style={{ fontSize: '11px', color: '#8ab4f8' }}>Meeting host</span>}
                                        </div>
                                    </div>

                                    {isHost && user.role !== 'teacher' && (
                                        <button
                                            onClick={() => socket.emit('kick_user', { room: roomName, userId: user.id })}
                                            style={{ background: 'none', border: 'none', color: '#9aa0a6', cursor: 'pointer', fontSize: '20px', padding: '4px' }}
                                            title="Remove from meeting"
                                        >
                                            {/* &ominus; */}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}


                {activeTab === 'presentation' && isHost && (
                    <div style={{ padding: '0 20px' }}>
                        <h4 style={{ margin: '15px 0 10px 0', fontSize: '14px', color: '#8ab4f8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Presentation</h4>
                        <TeacherVideoController {...teacherVideoProps} />
                    </div>
                )}
            </div>

            {/* Google Meet Style Footer Info */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #3c4043', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#9aa0a6' }}>
                    Room: <span style={{ color: '#e8eaed', fontWeight: '500' }}>{roomName}</span>
                </div>
            </div>
        </div>
    );
}
