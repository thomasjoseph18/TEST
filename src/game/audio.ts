// Procedural audio: no audio files to license or download. Everything is synthesised with WebAudio,
// and every call is safe when audio is unavailable (SSR, blocked, old browsers).

export type AmbienceKind = 'none' | 'space' | 'command' | 'moon' | 'mars' | 'habitat';
export type SfxName =
  | 'blip' | 'confirm' | 'error' | 'alarm' | 'step' | 'hiss' | 'whoosh' | 'radio' | 'success' | 'boom' | 'thud'
  | 'scan' | 'unlock' | 'door' | 'engine' | 'pickup';

type Ctx = AudioContext;

class AudioEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private ambGain: GainNode | null = null;
  private ambNodes: AudioNode[] = [];
  private ambKind: AmbienceKind = 'none';
  private noiseBuf: AudioBuffer | null = null;
  private breathTimer: number | null = null;
  private engineNodes: { osc: OscillatorNode; gain: GainNode } | null = null;
  private volume = 0.7;
  private enabled = true;
  private voiceOn = true;
  private lastStep = 0;

  /** Must be called from a user gesture (click / key) before sound can play. Safe to call repeatedly. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? this.volume : 0;
        this.master.connect(this.ctx.destination);
        this.ambGain = this.ctx.createGain();
        this.ambGain.gain.value = 0;
        this.ambGain.connect(this.master);
        const len = this.ctx.sampleRate * 2;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      if (this.ambKind !== 'none') this.startAmbience(this.ambKind);
    } catch { /* audio is optional */ }
  }

  configure(opts: { enabled: boolean; volume: number; voice: boolean }): void {
    this.enabled = opts.enabled;
    this.volume = Math.min(1, Math.max(0, opts.volume));
    this.voiceOn = opts.voice;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime, 0.05);
    if (!this.enabled || !this.voiceOn) this.stopSpeaking();
  }

  get ready(): boolean { return !!this.ctx; }

  // ---------------- ambience ----------------
  ambience(kind: AmbienceKind): void {
    this.ambKind = kind;
    if (!this.ctx) return;
    this.startAmbience(kind);
  }

  private startAmbience(kind: AmbienceKind): void {
    const ctx = this.ctx;
    if (!ctx || !this.ambGain || !this.noiseBuf) return;
    try {
      const now = ctx.currentTime;
      const old = this.ambNodes;
      const oldGain = this.ambGain;
      // fade out the old bed, then build a fresh gain for the new one
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setTargetAtTime(0, now, 0.3);
      window.setTimeout(() => old.forEach((n) => { try { (n as OscillatorNode).stop?.(); n.disconnect(); } catch { /* */ } }), 1200);
      this.ambGain = ctx.createGain();
      this.ambGain.gain.value = 0;
      this.ambGain.connect(this.master!);
      this.ambNodes = [];
      if (kind === 'none') return;

      const g = this.ambGain;
      const tone = (freq: number, type: OscillatorType, vol: number, detune = 0) => {
        const o = ctx.createOscillator();
        o.type = type; o.frequency.value = freq; o.detune.value = detune;
        const og = ctx.createGain(); og.gain.value = vol;
        o.connect(og); og.connect(g); o.start();
        this.ambNodes.push(o, og);
        return o;
      };
      const noise = (cutoff: number, vol: number, q = 0.7, type: BiquadFilterType = 'lowpass') => {
        const s = ctx.createBufferSource();
        s.buffer = this.noiseBuf; s.loop = true;
        const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = cutoff; f.Q.value = q;
        const ng = ctx.createGain(); ng.gain.value = vol;
        s.connect(f); f.connect(ng); ng.connect(g); s.start();
        this.ambNodes.push(s, f, ng);
      };
      const lfo = (target: AudioParam, rate: number, depth: number) => {
        const l = ctx.createOscillator(); l.frequency.value = rate;
        const lg = ctx.createGain(); lg.gain.value = depth;
        l.connect(lg); lg.connect(target); l.start();
        this.ambNodes.push(l, lg);
      };

      if (kind === 'space') {
        tone(55, 'sine', 0.22); tone(82.4, 'sine', 0.1, 6); tone(110.5, 'triangle', 0.04, -8);
        noise(260, 0.05);
      } else if (kind === 'command') {
        tone(60, 'sine', 0.12); tone(120.3, 'sine', 0.05, 4);
        noise(900, 0.03, 0.5, 'bandpass');
        const o = tone(880, 'sine', 0.004); lfo(o.frequency, 0.13, 40);
      } else if (kind === 'habitat') {
        tone(50, 'sine', 0.14); tone(100.6, 'triangle', 0.035, 3);
        noise(700, 0.045, 0.4, 'bandpass');
        const n = ctx.createOscillator(); n.frequency.value = 0.35;
        const ng = ctx.createGain(); ng.gain.value = 0.015; n.connect(ng); ng.connect(g.gain); n.start();
        this.ambNodes.push(n, ng);
      } else if (kind === 'moon') {
        // inside a helmet: very quiet, mostly a suit fan and life-support hum
        tone(48, 'sine', 0.13); tone(96.2, 'sine', 0.04, 5);
        noise(480, 0.03, 0.6, 'bandpass');
      } else if (kind === 'mars') {
        // thin wind carried through the suit
        noise(380, 0.1, 0.7);
        tone(52, 'sine', 0.11); tone(104.5, 'sine', 0.035, 7);
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
        const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
        const sg = ctx.createGain(); sg.gain.value = 0.06;
        s.connect(f); f.connect(sg); sg.connect(g); s.start();
        lfo(f.frequency, 0.07, 260);
        this.ambNodes.push(s, f, sg);
      }
      g.gain.setTargetAtTime(1, now + 0.1, 0.8);
    } catch { /* */ }
  }

  // ---------------- sound effects ----------------
  sfx(name: SfxName, strength = 1): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.enabled) return;
    try {
      const t = ctx.currentTime;
      const out = this.master;
      const beep = (freq: number, dur: number, vol = 0.18, type: OscillatorType = 'sine', when = 0, slideTo?: number) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t + when);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + when + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t + when);
        g.gain.exponentialRampToValueAtTime(vol * strength, t + when + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + when + dur);
        o.connect(g); g.connect(out); o.start(t + when); o.stop(t + when + dur + 0.05);
      };
      const burst = (dur: number, cutoff: number, vol: number, type: BiquadFilterType = 'lowpass', when = 0, q = 0.7) => {
        const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
        const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = cutoff; f.Q.value = q;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t + when);
        g.gain.exponentialRampToValueAtTime(vol * strength, t + when + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + when + dur);
        s.connect(f); f.connect(g); g.connect(out); s.start(t + when, Math.random()); s.stop(t + when + dur + 0.05);
      };
      switch (name) {
        case 'blip': beep(920, 0.07, 0.1, 'sine'); break;
        case 'confirm': beep(660, 0.09, 0.14); beep(990, 0.14, 0.14, 'sine', 0.09); break;
        case 'error': beep(180, 0.22, 0.16, 'square'); break;
        case 'alarm': for (let i = 0; i < 3; i++) beep(i % 2 ? 620 : 880, 0.22, 0.14, 'square', i * 0.26); break;
        case 'step': {
          const now = performance.now();
          if (now - this.lastStep < 140) return;
          this.lastStep = now;
          burst(0.1, 260 + Math.random() * 120, 0.2, 'lowpass');
          break;
        }
        case 'thud': burst(0.14, 180, 0.28); break;
        case 'hiss': burst(0.9, 3800, 0.1, 'highpass'); break;
        case 'whoosh': burst(1.2, 700, 0.18, 'bandpass', 0, 0.5); break;
        case 'radio': burst(0.12, 2600, 0.09, 'bandpass', 0, 1.2); beep(1500, 0.06, 0.05, 'sine', 0.01); break;
        case 'success': [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.22, 0.14, 'triangle', i * 0.1)); break;
        case 'unlock': [784, 988, 1319].forEach((f, i) => beep(f, 0.3, 0.14, 'sine', i * 0.12)); break;
        case 'boom': burst(1.6, 160, 0.5); beep(60, 1.2, 0.3, 'sine', 0, 28); break;
        case 'scan': beep(400, 0.5, 0.07, 'sine', 0, 1400); break;
        case 'door': burst(0.5, 500, 0.2, 'lowpass'); beep(110, 0.4, 0.14, 'sine', 0, 70); break;
        case 'pickup': beep(740, 0.08, 0.12); beep(1110, 0.12, 0.12, 'sine', 0.06); break;
        case 'engine': this.rumble(); break;
      }
    } catch { /* */ }
  }

  private rumble(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 140;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    s.loop = true; s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + 3.4);
  }

  /** Rover motor: pitch follows speed. Call with null to stop. */
  motor(speed01: number | null): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    try {
      if (speed01 === null) {
        if (this.engineNodes) {
          const { osc, gain } = this.engineNodes;
          gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
          window.setTimeout(() => { try { osc.stop(); } catch { /* */ } }, 400);
          this.engineNodes = null;
        }
        return;
      }
      if (!this.engineNodes) {
        const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 55;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
        const gain = ctx.createGain(); gain.gain.value = 0;
        osc.connect(lp); lp.connect(gain); gain.connect(this.master); osc.start();
        this.engineNodes = { osc, gain };
      }
      const { osc, gain } = this.engineNodes;
      osc.frequency.setTargetAtTime(48 + speed01 * 70, ctx.currentTime, 0.1);
      gain.gain.setTargetAtTime(0.03 + speed01 * 0.07, ctx.currentTime, 0.1);
    } catch { /* */ }
  }

  /** Soft breathing inside the helmet while on EVA. */
  breathing(on: boolean, rate = 1): void {
    if (this.breathTimer !== null) { window.clearInterval(this.breathTimer); this.breathTimer = null; }
    if (!on) return;
    const ms = 3400 / Math.max(0.5, rate);
    const breathe = () => {
      const ctx = this.ctx;
      if (!ctx || !this.master || !this.enabled) return;
      const t = ctx.currentTime;
      const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + 1.6);
    };
    breathe();
    this.breathTimer = window.setInterval(breathe, ms);
  }

  // ---------------- voice (optional) ----------------
  speak(text: string, opts: { pitch?: number; rate?: number } = {}): void {
    if (!this.enabled || !this.voiceOn) return;
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[“”]/g, ''));
      u.volume = this.volume; u.pitch = opts.pitch ?? 1; u.rate = opts.rate ?? 1;
      window.speechSynthesis.speak(u);
    } catch { /* */ }
  }

  stopSpeaking(): void {
    try { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); } catch { /* */ }
  }

  stopAll(): void {
    this.stopSpeaking();
    this.motor(null);
    this.breathing(false);
    this.ambience('none');
  }
}

export const audio = new AudioEngine();
