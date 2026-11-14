/**
 * Identidade Visual Editorial & Contemporânea — Ciclo
 * Paleta central:
 * - #002a32 (Azul Profundo Abissal / Deep Petrol)
 * - #73ba9b (Verde Sálvia / Botanical Sage)
 * - #f7a072 (Pêssego Âmbar / Warm Apricot)
 * - #3b43d6 (Azul-Violeta Profundo de Identidade / Deep Indigo-Violet)
 */

export type SubjectIconKey =
  | "scale"
  | "landmark"
  | "book-open"
  | "sigma"
  | "cpu"
  | "shield"
  | "file-text"
  | "scroll"
  | "Wallet"
  | "pen-tool"
  | "compass"
  | "globe"
  | "bar-chart"
  | "layers"
  | "bookmark";

export interface SubjectVisual {
  iconKey: SubjectIconKey;
  /** Mantido para compatibilidade caso algum trecho consulte string curta */
  monogram: string;
  pastelBg: string;
  pastelText: string;
  borderTint: string;
  accentHex: string;
}

const EDITORIAL_TILES: Array<{
  bg: string;
  text: string;
  border: string;
  accent: string;
}> = [
  // 0: Sage Mint (#73ba9b family — Reference green tile)
  {
    bg: "#EAF5F0",
    text: "#21684E",
    border: "rgba(115, 186, 155, 0.28)",
    accent: "#73ba9b",
  },
  // 1: Ice Petrol (#002a32 family — Reference blue tile)
  {
    bg: "#E7F0F2",
    text: "#002A32",
    border: "rgba(0, 42, 50, 0.14)",
    accent: "#002a32",
  },
  // 2: Warm Apricot (#f7a072 family — Reference warm accent)
  {
    bg: "#FDF0E8",
    text: "#B85624",
    border: "rgba(247, 160, 114, 0.30)",
    accent: "#f7a072",
  },
  // 3: Deep Indigo-Violet (Identity accent)
  {
    bg: "#EDEEFE",
    text: "#353CC7",
    border: "rgba(59, 67, 214, 0.20)",
    accent: "#3b43d6",
  },
  // 4: Soft Mineral Teal
  {
    bg: "#E9F3F1",
    text: "#14535E",
    border: "rgba(20, 83, 94, 0.16)",
    accent: "#1e555c",
  },
];

const SUBJECT_ICON_MAP: Array<{
  match: RegExp;
  iconKey: SubjectIconKey;
  paletteIndex: number;
}> = [
  { match: /constitucional/i, iconKey: "scale", paletteIndex: 1 },
  { match: /administrativo/i, iconKey: "landmark", paletteIndex: 0 },
  { match: /portugu[eê]s|gram[aá]tica|l[ií]ngua|literatura/i, iconKey: "book-open", paletteIndex: 0 },
  { match: /racioc[ií]nio|l[oó]gic|matem[aá]tic|rlm|estat[ií]stica|exatas/i, iconKey: "sigma", paletteIndex: 2 },
  { match: /inform[aá]tic|ti|computa|dados|sistema/i, iconKey: "cpu", paletteIndex: 3 },
  { match: /penal|crimin|seguran/i, iconKey: "shield", paletteIndex: 1 },
  { match: /process/i, iconKey: "layers", paletteIndex: 4 },
  { match: /civil|direito/i, iconKey: "scroll", paletteIndex: 1 },
  { match: /tribut[aá]ri|financ|econom|orcament/i, iconKey: "bar-chart", paletteIndex: 2 },
  { match: /reda[cç][aã]o|discurs|texto/i, iconKey: "pen-tool", paletteIndex: 3 },
  { match: /[eé]tica|filosof|sociolog|humanos/i, iconKey: "compass", paletteIndex: 0 },
  { match: /administra[cç][aã]o|gest[aã]o|governan/i, iconKey: "file-text", paletteIndex: 4 },
  { match: /contabil|auditor/i, iconKey: "bar-chart", paletteIndex: 0 },
  { match: /legisla|norma|lei/i, iconKey: "bookmark", paletteIndex: 1 },
  { match: /atualidad|geograf|hist[oó]ria|mundo|ingl[eê]s|espanhol/i, iconKey: "globe", paletteIndex: 3 },
];

const FALLBACK_ICONS: SubjectIconKey[] = [
  "book-open",
  "layers",
  "bookmark",
  "compass",
  "file-text",
  "scale",
];

function extractMonogram(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2 || name.trim().split(/\s+/).length === 1);
  if (words.length === 0) return "CI";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Retorna a assinatura visual (ícone vetorial + tile cromático sutil) para uma disciplina.
 */
export function getSubjectVisual(name: string, index = 0): SubjectVisual {
  const cleanName = (name || "").trim();
  const monogram = extractMonogram(cleanName);

  for (const item of SUBJECT_ICON_MAP) {
    if (item.match.test(cleanName)) {
      const p = EDITORIAL_TILES[item.paletteIndex % EDITORIAL_TILES.length];
      return {
        iconKey: item.iconKey,
        monogram,
        pastelBg: p.bg,
        pastelText: p.text,
        borderTint: p.border,
        accentHex: p.accent,
      };
    }
  }

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = (hash << 5) - hash + cleanName.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash) + index;
  const iconKey = FALLBACK_ICONS[positiveHash % FALLBACK_ICONS.length];
  const p = EDITORIAL_TILES[positiveHash % EDITORIAL_TILES.length];

  return {
    iconKey,
    monogram,
    pastelBg: p.bg,
    pastelText: p.text,
    borderTint: p.border,
    accentHex: p.accent,
  };
}

/**
 * Retorna saudação editorial discreta conforme o período do dia.
 */
export function getTimeOfDayContext(): {
  periodLabel: string;
  greeting: string;
  subtext: string;
  sectionLabel: string;
} {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      periodLabel: "Manhã",
      greeting: "Bom dia",
      subtext: "Progresso consistente e foco silencioso.",
      sectionLabel: "Sessão prioritária da manhã",
    };
  }

  if (hour >= 12 && hour < 18) {
    return {
      periodLabel: "Tarde",
      greeting: "Boa tarde",
      subtext: "Mantenha a cadência planejada no seu ciclo.",
      sectionLabel: "Continuidade do ciclo",
    };
  }

  return {
    periodLabel: "Noite",
    greeting: "Boa noite",
    subtext: "Avance mais um bloco com clareza e método.",
    sectionLabel: "Foco noturno",
  };
}

/**
 * Formata minutos de maneira limpa e editorial: "50 min", "1h 20m"
 */
export function formatTiimoDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m <= 0) return "0 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}
