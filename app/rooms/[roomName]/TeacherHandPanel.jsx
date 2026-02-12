'use client';
import { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';

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
            top: 20,
            right: 20,
            background: '#111',
            color: 'white',
            padding: 12,
            borderRadius: 8,
            minWidth: 220,
            zIndex: 1000,
        }}>
            <strong>✋ Raised Hands</strong>
            <ul style={{ padding: 0, listStyle: 'none', marginTop: 8 }}>
                {hands.length === 0 && <li>No hands raised</li>}
                {hands.map((h, i) => (
                    <li key={i}>
                        {h.role === 'teacher' ? '👩‍🏫' : '🧑'} {h.name}
                    </li>
                ))}
            </ul>
        </div>
    );
}
