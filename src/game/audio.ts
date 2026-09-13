export class GameAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfx: GainNode | null = null;
  music: GainNode | null = null;
  amb: GainNode | null = null;
  private musicTimer = 0;
  private wind: OscillatorNode | null = null;
  private rain: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private caveGain: GainNode | null = null;
  private unlocked = false;
  masterVol = 0.7;
  sfxVol = 0.8;
  musicVol = 0.35;

  unlock() {
    if (this.unlocked) {
      void this.ctx?.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx({ latencyHint: "interactive" });
    this.master = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.amb = this.ctx.createGain();
    this.sfx.connect(this.master);
    this.music.connect(this.master);
    this.amb.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.applyVolumes();
    this.unlocked = true;
    this.startWind();
    this.startMusic();
  }

  applyVolumes() {
    const now = this.ctx?.currentTime ?? 0;
    this.master?.gain.setTargetAtTime(this.masterVol * this.masterVol, now, 0.02);
    this.sfx?.gain.setTargetAtTime(this.sfxVol * this.sfxVol, now, 0.02);
    this.music?.gain.setTargetAtTime(this.musicVol * this.musicVol, now, 0.02);
  }

  resume() {
    void this.ctx?.resume();
  }

  private noiseBuf(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private beep(freq: number, dur: number, type: OscillatorType, gain: number, bus: GainNode, pan = 0) {
    const ctx = this.ctx;
    if (!ctx || !bus) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    o.type = type;
    o.frequency.value = freq;
    p.pan.value = pan;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(p);
    p.connect(bus);
    o.start();
    o.stop(ctx.currentTime + dur + 0.05);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      p.disconnect();
    };
  }

  private burst(dur: number, gain: number, filterFreq: number, pan = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.sfx) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf();
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = filterFreq;
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(f);
    f.connect(g);
    g.connect(p);
    p.connect(this.sfx);
    src.start();
    src.stop(ctx.currentTime + dur + 0.05);
  }

  footstep(inWater: boolean) {
    this.burst(0.08, inWater ? 0.12 : 0.18, inWater ? 400 : 180 + Math.random() * 80, (Math.random() - 0.5) * 0.4);
  }
  mine() {
    this.burst(0.12, 0.28, 220 + Math.random() * 90);
    this.beep(90 + Math.random() * 30, 0.08, "square", 0.04, this.sfx!);
  }
  place() {
    this.beep(180, 0.06, "triangle", 0.08, this.sfx!);
    this.burst(0.05, 0.1, 500);
  }
  swing() {
    this.burst(0.07, 0.16, 800);
  }
  hit() {
    this.burst(0.1, 0.3, 140);
    this.beep(220, 0.07, "sawtooth", 0.05, this.sfx!);
  }
  hurt() {
    this.beep(140, 0.18, "square", 0.1, this.sfx!);
  }
  eat() {
    this.beep(320, 0.08, "sine", 0.06, this.sfx!);
  }
  ui() {
    this.beep(520, 0.05, "sine", 0.04, this.sfx!);
  }
  thunder() {
    this.burst(0.8, 0.5, 80);
    this.beep(50, 0.5, "sawtooth", 0.08, this.amb!);
  }
  animal(kind: "chirp" | "bleat" | "growl") {
    if (kind === "chirp") this.beep(1200 + Math.random() * 400, 0.08, "sine", 0.04, this.sfx!);
    else if (kind === "bleat") this.beep(380, 0.2, "triangle", 0.06, this.sfx!);
    else this.beep(90, 0.25, "sawtooth", 0.07, this.sfx!);
  }

  setWeather(rain: number, inCave: boolean) {
    if (!this.ctx || !this.amb) return;
    if (!this.rainGain) {
      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0;
      this.rainGain.connect(this.amb);
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf();
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 1200;
      src.connect(f);
      f.connect(this.rainGain);
      src.start();
      this.rain = src;
    }
    this.rainGain.gain.setTargetAtTime(rain * 0.18, this.ctx.currentTime, 0.3);
    if (!this.caveGain) {
      this.caveGain = this.ctx.createGain();
      this.caveGain.gain.value = 0;
      this.caveGain.connect(this.amb);
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = 55;
      o.connect(this.caveGain);
      o.start();
    }
    this.caveGain.gain.setTargetAtTime(inCave ? 0.08 : 0, this.ctx.currentTime, 0.4);
  }

  private startWind() {
    if (!this.ctx || !this.amb) return;
    const o = this.ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = 70;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 180;
    const g = this.ctx.createGain();
    g.gain.value = 0.02;
    o.connect(f);
    f.connect(g);
    g.connect(this.amb);
    o.start();
    this.wind = o;
  }

  private startMusic() {
    // quiet pentatonic pad — eternal-day ambient
    const loop = () => {
      if (!this.ctx || !this.music) return;
      const notes = [196, 220, 262, 294, 330, 392];
      const n = notes[(Math.random() * notes.length) | 0]!;
      this.beep(n, 2.8, "sine", 0.045, this.music);
      this.beep(n * 1.5, 2.8, "sine", 0.02, this.music);
      this.musicTimer = window.setTimeout(loop, 2800 + Math.random() * 1400);
    };
    loop();
  }

  dispose() {
    window.clearTimeout(this.musicTimer);
    void this.ctx?.close();
  }
}
