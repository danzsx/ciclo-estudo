/**
 * Modelos de domínio do Ciclo.
 *
 * Este módulo (e todo o diretório `src/core`) é TypeScript puro: não depende
 * de React, Tauri, DOM ou APIs de Node. Isso permite reaproveitá-lo sem
 * alterações em uma futura versão mobile (React Native, Capacitor ou Tauri Mobile).
 */

export type Difficulty = "easy" | "medium" | "hard";

export interface Subject {
  id: string;
  name: string;
  /** Importância da disciplina para a prova: inteiro de 1 (baixa) a 5 (muito alta). */
  weight: number;
  /** Dificuldade percebida pelo estudante (avaliação subjetiva). */
  difficulty: Difficulty;
  /**
   * Duração recomendada de cada sessão desta disciplina, em minutos.
   * `null` significa "usar a duração padrão do ciclo".
   */
  sessionMinutes: number | null;
  /** Cor de identificação (hex). */
  color: string;
  createdAt: string;
  updatedAt: string;
  /** Disciplina criada pelo modo "exemplo" — pode ser removida em lote. */
  isDemo?: boolean;
  /**
   * Fator de ajuste reservado para evoluções futuras (desempenho em questões,
   * histórico de sessões). 1 = neutro. Limitado entre 0.5 e 1.5 pelo algoritmo.
   */
  adjustment?: number;
}

export interface CycleSettings {
  /** Tempo total disponível por ciclo completo, em minutos. */
  cycleMinutes: number;
  /** Duração preferida de cada sessão, em minutos. */
  sessionMinutes: number;
  /** Menor bloco permitido, em minutos (evita fragmentos curtos demais). */
  minBlockMinutes: number;
}

export type ThemePreference = "light" | "dark" | "system";

export interface SoundPreferences {
  /** Volume geral de 0 a 1. */
  masterVolume: number;
  /** Sons discretos de navegação e interface. */
  uiEnabled: boolean;
  /** Sons das sessões de estudo (início, pausa, retomada, conclusão, cancelamento). */
  sessionEnabled: boolean;
  /** Sons do cronômetro (início, pausa, retomada, finalização, transição). */
  timerEnabled: boolean;
  /** Sons da coleção ATLAS e revelação de conquistas. */
  achievementEnabled: boolean;
}

export interface Preferences {
  theme: ThemePreference;
  sound?: SoundPreferences;
}

/** Um bloco da sequência calculada do ciclo. */
export interface CycleBlock {
  /** Posição do bloco na sequência (0-based). */
  index: number;
  subjectId: string;
  minutes: number;
  /** Número do bloco dentro da disciplina (1-based) e total de blocos dela. */
  part: number;
  parts: number;
}

/** Justificativa estruturada de quanto tempo cada matéria recebeu. */
export interface SubjectAllocation {
  subjectId: string;
  weight: number;
  difficulty: Difficulty;
  difficultyFactor: number;
  adjustment: number;
  /** Pontuação bruta = peso × fator de dificuldade × ajuste. */
  score: number;
  /** Fatia proporcional antes dos limites (0..1). */
  rawShare: number;
  /** Fatia final após os limites (0..1). */
  share: number;
  /** Indica se a fatia foi elevada pelo piso ou reduzida pelo teto. */
  clamp: "min" | "max" | null;
  minutes: number;
  blocks: number;
  sessionMinutes: number;
}

export interface CyclePlan {
  totalMinutes: number;
  blocks: CycleBlock[];
  allocations: SubjectAllocation[];
  minShare: number;
  maxShare: number;
  warnings: string[];
  /** Assinatura das entradas — muda quando o plano precisa ser recalculado. */
  signature: string;
}

export interface CycleState {
  plan: CyclePlan | null;
  /** Índice do próximo bloco a estudar. */
  position: number;
  /** Número do ciclo atual (começa em 1). */
  cycleNumber: number;
  /** Quantas vezes o ciclo foi completado. */
  completedCycles: number;
}

export type ActiveSessionStatus = "running" | "paused";

export interface ActiveSession {
  id: string;
  courseId?: string;
  courseName?: string;
  subjectId: string;
  subjectName: string;
  blockIndex: number;
  cycleNumber: number;
  plannedMinutes: number;
  status: ActiveSessionStatus;
  /** Momento em que a sessão foi iniciada (ISO). */
  startedAt: string;
  /** Milissegundos acumulados em períodos anteriores (antes da última retomada). */
  accumulatedMs: number;
  /** Epoch ms da última vez que o cronômetro foi iniciado/retomado. */
  lastResumedAt: number | null;
  /** Epoch ms do último "sinal de vida" salvo enquanto o cronômetro corria. */
  lastHeartbeatAt: number | null;
  notes: string;
}

export type SessionStatus = "completed" | "partial" | "skipped";

export interface SessionRecord {
  id: string;
  courseId?: string;
  courseName?: string;
  subjectId: string;
  /** Nome no momento da sessão (preserva o histórico se a disciplina for renomeada/excluída). */
  subjectName: string;
  subjectColor: string;
  cycleNumber: number;
  blockIndex: number;
  startedAt: string;
  endedAt: string;
  plannedMinutes: number;
  /** Tempo efetivamente estudado, em minutos (pode ser fracionário). */
  studiedMinutes: number;
  status: SessionStatus;
  notes: string;
}

export type AchievementCategory = "constancy" | "dedication" | "cycles" | "special";

export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
  collectionId: string;
}

export interface AtlasState {
  unlocked: UnlockedAchievement[];
  retroactiveCheckedAt: string | null;
}

export interface Course {
  id: string;
  name: string;
  /** Cor de identificação do curso (hex). */
  color: string;
  subjects: Subject[];
  settings: CycleSettings;
  cycle: CycleState;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  schemaVersion: number;
  courses: Course[];
  activeCourseId: string;
  /** Espelhos do curso ativo para acesso direto e compatibilidade. */
  subjects: Subject[];
  settings: CycleSettings;
  preferences: Preferences;
  cycle: CycleState;
  activeSession: ActiveSession | null;
  history: SessionRecord[];
  atlas: AtlasState;
  meta: {
    createdAt: string;
    updatedAt: string;
  };
}

/** Resultado de uma operação que pode falhar por validação. */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };
