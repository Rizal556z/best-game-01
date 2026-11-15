// Emberhold — Lantern Defense: every sound is synthesized with WebAudio —
// no audio files, no network. Created lazily on the first user gesture, so the
// game stays silent (and error-free) until the player interacts or a shot is staged.
const NOTE = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, E5: 659.25, G5: 783.99, A5: 880.0 };

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicOn = true;
    this.step = 0;
    this.nextStepTime = 0;
    // A slow lantern-lullaby: A minor pentatonic, one soft pluck a step.
    this.melody = [NOTE.A4, 0, NOTE.C5, 0, NOTE.E5, 0, NOTE.D4, 0,
      NOTE.C5, 0, NOTE.A4, 0, NOTE.G4, 0, NOTE.E4, 0];
  }

  /** Create the audio graph. Safe to call repeatedly; does nothing when muted off is impossible. */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.nextStepTime = this.ctx.currentTime + 0.1;
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  /** One oscillator blip: the building block of every effect. */
  tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** A short burst of filtered noise (impacts, pops). */
  noise(dur, vol, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  click() { this.tone(660, 0.06, 'triangle', 0.12); }
  error() { this.tone(160, 0.16, 'square', 0.1, 0, 110); }
  build() { this.tone(392, 0.09, 'triangle', 0.16); this.tone(523.25, 0.12, 'triangle', 0.14, 0.07); }
  shoot(kind) {
    if (kind === 'ember') this.tone(880, 0.07, 'square', 0.05, 0, 520);
    else if (kind === 'frost') this.tone(1240, 0.12, 'sine', 0.07, 0, 700);
    else this.tone(220, 0.1, 'sawtooth', 0.06, 0, 90);
  }
  hit() { this.noise(0.05, 0.06); }
  pop() { this.tone(520, 0.08, 'sine', 0.12, 0, 900); this.noise(0.06, 0.08); }
  coin() { this.tone(988, 0.07, 'sine', 0.1); this.tone(1319, 0.12, 'sine', 0.1, 0.06); }
  leak() { this.tone(196, 0.3, 'sawtooth', 0.16, 0, 98); this.tone(147, 0.35, 'sawtooth', 0.12, 0.05, 73); }
  horn() {
    this.tone(220, 0.5, 'triangle', 0.16);
    this.tone(330, 0.5, 'triangle', 0.12, 0.02);
    this.tone(440, 0.55, 'triangle', 0.1, 0.04);
  }
  upgrade() { this.tone(523.25, 0.09, 'triangle', 0.14); this.tone(659.25, 0.09, 'triangle', 0.12, 0.08); this.tone(784, 0.16, 'triangle', 0.12, 0.16); }
  sell() { this.tone(784, 0.08, 'triangle', 0.1); this.tone(523.25, 0.12, 'triangle', 0.1, 0.07); }
  win() {
    [523.25, 659.25, 784, 1046.5].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.16, i * 0.14));
  }
  lose() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.14, i * 0.18));
  }

  /** Advance the background lullaby; called every frame with the game's clock. */
  tickMusic(nowSeconds) {
    if (!this.ctx || this.muted || !this.musicOn) return;
    const stepDur = 0.32;
    while (this.nextStepTime < this.ctx.currentTime + 0.15) {
      const note = this.melody[this.step % this.melody.length];
      if (note > 0) {
        const when = Math.max(0, this.nextStepTime - this.ctx.currentTime);
        this.tone(note, 0.5, 'sine', 0.045, when);
        if (this.step % 8 === 0) this.tone(note / 2, 1.6, 'sine', 0.03, when);
      }
      this.step += 1;
      this.nextStepTime += stepDur;
    }
    void nowSeconds;
  }
}
