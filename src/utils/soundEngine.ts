import { FeltThemeId } from '../types/game';

/**
 * Pure Web Audio API sound synthesizer & generative table ambience engine.
 * Zero external audio assets — all SFX and ambient soundscapes are synthesized procedurally.
 */
class LuxurySoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientNodes: AudioNode[] = [];
  private activeTable: FeltThemeId | null = null;

  private sfxVol = 0.75;
  private musicVol = 0.35;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private applyVolumes() {
    if (!this.ctx || !this.sfxGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.sfxGain.gain.setTargetAtTime(this.muted ? 0 : this.sfxVol, now, 0.04);
    this.musicGain.gain.setTargetAtTime(this.muted ? 0 : this.musicVol * 0.14, now, 0.08);
  }

  public setVolumes(music: number, sfx: number, muted: boolean) {
    this.musicVol = music;
    this.sfxVol = sfx;
    this.muted = muted;
    this.applyVolumes();
  }

  public startAmbience(tableId: FeltThemeId) {
    if (this.activeTable === tableId && this.ambientNodes.length > 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;

    this.stopAmbience();
    this.activeTable = tableId;

    const chordMap: Record<FeltThemeId, { freqs: number[]; wave: OscillatorType; cutoff: number }> = {
      emerald: { freqs: [110, 164.81, 220, 277.18], wave: 'sine', cutoff: 420 },
      crimson: { freqs: [98, 146.83, 196, 293.66], wave: 'triangle', cutoff: 480 },
      sapphire: { freqs: [130.81, 164.81, 196, 246.94], wave: 'sine', cutoff: 450 },
      obsidian: { freqs: [82.41, 123.47, 164.81, 246.94], wave: 'sine', cutoff: 380 },
    };

    const cfg = chordMap[tableId];
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cfg.cutoff;
    filter.connect(this.musicGain);
    this.ambientNodes.push(filter);

    // Slow LFO modulating ambient filter warmth
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.ambientNodes.push(lfo, lfoGain);

    cfg.freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = cfg.wave;
      osc.frequency.value = f;
      osc.detune.value = (idx - 1.5) * 4;
      gain.gain.value = 0.22 / cfg.freqs.length;
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      this.ambientNodes.push(osc, gain);
    });
  }

  public stopAmbience() {
    this.ambientNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // Node already stopped
      }
    });
    this.ambientNodes = [];
    this.activeTable = null;
  }

  public playCardDeal() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;

    const len = Math.floor(ctx.sampleRate * 0.085);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35));
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(820, now + 0.08);
    filter.Q.value = 1.6;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
  }

  public playCardFlip() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.06);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playChipClink(pitchOffset = 0) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const baseFreq = 2250 + (pitchOffset % 6) * 140;

    [baseFreq, baseFreq * 1.48].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(i === 0 ? 0.14 : 0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.07);
    });
  }

  public playShuffle() {
    for (let i = 0; i < 6; i++) {
      window.setTimeout(() => this.playCardDeal(), i * 38);
    }
  }

  public playWinFanfare(isBlackjack: boolean) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const notes = isBlackjack ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.48);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }

  public playLossTone() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(115, now + 0.28);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playUiClick() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(760, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }
}

export const soundEngine = new LuxurySoundEngine();
