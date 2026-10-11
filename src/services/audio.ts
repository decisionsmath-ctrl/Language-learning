import { SupportedLanguageCode } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';

let currentAudio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let soundEffectsEnabled: boolean = true;

// Initialize or resume Web Audio context
const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (err) {
    console.warn('Web Audio API not supported or blocked:', err);
    return null;
  }
};

export const isSoundEffectsEnabled = (): boolean => soundEffectsEnabled;

export const setSoundEffectsEnabled = (enabled: boolean): void => {
  soundEffectsEnabled = enabled;
};

/**
 * Play a pleasant, melodic two-tone chime for correct answers using Web Audio API
 */
export const playCorrectSound = (): void => {
  if (!soundEffectsEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.24);

    // Note 2: A5 (880 Hz) - slightly delayed for a bright, cheerful upward fifth chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.08);

    gain2.gain.setValueAtTime(0.0001, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.22, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.4);
  } catch (err) {
    console.warn('Error playing correct sound:', err);
  }
};

/**
 * Play a gentle, soft descending double-tone for incorrect answers using Web Audio API
 */
export const playIncorrectSound = (): void => {
  if (!soundEffectsEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Gentle triangle wave - lower pitch, non-abrasive
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    // Frequency slide down from 320 Hz to 220 Hz
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  } catch (err) {
    console.warn('Error playing incorrect sound:', err);
  }
};

/**
 * Play a festive completion arpeggio when finishing a quiz or daily deck
 */
export const playCompleteSound = (): void => {
  if (!soundEffectsEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // C5, E5, G5, C6 arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  } catch (err) {
    console.warn('Error playing complete sound:', err);
  }
};

export const playAudio = async (
  text: string,
  languageCode: SupportedLanguageCode,
  preferGeminiTTS: boolean = false
): Promise<void> => {
  if (!text) return;

  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  // 1. Try Gemini TTS if requested or if available
  if (preferGeminiTTS) {
    try {
      const response = await fetch('/api/gemini/pronounce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: languageCode }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioData) {
          const audioUrl = `data:${data.format || 'audio/wav'};base64,${data.audioData}`;
          const audio = new Audio(audioUrl);
          currentAudio = audio;
          await audio.play();
          return;
        }
      }
    } catch {
      // Fallback silently to Web Speech synthesis
    }
  }

  // 2. Web Speech Synthesis (zero latency, offline resilient)
  if ('speechSynthesis' in window) {
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode);
    const speechCode = langConfig?.speechCode || 'es-ES';

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechCode;
    utterance.rate = 0.9; // Slightly slower for language learners to hear phonemes clearly

    // Attempt to pick a natural native voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(
      (v) =>
        v.lang.startsWith(speechCode.slice(0, 2)) &&
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium'))
    ) || voices.find((v) => v.lang.startsWith(speechCode.slice(0, 2)));

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
};
