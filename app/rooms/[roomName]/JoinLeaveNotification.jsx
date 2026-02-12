'use client';

import { useEffect, useState } from 'react';

export default function JoinLeaveNotification({ message, type }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (message) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
            }, 4000); // Show for 4 seconds

            return () => clearTimeout(timer);
        }
    }, [message]);

    if (!message || !visible) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                animation: 'slideDown 0.3s ease-out',
            }}
        >
            <div
                style={{
                    background: '#202124',
                    color: '#e8eaed',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: `1px solid ${type === 'join' ? '#34a853' : '#ea4335'}`,
                    minWidth: '280px',
                }}
            >
                <span style={{ fontSize: '18px' }}>
                    {type === 'join' ? '👋' : '👋'}
                </span>
                <span>{message}</span>
            </div>

            <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
        </div>
    );
}
