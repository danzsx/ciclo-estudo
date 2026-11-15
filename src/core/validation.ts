import { LIMITS } from "./defaults";
import type { CycleSettings, Difficulty, Result } from "./types";

export interface CourseInput {
  name: string;
  color?: string;
}

export interface SubjectInput {
  name: string;
  weight: number;
  difficulty: Difficulty;
  sessionMinutes: number | null;
  color?: string;
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function isInt(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Number.isInteger(n);
}

export function validateCourseInput(
  input: CourseInput,
  existingNames: string[] = [],
): Result<CourseInput> {
  const errors: Record<string, string> = {};
  const name = (input.name ?? "").trim().replace(/\s+/g, " ");
  if (!name) errors.name = "Informe o nome do curso.";
  else if (name.length > LIMITS.courseNameMax) errors.name = `Use no máximo ${LIMITS.courseNameMax} caracteres.`;
  else if (existingNames.some((n) => n.trim().toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR")))
    errors.name = "Já existe um curso com esse nome.";

  if (input.color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(input.color)) errors.color = "Cor inválida.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...input, name } };
}

export function validateSubjectInput(
  input: SubjectInput,
  existingNames: string[] = [],
): Result<SubjectInput> {
  const errors: Record<string, string> = {};
  const name = (input.name ?? "").trim().replace(/\s+/g, " ");
  if (!name) errors.name = "Informe o nome da disciplina.";
  else if (name.length > LIMITS.nameMax) errors.name = `Use no máximo ${LIMITS.nameMax} caracteres.`;
  else if (existingNames.some((n) => n.trim().toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR")))
    errors.name = "Já existe uma disciplina com esse nome.";

  if (!isInt(input.weight) || input.weight < LIMITS.weightMin || input.weight > LIMITS.weightMax)
    errors.weight = `O peso deve ser um número inteiro de ${LIMITS.weightMin} a ${LIMITS.weightMax}.`;

  if (!DIFFICULTIES.includes(input.difficulty)) errors.difficulty = "Escolha uma dificuldade válida.";

  if (input.sessionMinutes !== null) {
    if (
      !isInt(input.sessionMinutes) ||
      input.sessionMinutes < LIMITS.sessionMin ||
      input.sessionMinutes > LIMITS.sessionMax
    )
      errors.sessionMinutes = `A sessão deve ter entre ${LIMITS.sessionMin} e ${LIMITS.sessionMax} minutos.`;
  }

  if (input.color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(input.color)) errors.color = "Cor inválida.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...input, name } };
}

export function validateSettings(settings: CycleSettings): Result<CycleSettings> {
  const errors: Record<string, string> = {};
  const { cycleMinutes, sessionMinutes, minBlockMinutes } = settings;
  if (!isInt(cycleMinutes) || cycleMinutes < LIMITS.cycleMin || cycleMinutes > LIMITS.cycleMax)
    errors.cycleMinutes = `O ciclo deve ter entre ${LIMITS.cycleMin} minutos e ${LIMITS.cycleMax / 60} horas.`;
  else if (cycleMinutes % LIMITS.granularity !== 0)
    errors.cycleMinutes = `Use um múltiplo de ${LIMITS.granularity} minutos.`;

  if (!isInt(sessionMinutes) || sessionMinutes < LIMITS.sessionMin || sessionMinutes > LIMITS.sessionMax)
    errors.sessionMinutes = `A sessão deve ter entre ${LIMITS.sessionMin} e ${LIMITS.sessionMax} minutos.`;

  if (!isInt(minBlockMinutes) || minBlockMinutes < LIMITS.minBlockMin || minBlockMinutes > LIMITS.minBlockMax)
    errors.minBlockMinutes = `O bloco mínimo deve ter entre ${LIMITS.minBlockMin} e ${LIMITS.minBlockMax} minutos.`;
  else if (isInt(sessionMinutes) && minBlockMinutes > sessionMinutes)
    errors.minBlockMinutes = "O bloco mínimo não pode ser maior que a duração da sessão.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { cycleMinutes, sessionMinutes, minBlockMinutes } };
}

export function validateStudiedMinutes(minutes: number): string | null {
  if (!Number.isFinite(minutes) || minutes < 0) return "Informe um tempo válido.";
  if (minutes > 24 * 60) return "O tempo não pode passar de 24 horas.";
  return null;
}
