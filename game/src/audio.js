// NEON VOID — sound. All synth, no audio files: a tiny WebAudio helper
// that builds every effect from oscillators and filtered noise. The context
// is created lazily on the first user gesture (browsers demand that).
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuf = null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  blip(freqA, freqB, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqA, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqB), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  noise(dur, filterFreq, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  shoot() { this.blip(880, 220, 0.08, 'square', 0.10); }
  enemyShoot() { this.blip(320, 140, 0.12, 'sawtooth', 0.06); }
  explosion(big) {
    this.noise(big ? 0.5 : 0.25, big ? 900 : 1400, big ? 0.5 : 0.3);
    this.blip(big ? 160 : 220, 40, big ? 0.4 : 0.2, 'sine', 0.35);
  }
  hit() { this.blip(180, 60, 0.15, 'sawtooth', 0.25); this.noise(0.1, 800, 0.2); }
  dash() { this.noise(0.18, 2400, 0.18); }
  powerup() {
    this.blip(523, 523, 0.09, 'sine', 0.2);
    setTimeout(() => this.blip(659, 659, 0.09, 'sine', 0.2), 70);
    setTimeout(() => this.blip(784, 784, 0.14, 'sine', 0.22), 140);
  }
  upgrade() {
    this.blip(392, 392, 0.1, 'triangle', 0.22);
    setTimeout(() => this.blip(523, 523, 0.1, 'triangle', 0.22), 80);
    setTimeout(() => this.blip(659, 659, 0.18, 'triangle', 0.24), 160);
  }
  waveStart() { this.blip(440, 660, 0.16, 'triangle', 0.2); }
  bossWarn() {
    this.blip(110, 55, 0.6, 'sawtooth', 0.3);
    setTimeout(() => this.blip(110, 55, 0.6, 'sawtooth', 0.3), 250);
  }
  gameOver() {
    this.blip(330, 330, 0.2, 'triangle', 0.22);
    setTimeout(() => this.blip(262, 262, 0.2, 'triangle', 0.22), 180);
    setTimeout(() => this.blip(196, 98, 0.5, 'triangle', 0.24), 360);
  }
  click() { this.blip(660, 660, 0.05, 'sine', 0.12); }
}
