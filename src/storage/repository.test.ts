import { describe, expect, it } from "vitest";
import {
  DataError,
  SCHEMA_VERSION,
  addSubject,
  createBackup,
  createEmptyData,
  finishSession,
  migrate,
  parseBackup,
  parseData,
  serializeData,
  startSession,
  updateSettings,
  type AppData,
  type Ctx,
} from "../core";
import { MemoryAdapter } from "./adapter";
import { Repository } from "./repository";

const ctx: Ctx = { now: new Date("2026-04-01T10:00:00.000Z"), newId: (() => { let i = 0; return () => `id-${++i}`; })() };

function sample(): AppData {
  let d = createEmptyData(ctx.now);
  const r1 = updateSettings(d, { cycleMinutes: 240, sessionMinutes: 40, minBlockMinutes: 20 }, ctx);
  if (!r1.ok) throw new Error();
  d = r1.value;
  for (const [name, weight] of [["Português", 5], ["Matemática", 4], ["Inglês", 2]] as const) {
    const r = addSubject(d, { name, weight, difficulty: "medium", sessionMinutes: null }, ctx);
    if (!r.ok) throw new Error();
    d = r.value;
  }
  const f = finishSession(d, { studiedMinutes: 35, notes: "ok" }, ctx);
  if (!f.ok) throw new Error();
  return f.value;
}

describe("Repository — persistência", () => {
  it("primeira execução começa vazia", async () => {
    const repo = new Repository(new MemoryAdapter());
    const r = await repo.load(ctx.now);
    expect(r.source).toBe("new");
    expect(r.data.subjects).toEqual([]);
    expect(r.notices).toEqual([]);
  });

  it("salva e recupera tudo após 'reiniciar' (nova instância)", async () => {
    const adapter = new MemoryAdapter();
    const repo1 = new Repository(adapter);
    const data = startSession(sample(), ctx);
    await repo1.save(data);
    await repo1.flush();

    const repo2 = new Repository(adapter); // simula reabrir o app
    const r = await repo2.load(ctx.now);
    expect(r.source).toBe("main");
    expect(r.data.subjects.map((s) => s.name)).toEqual(["Português", "Matemática", "Inglês"]);
    expect(r.data.settings).toEqual(data.settings);
    expect(r.data.history).toEqual(data.history);
    expect(r.data.cycle.position).toBe(data.cycle.position);
    expect(r.data.cycle.plan).toEqual(data.cycle.plan);
    expect(r.data.activeSession).toEqual(data.activeSession);
  });

  it("agrupa gravações concorrentes e grava o estado mais recente", async () => {
    const adapter = new MemoryAdapter();
    const repo = new Repository(adapter);
    const base = sample();
    const p = [1, 2, 3, 4, 5].map((n) => repo.save({ ...base, settings: { ...base.settings, cycleMinutes: 100 + n * 5 } }));
    await Promise.all(p);
    await repo.flush();
    expect(adapter.saves).toBeLessThanOrEqual(2);
    expect(JSON.parse(adapter.main!).settings.cycleMinutes).toBe(125);
  });

  it("restaura da cópia de segurança quando o arquivo principal está corrompido", async () => {
    const adapter = new MemoryAdapter();
    const repo = new Repository(adapter);
    await repo.save(sample());
    await repo.flush();
    adapter.backup = adapter.main;
    adapter.main = "{ corrompido";
    const r = await new Repository(adapter).load(ctx.now);
    expect(r.source).toBe("backup");
    expect(r.data.subjects).toHaveLength(3);
    expect(adapter.quarantined).toEqual(["{ corrompido"]);
    expect(r.notices.join(" ")).toMatch(/cópia de segurança/);
  });

  it("começa vazio (com aviso) se tudo estiver corrompido", async () => {
    const adapter = new MemoryAdapter();
    adapter.main = "xx";
    adapter.backup = "yy";
    const r = await new Repository(adapter).load(ctx.now);
    expect(r.source).toBe("new");
    expect(r.notices.length).toBeGreaterThan(0);
  });

  it("recusa dados de versão mais nova sem sobrescrever", async () => {
    const adapter = new MemoryAdapter();
    adapter.main = JSON.stringify({ ...sample(), schemaVersion: SCHEMA_VERSION + 1 });
    await expect(new Repository(adapter).load(ctx.now)).rejects.toBeInstanceOf(DataError);
    expect(adapter.quarantined).toHaveLength(0);
  });

  it("pausa sessão que estava rodando quando o app foi fechado", async () => {
    const adapter = new MemoryAdapter();
    const repo = new Repository(adapter);
    const running = startSession(sample(), ctx);
    await repo.save(running);
    await repo.flush();
    const later = new Date(ctx.now.getTime() + 3 * 3600_000);
    const r = await new Repository(adapter).load(later);
    expect(r.recoveredSession).not.toBeNull();
    expect(r.data.activeSession!.status).toBe("paused");
  });

  it("notifica falhas de gravação e tenta novamente na próxima alteração", async () => {
    const adapter = new MemoryAdapter();
    const repo = new Repository(adapter);
    const events: (Error | null)[] = [];
    repo.onSaveStatus((e) => events.push(e));
    adapter.failNextSave = true;
    await repo.save(sample());
    expect(events[0]).toBeInstanceOf(Error);
    await repo.save(sample());
    expect(events[1]).toBeNull();
    expect(adapter.main).not.toBeNull();
  });
});

describe("migrações e normalização", () => {
  it("migra formato v0 (sem schemaVersion)", () => {
    const legacy = { subjects: [{ id: "a", name: "Antiga", weight: 4, difficulty: "hard" }], history: [] };
    const { data, migratedFrom } = parseData(JSON.stringify(legacy), ctx.now);
    expect(migratedFrom).toBe(0);
    expect(data.schemaVersion).toBe(SCHEMA_VERSION);
    expect(data.preferences.theme).toBe("system");
    expect(data.subjects[0]).toMatchObject({ name: "Antiga", weight: 4, difficulty: "hard", sessionMinutes: null });
    expect(data.cycle.plan!.blocks.length).toBeGreaterThan(0);
  });

  it("executa cadeia de migrações registradas em ordem", () => {
    const migrations = {
      1: (r: Record<string, unknown>) => ({ ...r, a: 1, schemaVersion: 2 }),
      2: (r: Record<string, unknown>) => ({ ...r, b: 2, schemaVersion: 3 }),
    };
    const { data } = migrate({ schemaVersion: 1 }, migrations, 3);
    expect(data).toEqual({ schemaVersion: 3, a: 1, b: 2 });
    expect(() => migrate({ schemaVersion: 1 }, {}, 2)).toThrow(DataError);
  });

  it("corrige valores fora dos limites e descarta entradas inválidas", () => {
    const raw = {
      schemaVersion: 1,
      subjects: [
        { id: "a", name: "Ok", weight: 99, difficulty: "???", sessionMinutes: 3, color: "red" },
        { id: "", name: "Sem id" },
        { id: "a", name: "Duplicada" },
        "lixo",
      ],
      settings: { cycleMinutes: -5, sessionMinutes: "x", minBlockMinutes: 1000 },
      history: [{ id: "h", endedAt: "não é data" }, { id: "h2", endedAt: "2026-01-01T00:00:00Z", studiedMinutes: -3 }],
      cycle: { position: 999 },
    };
    const { data } = parseData(JSON.stringify(raw), ctx.now);
    expect(data.subjects).toHaveLength(1);
    expect(data.subjects[0]).toMatchObject({ weight: 5, difficulty: "medium", sessionMinutes: 15 });
    expect(data.subjects[0].color).toMatch(/^#/);
    expect(data.settings.cycleMinutes).toBeGreaterThanOrEqual(30);
    expect(data.settings.minBlockMinutes).toBeLessThanOrEqual(data.settings.sessionMinutes);
    expect(data.history).toHaveLength(1);
    expect(data.history[0].studiedMinutes).toBe(0);
    expect(data.cycle.position).toBeLessThan(data.cycle.plan!.blocks.length);
  });

  it("rejeita JSON inválido", () => {
    expect(() => parseData("not json")).toThrow(DataError);
    expect(() => parseData("[1,2]")).toThrow(DataError);
  });
});

describe("backup — exportar e importar", () => {
  it("ida e volta preserva os dados", () => {
    const data = sample();
    const text = createBackup(data, ctx.now);
    const parsed = parseBackup(text, ctx.now);
    expect(JSON.parse(text)).toMatchObject({ app: "ciclo", kind: "backup", schemaVersion: SCHEMA_VERSION });
    expect(parsed.exportedAt).toBe(ctx.now.toISOString());
    expect(serializeData(parsed.data)).toBe(serializeData(data));
  });

  it("aceita arquivo de dados bruto e rejeita arquivos que não são do Ciclo", () => {
    expect(parseBackup(serializeData(sample())).data.subjects).toHaveLength(3);
    expect(() => parseBackup("{}")).toThrow(DataError);
    expect(() => parseBackup('{"foo": 1}')).toThrow(DataError);
    expect(() => parseBackup("texto")).toThrow(DataError);
  });

  it("importar e persistir substitui os dados atuais", async () => {
    const adapter = new MemoryAdapter();
    const repo = new Repository(adapter);
    await repo.save(createEmptyData(ctx.now));
    const imported = parseBackup(createBackup(sample(), ctx.now)).data;
    await repo.save(imported);
    await repo.flush();
    const r = await new Repository(adapter).load(ctx.now);
    expect(r.data.subjects).toHaveLength(3);
    expect(r.data.history).toHaveLength(1);
  });
});
