/* eslint-disable react/no-unescaped-entities */
'use client';
import { useState, useEffect } from 'react';
import { socket } from '../../../lib/socket';

export default function HostControlPanel({ roomName, isLocked: initialLocked, initialAutoAccept }) {
    const [isLocked, setIsLocked] = useState(initialLocked);
    const [isAutoAccept, setIsAutoAccept] = useState(initialAutoAccept || false);

    useEffect(() => {
        setIsLocked(initialLocked);

        const onStatusUpdate = (data) => {
            if (data.isLocked !== undefined) {
                setIsLocked(data.isLocked);
            }
            if (data.isAutoAccept !== undefined) {
                setIsAutoAccept(data.isAutoAccept);
            }
        };
        socket.on('room_status_update', onStatusUpdate);
        return () => socket.off('room_status_update', onStatusUpdate);
    }, [initialLocked]);

    const handleToggleLock = () => {
        const nextState = !isLocked;
        setIsLocked(nextState);
        socket.emit('toggle_lock', { room: roomName, locked: nextState });
    };

    const handleToggleAutoAccept = () => {
        const nextState = !isAutoAccept;
        setIsAutoAccept(nextState);
        socket.emit('toggle_auto_accept', { room: roomName, enabled: nextState });
    };

    const handleMuteAll = () => {
        if (confirm("Mute everyone in the meeting?")) {
            socket.emit('mute_all', { room: roomName });
        }
    };

    return (
        <div style={{ padding: '20px', color: 'white' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#8ab4f8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Host Controls</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Meeting Lock */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>Lock Meeting</div>
                        <div style={{ fontSize: '12px', color: '#9aa0a6' }}>Prevent new students from joining</div>
                    </div>
                    <label className="switch">
                        <input type="checkbox" checked={isLocked} onChange={handleToggleLock} />
                        <span className="slider round"></span>
                    </label>
                </div>

                {/* Auto Accept */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>Auto Accept</div>
                        <div style={{ fontSize: '12px', color: '#9aa0a6' }}>Automatically admit waiting students</div>
                    </div>
                    <label className="switch">
                        <input type="checkbox" checked={isAutoAccept} onChange={handleToggleAutoAccept} />
                        <span className="slider round"></span>
                    </label>
                </div>

                {/* Mute All */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>Mute All</div>
                        <div style={{ fontSize: '12px', color: '#9aa0a6' }}>Mute everyone's microphone instantly</div>
                    </div>
                    <button
                        onClick={handleMuteAll}
                        style={{
                            background: '#3c4043',
                            border: '1px solid #5f6368',
                            color: '#e8eaed',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        Mute All
                    </button>
                </div>

                {/* Safety Info */}
                <div style={{
                    marginTop: '10px',
                    padding: '12px',
                    background: 'rgba(138, 180, 248, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(138, 180, 248, 0.2)',
                    fontSize: '12px',
                    color: '#8ab4f8',
                    lineHeight: '1.5'
                }}>
                    <strong>Note:</strong> These settings apply to everyone in the meeting. Only you as the teacher can see and manage these controls.
                </div>
            </div>

            <style jsx>{`
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 34px;
                    height: 20px;
                }
                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #5f6368;
                    transition: .4s;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 14px;
                    width: 14px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .4s;
                }
                input:checked + .slider {
                    background-color: #8ab4f8;
                }
                input:checked + .slider:before {
                    transform: translateX(14px);
                }
                .slider.round {
                    borderRadius: 34px;
                }
                .slider.round:before {
                    borderRadius: 50%;
                }
            `}</style>
        </div>
    );
}
