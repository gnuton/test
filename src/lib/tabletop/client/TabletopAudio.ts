/**
 * Tabletop Nexus - Web Audio Sound Synthesizer
 * Zero external asset dependencies - synthesized realistic tabletop audio
 */

export class TabletopAudio {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public volume: number = 0.7;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playDiceClatter(intensity: number = 0.8) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const count = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const delay = (i * 0.04 + Math.random() * 0.03);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.value = 1400 + Math.random() * 800;
      filter.Q.value = 5;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + Math.random() * 280, t + delay);
      osc.frequency.exponentialRampToValueAtTime(120, t + delay + 0.04);

      const hitVol = (intensity * this.volume * 0.25) / (i + 1);
      gain.gain.setValueAtTime(hitVol, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + delay);
      osc.stop(t + delay + 0.06);
    }
  }

  public playCardDeal() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.06;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, t);
    filter.frequency.exponentialRampToValueAtTime(800, t + 0.05);
    filter.Q.value = 2.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(t);
  }

  public playCardShuffle() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    for (let i = 0; i < 7; i++) {
      setTimeout(() => this.playCardDeal(), i * 40);
    }
  }

  public playChipClink(intensity: number = 0.8) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // High pitched ceramic chime
    osc.frequency.setValueAtTime(3200 + Math.random() * 600, t);
    osc.frequency.exponentialRampToValueAtTime(2800, t + 0.08);

    gain.gain.setValueAtTime(0.2 * intensity * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playWoodKnock(intensity: number = 0.8) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240 + Math.random() * 80, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    gain.gain.setValueAtTime(0.3 * intensity * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playTableFlip() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Heavy low frequency boom
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.8);

    gain.gain.setValueAtTime(0.6 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.9);

    // Chaos clatter
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        this.playWoodKnock(0.9);
        if (i % 2 === 0) this.playDiceClatter(0.9);
        if (i % 3 === 0) this.playChipClink(0.9);
      }, 50 + i * 70);
    }
  }

  public playPing() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t); // A5 note
    osc.frequency.setValueAtTime(1760, t + 0.08); // A6 ping

    gain.gain.setValueAtTime(0.25 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.4);
  }
}
