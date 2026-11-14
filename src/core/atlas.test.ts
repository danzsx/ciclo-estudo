import { describe, expect, it } from "vitest";
import {
  ATLAS_CATALOG,
  addSubject,
  createEmptyData,
  daySummary,
  deleteHistoryRecord,
  finishSession,
  parseData,
  queryAtlasCards,
  reconcileAtlas,
  skipBlock,
  updateHistoryRecord,
  updateSettings,
  type AppData,
  type Ctx,
} from "./index";
import { MemoryAdapter } from "../storage/adapter";
import { Repository } from "../storage/repository";

function makeCtx(iso = "2026-04-10T14:00:00.000Z") {
  let t = Date.parse(iso);
  let id = 0;
  const ctx: Ctx = {
    get now() {
      return new Date(t);
    },
    newId: () => `id-${++id}`,
  };
  return {
    ctx,
    setNow: (nextIso: string) => {
      t = Date.parse(nextIso);
    },
    advanceDays: (days: number) => {
      t += days * 24 * 3600_000;
    },
  };
}

function unwrap<T>(r: { ok: true; value: T } | { ok: false; errors: Record<string, string> }): T {
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.value;
}

function setupStudyData(ctx: Ctx, cycleMinutes = 100, sessionMinutes = 50): AppData {
  let d = createEmptyData(ctx.now);
  d = unwrap(updateSettings(d, { cycleMinutes, sessionMinutes, minBlockMinutes: 25 }, ctx));
  d = unwrap(addSubject(d, { name: "Português", weight: 3, difficulty: "medium", sessionMinutes: null }, ctx));
  d = unwrap(addSubject(d, { name: "Direito", weight: 3, difficulty: "medium", sessionMinutes: null }, ctx));
  return d;
}

describe("ATLAS — Sistema de Conquistas e Coleção", () => {
  it("1 e 2. sessão concluída atualiza condições e desbloqueia na condição correta", () => {
    const { ctx } = makeCtx("2026-04-10T14:00:00.000Z");
    let d = setupStudyData(ctx);

    // Sessão pulada (0 min) não deve desbloquear nenhuma conquista
    d = skipBlock(d, ctx);
    expect(d.atlas.unlocked).toHaveLength(0);

    // Sessão de 30 min: desbloqueia primeiro dia (constancy-1d), mas NÃO 1 hora (dedication-1h)
    d = unwrap(finishSession(d, { studiedMinutes: 30 }, ctx));
    const idsAfter30 = d.atlas.unlocked.map((u) => u.id);
    expect(idsAfter30).toContain("constancy-1d");
    expect(idsAfter30).not.toContain("dedication-1h");

    // Mais 30 min (total 60 min): desbloqueia dedication-1h
    d = unwrap(finishSession(d, { studiedMinutes: 30 }, ctx));
    const idsAfter60 = d.atlas.unlocked.map((u) => u.id);
    expect(idsAfter60).toContain("dedication-1h");
  });

  it("3. uma conquista não pode ser duplicada e preserva a data original de aquisição", () => {
    const { ctx, advanceDays } = makeCtx("2026-04-10T14:00:00.000Z");
    let d = setupStudyData(ctx);
    d = unwrap(finishSession(d, { studiedMinutes: 60 }, ctx));
    const firstUnlock = d.atlas.unlocked.find((u) => u.id === "constancy-1d");
    expect(firstUnlock?.unlockedAt).toBe("2026-04-10T14:00:00.000Z");

    advanceDays(1);
    d = unwrap(finishSession(d, { studiedMinutes: 60 }, ctx));
    // Chamada manual extra de reconcileAtlas também não pode duplicar
    d = reconcileAtlas(d, ctx.now);

    const matches = d.atlas.unlocked.filter((u) => u.id === "constancy-1d");
    expect(matches).toHaveLength(1);
    expect(matches[0].unlockedAt).toBe("2026-04-10T14:00:00.000Z");
  });

  it("4. a coleção persiste após reiniciar o aplicativo", async () => {
    const { ctx } = makeCtx("2026-04-10T14:00:00.000Z");
    const adapter = new MemoryAdapter();
    const repo1 = new Repository(adapter);

    let d = setupStudyData(ctx);
    d = unwrap(finishSession(d, { studiedMinutes: 60 }, ctx));
    await repo1.save(d);
    await repo1.flush();

    const repo2 = new Repository(adapter);
    const loaded = await repo2.load(ctx.now);
    expect(loaded.data.atlas.unlocked.map((u) => u.id)).toEqual(d.atlas.unlocked.map((u) => u.id));
    expect(loaded.data.atlas.unlocked.length).toBeGreaterThanOrEqual(2);
  });

  it("5. exclusão e edição de sessão mantêm dados e conquistas consistentes", () => {
    const { ctx } = makeCtx("2026-04-10T14:00:00.000Z");
    let d = setupStudyData(ctx);
    d = unwrap(finishSession(d, { studiedMinutes: 60 }, ctx));
    expect(d.atlas.unlocked.map((u) => u.id)).toContain("dedication-1h");

    const sessionId = d.history[0].id;
    // Editar para 20 min deve revogar dedication-1h, mas manter constancy-1d
    d = unwrap(updateHistoryRecord(d, sessionId, { studiedMinutes: 20 }, ctx));
    expect(d.atlas.unlocked.map((u) => u.id)).not.toContain("dedication-1h");
    expect(d.atlas.unlocked.map((u) => u.id)).toContain("constancy-1d");

    // Excluir a única sessão deve revogar constancy-1d também
    d = deleteHistoryRecord(d, sessionId, ctx);
    expect(d.atlas.unlocked).toHaveLength(0);
  });

  it("6. conclusão de um ciclo e conquistas especiais são reconhecidas corretamente", () => {
    const { ctx } = makeCtx("2026-04-10T14:00:00.000Z");
    let d = setupStudyData(ctx, 100, 50);
    const blocksCount = d.cycle.plan!.blocks.length;
    expect(blocksCount).toBe(2);

    // Conclui todos os blocos do ciclo 1 integralmente
    d = unwrap(finishSession(d, { studiedMinutes: 50 }, ctx));
    d = unwrap(finishSession(d, { studiedMinutes: 50 }, ctx));

    expect(d.cycle.completedCycles).toBe(1);
    const ids = d.atlas.unlocked.map((u) => u.id);
    expect(ids).toContain("cycles-1");
    expect(ids).toContain("special-all-subjects-cycle");
    expect(ids).toContain("special-perfect-cycle");
  });

  it("7. conquistas retroativas utilizam apenas dados reais de histórico anterior", () => {
    // Simula dados salvos no formato v1 (antes do ATLAS existir)
    const legacyV1 = {
      schemaVersion: 1,
      subjects: [
        { id: "s1", name: "Português", weight: 3, difficulty: "medium", sessionMinutes: null, color: "#002a32", createdAt: "2026-03-01T10:00:00.000Z", updatedAt: "2026-03-01T10:00:00.000Z" },
      ],
      settings: { cycleMinutes: 60, sessionMinutes: 30, minBlockMinutes: 15 },
      preferences: { theme: "light" },
      cycle: { plan: null, position: 0, cycleNumber: 2, completedCycles: 1 },
      activeSession: null,
      history: [
        {
          id: "h1",
          subjectId: "s1",
          subjectName: "Português",
          subjectColor: "#002a32",
          cycleNumber: 1,
          blockIndex: 0,
          startedAt: "2026-03-01T10:00:00.000Z",
          endedAt: "2026-03-01T10:30:00.000Z",
          plannedMinutes: 30,
          studiedMinutes: 30,
          status: "completed",
          notes: "",
        },
        {
          id: "h2",
          subjectId: "s1",
          subjectName: "Português",
          subjectColor: "#002a32",
          cycleNumber: 1,
          blockIndex: 1,
          startedAt: "2026-03-02T10:00:00.000Z",
          endedAt: "2026-03-02T10:30:00.000Z",
          plannedMinutes: 30,
          studiedMinutes: 30,
          status: "completed",
          notes: "",
        },
        {
          id: "h3",
          subjectId: "s1",
          subjectName: "Português",
          subjectColor: "#002a32",
          cycleNumber: 2,
          blockIndex: 0,
          startedAt: "2026-03-03T10:00:00.000Z",
          endedAt: "2026-03-03T10:30:00.000Z",
          plannedMinutes: 30,
          studiedMinutes: 30,
          status: "completed",
          notes: "",
        },
      ],
      meta: { createdAt: "2026-03-01T10:00:00.000Z", updatedAt: "2026-03-03T10:30:00.000Z" },
    };

    const { data, migratedFrom } = parseData(JSON.stringify(legacyV1), new Date("2026-04-10T12:00:00.000Z"));
    expect(migratedFrom).toBe(1);
    const ids = data.atlas.unlocked.map((u) => u.id);
    expect(ids).toContain("constancy-1d");
    expect(ids).toContain("constancy-3d");
    expect(ids).toContain("dedication-1h");
    expect(ids).toContain("cycles-1");

    // Datas devem refletir as sessões reais históricas, não a data da migração
    expect(data.atlas.unlocked.find((u) => u.id === "constancy-1d")?.unlockedAt).toBe("2026-03-01T10:30:00.000Z");
    expect(data.atlas.unlocked.find((u) => u.id === "constancy-3d")?.unlockedAt).toBe("2026-03-03T10:30:00.000Z");
    expect(data.atlas.unlocked.find((u) => u.id === "dedication-1h")?.unlockedAt).toBe("2026-03-02T10:30:00.000Z");
  });

  it("8 e 9. filtros, ordenação e estados bloqueado/desbloqueado da coleção funcionam", () => {
    const { ctx } = makeCtx("2026-04-10T14:00:00.000Z");
    let d = setupStudyData(ctx);
    d = unwrap(finishSession(d, { studiedMinutes: 60 }, ctx));

    const allCards = queryAtlasCards(d.atlas.unlocked);
    expect(allCards).toHaveLength(ATLAS_CATALOG.length);

    const unlockedOnly = queryAtlasCards(d.atlas.unlocked, { status: "unlocked" });
    const lockedOnly = queryAtlasCards(d.atlas.unlocked, { status: "locked" });
    expect(unlockedOnly.length + lockedOnly.length).toBe(ATLAS_CATALOG.length);
    expect(unlockedOnly.every((c) => Boolean(c.unlocked))).toBe(true);
    expect(lockedOnly.every((c) => !c.unlocked)).toBe(true);

    const legendaryCards = queryAtlasCards(d.atlas.unlocked, { rarity: "legendary" });
    expect(legendaryCards.length).toBeGreaterThanOrEqual(3);
    expect(legendaryCards.every((c) => c.definition.rarity === "legendary")).toBe(true);

    const cyclesCategory = queryAtlasCards(d.atlas.unlocked, { category: "cycles" });
    expect(cyclesCategory).toHaveLength(6);

    const byRarity = queryAtlasCards(d.atlas.unlocked, { sortBy: "rarity" });
    expect(byRarity[0].definition.rarity).toBe("legendary");
    expect(byRarity[byRarity.length - 1].definition.rarity).toBe("common");

    const byDate = queryAtlasCards(d.atlas.unlocked, { sortBy: "date" });
    expect(byDate[0].unlocked).toBeTruthy();
    expect(byDate[byDate.length - 1].unlocked).toBeUndefined();
  });

  it("10. integridade do catálogo e contagem de dias consecutivos", () => {
    // IDs e números do catálogo devem ser únicos
    const ids = new Set(ATLAS_CATALOG.map((c) => c.id));
    const nums = new Set(ATLAS_CATALOG.map((c) => c.number));
    expect(ids.size).toBe(ATLAS_CATALOG.length);
    expect(nums.size).toBe(ATLAS_CATALOG.length);

    // 3 dias consecutivos em horário local (sem duplicar no mesmo dia)
    const { ctx, setNow } = makeCtx("2026-04-10T10:00:00.000");
    let d = setupStudyData(ctx);
    d = unwrap(finishSession(d, { studiedMinutes: 25 }, ctx));
    setNow("2026-04-10T18:00:00.000"); // mesmo dia
    d = unwrap(finishSession(d, { studiedMinutes: 25 }, ctx));
    setNow("2026-04-11T10:00:00.000"); // dia 2
    d = unwrap(finishSession(d, { studiedMinutes: 25 }, ctx));
    expect(d.atlas.unlocked.map((u) => u.id)).not.toContain("constancy-3d");

    setNow("2026-04-12T10:00:00.000"); // dia 3
    d = unwrap(finishSession(d, { studiedMinutes: 25 }, ctx));
    expect(d.atlas.unlocked.map((u) => u.id)).toContain("constancy-3d");

    const sumApr10 = daySummary(d.history, "2026-04-10");
    expect(sumApr10.totalMinutes).toBe(50);
    expect(sumApr10.sessionsCount).toBe(2);
    expect(sumApr10.subjects.length).toBeGreaterThanOrEqual(1);
  });
});

