'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [teacherName, setTeacherName] = useState('');

    const [meetingName, setMeetingName] = useState('');
    const [createdRoom, setCreatedRoom] = useState(null);

    const [loading, setLoading] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();

        if (!username || !password || !teacherName.trim()) {
            alert('Please fill in all fields');
            return;
        }

        // Inbuilt credentials
        if (username === 'teacher' && password === 'password123') {
            setIsLoggedIn(true);
            // teacherName is already set via input
        } else {
            alert('Invalid credentials');
        }
    };

    const createMeeting = () => {
        if (!meetingName.trim()) {
            alert('Please enter a meeting name');
            return;
        }
        const roomName = meetingName.trim().replace(/\s+/g, '-').toLowerCase() + '-' + Math.random().toString(36).substring(7);
        setCreatedRoom(roomName);
    };

    async function startMeeting() {
        if (!createdRoom) return;

        setLoading(true);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            const res = await fetch(`${backendUrl}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: teacherName, room: createdRoom, role: 'teacher' }),
            });

            const data = await res.json();

            if (typeof data.token === 'string') {
                router.push(
                    `/rooms/${createdRoom}?token=${encodeURIComponent(
                        data.token,
                    )}&url=${encodeURIComponent(data.url)}`,
                );
            } else {
                alert('Invalid token received. Check your .env.local API key/secret.');
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            alert('Something went wrong while generating token');
            setLoading(false);
        }
    }

    if (!isClient) {
        return null;
    }

    if (!isLoggedIn) {
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
                    maxWidth: '400px'
                }}>
                    <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Teacher Login</h2>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888', fontWeight: '500' }}>Teacher Name (for display)</label>
                            <input
                                type="text"
                                placeholder="Enter your name"
                                value={teacherName}
                                onChange={(e) => setTeacherName(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #333', background: '#252525', color: 'white', outline: 'none', transition: 'border-color 0.2s' }}
                                onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                                onBlur={(e) => e.target.style.borderColor = '#333'}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888', fontWeight: '500' }}>Username</label>
                            <input
                                type="text"
                                placeholder="Enter username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #333', background: '#252525', color: 'white', outline: 'none', transition: 'border-color 0.2s' }}
                                onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                                onBlur={(e) => e.target.style.borderColor = '#333'}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888', fontWeight: '500' }}>Password</label>
                            <input
                                type="password"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #333', background: '#252525', color: 'white', outline: 'none', transition: 'border-color 0.2s' }}
                                onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                                onBlur={(e) => e.target.style.borderColor = '#333'}
                            />
                        </div>
                        <button type="submit" style={{
                            marginTop: '8px',
                            padding: '14px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '16px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
                            transition: 'transform 0.1s, box-shadow 0.2s'
                        }}
                            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 6px 16px rgba(33, 150, 243, 0.4)'}
                            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.3)'}
                            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            Login to Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#121212',
            color: 'white',
            fontFamily: 'Inter, sans-serif',
            padding: '40px'
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1>Teacher Dashboard</h1>
                    <button onClick={() => setIsLoggedIn(false)} style={{ background: 'none', border: '1px solid #444', color: '#aaa', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
                </header>

                <div style={{ background: '#1e1e1e', padding: '32px', borderRadius: '12px', border: '1px solid #333' }}>
                    {!createdRoom ? (
                        <>
                            <h2 style={{ marginBottom: '24px' }}>Create a New Meeting</h2>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <input
                                    placeholder="e.g. Science Class"
                                    value={meetingName}
                                    onChange={(e) => setMeetingName(e.target.value)}
                                    style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#252525', color: 'white' }}
                                />
                                <button onClick={createMeeting} style={{
                                    padding: '0 24px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: '#4CAF50',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}>
                                    Create
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ padding: '20px', background: '#252525', borderRadius: '8px', border: '1px dashed #444' }}>
                                <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px' }}>Share this link with students:</div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: '#121212',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    border: '1px solid #333'
                                }}>
                                    <code style={{ color: '#2196F3' }}>{`${window.location.origin}/join/${createdRoom}`}</code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/join/${createdRoom}`);
                                            alert('Link copied!');
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                        Copy Link
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button onClick={startMeeting} style={{
                                    flex: 1,
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#2196F3',
                                    color: 'white',
                                    fontWeight: '600',
                                    fontSize: '18px',
                                    cursor: 'pointer'
                                }}>
                                    {loading ? 'Starting...' : 'Start Meeting Now'}
                                </button>
                                <button onClick={() => setCreatedRoom(null)} style={{
                                    padding: '16px 24px',
                                    borderRadius: '8px',
                                    border: '1px solid #444',
                                    background: 'none',
                                    color: '#aaa',
                                    cursor: 'pointer'
                                }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
