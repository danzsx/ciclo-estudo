import type { AppData, CycleSettings, Difficulty, Preferences } from "./types";

export const SCHEMA_VERSION = 2;

export const DIFFICULTY_FACTORS: Record<Difficulty, number> = {
  easy: 0.85,
  medium: 1,
  hard: 1.25,
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Fácil",
  medium: "Média",
  hard: "Difícil",
};

export const WEIGHT_LABELS: Record<number, string> = {
  1: "Baixa",
  2: "Moderada",
  3: "Média",
  4: "Alta",
  5: "Muito alta",
};

/** Limites de validação. */
export const LIMITS = {
  nameMax: 60,
  weightMin: 1,
  weightMax: 5,
  sessionMin: 15,
  sessionMax: 180,
  cycleMin: 30,
  cycleMax: 100 * 60,
  minBlockMin: 10,
  minBlockMax: 60,
  maxSubjects: 40,
  notesMax: 4000,
  /** Granularidade de arredondamento dos tempos, em minutos. */
  granularity: 5,
  adjustmentMin: 0.5,
  adjustmentMax: 1.5,
} as const;

export const DEFAULT_SETTINGS: CycleSettings = {
  cycleMinutes: 12 * 60,
  sessionMinutes: 50,
  minBlockMinutes: 25,
};

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
};

export const DEFAULT_SUBJECT = {
  weight: 3,
  difficulty: "medium" as Difficulty,
  sessionMinutes: null as number | null,
};

/** Paleta editorial e contemporânea ancorada em #002a32, #73ba9b, #f7a072 e violeta/azul profundo. */
export const SUBJECT_COLORS = [
  "#002a32",
  "#73ba9b",
  "#f7a072",
  "#3b43d6",
  "#1e555c",
  "#529e7e",
  "#e07a5f",
  "#5c64e8",
  "#2b6f78",
  "#8fc9af",
  "#d98254",
  "#4c3f91",
];

export function createEmptyData(now: Date = new Date()): AppData {
  const iso = now.toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    subjects: [],
    settings: { ...DEFAULT_SETTINGS },
    preferences: { ...DEFAULT_PREFERENCES },
    cycle: { plan: null, position: 0, cycleNumber: 1, completedCycles: 0 },
    activeSession: null,
    history: [],
    atlas: { unlocked: [], retroactiveCheckedAt: null },
    meta: { createdAt: iso, updatedAt: iso },
  };
}
