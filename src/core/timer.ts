/**
 * Cronômetro baseado em marcas de tempo (não em contadores), o que o torna
 * imune a travamentos da interface e permite restaurar o estado após reiniciar.
 */
import type { ActiveSession } from "./types";

/** Se o último "sinal de vida" for mais antigo que isso, o app foi fechado com o cronômetro rodando. */
export const STALE_HEARTBEAT_MS = 60_000;
/** Intervalo recomendado para gravar o sinal de vida. */
export const HEARTBEAT_INTERVAL_MS = 15_000;

export function elapsedMs(session: ActiveSession, now: number): number {
  if (session.status === "running" && session.lastResumedAt !== null) {
    return session.accumulatedMs + Math.max(0, now - session.lastResumedAt);
  }
  return session.accumulatedMs;
}

export function pauseTimer(session: ActiveSession, now: number): ActiveSession {
  if (session.status !== "running") return session;
  return {
    ...session,
    status: "paused",
    accumulatedMs: elapsedMs(session, now),
    lastResumedAt: null,
    lastHeartbeatAt: null,
  };
}

export function resumeTimer(session: ActiveSession, now: number): ActiveSession {
  if (session.status === "running") return session;
  return { ...session, status: "running", lastResumedAt: now, lastHeartbeatAt: now };
}

export function heartbeat(session: ActiveSession, now: number): ActiveSession {
  if (session.status !== "running") return session;
  return { ...session, lastHeartbeatAt: now };
}

export interface RestoreResult {
  session: ActiveSession;
  /** true se a sessão estava rodando e foi pausada automaticamente na restauração. */
  recovered: boolean;
  /** Tempo (ms) em que o app ficou fechado e que NÃO foi contabilizado. */
  uncountedMs: number;
}

/**
 * Restaura uma sessão ao abrir o app. Se o cronômetro estava rodando e o app
 * ficou fechado (sinal de vida antigo), a sessão é pausada no último sinal de
 * vida — o tempo fechado não é contado, mas o estudante pode ajustá-lo ao finalizar.
 */
export function restoreSession(session: ActiveSession, now: number): RestoreResult {
  if (session.status !== "running" || session.lastResumedAt === null) {
    return { session, recovered: false, uncountedMs: 0 };
  }
  const beat = session.lastHeartbeatAt ?? session.lastResumedAt;
  if (now - beat <= STALE_HEARTBEAT_MS) {
    return { session, recovered: false, uncountedMs: 0 };
  }
  const countedUntil = Math.max(session.lastResumedAt, beat);
  return {
    session: {
      ...session,
      status: "paused",
      accumulatedMs: session.accumulatedMs + (countedUntil - session.lastResumedAt),
      lastResumedAt: null,
      lastHeartbeatAt: null,
    },
    recovered: true,
    uncountedMs: now - countedUntil,
  };
}
