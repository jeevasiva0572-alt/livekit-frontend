'use client';
import { useEffect, useState } from 'react';

export default function AttendanceSidebar({ attendance, onClose, right = 0 }) {
    const studentAttendance = Object.values(attendance).filter(a => a.role === 'student');
    const totalStudents = studentAttendance.length;

    const formatTime = (ms) => {
        if (!ms || ms <= 0) return '0s';
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));

        let parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
        return parts.join(' ');
    };

    const formatTimestamp = (ts) => {
        if (!ts) return '-';
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: right,
            width: 380,
            background: '#111',
            borderLeft: '1px solid #333',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: '-4px 0 12px rgba(0,0,0,0.5)',
            transition: 'right 0.3s ease'
        }}>
            {/* Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Attendance Report</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#888' }}>
                        Total Students: <span style={{ color: '#2196F3', fontWeight: 'bold' }}>{totalStudents}</span>
                    </p>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {studentAttendance.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#555' }}>
                        No students have joined yet.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #333', color: '#aaa' }}>
                                <th style={{ padding: '10px 5px' }}>Name</th>
                                <th style={{ padding: '10px 5px' }}>Joined</th>
                                <th style={{ padding: '10px 5px' }}>Stay Time</th>
                                <th style={{ padding: '10px 5px', textAlign: 'center' }}>Joins</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentAttendance.map((a) => (
                                <tr key={a.identity} style={{ borderBottom: '1px solid #222' }}>
                                    <td style={{ padding: '12px 5px' }}>
                                        <div style={{ fontWeight: 500 }}>{a.identity}</div>
                                        <div style={{ fontSize: '0.7rem', color: a.status === 'online' ? '#4CAF50' : '#f44336' }}>
                                            ● {a.status === 'online' ? 'Online' : 'Left'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 5px', color: '#ccc' }}>
                                        {formatTimestamp(a.firstJoined)}
                                    </td>
                                    <td style={{ padding: '12px 5px', color: '#ccc' }}>
                                        {formatTime(a.totalStayTime + (a.status === 'online' ? (Date.now() - a.lastJoined) : 0))}
                                    </td>
                                    <td style={{ padding: '12px 5px', textAlign: 'center' }}>
                                        <span style={{
                                            background: a.joinCount > 2 ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255,255,255,0.05)',
                                            color: a.joinCount > 2 ? '#FF9800' : '#fff',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            fontSize: '0.75rem'
                                        }}>
                                            {a.joinCount}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ padding: '15px', borderTop: '1px solid #222', fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
                Note: Stay time is calculated until the current moment for online students.
            </div>
        </div>
    );
}
