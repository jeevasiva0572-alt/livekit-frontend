import { LocalVideoTrack, LocalAudioTrack, Track } from 'livekit-client';

export class TeacherVideoPublisher {
    constructor(room) {
        this.room = room;
        this.videoTrack = null;
        this.audioTrack = null;
    }

    async publishVideo(videoElement) {
         //refresh page,student receives fresh track
        await this.stopPublishing();
        const captureFn = videoElement.captureStream || videoElement.mozCaptureStream;
        if (!captureFn) {
            throw new Error('captureStream() not supported in this browser');
        }

        const mediaStream = captureFn.call(videoElement, 30);

        const videoMediaTrack = mediaStream.getVideoTracks()[0];
        const audioMediaTrack = mediaStream.getAudioTracks()[0];

        if (!videoMediaTrack) throw new Error('No video track found in media stream');
        console.log('🎬 Teacher publishing video track:', {
            id: videoMediaTrack.id,
            label: videoMediaTrack.label,
            readyState: videoMediaTrack.readyState
        });

        // Crucial: Video must be muted to autoplay reliably in many browsers
        videoElement.muted = true;

        this.videoTrack = new LocalVideoTrack(videoMediaTrack);
        await this.room.localParticipant.publishTrack(this.videoTrack, {
            source: Track.Source.ScreenShare,
            name: 'video-lesson'
        });

        if (audioMediaTrack) {
            this.audioTrack = new LocalAudioTrack(audioMediaTrack);
            await this.room.localParticipant.publishTrack(this.audioTrack, {
                source: Track.Source.ScreenShareAudio,
                name: 'video-lesson-audio'
            });
        }
    }

    async stopPublishing() {
        console.log('🛑 Teacher stopping video publication...');
        if (this.videoTrack) {
            try {
                await this.room.localParticipant.unpublishTrack(this.videoTrack);
                this.videoTrack.stop();
                console.log('✅ Video track unpublished and stopped');
            } catch (e) {
                console.error('❌ Error unpublishing video track:', e);
            }
            this.videoTrack = null;
        }

        if (this.audioTrack) {
            try {
                await this.room.localParticipant.unpublishTrack(this.audioTrack);
                this.audioTrack.stop();
                console.log('✅ Audio track unpublished and stopped');
            } catch (e) {
                console.error('❌ Error unpublishing audio track:', e);
            }
            this.audioTrack = null;
        }

        // Final verification
        const remaining = this.room.localParticipant.getTrackPublications().filter(p =>
            p.source === Track.Source.ScreenShare || p.source === Track.Source.ScreenShareAudio
        );
        if (remaining.length > 0) {
            console.warn('⚠️ Some presentation tracks still remain published:', remaining.length);
        }
    }
}
