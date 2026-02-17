export function speakText(text) {
    return new Promise((resolve, reject) => {
        if (!window.speechSynthesis) {
            reject('Speech Synthesis not supported in this browser');
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);

        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        let finished = false;

        utterance.onend = () => {
            if (!finished) {
                finished = true;
                resolve();
            }
        };

        utterance.onerror = (err) => {
            if (!finished) {
                finished = true;
                reject(err);
            }
        };

        // Only cancel if another speech is currently playing
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        // Speak this utterance
        window.speechSynthesis.speak(utterance);
    });
}
export function stopSpeaking() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}
