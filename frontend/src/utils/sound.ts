/**
 * D.I. Khan Care — Premium Healthcare Startup Chime
 * Synthesized in real-time via Web Audio API with zero latency, zero download delay,
 * and seamless fallback to /startup_chime.wav.
 */

let sharedAudioCtx: AudioContext | null = (typeof window !== 'undefined' && (window as any).__dikhan_audio_ctx) || null;
let hasPlayedThisSession = typeof window !== 'undefined' && !!(window as any).__dikhan_chime_played;

export function isAudioPlayed(): boolean {
  return hasPlayedThisSession || (typeof window !== 'undefined' && !!(window as any).__dikhan_chime_played);
}

export function playStartupChime(volume = 0.45, force = false): Promise<boolean> {
  // If already played at 0ms (e.g. by index.html), never play again late unless explicitly forced
  if (!force && (hasPlayedThisSession || (typeof window !== 'undefined' && (window as any).__dikhan_chime_played))) {
    return Promise.resolve(true);
  }

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
          if (typeof window !== 'undefined') (window as any).__dikhan_chime_played = true;
          synthesizeChime(sharedAudioCtx!, volume);
          resolve(true);
        }).catch(() => {
          playAudioFallback(volume).then(resolve);
        });
        return;
      }

      hasPlayedThisSession = true;
      if (typeof window !== 'undefined') (window as any).__dikhan_chime_played = true;
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

/**
 * ── WhatsApp Outgoing Message Pop / Button Press Sound ──
 * Synthesizes the signature buoyant, two-tone "blip-pop" sound effect
 * in real-time with 0ms latency using the Web Audio API.
 */
let lastSoundTime = 0;

export function playButtonClickSound(volume = 0.25): void {
  const nowMs = Date.now();
  if (nowMs - lastSoundTime < 65) return; // Debounce rapid multi-events
  lastSoundTime = nowMs;

  try {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('dikhan_sound_muted') === 'true') return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }

    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }

    synthesizeWhatsAppPop(sharedAudioCtx, volume);
  } catch (_) {
    // Ignore audio errors silently
  }
}

export const playWhatsAppPop = playButtonClickSound;

function synthesizeWhatsAppPop(ctx: AudioContext, volume: number): void {
  try {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    // Tone 1: Initial ascending blip (920Hz -> 1080Hz, 0.00s to 0.035s)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(920, now);
    osc1.frequency.exponentialRampToValueAtTime(1080, now + 0.034);

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.35, now + 0.003);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.038);

    // Tone 2: Signature buoyant high pop (1380Hz -> 1580Hz, 0.032s to 0.11s)
    const t2 = now + 0.032;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1380, t2);
    osc2.frequency.exponentialRampToValueAtTime(1580, t2 + 0.07);

    gain2.gain.setValueAtTime(0.0001, t2);
    gain2.gain.linearRampToValueAtTime(0.48, t2 + 0.003);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.078);

    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(t2);
    osc2.stop(t2 + 0.082);

    // Tone 3: Subtle glassy overtone for crisp acoustic presence on phone speakers
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(2760, t2);
    osc3.frequency.exponentialRampToValueAtTime(3160, t2 + 0.05);

    gain3.gain.setValueAtTime(0.0001, t2);
    gain3.gain.linearRampToValueAtTime(0.09, t2 + 0.003);
    gain3.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.055);

    osc3.connect(gain3);
    gain3.connect(masterGain);
    osc3.start(t2);
    osc3.stop(t2 + 0.06);
  } catch (_) {
    // Ignore audio errors silently
  }
}

/**
 * Global Button Sound Initializer:
 * Captures pointer clicks across all interactive buttons, links, tabs,
 * and submit controls with 0ms touch latency.
 */
export function initGlobalButtonSounds(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handlePointerDown = (e: MouseEvent | TouchEvent) => {
    try {
      let target = e.target as HTMLElement | null;
      let depth = 0;

      while (target && depth < 5) {
        const tagName = target.tagName ? target.tagName.toLowerCase() : '';
        const role = target.getAttribute ? target.getAttribute('role') : '';

        // Exclude typing text fields, contenteditable, and selects
        if (
          tagName === 'textarea' ||
          (tagName === 'input' && !['button', 'submit', 'reset', 'checkbox', 'radio'].includes((target as HTMLInputElement).type || '')) ||
          target.isContentEditable
        ) {
          return;
        }

        const isInteractive =
          tagName === 'button' ||
          role === 'button' ||
          role === 'tab' ||
          (tagName === 'input' && ['button', 'submit', 'reset'].includes((target as HTMLInputElement).type)) ||
          target.classList?.contains('cursor-pointer') ||
          (tagName === 'a' && (target.getAttribute('href') || role === 'button' || target.classList?.contains('cursor-pointer')));

        if (isInteractive) {
          // If disabled, don't play sound
          if (
            (target as HTMLButtonElement).disabled ||
            target.getAttribute('aria-disabled') === 'true' ||
            target.classList?.contains('pointer-events-none') ||
            target.classList?.contains('opacity-50')
          ) {
            return;
          }

          playButtonClickSound();
          return;
        }

        target = target.parentElement;
        depth++;
      }
    } catch (_) {
      // Ignore
    }
  };

  // 'pointerdown' provides instant, zero-latency physical tactile feedback
  window.addEventListener('pointerdown', handlePointerDown, { passive: true, capture: true });

  return () => {
    window.removeEventListener('pointerdown', handlePointerDown, { capture: true } as any);
  };
}
