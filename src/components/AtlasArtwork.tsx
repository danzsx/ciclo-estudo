import React from "react";
import type { AchievementRarity } from "../core";

interface AtlasArtworkProps {
  id: string;
  rarity: AchievementRarity;
  unlocked: boolean;
  stroke: string;
  accent: string;
  /** Ativa micro-animações contextuais discretas (apenas na inspeção/revelação). */
  animate?: boolean;
}

/**
 * Cartas que possuem prancha raster exclusiva em `public/atlas/<id>.jpg`.
 * As demais utilizam pranchas de gravura naturalista detalhadas em camadas SVG.
 */
const RASTER_ARTWORK_IDS = new Set<string>([
  "constancy-1d",
  "constancy-3d",
  "constancy-7d",
  "constancy-15d",
  "constancy-30d",
  "constancy-60d",
  "constancy-100d",
  "dedication-1h",
  "dedication-5h",
  "dedication-10h",
  "dedication-100h",
  "dedication-500h",
]);

const RARITY_PLATE_PALETTE: Record<
  AchievementRarity,
  { bgDark: string; bgMid: string; rim: string; ray: string; furMain: string; furLight: string }
> = {
  common: {
    bgDark: "#15110e",
    bgMid: "#292018",
    rim: "#d4956a",
    ray: "rgba(212, 149, 106, 0.16)",
    furMain: "#7c5338",
    furLight: "#c78b5e",
  },
  uncommon: {
    bgDark: "#091812",
    bgMid: "#143024",
    rim: "#63c798",
    ray: "rgba(99, 199, 152, 0.16)",
    furMain: "#386b54",
    furLight: "#7cd4a9",
  },
  rare: {
    bgDark: "#08101f",
    bgMid: "#132645",
    rim: "#c8d6e5",
    ray: "rgba(200, 214, 229, 0.16)",
    furMain: "#3c587a",
    furLight: "#d8e4f2",
  },
  epic: {
    bgDark: "#11091f",
    bgMid: "#271547",
    rim: "#e0b85c",
    ray: "rgba(224, 184, 92, 0.2)",
    furMain: "#5e438c",
    furLight: "#f0cf7b",
  },
  legendary: {
    bgDark: "#050807",
    bgMid: "#0d221b",
    rim: "#f3d97d",
    ray: "rgba(243, 217, 125, 0.24)",
    furMain: "#8a6824",
    furLight: "#fae496",
  },
};

export const AtlasArtwork: React.FC<AtlasArtworkProps> = ({
  id,
  rarity,
  unlocked,
  animate = false,
}) => {
  const isAnimated = animate && unlocked;

  if (RASTER_ARTWORK_IDS.has(id)) {
    const src = `${import.meta.env.BASE_URL}atlas/${id}.jpg`;
    const needsCrop = id === "dedication-5h";

    return (
      <div
        className={isAnimated ? "atlas-art--animated" : undefined}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          backgroundColor: RARITY_PLATE_PALETTE[rarity].bgDark,
        }}
      >
        <img
          src={src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className={isAnimated ? "atlas-raster-breath" : undefined}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 32%",
            display: "block",
            transform: needsCrop ? "scale(1.12)" : "scale(1.02)",
            filter: unlocked
              ? "contrast(1.04) saturate(1.06)"
              : "brightness(0) contrast(1.3)",
            opacity: unlocked ? 1 : 0.44,
            transition: "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s ease",
          }}
        />
        {/* Luz atmosférica discreta quando em inspeção */}
        {isAnimated && (
          <div
            aria-hidden="true"
            className="atlas-ambient-motes"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
            }}
          />
        )}
        {/* Vinheta editorial para integrar a prancha à moldura */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: unlocked
              ? "radial-gradient(circle at 50% 42%, transparent 48%, rgba(5, 8, 9, 0.56) 100%)"
              : "radial-gradient(circle at 50% 45%, rgba(16, 22, 26, 0.15) 20%, rgba(5, 8, 10, 0.82) 100%)",
          }}
        />
      </div>
    );
  }

  const pal = RARITY_PLATE_PALETTE[rarity];
  const uid = `plate-${id}`;

  return (
    <svg
      viewBox="0 0 320 240"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={isAnimated ? "atlas-art--animated" : undefined}
      style={{
        display: "block",
        filter: unlocked ? "none" : "brightness(0) contrast(1.25)",
        opacity: unlocked ? 1 : 0.44,
      }}
    >
      <defs>
        <radialGradient id={`${uid}-bg`} cx="52%" cy="44%" r="68%">
          <stop offset="0%" stopColor={pal.bgMid} />
          <stop offset="100%" stopColor={pal.bgDark} />
        </radialGradient>

        <linearGradient id={`${uid}-ray`} x1="15%" y1="0%" x2="75%" y2="100%">
          <stop offset="0%" stopColor={pal.ray} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>

        <linearGradient id={`${uid}-body`} x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stopColor={pal.furLight} />
          <stop offset="55%" stopColor={pal.furMain} />
          <stop offset="100%" stopColor={pal.bgDark} />
        </linearGradient>

        <pattern id={`${uid}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#000000" strokeWidth="0.7" opacity="0.22" />
        </pattern>
      </defs>

      {/* Fundo saturado escuro */}
      <rect width="320" height="240" fill={`url(#${uid}-bg)`} />

      {/* Feixes volumétricos de chiaroscuro */}
      <polygon points="35,0 135,0 245,240 120,240" fill={`url(#${uid}-ray)`} />
      <polygon points="155,0 225,0 305,240 240,240" fill={`url(#${uid}-ray)`} opacity="0.6" />

      {/* Silhuetas botânicas de fundo */}
      <g fill={pal.bgDark} opacity="0.55" className="atlas-svg-flora">
        <path d="M0 240 C15 190 35 160 65 135 C48 168 38 198 32 240 Z" />
        <path d="M255 240 C268 188 286 155 320 128 L320 240 Z" />
        <path d="M12 180 Q32 152 60 148 Q38 166 20 186 Z" />
        <path d="M298 165 Q272 138 242 138 Q268 156 288 174 Z" />
      </g>

      {/* Prancha do Animal (65-75% da área) */}
      <g className="atlas-svg-animal">
        {renderEngravedAnimal(id, pal, uid)}
      </g>

      {/* Textura de gravura em hachura + vinheta */}
      <rect width="320" height="240" fill={`url(#${uid}-hatch)`} opacity="0.55" />
      <rect
        width="320"
        height="240"
        fill="none"
        stroke="rgba(0,0,0,0.55)"
        strokeWidth="28"
        opacity="0.65"
      />
    </svg>
  );
};

function renderEngravedAnimal(
  id: string,
  pal: { bgDark: string; bgMid: string; rim: string; ray: string; furMain: string; furLight: string },
  uid: string,
): React.ReactNode {
  const fillBody = `url(#${uid}-body)`;

  switch (id) {
    case "dedication-25h":
      // Tamanduá-mirim escalando tronco
      return (
        <g>
          <path d="M52 240 C66 170 86 105 112 20 L146 20 C122 105 104 172 92 240 Z" fill="#17241d" stroke={pal.rim} strokeWidth="0.8" opacity="0.85" />
          {/* Cauda preênsil e corpo */}
          <path d="M120 185 C102 208 118 228 148 218 C134 214 132 198 140 182 Z" fill={pal.furMain} stroke={pal.rim} strokeWidth="1" />
          <path
            d="M128 175 C115 142 122 98 154 78 C178 64 205 64 226 52 C238 46 250 48 256 56 C244 66 226 74 212 86 C206 112 194 148 176 174 Z"
            fill={fillBody}
            stroke={pal.rim}
            strokeWidth="1.3"
          />
          {/* Colete escuro característico */}
          <path d="M138 158 C134 128 148 96 175 84 C188 102 184 140 168 164 Z" fill={pal.bgDark} opacity="0.88" />
          <circle cx="222" cy="60" r="3.2" fill={pal.rim} />
          <circle cx="222.5" cy="60" r="1.4" fill="#090c0b" />
        </g>
      );

    case "dedication-50h":
      // Boto-cor-de-rosa emergindo das águas noturnas
      return (
        <g>
          <path d="M0 176 Q80 162 160 175 T320 172 L320 240 L0 240 Z" fill="#07101d" opacity="0.9" />
          <path
            d="M58 178 C66 116 112 68 176 62 C214 58 242 78 262 104 C278 114 290 120 294 126 C276 130 258 128 244 126 C224 146 196 164 166 178 Z"
            fill={fillBody}
            stroke={pal.rim}
            strokeWidth="1.35"
          />
          {/* Nadadeira dorsal e peitoral */}
          <path d="M144 68 C154 48 172 46 184 62 Z" fill={pal.furMain} stroke={pal.rim} strokeWidth="1" />
          <path d="M174 134 C156 152 142 166 150 182 C172 172 188 154 194 138 Z" fill={pal.furLight} opacity="0.8" />
          <circle cx="242" cy="103" r="3" fill={pal.rim} />
          <path d="M40 184 Q160 170 280 186" stroke={pal.rim} strokeWidth="1.1" fill="none" opacity="0.6" />
          <path d="M70 198 Q165 188 260 200" stroke={pal.rim} strokeWidth="0.7" fill="none" opacity="0.4" />
        </g>
      );

    case "dedication-200h":
      // Tatu-canastra com placas blindadas em hachura
      return (
        <g>
          <path d="M24 205 L296 205" stroke={pal.rim} strokeWidth="0.9" opacity="0.45" />
          <path
            d="M52 188 C60 122 106 76 168 74 C216 74 248 96 264 128 C276 136 286 146 282 158 C264 162 248 160 236 164 L228 196 L204 196 L198 172 L132 172 L124 196 L98 196 L92 176 L52 188 Z"
            fill={fillBody}
            stroke={pal.rim}
            strokeWidth="1.4"
          />
          {/* Faixas da carapaça */}
          {[104, 122, 140, 158, 176, 194].map((x) => (
            <path key={x} d={`M${x} 82 Q${x - 10} 126 ${x + 4} 168`} stroke={pal.bgDark} strokeWidth="2.4" fill="none" opacity="0.75" />
          ))}
          <circle cx="256" cy="138" r="3.2" fill={pal.rim} />
          <circle cx="256" cy="138" r="1.4" fill="#09070d" />
        </g>
      );

    case "cycles-1":
      // Arara-azul em galho tropical
      return (
        <g>
          <path d="M36 196 Q160 176 286 202" stroke={pal.furMain} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path
            d="M150 40 C178 36 198 54 194 82 C192 106 184 134 166 162 L134 224 L118 220 L134 156 C126 122 130 68 150 40 Z"
            fill={fillBody}
            stroke={pal.rim}
            strokeWidth="1.35"
          />
          {/* Bico curvo e anel ocular */}
          <path d="M188 52 C214 50 222 72 206 86 C202 74 194 68 184 68 Z" fill={pal.bgDark} stroke={pal.rim} strokeWidth="1.1" />
          <circle cx="176" cy="58" r="6" fill="none" stroke="#f0c954" strokeWidth="1.6" />
          <circle cx="176" cy="58" r="2.5" fill={pal.rim} />
          <path d="M142 96 C158 110 166 136 154 164" stroke={pal.rim} strokeWidth="1" fill="none" opacity="0.65" />
        </g>
      );

    case "cycles-3":
      // Tartaruga-da-amazônia sobre tronco
      return (
        <g>
          <path d="M32 184 Q160 168 290 188 L290 212 Q160 196 32 212 Z" fill="#13261d" stroke={pal.rim} strokeWidth="0.9" />
          <path
            d="M72 170 C74 108 116 74 166 76 C210 78 238 110 240 164 C200 174 114 176 72 170 Z"
            fill={fillBody}
            stroke={pal.rim}
            strokeWidth="1.4"
          />
          {/* Pescoço e cabeça */}
          <path d="M234 138 C258 128 278 124 286 134 C282 148 262 154 238 156 Z" fill={pal.furMain} stroke={pal.rim} strokeWidth="1.2" />
          {/* Escudos do casco */}
          <path d="M118 92 L162 86 L202 98 L194 142 L126 144 Z" fill="none" stroke={pal.bgDark} strokeWidth="2" opacity="0.7" />
          <line x1="160" y1="86" x2="160" y2="144" stroke={pal.bgDark} strokeWidth="1.8" opacity="0.65" />
          <circle cx="272" cy="134" r="2.6" fill={pal.rim} />
        </g>
      );

    case "cycles-5":
      // Gavião-real-de-penacho
      return (
        <g>
          <path d="M74 214 L246 196" stroke={pal.furMain} strokeWidth="5" strokeLinecap="round" />
          {/* Penacho */}
          <path d="M150 48 L136 22 L156 38 L166 18 L170 46 Z" fill={pal.furLight} stroke={pal.rim} strokeWidth="1" />
          <path
            d="M140 50 C166 42 188 60 186 92 C188 122 180 156 164 190 L132 192 C122 150 124 92 140 50 Z"
            fill={fillBody}
            stroke={pal.rim}
            strokeWidth="1.35"
          />
          <path d="M182 58 C202 58 208 72 194 82 L180 74 Z" fill={pal.bgDark} stroke={pal.rim} strokeWidth="1.1" />
          <circle cx="172" cy="62" r="3" fill={pal.rim} />
          <path d="M136 106 L176 106 M134 122 L174 122 M136 138 L170 138" stroke={pal.bgDark} strokeWidth="1.5" opacity="0.55" />
        </g>
      );

    case "cycles-10":
      // Suçuarana (Puma concolor)
      return (
        <g>
          <path d="M30 202 L145 182 L290 204 L290 240 L30 240 Z" fill="#180e2b" opacity="0.85" />
          <path
            d="M72 186 C76 136 106 104 148 96 C174 80 198 62 222 64 C240 66 254 80 256 96 C248 112 232 118 220 122 C214 146 206 172 196 190 Z"
            fill={fillBody}
            stroke={pal.rim}
            strokeWidth="1.4"
          />
          <path d="M196 66 L204 46 L218 62 M226 64 L238 48 L244 68" fill={pal.furMain} stroke={pal.rim} strokeWidth="1.1" />
          <circle cx="234" cy="84" r="3.4" fill={pal.rim} />
          <circle cx="234" cy="84" r="1.4" fill="#10081c" />
        </g>
      );

    case "cycles-25":
      // Anta-brasileira
      return (
        <g>
          <path d="M0 194 Q160 184 320 196 L320 240 L0 240 Z" fill="#120921" opacity="0.9" />
          <path
            d="M66 184 C68 126 108 86 164 84 C208 82 244 98 264 124 C276 138 278 156 266 164 C252 168 238 158 226 156 L216 196 L190 196 L186 168 L126 168 L118 196 L92 196 L88 174 Z"
            fill={fillBody}
            stroke={pal.rim}
            strokeWidth="1.4"
          />
          {/* Crina característica */}
          <path d="M158 84 C184 72 216 76 238 94" stroke={pal.rim} strokeWidth="3.5" fill="none" opacity="0.7" />
          <circle cx="244" cy="122" r="3.2" fill={pal.rim} />
        </g>
      );

    case "cycles-50":
      // Jaburu (Tuiuiú) — Lendário
      return (
        <g>
          <path d="M0 204 Q160 194 320 206 L320 240 L0 240 Z" fill="#07120e" opacity="0.9" />
          {/* Corpo branco/dourado e pescoço preto com faixa carmesim */}
          <path d="M98 182 C102 128 134 94 176 96 C206 98 222 124 214 156 C202 180 144 192 98 182 Z" fill={fillBody} stroke={pal.rim} strokeWidth="1.4" />
          <path d="M168 102 C172 72 184 48 202 44 C216 42 224 54 222 68 C210 74 196 86 190 108 Z" fill="#0c1210" stroke={pal.rim} strokeWidth="1.2" />
          {/* Faixa vermelha do Jaburu */}
          <path d="M172 96 C182 92 192 96 194 106 C184 110 174 106 172 96 Z" fill="#a83232" stroke={pal.rim} strokeWidth="0.9" />
          {/* Bico longo imponente */}
          <path d="M218 52 L286 64 L220 68 Z" fill="#0c1210" stroke={pal.rim} strokeWidth="1.2" />
          <circle cx="210" cy="54" r="3" fill={pal.rim} />
        </g>
      );

    case "special-all-subjects-cycle":
      // Ararajuba (Guaruba guarouba)
      return (
        <g>
          <path d="M40 192 Q160 172 280 198" stroke={pal.furMain} strokeWidth="5.5" fill="none" />
          <path
            d="M144 44 C170 38 190 54 188 82 C186 108 176 138 158 164 L128 222 L114 216 L130 156 C124 120 128 70 144 44 Z"
            fill={fillBody}
            stroke={pal.rim}
            strokeWidth="1.35"
          />
          <path d="M184 54 C208 54 214 72 198 84 L182 70 Z" fill="#d9c6a3" stroke={pal.rim} strokeWidth="1.1" />
          <circle cx="172" cy="60" r="3" fill={pal.rim} />
          <path d="M138 104 C156 122 164 148 152 174" stroke="#48a878" strokeWidth="2.5" fill="none" opacity="0.85" />
        </g>
      );

    case "special-subject-10-sessions":
      // Preguiça-de-coleira
      return (
        <g>
          <path d="M36 74 Q160 56 284 82" stroke="#182b22" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path
            d="M112 82 C104 124 114 166 146 184 C180 196 210 174 214 134 C216 104 202 84 182 82 C164 96 142 96 112 82 Z"
            fill={fillBody}
            stroke={pal.rim}
            strokeWidth="1.35"
          />
          {/* Coleira escura e rosto claro */}
          <path d="M126 116 C140 102 162 102 172 118 C164 140 138 142 126 116 Z" fill="#d8e3dc" opacity="0.85" />
          <path d="M116 136 C132 162 172 166 196 140" stroke={pal.bgDark} strokeWidth="6" fill="none" opacity="0.8" />
          <circle cx="142" cy="116" r="2.6" fill={pal.bgDark} />
          <circle cx="158" cy="116" r="2.6" fill={pal.bgDark} />
        </g>
      );

    case "special-subject-10h":
      // Gavião-carijó
      return (
        <g>
          <path d="M64 208 L256 192" stroke={pal.furMain} strokeWidth="5" strokeLinecap="round" />
          <path
            d="M138 48 C166 40 188 58 186 90 C186 122 178 156 162 188 L130 190 C122 146 124 92 138 48 Z"
            fill={fillBody}
            stroke={pal.rim}
            strokeWidth="1.35"
          />
          <path d="M182 56 C202 58 206 72 192 80 L180 72 Z" fill={pal.bgDark} stroke={pal.rim} strokeWidth="1.1" />
          <circle cx="172" cy="60" r="3" fill={pal.rim} />
          <path d="M134 108 L174 108 M132 124 L172 124 M134 140 L168 140" stroke={pal.rim} strokeWidth="1.2" opacity="0.5" />
        </g>
      );

    case "special-perfect-cycle":
    default:
      // Garça-branca-grande
      return (
        <g>
          <path d="M0 202 Q160 194 320 204 L320 240 L0 240 Z" fill="#120921" opacity="0.9" />
          <path
            d="M110 180 C112 136 142 110 176 118 C196 122 204 148 188 174 C166 190 132 192 110 180 Z"
            fill={fillBody}
            stroke={pal.rim}
            strokeWidth="1.35"
          />
          {/* Pescoço em S elegante */}
          <path
            d="M168 122 C184 96 162 66 184 44 C196 34 212 38 214 52 C200 58 192 84 198 110"
            fill="none"
            stroke={pal.furLight}
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path d="M212 46 L264 52 L212 56 Z" fill="#e6b84d" stroke={pal.rim} strokeWidth="0.9" />
          <circle cx="204" cy="46" r="2.6" fill="#11091f" />
        </g>
      );

    case "album-cerrado":
    case "album-amazonia":
    case "album-mata-atlantica":
    case "album-aves":
    case "album-predadores":
      return (
        <g>
          {/* Selo Honorário de Coleção Temática */}
          <circle cx="160" cy="120" r="70" fill="none" stroke={pal.rim} strokeWidth="1.3" opacity="0.45" strokeDasharray="4 4" />
          <circle cx="160" cy="120" r="56" fill={pal.bgDark} fillOpacity="0.6" stroke={pal.rim} strokeWidth="1.6" />
          <circle cx="160" cy="120" r="46" fill="none" stroke={pal.furLight} strokeWidth="0.8" opacity="0.6" />
          <path
            d="M160 62 L171 104 L214 120 L171 136 L160 178 L149 136 L106 120 L149 104 Z"
            fill={fillBody}
            stroke={pal.rim}
            strokeWidth="1.2"
          />
          <circle cx="160" cy="120" r="9" fill={pal.bgDark} stroke={pal.rim} strokeWidth="1.4" />
          <circle cx="160" cy="120" r="3.5" fill={pal.rim} />
        </g>
      );
  }
}
