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

export interface AtlasCollectionMeta {
  id: string;
  name: string;
  subtitle: string;
  badgeLabel: string;
  accent: string;
  order: number;
}

export const ATLAS_COLLECTIONS: readonly AtlasCollectionMeta[] = [
  {
    id: "cerrado",
    name: "Fauna do Cerrado",
    subtitle: "Espécies adaptadas às savanas, veredas e campos abertos do Brasil Central.",
    badgeLabel: "Cerrado",
    accent: "#d99b52",
    order: 1,
  },
  {
    id: "amazonia",
    name: "Fauna Amazônica",
    subtitle: "Habitantes dos grandes rios, igapós e copas da maior floresta tropical.",
    badgeLabel: "Amazônia",
    accent: "#52b788",
    order: 2,
  },
  {
    id: "mata-atlantica",
    name: "Fauna da Mata Atlântica",
    subtitle: "Guardiões das serras úmidas, matas costeiras e remanescentes florestais.",
    badgeLabel: "Mata Atlântica",
    accent: "#73ba9b",
    order: 3,
  },
  {
    id: "aves",
    name: "Aves Brasileiras",
    subtitle: "Voo, visão e precisão pelas copas, cerrados e planícies alagadas.",
    badgeLabel: "Aves",
    accent: "#8ab8e6",
    order: 4,
  },
  {
    id: "predadores",
    name: "Grandes Predadores",
    subtitle: "Olhar estratégico, paciência silenciosa e domínio do território.",
    badgeLabel: "Predadores",
    accent: "#c996f5",
    order: 5,
  },
];

export interface AchievementDefinition {
  id: string;
  number: number;
  collectionId: string;
  collectionName: string;
  /** Biomas e coleções temáticas do Bestiário ATLAS às quais esta carta pertence. */
  collections: readonly string[];
  name: string;
  /** Nome popular do animal no Bestiário ATLAS. */
  speciesName: string;
  /** Nome científico (nomenclatura binominal) da espécie. */
  scientificName: string;
  /** Habitat natural predominante da espécie. */
  habitat: string;
  /** Características marcantes da espécie no bestiário. */
  characteristics: string;
  /** Atributos simbólicos que conectam o animal à jornada de estudos. */
  attributes: readonly string[];
  /** Pequena descrição narrativa do bestiário. */
  narrative: string;
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
    completedCycles: data.courses?.length
      ? data.courses.reduce((sum, c) => sum + c.cycle.completedCycles, 0)
      : data.cycle.completedCycles,
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
    collections: ["mata-atlantica"],
    name: "A Primeira Chama",
    speciesName: "Quati",
    scientificName: "Nasua nasua",
    habitat: "Matas ciliares, florestas tropicais e bordas de serra da Mata Atlântica.",
    characteristics: "Focinho alongado e móvel, cauda anelada usada para equilíbrio e olfato apurado para explorar novos caminhos.",
    attributes: ["Curiosidade", "Despertar", "Agilidade"],
    narrative: "Inquieto e atento a cada trilha nova, o quati simboliza o primeiro passo: abrir o caderno com olhos curiosos e transformar intenção em movimento.",
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
    collections: ["aves", "cerrado"],
    name: "O Ritmo Inicial",
    speciesName: "Beija-flor-tesoura",
    scientificName: "Eupetomena macroura",
    habitat: "Campos arborizados, cerrados abertos e jardins floridos.",
    characteristics: "Cauda longa bifurcada e batimento de asas capaz de pairar com precisão milimétrica diante do néctar.",
    attributes: ["Cadência", "Energia", "Leveza"],
    narrative: "Capaz de sustentar o voo em batidas precisas, encarna os três primeiros dias em que a vontade começa a ganhar ritmo próprio.",
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
    collections: ["aves", "mata-atlantica"],
    name: "A Semana Ininterrupta",
    speciesName: "João-de-barro",
    scientificName: "Furnarius rufus",
    habitat: "Campos abertos, bordas de mata e áreas rurais da Mata Atlântica e Sul-Sudeste.",
    characteristics: "Arquiteto meticuloso que molda seu ninho de barro com câmara interna protegida contra vento e chuva.",
    attributes: ["Edificação", "Método", "Zelo"],
    narrative: "Construtor paciente que ergue sua morada tijolo a tijolo; representa a primeira semana inteira em que o hábito cria alicerce.",
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
    collections: ["cerrado", "predadores"],
    name: "A Constância",
    speciesName: "Lobo-guará",
    scientificName: "Chrysocyon brachyurus",
    habitat: "Campos limpos, veredas e savanas abertas do Cerrado brasileiro.",
    characteristics: "Pernas longas adaptadas ao capim alto, pelagem ruiva-dourada e caminhada solitária de longo alcance.",
    attributes: ["Autonomia", "Constância", "Serenidade"],
    narrative: "Solitário sob o céu do Cerrado, percorre grandes distâncias sem pressa nem ruído — símbolo de quem sustenta o próprio passo mesmo quando o entusiasmo oscila.",
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
    collections: ["aves", "predadores"],
    name: "O Guardião do Hábito",
    speciesName: "Coruja-suindara",
    scientificName: "Tyto furcata",
    habitat: "Campos, bordas florestais, escarpas e áreas abertas de todo o Brasil.",
    characteristics: "Disco facial em forma de coração que amplifica sons sutis e plumagem serrilhada para voo completamente silencioso.",
    attributes: ["Vigilância", "Clareza", "Silêncio"],
    narrative: "De voo silencioso e olhar atento na penumbra, guarda um mês inteiro de presença diária em que a rotina já se tornou identidade.",
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
    collections: ["cerrado"],
    name: "A Disciplina Férrea",
    speciesName: "Tamanduá-bandeira",
    scientificName: "Myrmecophaga tridactyla",
    habitat: "Campos sujos, cerradões e áreas abertas do Cerrado e Pantanal.",
    characteristics: "Cauda em forma de bandeira, garras dianteiras robustas e caminhar cadenciado de grande resistência.",
    attributes: ["Paciência", "Persistência", "Firmeza"],
    narrative: "De passo lento, metódico e inabalável pelos campos, personifica sessenta dias de esforço contínuo sem concessões ao acaso.",
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
    collections: ["amazonia", "aves", "predadores"],
    name: "O Centurião do Tempo",
    speciesName: "Harpia",
    scientificName: "Harpia harpyja",
    habitat: "Dossel das florestas tropicais preservadas da Amazônia.",
    characteristics: "Maior águia das Américas, com garras poderosas, crista dupla erguida e visão de alcance cirúrgico.",
    attributes: ["Foco", "Precisão", "Soberania"],
    narrative: "Soberana das copas mais altas, enxerga o alvo com exatidão absoluta. Cem dias ininterruptos coroam uma disciplina rara e inquebrável.",
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
    collections: ["mata-atlantica"],
    name: "A Primeira Hora",
    speciesName: "Sagui-de-tufos-brancos",
    scientificName: "Callithrix jacchus",
    habitat: "Matas secundárias, copas arborizadas e bordas da Mata Atlântica.",
    characteristics: "Pequeno porte, tufos brancos nas orelhas e agilidade social ao saltar entre os ramos.",
    attributes: ["Atenção", "Descoberta", "Prontidão"],
    narrative: "Ágil e observador entre os galhos, marca os primeiros sessenta minutos de atenção plena registrados no seu arquivo.",
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
    collections: ["mata-atlantica"],
    name: "O Aprendiz Atento",
    speciesName: "Capivara",
    scientificName: "Hydrochoerus hydrochaeris",
    habitat: "Margens de rios, lagoas e várzeas úmidas da Mata Atlântica e bacias brasileiras.",
    characteristics: "Maior roedor do mundo, temperamento sereno e excelente nadador adaptado à vida semiaquática.",
    attributes: ["Calma", "Firmeza", "Presença"],
    narrative: "Serena à beira das águas, ensina que a construção do domínio começa na tranquilidade de permanecer concentrado.",
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
    collections: ["cerrado", "aves"],
    name: "O Artífice do Tempo",
    speciesName: "Tucano-toco",
    scientificName: "Ramphastos toco",
    habitat: "Matas de galeria, cerradões e copas abertas do Brasil Central.",
    characteristics: "Bico alaranjado leve com estrutura esponjosa interna e equilíbrio preciso nos ramos altos.",
    attributes: ["Expressão", "Equilíbrio", "Clareza"],
    narrative: "De silhueta inconfundível e equilíbrio preciso nos ramos altos, celebra dez horas lapidadas bloco a bloco.",
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
    collections: ["cerrado"],
    name: "O Ofício Contínuo",
    speciesName: "Tamanduá-mirim",
    scientificName: "Tamandua tetradactyla",
    habitat: "Cerradões, matas secas e bordas de floresta com árvores de médio porte.",
    characteristics: "Cauda preênsil para escalada, colete escuro contrastante e paciência meticulosa ao investigar troncos.",
    attributes: ["Ofício", "Zelo", "Constância"],
    narrative: "Escala troncos com paciência meticulosa; representa vinte e cinco horas que formam a base sólida de um repertório consistente.",
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
    collections: ["amazonia"],
    name: "O Erudito",
    speciesName: "Boto-cor-de-rosa",
    scientificName: "Inia geoffrensis",
    habitat: "Rios de águas escuras, igapós e lagos da Bacia Amazônica.",
    characteristics: "Ecolocalização refinada para navegar em águas turvas e vértebras cervicais flexíveis.",
    attributes: ["Profundeza", "Intuição", "Fluidez"],
    narrative: "Navega com inteligência pelas águas profundas e turvas dos rios, símbolo de cinquenta horas em que as ideias passam a dialogar entre si.",
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
    collections: ["amazonia", "predadores"],
    name: "O Mestre de Ofício",
    speciesName: "Sucuri-verde",
    scientificName: "Eunectes murinus",
    habitat: "Várzeas alagadas, igarapés e rios lentos da Amazônia.",
    characteristics: "Força muscular silenciosa, camuflagem verde-oliva e paciência absoluta de emboscada.",
    attributes: ["Imersão", "Força Silenciosa", "Maturidade"],
    narrative: "Imponente e serena nas águas escuras, traduz cem horas de estudo real concentradas em poder silencioso e maturidade.",
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
    collections: ["cerrado"],
    name: "O Arquivista Maior",
    speciesName: "Tatu-canastra",
    scientificName: "Priodontes maximus",
    habitat: "Cerrados preservados, matas secas e campos com solo profundo.",
    characteristics: "Maior tatu existente, carapaça articulada em placas e garras capazes de escavar galerias extensas.",
    attributes: ["Rigor", "Profundidade", "Resistência"],
    narrative: "Escavador incansável de galerias profundas, simboliza duzentas horas de rigor e investigação além da superfície.",
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
    collections: ["amazonia", "predadores"],
    name: "A Grande Obra",
    speciesName: "Onça-pintada",
    scientificName: "Panthera onca",
    habitat: "Florestas densas, margens de rios e matas fechadas da Amazônia.",
    characteristics: "Maior felino das Américas, pelagem com rosetas únicas e mordida de precisão absoluta.",
    attributes: ["Domínio", "Excelência", "Presença"],
    narrative: "Silenciosa, precisa e soberana na mata fechada. Cada roseta carrega quinhentas horas de ofício silencioso convertidas em maestria.",
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
    collections: ["cerrado", "aves"],
    name: "O Cartógrafo",
    speciesName: "Arara-azul",
    scientificName: "Anodorhynchus hyacinthinus",
    habitat: "Veredas de buritis, cerrados abertos e planícies alagadas.",
    characteristics: "Maior espécie de arara, plumagem azul-cobalto intensa e bico robusto para abrir frutos duros.",
    attributes: ["Exploração", "Amplitude", "Visão"],
    narrative: "Cruza os céus abertos com asas amplas e olhar atento — simboliza o primeiro ciclo percorrido por inteiro do início ao fim.",
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
    collections: ["amazonia"],
    name: "A Órbita Estável",
    speciesName: "Tartaruga-da-amazônia",
    scientificName: "Podocnemis expansa",
    habitat: "Grandes rios amazônicos e praias fluviais sazonais.",
    characteristics: "Carapaça hidrodinâmica e navegação migratória guiada pelo pulso anual das cheias e vazantes.",
    attributes: ["Retorno", "Cadência", "Estabilidade"],
    narrative: "Guiada por ciclos sazonais antigos, retorna com precisão ao mesmo leito; marca três rotações completas que comprovam o método.",
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
    collections: ["amazonia", "aves", "predadores"],
    name: "O Navegador",
    speciesName: "Gavião-real-de-penacho",
    scientificName: "Spizaetus ornatus",
    habitat: "Florestas altas e copas contínuas da Amazônia.",
    characteristics: "Penacho occipital erétil, plumagem barrada e manobrabilidade ágil entre os troncos do dossel.",
    attributes: ["Orientação", "Rumo", "Equilíbrio"],
    narrative: "De penacho erguido e leitura precisa das correntes de ar, representa cinco ciclos encerrados com regularidade entre as disciplinas.",
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
    collections: ["mata-atlantica", "predadores"],
    name: "O Arquiteto de Ciclos",
    speciesName: "Suçuarana",
    scientificName: "Puma concolor",
    habitat: "Serras escarpadas, florestas de encosta e matas da Mata Atlântica.",
    characteristics: "Salto poderoso, pelagem uniforme adaptável e capacidade de percorrer territórios acidentados.",
    attributes: ["Adaptação", "Domínio", "Agilidade"],
    narrative: "Versátil dos cânions às florestas densas, encarna dez ciclos completos sob domínio absoluto da própria cadência.",
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
    collections: ["mata-atlantica"],
    name: "O Cronista",
    speciesName: "Anta-brasileira",
    scientificName: "Tapirus terrestris",
    habitat: "Florestas úmidas, matas ciliares e reservas da Mata Atlântica.",
    characteristics: "Maior mamífero terrestre brasileiro, probóscide flexível e papel essencial como dispersora de sementes.",
    attributes: ["Resistência", "Trilha", "Constância"],
    narrative: "Jardineira ancestral das matas, abre trilhas duradouras por onde passa — vinte e cinco ciclos gravados como crônica exemplar.",
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
    collections: ["cerrado", "aves"],
    name: "O Soberano do Método",
    speciesName: "Jaburu",
    scientificName: "Jabiru mycteria",
    habitat: "Planícies alagadas, veredas úmidas e áreas brejosas do Brasil Central.",
    characteristics: "Ave pernalta de grande envergadura, pescoço nu negro com faixa vermelha e voo majestoso em térmicas.",
    attributes: ["Horizonte", "Maestria", "Soberania"],
    narrative: "Majestoso sobre as planícies alagadas ao amanhecer, coroa cinquenta ciclos completos quando o método já se tornou segunda natureza.",
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
    collections: ["amazonia", "aves"],
    name: "O Polímata",
    speciesName: "Ararajuba",
    scientificName: "Guaruba guarouba",
    habitat: "Florestas de terra firme e copas luminosas da Amazônia oriental.",
    characteristics: "Plumagem amarelo-ouro contrastada com rêmiges verdes vibrantes e comportamento altamente social.",
    attributes: ["Pluralidade", "Síntese", "Harmonia"],
    narrative: "De plumagem dourada e verde vibrante, simboliza a síntese harmônica de todas as disciplinas estudadas em um mesmo ciclo.",
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
    collections: ["mata-atlantica"],
    name: "A Imersão",
    speciesName: "Preguiça-de-coleira",
    scientificName: "Bradypus torquatus",
    habitat: "Florestas úmidas costeiras da Mata Atlântica.",
    characteristics: "Metabolismo pausado, pelagem esverdeada por algas simbióticas e aderência serena aos galhos altos.",
    attributes: ["Permanência", "Aprofundamento", "Calma"],
    narrative: "Serena e profundamente adaptada à copa das árvores, lembra que o verdadeiro aprofundamento nasce do tempo sem pressa.",
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
    collections: ["aves", "predadores"],
    name: "O Especialista",
    speciesName: "Gavião-carijó",
    scientificName: "Rupornis magnirostris",
    habitat: "Bordas de mata, campos arborizados e áreas abertas por todo o território.",
    characteristics: "Olhar penetrante de íris amarela, vocalização clara e precisão cirúrgica ao observar seu território.",
    attributes: ["Especialização", "Mira", "Nitidez"],
    narrative: "Observador incansável de um único território, representa dez horas concentradas em um mesmo domínio até alcançar fluência.",
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
    collections: ["aves", "mata-atlantica"],
    name: "O Ciclo Íntegro",
    speciesName: "Garça-branca-grande",
    scientificName: "Ardea alba",
    habitat: "Lagoas costeiras, estuários e várzeas da Mata Atlântica.",
    characteristics: "Plumagem alva impecável, pescoço sinuoso e paciência imóvel sobre o espelho d'água.",
    attributes: ["Integridade", "Precisão", "Elegância"],
    narrative: "Imóvel e exata sobre o espelho d'água, simboliza um ciclo inteiro cumprido sem desvios nem omissões.",
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

  // ---------------------------------------------------------------- Selos de Coleção Temática
  {
    id: "album-cerrado",
    number: 26,
    collectionId: "cerrado",
    collectionName: "Fauna do Cerrado",
    collections: ["cerrado"],
    name: "Guardião do Cerrado",
    speciesName: "Selo do Cerrado",
    scientificName: "Bioma Cerrado · Coleção Completa",
    habitat: "Savanas tropicais, veredas de buritis e campos do Brasil Central.",
    characteristics: "Selo honorário concedido ao reunir todas as espécies catalogadas da Fauna do Cerrado.",
    attributes: ["Resistência", "Horizonte", "Síntese"],
    narrative: "Do passo do lobo-guará ao voo do jaburu, todas as pranchas do Cerrado repousam reunidas no seu bestiário pessoal.",
    category: "special",
    rarity: "epic",
    description: "Todas as cartas da coleção temática Fauna do Cerrado foram desbloqueadas.",
    conditionText: "Desbloquear todas as espécies da coleção Fauna do Cerrado.",
    illustration: "atlas/album-cerrado",
    evaluate: albumRule("cerrado"),
  },
  {
    id: "album-amazonia",
    number: 27,
    collectionId: "amazonia",
    collectionName: "Fauna Amazônica",
    collections: ["amazonia"],
    name: "Guardião da Amazônia",
    speciesName: "Selo da Amazônia",
    scientificName: "Bioma Amazônia · Coleção Completa",
    habitat: "Rios de águas escuras, igapós e dossel da Floresta Amazônica.",
    characteristics: "Selo honorário concedido ao reunir todas as espécies catalogadas da Fauna Amazônica.",
    attributes: ["Profundeza", "Soberania", "Plenitude"],
    narrative: "Das águas do boto-cor-de-rosa às copas da harpia, o álbum amazônico completo celebra o domínio sereno do percurso.",
    category: "special",
    rarity: "legendary",
    description: "Todas as cartas da coleção temática Fauna Amazônica foram desbloqueadas.",
    conditionText: "Desbloquear todas as espécies da coleção Fauna Amazônica.",
    illustration: "atlas/album-amazonia",
    evaluate: albumRule("amazonia"),
  },
  {
    id: "album-mata-atlantica",
    number: 28,
    collectionId: "mata-atlantica",
    collectionName: "Fauna da Mata Atlântica",
    collections: ["mata-atlantica"],
    name: "Guardião da Mata Atlântica",
    speciesName: "Selo da Mata Atlântica",
    scientificName: "Bioma Mata Atlântica · Coleção Completa",
    habitat: "Serras úmidas, matas costeiras e florestas atlânticas.",
    characteristics: "Selo honorário concedido ao reunir todas as espécies catalogadas da Fauna da Mata Atlântica.",
    attributes: ["Raízes", "Equilíbrio", "Presença"],
    narrative: "Do primeiro passo do quati à elegância da garça-branca, cada espécie da Mata Atlântica compõe um registro vivo de constância.",
    category: "special",
    rarity: "epic",
    description: "Todas as cartas da coleção temática Fauna da Mata Atlântica foram desbloqueadas.",
    conditionText: "Desbloquear todas as espécies da coleção Fauna da Mata Atlântica.",
    illustration: "atlas/album-mata-atlantica",
    evaluate: albumRule("mata-atlantica"),
  },
  {
    id: "album-aves",
    number: 29,
    collectionId: "aves",
    collectionName: "Aves Brasileiras",
    collections: ["aves"],
    name: "Ornitólogo do Arquivo",
    speciesName: "Selo das Aves",
    scientificName: "Aves Brasileiras · Coleção Completa",
    habitat: "Copas florestais, campos abertos e planícies alagadas do Brasil.",
    characteristics: "Selo honorário concedido ao reunir todas as aves catalogadas no Bestiário ATLAS.",
    attributes: ["Visão", "Cadência", "Altitude"],
    narrative: "Do beija-flor-tesoura à harpia soberana, todas as aves do arquivo voam em harmonia sob seu método.",
    category: "special",
    rarity: "legendary",
    description: "Todas as cartas da coleção temática Aves Brasileiras foram desbloqueadas.",
    conditionText: "Desbloquear todas as espécies da coleção Aves Brasileiras.",
    illustration: "atlas/album-aves",
    evaluate: albumRule("aves"),
  },
  {
    id: "album-predadores",
    number: 30,
    collectionId: "predadores",
    collectionName: "Grandes Predadores",
    collections: ["predadores"],
    name: "Mestre dos Predadores",
    speciesName: "Selo dos Predadores",
    scientificName: "Grandes Predadores · Coleção Completa",
    habitat: "Territórios preservados de cerrados, serras e florestas densas.",
    characteristics: "Selo honorário concedido ao reunir todos os grandes predadores do Bestiário ATLAS.",
    attributes: ["Precisão", "Estratégia", "Domínio"],
    narrative: "Olhar atento, paciência e execução precisa — os grandes predadores do arquivo reconhecem um método implacável.",
    category: "special",
    rarity: "legendary",
    description: "Todas as cartas da coleção temática Grandes Predadores foram desbloqueadas.",
    conditionText: "Desbloquear todas as espécies da coleção Grandes Predadores.",
    illustration: "atlas/album-predadores",
    evaluate: albumRule("predadores"),
  },
];

function albumRule(collectionId: string): AchievementDefinition["evaluate"] {
  return (metrics, data) => {
    const members = ATLAS_CATALOG.filter(
      (def) => !def.id.startsWith("album-") && def.collections.includes(collectionId),
    );
    if (members.length === 0) return { met: false };
    let latestUnlockedAt: string | undefined;
    for (const member of members) {
      const res = member.evaluate(metrics, data);
      if (!res.met) return { met: false };
      if (res.unlockedAt && (!latestUnlockedAt || res.unlockedAt > latestUnlockedAt)) {
        latestUnlockedAt = res.unlockedAt;
      }
    }
    return { met: true, unlockedAt: latestUnlockedAt };
  };
}

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
  collection?: string | "all";
  rarity?: AchievementRarity | "all";
  status?: AtlasStatusFilter;
  sortBy?: AtlasSortBy;
  search?: string;
}

export interface AtlasCardEntry {
  definition: AchievementDefinition;
  unlocked?: UnlockedAchievement;
}

export interface CollectionProgress {
  collection: AtlasCollectionMeta;
  total: number;
  unlocked: number;
  pct: number;
  completed: boolean;
  sealUnlocked?: UnlockedAchievement;
}

/** Calcula o progresso de cada coleção temática/bioma do Bestiário ATLAS. */
export function getCollectionProgress(
  unlockedList: readonly UnlockedAchievement[],
  catalog: readonly AchievementDefinition[] = ATLAS_CATALOG,
): CollectionProgress[] {
  const unlockedMap = new Map(unlockedList.map((u) => [u.id, u]));
  return ATLAS_COLLECTIONS.slice()
    .sort((a, b) => a.order - b.order)
    .map((collection) => {
      const members = catalog.filter(
        (def) => !def.id.startsWith("album-") && def.collections.includes(collection.id),
      );
      const unlockedCount = members.filter((def) => unlockedMap.has(def.id)).length;
      const total = members.length;
      const pct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;
      const sealUnlocked = unlockedMap.get(`album-${collection.id}`);
      return {
        collection,
        total,
        unlocked: unlockedCount,
        pct,
        completed: total > 0 && unlockedCount === total,
        sealUnlocked,
      };
    });
}

/** Filtra e ordena as cartas do catálogo ATLAS para a seção Coleção. */
export function queryAtlasCards(
  unlockedList: readonly UnlockedAchievement[],
  options: AtlasQueryOptions = {},
  catalog: readonly AchievementDefinition[] = ATLAS_CATALOG,
): AtlasCardEntry[] {
  const unlockedMap = new Map(unlockedList.map((u) => [u.id, u]));
  const category = options.category ?? "all";
  const collection = options.collection ?? "all";
  const rarity = options.rarity ?? "all";
  const status = options.status ?? "all";
  const sortBy = options.sortBy ?? "id";
  const q = (options.search ?? "").trim().toLocaleLowerCase("pt-BR");

  const entries: AtlasCardEntry[] = [];
  for (const def of catalog) {
    const unlocked = unlockedMap.get(def.id);
    if (category !== "all" && def.category !== category) continue;
    if (collection !== "all" && !def.collections.includes(collection)) continue;
    if (rarity !== "all" && def.rarity !== rarity) continue;
    if (status === "unlocked" && !unlocked) continue;
    if (status === "locked" && unlocked) continue;
    if (q) {
      const hay = `${def.name} ${def.speciesName} ${def.scientificName} ${def.habitat} ${def.characteristics} ${def.attributes.join(" ")} ${def.narrative} ${def.description} ${def.conditionText} ${formatCardNumber(def.number)}`.toLocaleLowerCase("pt-BR");
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
