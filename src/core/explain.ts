import { DIFFICULTY_LABELS } from "./defaults";
import type { CyclePlan, SubjectAllocation } from "./types";

/** Formata minutos como "1h 30min", "45min", "2h". */
export function formatMinutes(total: number): string {
  const rounded = Math.round(total);
  if (rounded <= 0) return "0min";
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

/** Formata milissegundos como relógio "HH:MM:SS" ou "MM:SS". */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatPercent(share: number, digits = 0): string {
  return `${(share * 100).toFixed(digits).replace(".", ",")}%`;
}

function formatNumber(n: number, digits = 2): string {
  return n.toFixed(digits).replace(".", ",");
}

/**
 * Gera uma explicação curta, em linguagem simples, de por que a disciplina
 * recebeu essa quantidade de tempo.
 */
export function explainAllocation(a: SubjectAllocation, plan: CyclePlan): string[] {
  const lines: string[] = [];
  const diff = DIFFICULTY_LABELS[a.difficulty].toLowerCase();
  let scoreLine = `Peso ${a.weight} × dificuldade ${diff} (${formatNumber(a.difficultyFactor)})`;
  if (Math.abs(a.adjustment - 1) > 1e-6) scoreLine += ` × ajuste ${formatNumber(a.adjustment)}`;
  scoreLine += ` = pontuação ${formatNumber(a.score)}.`;
  lines.push(scoreLine);
  lines.push(`Isso representa ${formatPercent(a.rawShare, 1)} da soma das pontuações de todas as matérias.`);
  if (a.clamp === "max") {
    lines.push(
      `Para manter o equilíbrio, a fatia foi limitada ao teto de ${formatPercent(plan.maxShare, 1)} do ciclo; ` +
        `o excedente foi redistribuído entre as demais.`,
    );
  } else if (a.clamp === "min") {
    lines.push(
      `Para que nenhuma matéria seja negligenciada, a fatia foi elevada ao piso de ${formatPercent(plan.minShare, 1)} do ciclo.`,
    );
  } else if (Math.abs(a.share - a.rawShare) > 0.0005) {
    lines.push(
      `Após os ajustes de equilíbrio das outras matérias, a fatia final ficou em ${formatPercent(a.share, 1)}.`,
    );
  }
  const blocks = a.blocks === 1 ? "1 sessão" : `${a.blocks} sessões`;
  lines.push(
    `Resultado: ${formatMinutes(a.minutes)} de ${formatMinutes(plan.totalMinutes)}, em ${blocks} ` +
      `(duração de referência: ${a.sessionMinutes}min).`,
  );
  return lines;
}

/** Resumo em uma linha (para cards). */
export function shortReason(a: SubjectAllocation): string {
  if (a.clamp === "max") return "Limitada pelo teto de equilíbrio";
  if (a.clamp === "min") return "Elevada ao piso mínimo";
  if (a.weight >= 4 && a.difficulty === "hard") return "Alta importância e difícil";
  if (a.weight >= 4) return "Alta importância";
  if (a.difficulty === "hard") return "Reforço por dificuldade";
  if (a.weight <= 2 && a.difficulty === "easy") return "Manutenção leve";
  return "Distribuição proporcional";
}
