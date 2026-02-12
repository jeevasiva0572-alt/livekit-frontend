// Global reference to prevent garbage collection during speech
let currentUtterance = null;
let globalAudioCtx = null;

export function speakText(text) {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            reject('Speech Synthesis not supported');
            return;
        }

        // Cancel existing speech if any
        window.speechSynthesis.cancel();

        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.rate = 1;
        currentUtterance.pitch = 1;
        currentUtterance.volume = 1;

        currentUtterance.onend = () => {
            currentUtterance = null;
            resolve();
        };

        currentUtterance.onerror = (err) => {
            currentUtterance = null;
            reject(err);
        };

        window.speechSynthesis.speak(currentUtterance);
    });
}

/**
 * Plays a clean, professional "Ding/Chime" sound using Web Audio API.
 * No external .mp3 required.
 */
export async function playDingSound() {
    console.log('🔔 playDingSound() triggered');
    if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) {
        console.warn('AudioContext not supported');
        return;
    }

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;

        if (!globalAudioCtx) {
            console.log('🆕 Creating new global AudioContext');
            globalAudioCtx = new AudioCtx();
        }

        // Browsers require a resume() call often if the context starts suspended
        if (globalAudioCtx.state === 'suspended') {
            console.log('⏳ Resuming suspended AudioContext...');
            await globalAudioCtx.resume();
            console.log('✅ AudioContext state now:', globalAudioCtx.state);
        }

        const osc = globalAudioCtx.createOscillator();
        const gain = globalAudioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime); // A5 note
        osc.frequency.exponentialRampToValueAtTime(440, globalAudioCtx.currentTime + 0.5); // A4

        gain.gain.setValueAtTime(0, globalAudioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.6, globalAudioCtx.currentTime + 0.05); // Faster, louder
        gain.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(globalAudioCtx.destination);

        osc.start(globalAudioCtx.currentTime);
        osc.stop(globalAudioCtx.currentTime + 0.6);

        console.log('🔊 Sound played via Web Audio API');
    } catch (e) {
        console.error('❌ Failed to play notification sound:', e);
    }
}
