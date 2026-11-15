import type { AchievementRarity } from "../core";

export type SoundCategory = "ui" | "session" | "timer" | "achievement";

export type SoundId =
  | "ui-tab"
  | "ui-select"
  | "ui-modal-open"
  | "ui-modal-close"
  | "ui-confirm"
  | "session-start"
  | "session-pause"
  | "session-resume"
  | "session-complete"
  | "session-cancel"
  | "timer-start"
  | "timer-pause"
  | "timer-resume"
  | "timer-complete"
  | "timer-transition"
  | "atlas-collection-open"
  | "atlas-card-select"
  | "atlas-card-detail"
  | "atlas-unlock"
  | "atlas-reveal-common"
  | "atlas-reveal-uncommon"
  | "atlas-reveal-rare"
  | "atlas-reveal-epic"
  | "atlas-reveal-legendary";

export interface SoundDefinition {
  id: SoundId;
  category: SoundCategory;
  src: string;
  gain: number;
  cooldownMs: number;
  label: string;
  description: string;
}

const baseUrl = typeof import.meta !== "undefined" && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : "/";
const soundPath = (file: string) => `${baseUrl.replace(/\/$/, "")}/sounds/${file}`;

export const SOUND_CATALOG: Record<SoundId, SoundDefinition> = {
  // A. Navegação
  "ui-tab": {
    id: "ui-tab",
    category: "ui",
    src: soundPath("ui-tab.wav"),
    gain: 0.45,
    cooldownMs: 70,
    label: "Troca de aba",
    description: "Toque suave de madeira e papel ao alternar seções.",
  },
  "ui-select": {
    id: "ui-select",
    category: "ui",
    src: soundPath("ui-select.wav"),
    gain: 0.4,
    cooldownMs: 65,
    label: "Seleção de opção",
    description: "Clique mecânico delicado para filtros e seletores.",
  },
  "ui-modal-open": {
    id: "ui-modal-open",
    category: "ui",
    src: soundPath("ui-modal-open.wav"),
    gain: 0.48,
    cooldownMs: 120,
    label: "Abertura de modal",
    description: "Folha abrindo com ressonância quente e discreta.",
  },
  "ui-modal-close": {
    id: "ui-modal-close",
    category: "ui",
    src: soundPath("ui-modal-close.wav"),
    gain: 0.42,
    cooldownMs: 120,
    label: "Fechamento de modal",
    description: "Assentamento suave ao fechar diálogos.",
  },
  "ui-confirm": {
    id: "ui-confirm",
    category: "ui",
    src: soundPath("ui-confirm.wav"),
    gain: 0.5,
    cooldownMs: 120,
    label: "Confirmação de ação",
    description: "Trava mecânica precisa ao salvar ou confirmar.",
  },

  // B. Sessões de estudo
  "session-start": {
    id: "session-start",
    category: "session",
    src: soundPath("session-start.wav"),
    gain: 0.65,
    cooldownMs: 180,
    label: "Iniciar sessão",
    description: "Engate de relojoaria e intervalo ascendente suave.",
  },
  "session-pause": {
    id: "session-pause",
    category: "session",
    src: soundPath("session-pause.wav"),
    gain: 0.6,
    cooldownMs: 180,
    label: "Pausar sessão",
    description: "Intervalo descendente abafado em feltro.",
  },
  "session-resume": {
    id: "session-resume",
    category: "session",
    src: soundPath("session-resume.wav"),
    gain: 0.62,
    cooldownMs: 180,
    label: "Retomar sessão",
    description: "Retomada gentil com clique mecânico discreto.",
  },
  "session-complete": {
    id: "session-complete",
    category: "session",
    src: soundPath("session-complete.wav"),
    gain: 0.72,
    cooldownMs: 250,
    label: "Concluir sessão",
    description: "Acorde de resolução quente em madeira e latão.",
  },
  "session-cancel": {
    id: "session-cancel",
    category: "session",
    src: soundPath("session-cancel.wav"),
    gain: 0.52,
    cooldownMs: 180,
    label: "Cancelar sessão",
    description: "Toque neutro e discreto de descarte ou salto.",
  },

  // C. Timer
  "timer-start": {
    id: "timer-start",
    category: "timer",
    src: soundPath("timer-start.wav"),
    gain: 0.6,
    cooldownMs: 180,
    label: "Início da contagem",
    description: "Pulso de cronômetro de precisão.",
  },
  "timer-pause": {
    id: "timer-pause",
    category: "timer",
    src: soundPath("timer-pause.wav"),
    gain: 0.55,
    cooldownMs: 180,
    label: "Pausa do timer",
    description: "Parada suave do marcador temporal.",
  },
  "timer-resume": {
    id: "timer-resume",
    category: "timer",
    src: soundPath("timer-resume.wav"),
    gain: 0.58,
    cooldownMs: 180,
    label: "Retomada do timer",
    description: "Pulso suave de retomada da contagem.",
  },
  "timer-complete": {
    id: "timer-complete",
    category: "timer",
    src: soundPath("timer-complete.wav"),
    gain: 0.78,
    cooldownMs: 500,
    label: "Finalização do tempo",
    description: "Sino de museu sereno e perceptível ao atingir a meta.",
  },
  "timer-transition": {
    id: "timer-transition",
    category: "timer",
    src: soundPath("timer-transition.wav"),
    gain: 0.68,
    cooldownMs: 300,
    label: "Transição estudo/pausa",
    description: "Quinta harmônica suave para mudança de estado.",
  },

  // D. Coleção de recompensas (ATLAS)
  "atlas-collection-open": {
    id: "atlas-collection-open",
    category: "achievement",
    src: soundPath("atlas-collection-open.wav"),
    gain: 0.55,
    cooldownMs: 250,
    label: "Abrir coleção",
    description: "Abertura de arquivo encadernado e pergaminho.",
  },
  "atlas-card-select": {
    id: "atlas-card-select",
    category: "achievement",
    src: soundPath("atlas-card-select.wav"),
    gain: 0.45,
    cooldownMs: 70,
    label: "Selecionar carta",
    description: "Toque nítido em papel-cartão espesso.",
  },
  "atlas-card-detail": {
    id: "atlas-card-detail",
    category: "achievement",
    src: soundPath("atlas-card-detail.wav"),
    gain: 0.55,
    cooldownMs: 140,
    label: "Detalhes da carta",
    description: "Inspeção de prancha em vitrine.",
  },
  "atlas-unlock": {
    id: "atlas-unlock",
    category: "achievement",
    src: soundPath("atlas-unlock.wav"),
    gain: 0.7,
    cooldownMs: 300,
    label: "Desbloquear conquista",
    description: "Notificação discreta de novo registro no arquivo.",
  },
  "atlas-reveal-common": {
    id: "atlas-reveal-common",
    category: "achievement",
    src: soundPath("atlas-reveal-common.wav"),
    gain: 0.65,
    cooldownMs: 200,
    label: "Revelação Comum",
    description: "Toque curto e delicado.",
  },
  "atlas-reveal-uncommon": {
    id: "atlas-reveal-uncommon",
    category: "achievement",
    src: soundPath("atlas-reveal-uncommon.wav"),
    gain: 0.7,
    cooldownMs: 250,
    label: "Revelação Incomum",
    description: "Dois tons ascendentes.",
  },
  "atlas-reveal-rare": {
    id: "atlas-reveal-rare",
    category: "achievement",
    src: soundPath("atlas-reveal-rare.wav"),
    gain: 0.75,
    cooldownMs: 300,
    label: "Revelação Rara",
    description: "Pequeno acorde de descoberta.",
  },
  "atlas-reveal-epic": {
    id: "atlas-reveal-epic",
    category: "achievement",
    src: soundPath("atlas-reveal-epic.wav"),
    gain: 0.82,
    cooldownMs: 400,
    label: "Revelação Épica",
    description: "Sequência curta com textura atmosférica.",
  },
  "atlas-reveal-legendary": {
    id: "atlas-reveal-legendary",
    category: "achievement",
    src: soundPath("atlas-reveal-legendary.wav"),
    gain: 0.9,
    cooldownMs: 500,
    label: "Revelação Lendária",
    description: "Assinatura sonora exclusiva do ATLAS.",
  },
};

export function rarityToRevealSoundId(rarity: AchievementRarity): SoundId {
  switch (rarity) {
    case "common":
      return "atlas-reveal-common";
    case "uncommon":
      return "atlas-reveal-uncommon";
    case "rare":
      return "atlas-reveal-rare";
    case "epic":
      return "atlas-reveal-epic";
    case "legendary":
      return "atlas-reveal-legendary";
  }
}

