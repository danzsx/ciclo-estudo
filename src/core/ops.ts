/**
 * Operações de negócio sobre o estado da aplicação.
 *
 * Todas as funções são puras: recebem o estado atual e devolvem um novo estado
 * (ou erros de validação). Data/hora e geração de IDs são injetadas via `Ctx`,
 * o que torna tudo testável e independente de plataforma.
 */
import { LIMITS, SUBJECT_COLORS, createEmptyData } from "./defaults";
import { reconcileAtlas } from "./atlas";
import { computePlan } from "./distribution";
import { elapsedMs, heartbeat, pauseTimer, resumeTimer } from "./timer";
import { validateSettings, validateStudiedMinutes, validateSubjectInput, type SubjectInput } from "./validation";
import type { ActiveSession, AppData, CycleSettings, Preferences, Result, SessionRecord, SessionStatus, Subject } from "./types";

export interface Ctx {
  now: Date;
  newId: () => string;
}

function touch(data: AppData, now: Date): AppData {
  return { ...data, meta: { ...data.meta, updatedAt: now.toISOString() } };
}

/** Recalcula o plano se as entradas mudaram, preservando o ponto do ciclo. */
export function syncPlan(data: AppData): AppData {
  const plan = computePlan(data.subjects, data.settings);
  if (data.cycle.plan && data.cycle.plan.signature === plan.signature) return data;
  const len = plan.blocks.length;
  const position = len === 0 ? 0 : Math.min(Math.max(0, data.cycle.position), len - 1);
  return { ...data, cycle: { ...data.cycle, plan, position } };
}

export function nextColor(subjects: Subject[]): string {
  const used = new Map<string, number>();
  for (const s of subjects) used.set(s.color, (used.get(s.color) ?? 0) + 1);
  let best = SUBJECT_COLORS[0];
  let bestCount = Infinity;
  for (const c of SUBJECT_COLORS) {
    const count = used.get(c) ?? 0;
    if (count < bestCount) {
      best = c;
      bestCount = count;
    }
  }
  return best;
}

// ---------------------------------------------------------------- Disciplinas

export function addSubject(data: AppData, input: SubjectInput, ctx: Ctx): Result<AppData> {
  if (data.subjects.length >= LIMITS.maxSubjects)
    return { ok: false, errors: { name: `Limite de ${LIMITS.maxSubjects} disciplinas atingido.` } };
  const valid = validateSubjectInput(
    input,
    data.subjects.map((s) => s.name),
  );
  if (!valid.ok) return valid;
  const iso = ctx.now.toISOString();
  const subject: Subject = {
    id: ctx.newId(),
    name: valid.value.name,
    weight: valid.value.weight,
    difficulty: valid.value.difficulty,
    sessionMinutes: valid.value.sessionMinutes,
    color: valid.value.color ?? nextColor(data.subjects),
    createdAt: iso,
    updatedAt: iso,
    adjustment: 1,
  };
  return { ok: true, value: syncPlan(touch({ ...data, subjects: [...data.subjects, subject] }, ctx.now)) };
}

export function updateSubject(data: AppData, id: string, input: SubjectInput, ctx: Pick<Ctx, "now">): Result<AppData> {
  const current = data.subjects.find((s) => s.id === id);
  if (!current) return { ok: false, errors: { name: "Disciplina não encontrada." } };
  const valid = validateSubjectInput(
    input,
    data.subjects.filter((s) => s.id !== id).map((s) => s.name),
  );
  if (!valid.ok) return valid;
  const updated: Subject = {
    ...current,
    name: valid.value.name,
    weight: valid.value.weight,
    difficulty: valid.value.difficulty,
    sessionMinutes: valid.value.sessionMinutes,
    color: valid.value.color ?? current.color,
    updatedAt: ctx.now.toISOString(),
    // Editar uma disciplina de exemplo a torna "real" do estudante.
    isDemo: undefined,
  };
  const subjects = data.subjects.map((s) => (s.id === id ? updated : s));
  let next: AppData = { ...data, subjects };
  if (next.activeSession?.subjectId === id) {
    next = { ...next, activeSession: { ...next.activeSession, subjectName: updated.name } };
  }
  return { ok: true, value: syncPlan(touch(next, ctx.now)) };
}

/** Exclui a disciplina. O histórico é mantido (com o nome registrado na época). */
export function deleteSubject(data: AppData, id: string, ctx: Pick<Ctx, "now">): AppData {
  if (!data.subjects.some((s) => s.id === id)) return data;
  const subjects = data.subjects.filter((s) => s.id !== id);
  const activeSession = data.activeSession?.subjectId === id ? null : data.activeSession;
  return syncPlan(touch({ ...data, subjects, activeSession }, ctx.now));
}

/** Reordena disciplinas (afeta o desempate da sequência). */
export function moveSubject(data: AppData, id: string, direction: -1 | 1, ctx: Pick<Ctx, "now">): AppData {
  const i = data.subjects.findIndex((s) => s.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= data.subjects.length) return data;
  const subjects = [...data.subjects];
  [subjects[i], subjects[j]] = [subjects[j], subjects[i]];
  return syncPlan(touch({ ...data, subjects }, ctx.now));
}

// ---------------------------------------------------------------- Configurações

export function updateSettings(data: AppData, settings: CycleSettings, ctx: Pick<Ctx, "now">): Result<AppData> {
  const valid = validateSettings(settings);
  if (!valid.ok) return valid;
  return { ok: true, value: syncPlan(touch({ ...data, settings: valid.value }, ctx.now)) };
}

export function updatePreferences(data: AppData, prefs: Partial<Preferences>, ctx: Pick<Ctx, "now">): AppData {
  return touch({ ...data, preferences: { ...data.preferences, ...prefs } }, ctx.now);
}

// ---------------------------------------------------------------- Ciclo

export function currentBlock(data: AppData) {
  const blocks = data.cycle.plan?.blocks ?? [];
  if (blocks.length === 0) return null;
  return blocks[Math.min(data.cycle.position, blocks.length - 1)];
}

export function upcomingBlocks(data: AppData, count: number) {
  const blocks = data.cycle.plan?.blocks ?? [];
  const out = [];
  for (let k = 0; k < Math.min(count, blocks.length); k++) {
    out.push(blocks[(data.cycle.position + k) % blocks.length]);
  }
  return out;
}

/** Avança para o próximo bloco; após o último, recomeça pelo primeiro (novo ciclo). */
export function advance(data: AppData): AppData {
  const len = data.cycle.plan?.blocks.length ?? 0;
  if (len === 0) return data;
  const nextPos = data.cycle.position + 1;
  if (nextPos >= len) {
    return {
      ...data,
      cycle: {
        ...data.cycle,
        position: 0,
        cycleNumber: data.cycle.cycleNumber + 1,
        completedCycles: data.cycle.completedCycles + 1,
      },
    };
  }
  return { ...data, cycle: { ...data.cycle, position: nextPos } };
}

/** Escolhe manualmente o próximo bloco do ciclo atual. */
export function jumpTo(data: AppData, index: number, ctx: Pick<Ctx, "now">): AppData {
  const len = data.cycle.plan?.blocks.length ?? 0;
  if (data.activeSession || index < 0 || index >= len) return data;
  return touch({ ...data, cycle: { ...data.cycle, position: index } }, ctx.now);
}

/** Recomeça o ciclo atual do primeiro bloco (sem apagar histórico). */
export function restartCycle(data: AppData, ctx: Pick<Ctx, "now">): AppData {
  if (data.activeSession) return data;
  return touch({ ...data, cycle: { ...data.cycle, position: 0 } }, ctx.now);
}

// ---------------------------------------------------------------- Sessões

export function startSession(data: AppData, ctx: Ctx, opts: { running?: boolean } = {}): AppData {
  if (data.activeSession) return data;
  const block = currentBlock(data);
  if (!block) return data;
  const subject = data.subjects.find((s) => s.id === block.subjectId);
  if (!subject) return data;
  const nowMs = ctx.now.getTime();
  const running = opts.running ?? true;
  const session: ActiveSession = {
    id: ctx.newId(),
    subjectId: subject.id,
    subjectName: subject.name,
    blockIndex: block.index,
    cycleNumber: data.cycle.cycleNumber,
    plannedMinutes: block.minutes,
    status: running ? "running" : "paused",
    startedAt: ctx.now.toISOString(),
    accumulatedMs: 0,
    lastResumedAt: running ? nowMs : null,
    lastHeartbeatAt: running ? nowMs : null,
    notes: "",
  };
  return touch({ ...data, activeSession: session }, ctx.now);
}

export function pauseSession(data: AppData, ctx: Pick<Ctx, "now">): AppData {
  if (!data.activeSession) return data;
  return touch({ ...data, activeSession: pauseTimer(data.activeSession, ctx.now.getTime()) }, ctx.now);
}

export function resumeSession(data: AppData, ctx: Pick<Ctx, "now">): AppData {
  if (!data.activeSession) return data;
  return touch({ ...data, activeSession: resumeTimer(data.activeSession, ctx.now.getTime()) }, ctx.now);
}

export function heartbeatSession(data: AppData, ctx: Pick<Ctx, "now">): AppData {
  if (!data.activeSession || data.activeSession.status !== "running") return data;
  return { ...data, activeSession: heartbeat(data.activeSession, ctx.now.getTime()) };
}

export function setSessionNotes(data: AppData, notes: string): AppData {
  if (!data.activeSession) return data;
  return { ...data, activeSession: { ...data.activeSession, notes: notes.slice(0, LIMITS.notesMax) } };
}

/** Descarta a sessão em andamento sem registrar (o ciclo permanece no mesmo bloco). */
export function discardSession(data: AppData, ctx: Pick<Ctx, "now">): AppData {
  if (!data.activeSession) return data;
  return touch({ ...data, activeSession: null }, ctx.now);
}

export function sessionStatusFor(studied: number, planned: number): SessionStatus {
  if (studied <= 0) return "skipped";
  return studied >= planned * 0.8 ? "completed" : "partial";
}

export interface FinishInput {
  studiedMinutes: number;
  notes?: string;
}

/**
 * Conclui a sessão (com ou sem cronômetro), registra no histórico e avança o ciclo.
 * Sem sessão ativa, registra manualmente o bloco atual.
 */
export function finishSession(data: AppData, input: FinishInput, ctx: Ctx): Result<AppData> {
  const err = validateStudiedMinutes(input.studiedMinutes);
  if (err) return { ok: false, errors: { studiedMinutes: err } };
  const block = currentBlock(data);
  const active = data.activeSession;
  if (!active && !block) return { ok: false, errors: { studiedMinutes: "Não há sessão para concluir." } };

  const subjectId = active?.subjectId ?? block!.subjectId;
  const subject = data.subjects.find((s) => s.id === subjectId);
  const studied = Math.round(input.studiedMinutes * 100) / 100;
  const planned = active?.plannedMinutes ?? block!.minutes;
  const record: SessionRecord = {
    id: ctx.newId(),
    subjectId,
    subjectName: subject?.name ?? active?.subjectName ?? "Disciplina removida",
    subjectColor: subject?.color ?? "#8A8F98",
    cycleNumber: active?.cycleNumber ?? data.cycle.cycleNumber,
    blockIndex: active?.blockIndex ?? block!.index,
    startedAt: active?.startedAt ?? new Date(ctx.now.getTime() - studied * 60_000).toISOString(),
    endedAt: ctx.now.toISOString(),
    plannedMinutes: planned,
    studiedMinutes: studied,
    status: sessionStatusFor(studied, planned),
    notes: (input.notes ?? active?.notes ?? "").trim().slice(0, LIMITS.notesMax),
  };
  const next = advance({ ...data, activeSession: null, history: [record, ...data.history] });
  return { ok: true, value: reconcileAtlas(touch(next, ctx.now), ctx.now) };
}

/** Pula o bloco atual registrando-o como "pulado" no histórico. */
export function skipBlock(data: AppData, ctx: Ctx): AppData {
  const block = currentBlock(data);
  if (!block) return data;
  const res = finishSession({ ...data, activeSession: null }, { studiedMinutes: 0, notes: "" }, ctx);
  return res.ok ? res.value : data;
}

/** Minutos decorridos da sessão ativa. */
export function activeElapsedMinutes(data: AppData, nowMs: number): number {
  if (!data.activeSession) return 0;
  return elapsedMs(data.activeSession, nowMs) / 60_000;
}

// ---------------------------------------------------------------- Histórico

export function deleteHistoryRecord(data: AppData, id: string, ctx: Pick<Ctx, "now">): AppData {
  return reconcileAtlas(touch({ ...data, history: data.history.filter((h) => h.id !== id) }, ctx.now), ctx.now);
}

export function updateHistoryRecord(
  data: AppData,
  id: string,
  patch: { studiedMinutes?: number; notes?: string },
  ctx: Pick<Ctx, "now">,
): Result<AppData> {
  const rec = data.history.find((h) => h.id === id);
  if (!rec) return { ok: false, errors: { id: "Registro não encontrado." } };
  if (patch.studiedMinutes !== undefined) {
    const err = validateStudiedMinutes(patch.studiedMinutes);
    if (err) return { ok: false, errors: { studiedMinutes: err } };
  }
  const studied = patch.studiedMinutes ?? rec.studiedMinutes;
  const updated: SessionRecord = {
    ...rec,
    studiedMinutes: studied,
    status: sessionStatusFor(studied, rec.plannedMinutes),
    notes: (patch.notes ?? rec.notes).slice(0, LIMITS.notesMax),
  };
  const next = touch({ ...data, history: data.history.map((h) => (h.id === id ? updated : h)) }, ctx.now);
  return { ok: true, value: reconcileAtlas(next, ctx.now) };
}

// ---------------------------------------------------------------- Exemplo / reset

export const DEMO_SUBJECTS: SubjectInput[] = [
  { name: "Língua Portuguesa", weight: 5, difficulty: "medium", sessionMinutes: null },
  { name: "Direito Constitucional", weight: 4, difficulty: "hard", sessionMinutes: null },
  { name: "Raciocínio Lógico", weight: 3, difficulty: "hard", sessionMinutes: null },
  { name: "Direito Administrativo", weight: 4, difficulty: "medium", sessionMinutes: null },
  { name: "Informática", weight: 2, difficulty: "easy", sessionMinutes: 30 },
];

/** Carrega disciplinas de exemplo (sem histórico fictício), marcadas como removíveis. */
export function loadDemo(data: AppData, ctx: Ctx): AppData {
  let next = data;
  const existing = new Set(data.subjects.map((s) => s.name.toLocaleLowerCase("pt-BR")));
  for (const input of DEMO_SUBJECTS) {
    if (existing.has(input.name.toLocaleLowerCase("pt-BR"))) continue;
    const res = addSubject(next, input, ctx);
    if (res.ok) {
      const added = res.value.subjects[res.value.subjects.length - 1];
      next = { ...res.value, subjects: res.value.subjects.map((s) => (s.id === added.id ? { ...s, isDemo: true } : s)) };
    }
  }
  return syncPlan(next);
}

export function hasDemo(data: AppData): boolean {
  return data.subjects.some((s) => s.isDemo);
}

/** Remove as disciplinas de exemplo e as sessões registradas para elas. */
export function removeDemo(data: AppData, ctx: Pick<Ctx, "now">): AppData {
  const demoIds = new Set(data.subjects.filter((s) => s.isDemo).map((s) => s.id));
  if (demoIds.size === 0) return data;
  const activeSession = data.activeSession && demoIds.has(data.activeSession.subjectId) ? null : data.activeSession;
  return reconcileAtlas(
    syncPlan(
      touch(
        {
          ...data,
          subjects: data.subjects.filter((s) => !demoIds.has(s.id)),
          history: data.history.filter((h) => !demoIds.has(h.subjectId)),
          activeSession,
        },
        ctx.now,
      ),
    ),
    ctx.now,
  );
}

/** Apaga todos os dados (mantém apenas as preferências visuais). */
export function resetAll(data: AppData, ctx: Pick<Ctx, "now">): AppData {
  const fresh = createEmptyData(ctx.now);
  return { ...fresh, preferences: data.preferences };
}
