import { DEFAULT_SOUND_PREFERENCES, type SoundPreferences } from "../core";
import { SOUND_CATALOG, type SoundCategory, type SoundDefinition, type SoundId } from "./catalog";

export interface AudioContextLike {
  state: string;
  currentTime: number;
  destination: unknown;
  resume(): Promise<void>;
  close?(): Promise<void>;
  decodeAudioData(audioData: ArrayBuffer): Promise<AudioBuffer>;
  createGain(): {
    gain: { value: number };
    connect(dest: unknown): void;
  };
  createBufferSource(): {
    buffer: AudioBuffer | null;
    connect(dest: unknown): void;
    start(when?: number): void;
    onended: (() => void) | null;
  };
}

export interface SoundEngineDeps {
  createAudioContext?: () => AudioContextLike | null;
  fetchFn?: (url: string) => Promise<{ ok: boolean; arrayBuffer(): Promise<ArrayBuffer> }>;
  now?: () => number;
  isReducedMotion?: () => boolean;
}

export interface PlayOptions {
  /** Ignora o toggle da categoria (útil para botão de prévia explícito), mantendo masterVolume. */
  ignoreCategoryToggle?: boolean;
  /** Multiplicador adicional de ganho (0..1). */
  gainMultiplier?: number;
}

const MAX_CONCURRENT_VOICES = 4;
const FAILED_RETRY_COOLDOWN_MS = 10_000;

function defaultCreateAudioContext(): AudioContextLike | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  try {
    return new Ctx() as unknown as AudioContextLike;
  } catch {
    return null;
  }
}

function defaultIsReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export class SoundEngine {
  private registry = new Map<string, SoundDefinition>();
  private preferences: SoundPreferences = { ...DEFAULT_SOUND_PREFERENCES };
  private ctx: AudioContextLike | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private inFlight = new Map<string, Promise<AudioBuffer | null>>();
  private failedAt = new Map<string, number>();
  private lastPlayedAt = new Map<string, number>();
  private activeVoices = 0;
  private unlocked = false;

  private readonly createAudioContext: () => AudioContextLike | null;
  private readonly fetchFn: ((url: string) => Promise<{ ok: boolean; arrayBuffer(): Promise<ArrayBuffer> }>) | null;
  private readonly now: () => number;
  private readonly isReducedMotion: () => boolean;

  constructor(deps: SoundEngineDeps = {}) {
    this.createAudioContext = deps.createAudioContext ?? defaultCreateAudioContext;
    this.fetchFn =
      deps.fetchFn ??
      (typeof fetch === "function" ? (url: string) => fetch(url) : null);
    this.now = deps.now ?? (() => Date.now());
    this.isReducedMotion = deps.isReducedMotion ?? defaultIsReducedMotion;

    for (const def of Object.values(SOUND_CATALOG)) {
      this.registry.set(def.id, def);
    }
  }

  register(def: SoundDefinition): void {
    this.registry.set(def.id, def);
  }

  getDefinition(id: SoundId): SoundDefinition | undefined {
    return this.registry.get(id);
  }

  listDefinitions(): SoundDefinition[] {
    return Array.from(this.registry.values());
  }

  setPreferences(prefs: Partial<SoundPreferences> | undefined): void {
    if (!prefs) return;
    const masterVolume =
      typeof prefs.masterVolume === "number" && Number.isFinite(prefs.masterVolume)
        ? Math.min(1, Math.max(0, prefs.masterVolume))
        : this.preferences.masterVolume;

    this.preferences = {
      masterVolume,
      uiEnabled: typeof prefs.uiEnabled === "boolean" ? prefs.uiEnabled : this.preferences.uiEnabled,
      sessionEnabled: typeof prefs.sessionEnabled === "boolean" ? prefs.sessionEnabled : this.preferences.sessionEnabled,
      timerEnabled: typeof prefs.timerEnabled === "boolean" ? prefs.timerEnabled : this.preferences.timerEnabled,
      achievementEnabled:
        typeof prefs.achievementEnabled === "boolean"
          ? prefs.achievementEnabled
          : this.preferences.achievementEnabled,
    };
  }

  getPreferences(): SoundPreferences {
    return { ...this.preferences };
  }

  isCategoryEnabled(category: SoundCategory): boolean {
    switch (category) {
      case "ui":
        return this.preferences.uiEnabled;
      case "session":
        return this.preferences.sessionEnabled;
      case "timer":
        return this.preferences.timerEnabled;
      case "achievement":
        return this.preferences.achievementEnabled;
    }
  }

  private ensureContext(): AudioContextLike | null {
    if (!this.ctx) {
      this.ctx = this.createAudioContext();
    }
    return this.ctx;
  }

  /**
   * Deve ser chamado a partir de uma interação válida do usuário
   * para destravar o AudioContext conforme políticas de autoplay.
   */
  async unlock(): Promise<boolean> {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      this.unlocked = ctx.state === "running";
      return this.unlocked;
    } catch {
      return false;
    }
  }

  isUnlocked(): boolean {
    return this.unlocked || this.ctx?.state === "running";
  }

  private async loadBuffer(def: SoundDefinition): Promise<AudioBuffer | null> {
    const cached = this.bufferCache.get(def.id);
    if (cached) return cached;

    const lastFail = this.failedAt.get(def.id);
    if (lastFail !== undefined && this.now() - lastFail < FAILED_RETRY_COOLDOWN_MS) {
      return null;
    }

    const existing = this.inFlight.get(def.id);
    if (existing) return existing;

    const ctx = this.ensureContext();
    if (!ctx || !this.fetchFn) return null;

    const promise = (async () => {
      try {
        const res = await this.fetchFn!(def.src);
        if (!res.ok) {
          this.failedAt.set(def.id, this.now());
          return null;
        }
        const arr = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arr);
        this.bufferCache.set(def.id, decoded);
        this.failedAt.delete(def.id);
        return decoded;
      } catch {
        this.failedAt.set(def.id, this.now());
        return null;
      } finally {
        this.inFlight.delete(def.id);
      }
    })();

    this.inFlight.set(def.id, promise);
    return promise;
  }

  async play(id: SoundId, options: PlayOptions = {}): Promise<boolean> {
    const def = this.registry.get(id);
    if (!def) return false;

    if (this.preferences.masterVolume <= 0) return false;
    if (!options.ignoreCategoryToggle && !this.isCategoryEnabled(def.category)) {
      return false;
    }

    const nowMs = this.now();
    const last = this.lastPlayedAt.get(id);
    if (last !== undefined && nowMs - last < def.cooldownMs) {
      return false;
    }

    if (this.activeVoices >= MAX_CONCURRENT_VOICES) {
      return false;
    }

    const ctx = this.ensureContext();
    if (!ctx) return false;

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }

    const buffer = await this.loadBuffer(def);
    if (!buffer) return false;

    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = ctx.createGain();
      const reducedFactor = this.isReducedMotion() && def.category === "ui" ? 0.55 : 1;
      const mult =
        typeof options.gainMultiplier === "number" && Number.isFinite(options.gainMultiplier)
          ? Math.min(1, Math.max(0, options.gainMultiplier))
          : 1;
      gainNode.gain.value = Math.min(1, Math.max(0, def.gain * this.preferences.masterVolume * reducedFactor * mult));

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      this.lastPlayedAt.set(id, this.now());
      this.activeVoices += 1;

      let released = false;
      const releaseVoice = () => {
        if (released) return;
        released = true;
        this.activeVoices = Math.max(0, this.activeVoices - 1);
      };

      source.onended = releaseVoice;
      source.start(0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reproduz o som de ciclo de vida de sessão sem duplicar com o som do timer.
   * Prioriza a categoria `session`; se estiver desativada e `timer` estiver ativo,
   * utiliza o efeito correspondente de `timer`.
   */
  async playSessionLifecycle(action: "start" | "pause" | "resume"): Promise<boolean> {
    if (this.preferences.sessionEnabled) {
      return this.play(`session-${action}`);
    }
    if (this.preferences.timerEnabled) {
      return this.play(`timer-${action}`);
    }
    return false;
  }

  getActiveVoiceCount(): number {
    return this.activeVoices;
  }

  async dispose(): Promise<void> {
    this.bufferCache.clear();
    this.inFlight.clear();
    this.failedAt.clear();
    this.lastPlayedAt.clear();
    this.activeVoices = 0;
    this.unlocked = false;
    if (this.ctx?.close) {
      try {
        await this.ctx.close();
      } catch {
        // Ignora erro de encerramento
      }
    }
    this.ctx = null;
  }
}

export const soundEngine = new SoundEngine();

let gestureListenerAttached = false;

export function initAudioGestureUnlock(): () => void {
  if (typeof window === "undefined" || gestureListenerAttached) {
    return () => {};
  }
  gestureListenerAttached = true;

  const onGesture = () => {
    void soundEngine.unlock().then((ok) => {
      if (ok) {
        cleanup();
      }
    });
  };

  const cleanup = () => {
    window.removeEventListener("pointerdown", onGesture, true);
    window.removeEventListener("keydown", onGesture, true);
    gestureListenerAttached = false;
  };

  window.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
  window.addEventListener("keydown", onGesture, { capture: true, passive: true });

  return cleanup;
}

