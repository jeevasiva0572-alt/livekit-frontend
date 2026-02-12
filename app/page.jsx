/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '../lib/socket';
import './page.css';
import { FiVideo, FiUser, FiArrowLeft, FiHash, FiCopy, FiLogIn } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Home() {
    const router = useRouter();

    // Role selection
    const [selectedRole, setSelectedRole] = useState(null); // null | 'teacher' | 'student'

    // Form inputs
    const [name, setName] = useState('');
    const [room, setRoom] = useState('');

    // Generated meeting info (for "create later")
    const [generatedInfo, setGeneratedInfo] = useState(null);

    const intentRef = useRef('join'); // 'join' | 'instant' | 'later'

    useEffect(() => {
        console.log('🔌 Socket connected:', socket.connected);

        // Connect socket if not connected
        if (!socket.connected) {
            console.log('🔄 Connecting socket...');
            socket.connect();
        }

        // Listen for connection events
        socket.on('connect', () => {
            console.log('✅ Socket connected successfully!', socket.id);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error);
        });

        // Socket listeners
        function onJoinApproved({ room, token, url }) {
            console.log('📨 Join approved received:', { room, token: !!token, url: !!url, intent: intentRef.current });

            // Store credentials in sessionStorage for the room page to access
            if (token && url) {
                console.log('💾 Storing credentials in sessionStorage:', `lk_token_${room}`, `lk_url_${room}`);
                sessionStorage.setItem(`lk_token_${room}`, token);
                sessionStorage.setItem(`lk_url_${room}`, url);
                console.log('✅ Credentials stored successfully');
            } else {
                console.warn('⚠️ Missing token or url!', { token: !!token, url: !!url });
            }

            if (intentRef.current === 'later') {
                console.log('✅ Showing modal for "Create for later"');
                setGeneratedInfo({
                    room,
                    url: `${window.location.origin}/?room=${room}`
                });
            } else {
                console.log('➡️ Redirecting to room with credentials:', room);
                // 💾 Double-layer protection: Storage + Query Params
                setTimeout(() => {
                    router.push(`/rooms/${room}?token=${encodeURIComponent(token)}&url=${encodeURIComponent(url)}`);
                }, 100);
            }
            intentRef.current = 'join'; // Reset
        }

        socket.on('join_approved', onJoinApproved);

        // Handle waiting room
        socket.on('join_waiting', ({ room, message }) => {
            console.log('⏳ Join waiting:', message);
            toast('⏳ ' + (message || 'Waiting for host approval...'), { duration: 5000 });
        });

        // Handle rejection (wrong password, etc)
        socket.on('join_rejected', ({ message }) => {
            console.log('❌ Join rejected:', message);
            toast.error(message || 'Unable to join meeting');
        });

        return () => {
            socket.off('join_approved', onJoinApproved);
            socket.off('join_waiting');
            socket.off('join_rejected');
            socket.off('connect');
            socket.off('connect_error');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const handleCreateMeeting = () => {
        if (!name.trim()) {
            toast.error('Please enter your name');
            return;
        }

        intentRef.current = 'later';
        const newRoom = `meet-${Math.random().toString(36).substring(2, 9)}`;
        console.log('🔵 Create Meeting clicked - Emitting join_request:', { room: newRoom, name, role: 'teacher' });

        socket.emit('join_request', {
            room: newRoom,
            name: name.trim(),
            role: 'teacher'
        });
    };

    const handleJoinAsTeacher = () => {
        if (!name.trim()) {
            toast.error('Please enter your name');
            return;
        }
        if (!room.trim()) {
            toast.error('Please enter a meeting code');
            return;
        }

        console.log('🟢 Join as Teacher clicked - Emitting join_request');
        intentRef.current = 'join';

        socket.emit('join_request', {
            room: room.trim(),
            name: name.trim(),
            role: 'teacher'
        });
    };

    const handleJoinAsStudent = () => {
        if (!name.trim()) {
            toast.error('Please enter your name');
            return;
        }
        if (!room.trim()) {
            toast.error('Please enter a meeting code');
            return;
        }

        console.log('🟢 Join as Student clicked - Emitting join_request');
        intentRef.current = 'join';

        socket.emit('join_request', {
            room: room.trim(),
            name: name.trim(),
            role: 'student'
        });
    };

    const handleStartMeeting = () => {
        if (generatedInfo) {
            router.push(`/rooms/${generatedInfo.room}`);
        }
    };

    return (
        <div className="landing-container">
            <div className="content-wrapper">
                <div className="hero-image">
                    <img
                        src="https://cdn-jagbh.nitrocdn.com/TYVZHePxisufUuSiVWDElscksnaOxEbE/assets/images/source/rev-d36697c/s39613.pcdn.co/wp-content/uploads/2025/06/iStock-2191030790-2048x956.jpg"
                        alt="Students studying together"
                    />
                    <div className="image-overlay">
                        <h2>Collaborative Learning</h2>
                        <p>Join thousands of students and teachers in a seamless virtual environment.</p>
                    </div>
                </div>
                <div className="landing-card">

                    {selectedRole && (
                        <button className="back-button" onClick={() => setSelectedRole(null)}>
                            <FiArrowLeft /> Back
                        </button>
                    )}
                    {/* Logo/Header */}
                    <div className="landing-header">
                        <FiVideo size={48} className="landing-logo" />
                        <h1 className="landing-title">Video Meeting</h1>
                        <p className="landing-subtitle">Connect with your team</p>
                    </div>

                    {/* Role Selection */}
                    {!selectedRole && (
                        <div className="role-selection">
                            <h2>Choose your role</h2>
                            <div className="role-buttons">
                                <button
                                    className="role-btn teacher-btn"
                                    onClick={() => setSelectedRole('teacher')}
                                >
                                    <div className="role-desc">Create or host meetings</div>
                                </button>
                                <button
                                    className="role-btn student-btn"
                                    onClick={() => setSelectedRole('student')}
                                >
                                    <div className="role-desc">Join meetings</div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Teacher Form */}
                    {selectedRole === 'teacher' && (
                        <div className="form-container">


                            <div className="input-group">
                                <label>Your Name</label>
                                <div className="input-wrapper">
                                    <FiUser className="input-icon" />
                                    <input
                                        type="text"
                                        placeholder="Enter your name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button className="primary-btn" onClick={handleCreateMeeting}>
                                Create New Meeting
                            </button>
                        </div>
                    )}

                    {/* Student Form */}
                    {selectedRole === 'student' && (
                        <div className="form-container">


                            <div className="input-group">
                                <label>Your Name</label>
                                <div className="input-wrapper">
                                    <FiUser className="input-icon" />
                                    <input
                                        type="text"
                                        placeholder="Enter your name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Meeting Code</label>
                                <div className="input-wrapper">
                                    <FiHash className="input-icon" />
                                    <input
                                        type="text"
                                        placeholder="Enter meeting code"
                                        value={room}
                                        onChange={(e) => setRoom(e.target.value)}
                                    />
                                </div>
                            </div>



                            <button className="primary-btn" onClick={handleJoinAsStudent}>
                                {/* <FiLogIn /> Join Meeting */} Join Meeting
                            </button>
                        </div>
                    )}
                </div>
            </div>


            {/* Meeting Created Modal */}
            {generatedInfo && (
                <div className="modal-overlay">
                    <div className="meeting-modal">
                        <h2 style={{color:'black'}}>Meeting Created! 🎉</h2>
                        <p className="modal-subtitle">Share these details with your students</p>

                        <div className="info-box">
                            <label style={{color:'black'}}>Meeting URL</label>
                            <div className="copy-row">
                                <span className="info-value">{generatedInfo.url}</span>
                                <button
                                    className="copy-btn"
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedInfo.url);
                                        toast.success('URL copied!');
                                    }}
                                >
                                    <FiCopy />
                                </button>
                            </div>
                        </div>

                        <div className="info-box">
                            <label  style={{color:'black'}}>Meeting Code</label>
                            <div className="copy-row">
                                <span className="info-value">{generatedInfo.room}</span>
                                <button
                                    className="copy-btn"
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedInfo.room);
                                        toast.success('Code copied!');
                                    }}
                                >
                                    <FiCopy />
                                </button>
                            </div>
                        </div>

                        {/* <div className="info-box">
                            <label>Password</label>
                            <div className="copy-row">
                                <span className="info-value password-value">{generatedInfo.password}</span>
                                <button
                                    className="copy-btn"
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedInfo.password);
                                        toast.success('Password copied!');
                                    }}
                                >
                                    <FiCopy />
                                </button>
                            </div>
                        </div> */}

                        <div className="modal-actions">
                            <button className="primary-btn" onClick={handleStartMeeting}>
                                Start Meeting Now
                            </button>
                            <button className="secondary-btn" onClick={() => setGeneratedInfo(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
