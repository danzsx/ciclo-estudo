import type { AppData, SessionRecord, Subject } from "./types";

/** Data local no formato AAAA-MM-DD. */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function totalStudied(history: SessionRecord[]): number {
  return history.reduce((acc, h) => acc + h.studiedMinutes, 0);
}

export function countByStatus(history: SessionRecord[]) {
  return {
    completed: history.filter((h) => h.status === "completed").length,
    partial: history.filter((h) => h.status === "partial").length,
    skipped: history.filter((h) => h.status === "skipped").length,
  };
}

export interface SubjectStats {
  subjectId: string;
  name: string;
  color: string;
  minutes: number;
  sessions: number;
  lastAt: string | null;
  exists: boolean;
}

export function statsBySubject(history: SessionRecord[], subjects: Subject[]): SubjectStats[] {
  const map = new Map<string, SubjectStats>();
  for (const s of subjects) {
    map.set(s.id, { subjectId: s.id, name: s.name, color: s.color, minutes: 0, sessions: 0, lastAt: null, exists: true });
  }
  for (const h of history) {
    let entry = map.get(h.subjectId);
    if (!entry) {
      entry = {
        subjectId: h.subjectId,
        name: h.subjectName,
        color: h.subjectColor,
        minutes: 0,
        sessions: 0,
        lastAt: null,
        exists: false,
      };
      map.set(h.subjectId, entry);
    }
    entry.minutes += h.studiedMinutes;
    if (h.status !== "skipped") entry.sessions += 1;
    if (!entry.lastAt || h.endedAt > entry.lastAt) entry.lastAt = h.endedAt;
  }
  return [...map.values()].sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, "pt-BR"));
}

export interface DayPoint {
  date: string;
  minutes: number;
}

/** Minutos estudados por dia nos últimos `days` dias (inclui hoje). */
export function dailySeries(history: SessionRecord[], days: number, now: Date): DayPoint[] {
  const totals = new Map<string, number>();
  for (const h of history) {
    const key = localDateKey(new Date(h.endedAt));
    totals.set(key, (totals.get(key) ?? 0) + h.studiedMinutes);
  }
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = localDateKey(d);
    out.push({ date: key, minutes: totals.get(key) ?? 0 });
  }
  return out;
}

/** Dias consecutivos com estudo, terminando hoje (ou ontem, se hoje ainda não houve estudo). */
export function currentStreak(history: SessionRecord[], now: Date): number {
  const days = new Set(history.filter((h) => h.studiedMinutes > 0).map((h) => localDateKey(new Date(h.endedAt))));
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Progresso do ciclo atual: blocos e minutos antes da posição atual. */
export function cycleProgress(data: AppData) {
  const blocks = data.cycle.plan?.blocks ?? [];
  const total = blocks.reduce((a, b) => a + b.minutes, 0);
  const done = blocks.slice(0, data.cycle.position).reduce((a, b) => a + b.minutes, 0);
  return {
    blocksDone: Math.min(data.cycle.position, blocks.length),
    blocksTotal: blocks.length,
    minutesDone: done,
    minutesTotal: total,
    ratio: total > 0 ? done / total : 0,
  };
}

/** Progresso de cada disciplina no ciclo atual (estudado vs. previsto). */
export function subjectCycleProgress(data: AppData, subjectId: string) {
  const planned = data.cycle.plan?.allocations.find((a) => a.subjectId === subjectId)?.minutes ?? 0;
  const studied = data.history
    .filter((h) => h.subjectId === subjectId && h.cycleNumber === data.cycle.cycleNumber)
    .reduce((a, h) => a + h.studiedMinutes, 0);
  return { planned, studied, ratio: planned > 0 ? Math.min(1, studied / planned) : 0 };
}

/** Minutos estudados nos últimos 7 dias vs. 7 dias anteriores. */
export function weekComparison(history: SessionRecord[], now: Date) {
  const series = dailySeries(history, 14, now);
  const prev = series.slice(0, 7).reduce((a, d) => a + d.minutes, 0);
  const curr = series.slice(7).reduce((a, d) => a + d.minutes, 0);
  return { current: curr, previous: prev, delta: prev > 0 ? (curr - prev) / prev : null };
}

export interface DaySummary {
  date: string;
  totalMinutes: number;
  sessionsCount: number;
  subjects: Array<{ subjectId: string; name: string; minutes: number }>;
}

/** Resumo real de sessões e disciplinas estudadas em uma data local (`AAAA-MM-DD`). */
export function daySummary(history: SessionRecord[], dateKey: string): DaySummary {
  const daySessions = history.filter((h) => localDateKey(new Date(h.endedAt)) === dateKey);
  const bySubject = new Map<string, { subjectId: string; name: string; minutes: number }>();
  let totalMinutes = 0;
  let sessionsCount = 0;
  for (const s of daySessions) {
    totalMinutes += s.studiedMinutes;
    if (s.status !== "skipped") sessionsCount += 1;
    const prev = bySubject.get(s.subjectId);
    if (prev) {
      prev.minutes += s.studiedMinutes;
    } else {
      bySubject.set(s.subjectId, {
        subjectId: s.subjectId,
        name: s.subjectName,
        minutes: s.studiedMinutes,
      });
    }
  }
  const subjects = [...bySubject.values()].sort((a, b) => b.minutes - a.minutes);
  return { date: dateKey, totalMinutes, sessionsCount, subjects };
}
