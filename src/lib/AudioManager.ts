// lib/AudioManager.ts
// A tiny, opinionated audio manager for BGM/SFX in a browser game.

export type SoundName =
  | "bgm_lobby"
  | "bgm_game"
  | "sfx_swing"
  | "sfx_hit"
  | "sfx_damage"
  | "sfx_death";

type Manifest = Record<
  SoundName,
  { url: string; volume?: number; loop?: boolean }
>;

type PlayBGMOpts = { volume?: number; fadeSec?: number };
type PlaySFXOpts = {
  volume?: number;
  playbackRate?: number;
  detune?: number; // in cents
  throttleMs?: number;
};

type Listener = () => void;

class AudioManager {
  private ctx?: AudioContext;
  private master!: GainNode;
  private bgm!: GainNode;
  private sfx!: GainNode;

  private unlocked = false;
  private manifest: Manifest = {} as Manifest;
  private buffers = new Map<SoundName, AudioBuffer>();
  private currentBGM?: {
    name: SoundName;
    src: AudioBufferSourceNode;
    gain: GainNode;
  };
  private lastPlayed = new Map<SoundName, number>();

  private listeners: Record<"unlocked", Set<Listener>> = {
    unlocked: new Set(),
  };

  /** Call once early at app start to provide file urls. */
  init(manifest: Manifest) {
    this.manifest = manifest;
    if (!this.ctx) {
      this.ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.bgm = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.master.gain.setValueAtTime(1, this.ctx.currentTime);
      this.bgm.gain.setValueAtTime(1, this.ctx.currentTime);
      this.sfx.gain.setValueAtTime(1, this.ctx.currentTime);
      this.bgm.connect(this.master);
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);

      // Auto-duck when tab hidden (optional)
      document.addEventListener("visibilitychange", () => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const v = document.hidden ? 0.0 : 1.0;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.linearRampToValueAtTime(v, t + 0.1);
      });
    }
  }

  /** Hook UI gesture: resume() on first click/keydown to satisfy autoplay policies. */
  async resume() {
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    this.unlocked = true;
    this.emit("unlocked");
  }

  isUnlocked() {
    return this.unlocked;
  }

  on(event: "unlocked", fn: Listener) {
    this.listeners[event].add(fn);
    return () => this.listeners[event].delete(fn);
  }
  private emit(event: "unlocked") {
    this.listeners[event].forEach(fn => fn());
  }

  /** Preload a subset (e.g., bgm) to avoid first-play hitch. */
  async preload(names: SoundName[]) {
    await Promise.all(names.map(n => this.loadBuffer(n)));
  }

  private async loadBuffer(name: SoundName) {
    if (!this.ctx) throw new Error("AudioManager not initialized");
    if (this.buffers.has(name)) return this.buffers.get(name)!;
    const spec = this.manifest[name];
    if (!spec) throw new Error(`No manifest entry for ${name}`);
    const res = await fetch(spec.url);
    const arr = await res.arrayBuffer();
    const buf = await this.ctx.decodeAudioData(arr);
    this.buffers.set(name, buf);
    return buf;
  }

  /** Crossfade to a new BGM. */
  async playBGM(
    name: Extract<SoundName, "bgm_lobby" | "bgm_game">,
    opts: PlayBGMOpts = {}
  ) {
    if (!this.ctx) return;
    const { fadeSec = 0.6, volume = this.manifest[name]?.volume ?? 1 } = opts;

    // Same track? no-op
    if (this.currentBGM?.name === name) return;

    const buf = await this.loadBuffer(name);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = this.manifest[name]?.loop ?? true;

    // Per-BGM gain for crossfade
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    src.connect(g).connect(this.bgm);
    src.start();

    // Fade in new BGM
    g.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + fadeSec);

    // Fade out previous BGM
    if (this.currentBGM) {
      const old = this.currentBGM;
      const t = this.ctx.currentTime;
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.linearRampToValueAtTime(0, t + fadeSec);
      // Stop after fade
      setTimeout(
        () => {
          try {
            old.src.stop();
          } catch {}
        },
        fadeSec * 1000 + 30
      );
    }

    this.currentBGM = { name, src, gain: g };
  }

  /** Stop BGM gracefully. */
  stopBGM(fadeSec = 0.4) {
    if (!this.ctx || !this.currentBGM) return;
    const t = this.ctx.currentTime;
    this.currentBGM.gain.gain.cancelScheduledValues(t);
    this.currentBGM.gain.gain.linearRampToValueAtTime(0, t + fadeSec);
    const toStop = this.currentBGM.src;
    this.currentBGM = undefined;
    setTimeout(
      () => {
        try {
          toStop.stop();
        } catch {}
      },
      fadeSec * 1000 + 30
    );
  }

  /** Play one-shot SFX with optional throttle to avoid spam. */
  async playSFX(
    name: Extract<SoundName, `sfx_${string}`>,
    opts: PlaySFXOpts = {}
  ) {
    if (!this.ctx) return;
    const {
      volume = this.manifest[name]?.volume ?? 1,
      playbackRate = 1,
      detune = 0,
      throttleMs = 40,
    } = opts;

    const now = performance.now();
    const last = this.lastPlayed.get(name) ?? 0;
    if (now - last < throttleMs) return;
    this.lastPlayed.set(name, now);

    const buf = await this.loadBuffer(name);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = playbackRate;
    if ("detune" in src) (src as any).detune.value = detune;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(volume, this.ctx.currentTime);
    src.connect(g).connect(this.sfx);
    src.start();
  }

  /** Global controls ------------------------------------------------------- */
  setMasterVolume(v: number) {
    if (!this.ctx) return;
    this.master.gain.setValueAtTime(
      Math.max(0, Math.min(1, v)),
      this.ctx.currentTime
    );
  }
  setBGMVolume(v: number) {
    if (!this.ctx) return;
    this.bgm.gain.setValueAtTime(
      Math.max(0, Math.min(1, v)),
      this.ctx.currentTime
    );
  }
  setSFXVolume(v: number) {
    if (!this.ctx) return;
    this.sfx.gain.setValueAtTime(
      Math.max(0, Math.min(1, v)),
      this.ctx.currentTime
    );
  }

  /** Soft ducking when paused etc. */
  setDucked(ducked: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const target = ducked ? 0.25 : 1.0;
    this.bgm.gain.cancelScheduledValues(t);
    this.bgm.gain.linearRampToValueAtTime(target, t + 0.12);
  }
}

export const audio = new AudioManager();
