import React from "react";
import { Lock, Compass } from "lucide-react";
import {
  CATEGORY_META,
  RARITY_META,
  formatCardNumber,
  type AchievementDefinition,
  type AchievementRarity,
  type UnlockedAchievement,
} from "../core";
import { AtlasArtwork } from "./AtlasArtwork";

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
  bodyColor: string;
  mutedColor: string;
}

export const RARITY_STYLES: Record<AchievementRarity, RarityStyle> = {
  common: {
    border: "var(--border-strong)",
    innerBorder: "var(--border-subtle)",
    badgeBg: "var(--bg-surface-subtle)",
    badgeText: "var(--text-secondary)",
    badgeBorder: "var(--border-subtle)",
    accent: "#7b9095",
    stroke: "var(--text-primary)",
    frameBg: "var(--bg-surface-subtle)",
    cardBg: "var(--bg-surface)",
    titleColor: "var(--text-primary)",
    bodyColor: "var(--text-secondary)",
    mutedColor: "var(--text-muted)",
  },
  uncommon: {
    border: "rgba(115, 186, 155, 0.58)",
    innerBorder: "rgba(115, 186, 155, 0.3)",
    badgeBg: "var(--brand-sage-subtle)",
    badgeText: "var(--brand-sage-dark)",
    badgeBorder: "var(--brand-sage-border)",
    accent: "#73ba9b",
    stroke: "var(--brand-petrol)",
    frameBg: "var(--brand-sage-subtle)",
    cardBg: "var(--bg-surface)",
    titleColor: "var(--text-primary)",
    bodyColor: "var(--text-secondary)",
    mutedColor: "var(--text-muted)",
  },
  rare: {
    border: "rgba(59, 67, 214, 0.45)",
    innerBorder: "rgba(59, 67, 214, 0.22)",
    badgeBg: "var(--brand-identity-subtle)",
    badgeText: "var(--brand-identity)",
    badgeBorder: "rgba(59, 67, 214, 0.28)",
    accent: "#3b43d6",
    stroke: "var(--brand-petrol)",
    frameBg: "var(--brand-identity-subtle)",
    cardBg: "var(--bg-surface)",
    titleColor: "var(--text-primary)",
    bodyColor: "var(--text-secondary)",
    mutedColor: "var(--text-muted)",
  },
  epic: {
    border: "rgba(247, 160, 114, 0.7)",
    innerBorder: "rgba(247, 160, 114, 0.35)",
    badgeBg: "var(--brand-apricot-subtle)",
    badgeText: "var(--brand-apricot-dark)",
    badgeBorder: "var(--brand-apricot-border)",
    accent: "#b85624",
    stroke: "var(--brand-petrol)",
    frameBg: "radial-gradient(circle at 50% 42%, rgba(247, 160, 114, 0.22), var(--brand-apricot-subtle) 75%)",
    cardBg: "var(--bg-surface)",
    titleColor: "var(--text-primary)",
    bodyColor: "var(--text-secondary)",
    mutedColor: "var(--text-muted)",
  },
  legendary: {
    border: "rgba(247, 160, 114, 0.65)",
    innerBorder: "rgba(115, 186, 155, 0.32)",
    badgeBg: "rgba(247, 160, 114, 0.14)",
    badgeText: "#f7a072",
    badgeBorder: "rgba(247, 160, 114, 0.45)",
    accent: "#f7a072",
    stroke: "#73ba9b",
    frameBg: "radial-gradient(circle at 50% 40%, rgba(115, 186, 155, 0.16), rgba(0, 26, 32, 0.85) 80%)",
    cardBg: "linear-gradient(165deg, #002a32 0%, #063842 100%)",
    titleColor: "#f3f7f8",
    bodyColor: "#bfd2d6",
    mutedColor: "#89a5ab",
  },
};

export const AtlasIllustrationFrame: React.FC<{
  definition: AchievementDefinition;
  unlocked: boolean;
  large?: boolean;
}> = ({ definition, unlocked, large = false }) => {
  const style = RARITY_STYLES[definition.rarity];
  const isLegendary = definition.rarity === "legendary";
  const hasOrnaments = definition.rarity !== "common";
  const height = large ? 204 : 142;

  return (
    <div
      data-illustration={definition.illustration}
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: "var(--radius-sm)",
        background: unlocked ? style.frameBg : "var(--bg-surface-subtle)",
        border: `1px solid ${unlocked ? style.innerBorder : "var(--border-subtle)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Engraved Artwork Plate */}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: large ? "0.85rem" : "0.5rem",
          filter: unlocked ? "none" : "grayscale(1)",
        }}
      >
        <AtlasArtwork
          id={definition.id}
          rarity={definition.rarity}
          unlocked={unlocked}
          stroke={unlocked ? style.stroke : "var(--text-muted)"}
          accent={unlocked ? style.accent : "var(--text-muted)"}
        />
      </div>

      {/* Corner ornaments for Uncommon+ */}
      {unlocked && hasOrnaments && (
        <>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              width: 8,
              height: 8,
              borderTop: `1.5px solid ${style.accent}`,
              borderLeft: `1.5px solid ${style.accent}`,
              opacity: 0.65,
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderTop: `1.5px solid ${style.accent}`,
              borderRight: `1.5px solid ${style.accent}`,
              opacity: 0.65,
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              width: 8,
              height: 8,
              borderBottom: `1.5px solid ${style.accent}`,
              borderLeft: `1.5px solid ${style.accent}`,
              opacity: 0.65,
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 6,
              right: 6,
              width: 8,
              height: 8,
              borderBottom: `1.5px solid ${style.accent}`,
              borderRight: `1.5px solid ${style.accent}`,
              opacity: 0.65,
            }}
          />
        </>
      )}

      {/* Locked Veil */}
      {!unlocked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 24, 29, 0.04)",
          }}
        >
          <div
            style={{
              width: large ? 46 : 36,
              height: large ? 46 : 36,
              borderRadius: "50%",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Lock size={large ? 18 : 15} strokeWidth={1.7} style={{ color: "var(--text-muted)" }} />
          </div>
        </div>
      )}

      {/* Numeric Plate */}
      <span
        className="tabular-nums"
        style={{
          position: "absolute",
          top: 9,
          left: 11,
          fontSize: "0.66rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: unlocked && isLegendary ? "rgba(243, 247, 248, 0.8)" : "var(--text-muted)",
        }}
      >
        {formatCardNumber(definition.number)}
      </span>

      <span
        style={{
          position: "absolute",
          bottom: 8,
          right: 11,
          fontSize: "0.6rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: unlocked && isLegendary ? "rgba(243, 247, 248, 0.65)" : "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
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
  onSelect: (definition: AchievementDefinition, unlocked?: UnlockedAchievement) => void;
}

export const AtlasCard: React.FC<AtlasCardProps> = ({ definition, unlocked, onSelect }) => {
  const isUnlocked = Boolean(unlocked);
  const rarityMeta = RARITY_META[definition.rarity];
  const categoryMeta = CATEGORY_META[definition.category];
  const rarityStyle = RARITY_STYLES[definition.rarity];
  const isLegendary = definition.rarity === "legendary";

  const unlockedDateLabel = unlocked
    ? new Date(unlocked.unlockedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(definition, unlocked)}
      className={`atlas-card atlas-card--${definition.rarity} ${
        isUnlocked ? "atlas-card--unlocked" : "atlas-card--locked"
      }`}
      data-testid={`atlas-card-${definition.id}`}
      data-unlocked={isUnlocked ? "true" : "false"}
      style={{
        padding: "0.65rem",
        background: isUnlocked ? rarityStyle.cardBg : "var(--bg-surface)",
        border: `1px solid ${isUnlocked ? rarityStyle.border : "var(--border-subtle)"}`,
        opacity: isUnlocked ? 1 : 0.76,
        cursor: "pointer",
      }}
    >
      {/* Inner characteristic collectible card frame */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          padding: "0.55rem",
          borderRadius: "calc(var(--radius-md) - 4px)",
          border: `1px solid ${
            isUnlocked && definition.rarity !== "common"
              ? rarityStyle.innerBorder
              : "transparent"
          }`,
        }}
      >
        <AtlasIllustrationFrame definition={definition} unlocked={isUnlocked} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.66rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: isUnlocked ? rarityStyle.mutedColor : "var(--text-muted)",
            }}
          >
            {categoryMeta.label}
          </span>

          <span
            style={{
              fontSize: "0.66rem",
              fontWeight: 700,
              padding: "0.16rem 0.55rem",
              borderRadius: "var(--radius-full)",
              backgroundColor: isUnlocked ? rarityStyle.badgeBg : "var(--bg-surface-subtle)",
              color: isUnlocked ? rarityStyle.badgeText : "var(--text-muted)",
              border: `1px solid ${isUnlocked ? rarityStyle.badgeBorder : "var(--border-subtle)"}`,
            }}
          >
            {rarityMeta.label}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: 1 }}>
          <h3
            style={{
              fontSize: "1.02rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: isUnlocked ? rarityStyle.titleColor : "var(--text-secondary)",
              lineHeight: 1.25,
            }}
          >
            {definition.name}
          </h3>
          <p
            style={{
              fontSize: "0.78rem",
              lineHeight: 1.48,
              color: isUnlocked ? rarityStyle.bodyColor : "var(--text-secondary)",
            }}
          >
            {isUnlocked ? definition.description : definition.conditionText}
          </p>
        </div>

        <div
          style={{
            paddingTop: "0.6rem",
            borderTop: `1px solid ${
              isUnlocked && isLegendary ? "rgba(255,255,255,0.1)" : "var(--border-subtle)"
            }`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.7rem",
            color: isUnlocked
              ? isLegendary
                ? "#73ba9b"
                : "var(--brand-sage-dark)"
              : "var(--text-muted)",
            fontWeight: 600,
          }}
        >
          <span>{isUnlocked ? unlockedDateLabel : "Bloqueada"}</span>
          <span
            style={{
              color: isUnlocked ? rarityStyle.mutedColor : "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            Inspecionar →
          </span>
        </div>
      </div>
    </button>
  );
};
