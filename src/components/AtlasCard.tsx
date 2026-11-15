import React, { useState } from "react";
import { Lock, Compass, RotateCw, MapPin, Sparkles, Calendar, Tag, Award } from "lucide-react";
import {
  ATLAS_COLLECTIONS,
  CATEGORY_META,
  RARITY_META,
  formatCardNumber,
  type AchievementDefinition,
  type AchievementRarity,
  type UnlockedAchievement,
} from "../core";
import { AtlasArtwork } from "./AtlasArtwork";
import { useCardTilt } from "./useCardTilt";
import { soundEngine } from "../audio";

export interface RarityStyle {
  border: string;
  innerBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  accent: string;
  stroke: string;
  frameBg: string;
  cardBg: string;
  titleColor: string;
  scientificColor: string;
  bodyColor: string;
  mutedColor: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  dividerColor: string;
}

export const RARITY_STYLES: Record<AchievementRarity, RarityStyle> = {
  common: {
    border: "rgba(194, 125, 72, 0.52)",
    innerBorder: "rgba(194, 125, 72, 0.24)",
    badgeBg: "rgba(194, 125, 72, 0.14)",
    badgeText: "#e2a97e",
    badgeBorder: "rgba(194, 125, 72, 0.42)",
    accent: "#c98653",
    stroke: "#e2a97e",
    frameBg: "#15110e",
    cardBg: "linear-gradient(168deg, #1b1612 0%, #261e17 100%)",
    titleColor: "#f5ebe1",
    scientificColor: "#cfa686",
    bodyColor: "#cabcb0",
    mutedColor: "#9c8b7d",
    pillBg: "rgba(194, 125, 72, 0.1)",
    pillBorder: "rgba(194, 125, 72, 0.25)",
    pillText: "#dfad87",
    dividerColor: "rgba(194, 125, 72, 0.18)",
  },
  uncommon: {
    border: "rgba(82, 183, 136, 0.56)",
    innerBorder: "rgba(82, 183, 136, 0.28)",
    badgeBg: "rgba(82, 183, 136, 0.14)",
    badgeText: "#8ce0b7",
    badgeBorder: "rgba(82, 183, 136, 0.42)",
    accent: "#52b788",
    stroke: "#8ce0b7",
    frameBg: "#091812",
    cardBg: "linear-gradient(168deg, #0b1c15 0%, #132c21 100%)",
    titleColor: "#ebf7f1",
    scientificColor: "#8ed4b2",
    bodyColor: "#b8d1c5",
    mutedColor: "#7ea392",
    pillBg: "rgba(82, 183, 136, 0.1)",
    pillBorder: "rgba(82, 183, 136, 0.26)",
    pillText: "#93e0bb",
    dividerColor: "rgba(82, 183, 136, 0.18)",
  },
  rare: {
    border: "rgba(184, 204, 224, 0.56)",
    innerBorder: "rgba(184, 204, 224, 0.28)",
    badgeBg: "rgba(184, 204, 224, 0.14)",
    badgeText: "#dce8f5",
    badgeBorder: "rgba(184, 204, 224, 0.42)",
    accent: "#b8cce0",
    stroke: "#dce8f5",
    frameBg: "#08101f",
    cardBg: "linear-gradient(168deg, #0a1426 0%, #132542 100%)",
    titleColor: "#eef4fa",
    scientificColor: "#a9c2db",
    bodyColor: "#b9c9db",
    mutedColor: "#7e95b0",
    pillBg: "rgba(184, 204, 224, 0.1)",
    pillBorder: "rgba(184, 204, 224, 0.26)",
    pillText: "#d2e1f0",
    dividerColor: "rgba(184, 204, 224, 0.18)",
  },
  epic: {
    border: "rgba(212, 175, 55, 0.62)",
    innerBorder: "rgba(168, 121, 255, 0.34)",
    badgeBg: "rgba(168, 121, 255, 0.16)",
    badgeText: "#e5c975",
    badgeBorder: "rgba(212, 175, 55, 0.46)",
    accent: "#d4af37",
    stroke: "#e5c975",
    frameBg: "#11091f",
    cardBg: "linear-gradient(168deg, #140a24 0%, #24133d 100%)",
    titleColor: "#f7f1ff",
    scientificColor: "#d6b865",
    bodyColor: "#cfc3e3",
    mutedColor: "#9c8bb8",
    pillBg: "rgba(168, 121, 255, 0.12)",
    pillBorder: "rgba(212, 175, 55, 0.28)",
    pillText: "#e3c9ff",
    dividerColor: "rgba(212, 175, 55, 0.22)",
  },
  legendary: {
    border: "rgba(243, 217, 125, 0.78)",
    innerBorder: "rgba(243, 217, 125, 0.38)",
    badgeBg: "rgba(212, 175, 55, 0.18)",
    badgeText: "#f7df8b",
    badgeBorder: "rgba(243, 217, 125, 0.56)",
    accent: "#f3d97d",
    stroke: "#f7df8b",
    frameBg: "#050807",
    cardBg: "linear-gradient(165deg, #060908 0%, #0d211a 58%, #070a09 100%)",
    titleColor: "#fdf7e3",
    scientificColor: "#e6c767",
    bodyColor: "#cfd8d3",
    mutedColor: "#96a89f",
    pillBg: "rgba(243, 217, 125, 0.11)",
    pillBorder: "rgba(243, 217, 125, 0.32)",
    pillText: "#f5dc86",
    dividerColor: "rgba(243, 217, 125, 0.24)",
  },
};

const CornerFiligree: React.FC<{
  position: "tl" | "tr" | "bl" | "br";
  color: string;
  elaborate: boolean;
}> = ({ position, color, elaborate }) => {
  const posStyle: React.CSSProperties = {
    position: "absolute",
    width: elaborate ? 16 : 10,
    height: elaborate ? 16 : 10,
    pointerEvents: "none",
    opacity: elaborate ? 0.85 : 0.65,
    ...(position === "tl" ? { top: 5, left: 5 } : {}),
    ...(position === "tr" ? { top: 5, right: 5, transform: "scaleX(-1)" } : {}),
    ...(position === "bl" ? { bottom: 5, left: 5, transform: "scaleY(-1)" } : {}),
    ...(position === "br" ? { bottom: 5, right: 5, transform: "scale(-1, -1)" } : {}),
  };

  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" style={posStyle}>
      <path d="M1 12 V1 H12" stroke={color} strokeWidth="1.4" />
      {elaborate && (
        <>
          <path d="M4 9 V4 H9" stroke={color} strokeWidth="0.9" opacity="0.7" />
          <circle cx="4" cy="4" r="1.1" fill={color} />
        </>
      )}
    </svg>
  );
};

export const AtlasIllustrationFrame: React.FC<{
  definition: AchievementDefinition;
  unlocked: boolean;
  large?: boolean;
  animate?: boolean;
  parallax?: boolean;
}> = ({ definition, unlocked, large = false, animate = false, parallax = false }) => {
  const style = RARITY_STYLES[definition.rarity];
  const isHighRarity = definition.rarity === "epic" || definition.rarity === "legendary";
  const hasOrnaments = definition.rarity !== "common";
  const height = large ? 216 : 162;

  return (
    <div
      data-illustration={definition.illustration}
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: "calc(var(--radius-sm) + 2px)",
        background: unlocked ? style.frameBg : "#0d1114",
        border: `1px solid ${unlocked ? style.innerBorder : "rgba(255, 255, 255, 0.08)"}`,
        overflow: "hidden",
        boxShadow: unlocked ? "inset 0 0 22px rgba(0,0,0,0.65)" : "inset 0 0 18px rgba(0,0,0,0.75)",
      }}
    >
      {/* Natural History Illustration Plate */}
      <div className={parallax ? "atlas-layer-animal" : undefined} style={{ width: "100%", height: "100%" }}>
        <AtlasArtwork
          id={definition.id}
          rarity={definition.rarity}
          unlocked={unlocked}
          stroke={unlocked ? style.stroke : "#6b777d"}
          accent={unlocked ? style.accent : "#6b777d"}
          animate={animate}
        />
      </div>

      {/* Corner ornaments */}
      {unlocked && hasOrnaments && (
        <>
          <CornerFiligree position="tl" color={style.accent} elaborate={isHighRarity} />
          <CornerFiligree position="tr" color={style.accent} elaborate={isHighRarity} />
          <CornerFiligree position="bl" color={style.accent} elaborate={isHighRarity} />
          <CornerFiligree position="br" color={style.accent} elaborate={isHighRarity} />
        </>
      )}

      {/* Locked Veil over mysterious animal silhouette */}
      {!unlocked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at 50% 50%, rgba(10, 14, 17, 0.12), rgba(7, 10, 13, 0.55) 100%)",
          }}
        >
          <div
            style={{
              width: large ? 46 : 36,
              height: large ? 46 : 36,
              borderRadius: "50%",
              backgroundColor: "rgba(12, 17, 21, 0.86)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.45)",
            }}
          >
            <Lock size={large ? 18 : 15} strokeWidth={1.7} style={{ color: "#93a3ab" }} />
          </div>
        </div>
      )}

      {/* Collection Number Plate */}
      <span
        className="tabular-nums"
        style={{
          position: "absolute",
          top: 8,
          left: 10,
          fontSize: "0.66rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          padding: "0.12rem 0.42rem",
          borderRadius: "4px",
          backgroundColor: "rgba(6, 9, 10, 0.72)",
          border: `1px solid ${unlocked ? style.innerBorder : "rgba(255,255,255,0.1)"}`,
          color: unlocked ? style.titleColor : "#8d9aa1",
          backdropFilter: "blur(4px)",
        }}
      >
        {formatCardNumber(definition.number)}
      </span>

      <span
        style={{
          position: "absolute",
          bottom: 7,
          right: 10,
          fontSize: "0.58rem",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: unlocked ? style.scientificColor : "rgba(180, 192, 198, 0.5)",
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
          textShadow: "0 1px 4px rgba(0,0,0,0.85)",
        }}
      >
        <Compass size={10} />
        ATLAS
      </span>
    </div>
  );
};

interface AtlasCardProps {
  definition: AchievementDefinition;
  unlocked?: UnlockedAchievement;
  onSelect?: (definition: AchievementDefinition, unlocked?: UnlockedAchievement) => void;
  /** "grid" = estática na coleção; "inspect" = efeitos 2.5D, holografia e flip 3D ao abrir a carta. */
  variant?: "grid" | "inspect";
  /** Controle externo opcional do estado virado (verso). */
  flipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
  /** Ativa micro-animações contextuais da espécie (apenas quando aberta). */
  animateArtwork?: boolean;
  /** Permite arrastar com o dedo para inclinar no visualizador ampliado. */
  allowTouchDrag?: boolean;
}

export const AtlasCard: React.FC<AtlasCardProps> = ({
  definition,
  unlocked,
  onSelect,
  variant = "grid",
  flipped: controlledFlipped,
  onFlipChange,
  animateArtwork = false,
  allowTouchDrag = false,
}) => {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isFlipped = controlledFlipped ?? internalFlipped;

  const isUnlocked = Boolean(unlocked);
  const isInspect = variant === "inspect";
  const rarityMeta = RARITY_META[definition.rarity];
  const categoryMeta = CATEGORY_META[definition.category];
  const rarityStyle = RARITY_STYLES[definition.rarity];

  const { ref: tiltRef, tiltHandlers } = useCardTilt<HTMLDivElement>({
    maxTilt: 8,
    allowTouchDrag,
    disabled: !isInspect,
  });

  const unlockedDateLabel = unlocked
    ? new Date(unlocked.unlockedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const collectionLabels = definition.collections
    .map((cid) => ATLAS_COLLECTIONS.find((c) => c.id === cid)?.badgeLabel ?? cid)
    .join(" · ");

  /* --------------------------------------------------------------------------
   * MODO GRID (Página Coleção): Estático, tamanho original de carta
   * -------------------------------------------------------------------------- */
  if (!isInspect) {
    return (
      <button
        type="button"
        onClick={() => onSelect?.(definition, unlocked)}
        className={`atlas-card atlas-card--static atlas-card--${definition.rarity} ${
          isUnlocked ? "atlas-card--unlocked" : "atlas-card--locked"
        }`}
        data-testid={`atlas-card-${definition.id}`}
        data-unlocked={isUnlocked ? "true" : "false"}
        style={{
          padding: "0.55rem",
          background: isUnlocked ? rarityStyle.cardBg : "linear-gradient(168deg, #13181c 0%, #1a2126 100%)",
          border: `1.5px solid ${isUnlocked ? rarityStyle.border : "rgba(255, 255, 255, 0.1)"}`,
          opacity: isUnlocked ? 1 : 0.86,
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "0.68rem",
            padding: "0.5rem",
            borderRadius: "calc(var(--radius-md) - 4px)",
            border: `1px solid ${isUnlocked ? rarityStyle.innerBorder : "rgba(255, 255, 255, 0.06)"}`,
            position: "relative",
            zIndex: 1,
          }}
        >
          <AtlasIllustrationFrame definition={definition} unlocked={isUnlocked} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: isUnlocked ? rarityStyle.mutedColor : "#7e8b92",
              }}
            >
              {categoryMeta.label}
            </span>

            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                padding: "0.15rem 0.55rem",
                borderRadius: "var(--radius-full)",
                backgroundColor: isUnlocked ? rarityStyle.badgeBg : "rgba(255,255,255,0.05)",
                color: isUnlocked ? rarityStyle.badgeText : "#8e9ba2",
                border: `1px solid ${isUnlocked ? rarityStyle.badgeBorder : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {rarityMeta.label}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.28rem", flex: 1 }}>
            <div>
              <h3
                style={{
                  fontSize: "1.06rem",
                  fontWeight: 700,
                  letterSpacing: "-0.015em",
                  color: isUnlocked ? rarityStyle.titleColor : "#c8d2d8",
                  lineHeight: 1.2,
                }}
              >
                {isUnlocked ? definition.speciesName : "Espécie Oculta"}
              </h3>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: "0.78rem",
                  color: isUnlocked ? rarityStyle.scientificColor : "#6e7b82",
                  marginTop: "0.08rem",
                }}
              >
                {isUnlocked ? definition.scientificName : definition.name}
              </div>
            </div>

            {isUnlocked && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.28rem", marginTop: "0.2rem" }}>
                {definition.attributes.map((attr) => (
                  <span
                    key={attr}
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 600,
                      letterSpacing: "0.03em",
                      padding: "0.1rem 0.42rem",
                      borderRadius: "4px",
                      backgroundColor: rarityStyle.pillBg,
                      border: `1px solid ${rarityStyle.pillBorder}`,
                      color: rarityStyle.pillText,
                    }}
                  >
                    {attr}
                  </span>
                ))}
              </div>
            )}

            <p
              style={{
                fontSize: "0.76rem",
                lineHeight: 1.46,
                color: isUnlocked ? rarityStyle.bodyColor : "#96a3aa",
                marginTop: "0.22rem",
              }}
            >
              {isUnlocked ? definition.narrative : definition.conditionText}
            </p>
          </div>

          <div
            style={{
              paddingTop: "0.55rem",
              borderTop: `1px solid ${isUnlocked ? rarityStyle.dividerColor : "rgba(255,255,255,0.08)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.69rem",
              color: isUnlocked ? rarityStyle.scientificColor : "#7e8b92",
              fontWeight: 600,
            }}
          >
            <span>{isUnlocked ? unlockedDateLabel : "Bloqueada"}</span>
            <span
              style={{
                color: isUnlocked ? rarityStyle.mutedColor : "#7e8b92",
                fontWeight: 500,
              }}
            >
              Inspecionar →
            </span>
          </div>
        </div>
      </button>
    );
  }

  /* --------------------------------------------------------------------------
   * MODO INSPEÇÃO (Carta Aberta): 2.5D, Holografia, Animação e Flip 3D no lugar
   * -------------------------------------------------------------------------- */
  const toggleFlip = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = !isFlipped;
    if (onFlipChange) {
      onFlipChange(next);
    } else {
      setInternalFlipped(next);
    }
    void soundEngine.play("atlas-card-select");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleFlip();
    }
  };

  return (
    <div
      className="atlas-card-stage"
      data-testid={`atlas-card-${definition.id}`}
      data-unlocked={isUnlocked ? "true" : "false"}
      data-flipped={isFlipped ? "true" : "false"}
    >
      <div
        ref={tiltRef}
        className="atlas-card-3d"
        data-tilting="false"
        {...tiltHandlers}
      >
        <div className={`atlas-card-flipper ${isFlipped ? "is-flipped" : ""}`}>
          {/* ======================== FRENTE DA CARTA ======================== */}
          <div
            role="button"
            tabIndex={0}
            aria-label={`${isUnlocked ? definition.speciesName : "Espécie Oculta"} — ${definition.name} (${rarityMeta.label}). Clique para virar.`}
            onClick={() => toggleFlip()}
            onKeyDown={handleKeyDown}
            className={`atlas-card-face atlas-card-face--front atlas-card atlas-card--${definition.rarity} ${
              isUnlocked ? "atlas-card--unlocked" : "atlas-card--locked"
            }`}
            style={{
              padding: "0.55rem",
              background: isUnlocked
                ? rarityStyle.cardBg
                : "linear-gradient(168deg, #13181c 0%, #1a2126 100%)",
              border: `1.5px solid ${isUnlocked ? rarityStyle.border : "rgba(255, 255, 255, 0.1)"}`,
              opacity: isUnlocked ? 1 : 0.9,
              cursor: "pointer",
              overflow: "hidden",
            }}
          >
            {isUnlocked && (
              <div
                aria-hidden="true"
                className={`atlas-holo-layer atlas-holo-layer--${definition.rarity}`}
              />
            )}

            <div
              className="atlas-layer-bg"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "0.65rem",
                padding: "0.5rem",
                borderRadius: "calc(var(--radius-md) - 4px)",
                border: `1px solid ${isUnlocked ? rarityStyle.innerBorder : "rgba(255, 255, 255, 0.06)"}`,
                position: "relative",
                zIndex: 1,
              }}
            >
              <AtlasIllustrationFrame
                definition={definition}
                unlocked={isUnlocked}
                large
                animate={animateArtwork}
                parallax
              />

              <div
                className="atlas-layer-frame"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: isUnlocked ? rarityStyle.mutedColor : "#7e8b92",
                  }}
                >
                  {categoryMeta.label}
                </span>

                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.55rem",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: isUnlocked ? rarityStyle.badgeBg : "rgba(255,255,255,0.05)",
                    color: isUnlocked ? rarityStyle.badgeText : "#8e9ba2",
                    border: `1px solid ${isUnlocked ? rarityStyle.badgeBorder : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  {rarityMeta.label}
                </span>
              </div>

              <div
                className="atlas-layer-frame"
                style={{ display: "flex", flexDirection: "column", gap: "0.24rem", flex: 1 }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: "1.08rem",
                      fontWeight: 700,
                      letterSpacing: "-0.015em",
                      color: isUnlocked ? rarityStyle.titleColor : "#c8d2d8",
                      lineHeight: 1.2,
                    }}
                  >
                    {isUnlocked ? definition.speciesName : "Espécie Oculta"}
                  </h3>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: "0.78rem",
                      color: isUnlocked ? rarityStyle.scientificColor : "#6e7b82",
                      marginTop: "0.08rem",
                    }}
                  >
                    {isUnlocked ? definition.scientificName : definition.name}
                  </div>
                </div>

                {isUnlocked && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.26rem", marginTop: "0.18rem" }}>
                    {definition.attributes.map((attr) => (
                      <span
                        key={attr}
                        style={{
                          fontSize: "0.61rem",
                          fontWeight: 600,
                          letterSpacing: "0.03em",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "4px",
                          backgroundColor: rarityStyle.pillBg,
                          border: `1px solid ${rarityStyle.pillBorder}`,
                          color: rarityStyle.pillText,
                        }}
                      >
                        {attr}
                      </span>
                    ))}
                  </div>
                )}

                <p
                  style={{
                    fontSize: "0.74rem",
                    lineHeight: 1.44,
                    color: isUnlocked ? rarityStyle.bodyColor : "#96a3aa",
                    marginTop: "0.18rem",
                  }}
                >
                  {isUnlocked ? definition.narrative : definition.conditionText}
                </p>
              </div>

              <div
                className="atlas-layer-frame"
                style={{
                  paddingTop: "0.5rem",
                  borderTop: `1px solid ${isUnlocked ? rarityStyle.dividerColor : "rgba(255,255,255,0.08)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.68rem",
                  color: isUnlocked ? rarityStyle.scientificColor : "#7e8b92",
                  fontWeight: 600,
                }}
              >
                <span>{isUnlocked ? unlockedDateLabel : "Bloqueada"}</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    color: isUnlocked ? rarityStyle.titleColor : "#aab6bc",
                  }}
                >
                  <RotateCw size={10} />
                  <span>Virar</span>
                </span>
              </div>
            </div>
          </div>

          {/* ======================== VERSO DA CARTA ======================== */}
          <div
            role="button"
            tabIndex={0}
            aria-label={`Verso da carta ${isUnlocked ? definition.speciesName : definition.name}. Clique para voltar à frente.`}
            onClick={() => toggleFlip()}
            onKeyDown={handleKeyDown}
            className={`atlas-card-face atlas-card-face--back atlas-card atlas-card--${definition.rarity} ${
              isUnlocked ? "atlas-card--unlocked" : "atlas-card--locked"
            }`}
            style={{
              padding: "0.55rem",
              background: isUnlocked
                ? rarityStyle.cardBg
                : "linear-gradient(168deg, #11161a 0%, #171e23 100%)",
              border: `1.5px solid ${isUnlocked ? rarityStyle.border : "rgba(255, 255, 255, 0.1)"}`,
              cursor: "pointer",
              overflow: "hidden",
            }}
          >
            {isUnlocked && (
              <div
                aria-hidden="true"
                className={`atlas-holo-layer atlas-holo-layer--${definition.rarity}`}
              />
            )}

            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.5rem",
                padding: "0.58rem",
                borderRadius: "calc(var(--radius-md) - 4px)",
                border: `1px solid ${isUnlocked ? rarityStyle.innerBorder : "rgba(255, 255, 255, 0.06)"}`,
                position: "relative",
                zIndex: 1,
                overflow: "hidden",
              }}
            >
              {/* Cabeçalho do Verso */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "0.45rem",
                  paddingBottom: "0.42rem",
                  borderBottom: `1px solid ${isUnlocked ? rarityStyle.dividerColor : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      letterSpacing: "0.09em",
                      textTransform: "uppercase",
                      color: isUnlocked ? rarityStyle.mutedColor : "#7e8b92",
                    }}
                  >
                    Ficha Técnica · {formatCardNumber(definition.number)}
                  </div>
                  <div
                    style={{
                      fontSize: "0.94rem",
                      fontWeight: 700,
                      color: isUnlocked ? rarityStyle.titleColor : "#c8d2d8",
                      marginTop: "0.08rem",
                    }}
                  >
                    {isUnlocked ? definition.speciesName : "Espécie Oculta"}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: "0.72rem",
                      color: isUnlocked ? rarityStyle.scientificColor : "#6e7b82",
                    }}
                  >
                    {isUnlocked ? definition.scientificName : "Desbloqueie para revelar"}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    padding: "0.12rem 0.45rem",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: isUnlocked ? rarityStyle.badgeBg : "rgba(255,255,255,0.05)",
                    color: isUnlocked ? rarityStyle.badgeText : "#8e9ba2",
                    border: `1px solid ${isUnlocked ? rarityStyle.badgeBorder : "rgba(255,255,255,0.1)"}`,
                    flexShrink: 0,
                  }}
                >
                  {rarityMeta.label}
                </span>
              </div>

              {/* Corpo Técnico da Ficha */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.44rem", flex: 1, overflowY: "auto" }}>
                {isUnlocked ? (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.35rem" }}>
                      <MapPin size={11} style={{ color: rarityStyle.accent, marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: "0.56rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: rarityStyle.mutedColor }}>
                          Habitat
                        </div>
                        <div style={{ fontSize: "0.7rem", lineHeight: 1.35, color: rarityStyle.bodyColor }}>
                          {definition.habitat}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.35rem" }}>
                      <Sparkles size={11} style={{ color: rarityStyle.accent, marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: "0.56rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: rarityStyle.mutedColor }}>
                          Características
                        </div>
                        <div style={{ fontSize: "0.7rem", lineHeight: 1.35, color: rarityStyle.bodyColor }}>
                          {definition.characteristics}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      padding: "0.5rem",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px dashed rgba(255,255,255,0.1)",
                      fontSize: "0.7rem",
                      color: "#8e9ba2",
                      lineHeight: 1.38,
                    }}
                  >
                    Habitat e características da espécie serão revelados no momento do desbloqueio.
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.35rem" }}>
                  <Tag size={11} style={{ color: isUnlocked ? rarityStyle.accent : "#7e8b92", marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "0.56rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: isUnlocked ? rarityStyle.mutedColor : "#7e8b92" }}>
                      Condição
                    </div>
                    <div style={{ fontSize: "0.7rem", lineHeight: 1.35, color: isUnlocked ? rarityStyle.titleColor : "#c8d2d8" }}>
                      {definition.conditionText}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.35rem" }}>
                  <Award size={11} style={{ color: isUnlocked ? rarityStyle.accent : "#7e8b92", marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "0.56rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: isUnlocked ? rarityStyle.mutedColor : "#7e8b92" }}>
                      Conquista & Biomas
                    </div>
                    <div style={{ fontSize: "0.69rem", lineHeight: 1.32, color: isUnlocked ? rarityStyle.bodyColor : "#96a3aa" }}>
                      {definition.name} · {collectionLabels}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.35rem" }}>
                  <Calendar size={11} style={{ color: isUnlocked ? rarityStyle.accent : "#7e8b92", marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "0.56rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: isUnlocked ? rarityStyle.mutedColor : "#7e8b92" }}>
                      Aquisição
                    </div>
                    <div style={{ fontSize: "0.69rem", color: isUnlocked ? rarityStyle.scientificColor : "#7e8b92", fontWeight: 600 }}>
                      {unlockedDateLabel ?? "Ainda não desbloqueada"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodapé do Verso */}
              <div
                style={{
                  paddingTop: "0.42rem",
                  borderTop: `1px solid ${isUnlocked ? rarityStyle.dividerColor : "rgba(255,255,255,0.08)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.68rem",
                }}
              >
                <span style={{ color: isUnlocked ? rarityStyle.mutedColor : "#7e8b92" }}>
                  {categoryMeta.label}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.24rem",
                    color: isUnlocked ? rarityStyle.titleColor : "#c8d2d8",
                    fontWeight: 600,
                  }}
                >
                  <RotateCw size={10} />
                  <span>Frente</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
