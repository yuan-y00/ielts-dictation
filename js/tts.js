/**
 * TTS Module — Text-to-Speech wrapper
 * Uses Web Speech API with natural voice selection.
 */

const TTS = (() => {
    let synth = null;
    let preferredVoice = null;
    let isSpeaking = false;
    let onEndCallback = null;

    /**
     * Initialize: warm up speech synthesis and pick best English voice.
     * Must be called from a user gesture (click) on some browsers.
     */
    function init() {
        if (synth) return; // already initialized

        synth = window.speechSynthesis;

        // Preload voices — on Chrome they load async
        const voices = synth.getVoices();
        if (voices.length) {
            pickVoice(voices);
        }
        synth.onvoiceschanged = () => {
            pickVoice(synth.getVoices());
        };

        // Workaround for Chrome bug where speech stops after ~15s
        // by periodically pausing/resuming
    }

    function pickVoice(voices) {
        // Preference order: natural-sounding English voices
        const preferences = [
            // Google voices (Android/Chrome) — most natural
            'Google US English',
            'Google UK English Female',
            'Google UK English Male',
            // Microsoft voices (Windows) — good quality
            'Microsoft Zira',
            'Microsoft David',
            'Microsoft Mark',
            // macOS voices
            'Samantha',
            'Alex',
            'Karen',
            'Daniel',
            // Fallback
            'en-US',
            'en-GB',
        ];

        for (const pref of preferences) {
            const match = voices.find(v => v.name.includes(pref) && v.lang.startsWith('en'));
            if (match) {
                preferredVoice = match;
                console.log('[TTS] Selected voice:', match.name, match.lang);
                return;
            }
        }

        // Absolute fallback: any English voice
        preferredVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        console.log('[TTS] Fallback voice:', preferredVoice?.name);
    }

    /**
     * Speak text. Returns a Promise that resolves when speech ends.
     * @param {string} text - Text to speak
     * @param {Object} options
     * @param {number} options.rate - Speech rate (0.5-2.0), default 0.85 for dictation
     * @param {function} options.onEnd - Callback when speech finishes
     * @param {function} options.onError - Callback on error
     */
    function speak(text, options = {}) {
        const { rate = 0.85, onEnd, onError } = options;

        // Cancel any ongoing speech
        stop();

        if (!synth) init();
        if (!synth) {
            console.warn('[TTS] Speech synthesis not available');
            if (onError) onError(new Error('Speech synthesis not available'));
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);

            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            utterance.lang = preferredVoice?.lang || 'en-US';
            utterance.rate = rate;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            utterance.onstart = () => {
                isSpeaking = true;
            };

            utterance.onend = () => {
                isSpeaking = false;
                if (onEnd) onEnd();
                resolve();
            };

            utterance.onerror = (e) => {
                isSpeaking = false;
                // 'canceled' is expected when we call stop() — not an error
                if (e.error !== 'canceled' && e.error !== 'interrupted') {
                    console.warn('[TTS] Speech error:', e.error);
                    if (onError) onError(e);
                }
                resolve();
            };

            // Chrome bug workaround: pause/resume periodically to keep speech alive
            let resumeInterval;
            utterance.onstart = () => {
                isSpeaking = true;
                resumeInterval = setInterval(() => {
                    if (synth.speaking) {
                        synth.pause();
                        synth.resume();
                    }
                }, 5000);
            };
            const origOnEnd = utterance.onend;
            utterance.onend = (e) => {
                clearInterval(resumeInterval);
                isSpeaking = false;
                origOnEnd?.call?.(utterance, e);
                if (onEnd) onEnd();
                resolve();
            };

            synth.speak(utterance);
        });
    }

    /**
     * Speak a list of words sequentially (for synonym lists).
     * @param {string[]} words - Array of words to speak
     * @param {Object} options
     */
    async function speakSequence(words, options = {}) {
        const { rate = 0.8, pauseBetween = 800 } = options;
        for (let i = 0; i < words.length; i++) {
            await speak(words[i], { rate });
            if (i < words.length - 1) {
                await delay(pauseBetween);
            }
        }
    }

    function stop() {
        if (synth) {
            synth.cancel();
        }
        isSpeaking = false;
    }

    function getIsSpeaking() {
        return isSpeaking;
    }

    function getVoiceInfo() {
        if (!preferredVoice) return null;
        return {
            name: preferredVoice.name,
            lang: preferredVoice.lang,
        };
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    return { init, speak, speakSequence, stop, getIsSpeaking, getVoiceInfo };
})();
