import React from "react";
import type { AchievementRarity } from "../core";

interface AtlasArtworkProps {
  id: string;
  rarity: AchievementRarity;
  unlocked: boolean;
  stroke: string;
  accent: string;
}

/**
 * Gravuras editoriais exclusivas do sistema ATLAS.
 * Cada conquista possui uma composição geométrica/ilustrativa própria,
 * inspirada em instrumentos científicos, cartografia, arquitetura clássica e arquivos.
 */
export const AtlasArtwork: React.FC<AtlasArtworkProps> = ({
  id,
  rarity,
  unlocked,
  stroke,
  accent,
}) => {
  const detailOpacity = unlocked ? 1 : 0.35;
  const fineStroke = 1.15;
  const mainStroke = rarity === "legendary" || rarity === "epic" ? 1.45 : 1.3;

  return (
    <svg
      viewBox="0 0 160 120"
      width="100%"
      height="100%"
      fill="none"
      aria-hidden="true"
      style={{ opacity: detailOpacity }}
    >
      {/* Moldura de gravura comum (sutil em todas, mais rica nas raridades maiores) */}
      <circle cx="80" cy="60" r="48" stroke={stroke} strokeWidth="0.6" strokeDasharray="2 3" opacity="0.4" />
      {(rarity === "rare" || rarity === "epic" || rarity === "legendary") && (
        <circle cx="80" cy="60" r="42" stroke={accent} strokeWidth="0.7" opacity="0.55" />
      )}
      {(rarity === "epic" || rarity === "legendary") && (
        <>
          <line x1="20" y1="60" x2="32" y2="60" stroke={accent} strokeWidth="0.8" opacity="0.6" />
          <line x1="128" y1="60" x2="140" y2="60" stroke={accent} strokeWidth="0.8" opacity="0.6" />
          <line x1="80" y1="6" x2="80" y2="14" stroke={accent} strokeWidth="0.8" opacity="0.6" />
          <line x1="80" y1="106" x2="80" y2="114" stroke={accent} strokeWidth="0.8" opacity="0.6" />
        </>
      )}

      {renderMotif(id, stroke, accent, mainStroke, fineStroke)}
    </svg>
  );
};

function renderMotif(
  id: string,
  stroke: string,
  accent: string,
  main: number,
  fine: number,
): React.ReactNode {
  switch (id) {
    // ---------------------------------------------------------------- Constância
    case "constancy-1d":
      // A Primeira Chama: lamparina clássica com chama viva e halo
      return (
        <g>
          <path d="M58 84 H102 L96 92 H64 Z" stroke={stroke} strokeWidth={main} strokeLinejoin="round" />
          <path d="M64 84 C64 74 96 74 96 84" stroke={stroke} strokeWidth={main} />
          <path d="M96 80 C108 78 110 66 99 66 C94 66 93 72 95 76" stroke={stroke} strokeWidth={fine} />
          <path
            d="M80 28 C88 40 91 50 86 59 C83 64 77 64 74 59 C69 50 72 40 80 28 Z"
            stroke={accent}
            strokeWidth={main}
            strokeLinejoin="round"
          />
          <path d="M80 42 C83 48 84 53 80 58 C76 53 77 48 80 42 Z" stroke={stroke} strokeWidth={fine} />
          <line x1="80" y1="18" x2="80" y2="23" stroke={accent} strokeWidth={fine} />
          <line x1="62" y1="30" x2="66" y2="34" stroke={accent} strokeWidth={fine} />
          <line x1="98" y1="30" x2="94" y2="34" stroke={accent} strokeWidth={fine} />
        </g>
      );

    case "constancy-3d":
      // O Ritmo Inicial: metrônomo com pêndulo e três arcos de cadência
      return (
        <g>
          <path d="M64 94 L73 26 H87 L96 94 Z" stroke={stroke} strokeWidth={main} strokeLinejoin="round" />
          <line x1="68" y1="78" x2="92" y2="78" stroke={stroke} strokeWidth={fine} />
          <line x1="80" y1="78" x2="98" y2="36" stroke={accent} strokeWidth={main} strokeLinecap="round" />
          <circle cx="93" cy="47" r="3.5" stroke={accent} strokeWidth={fine} fill="none" />
          <path d="M60 46 A28 28 0 0 1 100 46" stroke={stroke} strokeWidth={fine} strokeDasharray="2 2" />
          <path d="M54 54 A34 34 0 0 1 106 54" stroke={accent} strokeWidth="0.8" opacity="0.7" />
        </g>
      );

    case "constancy-7d":
      // A Semana Ininterrupta: relógio solar heptagonal
      return (
        <g>
          <polygon
            points="80,22 108,35 115,65 96,91 64,91 45,65 52,35"
            stroke={stroke}
            strokeWidth={main}
            strokeLinejoin="round"
          />
          <circle cx="80" cy="60" r="21" stroke={stroke} strokeWidth={fine} />
          <line x1="80" y1="60" x2="80" y2="34" stroke={accent} strokeWidth={main} strokeLinecap="round" />
          <line x1="80" y1="60" x2="98" y2="68" stroke={stroke} strokeWidth={fine} strokeLinecap="round" />
          <circle cx="80" cy="60" r="2.5" fill={accent} />
        </g>
      );

    case "constancy-15d":
      // A Constância: quadrante lunar (fases da lua)
      return (
        <g>
          <circle cx="80" cy="60" r="24" stroke={stroke} strokeWidth={main} />
          <path d="M80 36 A16 24 0 0 0 80 84 A24 24 0 0 1 80 36 Z" stroke={accent} strokeWidth={main} />
          <circle cx="44" cy="60" r="7" stroke={stroke} strokeWidth={fine} />
          <path d="M44 53 A7 7 0 0 1 44 67" stroke={accent} strokeWidth={fine} />
          <circle cx="116" cy="60" r="7" stroke={stroke} strokeWidth={fine} />
          <circle cx="116" cy="60" r="3" fill={accent} />
          <line x1="80" y1="24" x2="80" y2="31" stroke={stroke} strokeWidth={fine} />
          <line x1="80" y1="89" x2="80" y2="96" stroke={stroke} strokeWidth={fine} />
        </g>
      );

    case "constancy-30d":
      // O Guardião do Hábito: arco clássico com lanterna suspensa
      return (
        <g>
          <path d="M52 94 V54 A28 28 0 0 1 108 54 V94" stroke={stroke} strokeWidth={main} />
          <path d="M58 94 V56 A22 22 0 0 1 102 56 V94" stroke={stroke} strokeWidth={fine} />
          <line x1="46" y1="94" x2="114" y2="94" stroke={stroke} strokeWidth={main} />
          <line x1="80" y1="34" x2="80" y2="48" stroke={stroke} strokeWidth={fine} />
          <polygon points="73,48 87,48 90,64 80,72 70,64" stroke={accent} strokeWidth={main} strokeLinejoin="round" />
          <line x1="80" y1="53" x2="80" y2="63" stroke={accent} strokeWidth={main} strokeLinecap="round" />
        </g>
      );

    case "constancy-60d":
      // A Disciplina Férrea: sextante náutico de precisão
      return (
        <g>
          <path d="M80 26 L50 82 A38 38 0 0 0 110 82 Z" stroke={stroke} strokeWidth={main} strokeLinejoin="round" />
          <path d="M54 76 A32 32 0 0 0 106 76" stroke={accent} strokeWidth={main} />
          <line x1="80" y1="26" x2="88" y2="85" stroke={accent} strokeWidth={fine} />
          <circle cx="80" cy="26" r="3.5" stroke={stroke} strokeWidth={fine} />
          <line x1="65" y1="54" x2="95" y2="54" stroke={stroke} strokeWidth={fine} />
        </g>
      );

    case "constancy-100d":
      // O Centurião do Tempo: obelisco solar coroado por louros
      return (
        <g>
          <polygon points="80,18 87,32 89,90 71,90 73,32" stroke={stroke} strokeWidth={main} strokeLinejoin="round" />
          <line x1="65" y1="90" x2="95" y2="90" stroke={stroke} strokeWidth={main} />
          <line x1="60" y1="96" x2="100" y2="96" stroke={stroke} strokeWidth={main} />
          <path d="M56 76 C46 64 46 46 58 34" stroke={accent} strokeWidth={main} strokeLinecap="round" />
          <path d="M104 76 C114 64 114 46 102 34" stroke={accent} strokeWidth={main} strokeLinecap="round" />
          <circle cx="80" cy="48" r="4" stroke={accent} strokeWidth={fine} />
        </g>
      );

    // ---------------------------------------------------------------- Dedicação
    case "dedication-1h":
      // A Primeira Hora: ampulheta clássica
      return (
        <g>
          <line x1="58" y1="26" x2="102" y2="26" stroke={stroke} strokeWidth={main} strokeLinecap="round" />
          <line x1="58" y1="94" x2="102" y2="94" stroke={stroke} strokeWidth={main} strokeLinecap="round" />
          <path d="M64 26 V38 C64 50 77 56 80 60 C83 56 96 50 96 38 V26" stroke={stroke} strokeWidth={main} />
          <path d="M64 94 V82 C64 70 77 64 80 60 C83 64 96 70 96 82 V94" stroke={stroke} strokeWidth={main} />
          <path d="M70 88 H90 L80 77 Z" stroke={accent} strokeWidth={fine} />
          <line x1="80" y1="60" x2="80" y2="75" stroke={accent} strokeWidth={fine} strokeDasharray="1.5 2" />
        </g>
      );

    case "dedication-5h":
      // O Aprendiz Atento: manuscrito aberto e pena
      return (
        <g>
          <path d="M44 40 C56 36 68 38 80 44 C92 38 104 36 116 40 V86 C104 82 92 84 80 90 C68 84 56 82 44 86 Z" stroke={stroke} strokeWidth={main} strokeLinejoin="round" />
          <line x1="80" y1="44" x2="80" y2="90" stroke={stroke} strokeWidth={fine} />
          <line x1="52" y1="52" x2="72" y2="54" stroke={stroke} strokeWidth={fine} />
          <line x1="52" y1="61" x2="72" y2="63" stroke={stroke} strokeWidth={fine} />
          <line x1="52" y1="70" x2="68" y2="72" stroke={stroke} strokeWidth={fine} />
          <path d="M92 70 L114 26 C110 34 102 42 98 54 L92 70 Z" stroke={accent} strokeWidth={main} strokeLinejoin="round" />
        </g>
      );

    case "dedication-10h":
      // O Artífice do Tempo: cronômetro de bolso e engrenagens
      return (
        <g>
          <circle cx="80" cy="63" r="25" stroke={stroke} strokeWidth={main} />
          <circle cx="80" cy="63" r="20" stroke={stroke} strokeWidth={fine} strokeDasharray="2 3" />
          <rect x="75" y="29" width="10" height="7" rx="1.5" stroke={stroke} strokeWidth={fine} />
          <circle cx="80" cy="25" r="4" stroke={stroke} strokeWidth={fine} />
          <line x1="80" y1="63" x2="80" y2="48" stroke={accent} strokeWidth={main} strokeLinecap="round" />
          <line x1="80" y1="63" x2="92" y2="69" stroke={stroke} strokeWidth={main} strokeLinecap="round" />
          <circle cx="80" cy="63" r="2.5" fill={accent} />
        </g>
      );

    case "dedication-25h":
      // O Ofício Contínuo: pilha de volumes encadernados e marcador
      return (
        <g>
          <rect x="48" y="74" width="64" height="14" rx="2" stroke={stroke} strokeWidth={main} />
          <rect x="52" y="58" width="56" height="14" rx="2" stroke={stroke} strokeWidth={main} />
          <rect x="56" y="42" width="48" height="14" rx="2" stroke={accent} strokeWidth={main} />
          <line x1="60" y1="78" x2="60" y2="84" stroke={stroke} strokeWidth={fine} />
          <line x1="64" y1="62" x2="64" y2="68" stroke={stroke} strokeWidth={fine} />
          <path d="M92 42 V30 L97 34 L102 30 V42" stroke={accent} strokeWidth={fine} />
        </g>
      );

    case "dedication-50h":
      // O Erudito: frontão clássico com colunas e emblema da sabedoria
      return (
        <g>
          <polygon points="44,44 80,24 116,44" stroke={stroke} strokeWidth={main} strokeLinejoin="round" />
          <line x1="48" y1="48" x2="112" y2="48" stroke={stroke} strokeWidth={fine} />
          <line x1="54" y1="48" x2="54" y2="86" stroke={stroke} strokeWidth={main} />
          <line x1="68" y1="48" x2="68" y2="86" stroke={stroke} strokeWidth={fine} />
          <line x1="92" y1="48" x2="92" y2="86" stroke={stroke} strokeWidth={fine} />
          <line x1="106" y1="48" x2="106" y2="86" stroke={stroke} strokeWidth={main} />
          <line x1="44" y1="88" x2="116" y2="88" stroke={stroke} strokeWidth={main} />
          <circle cx="80" cy="66" r="8" stroke={accent} strokeWidth={main} />
          <circle cx="80" cy="66" r="2.5" fill={accent} />
        </g>
      );

    case "dedication-100h":
      // O Mestre de Ofício: esfera armilar sobre pedestal
      return (
        <g>
          <circle cx="80" cy="54" r="24" stroke={stroke} strokeWidth={main} />
          <ellipse cx="80" cy="54" rx="24" ry="9" transform="rotate(-22 80 54)" stroke={accent} strokeWidth={fine} />
          <ellipse cx="80" cy="54" rx="9" ry="24" transform="rotate(-22 80 54)" stroke={stroke} strokeWidth={fine} />
          <line x1="58" y1="72" x2="102" y2="36" stroke={accent} strokeWidth={main} />
          <path d="M80 78 V90 M66 90 H94" stroke={stroke} strokeWidth={main} strokeLinecap="round" />
        </g>
      );

    case "dedication-200h":
      // O Arquivista Maior: estante/gabinete arquivístico com pergaminhos
      return (
        <g>
          <rect x="48" y="28" width="64" height="64" rx="2" stroke={stroke} strokeWidth={main} />
          <line x1="48" y1="49" x2="112" y2="49" stroke={stroke} strokeWidth={fine} />
          <line x1="48" y1="70" x2="112" y2="70" stroke={stroke} strokeWidth={fine} />
          <circle cx="62" cy="39" r="3" stroke={accent} strokeWidth={fine} />
          <circle cx="74" cy="39" r="3" stroke={accent} strokeWidth={fine} />
          <rect x="86" y="34" width="16" height="10" stroke={stroke} strokeWidth={fine} />
          <line x1="58" y1="59" x2="102" y2="59" stroke={accent} strokeWidth={fine} />
          <line x1="58" y1="81" x2="102" y2="81" stroke={stroke} strokeWidth={fine} />
        </g>
      );

    case "dedication-500h":
      // A Grande Obra: compasso arquitetônico, espiral áurea e estrela solar
      return (
        <g>
          <path d="M80 22 L56 92 M80 22 L104 92" stroke={stroke} strokeWidth={main} strokeLinecap="round" />
          <circle cx="80" cy="22" r="4" stroke={accent} strokeWidth={main} />
          <path d="M62 70 A22 22 0 0 0 98 70" stroke={accent} strokeWidth={fine} />
          <polygon points="80,42 84,54 96,54 86,61 90,73 80,66 70,73 74,61 64,54 76,54" stroke={accent} strokeWidth={fine} strokeLinejoin="round" />
        </g>
      );

    // ---------------------------------------------------------------- Ciclos
    case "cycles-1":
      // O Cartógrafo: mapa desenrolado e rosa dos ventos
      return (
        <g>
          <path d="M46 34 H108 C114 34 114 44 108 44 H52 V84 H108 C114 84 114 92 108 92 H46 Z" stroke={stroke} strokeWidth={main} strokeLinejoin="round" />
          <path d="M62 72 C68 58 78 66 86 54 C92 46 98 50 100 48" stroke={accent} strokeWidth={fine} strokeDasharray="3 2" />
          <path d="M80 48 L83 57 L92 60 L83 63 L80 72 L77 63 L68 60 L77 57 Z" stroke={accent} strokeWidth={fine} strokeLinejoin="round" />
        </g>
      );

    case "cycles-3":
      // A Órbita Estável: três órbitas elípticas concêntricas
      return (
        <g>
          <circle cx="80" cy="60" r="6" stroke={accent} strokeWidth={main} />
          <ellipse cx="80" cy="60" rx="34" ry="13" transform="rotate(20 80 60)" stroke={stroke} strokeWidth={fine} />
          <ellipse cx="80" cy="60" rx="34" ry="13" transform="rotate(-35 80 60)" stroke={stroke} strokeWidth={fine} />
          <ellipse cx="80" cy="60" rx="14" ry="34" transform="rotate(10 80 60)" stroke={accent} strokeWidth={fine} />
          <circle cx="109" cy="70" r="2.5" fill={accent} />
          <circle cx="54" cy="42" r="2.5" fill={stroke} />
        </g>
      );

    case "cycles-5":
      // O Navegador: astrolábio clássico
      return (
        <g>
          <circle cx="80" cy="62" r="26" stroke={stroke} strokeWidth={main} />
          <circle cx="80" cy="62" r="18" stroke={stroke} strokeWidth={fine} />
          <circle cx="80" cy="31" r="4.5" stroke={stroke} strokeWidth={fine} />
          <line x1="58" y1="84" x2="102" y2="40" stroke={accent} strokeWidth={main} strokeLinecap="round" />
          <circle cx="80" cy="62" r="3" fill={accent} />
          <path d="M68 52 A15 15 0 0 1 92 52" stroke={accent} strokeWidth={fine} />
        </g>
      );

    case "cycles-10":
      // O Arquiteto de Ciclos: esquadro de desenho e cúpula geométrica
      return (
        <g>
          <path d="M48 86 H112 V80 H56 V32 H48 Z" stroke={stroke} strokeWidth={main} strokeLinejoin="round" />
          <path d="M66 76 V56 A20 20 0 0 1 106 56 V76" stroke={accent} strokeWidth={main} />
          <line x1="86" y1="36" x2="86" y2="76" stroke={stroke} strokeWidth={fine} strokeDasharray="2 2" />
          <line x1="66" y1="56" x2="106" y2="56" stroke={stroke} strokeWidth={fine} />
        </g>
      );

    case "cycles-25":
      // O Cronista: códice/livro selado com fita heráldica
      return (
        <g>
          <rect x="52" y="28" width="56" height="64" rx="3" stroke={stroke} strokeWidth={main} />
          <line x1="62" y1="28" x2="62" y2="92" stroke={stroke} strokeWidth={fine} />
          <circle cx="85" cy="56" r="11" stroke={accent} strokeWidth={main} />
          <path d="M80 66 L76 84 L85 78 L94 84 L90 66" stroke={accent} strokeWidth={fine} strokeLinejoin="round" />
          <line x1="70" y1="39" x2="98" y2="39" stroke={stroke} strokeWidth={fine} />
        </g>
      );

    case "cycles-50":
      // O Soberano do Método: planetário celeste com anel meridiano
      return (
        <g>
          <circle cx="80" cy="60" r="28" stroke={accent} strokeWidth={main} />
          <circle cx="80" cy="60" r="18" stroke={stroke} strokeWidth={fine} />
          <ellipse cx="80" cy="60" rx="28" ry="10" stroke={stroke} strokeWidth={fine} />
          <circle cx="80" cy="60" r="4" fill={accent} />
          <path d="M68 26 L74 32 L80 24 L86 32 L92 26" stroke={accent} strokeWidth={main} strokeLinejoin="round" />
        </g>
      );

    // ---------------------------------------------------------------- Especiais
    case "special-all-subjects-cycle":
      // O Polímata: poliedro/prisma facetado unindo múltiplos eixos
      return (
        <g>
          <polygon points="80,24 110,45 99,84 61,84 50,45" stroke={stroke} strokeWidth={main} strokeLinejoin="round" />
          <polygon points="80,38 98,52 91,74 69,74 62,52" stroke={accent} strokeWidth={fine} strokeLinejoin="round" />
          <line x1="80" y1="24" x2="80" y2="38" stroke={stroke} strokeWidth={fine} />
          <line x1="110" y1="45" x2="98" y2="52" stroke={stroke} strokeWidth={fine} />
          <line x1="99" y1="84" x2="91" y2="74" stroke={stroke} strokeWidth={fine} />
          <line x1="61" y1="84" x2="69" y2="74" stroke={stroke} strokeWidth={fine} />
          <line x1="50" y1="45" x2="62" y2="52" stroke={stroke} strokeWidth={fine} />
        </g>
      );

    case "special-subject-10-sessions":
      // A Imersão: lente óptica com anéis concêntricos de profundidade
      return (
        <g>
          <circle cx="80" cy="60" r="26" stroke={stroke} strokeWidth={main} />
          <circle cx="80" cy="60" r="18" stroke={accent} strokeWidth={fine} />
          <circle cx="80" cy="60" r="10" stroke={stroke} strokeWidth={fine} />
          <circle cx="80" cy="60" r="3" fill={accent} />
          <line x1="46" y1="60" x2="54" y2="60" stroke={stroke} strokeWidth={fine} />
          <line x1="106" y1="60" x2="114" y2="60" stroke={stroke} strokeWidth={fine} />
        </g>
      );

    case "special-subject-10h":
      // O Especialista: lupa de precisão sobre gravura botânica/folha
      return (
        <g>
          <circle cx="74" cy="54" r="21" stroke={stroke} strokeWidth={main} />
          <line x1="89" y1="69" x2="108" y2="88" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
          <path d="M64 62 C68 48 76 42 84 44 C82 56 76 62 64 62 Z" stroke={accent} strokeWidth={main} strokeLinejoin="round" />
          <line x1="64" y1="62" x2="80" y2="48" stroke={accent} strokeWidth={fine} />
        </g>
      );

    case "special-perfect-cycle":
      // O Ciclo Íntegro: anel contínuo graduado com marcações cardinais exatas
      return (
        <g>
          <circle cx="80" cy="60" r="26" stroke={accent} strokeWidth={main} />
          <circle cx="80" cy="60" r="20" stroke={stroke} strokeWidth={fine} />
          <path d="M69 60 L76 67 L92 51" stroke={accent} strokeWidth={main} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="80" y1="28" x2="80" y2="34" stroke={stroke} strokeWidth={main} />
          <line x1="80" y1="86" x2="80" y2="92" stroke={stroke} strokeWidth={main} />
          <line x1="48" y1="60" x2="54" y2="60" stroke={stroke} strokeWidth={main} />
          <line x1="106" y1="60" x2="112" y2="60" stroke={stroke} strokeWidth={main} />
        </g>
      );

    default:
      return <circle cx="80" cy="60" r="20" stroke={stroke} strokeWidth={main} />;
  }
}

