'use client';

import { useEffect, useRef, useState } from 'react';
import { DataPacket_Kind } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import { TeacherVideoPublisher } from './TeacherVideoPublisher';
import { speakText } from '@/app/lib/aiTTS';

export default function TeacherVideoController({ onGenerateQuiz, onClassStatusChange }) {
  const room = useRoomContext();

  const videoRef = useRef(null);
  const publisherRef = useRef(null);
  const publishedRef = useRef(false);

  const [videoFile, setVideoFile] = useState(null);
  const [videoURL, setVideoURL] = useState(null);

  const [popupName, setPopupName] = useState(null);

  // 🕒 Auto-resume timer
  const resumeTimerRef = useRef(null);

  const startResumeTimer = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);

    resumeTimerRef.current = setTimeout(() => {
      if (videoRef.current && videoRef.current.paused && classStarted && !videoEnded) {
        console.log('🕒 15s passed with no doubt. Auto-resuming video...');
        videoRef.current.play().catch((e) => console.error('Auto-play failed:', e));
      }
    }, 15000); // 15 seconds
  };

  const clearResumeTimer = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  // 🔒 Class control
  const [classStarted, setClassStarted] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  // ✅ Doubt count + auto finish announce (after 3 doubts)
  const MAX_DOUBTS = 3;
  const [doubtCount, setDoubtCount] = useState(0);
  const announcedFinishRef = useRef(false);

  // ✅ NEW: video end announcement (speak once)
  const endedAnnouncedRef = useRef(false);

  /* ---------------- INIT ---------------- */
  useEffect(() => {
    if (!room) return;

    publisherRef.current = new TeacherVideoPublisher(room);

    // ⭐ IMPORTANT: Merge metadata instead of overwriting
    const existingMetadata = room.localParticipant.metadata
      ? JSON.parse(room.localParticipant.metadata)
      : {};

    room.localParticipant.setMetadata(JSON.stringify({ ...existingMetadata, role: 'teacher' }));

    return () => clearResumeTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  /* ---------------- VIDEO FILE ---------------- */
  useEffect(() => {
    if (!videoFile) return;

    const url = URL.createObjectURL(videoFile);
    setVideoURL(url);

    // reset class state
    setClassStarted(false);
    setVideoEnded(false);
    publishedRef.current = false;
    setPopupName(null);
    clearResumeTimer();

    // ✅ reset doubt finish logic
    setDoubtCount(0);
    announcedFinishRef.current = false;

    // ✅ reset end announcement for new video
    endedAnnouncedRef.current = false;

    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoFile]);

  // Handle video end (✅ UPDATED: speaks when video ends)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = async () => {
      setVideoEnded(true);
      clearResumeTimer();
      stopTimeSync(); // ✅ stop sending time updates when video finishes
      console.log('🎬 Video ended');

      // ✅ speak only once when video completes
      if (!endedAnnouncedRef.current) {
        endedAnnouncedRef.current = true;
        try {
          await speakText(
            "Ok guys, I have finished the class. ask doubt box enter your doubt i am clarify one by one ."
          );
        } catch (e) {
          console.error('End TTS failed:', e);
        }
      }
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [videoURL]);

  /* ---------------- TIME SYNC INTERVAL ---------------- */
  const timeSyncRef = useRef(null);

  const startTimeSync = (video) => {
    if (timeSyncRef.current) clearInterval(timeSyncRef.current);
    timeSyncRef.current = setInterval(() => {
      if (!video || !room) return;
      room.localParticipant.publishData(
        new TextEncoder().encode(
          JSON.stringify({
            action: 'VIDEO_TIME_UPDATE',
            currentTime: video.currentTime,
            duration: isFinite(video.duration) ? video.duration : 0,
          })
        ),
        { reliable: false } // unreliable is fine for time sync (frequent updates)
      );
    }, 1000); // every 1 second
  };

  const stopTimeSync = () => {
    if (timeSyncRef.current) {
      clearInterval(timeSyncRef.current);
      timeSyncRef.current = null;
    }
  };

  /* ---------------- START CLASS ---------------- */
  const startClass = async () => {
    if (!videoRef.current || publishedRef.current) return;

    const ok = window.confirm('Do you want to start the class now?');
    if (!ok) return;

    try {
      // publish video track
      await publisherRef.current.publishVideo(videoRef.current);
      publishedRef.current = true;

      await videoRef.current.play();

      // ✅ Start broadcasting time updates to students every second
      startTimeSync(videoRef.current);

      // notify students (include real duration so timeline shows immediately)
      const duration = videoRef.current.duration;
      room.localParticipant.publishData(
        new TextEncoder().encode(
          JSON.stringify({
            action: 'VIDEO_START',
            duration: isFinite(duration) ? duration : 0,
          })
        ),
        { reliable: true }
      );

      setClassStarted(true);
      setVideoEnded(false);
      if (onClassStatusChange) onClassStatusChange(true);
      console.log('✅ Class started');
    } catch (e) {
      console.error('Error starting class', e);
    }
  };

  /* ---------------- QUIZ GENERATION ---------------- */
  const handleQuizRequest = () => {
    if (onGenerateQuiz) {
      onGenerateQuiz();
    }
  };

  /* ---------------- LIVEKIT DATA ---------------- */
  const [handQueue, setHandQueue] = useState([]); // Array of { name, type }
  const queueTimerRef = useRef(null);

  const clearQueueTimer = () => {
    if (queueTimerRef.current) {
      clearTimeout(queueTimerRef.current);
      queueTimerRef.current = null;
    }
  };

  const removeFromQueue = (name) => {
    // ✅ important: cancel the current head timer immediately
    clearQueueTimer();
    setHandQueue((prev) => prev.filter((s) => s.name !== name));
  };

  // Process the next student in queue
  useEffect(() => {
    if (!classStarted) return;
    if (announcedFinishRef.current) return; // ✅ after finish, stop talking further

    if (handQueue.length > 0) {
      const currentStudent = handQueue[0];
      console.log('📢 Processing queue at head for:', currentStudent.name);

      // Pause video — teacher must manually click Play to resume
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }

      // Greeting removed from here, moved to STUDENT_DOUBT
      speakText(
        `${currentStudent.name}, you raised your hand. Do you have any doubts? If so, please click the ‘Ask a Doubt’ button to submit your question.`
      ).catch((e) => console.error('TTS failed:', e));

      // ❌ No auto-resume — teacher clicks Play manually

      // Safety timer: move to next if no response
      clearQueueTimer();
      queueTimerRef.current = setTimeout(() => {
        console.log('🕒 Queue safety timeout for:', currentStudent.name);
        setHandQueue((prev) => prev.slice(1));
      }, 15000);
    }

    return () => clearQueueTimer();
  }, [handQueue[0]?.name, classStarted]); // ⭐ keep as you had

  useEffect(() => {
    if (!room) return;

    const handleData = async (payload, _participant, kind) => {
      if (kind !== DataPacket_Kind.RELIABLE) return;

      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));

        /* ✋ HAND RAISE */
        if (msg.action === 'HAND_RAISE') {
          setPopupName(msg.name);

          if (msg.raised) {
            setHandQueue((prev) => {
              if (prev.some((s) => s.name === msg.name)) return prev;
              return [...prev, { name: msg.name, type: 'hand' }];
            });
          } else {
            // ✅ hand lowered => instantly remove, next person will be asked
            removeFromQueue(msg.name);
          }

          setTimeout(() => setPopupName(null), 4000);
        }

        /* 🎤 VOICE DOUBT START */
        if (msg.action === 'VOICE_DOUBT_START') {
          setPopupName(msg.name);

          setHandQueue((prev) => {
            if (prev.some((s) => s.name === msg.name)) return prev;
            return [...prev, { name: msg.name, type: 'voice' }];
          });

          setTimeout(() => setPopupName(null), 4000);
        }

        /* 🎤 VOICE DOUBT END */
        if (msg.action === 'VOICE_DOUBT_END') {
          // ✅ instantly move next
          removeFromQueue(msg.name);
        }

        /* 💬 STUDENT DOUBT RECEIVED */
        if (msg.action === 'STUDENT_DOUBT') {
          console.log('💬 Doubt received. Cancelling auto-resume timer.');
          clearResumeTimer();

          // ✅ remove them immediately so next person is processed
          removeFromQueue(msg.name);

          // ✅ FIXED: greeting based on latest prev (no stale doubtCount)
          setDoubtCount((prev) => {
            const greeting =
              prev === 0
                ? 'Good question.'
                : prev === 1
                  ? 'Nice question.'
                  : prev === 2
                    ? 'Great doubt.'
                    : '';

            const next = prev + 1;

            if (greeting) {
              speakText(greeting).catch((e) => console.error('Greeting TTS failed:', e));
            }

            if (next >= MAX_DOUBTS && !announcedFinishRef.current) {
              announcedFinishRef.current = true;

              // stop queue + stop timers
              clearQueueTimer();
              clearResumeTimer();
              setHandQueue([]);

              // pause video
              if (videoRef.current && !videoRef.current.paused) {
                videoRef.current.pause();
              }

              // ✅ 1200ms delay before finish message (AFTER greeting)
              setTimeout(() => {
                speakText(
                  'As several students have raised doubts, I will now conclude the session and proceed to clarify each of your questions.'
                ).catch((e) => console.error('Finish TTS failed:', e));
              }, 1200);
            }

            return next;
          });
        }
      } catch (e) {
        console.error('Invalid data message', e);
      }
    };

    room.on('dataReceived', handleData);
    return () => {
      room.off('dataReceived', handleData);
      clearQueueTimer();
    };
  }, [room, classStarted]);

  const fileInputRef = useRef(null);

  return (
    <div style={{ position: 'relative' }}>
      {/* 🎥 Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*"
        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
        style={{ display: 'none' }}
      />

      {/* 🎥 Buttons Container */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {videoURL && (
          <button
            onClick={async () => {
              // 📡 Notify students that video has stopped
              if (room && publishedRef.current) {
                try {
                  room.localParticipant.publishData(
                    new TextEncoder().encode(
                      JSON.stringify({ action: 'VIDEO_STOP' })
                    ),
                    { reliable: true }
                  );
                } catch (e) {
                  console.error('Failed to send VIDEO_STOP', e);
                }

                // Unpublish the video/audio tracks from LiveKit
                try {
                  await publisherRef.current.stopPublishing();
                } catch (e) {
                  console.error('Failed to stop publishing', e);
                }
              }

              // ✅ Stop broadcasting time updates
              stopTimeSync();

              // Pause the local video element
              if (videoRef.current) {
                videoRef.current.pause();
              }

              setVideoURL(null);
              setVideoFile(null);
              setClassStarted(false);
              if (onClassStatusChange) onClassStatusChange(false);
              publishedRef.current = false;
              clearResumeTimer();

              // ✅ reset finish logic
              setDoubtCount(0);
              announcedFinishRef.current = false;

              // ✅ reset end announcement
              endedAnnouncedRef.current = false;
            }}
            title="Cancel Class"
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              background: '#f44336',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap',
              marginLeft: '-117px'
            }}
          >
            Cancel Class
          </button>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload Video Class"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: videoURL ? '#2196F3' : '#222',
            border: videoURL ? '1px solid #2196F3' : '1px solid #444',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1.2rem',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => {
            if (!videoURL) e.currentTarget.style.background = '#333';
          }}
          onMouseOut={(e) => {
            if (!videoURL) e.currentTarget.style.background = '#222';
          }}
        >
          📁
        </button>
      </div>

      {/* 📺 Class Management Panel */}
      {(videoURL || classStarted) && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 0,
            width: 320,
            background: '#111',
            border: '1px solid #333',
            borderRadius: 12,
            padding: 16,
            color: '#fff',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            zIndex: 100,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >

            <h4 style={{ margin: 0 }}>👩‍🏫 Class Control</h4>
            <button
              onClick={async () => {
                // 📡 Notify students that video has stopped
                if (room && publishedRef.current) {
                  try {
                    room.localParticipant.publishData(
                      new TextEncoder().encode(
                        JSON.stringify({ action: 'VIDEO_STOP' })
                      ),
                      { reliable: true }
                    );
                  } catch (e) {
                    console.error('Failed to send VIDEO_STOP', e);
                  }

                  // Unpublish the video/audio tracks from LiveKit
                  try {
                    await publisherRef.current.stopPublishing();
                  } catch (e) {
                    console.error('Failed to stop publishing', e);
                  }
                }

                // ✅ Stop broadcasting time updates
                stopTimeSync();

                // Pause the local video element
                if (videoRef.current) {
                  videoRef.current.pause();
                }

                setVideoURL(null);
                setClassStarted(false);
                if (onClassStatusChange) onClassStatusChange(false);
                publishedRef.current = false;
                clearResumeTimer();

                // ✅ reset finish logic
                setDoubtCount(0);
                announcedFinishRef.current = false;

                // ✅ reset end announcement
                endedAnnouncedRef.current = false;
              }}
              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* 🎥 Video preview */}
          {videoURL && (
            <video
              ref={videoRef}
              src={videoURL}
              controls
              onPlay={clearResumeTimer}
              style={classStarted ? {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '90vh',
                background: '#000',
                zIndex: 9999,
                objectFit: 'contain',
              } : {
                width: '100%',
                borderRadius: 8,
                maxHeight: 180,
                background: '#000',
              }}
            />
          )}

          {/* ▶ Start Class / 📝 Generate Quiz */}
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {videoURL && !classStarted && (
              <button
                onClick={startClass}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontWeight: 'bold',
                  background: '#4CAF50',
                  color: '#fff',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ▶ Start Class
              </button>
            )}

            {classStarted && videoEnded && (
              <button
                onClick={handleQuizRequest}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontWeight: 'bold',
                  background: '#2196F3',
                  color: '#fff',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                📝 Generate AI Quiz
              </button>
            )}
          </div>

          {classStarted && !videoEnded && (
            <div
              style={{
                marginTop: 10,
                color: '#4CAF50',
                fontWeight: 'bold',
                textAlign: 'center',
                fontSize: '13px',
              }}
            >
              🟢 Class handles active
            </div>
          )}

          {videoEnded && (
            <div
              style={{
                marginTop: 10,
                color: '#FF9800',
                fontWeight: 'bold',
                textAlign: 'center',
                fontSize: '13px',
              }}
            >
              🎬 Video Completed
            </div>
          )}
        </div>
      )}
    </div>
  );
}
