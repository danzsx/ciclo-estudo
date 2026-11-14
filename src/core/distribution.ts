/**
 * Algoritmo de distribuição do ciclo de estudos.
 *
 * Etapas (todas determinísticas — mesmas entradas sempre geram o mesmo plano):
 *
 * 1. Pontuação: score = peso × fator de dificuldade × ajuste
 *    - fatores de dificuldade: fácil 0,85 · média 1,00 · difícil 1,25
 *      (reforço moderado: a dificuldade é uma percepção subjetiva, não verdade absoluta)
 *    - ajuste: reservado para futuros dados de desempenho (padrão 1, limitado a 0,5–1,5)
 *
 * 2. Normalização: fatia bruta = score / soma dos scores.
 *
 * 3. Limites de equilíbrio (sobre a fatia igualitária 1/n):
 *    - piso: nenhuma matéria recebe menos que 50% da fatia igualitária, nem menos que
 *      um bloco mínimo de tempo;
 *    - teto: nenhuma matéria recebe mais que 2,5× a fatia igualitária nem mais que 45%
 *      do ciclo (com 2 matérias, o teto é 75%).
 *    A fatia final é share_i = clamp(λ · score_i, piso, teto), com λ encontrado por
 *    bisseção para que a soma seja exatamente 100%. Isso preserva a ordem (quem tem
 *    score maior nunca recebe menos) e redistribui o excedente proporcionalmente.
 *
 * 4. Minutos: as fatias são convertidas em unidades de 5 minutos pelo método dos
 *    maiores restos, garantindo que a soma seja exatamente o tempo do ciclo.
 *
 * 5. Blocos: o tempo de cada matéria é dividido em sessões próximas da duração
 *    preferida, nunca menores que o bloco mínimo.
 *
 * 6. Sequência: os blocos são intercalados pela posição ideal (j + 0,5) / k de cada
 *    matéria, espalhando-os uniformemente e evitando repetições consecutivas.
 */
import { DIFFICULTY_FACTORS, LIMITS } from "./defaults";
import type { CycleBlock, CyclePlan, CycleSettings, Subject, SubjectAllocation } from "./types";

const EPS = 1e-9;

export interface ShareBounds {
  minShare: number;
  maxShare: number;
  feasible: boolean;
}

export function clampAdjustment(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 1;
  return Math.min(LIMITS.adjustmentMax, Math.max(LIMITS.adjustmentMin, value));
}

export function subjectScore(subject: Pick<Subject, "weight" | "difficulty" | "adjustment">): number {
  const weight = Math.min(LIMITS.weightMax, Math.max(LIMITS.weightMin, subject.weight));
  return weight * DIFFICULTY_FACTORS[subject.difficulty] * clampAdjustment(subject.adjustment);
}

/** Calcula piso e teto da fatia de cada matéria. */
export function computeBounds(n: number, cycleMinutes: number, minBlockMinutes: number): ShareBounds {
  if (n <= 0) return { minShare: 0, maxShare: 1, feasible: true };
  if (n === 1) return { minShare: 1, maxShare: 1, feasible: true };
  const equal = 1 / n;
  let minShare = 0.5 * equal;
  const maxShare = n === 2 ? 0.75 : Math.max(equal, Math.min(0.45, 2.5 * equal));
  const absoluteMin = cycleMinutes > 0 ? minBlockMinutes / cycleMinutes : 1;
  let feasible = true;
  if (absoluteMin * n > 1 + EPS) {
    // Não há tempo para um bloco mínimo de cada matéria: divide igualmente.
    feasible = false;
    minShare = equal;
  } else {
    minShare = Math.max(minShare, absoluteMin);
  }
  return { minShare, maxShare: Math.max(maxShare, minShare), feasible };
}

/**
 * Encontra fatias share_i = clamp(λ·score_i, min, max) que somam 1.
 * Retorna também qual limite foi aplicado a cada matéria.
 */
export function boundedShares(
  scores: number[],
  minShare: number,
  maxShare: number,
): { shares: number[]; clamps: ("min" | "max" | null)[] } {
  const n = scores.length;
  if (n === 0) return { shares: [], clamps: [] };
  const total = scores.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    return { shares: scores.map(() => 1 / n), clamps: scores.map(() => null) };
  }
  const sumFor = (lambda: number) =>
    scores.reduce((acc, s) => acc + Math.min(maxShare, Math.max(minShare, lambda * s)), 0);

  let lo = 0;
  let hi = 1 / Math.min(...scores.filter((s) => s > 0));
  while (sumFor(hi) < 1 - EPS && hi < 1e12) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (sumFor(mid) < 1) lo = mid;
    else hi = mid;
  }
  const lambda = (lo + hi) / 2;
  const clamps: ("min" | "max" | null)[] = [];
  const shares = scores.map((s) => {
    const v = lambda * s;
    if (v < minShare - 1e-7) {
      clamps.push("min");
      return minShare;
    }
    if (v > maxShare + 1e-7) {
      clamps.push("max");
      return maxShare;
    }
    clamps.push(null);
    return v;
  });
  // Correção numérica final para soma exata.
  const sum = shares.reduce((a, b) => a + b, 0);
  return { shares: shares.map((s) => s / sum), clamps };
}

/**
 * Converte fatias em minutos (múltiplos da granularidade) somando exatamente `totalMinutes`.
 * Usa o método dos maiores restos; garante, quando possível, `minUnits` por matéria.
 */
export function apportionMinutes(
  shares: number[],
  totalMinutes: number,
  minMinutes: number,
  tieBreak: number[] = shares,
  granularity: number = LIMITS.granularity,
): number[] {
  const n = shares.length;
  if (n === 0) return [];
  const units = Math.floor(totalMinutes / granularity);
  const extra = totalMinutes - units * granularity;
  const ideal = shares.map((s) => s * units);
  const alloc = ideal.map((x) => Math.floor(x + EPS));
  let remaining = units - alloc.reduce((a, b) => a + b, 0);
  const order = ideal
    .map((x, i) => ({ i, frac: x - Math.floor(x + EPS), tie: tieBreak[i] }))
    .sort((a, b) => b.frac - a.frac || b.tie - a.tie || a.i - b.i);
  for (let k = 0; remaining > 0; k = (k + 1) % n) {
    alloc[order[k].i] += 1;
    remaining -= 1;
  }
  // Garante o mínimo de unidades por matéria, retirando de quem tem mais folga.
  const minUnits = Math.ceil(minMinutes / granularity - EPS);
  if (minUnits * n <= units) {
    for (let i = 0; i < n; i++) {
      while (alloc[i] < minUnits) {
        let donor = -1;
        for (let j = 0; j < n; j++) {
          if (alloc[j] > minUnits && (donor === -1 || alloc[j] > alloc[donor])) donor = j;
        }
        if (donor === -1) break;
        alloc[donor] -= 1;
        alloc[i] += 1;
      }
    }
  }
  const minutes = alloc.map((u) => u * granularity);
  if (extra > 0) {
    let largest = 0;
    for (let i = 1; i < n; i++) if (minutes[i] > minutes[largest]) largest = i;
    minutes[largest] += extra;
  }
  return minutes;
}

/** Divide os minutos de uma matéria em blocos próximos da duração preferida. */
export function splitIntoBlocks(
  minutes: number,
  preferredSession: number,
  minBlock: number,
  granularity: number = LIMITS.granularity,
): number[] {
  if (minutes <= 0) return [];
  let k = Math.max(1, Math.round(minutes / Math.max(1, preferredSession)));
  while (k > 1 && minutes / k < minBlock) k--;
  const units = Math.floor(minutes / granularity);
  const extra = minutes - units * granularity;
  if (units < k) k = Math.max(1, units);
  const base = Math.floor(units / k);
  const rem = units % k;
  const blocks: number[] = [];
  for (let j = 0; j < k; j++) blocks.push((base + (j < rem ? 1 : 0)) * granularity);
  blocks[0] += extra;
  return blocks;
}

interface PendingBlock {
  subjectId: string;
  subjectOrder: number;
  score: number;
  minutes: number;
  part: number;
  parts: number;
  key: number;
}

/** Intercala os blocos uniformemente e evita a mesma matéria duas vezes seguidas. */
export function interleave(blocks: PendingBlock[]): PendingBlock[] {
  const seq = [...blocks].sort(
    (a, b) => a.key - b.key || b.score - a.score || a.subjectOrder - b.subjectOrder || a.part - b.part,
  );
  for (let p = 1; p < seq.length; p++) {
    if (seq[p].subjectId !== seq[p - 1].subjectId) continue;
    let q = p + 1;
    while (q < seq.length && seq[q].subjectId === seq[p - 1].subjectId) q++;
    if (q < seq.length) {
      const [moved] = seq.splice(q, 1);
      seq.splice(p, 0, moved);
    }
  }
  // Rotatividade: evita que o último bloco seja da mesma matéria que o primeiro.
  const last = seq.length - 1;
  if (seq.length > 2 && seq[last].subjectId === seq[0].subjectId) {
    for (let p = 1; p < last; p++) {
      const block = seq[last];
      if (seq[p - 1].subjectId !== block.subjectId && seq[p].subjectId !== block.subjectId) {
        // Só move se não criar repetição entre os novos vizinhos do fim.
        if (seq[last - 1].subjectId !== seq[0].subjectId) {
          seq.splice(last, 1);
          seq.splice(p, 0, block);
        }
        break;
      }
    }
  }
  // Renumera as partes conforme a nova ordem.
  const counters = new Map<string, number>();
  for (const b of seq) {
    const c = (counters.get(b.subjectId) ?? 0) + 1;
    counters.set(b.subjectId, c);
    b.part = c;
  }
  return seq;
}

function hashString(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function planSignature(subjects: Subject[], settings: CycleSettings): string {
  const parts = subjects.map(
    (s) => `${s.id}:${s.weight}:${s.difficulty}:${s.sessionMinutes ?? "-"}:${clampAdjustment(s.adjustment)}`,
  );
  return hashString(
    `${settings.cycleMinutes}|${settings.sessionMinutes}|${settings.minBlockMinutes}|${parts.join(",")}`,
  );
}

/** Calcula o plano completo do ciclo. Função pura. */
export function computePlan(subjects: Subject[], settings: CycleSettings): CyclePlan {
  const signature = planSignature(subjects, settings);
  const totalMinutes = Math.max(0, Math.round(settings.cycleMinutes));
  const warnings: string[] = [];
  const n = subjects.length;
  if (n === 0 || totalMinutes <= 0) {
    return { totalMinutes, blocks: [], allocations: [], minShare: 0, maxShare: 1, warnings, signature };
  }

  const scores = subjects.map(subjectScore);
  const scoreSum = scores.reduce((a, b) => a + b, 0);
  const { minShare, maxShare, feasible } = computeBounds(n, totalMinutes, settings.minBlockMinutes);
  if (!feasible) {
    warnings.push(
      `O tempo do ciclo (${totalMinutes} min) não comporta um bloco mínimo de ${settings.minBlockMinutes} min ` +
        `para cada uma das ${n} disciplinas. O tempo foi dividido igualmente — considere aumentar o tempo do ciclo ` +
        `ou reduzir o bloco mínimo.`,
    );
  }
  const { shares, clamps } = boundedShares(scores, minShare, maxShare);
  const minutes = apportionMinutes(shares, totalMinutes, feasible ? settings.minBlockMinutes : 0, scores);

  const allocations: SubjectAllocation[] = [];
  const pending: PendingBlock[] = [];
  subjects.forEach((s, i) => {
    const session = s.sessionMinutes ?? settings.sessionMinutes;
    const parts = splitIntoBlocks(minutes[i], session, feasible ? settings.minBlockMinutes : 0);
    allocations.push({
      subjectId: s.id,
      weight: s.weight,
      difficulty: s.difficulty,
      difficultyFactor: DIFFICULTY_FACTORS[s.difficulty],
      adjustment: clampAdjustment(s.adjustment),
      score: scores[i],
      rawShare: scores[i] / scoreSum,
      share: shares[i],
      clamp: clamps[i],
      minutes: minutes[i],
      blocks: parts.length,
      sessionMinutes: session,
    });
    if (minutes[i] === 0) {
      warnings.push(`"${s.name}" ficou sem tempo neste ciclo por falta de tempo disponível.`);
    }
    parts.forEach((m, j) =>
      pending.push({
        subjectId: s.id,
        subjectOrder: i,
        score: scores[i],
        minutes: m,
        part: j + 1,
        parts: parts.length,
        key: (j + 0.5) / parts.length,
      }),
    );
  });

  const blocks: CycleBlock[] = interleave(pending).map((b, index) => ({
    index,
    subjectId: b.subjectId,
    minutes: b.minutes,
    part: b.part,
    parts: b.parts,
  }));

  return { totalMinutes, blocks, allocations, minShare, maxShare, warnings, signature };
}
