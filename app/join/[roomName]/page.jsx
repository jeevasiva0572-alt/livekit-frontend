'use client';
 
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import './studentjoin.css';
 
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
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
 
      const res = await fetch(`${backendUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          room: roomName,
          role: 'student',
        }),
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
 
  if (!isClient) return null;
 
  return (
    <div className="joinWrap">
      <div className="joinCard">
        <h2 className="joinTitle" style={{textAlign:'center' , borderBottom:'20px'}}>Join Meeting</h2>
 
        <p className="joinRoom">
          Room: <span className="joinRoomCode">{roomName}</span>
        </p>
 
        <div className="joinForm">
          <div className="joinField">
            <label className="joinLabel">Your Name</label>
 
            <input
              className="joinInput"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
 
          <button
            className="joinBtn"
            onClick={joinMeeting}
            disabled={loading}
            type="button"
          >
            {loading ? 'Joining...' : 'Join Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}