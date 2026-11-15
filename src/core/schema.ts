/**
 * Versionamento do esquema, migrações, normalização defensiva e backups.
 */
import { DEFAULT_COURSE_NAME, DEFAULT_PREFERENCES, DEFAULT_SETTINGS, DEFAULT_SOUND_PREFERENCES, LIMITS, SCHEMA_VERSION, SUBJECT_COLORS, createDefaultCourse, createEmptyData } from "./defaults";
import { reconcileAtlas } from "./atlas";
import { computePlan } from "./distribution";
import { syncPlan } from "./ops";
import type { ActiveSession, AppData, AtlasState, Course, CycleSettings, Difficulty, SessionRecord, Subject, UnlockedAchievement } from "./types";

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
  // v2 → v3: adiciona suporte a múltiplos cursos.
  2: (raw) => {
    if (Array.isArray(raw.courses) && raw.courses.length > 0) {
      return { ...raw, schemaVersion: 3 };
    }
    const createdAt = typeof raw.meta?.createdAt === "string" ? raw.meta.createdAt : new Date().toISOString();
    const updatedAt = typeof raw.meta?.updatedAt === "string" ? raw.meta.updatedAt : createdAt;
    const defaultCourse = {
      id: "default",
      name: DEFAULT_COURSE_NAME,
      color: SUBJECT_COLORS[0],
      subjects: Array.isArray(raw.subjects) ? raw.subjects : [],
      settings: raw.settings ?? { ...DEFAULT_SETTINGS },
      cycle: raw.cycle ?? { plan: null, position: 0, cycleNumber: 1, completedCycles: 0 },
      createdAt,
      updatedAt,
    };
    return {
      ...raw,
      courses: [defaultCourse],
      activeCourseId: defaultCourse.id,
      schemaVersion: 3,
    };
  },
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
  const courseId = str(raw.courseId).trim();
  const courseName = str(raw.courseName).trim();
  return {
    id,
    ...(courseId ? { courseId } : {}),
    ...(courseName ? { courseName } : {}),
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

function normalizeActive(raw: unknown, allSubjects: Subject[]): ActiveSession | null {
  if (!isObj(raw)) return null;
  const subjectId = str(raw.subjectId);
  if (!allSubjects.some((s) => s.id === subjectId)) return null;
  const status = raw.status === "running" ? "running" : "paused";
  const lastResumedAt = typeof raw.lastResumedAt === "number" ? raw.lastResumedAt : null;
  const courseId = str(raw.courseId).trim();
  const courseName = str(raw.courseName).trim();
  return {
    id: str(raw.id, "restored"),
    ...(courseId ? { courseId } : {}),
    ...(courseName ? { courseName } : {}),
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

function normalizeSettings(raw: unknown): CycleSettings {
  const st = isObj(raw) ? raw : {};
  const sessionMinutes = intIn(st.sessionMinutes, LIMITS.sessionMin, LIMITS.sessionMax, DEFAULT_SETTINGS.sessionMinutes);
  let cycleMinutes = intIn(st.cycleMinutes, LIMITS.cycleMin, LIMITS.cycleMax, DEFAULT_SETTINGS.cycleMinutes);
  cycleMinutes = Math.max(LIMITS.cycleMin, Math.round(cycleMinutes / LIMITS.granularity) * LIMITS.granularity);
  const minBlockMinutes = Math.min(
    sessionMinutes,
    intIn(st.minBlockMinutes, LIMITS.minBlockMin, LIMITS.minBlockMax, DEFAULT_SETTINGS.minBlockMinutes),
  );
  return { cycleMinutes, sessionMinutes, minBlockMinutes };
}

function normalizeCourse(raw: unknown, i: number, nowIso: string): Course | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id).trim();
  const name = str(raw.name).trim().slice(0, LIMITS.courseNameMax);
  if (!id || !name) return null;
  const seenSubjects = new Set<string>();
  const subjects = (Array.isArray(raw.subjects) ? raw.subjects : [])
    .map((s: unknown, idx: number) => normalizeSubject(s, idx, nowIso))
    .filter((s: Subject | null): s is Subject => {
      if (!s || seenSubjects.has(s.id)) return false;
      seenSubjects.add(s.id);
      return true;
    })
    .slice(0, LIMITS.maxSubjects);
  const settings = normalizeSettings(raw.settings);
  const cyc = isObj(raw.cycle) ? raw.cycle : {};
  const plan = computePlan(subjects, settings);
  const len = plan.blocks.length;
  const rawPos = Math.max(0, Math.round(num(cyc.position, 0)));
  const position = len === 0 ? 0 : Math.min(rawPos, len - 1);
  return {
    id,
    name,
    color: /^#[0-9a-fA-F]{6}$/.test(str(raw.color)) ? str(raw.color) : SUBJECT_COLORS[i % SUBJECT_COLORS.length],
    subjects,
    settings,
    cycle: {
      plan,
      position,
      cycleNumber: Math.max(1, Math.round(num(cyc.cycleNumber, 1))),
      completedCycles: Math.max(0, Math.round(num(cyc.completedCycles, 0))),
    },
    createdAt: str(raw.createdAt, nowIso),
    updatedAt: str(raw.updatedAt, nowIso),
  };
}

/** Normaliza dados (já migrados) preenchendo padrões e descartando entradas inválidas. */
export function normalizeData(raw: Raw, now: Date = new Date()): AppData {
  if (!isObj(raw)) throw new DataError("Formato de dados inválido.", "invalid_format");
  const base = createEmptyData(now);
  const nowIso = now.toISOString();

  const seenCourses = new Set<string>();
  let courses: Course[] = (Array.isArray(raw.courses) ? raw.courses : [])
    .map((c: unknown, i: number) => normalizeCourse(c, i, nowIso))
    .filter((c: Course | null): c is Course => {
      if (!c || seenCourses.has(c.id)) return false;
      seenCourses.add(c.id);
      return true;
    })
    .slice(0, LIMITS.maxCourses);

  if (courses.length === 0) {
    const seen = new Set<string>();
    const subjects = (Array.isArray(raw.subjects) ? raw.subjects : [])
      .map((s: unknown, i: number) => normalizeSubject(s, i, nowIso))
      .filter((s: Subject | null): s is Subject => {
        if (!s || seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      })
      .slice(0, LIMITS.maxSubjects);
    const settings = normalizeSettings(raw.settings);
    const cyc = isObj(raw.cycle) ? raw.cycle : {};
    const fallback = createDefaultCourse(now);
    const plan = computePlan(subjects, settings);
    const len = plan.blocks.length;
    const rawPos = Math.max(0, Math.round(num(cyc.position, 0)));
    courses = [
      {
        ...fallback,
        subjects,
        settings,
        cycle: {
          plan,
          position: len === 0 ? 0 : Math.min(rawPos, len - 1),
          cycleNumber: Math.max(1, Math.round(num(cyc.cycleNumber, 1))),
          completedCycles: Math.max(0, Math.round(num(cyc.completedCycles, 0))),
        },
      },
    ];
  }

  const requestedCourseId = str(raw.activeCourseId).trim();
  const activeCourse = courses.find((c) => c.id === requestedCourseId) ?? courses[0];

  const pref = isObj(raw.preferences) ? raw.preferences : {};
  const theme = pref.theme === "light" || pref.theme === "dark" || pref.theme === "system" ? pref.theme : "system";
  const rawSound = isObj(pref.sound) ? pref.sound : {};
  const rawVol = typeof rawSound.masterVolume === "number" && Number.isFinite(rawSound.masterVolume)
    ? rawSound.masterVolume
    : DEFAULT_SOUND_PREFERENCES.masterVolume;
  const sound = {
    masterVolume: Math.min(1, Math.max(0, rawVol)),
    uiEnabled: typeof rawSound.uiEnabled === "boolean" ? rawSound.uiEnabled : DEFAULT_SOUND_PREFERENCES.uiEnabled,
    sessionEnabled: typeof rawSound.sessionEnabled === "boolean" ? rawSound.sessionEnabled : DEFAULT_SOUND_PREFERENCES.sessionEnabled,
    timerEnabled: typeof rawSound.timerEnabled === "boolean" ? rawSound.timerEnabled : DEFAULT_SOUND_PREFERENCES.timerEnabled,
    achievementEnabled: typeof rawSound.achievementEnabled === "boolean" ? rawSound.achievementEnabled : DEFAULT_SOUND_PREFERENCES.achievementEnabled,
  };
  const history = (Array.isArray(raw.history) ? raw.history : [])
    .map(normalizeRecord)
    .filter((r: SessionRecord | null): r is SessionRecord => !!r)
    .sort((a: SessionRecord, b: SessionRecord) => b.endedAt.localeCompare(a.endedAt));
  const meta = isObj(raw.meta) ? raw.meta : {};

  const allSubjects = courses.flatMap((c) => c.subjects);
  const data: AppData = {
    schemaVersion: SCHEMA_VERSION,
    courses,
    activeCourseId: activeCourse.id,
    subjects: activeCourse.subjects,
    settings: activeCourse.settings,
    preferences: { theme, sound },
    cycle: activeCourse.cycle,
    activeSession: normalizeActive(raw.activeSession, allSubjects),
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
