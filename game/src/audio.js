// Synthesized sound only: no audio files, everything is a WebAudio
// oscillator shaped in code. The context is created on the first user
// gesture (a key press or click), so browsers never block it.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  /** Unlock the context from a gesture; safe to call on every press. */
  function unlock() {
    const ctx = ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone(freqStart, freqEnd, duration, type, volume, delay = 0) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noise(duration, volume, delay = 0) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(gain).connect(ctx.destination);
    source.start(start);
  }

  return {
    unlock,
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    /** The turkey's gobble when it jumps: two quick low honks. */
    gobble() {
      tone(320, 140, 0.12, 'sawtooth', 0.12);
      tone(300, 120, 0.12, 'sawtooth', 0.1, 0.1);
    },
    /** A bright cluck when corn or a feather is picked up. */
    cluck() {
      tone(660, 880, 0.09, 'square', 0.08);
      tone(880, 990, 0.07, 'square', 0.06, 0.08);
    },
    /** A low thud when the turkey is hit. */
    thud() {
      noise(0.18, 0.25);
      tone(120, 45, 0.2, 'sine', 0.3);
    },
    /** A short fanfare when the turkey reaches the forest. */
    jingle() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((note, i) => tone(note, note, 0.22, 'triangle', 0.14, i * 0.13));
    },
    /** A sad descending slide when the farmer catches the turkey. */
    caught() {
      tone(392, 196, 0.5, 'sawtooth', 0.12);
      tone(311, 155, 0.6, 'sawtooth', 0.1, 0.25);
    },
  };
}
