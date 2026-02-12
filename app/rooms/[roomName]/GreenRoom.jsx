/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useRef } from 'react';
import { createLocalVideoTrack, createLocalAudioTrack } from 'livekit-client';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiSettings } from 'react-icons/fi';

export default function GreenRoom({ roomName, onJoin }) {
    const [videoTrack, setVideoTrack] = useState(null);
    const [audioTrack, setAudioTrack] = useState(null);

    // UI State
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [isCamEnabled, setIsCamEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const videoRef = useRef(null);

    // Initialize tracks
    useEffect(() => {
        let vTrack = null;
        let aTrack = null;

        const initTracks = async () => {
            try {
                setLoading(true);
                // Create video track
                if (isCamEnabled) {
                    try {
                        vTrack = await createLocalVideoTrack({
                            resolution: { width: 1280, height: 720 },
                            facingMode: 'user'
                        });
                        setVideoTrack(vTrack);
                    } catch (e) {
                        console.warn("Camera permission denied or error:", e);
                        setIsCamEnabled(false);
                    }
                }

                // Create audio track
                if (isMicEnabled) {
                    try {
                        aTrack = await createLocalAudioTrack();
                        setAudioTrack(aTrack);
                    } catch (e) {
                        console.warn("Microphone permission denied or error:", e);
                        setIsMicEnabled(false);
                    }
                }

                setLoading(false);
            } catch (err) {
                console.error("Error creating tracks:", err);
                setError("Could not access camera or microphone. Please check permissions.");
                setLoading(false);
            }
        };

        initTracks();

        return () => {
            if (vTrack) vTrack.stop();
            if (aTrack) aTrack.stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount? merging logic below for toggles.

    // Handle Toggles
    const toggleMic = async () => {
        const newState = !isMicEnabled;
        setIsMicEnabled(newState);
        if (newState && !audioTrack) {
            try {
                const track = await createLocalAudioTrack();
                setAudioTrack(track);
            } catch (e) {
                console.error(e);
                setIsMicEnabled(false); // Revert switch if failed
                alert("Microphone permission denied. Please allow access in browser settings.");
            }
        } else if (!newState && audioTrack) {
            audioTrack.mute();
            // We might keep the track but mute it, or stop it.
            // Google Meet usually keeps the device active but muted.
        } else if (newState && audioTrack) {
            audioTrack.unmute();
        }
    };

    const toggleCam = async () => {
        const newState = !isCamEnabled;
        setIsCamEnabled(newState);
        if (newState && !videoTrack) {
            try {
                const track = await createLocalVideoTrack({ resolution: { width: 1280, height: 720 } });
                setVideoTrack(track);
            } catch (e) {
                console.error(e);
                setIsCamEnabled(false); // Revert switch if failed
                alert("Camera permission denied. Please allow access in browser settings.");
            }
        } else if (!newState && videoTrack) {
            videoTrack.stop();
            setVideoTrack(null);
        }
    };

    // Attach video to element
    useEffect(() => {
        if (videoTrack && videoRef.current) {
            videoTrack.attach(videoRef.current);
        }
        return () => {
            if (videoTrack && videoRef.current) {
                videoTrack.detach(videoRef.current);
            }
        };
    }, [videoTrack]);

    const handleJoin = () => {
        // Clean up local tracks before joining?
        // LiveKitRoom will create its own tracks usually, or we can pass these.
        // If we pass them, we need to handle them carefully.
        // For simplicity, we can stop these and let LiveKitRoom recreate them based on our connection state,
        // OR we can pass `audio={isMicEnabled} video={isCamEnabled}` to LiveKitRoom.
        // Restarting them is cleaner to avoid track ownership issues between components.

        if (videoTrack) videoTrack.stop();
        if (audioTrack) audioTrack.stop();

        onJoin({ mic: isMicEnabled, cam: isCamEnabled });
    };

    return (
        <div className="green-room-container">
            <style>{`
                .green-room-container {
                    display: flex;
                    height: 100vh;
                    width: 100%;
                    background: #202124;
                    color: white;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Google Sans', 'Roboto', sans-serif;
                }
                .gr-content {
                    display: flex;
                    gap: 60px;
                    align-items: center;
                    max-width: 1100px;
                    width: 100%;
                    padding: 0 40px;
                }
                .preview-area {
                    flex: 1.2;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                }
                .video-frame {
                    width: 100%;
                    aspect-ratio: 16/9;
                    background: #3c4043;
                    border-radius: 8px;
                    overflow: hidden;
                    position: relative;
                    box-shadow: 0 1px 2px 0 rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15);
                }
                .video-frame video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform: scaleX(-1); /* Mirror effect */
                }
                .camera-off-msg {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 16px;
                }
                .controls-overlay {
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    gap: 20px;
                    z-index: 10;
                }
                .gr-btn {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    border: 1px solid transparent;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 20px;
                    transition: all 0.2s;
                }
                .gr-btn.on {
                    background: #3c4043;
                    color: white;
                    border-color: transparent;
                }
                .gr-btn.on:hover {
                    background: #45484c;
                }
                .gr-btn.off {
                    background: #ea4335;
                    color: white;
                    border-color: transparent;
                }
                .gr-btn.off:hover {
                    background: #d93025;
                }
                .info-area {
                    flex: 0.8;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                }
                .room-title {
                    font-size: 28px;
                    margin-bottom: 20px;
                    font-weight: 400;
                }
                .ready-msg {
                    font-size: 18px;
                    margin-bottom: 40px;
                    color: #bdc1c6;
                }
                .join-btn {
                    background: #8ab4f8;
                    color: #202124;
                    padding: 12px 32px;
                    border-radius: 24px;
                    font-size: 16px;
                    font-weight: 500;
                    border: none;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .join-btn:hover {
                    background: #aecbfa;
                }
            `}</style>

            <div className="gr-content">
                <div className="preview-area">
                    <div className="video-frame">
                        {loading && <div className="camera-off-msg">Starting camera...</div>}
                        {error && <div className="camera-off-msg">{error}</div>}
                        {!loading && !error && (
                            <>
                                {isCamEnabled ? (
                                    <video ref={videoRef} autoPlay playsInline muted />
                                ) : (
                                    <div className="camera-off-msg">Camera is off</div>
                                )}
                            </>
                        )}

                        <div className="controls-overlay">
                            <button
                                className={`gr-btn ${isMicEnabled ? 'on' : 'off'}`}
                                onClick={toggleMic}
                                title={isMicEnabled ? "Turn off microphone" : "Turn on microphone"}
                            >
                                {isMicEnabled ? <FiMic /> : <FiMicOff />}
                            </button>
                            <button
                                className={`gr-btn ${isCamEnabled ? 'on' : 'off'}`}
                                onClick={toggleCam}
                                title={isCamEnabled ? "Turn off camera" : "Turn on camera"}
                            >
                                {isCamEnabled ? <FiVideo /> : <FiVideoOff />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="info-area">
                    <h1 className="room-title">Ready to join?</h1>
                    <p className="ready-msg">
                        {roomName ? `You are joining ${roomName}` : 'No one else is here'}
                    </p>
                    <button className="join-btn" onClick={handleJoin}>
                        Join now
                    </button>
                </div>
            </div>
        </div>
    );
}
