import { useState, useRef, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { FiMessageSquare, FiSend, FiX } from 'react-icons/fi';

export default function StudentVoiceDoubt() {
  const room = useRoomContext();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendDoubt = () => {
    if (!message.trim()) return;

    if (room?.localParticipant) {
      room.localParticipant.publishData(
        new TextEncoder().encode(
          JSON.stringify({
            action: 'STUDENT_DOUBT',
            text: message.trim(),
            name: room.localParticipant.identity,
          })
        ),
        { reliable: true }
      );
    }

    setMessage('');
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendDoubt();
    }
  };



  return (
    <div style={{ position: 'relative' }}>
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          marginLeft: '22rem',
          width: '300px',
          background: '#202124',
          border: '1px solid #5f6368',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 1000
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#e8eaed' }}>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Ask a Doubt</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#9aa0a6', cursor: 'pointer', display: 'flex' }}
            >
              <FiX size={18} />
            </button>
          </div>

          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your doubt here..."
            style={{
              width: '100%',
              minHeight: '80px',
              background: '#3c4043',
              border: '1px solid #5f6368',
              borderRadius: '8px',
              padding: '8px',
              color: 'white',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none'
            }}
          />

          <button
            onClick={sendDoubt}
            disabled={!message.trim()}
            style={{
              background: message.trim() ? '#8ab4f8' : '#3c4043',
              color: message.trim() ? '#202124' : '#9aa0a6',
              border: 'none',
              borderRadius: '6px',
              padding: '8px',
              cursor: message.trim() ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <FiSend size={14} />
            Send
          </button>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '0 20px',
          height: '44px',
          backgroundColor: isOpen ? '#8ab4f8' : '#3c4043',
          color: isOpen ? '#202124' : '#fff',
          border: '1px solid #5f6368',
          borderRadius: '999px',
          fontWeight: 500,
          fontFamily: 'Inter, sans-serif',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap'
        }}
        title="Ask a Doubt"
      >
        <FiMessageSquare size={18} />
        <span style={{ fontSize: '14px', fontWeight: '600' }}>Ask a Doubt</span>
      </button>
    </div>
  );
}
