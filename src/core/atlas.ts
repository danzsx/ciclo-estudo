/**
 * Sistema ATLAS — Arquivo de Conquistas e Coleção de Cartas.
 *
 * Módulo puro de domínio (sem dependências de React, DOM ou plataforma).
 * Avalia conquistas de forma determinística a partir dos dados reais do usuário,
 * preservando datas de aquisição e mantendo coerência quando sessões são
 * concluídas, editadas ou excluídas.
 */
import { localDateKey } from "./stats";
import type {
  AchievementCategory,
  AchievementRarity,
  AppData,
  AtlasState,
  SessionRecord,
  UnlockedAchievement,
} from "./types";

export interface RarityMeta {
  id: AchievementRarity;
  label: string;
  rank: number;
}

export const RARITY_META: Record<AchievementRarity, RarityMeta> = {
  common: { id: "common", label: "Comum", rank: 1 },
  uncommon: { id: "uncommon", label: "Incomum", rank: 2 },
  rare: { id: "rare", label: "Raro", rank: 3 },
  epic: { id: "epic", label: "Épico", rank: 4 },
  legendary: { id: "legendary", label: "Lendário", rank: 5 },
};

export interface CategoryMeta {
  id: AchievementCategory;
  label: string;
  subtitle: string;
  order: number;
}

export const CATEGORY_META: Record<AchievementCategory, CategoryMeta> = {
  constancy: {
    id: "constancy",
    label: "Constância",
    subtitle: "Presença contínua e disciplina diária ao longo do calendário local.",
    order: 1,
  },
  dedication: {
    id: "dedication",
    label: "Dedicação",
    subtitle: "Volume real de horas acumuladas em sessões efetivas de estudo.",
    order: 2,
  },
  cycles: {
    id: "cycles",
    label: "Ciclos",
    subtitle: "Ciclos completos percorridos do primeiro ao último bloco.",
    order: 3,
  },
  special: {
    id: "special",
    label: "Especiais",
    subtitle: "Marcos qualitativos de equilíbrio, profundidade e integridade.",
    order: 4,
  },
};

export interface EvaluationResult {
  met: boolean;
  /** Data real em que a condição foi atingida (usada no reconhecimento retroativo). */
  unlockedAt?: string;
}

export interface AtlasMetrics {
  validSessionsAsc: SessionRecord[];
  studiedDaysCount: number;
  firstStudyAt: string | null;
  maxStreak: number;
  /** Mapa de comprimento de sequência -> timestamp ISO da primeira vez que foi atingido. */
  streakMilestones: Map<number, string>;
  totalMinutes: number;
  /** Lista paralela a `validSessionsAsc` com o acumulado de minutos até cada sessão. */
  cumulativeMinutes: Array<{ endedAt: string; totalMinutes: number }>;
  completedCycles: number;
  /** Último timestamp válido de cada ciclo presente no histórico. */
  cycleLastEndedAt: Map<number, string>;
}

export interface AchievementDefinition {
  id: string;
  number: number;
  collectionId: string;
  collectionName: string;
  name: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  description: string;
  conditionText: string;
  /** Referência para ilustração exclusiva (pronta para assets futuros). */
  illustration: string;
  evaluate: (metrics: AtlasMetrics, data: AppData) => EvaluationResult;
}

/** Soma 1 dia civil local sem sofrer desvios de horário de verão (DST). */
function nextLocalDayKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  return localDateKey(dt);
}

/** Calcula métricas determinísticas a partir do histórico e do estado do ciclo. */
export function computeAtlasMetrics(data: AppData): AtlasMetrics {
  const validSessionsAsc = data.history
    .filter((h) => h.studiedMinutes > 0 && !Number.isNaN(Date.parse(h.endedAt)))
    .slice()
    .sort((a, b) => a.endedAt.localeCompare(b.endedAt));

  const dayFirstSession = new Map<string, string>();
  const cumulativeMinutes: Array<{ endedAt: string; totalMinutes: number }> = [];
  const cycleLastEndedAt = new Map<number, string>();

  let runningMinutes = 0;
  for (const s of validSessionsAsc) {
    const dayKey = localDateKey(new Date(s.endedAt));
    if (!dayFirstSession.has(dayKey)) {
      dayFirstSession.set(dayKey, s.endedAt);
    }
    runningMinutes += s.studiedMinutes;
    cumulativeMinutes.push({ endedAt: s.endedAt, totalMinutes: runningMinutes });

    const prevCycleEnd = cycleLastEndedAt.get(s.cycleNumber);
    if (!prevCycleEnd || s.endedAt > prevCycleEnd) {
      cycleLastEndedAt.set(s.cycleNumber, s.endedAt);
    }
  }

  const sortedDays = [...dayFirstSession.keys()].sort();
  const streakMilestones = new Map<number, string>();
  let maxStreak = 0;
  let currentRun = 0;
  let prevDay: string | null = null;

  for (const day of sortedDays) {
    if (prevDay && nextLocalDayKey(prevDay) === day) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }
    prevDay = day;
    if (currentRun > maxStreak) {
      maxStreak = currentRun;
    }
    if (!streakMilestones.has(currentRun)) {
      streakMilestones.set(currentRun, dayFirstSession.get(day)!);
    }
  }

  return {
    validSessionsAsc,
    studiedDaysCount: sortedDays.length,
    firstStudyAt: validSessionsAsc[0]?.endedAt ?? null,
    maxStreak,
    streakMilestones,
    totalMinutes: runningMinutes,
    cumulativeMinutes,
    completedCycles: data.cycle.completedCycles,
    cycleLastEndedAt,
  };
}

function streakRule(days: number): AchievementDefinition["evaluate"] {
  return (metrics) => {
    if (days <= 1) {
      return metrics.studiedDaysCount >= 1
        ? { met: true, unlockedAt: metrics.firstStudyAt ?? undefined }
        : { met: false };
    }
    if (metrics.maxStreak < days) return { met: false };
    return { met: true, unlockedAt: metrics.streakMilestones.get(days) };
  };
}

function dedicationRule(hours: number): AchievementDefinition["evaluate"] {
  const targetMinutes = hours * 60;
  return (metrics) => {
    if (metrics.totalMinutes < targetMinutes) return { met: false };
    const hit = metrics.cumulativeMinutes.find((entry) => entry.totalMinutes >= targetMinutes);
    return { met: true, unlockedAt: hit?.endedAt };
  };
}

function cyclesRule(count: number): AchievementDefinition["evaluate"] {
  return (metrics) => {
    if (metrics.completedCycles < count) return { met: false };
    return { met: true, unlockedAt: metrics.cycleLastEndedAt.get(count) };
  };
}

const DEFAULT_COLLECTION_ID = "atlas-core";
const DEFAULT_COLLECTION_NAME = "Arquivo Fundamental";

/** Catálogo oficial da Fase 1 do ATLAS (extensível para novas cartas e coleções). */
export const ATLAS_CATALOG: readonly AchievementDefinition[] = [
  // ---------------------------------------------------------------- Constância
  {
    id: "constancy-1d",
    number: 1,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "A Primeira Chama",
    category: "constancy",
    rarity: "common",
    description: "Todo grande percurso começa no instante em que você decide abrir o primeiro caderno.",
    conditionText: "Registrar o primeiro dia com estudo efetivo.",
    illustration: "atlas/constancy-01",
    evaluate: streakRule(1),
  },
  {
    id: "constancy-3d",
    number: 2,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Ritmo Inicial",
    category: "constancy",
    rarity: "common",
    description: "Três dias seguidos transformam um impulso passageiro em intenção deliberada.",
    conditionText: "Estudar por 3 dias consecutivos.",
    illustration: "atlas/constancy-02",
    evaluate: streakRule(3),
  },
  {
    id: "constancy-7d",
    number: 3,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "A Semana Ininterrupta",
    category: "constancy",
    rarity: "uncommon",
    description: "Um ciclo semanal completo sem quebrar a cadência — o hábito começa a criar raízes.",
    conditionText: "Estudar por 7 dias consecutivos.",
    illustration: "atlas/constancy-03",
    evaluate: streakRule(7),
  },
  {
    id: "constancy-15d",
    number: 4,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "A Constância",
    category: "constancy",
    rarity: "rare",
    description: "Quinze amanheceres de disciplina sustentada, mesmo quando o entusiasmo oscila.",
    conditionText: "Estudar por 15 dias consecutivos.",
    illustration: "atlas/constancy-04",
    evaluate: streakRule(15),
  },
  {
    id: "constancy-30d",
    number: 5,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Guardião do Hábito",
    category: "constancy",
    rarity: "epic",
    description: "Um mês inteiro de presença diária. A rotina deixou de ser esforço e tornou-se identidade.",
    conditionText: "Estudar por 30 dias consecutivos.",
    illustration: "atlas/constancy-05",
    evaluate: streakRule(30),
  },
  {
    id: "constancy-60d",
    number: 6,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "A Disciplina Férrea",
    category: "constancy",
    rarity: "epic",
    description: "Sessenta dias contínuos de ofício silencioso — poucos chegam até aqui sem vacilar.",
    conditionText: "Estudar por 60 dias consecutivos.",
    illustration: "atlas/constancy-06",
    evaluate: streakRule(60),
  },
  {
    id: "constancy-100d",
    number: 7,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Centurião do Tempo",
    category: "constancy",
    rarity: "legendary",
    description: "Cem dias ininterruptos de dedicação acadêmica. Um monumento vivo de perseverança.",
    conditionText: "Estudar por 100 dias consecutivos.",
    illustration: "atlas/constancy-07",
    evaluate: streakRule(100),
  },

  // ---------------------------------------------------------------- Dedicação
  {
    id: "dedication-1h",
    number: 8,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "A Primeira Hora",
    category: "dedication",
    rarity: "common",
    description: "Sessenta minutos de atenção plena registrados no seu arquivo pessoal.",
    conditionText: "Acumular 1 hora (60 min) de estudo efetivo.",
    illustration: "atlas/dedication-01",
    evaluate: dedicationRule(1),
  },
  {
    id: "dedication-5h",
    number: 9,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Aprendiz Atento",
    category: "dedication",
    rarity: "common",
    description: "Cinco horas investidas na construção silenciosa do domínio.",
    conditionText: "Acumular 5 horas de estudo efetivo.",
    illustration: "atlas/dedication-02",
    evaluate: dedicationRule(5),
  },
  {
    id: "dedication-10h",
    number: 10,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Artífice do Tempo",
    category: "dedication",
    rarity: "uncommon",
    description: "Dez horas lapidadas bloco a bloco, com método e clareza.",
    conditionText: "Acumular 10 horas de estudo efetivo.",
    illustration: "atlas/dedication-03",
    evaluate: dedicationRule(10),
  },
  {
    id: "dedication-25h",
    number: 11,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Ofício Contínuo",
    category: "dedication",
    rarity: "uncommon",
    description: "Vinte e cinco horas acumuladas — a base sólida de um repertório consistente.",
    conditionText: "Acumular 25 horas de estudo efetivo.",
    illustration: "atlas/dedication-04",
    evaluate: dedicationRule(25),
  },
  {
    id: "dedication-50h",
    number: 12,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Erudito",
    category: "dedication",
    rarity: "rare",
    description: "Cinquenta horas de imersão intelectual. O conhecimento começa a dialogar entre si.",
    conditionText: "Acumular 50 horas de estudo efetivo.",
    illustration: "atlas/dedication-05",
    evaluate: dedicationRule(50),
  },
  {
    id: "dedication-100h",
    number: 13,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Mestre de Ofício",
    category: "dedication",
    rarity: "epic",
    description: "Cem horas de estudo real documentadas. Um marco de maturidade acadêmica.",
    conditionText: "Acumular 100 horas de estudo efetivo.",
    illustration: "atlas/dedication-06",
    evaluate: dedicationRule(100),
  },
  {
    id: "dedication-200h",
    number: 14,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Arquivista Maior",
    category: "dedication",
    rarity: "epic",
    description: "Duzentas horas de rigor e profundidade. Poucos registram tamanha entrega.",
    conditionText: "Acumular 200 horas de estudo efetivo.",
    illustration: "atlas/dedication-07",
    evaluate: dedicationRule(200),
  },
  {
    id: "dedication-500h",
    number: 15,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "A Grande Obra",
    category: "dedication",
    rarity: "legendary",
    description: "Quinhentas horas de estudo acumulado — a culminação de uma jornada extraordinária.",
    conditionText: "Acumular 500 horas de estudo efetivo.",
    illustration: "atlas/dedication-08",
    evaluate: dedicationRule(500),
  },

  // ---------------------------------------------------------------- Ciclos
  {
    id: "cycles-1",
    number: 16,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Cartógrafo",
    category: "cycles",
    rarity: "uncommon",
    description: "Você percorreu todo o mapa do seu primeiro ciclo do início ao fim.",
    conditionText: "Concluir o primeiro ciclo de estudos.",
    illustration: "atlas/cycles-01",
    evaluate: cyclesRule(1),
  },
  {
    id: "cycles-3",
    number: 17,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "A Órbita Estável",
    category: "cycles",
    rarity: "uncommon",
    description: "Três rotações completas confirmam que seu planejamento funciona na prática.",
    conditionText: "Concluir 3 ciclos de estudos.",
    illustration: "atlas/cycles-02",
    evaluate: cyclesRule(3),
  },
  {
    id: "cycles-5",
    number: 18,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Navegador",
    category: "cycles",
    rarity: "rare",
    description: "Cinco ciclos encerrados com regularidade e equilíbrio entre as disciplinas.",
    conditionText: "Concluir 5 ciclos de estudos.",
    illustration: "atlas/cycles-03",
    evaluate: cyclesRule(5),
  },
  {
    id: "cycles-10",
    number: 19,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Arquiteto de Ciclos",
    category: "cycles",
    rarity: "epic",
    description: "Dez ciclos completos demonstram domínio absoluto da sua própria cadência.",
    conditionText: "Concluir 10 ciclos de estudos.",
    illustration: "atlas/cycles-04",
    evaluate: cyclesRule(10),
  },
  {
    id: "cycles-25",
    number: 20,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Cronista",
    category: "cycles",
    rarity: "epic",
    description: "Vinte e cinco ciclos registrados — uma crônica exemplar de método e constância.",
    conditionText: "Concluir 25 ciclos de estudos.",
    illustration: "atlas/cycles-05",
    evaluate: cyclesRule(25),
  },
  {
    id: "cycles-50",
    number: 21,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Soberano do Método",
    category: "cycles",
    rarity: "legendary",
    description: "Cinquenta ciclos completos. O método tornou-se sua segunda natureza.",
    conditionText: "Concluir 50 ciclos de estudos.",
    illustration: "atlas/cycles-06",
    evaluate: cyclesRule(50),
  },

  // ---------------------------------------------------------------- Especiais
  {
    id: "special-all-subjects-cycle",
    number: 22,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Polímata",
    category: "special",
    rarity: "rare",
    description: "Nenhuma área foi deixada para trás: todas as disciplinas do ciclo receberam atenção.",
    conditionText: "Estudar todas as disciplinas do plano em um mesmo ciclo (mínimo de 2 disciplinas).",
    illustration: "atlas/special-01",
    evaluate: (metrics, data) => {
      const plannedSubjects = data.cycle.plan?.allocations.map((a) => a.subjectId) ?? [];
      if (plannedSubjects.length < 2) return { met: false };
      const byCycle = new Map<number, Map<string, string>>();
      for (const s of metrics.validSessionsAsc) {
        let subjectsMap = byCycle.get(s.cycleNumber);
        if (!subjectsMap) {
          subjectsMap = new Map<string, string>();
          byCycle.set(s.cycleNumber, subjectsMap);
        }
        if (!subjectsMap.has(s.subjectId)) {
          subjectsMap.set(s.subjectId, s.endedAt);
        }
      }
      let earliestComplete: string | undefined;
      for (const subjectsMap of byCycle.values()) {
        if (plannedSubjects.every((id) => subjectsMap.has(id))) {
          const completedAt = plannedSubjects
            .map((id) => subjectsMap.get(id)!)
            .sort()
            .pop();
          if (completedAt && (!earliestComplete || completedAt < earliestComplete)) {
            earliestComplete = completedAt;
          }
        }
      }
      return earliestComplete ? { met: true, unlockedAt: earliestComplete } : { met: false };
    },
  },
  {
    id: "special-subject-10-sessions",
    number: 23,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "A Imersão",
    category: "special",
    rarity: "uncommon",
    description: "Dez retornos dedicados à mesma matéria revelam aprofundamento real.",
    conditionText: "Concluir 10 sessões válidas em uma mesma disciplina.",
    illustration: "atlas/special-02",
    evaluate: (metrics) => {
      const counts = new Map<string, number>();
      for (const s of metrics.validSessionsAsc) {
        if (s.status === "skipped") continue;
        const next = (counts.get(s.subjectId) ?? 0) + 1;
        counts.set(s.subjectId, next);
        if (next >= 10) {
          return { met: true, unlockedAt: s.endedAt };
        }
      }
      return { met: false };
    },
  },
  {
    id: "special-subject-10h",
    number: 24,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Especialista",
    category: "special",
    rarity: "rare",
    description: "Dez horas concentradas em um só domínio constroem segurança e fluência.",
    conditionText: "Acumular 10 horas de estudo efetivo em uma mesma disciplina.",
    illustration: "atlas/special-03",
    evaluate: (metrics) => {
      const minutesBySubject = new Map<string, number>();
      for (const s of metrics.validSessionsAsc) {
        const next = (minutesBySubject.get(s.subjectId) ?? 0) + s.studiedMinutes;
        minutesBySubject.set(s.subjectId, next);
        if (next >= 600) {
          return { met: true, unlockedAt: s.endedAt };
        }
      }
      return { met: false };
    },
  },
  {
    id: "special-perfect-cycle",
    number: 25,
    collectionId: DEFAULT_COLLECTION_ID,
    collectionName: DEFAULT_COLLECTION_NAME,
    name: "O Ciclo Íntegro",
    category: "special",
    rarity: "epic",
    description: "Um ciclo inteiro fechado sem desvios nem omissões — precisão editorial pura.",
    conditionText: "Concluir um ciclo com todas as sessões cumpridas integralmente (sem pulos ou parciais).",
    illustration: "atlas/special-04",
    evaluate: (_metrics, data) => {
      if (data.cycle.completedCycles < 1) return { met: false };
      const byCycle = new Map<number, SessionRecord[]>();
      for (const h of data.history) {
        if (h.cycleNumber >= data.cycle.cycleNumber) continue;
        const list = byCycle.get(h.cycleNumber) ?? [];
        list.push(h);
        byCycle.set(h.cycleNumber, list);
      }
      const cycleNumbers = [...byCycle.keys()].sort((a, b) => a - b);
      for (const c of cycleNumbers) {
        const sessions = byCycle.get(c)!;
        if (sessions.length === 0) continue;
        const allCompleted = sessions.every((s) => s.status === "completed" && s.studiedMinutes > 0);
        if (allCompleted) {
          const latest = sessions.map((s) => s.endedAt).sort().pop();
          return { met: true, unlockedAt: latest };
        }
      }
      return { met: false };
    },
  },
];

export function formatCardNumber(num: number): string {
  return `#${String(num).padStart(3, "0")}`;
}

export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ATLAS_CATALOG.find((a) => a.id === id);
}

/**
 * Reconcilia o estado do ATLAS com os dados reais da aplicação.
 * - Desbloqueia novas conquistas atingidas (sem duplicar).
 * - Preserva a data de aquisição original de conquistas já desbloqueadas.
 * - Revoga conquistas cuja condição deixou de ser verdadeira (ex.: edição/exclusão de sessão).
 * - Executa o reconhecimento retroativo automático se houver histórico prévio.
 */
export function reconcileAtlas(
  data: AppData,
  now: Date = new Date(),
  catalog: readonly AchievementDefinition[] = ATLAS_CATALOG,
): AppData {
  const existingById = new Map<string, UnlockedAchievement>();
  for (const item of data.atlas?.unlocked ?? []) {
    if (!existingById.has(item.id)) {
      existingById.set(item.id, item);
    }
  }

  const metrics = computeAtlasMetrics(data);
  const nowIso = now.toISOString();
  const nextUnlocked: UnlockedAchievement[] = [];

  for (const def of catalog) {
    const res = def.evaluate(metrics, data);
    if (!res.met) continue;
    const existing = existingById.get(def.id);
    if (existing) {
      nextUnlocked.push(existing);
    } else {
      nextUnlocked.push({
        id: def.id,
        unlockedAt: res.unlockedAt ?? nowIso,
        collectionId: def.collectionId,
      });
    }
  }

  const prevUnlocked = data.atlas?.unlocked ?? [];
  const prevChecked = data.atlas?.retroactiveCheckedAt ?? null;
  const sameUnlocked =
    prevUnlocked.length === nextUnlocked.length &&
    prevUnlocked.every(
      (u, idx) =>
        u.id === nextUnlocked[idx].id &&
        u.unlockedAt === nextUnlocked[idx].unlockedAt &&
        u.collectionId === nextUnlocked[idx].collectionId,
    );

  if (sameUnlocked && prevChecked !== null) {
    return data;
  }

  const atlas: AtlasState = {
    unlocked: nextUnlocked,
    retroactiveCheckedAt: prevChecked ?? nowIso,
  };

  return { ...data, atlas };
}

/** Retorna as definições recém-desbloqueadas entre dois estados do aplicativo. */
export function diffUnlockedAchievements(
  prev: AppData,
  next: AppData,
  catalog: readonly AchievementDefinition[] = ATLAS_CATALOG,
): AchievementDefinition[] {
  const prevIds = new Set((prev.atlas?.unlocked ?? []).map((u) => u.id));
  const newlyUnlockedIds = new Set(
    (next.atlas?.unlocked ?? []).filter((u) => !prevIds.has(u.id)).map((u) => u.id),
  );
  if (newlyUnlockedIds.size === 0) return [];
  return catalog.filter((def) => newlyUnlockedIds.has(def.id));
}

export type AtlasStatusFilter = "all" | "unlocked" | "locked";
export type AtlasSortBy = "id" | "date" | "rarity";

export interface AtlasQueryOptions {
  category?: AchievementCategory | "all";
  rarity?: AchievementRarity | "all";
  status?: AtlasStatusFilter;
  sortBy?: AtlasSortBy;
  search?: string;
}

export interface AtlasCardEntry {
  definition: AchievementDefinition;
  unlocked?: UnlockedAchievement;
}

/** Filtra e ordena as cartas do catálogo ATLAS para a seção Coleção. */
export function queryAtlasCards(
  unlockedList: readonly UnlockedAchievement[],
  options: AtlasQueryOptions = {},
  catalog: readonly AchievementDefinition[] = ATLAS_CATALOG,
): AtlasCardEntry[] {
  const unlockedMap = new Map(unlockedList.map((u) => [u.id, u]));
  const category = options.category ?? "all";
  const rarity = options.rarity ?? "all";
  const status = options.status ?? "all";
  const sortBy = options.sortBy ?? "id";
  const q = (options.search ?? "").trim().toLocaleLowerCase("pt-BR");

  const entries: AtlasCardEntry[] = [];
  for (const def of catalog) {
    const unlocked = unlockedMap.get(def.id);
    if (category !== "all" && def.category !== category) continue;
    if (rarity !== "all" && def.rarity !== rarity) continue;
    if (status === "unlocked" && !unlocked) continue;
    if (status === "locked" && unlocked) continue;
    if (q) {
      const hay = `${def.name} ${def.description} ${def.conditionText} ${formatCardNumber(def.number)}`.toLocaleLowerCase("pt-BR");
      if (!hay.includes(q)) continue;
    }
    entries.push({ definition: def, unlocked });
  }

  entries.sort((a, b) => {
    if (sortBy === "rarity") {
      const diff = RARITY_META[b.definition.rarity].rank - RARITY_META[a.definition.rarity].rank;
      if (diff !== 0) return diff;
      return a.definition.number - b.definition.number;
    }
    if (sortBy === "date") {
      if (a.unlocked && b.unlocked) {
        const cmp = b.unlocked.unlockedAt.localeCompare(a.unlocked.unlockedAt);
        if (cmp !== 0) return cmp;
      } else if (a.unlocked && !b.unlocked) {
        return -1;
      } else if (!a.unlocked && b.unlocked) {
        return 1;
      }
      return a.definition.number - b.definition.number;
    }
    return a.definition.number - b.definition.number;
  });

  return entries;
}
