/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '../lib/socket';
import './page.css';
import { FiVideo, FiArrowRight, FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Home() {
  const router = useRouter();

  // UI tab controls (maps to your roles)
  const [activeTab, setActiveTab] = useState('join'); // 'join' | 'create'

  // Your existing state
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [generatedInfo, setGeneratedInfo] = useState(null);
  const [mounted, setMounted] = useState(false);

  const intentRef = useRef('join'); // 'join' | 'later'

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log('🔌 Socket connected:', socket.connected);

    if (!socket.connected) {
      console.log('🔄 Connecting socket...');
      socket.connect();
    }

    socket.on('connect', () => {
      console.log('✅ Socket connected successfully!', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    function onJoinApproved({ room, token, url }) {
      console.log('📨 Join approved received:', {
        room,
        token: !!token,
        url: !!url,
        intent: intentRef.current,
      });

      if (token && url) {
        sessionStorage.setItem(`lk_token_${room}`, token);
        sessionStorage.setItem(`lk_url_${room}`, url);
      }

      if (intentRef.current === 'later') {
        setGeneratedInfo({
          room,
          url: `${window.location.origin}/?room=${room}`,
        });
      } else {
        setTimeout(() => {
          router.push(
            `/rooms/${room}?token=${encodeURIComponent(token)}&url=${encodeURIComponent(url)}`
          );
        }, 100);
      }

      intentRef.current = 'join';
    }

    socket.on('join_approved', onJoinApproved);

    socket.on('join_waiting', ({ message }) => {
      toast('⏳ ' + (message || 'Waiting for host approval...'), { duration: 5000 });
    });

    socket.on('join_rejected', ({ message }) => {
      toast.error(message || 'Unable to join meeting');
    });

    return () => {
      socket.off('join_approved', onJoinApproved);
      socket.off('join_waiting');
      socket.off('join_rejected');
      socket.off('connect');
      socket.off('connect_error');
    };
  }, [router]);

  // ✅ Same functionality: Create meeting (teacher)
  const handleCreateMeeting = () => {
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    intentRef.current = 'later';
    const newRoom = `meet-${Math.random().toString(36).substring(2, 9)}`;

    socket.emit('join_request', {
      room: newRoom,
      name: name.trim(),
      role: 'teacher',
    });
  };

  // ✅ Same functionality: Join meeting (student)
  const handleJoinAsStudent = () => {
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!room.trim()) {
      toast.error('Please enter a meeting code');
      return;
    }

    intentRef.current = 'join';

    socket.emit('join_request', {
      room: room.trim(),
      name: name.trim(),
      role: 'student',
    });
  };

  const handleStartMeeting = () => {
    if (generatedInfo) {
      router.push(`/rooms/${generatedInfo.room}`);
    }
  };

  if (!mounted) {
    return (
      <div className="landing-page" style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        {/* Simple skeleton or just same background to avoid flash */}
      </div>
    );
  }

  return (
    <div className="landing-page">
      {/* HEADER */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <FiVideo size={26} />
            <span>NexMeet</span>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-container">
          {/* LEFT TEXT */}
          <div className="hero-left">
            <h1>
              Smart Virtual Sessions for
              <br />
              <span className="blue">Modern Learning</span>
            </h1>

            <p className="hero-desc">
              Conduct structured virtual sessions with clarity, reliability, and seamless collaboration
              tools built for academic excellence.
            </p>
          </div>

          {/* RIGHT CARD */}
          <div className="meeting-card" suppressHydrationWarning>
            <div className="tabs">
              <button
                className={activeTab === 'join' ? 'active' : ''}
                onClick={() => setActiveTab('join')}
                type="button"
                suppressHydrationWarning
              >
                join meeting
              </button>
              <button
                className={activeTab === 'create' ? 'active' : ''}
                onClick={() => setActiveTab('create')}
                type="button"
                suppressHydrationWarning
              >
                create meeting
              </button>
            </div>

            <div className="card-body">
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                suppressHydrationWarning
              />

              {activeTab === 'join' && (
                <input
                  type="text"
                  placeholder="Session Code"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  suppressHydrationWarning
                />
              )}

              {activeTab === 'join' ? (
                <button onClick={handleJoinAsStudent} className="primary-btn" type="button" suppressHydrationWarning>
                  Continue <FiArrowRight size={18} />
                </button>
              ) : (
                <button onClick={handleCreateMeeting} className="primary-btn" type="button" suppressHydrationWarning>
                  Start Now <FiVideo size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MODAL (same functionality) */}
      {generatedInfo && (
        <div className="modal">
          <div className="modal-box">
            <h2>Session Created Successfully</h2>

            <div className="copy-group">
              <input value={generatedInfo.url} readOnly />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedInfo.url);
                  toast.success('URL copied!');
                }}
                type="button"
              >
                <FiCopy />
              </button>
            </div>

            <div className="copy-group">
              <input value={generatedInfo.room} readOnly />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedInfo.room);
                  toast.success('Code copied!');
                }}
                type="button"
              >
                <FiCopy />
              </button>
            </div>

            <button className="primary-btn" onClick={handleStartMeeting} type="button">
              Enter Now
            </button>

            <button className="secondary-btn" onClick={() => setGeneratedInfo(null)} type="button">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
