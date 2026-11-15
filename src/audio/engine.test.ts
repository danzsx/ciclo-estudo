import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SOUND_PREFERENCES,
  createEmptyData,
  parseData,
  serializeData,
  updatePreferences,
} from "../core";
import { SOUND_CATALOG, rarityToRevealSoundId } from "./catalog";
import { SoundEngine, type AudioContextLike } from "./engine";

function createMockAudioEnv() {
  const startedSources: Array<{ urlDecoded: string; gain: number; onended: (() => void) | null }> = [];
  const fetchCalls: string[] = [];

  const createAudioContext = (): AudioContextLike => ({
    state: "running",
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    decodeAudioData: vi.fn(async (buf: ArrayBuffer) => ({ duration: 0.2, byteLength: buf.byteLength } as unknown as AudioBuffer)),
    createGain: () => {
      const gainNode = {
        gain: { value: 1 },
        connect: vi.fn(),
        _lastGain: 1,
      };
      return gainNode;
    },
    createBufferSource: () => {
      let connectedGain: { gain: { value: number } } | null = null;
      const src = {
        buffer: null as AudioBuffer | null,
        onended: null as (() => void) | null,
        connect: vi.fn((dest: unknown) => {
          connectedGain = dest as { gain: { value: number } };
        }),
        start: vi.fn(() => {
          startedSources.push({
            urlDecoded: String((src.buffer as unknown as { byteLength?: number })?.byteLength ?? 0),
            gain: connectedGain?.gain.value ?? 0,
            onended: src.onended,
          });
        }),
      };
      return src;
    },
  });

  const fetchFn = vi.fn(async (url: string) => {
    fetchCalls.push(url);
    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(16),
    };
  });

  return { createAudioContext, fetchFn, startedSources, fetchCalls };
}

describe("ATLAS Sound Design System", () => {
  it("registra todos os 24 efeitos sonoros locais com nomenclatura consistente", () => {
    const definitions = Object.values(SOUND_CATALOG);
    expect(definitions.length).toBe(24);

    for (const def of definitions) {
      expect(def.src).toMatch(/^\/sounds\/[a-z0-9-]+\.wav$/);
      expect(def.gain).toBeGreaterThan(0);
      expect(def.gain).toBeLessThanOrEqual(1);
      expect(def.cooldownMs).toBeGreaterThan(0);
    }
  });

  it("reproduz sons de navegação e faz cache do buffer para evitar fetches repetidos", async () => {
    let clock = 1000;
    const env = createMockAudioEnv();
    const engine = new SoundEngine({
      createAudioContext: env.createAudioContext,
      fetchFn: env.fetchFn,
      now: () => clock,
      isReducedMotion: () => false,
    });

    expect(await engine.play("ui-tab")).toBe(true);
    expect(env.fetchCalls).toHaveLength(1);
    expect(env.startedSources).toHaveLength(1);

    clock += 200;
    expect(await engine.play("ui-tab")).toBe(true);
    // Reutiliza o buffer em cache sem novo fetch
    expect(env.fetchCalls).toHaveLength(1);
    expect(env.startedSources).toHaveLength(2);
  });

  it("impede sons duplicados dentro da janela de cooldown", async () => {
    let clock = 5000;
    const env = createMockAudioEnv();
    const engine = new SoundEngine({
      createAudioContext: env.createAudioContext,
      fetchFn: env.fetchFn,
      now: () => clock,
      isReducedMotion: () => false,
    });

    expect(await engine.play("ui-select")).toBe(true);
    clock += 10; // dentro do cooldown de 65ms
    expect(await engine.play("ui-select")).toBe(false);
    expect(env.startedSources).toHaveLength(1);

    clock += 100; // após o cooldown
    expect(await engine.play("ui-select")).toBe(true);
    expect(env.startedSources).toHaveLength(2);
  });

  it("respeita toggles individuais por categoria e permite prévia explícita", async () => {
    let clock = 1000;
    const env = createMockAudioEnv();
    const engine = new SoundEngine({
      createAudioContext: env.createAudioContext,
      fetchFn: env.fetchFn,
      now: () => clock,
      isReducedMotion: () => false,
    });

    engine.setPreferences({
      ...DEFAULT_SOUND_PREFERENCES,
      uiEnabled: false,
      sessionEnabled: false,
      timerEnabled: true,
      achievementEnabled: false,
    });

    expect(await engine.play("ui-tab")).toBe(false);
    expect(await engine.play("session-complete")).toBe(false);
    expect(await engine.play("atlas-reveal-legendary")).toBe(false);
    expect(await engine.play("timer-complete")).toBe(true);

    // Ciclo de vida da sessão usa fallback de timer quando sessionEnabled=false, sem duplicar
    clock += 500;
    expect(await engine.playSessionLifecycle("start")).toBe(true);
    expect(env.fetchCalls.some((u) => u.endsWith("timer-start.wav"))).toBe(true);
    expect(env.fetchCalls.some((u) => u.endsWith("session-start.wav"))).toBe(false);

    // Botão de prévia explícito funciona mesmo com categoria desativada
    clock += 500;
    expect(await engine.play("atlas-reveal-legendary", { ignoreCategoryToggle: true })).toBe(true);
  });

  it("respeita o volume geral e silencia completamente quando volume é 0", async () => {
    let clock = 1000;
    const env = createMockAudioEnv();
    const engine = new SoundEngine({
      createAudioContext: env.createAudioContext,
      fetchFn: env.fetchFn,
      now: () => clock,
      isReducedMotion: () => false,
    });

    engine.setPreferences({ masterVolume: 0 });
    expect(await engine.play("timer-complete")).toBe(false);
    expect(env.startedSources).toHaveLength(0);

    engine.setPreferences({ masterVolume: 0.5 });
    expect(await engine.play("timer-complete")).toBe(true);
    const expectedGain = SOUND_CATALOG["timer-complete"].gain * 0.5;
    expect(env.startedSources[0].gain).toBeCloseTo(expectedGain, 4);
  });

  it("mapeia corretamente todas as 5 raridades ATLAS para seus respectivos efeitos", () => {
    expect(rarityToRevealSoundId("common")).toBe("atlas-reveal-common");
    expect(rarityToRevealSoundId("uncommon")).toBe("atlas-reveal-uncommon");
    expect(rarityToRevealSoundId("rare")).toBe("atlas-reveal-rare");
    expect(rarityToRevealSoundId("epic")).toBe("atlas-reveal-epic");
    expect(rarityToRevealSoundId("legendary")).toBe("atlas-reveal-legendary");
  });

  it("limita reprodução simultânea excessiva e libera vozes ao finalizar", async () => {
    let clock = 1000;
    const env = createMockAudioEnv();
    const engine = new SoundEngine({
      createAudioContext: env.createAudioContext,
      fetchFn: env.fetchFn,
      now: () => clock,
      isReducedMotion: () => false,
    });

    expect(await engine.play("ui-tab")).toBe(true);
    expect(await engine.play("ui-select")).toBe(true);
    expect(await engine.play("ui-confirm")).toBe(true);
    expect(await engine.play("timer-start")).toBe(true);
    expect(engine.getActiveVoiceCount()).toBe(4);

    // 5ª voz simultânea é bloqueada
    expect(await engine.play("atlas-unlock")).toBe(false);
    expect(engine.getActiveVoiceCount()).toBe(4);

    // Ao encerrar uma voz, outra pode tocar
    env.startedSources[0].onended?.();
    expect(engine.getActiveVoiceCount()).toBe(3);
    expect(await engine.play("atlas-unlock")).toBe(true);
  });

  it("falha de forma silenciosa e segura quando não há suporte ou rede de áudio", async () => {
    const noAudioEngine = new SoundEngine({
      createAudioContext: () => null,
      fetchFn: async () => ({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) }),
    });
    expect(await noAudioEngine.unlock()).toBe(false);
    expect(await noAudioEngine.play("ui-confirm")).toBe(false);

    const env = createMockAudioEnv();
    const brokenFetchEngine = new SoundEngine({
      createAudioContext: env.createAudioContext,
      fetchFn: async () => {
        throw new Error("File not found");
      },
    });
    expect(await brokenFetchEngine.play("session-start")).toBe(false);
  });

  it("persiste e restaura preferências sonoras no esquema de dados do aplicativo", () => {
    const now = new Date("2026-11-15T10:00:00.000Z");
    const initial = createEmptyData(now);
    const updated = updatePreferences(
      initial,
      {
        sound: {
          masterVolume: 0.35,
          uiEnabled: false,
          sessionEnabled: true,
          timerEnabled: false,
          achievementEnabled: true,
        },
      },
      { now },
    );

    const serialized = serializeData(updated);
    const { data: restored } = parseData(serialized, now);

    expect(restored.preferences.sound).toEqual({
      masterVolume: 0.35,
      uiEnabled: false,
      sessionEnabled: true,
      timerEnabled: false,
      achievementEnabled: true,
    });
  });
});
