import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  apportionMinutes,
  boundedShares,
  computeBounds,
  computePlan,
  explainAllocation,
  splitIntoBlocks,
  type CycleSettings,
  type Difficulty,
  type Subject,
} from "./index";

let seq = 0;
function subj(name: string, weight: number, difficulty: Difficulty, sessionMinutes: number | null = null): Subject {
  seq += 1;
  return {
    id: `s${seq}-${name}`,
    name,
    weight,
    difficulty,
    sessionMinutes,
    color: "#5B8DEF",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const settings = (over: Partial<CycleSettings> = {}): CycleSettings => ({ ...DEFAULT_SETTINGS, ...over });

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function sampleSubjects() {
  return [
    subj("Português", 5, "medium"),
    subj("Constitucional", 4, "hard"),
    subj("Lógica", 3, "hard"),
    subj("Administrativo", 4, "medium"),
    subj("Informática", 2, "easy"),
  ];
}

describe("computePlan — orçamento de tempo", () => {
  it("a soma das alocações e dos blocos é exatamente o tempo do ciclo", () => {
    for (const cycleMinutes of [30, 95, 300, 600, 725, 1200, 3000]) {
      const plan = computePlan(sampleSubjects(), settings({ cycleMinutes }));
      expect(sum(plan.allocations.map((a) => a.minutes))).toBe(cycleMinutes);
      expect(sum(plan.blocks.map((b) => b.minutes))).toBe(cycleMinutes);
    }
  });

  it("respeita o orçamento em muitas combinações aleatórias (determinísticas)", () => {
    let rnd = 42;
    const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
    const diffs: Difficulty[] = ["easy", "medium", "hard"];
    for (let t = 0; t < 300; t++) {
      const n = 1 + Math.floor(rand() * 12);
      const subjects = Array.from({ length: n }, (_, i) =>
        subj(`M${i}`, 1 + Math.floor(rand() * 5), diffs[Math.floor(rand() * 3)], rand() < 0.3 ? 30 + 5 * Math.floor(rand() * 12) : null),
      );
      const cycleMinutes = 5 * (6 + Math.floor(rand() * 400));
      const sessionMinutes = 15 + 5 * Math.floor(rand() * 20);
      const minBlockMinutes = Math.min(sessionMinutes, 10 + 5 * Math.floor(rand() * 5));
      const plan = computePlan(subjects, { cycleMinutes, sessionMinutes, minBlockMinutes });
      expect(sum(plan.blocks.map((b) => b.minutes))).toBe(cycleMinutes);
      expect(sum(plan.allocations.map((a) => a.minutes))).toBe(cycleMinutes);
      expect(plan.blocks.every((b) => b.minutes > 0)).toBe(true);
      plan.blocks.forEach((b, i) => expect(b.index).toBe(i));
    }
  });

  it("lista vazia gera plano vazio sem erros", () => {
    const plan = computePlan([], settings());
    expect(plan.blocks).toEqual([]);
    expect(plan.allocations).toEqual([]);
    expect(plan.warnings).toEqual([]);
  });

  it("uma única disciplina recebe todo o tempo", () => {
    const plan = computePlan([subj("Única", 2, "easy")], settings({ cycleMinutes: 300, sessionMinutes: 50 }));
    expect(plan.allocations[0].minutes).toBe(300);
    expect(plan.allocations[0].share).toBeCloseTo(1);
    expect(plan.blocks).toHaveLength(6);
  });
});

describe("computePlan — pesos e dificuldade", () => {
  it("disciplinas mais importantes recebem mais tempo", () => {
    const a = subj("A", 5, "medium");
    const b = subj("B", 3, "medium");
    const c = subj("C", 1, "medium");
    const plan = computePlan([a, b, c], settings({ cycleMinutes: 600 }));
    const m = Object.fromEntries(plan.allocations.map((x) => [x.subjectId, x.minutes]));
    expect(m[a.id]).toBeGreaterThan(m[b.id]);
    expect(m[b.id]).toBeGreaterThan(m[c.id]);
  });

  it("dificuldade reforça sem excluir as fáceis", () => {
    const hard = subj("Difícil", 3, "hard");
    const med = subj("Média", 3, "medium");
    const easy = subj("Fácil", 3, "easy");
    const plan = computePlan([hard, med, easy], settings({ cycleMinutes: 600 }));
    const m = Object.fromEntries(plan.allocations.map((x) => [x.subjectId, x.minutes]));
    expect(m[hard.id]).toBeGreaterThan(m[med.id]);
    expect(m[med.id]).toBeGreaterThan(m[easy.id]);
    expect(m[easy.id]).toBeGreaterThan(0);
    // Reforço moderado: difícil não chega a 1,6× a fácil com o mesmo peso.
    expect(m[hard.id] / m[easy.id]).toBeLessThan(1.6);
  });

  it("recalcula quando peso, dificuldade ou tempo mudam", () => {
    const subjects = sampleSubjects();
    const base = computePlan(subjects, settings());
    const heavier = computePlan(subjects.map((s, i) => (i === 4 ? { ...s, weight: 5 } : s)), settings());
    const harder = computePlan(subjects.map((s, i) => (i === 4 ? { ...s, difficulty: "hard" as const } : s)), settings());
    const longer = computePlan(subjects, settings({ cycleMinutes: 900 }));
    const info = (p: typeof base) => p.allocations[4].minutes;
    expect(info(heavier)).toBeGreaterThan(info(base));
    expect(info(harder)).toBeGreaterThan(info(base));
    expect(sum(longer.allocations.map((a) => a.minutes))).toBe(900);
    expect(new Set([base.signature, heavier.signature, harder.signature, longer.signature]).size).toBe(4);
  });

  it("é determinístico", () => {
    const subjects = sampleSubjects();
    expect(computePlan(subjects, settings())).toEqual(computePlan(subjects, settings()));
  });

  it("o fator de ajuste futuro é limitado entre 0,5 e 1,5", () => {
    const a = { ...subj("A", 3, "medium"), adjustment: 100 };
    const b = subj("B", 3, "medium");
    const plan = computePlan([a, b, subj("C", 3, "medium")], settings());
    expect(plan.allocations[0].adjustment).toBe(1.5);
    expect(plan.allocations[0].score).toBeCloseTo(4.5);
  });
});

describe("computePlan — equilíbrio (piso e teto)", () => {
  it("nenhuma matéria domina o ciclo nem é negligenciada", () => {
    const subjects = [
      subj("Dominante", 5, "hard"),
      subj("X", 1, "easy"),
      subj("Y", 1, "easy"),
      subj("Z", 1, "easy"),
    ];
    const plan = computePlan(subjects, settings({ cycleMinutes: 600 }));
    const dom = plan.allocations[0];
    expect(dom.clamp).toBe("max");
    expect(dom.minutes).toBeLessThanOrEqual(0.45 * 600 + 5);
    for (const a of plan.allocations.slice(1)) {
      expect(a.minutes).toBeGreaterThanOrEqual(Math.floor(((0.5 * 600) / 4) / 5) * 5);
    }
  });

  it("limites calculados corretamente", () => {
    expect(computeBounds(1, 600, 25)).toMatchObject({ minShare: 1, maxShare: 1 });
    expect(computeBounds(2, 600, 25)).toMatchObject({ minShare: 0.25, maxShare: 0.75 });
    const b4 = computeBounds(4, 600, 25);
    expect(b4.minShare).toBeCloseTo(0.125);
    expect(b4.maxShare).toBeCloseTo(0.45);
    const b10 = computeBounds(10, 600, 25);
    expect(b10.minShare).toBeCloseTo(0.05);
    expect(b10.maxShare).toBeCloseTo(0.25);
    // piso absoluto de um bloco mínimo
    expect(computeBounds(10, 400, 25).minShare).toBeCloseTo(25 / 400);
    expect(computeBounds(10, 200, 25).feasible).toBe(false);
  });

  it("boundedShares soma 1, respeita limites e preserva a ordem", () => {
    const scores = [10, 1, 1, 1, 1, 5];
    const { shares } = boundedShares(scores, 0.1, 0.35);
    expect(sum(shares)).toBeCloseTo(1, 9);
    shares.forEach((s) => {
      expect(s).toBeGreaterThanOrEqual(0.1 - 1e-9);
      expect(s).toBeLessThanOrEqual(0.35 + 1e-9);
    });
    expect(shares[0]).toBeGreaterThanOrEqual(shares[5]);
    expect(shares[5]).toBeGreaterThanOrEqual(shares[1]);
  });

  it("avisa quando o tempo não comporta todas as disciplinas", () => {
    const subjects = Array.from({ length: 8 }, (_, i) => subj(`M${i}`, 3, "medium"));
    const plan = computePlan(subjects, settings({ cycleMinutes: 60, minBlockMinutes: 25, sessionMinutes: 50 }));
    expect(plan.warnings.length).toBeGreaterThan(0);
    expect(sum(plan.blocks.map((b) => b.minutes))).toBe(60);
  });
});

describe("blocos e sequência", () => {
  it("nenhum bloco fica menor que o bloco mínimo quando há tempo suficiente", () => {
    const plan = computePlan(sampleSubjects(), settings({ cycleMinutes: 720, sessionMinutes: 50, minBlockMinutes: 25 }));
    expect(plan.blocks.every((b) => b.minutes >= 25)).toBe(true);
    expect(plan.blocks.every((b) => b.minutes <= 50 * 1.5)).toBe(true);
  });

  it("respeita a duração de sessão personalizada por disciplina", () => {
    const info = subj("Informática", 3, "medium", 30);
    const plan = computePlan([info, subj("Outra", 3, "medium")], settings({ cycleMinutes: 240, sessionMinutes: 60 }));
    const infoBlocks = plan.blocks.filter((b) => b.subjectId === info.id);
    expect(infoBlocks.length).toBe(4);
    expect(infoBlocks.every((b) => b.minutes === 30)).toBe(true);
  });

  it("intercala as matérias, sem repetição consecutiva quando possível", () => {
    const plan = computePlan(sampleSubjects(), settings({ cycleMinutes: 720 }));
    for (let i = 1; i < plan.blocks.length; i++) {
      expect(plan.blocks[i].subjectId).not.toBe(plan.blocks[i - 1].subjectId);
    }
    // E a rotatividade (último → primeiro) também não repete.
    expect(plan.blocks[plan.blocks.length - 1].subjectId).not.toBe(plan.blocks[0].subjectId);
  });

  it("numera as partes de cada disciplina em ordem", () => {
    const plan = computePlan(sampleSubjects(), settings({ cycleMinutes: 720 }));
    const parts = new Map<string, number[]>();
    for (const b of plan.blocks) parts.set(b.subjectId, [...(parts.get(b.subjectId) ?? []), b.part]);
    for (const [id, ps] of parts) {
      const total = plan.allocations.find((a) => a.subjectId === id)!.blocks;
      expect(ps).toEqual(Array.from({ length: total }, (_, i) => i + 1));
    }
  });

  it("splitIntoBlocks evita fragmentos curtos", () => {
    expect(splitIntoBlocks(125, 50, 25)).toEqual([45, 40, 40]);
    expect(splitIntoBlocks(70, 50, 25)).toEqual([70]);
    expect(splitIntoBlocks(40, 50, 25)).toEqual([40]);
    expect(splitIntoBlocks(60, 25, 25)).toEqual([30, 30]);
    expect(splitIntoBlocks(0, 50, 25)).toEqual([]);
  });

  it("apportionMinutes soma o total e garante mínimo", () => {
    const m = apportionMinutes([0.7, 0.2, 0.1], 100, 25);
    expect(sum(m)).toBe(100);
    expect(Math.min(...m)).toBeGreaterThanOrEqual(25);
    expect(sum(apportionMinutes([0.5, 0.5], 103, 0))).toBe(103);
  });
});

describe("explicações", () => {
  it("gera justificativa legível com pontuação e resultado", () => {
    const subjects = [subj("Dominante", 5, "hard"), subj("X", 1, "easy"), subj("Y", 1, "easy"), subj("Z", 1, "easy")];
    const plan = computePlan(subjects, settings({ cycleMinutes: 600 }));
    const lines = explainAllocation(plan.allocations[0], plan);
    expect(lines[0]).toContain("Peso 5");
    expect(lines[0]).toContain("difícil");
    expect(lines.join(" ")).toContain("teto");
    expect(lines[lines.length - 1]).toContain("Resultado");
  });
});
