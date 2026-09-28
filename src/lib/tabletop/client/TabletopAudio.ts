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

  public playFlick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(650, t + 0.05);

    gain.gain.setValueAtTime(0.35 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playLock() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, t);
    osc.frequency.setValueAtTime(1300, t + 0.04);

    gain.gain.setValueAtTime(0.2 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // TTS Turn Chime / Bell
  public playTurnChime() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 major chord arpeggio
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      gain.gain.setValueAtTime(0.18 * this.volume, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.06 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.7);
    });
  }

  // TTS Turn / Clock Countdown Tick
  public playTimerTick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);

    gain.gain.setValueAtTime(0.12 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // TTS Turn / Clock Alarm Buzzer
  public playTimerAlarm() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, t + i * 0.12);

      gain.gain.setValueAtTime(0.15 * this.volume, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.1);
    }
  }

  // TTS Joint Snap
  public playJointSnap() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.04);

    gain.gain.setValueAtTime(0.15 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  // TTS Procedural Jukebox / Ambient Background Music
  private musicInterval: NodeJS.Timeout | null = null;
  public currentTrackId: string | null = null;
  public musicVolume: number = 0.35;

  public playMusicTrack(genre: 'tavern' | 'lofi' | 'casino' | 'fantasy' | 'space' | 'arena') {
    this.stopMusic();
    this.initCtx();
    if (!this.ctx) return;

    this.currentTrackId = genre;
    const chordProgressions: Record<string, number[][]> = {
      tavern: [
        [220, 261.63, 329.63], // Am
        [174.61, 220, 261.63], // F
        [196, 246.94, 293.66], // G
        [164.81, 196, 246.94], // Em
      ],
      lofi: [
        [261.63, 329.63, 392, 493.88], // Cmaj7
        [220, 261.63, 329.63, 392],    // Am7
        [293.66, 349.23, 440, 523.25], // Dm7
        [196, 246.94, 293.66, 349.23], // G7
      ],
      casino: [
        [261.63, 329.63, 392, 466.16], // C7
        [349.23, 440, 523.25, 622.25], // F7
        [196, 246.94, 293.66, 349.23], // G7
        [261.63, 329.63, 392, 466.16], // C7
      ],
      fantasy: [
        [146.83, 220, 293.66, 369.99], // Dm9
        [196, 293.66, 392, 493.88],    // G
        [220, 277.18, 329.63, 440],    // A
        [146.83, 220, 293.66, 440],    // Dm
      ],
      space: [
        [110, 164.81, 220, 329.63],
        [130.81, 196, 261.63, 392],
        [98, 146.83, 196, 293.66],
        [110, 164.81, 220, 329.63],
      ],
      arena: [
        [146.83, 220, 293.66],
        [174.61, 261.63, 349.23],
        [130.81, 196, 261.63],
        [146.83, 220, 293.66],
      ],
    };

    const chords = chordProgressions[genre] || chordProgressions.tavern;
    let chordIdx = 0;

    const playChord = () => {
      if (!this.currentTrackId || !this.ctx) return;
      const t = this.ctx.currentTime;
      const currentChord = chords[chordIdx % chords.length];
      chordIdx++;

      currentChord.forEach((freq, noteIdx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = genre === 'space' ? 'sine' : genre === 'lofi' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t + noteIdx * 0.04);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(genre === 'space' ? 600 : 1200, t);

        const chordGain = (this.musicVolume * this.volume * 0.08) / currentChord.length;
        gain.gain.setValueAtTime(0.001, t + noteIdx * 0.04);
        gain.gain.linearRampToValueAtTime(chordGain, t + noteIdx * 0.04 + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.7);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(t + noteIdx * 0.04);
        osc.stop(t + 2.8);
      });
    };

    playChord();
    this.musicInterval = setInterval(playChord, 2800);
  }

  public stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.currentTrackId = null;
  }
}
