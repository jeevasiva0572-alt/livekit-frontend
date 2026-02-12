'use client';
import { useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { IoHandRightOutline } from "react-icons/io5";


export default function StudentHandRaise() {
    const room = useRoomContext();
    const [isHandRaised, setIsHandRaised] = useState(false);

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

        setIsHandRaised(!isHandRaised);
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
            <IoHandRightOutline />
        </button>
    );
}
