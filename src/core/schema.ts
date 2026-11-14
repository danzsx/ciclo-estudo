/**
 * Versionamento do esquema, migrações, normalização defensiva e backups.
 */
import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS, LIMITS, SCHEMA_VERSION, SUBJECT_COLORS, createEmptyData } from "./defaults";
import { reconcileAtlas } from "./atlas";
import { syncPlan } from "./ops";
import type { ActiveSession, AppData, AtlasState, Difficulty, SessionRecord, Subject, UnlockedAchievement } from "./types";

export class DataError extends Error {
  constructor(
    message: string,
    public readonly code: "invalid_json" | "invalid_format" | "newer_version" | "missing_migration",
  ) {
    super(message);
    this.name = "DataError";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;
export type Migration = (raw: Raw) => Raw;

/**
 * Migrações registradas: chave = versão de origem; a função deve devolver o
 * objeto na versão seguinte (com `schemaVersion` incrementado).
 */
export const MIGRATIONS: Record<number, Migration> = {
  // v0 → v1: formato pré-lançamento sem `schemaVersion` nem `preferences`.
  0: (raw) => ({ ...raw, preferences: raw.preferences ?? { ...DEFAULT_PREFERENCES }, schemaVersion: 1 }),
  // v1 → v2: adiciona o arquivo de conquistas ATLAS.
  1: (raw) => ({ ...raw, atlas: raw.atlas ?? { unlocked: [], retroactiveCheckedAt: null }, schemaVersion: 2 }),
};

export function migrate(raw: Raw, migrations: Record<number, Migration> = MIGRATIONS, target = SCHEMA_VERSION) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new DataError("O arquivo não contém dados do Ciclo.", "invalid_format");
  let current = raw;
  let version = typeof current.schemaVersion === "number" ? current.schemaVersion : 0;
  const from = version;
  if (version > target)
    throw new DataError(
      "Os dados foram criados por uma versão mais nova do Ciclo. Atualize o aplicativo para abri-los.",
      "newer_version",
    );
  while (version < target) {
    const m = migrations[version];
    if (!m) throw new DataError(`Não há migração a partir da versão ${version}.`, "missing_migration");
    current = m(current);
    const nextVersion = current.schemaVersion;
    if (typeof nextVersion !== "number" || nextVersion <= version)
      throw new DataError(`Migração da versão ${version} inválida.`, "missing_migration");
    version = nextVersion;
  }
  return { data: current, migratedFrom: from === target ? null : from };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const intIn = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(num(v, fallback));
  return Math.min(max, Math.max(min, n));
};
const DIFFS: Difficulty[] = ["easy", "medium", "hard"];

function normalizeSubject(raw: unknown, i: number, nowIso: string): Subject | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const name = str(raw.name).trim().slice(0, LIMITS.nameMax);
  if (!id || !name) return null;
  const session = raw.sessionMinutes;
  return {
    id,
    name,
    weight: intIn(raw.weight, LIMITS.weightMin, LIMITS.weightMax, 3),
    difficulty: DIFFS.includes(raw.difficulty as Difficulty) ? (raw.difficulty as Difficulty) : "medium",
    sessionMinutes:
      session === null || session === undefined
        ? null
        : intIn(session, LIMITS.sessionMin, LIMITS.sessionMax, DEFAULT_SETTINGS.sessionMinutes),
    color: /^#[0-9a-fA-F]{6}$/.test(str(raw.color)) ? str(raw.color) : SUBJECT_COLORS[i % SUBJECT_COLORS.length],
    createdAt: str(raw.createdAt, nowIso),
    updatedAt: str(raw.updatedAt, nowIso),
    isDemo: raw.isDemo === true ? true : undefined,
    adjustment: num(raw.adjustment, 1),
  };
}

function normalizeRecord(raw: unknown): SessionRecord | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const endedAt = str(raw.endedAt);
  if (!id || !endedAt || Number.isNaN(Date.parse(endedAt))) return null;
  const status = raw.status === "completed" || raw.status === "partial" || raw.status === "skipped" ? raw.status : "completed";
  return {
    id,
    subjectId: str(raw.subjectId),
    subjectName: str(raw.subjectName, "Disciplina"),
    subjectColor: str(raw.subjectColor, "#8A8F98"),
    cycleNumber: Math.max(1, Math.round(num(raw.cycleNumber, 1))),
    blockIndex: Math.max(0, Math.round(num(raw.blockIndex, 0))),
    startedAt: str(raw.startedAt, endedAt),
    endedAt,
    plannedMinutes: Math.max(0, num(raw.plannedMinutes, 0)),
    studiedMinutes: Math.max(0, num(raw.studiedMinutes, 0)),
    status,
    notes: str(raw.notes).slice(0, LIMITS.notesMax),
  };
}

function normalizeActive(raw: unknown, subjects: Subject[]): ActiveSession | null {
  if (!isObj(raw)) return null;
  const subjectId = str(raw.subjectId);
  if (!subjects.some((s) => s.id === subjectId)) return null;
  const status = raw.status === "running" ? "running" : "paused";
  const lastResumedAt = typeof raw.lastResumedAt === "number" ? raw.lastResumedAt : null;
  return {
    id: str(raw.id, "restored"),
    subjectId,
    subjectName: str(raw.subjectName),
    blockIndex: Math.max(0, Math.round(num(raw.blockIndex, 0))),
    cycleNumber: Math.max(1, Math.round(num(raw.cycleNumber, 1))),
    plannedMinutes: Math.max(0, num(raw.plannedMinutes, 0)),
    status: status === "running" && lastResumedAt !== null ? "running" : "paused",
    startedAt: str(raw.startedAt, new Date().toISOString()),
    accumulatedMs: Math.max(0, num(raw.accumulatedMs, 0)),
    lastResumedAt: status === "running" ? lastResumedAt : null,
    lastHeartbeatAt: typeof raw.lastHeartbeatAt === "number" ? raw.lastHeartbeatAt : null,
    notes: str(raw.notes).slice(0, LIMITS.notesMax),
  };
}

function normalizeAtlas(raw: unknown): AtlasState {
  if (!isObj(raw)) return { unlocked: [], retroactiveCheckedAt: null };
  const seen = new Set<string>();
  const unlocked: UnlockedAchievement[] = [];
  if (Array.isArray(raw.unlocked)) {
    for (const item of raw.unlocked) {
      if (!isObj(item)) continue;
      const id = str(item.id).trim();
      const unlockedAt = str(item.unlockedAt);
      if (!id || seen.has(id) || !unlockedAt || Number.isNaN(Date.parse(unlockedAt))) continue;
      seen.add(id);
      unlocked.push({
        id,
        unlockedAt,
        collectionId: str(item.collectionId, "atlas-core") || "atlas-core",
      });
    }
  }
  const retro = str(raw.retroactiveCheckedAt);
  const retroactiveCheckedAt = retro && !Number.isNaN(Date.parse(retro)) ? retro : null;
  return { unlocked, retroactiveCheckedAt };
}

/** Normaliza dados (já migrados) preenchendo padrões e descartando entradas inválidas. */
export function normalizeData(raw: Raw, now: Date = new Date()): AppData {
  if (!isObj(raw)) throw new DataError("Formato de dados inválido.", "invalid_format");
  const base = createEmptyData(now);
  const nowIso = now.toISOString();
  const seen = new Set<string>();
  const subjects = (Array.isArray(raw.subjects) ? raw.subjects : [])
    .map((s: unknown, i: number) => normalizeSubject(s, i, nowIso))
    .filter((s: Subject | null): s is Subject => {
      if (!s || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    })
    .slice(0, LIMITS.maxSubjects);
  const st = isObj(raw.settings) ? raw.settings : {};
  const sessionMinutes = intIn(st.sessionMinutes, LIMITS.sessionMin, LIMITS.sessionMax, DEFAULT_SETTINGS.sessionMinutes);
  let cycleMinutes = intIn(st.cycleMinutes, LIMITS.cycleMin, LIMITS.cycleMax, DEFAULT_SETTINGS.cycleMinutes);
  cycleMinutes = Math.max(LIMITS.cycleMin, Math.round(cycleMinutes / LIMITS.granularity) * LIMITS.granularity);
  const minBlockMinutes = Math.min(
    sessionMinutes,
    intIn(st.minBlockMinutes, LIMITS.minBlockMin, LIMITS.minBlockMax, DEFAULT_SETTINGS.minBlockMinutes),
  );
  const pref = isObj(raw.preferences) ? raw.preferences : {};
  const theme = pref.theme === "light" || pref.theme === "dark" || pref.theme === "system" ? pref.theme : "system";
  const cyc = isObj(raw.cycle) ? raw.cycle : {};
  const history = (Array.isArray(raw.history) ? raw.history : [])
    .map(normalizeRecord)
    .filter((r: SessionRecord | null): r is SessionRecord => !!r)
    .sort((a: SessionRecord, b: SessionRecord) => b.endedAt.localeCompare(a.endedAt));
  const meta = isObj(raw.meta) ? raw.meta : {};

  const data: AppData = {
    schemaVersion: SCHEMA_VERSION,
    subjects,
    settings: { cycleMinutes, sessionMinutes, minBlockMinutes },
    preferences: { theme },
    cycle: {
      plan: null,
      position: Math.max(0, Math.round(num(cyc.position, 0))),
      cycleNumber: Math.max(1, Math.round(num(cyc.cycleNumber, 1))),
      completedCycles: Math.max(0, Math.round(num(cyc.completedCycles, 0))),
    },
    activeSession: normalizeActive(raw.activeSession, subjects),
    history,
    atlas: normalizeAtlas(raw.atlas),
    meta: { createdAt: str(meta.createdAt, base.meta.createdAt), updatedAt: str(meta.updatedAt, nowIso) },
  };
  // O plano é sempre recalculado a partir das entradas (o algoritmo é determinístico)
  // e o ATLAS é reconciliado com os dados reais (incluindo reconhecimento retroativo).
  return reconcileAtlas(syncPlan(data), now);
}

/** Converte texto JSON salvo em AppData válido (migrando se necessário). */
export function parseData(text: string, now: Date = new Date()): { data: AppData; migratedFrom: number | null } {
  let raw: Raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new DataError("O arquivo de dados está corrompido ou não é um JSON válido.", "invalid_json");
  }
  const { data, migratedFrom } = migrate(raw);
  return { data: normalizeData(data, now), migratedFrom };
}

export function serializeData(data: AppData): string {
  return JSON.stringify(data);
}

export interface BackupFile {
  app: "ciclo";
  kind: "backup";
  schemaVersion: number;
  exportedAt: string;
  data: AppData;
}

export function createBackup(data: AppData, now: Date = new Date()): string {
  const backup: BackupFile = {
    app: "ciclo",
    kind: "backup",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data,
  };
  return JSON.stringify(backup, null, 2);
}

export function backupFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `ciclo-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}.json`;
}

/** Lê um backup exportado (ou um arquivo de dados bruto) e devolve dados válidos. */
export function parseBackup(text: string, now: Date = new Date()) {
  let raw: Raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new DataError("O arquivo selecionado não é um JSON válido.", "invalid_json");
  }
  if (!isObj(raw)) throw new DataError("O arquivo selecionado não é um backup do Ciclo.", "invalid_format");
  const payload = raw.app === "ciclo" && raw.kind === "backup" ? raw.data : raw;
  if (!isObj(payload) || !Array.isArray(payload.subjects))
    throw new DataError("O arquivo selecionado não é um backup do Ciclo.", "invalid_format");
  const { data, migratedFrom } = migrate(payload);
  return { data: normalizeData(data, now), migratedFrom, exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : null };
}
