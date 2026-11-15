import { describe, expect, it } from "vitest";
import {
  addCourse,
  addSubject,
  advance,
  createEmptyData,
  currentBlock,
  cycleProgress,
  dailySeries,
  currentStreak,
  deleteCourse,
  deleteSubject,
  discardSession,
  elapsedMs,
  finishSession,
  hasDemo,
  jumpTo,
  loadDemo,
  pauseSession,
  removeDemo,
  restoreSession,
  resumeSession,
  selectCourse,
  setSessionNotes,
  skipBlock,
  startSession,
  statsBySubject,
  totalStudied,
  updateCourse,
  updateSettings,
  updateSubject,
  type AppData,
  type Ctx,
} from "./index";

function makeCtx(start = Date.parse("2026-03-10T12:00:00.000Z")) {
  let t = start;
  let id = 0;
  const ctx = {
    get now() {
      return new Date(t);
    },
    newId: () => `id-${++id}`,
  } as Ctx;
  return { ctx, advanceMs: (ms: number) => (t += ms), at: () => t };
}

function unwrap<T>(r: { ok: true; value: T } | { ok: false; errors: Record<string, string> }): T {
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.value;
}

function withSubjects(ctx: Ctx, cycleMinutes = 300): AppData {
  let d = createEmptyData(ctx.now);
  d = unwrap(updateSettings(d, { cycleMinutes, sessionMinutes: 50, minBlockMinutes: 25 }, ctx));
  d = unwrap(addSubject(d, { name: "Português", weight: 5, difficulty: "medium", sessionMinutes: null }, ctx));
  d = unwrap(addSubject(d, { name: "Matemática", weight: 3, difficulty: "hard", sessionMinutes: null }, ctx));
  d = unwrap(addSubject(d, { name: "História", weight: 2, difficulty: "easy", sessionMinutes: null }, ctx));
  return d;
}

describe("disciplinas — criar, editar, excluir", () => {
  it("cria com valores válidos e recalcula o plano", () => {
    const { ctx } = makeCtx();
    const d = withSubjects(ctx);
    expect(d.subjects).toHaveLength(3);
    expect(d.cycle.plan?.allocations).toHaveLength(3);
    expect(new Set(d.subjects.map((s) => s.color)).size).toBe(3);
  });

  it("rejeita entradas inválidas", () => {
    const { ctx } = makeCtx();
    const d = withSubjects(ctx);
    const empty = addSubject(d, { name: "   ", weight: 3, difficulty: "medium", sessionMinutes: null }, ctx);
    expect(empty.ok).toBe(false);
    const dup = addSubject(d, { name: "português", weight: 3, difficulty: "medium", sessionMinutes: null }, ctx);
    expect(dup.ok).toBe(false);
    const badWeight = addSubject(d, { name: "Nova", weight: 9, difficulty: "medium", sessionMinutes: null }, ctx);
    expect(!badWeight.ok && badWeight.errors.weight).toBeTruthy();
    const badSession = addSubject(d, { name: "Nova", weight: 3, difficulty: "medium", sessionMinutes: 5 }, ctx);
    expect(!badSession.ok && badSession.errors.sessionMinutes).toBeTruthy();
    const badDiff = addSubject(d, { name: "Nova", weight: 3, difficulty: "x" as never, sessionMinutes: null }, ctx);
    expect(badDiff.ok).toBe(false);
  });

  it("edita e recalcula a distribuição", () => {
    const { ctx } = makeCtx();
    const d = withSubjects(ctx);
    const hist = d.subjects[2];
    const before = d.cycle.plan!.allocations.find((a) => a.subjectId === hist.id)!.minutes;
    const d2 = unwrap(updateSubject(d, hist.id, { name: "História Geral", weight: 5, difficulty: "hard", sessionMinutes: 40 }, ctx));
    const s = d2.subjects.find((x) => x.id === hist.id)!;
    expect(s.name).toBe("História Geral");
    expect(s.sessionMinutes).toBe(40);
    const after = d2.cycle.plan!.allocations.find((a) => a.subjectId === hist.id)!.minutes;
    expect(after).toBeGreaterThan(before);
    expect(d2.cycle.plan!.signature).not.toBe(d.cycle.plan!.signature);
  });

  it("permite manter o mesmo nome ao editar", () => {
    const { ctx } = makeCtx();
    const d = withSubjects(ctx);
    const s = d.subjects[0];
    expect(updateSubject(d, s.id, { name: s.name, weight: 4, difficulty: "easy", sessionMinutes: null }, ctx).ok).toBe(true);
  });

  it("exclui, mantém o histórico e cancela sessão ativa da disciplina", () => {
    const { ctx } = makeCtx();
    let d = withSubjects(ctx);
    const first = currentBlock(d)!;
    d = unwrap(finishSession(d, { studiedMinutes: 30 }, ctx));
    d = startSession(d, ctx);
    const activeSubject = d.activeSession!.subjectId;
    d = deleteSubject(d, activeSubject, ctx);
    expect(d.activeSession).toBeNull();
    expect(d.subjects.some((s) => s.id === activeSubject)).toBe(false);
    expect(d.history).toHaveLength(1);
    expect(d.history[0].subjectId).toBe(first.subjectId);
    expect(d.cycle.plan!.allocations).toHaveLength(2);
    expect(d.cycle.plan!.blocks.reduce((a, b) => a + b.minutes, 0)).toBe(300);
  });

  it("excluir todas deixa o ciclo vazio sem erros", () => {
    const { ctx } = makeCtx();
    let d = withSubjects(ctx);
    for (const s of [...d.subjects]) d = deleteSubject(d, s.id, ctx);
    expect(d.cycle.plan!.blocks).toEqual([]);
    expect(currentBlock(d)).toBeNull();
    expect(startSession(d, ctx).activeSession).toBeNull();
    expect(finishSession(d, { studiedMinutes: 10 }, ctx).ok).toBe(false);
  });
});

describe("configurações", () => {
  it("valida e recalcula ao alterar tempo disponível", () => {
    const { ctx } = makeCtx();
    const d = withSubjects(ctx);
    const d2 = unwrap(updateSettings(d, { cycleMinutes: 600, sessionMinutes: 60, minBlockMinutes: 30 }, ctx));
    expect(d2.cycle.plan!.totalMinutes).toBe(600);
    expect(d2.cycle.plan!.blocks.reduce((a, b) => a + b.minutes, 0)).toBe(600);
    expect(updateSettings(d, { cycleMinutes: 10, sessionMinutes: 50, minBlockMinutes: 25 }, ctx).ok).toBe(false);
    expect(updateSettings(d, { cycleMinutes: 302, sessionMinutes: 50, minBlockMinutes: 25 }, ctx).ok).toBe(false);
    expect(updateSettings(d, { cycleMinutes: 300, sessionMinutes: 20, minBlockMinutes: 25 }, ctx).ok).toBe(false);
    expect(updateSettings(d, { cycleMinutes: NaN, sessionMinutes: 50, minBlockMinutes: 25 }, ctx).ok).toBe(false);
  });

  it("mantém a posição no ciclo ao recalcular (limitada ao novo tamanho)", () => {
    const { ctx } = makeCtx();
    let d = withSubjects(ctx, 600);
    d = advance(advance(advance(d)));
    expect(d.cycle.position).toBe(3);
    d = unwrap(updateSettings(d, { cycleMinutes: 90, sessionMinutes: 45, minBlockMinutes: 25 }, ctx));
    expect(d.cycle.position).toBeLessThan(d.cycle.plan!.blocks.length);
  });
});

describe("percorrer o ciclo", () => {
  it("percorre todos os blocos e recomeça pelo primeiro", () => {
    const { ctx, advanceMs } = makeCtx();
    let d = withSubjects(ctx);
    const blocks = d.cycle.plan!.blocks;
    const visited: string[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = currentBlock(d)!;
      expect(b.index).toBe(i);
      visited.push(b.subjectId);
      d = startSession(d, ctx);
      advanceMs(b.minutes * 60_000);
      d = unwrap(finishSession(d, { studiedMinutes: b.minutes }, ctx));
    }
    expect(visited).toEqual(blocks.map((b) => b.subjectId));
    expect(d.cycle.position).toBe(0);
    expect(d.cycle.cycleNumber).toBe(2);
    expect(d.cycle.completedCycles).toBe(1);
    expect(currentBlock(d)!.index).toBe(0);
    expect(d.history).toHaveLength(blocks.length);
    expect(d.history.every((h) => h.status === "completed" && h.cycleNumber === 1)).toBe(true);
    expect(totalStudied(d.history)).toBe(300);
  });

  it("pular registra como pulado e avança", () => {
    const { ctx } = makeCtx();
    let d = withSubjects(ctx);
    d = skipBlock(d, ctx);
    expect(d.cycle.position).toBe(1);
    expect(d.history[0].status).toBe("skipped");
    expect(d.history[0].studiedMinutes).toBe(0);
  });

  it("permite escolher outro bloco quando não há sessão ativa", () => {
    const { ctx } = makeCtx();
    let d = withSubjects(ctx);
    d = jumpTo(d, 2, ctx);
    expect(d.cycle.position).toBe(2);
    d = startSession(d, ctx);
    expect(jumpTo(d, 0, ctx).cycle.position).toBe(2);
  });

  it("progresso do ciclo reflete a posição", () => {
    const { ctx } = makeCtx();
    let d = withSubjects(ctx);
    expect(cycleProgress(d).ratio).toBe(0);
    d = advance(d);
    const p = cycleProgress(d);
    expect(p.blocksDone).toBe(1);
    expect(p.minutesDone).toBe(d.cycle.plan!.blocks[0].minutes);
  });
});

describe("sessões e cronômetro", () => {
  it("pausar e retomar contabiliza só o tempo ativo", () => {
    const { ctx, advanceMs, at } = makeCtx();
    let d = withSubjects(ctx);
    d = startSession(d, ctx);
    advanceMs(10 * 60_000);
    d = pauseSession(d, ctx);
    expect(d.activeSession!.status).toBe("paused");
    advanceMs(30 * 60_000); // pausa não conta
    expect(elapsedMs(d.activeSession!, at())).toBe(10 * 60_000);
    d = resumeSession(d, ctx);
    advanceMs(5 * 60_000);
    expect(elapsedMs(d.activeSession!, at())).toBe(15 * 60_000);
    d = setSessionNotes(d, "Revisar crase");
    d = unwrap(finishSession(d, { studiedMinutes: 15 }, ctx));
    expect(d.history[0].notes).toBe("Revisar crase");
    expect(d.history[0].studiedMinutes).toBe(15);
    expect(d.history[0].status).toBe("partial");
    expect(d.activeSession).toBeNull();
  });

  it("pausar/retomar são idempotentes", () => {
    const { ctx, advanceMs, at } = makeCtx();
    let d = startSession(withSubjects(ctx), ctx);
    advanceMs(60_000);
    d = pauseSession(pauseSession(d, ctx), ctx);
    d = resumeSession(resumeSession(d, ctx), ctx);
    advanceMs(60_000);
    expect(elapsedMs(d.activeSession!, at())).toBe(120_000);
  });

  it("descartar não registra nem avança", () => {
    const { ctx } = makeCtx();
    let d = startSession(withSubjects(ctx), ctx);
    d = discardSession(d, ctx);
    expect(d.activeSession).toBeNull();
    expect(d.history).toHaveLength(0);
    expect(d.cycle.position).toBe(0);
  });

  it("registro manual (sem cronômetro) funciona", () => {
    const { ctx } = makeCtx();
    let d = withSubjects(ctx);
    const planned = currentBlock(d)!.minutes;
    d = unwrap(finishSession(d, { studiedMinutes: planned, notes: "manual" }, ctx));
    expect(d.history[0].status).toBe("completed");
    expect(d.cycle.position).toBe(1);
  });

  it("rejeita tempo estudado inválido", () => {
    const { ctx } = makeCtx();
    const d = startSession(withSubjects(ctx), ctx);
    expect(finishSession(d, { studiedMinutes: -5 }, ctx).ok).toBe(false);
    expect(finishSession(d, { studiedMinutes: NaN }, ctx).ok).toBe(false);
    expect(finishSession(d, { studiedMinutes: 2000 }, ctx).ok).toBe(false);
  });

  it("restaura sessão após o app ser fechado com o cronômetro rodando", () => {
    const { ctx, advanceMs, at } = makeCtx();
    let d = startSession(withSubjects(ctx), ctx);
    advanceMs(20 * 60_000);
    d = { ...d, activeSession: { ...d.activeSession!, lastHeartbeatAt: at() } };
    advanceMs(2 * 60 * 60_000); // app fechado por 2h
    const r = restoreSession(d.activeSession!, at());
    expect(r.recovered).toBe(true);
    expect(r.session.status).toBe("paused");
    expect(r.session.accumulatedMs).toBe(20 * 60_000);
    expect(r.uncountedMs).toBe(2 * 60 * 60_000);
  });

  it("não altera sessão com sinal de vida recente", () => {
    const { ctx, advanceMs, at } = makeCtx();
    const d = startSession(withSubjects(ctx), ctx);
    advanceMs(10_000);
    expect(restoreSession(d.activeSession!, at()).recovered).toBe(false);
  });
});

describe("dados de exemplo", () => {
  it("carrega e remove exemplos sem afetar disciplinas reais", () => {
    const { ctx } = makeCtx();
    let d = unwrap(addSubject(createEmptyData(ctx.now), { name: "Minha", weight: 3, difficulty: "medium", sessionMinutes: null }, ctx));
    d = loadDemo(d, ctx);
    expect(hasDemo(d)).toBe(true);
    expect(d.subjects.length).toBe(6);
    expect(d.history).toHaveLength(0); // sem histórico fictício
    d = removeDemo(d, ctx);
    expect(hasDemo(d)).toBe(false);
    expect(d.subjects.map((s) => s.name)).toEqual(["Minha"]);
  });
});

describe("estatísticas", () => {
  it("calcula totais, por disciplina, série diária e sequência", () => {
    const { ctx, advanceMs } = makeCtx(new Date(2026, 2, 10, 9).getTime());
    let d = withSubjects(ctx);
    d = unwrap(finishSession(d, { studiedMinutes: 40 }, ctx));
    advanceMs(24 * 3600_000);
    d = unwrap(finishSession(d, { studiedMinutes: 25 }, ctx));
    const now = ctx.now;
    expect(totalStudied(d.history)).toBe(65);
    const by = statsBySubject(d.history, d.subjects);
    expect(by[0].minutes).toBe(40);
    const series = dailySeries(d.history, 7, now);
    expect(series).toHaveLength(7);
    expect(series[6].minutes).toBe(25);
    expect(series[5].minutes).toBe(40);
    expect(currentStreak(d.history, now)).toBe(2);
  });
});

describe("múltiplos cursos — criar, alternar, editar, excluir", () => {
  it("adiciona cursos distintos com disciplinas independentes (inclusive mesmo nome)", () => {
    const { ctx } = makeCtx();
    let d = createEmptyData(ctx.now);
    d = unwrap(updateCourse(d, d.activeCourseId, { name: "Concurso INSS" }, ctx));
    d = unwrap(addSubject(d, { name: "Português", weight: 5, difficulty: "medium", sessionMinutes: null }, ctx));
    d = unwrap(addSubject(d, { name: "Direito Previdenciário", weight: 5, difficulty: "hard", sessionMinutes: null }, ctx));

    const inssId = d.activeCourseId;
    d = unwrap(addCourse(d, { name: "Vestibular" }, ctx));
    const vestId = d.activeCourseId;
    expect(vestId).not.toBe(inssId);
    expect(d.subjects).toHaveLength(0);

    d = unwrap(addSubject(d, { name: "Português", weight: 3, difficulty: "easy", sessionMinutes: null }, ctx));
    d = unwrap(addSubject(d, { name: "Matemática", weight: 5, difficulty: "hard", sessionMinutes: null }, ctx));
    expect(d.subjects.map((s) => s.name)).toEqual(["Português", "Matemática"]);

    d = selectCourse(d, inssId, ctx);
    expect(d.subjects.map((s) => s.name)).toEqual(["Português", "Direito Previdenciário"]);
  });

  it("rejeita curso com nome vazio ou duplicado", () => {
    const { ctx } = makeCtx();
    let d = createEmptyData(ctx.now);
    d = unwrap(addCourse(d, { name: "Concurso INSS" }, ctx));
    expect(addCourse(d, { name: "   " }, ctx).ok).toBe(false);
    expect(addCourse(d, { name: "concurso inss" }, ctx).ok).toBe(false);
  });

  it("impede excluir o último curso e limpa sessão ativa se excluir o curso dela", () => {
    const { ctx } = makeCtx();
    let d = createEmptyData(ctx.now);
    expect(deleteCourse(d, d.activeCourseId, ctx).ok).toBe(false);

    d = unwrap(addSubject(d, { name: "Português", weight: 4, difficulty: "medium", sessionMinutes: null }, ctx));
    const firstId = d.activeCourseId;
    d = unwrap(addCourse(d, { name: "Vestibular" }, ctx));
    d = unwrap(addSubject(d, { name: "Física", weight: 4, difficulty: "hard", sessionMinutes: null }, ctx));
    const vestId = d.activeCourseId;

    d = startSession(d, ctx);
    expect(d.activeSession?.courseId).toBe(vestId);
    d = unwrap(finishSession(d, { studiedMinutes: 50 }, ctx));
    expect(d.history[0].courseId).toBe(vestId);
    expect(d.history[0].courseName).toBe("Vestibular");

    d = startSession(d, ctx);
    d = unwrap(deleteCourse(d, vestId, ctx));
    expect(d.activeCourseId).toBe(firstId);
    expect(d.activeSession).toBeNull();
    expect(d.history).toHaveLength(1);
    expect(d.history[0].courseName).toBe("Vestibular");
  });

  it("avança o ciclo correto mesmo se o usuário alternar de curso durante uma sessão ativa", () => {
    const { ctx } = makeCtx();
    let d = withSubjects(ctx);
    const courseAId = d.activeCourseId;
    d = unwrap(addCourse(d, { name: "Vestibular" }, ctx));
    d = unwrap(addSubject(d, { name: "Química", weight: 4, difficulty: "medium", sessionMinutes: null }, ctx));
    const courseBId = d.activeCourseId;

    d = selectCourse(d, courseAId, ctx);
    d = startSession(d, ctx);
    d = selectCourse(d, courseBId, ctx);
    expect(d.activeCourseId).toBe(courseBId);

    d = unwrap(finishSession(d, { studiedMinutes: 45 }, ctx));
    const courseA = d.courses.find((c) => c.id === courseAId)!;
    const courseB = d.courses.find((c) => c.id === courseBId)!;
    expect(courseA.cycle.position).toBe(1);
    expect(courseB.cycle.position).toBe(0);
    expect(d.history[0].courseId).toBe(courseAId);
  });
});
