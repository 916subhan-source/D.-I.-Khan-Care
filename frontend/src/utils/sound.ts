/**
 * D.I. Khan Care — Premium Healthcare Startup Chime
 * Synthesized in real-time via Web Audio API with zero latency, zero download delay,
 * and seamless fallback to /startup_chime.wav.
 */

let sharedAudioCtx: AudioContext | null = null;
let hasPlayedThisSession = false;

export function isAudioPlayed(): boolean {
  return hasPlayedThisSession;
}

export function playStartupChime(volume = 0.45, force = false): Promise<boolean> {
  // Play once per app lifecycle unless explicitly forced
  if (hasPlayedThisSession && !force) return Promise.resolve(true);

  return new Promise((resolve) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        playAudioFallback(volume).then(resolve);
        return;
      }

      if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
        sharedAudioCtx = new AudioContextClass();
      }

      if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume().then(() => {
          hasPlayedThisSession = true;
          synthesizeChime(sharedAudioCtx!, volume);
          resolve(true);
        }).catch(() => {
          playAudioFallback(volume).then(resolve);
        });
        return;
      }

      hasPlayedThisSession = true;
      synthesizeChime(sharedAudioCtx, volume);
      resolve(true);
    } catch (_) {
      playAudioFallback(volume).then(resolve);
    }
  });
}

function synthesizeChime(ctx: AudioContext, volume: number): void {
  try {
    const now = ctx.currentTime;

    // Master volume gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    // 1. Soft Warm Heartbeat / Sub Pulse (80Hz -> 48Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(80, now);
    subOsc.frequency.exponentialRampToValueAtTime(48, now + 0.32);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.28, now + 0.04);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    subOsc.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.4);

    // 2. Harmonic Medical Chimes: G4 (392Hz), C5 (523Hz), E5 (659Hz), Octave High C6 (1046Hz), G5 (784Hz)
    const chimeNotes = [
      { delay: 0.04, freq: 392.00, dur: 1.15, vol: 0.32 },
      { delay: 0.16, freq: 523.25, dur: 1.15, vol: 0.36 },
      { delay: 0.28, freq: 659.25, dur: 1.2, vol: 0.40 },
      { delay: 0.30, freq: 1046.50, dur: 0.9, vol: 0.15 }, // Crystal shimmer
      { delay: 0.42, freq: 783.99, dur: 1.1, vol: 0.30 }  // Warm resolution
    ];

    chimeNotes.forEach(({ delay, freq, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.linearRampToValueAtTime(vol, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.05);
    });
  } catch (_) {
    playAudioFallback(volume);
  }
}

function playAudioFallback(volume: number): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio('/startup_chime.wav');
      audio.volume = volume;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          hasPlayedThisSession = true;
          resolve(true);
        }).catch(() => {
          // Autoplay blocked by browser policy until first gesture
          resolve(false);
        });
      } else {
        hasPlayedThisSession = true;
        resolve(true);
      }
    } catch (_) {
      resolve(false);
    }
  });
}
