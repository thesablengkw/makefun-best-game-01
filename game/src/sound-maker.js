// sound-maker.js — all audio: generated oscillator sounds for every
// action, ambient drone, mute. No audio files, no network.
export class SoundMaker {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.droneOsc = null;
    this.droneGain = null;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  tone(freq, dur, type, vol, slideTo) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  play(name) {
    if (this.muted) return;
    if (name === 'move') this.tone(320, 0.09, 'sine', 0.08, 420);
    else if (name === 'attack') this.tone(180, 0.12, 'square', 0.1, 90);
    else if (name === 'combo') { this.tone(520, 0.1, 'triangle', 0.14, 780); this.tone(780, 0.16, 'triangle', 0.12, 1040); }
    else if (name === 'hurt') this.tone(140, 0.2, 'sawtooth', 0.1, 70);
    else if (name === 'fall') this.tone(220, 0.35, 'sawtooth', 0.1, 55);
    else if (name === 'win') { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'triangle', 0.12), i * 110)); }
    else if (name === 'lose') { [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'sine', 0.1), i * 130)); }
    else if (name === 'click') this.tone(660, 0.05, 'sine', 0.07);
    else if (name === 'select') this.tone(440, 0.06, 'sine', 0.07, 520);
  }

  // Quiet ambient drone under play; pitch shifts per pass.
  startDrone(pass) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    // Retune instead of stacking a second drone when the pass changes.
    if (this.droneOsc) {
      this.droneOsc.frequency.value = 55 + pass * 4;
      return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 55 + pass * 4;
    gain.gain.value = 0.025;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    this.droneOsc = osc;
    this.droneGain = gain;
  }

  stopDrone() {
    if (this.droneOsc) { try { this.droneOsc.stop(); } catch (e) {} this.droneOsc = null; }
  }

  setMuted(m) {
    this.muted = m;
    if (m) this.stopDrone();
  }
}
