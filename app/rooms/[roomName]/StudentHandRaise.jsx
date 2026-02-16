'use client';
import { useState } from 'react';
import { useRoomContext } from '@livekit/components-react';

export default function StudentHandRaise({ isHandRaised, onToggle }) {
    const room = useRoomContext();

    const toggleHandRaise = async () => {
        if (!room?.localParticipant) return;

        await room.localParticipant.publishData(
            new TextEncoder().encode(
                JSON.stringify({
                    action: 'HAND_RAISE',
                    role: 'student',
                    name: room.localParticipant.identity,
                    raised: !isHandRaised,
                    timestamp: Date.now(),
                })
            ),
            { reliable: true }
        );

        onToggle();
    };

    return (
        <button
            onClick={toggleHandRaise}
            className="lk-button"
            style={{
                background: isHandRaised ? '#b3a982ff' : undefined,
                color: isHandRaised ? '#000' : undefined,
                fontWeight: 400,
            }}
        >
            ✋ {isHandRaised ? 'Lower' : 'Raise'}
        </button>
    );
}
