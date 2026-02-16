'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function StudentJoinPage() {
    const router = useRouter();
    const params = useParams();
    const roomName = params.roomName;

    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    async function joinMeeting() {
        if (!name.trim()) {
            alert('Please enter your name');
            return;
        }

        setLoading(true);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            const res = await fetch(`${backendUrl}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), room: roomName, role: 'student' }),
            });

            const data = await res.json();

            if (typeof data.token === 'string') {
                router.push(
                    `/rooms/${roomName}?token=${encodeURIComponent(
                        data.token,
                    )}&url=${encodeURIComponent(data.url)}`,
                );
            } else {
                alert('Invalid token received. Check your backend configuration.');
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            alert('Something went wrong while joining the meeting');
            setLoading(false);
        }
    }

    if (!isClient) {
        return null;
    }

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#121212',
            color: 'white',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                background: '#1e1e1e',
                padding: '40px',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }}>
                <h2 style={{ marginBottom: '8px' }}>Join Meeting</h2>
                <p style={{ color: '#aaa', marginBottom: '24px' }}>Room: <span style={{ color: '#2196F3' }}>{roomName}</span></p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>Your Name</label>
                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#252525', color: 'white' }}
                        />
                    </div>

                    <button
                        onClick={joinMeeting}
                        disabled={loading}
                        style={{
                            padding: '14px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#2196F3',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '16px',
                            cursor: 'pointer',
                            opacity: loading ? 0.7 : 1,
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#1e88e5')}
                        onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#2196F3')}
                    >
                        {loading ? 'Joining...' : 'Join Meeting'}
                    </button>
                </div>
            </div>
        </div>
    );
}
