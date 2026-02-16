'use client';
import { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { HiOutlineHandRaised } from "react-icons/hi2";


export default function TeacherHandPanel() {
    const room = useRoomContext();
    const [hands, setHands] = useState([]);
    const [visible, setVisible] = useState(false); // ✅ NEW

    useEffect(() => {
        if (!room) return;

        let hideTimer; // ✅ NEW

        const handleData = (payload) => {
            try {
                const msg = JSON.parse(new TextDecoder().decode(payload));
                if (msg.action !== 'HAND_RAISE') return;

                // ✅ your existing logic (unchanged)
                setHands(prev => {
                    if (prev.some(h => h.name === msg.name)) return prev;
                    return [...prev, { name: msg.name, role: msg.role }];
                });

                // ✅ show panel
                setVisible(true);

                // ✅ auto-hide after 15 seconds
                clearTimeout(hideTimer);
                hideTimer = setTimeout(() => {
                    setVisible(false);
                    setHands([]); // optional: clear old hands
                }, 15000);

            } catch { }
        };

        room.on('dataReceived', handleData);
        return () => {
            room.off('dataReceived', handleData);
            clearTimeout(hideTimer);
        };
    }, [room]);

    // ✅ hide completely when not needed
    if (!visible) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 24,
            right: 24,
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pointerEvents: 'none'
        }}>
            {hands.map((h, i) => (
                <div
                    key={i}
                    style={{
                        background: '#1e8e3e',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        animation: 'handRaiseSlideInRight 0.4s cubic-bezier(0, 0, 0.2, 1)',
                        fontSize: '14px',
                        fontWeight: '500',
                        fontFamily: 'Inter, sans-serif'
                    }}
                >
                    <HiOutlineHandRaised size={18} style={{ color: 'black' }} />
                    <span style={{ color: 'black' }}>
                        <b>{h.name}</b> &nbsp;raised
                    </span>

                    <style>{`
                        @keyframes handRaiseSlideInRight {
                            from { transform: translateX(100%); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                    `}</style>
                </div>
            ))}
        </div>
    );
}
