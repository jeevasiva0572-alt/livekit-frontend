'use client';
import { useParticipants } from '@livekit/components-react';

export default function ParticipantList({ onClose }) {
    const participants = useParticipants();

    return (
        <div style={{
            position: 'absolute',
            bottom: 80,
            right: 20,
            width: 250,
            background: '#111',
            border: '1px solid #333',
            borderRadius: 12,
            padding: 16,
            color: '#fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 1000,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ margin: 0 }}>Joined People ({participants.length})</h4>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {participants.map((p) => {
                    let role = 'Student';
                    try {
                        role = JSON.parse(p.metadata || '{}').role || 'Student';
                    } catch { }

                    return (
                        <div key={p.sid} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 0',
                            borderBottom: '1px solid #222'
                        }}>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{p.identity}</div>
                                <div style={{ fontSize: '0.75rem', color: '#888' }}>{role}</div>
                            </div>
                            {p.isLocal && <span style={{ fontSize: '0.7rem', color: '#4CAF50' }}>(You)</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
