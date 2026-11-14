import React, { useEffect, useState } from "react";
import { Compass, Sparkles, X, ArrowRight } from "lucide-react";
import {
  CATEGORY_META,
  RARITY_META,
  formatCardNumber,
  type AchievementDefinition,
  type UnlockedAchievement,
} from "../core";
import { AtlasIllustrationFrame, RARITY_STYLES } from "./AtlasCard";

interface AtlasRevealModalProps {
  definition: AchievementDefinition;
  unlocked?: UnlockedAchievement;
  onClose: () => void;
  onGoToCollection: () => void;
}

export const AtlasRevealModal: React.FC<AtlasRevealModalProps> = ({
  definition,
  unlocked,
  onClose,
  onGoToCollection,
}) => {
  const [revealed, setRevealed] = useState(false);

  const rarityMeta = RARITY_META[definition.rarity];
  const categoryMeta = CATEGORY_META[definition.category];
  const rarityStyle = RARITY_STYLES[definition.rarity];
  const isLegendary = definition.rarity === "legendary";
  const isHighRarity = definition.rarity === "epic" || isLegendary;

  useEffect(() => {
    setRevealed(false);
  }, [definition.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const dateLabel = unlocked
    ? new Date(unlocked.unlockedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Registrada hoje";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Revelação ATLAS — ${definition.name}`}
      className="atlas-modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        backgroundColor: "rgba(0, 24, 29, 0.68)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="atlas-modal-panel"
        style={{
          width: "100%",
          maxWidth: 380,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          position: "relative",
        }}
      >
        <button
          type="button"
          className="btn-icon"
          onClick={onClose}
          aria-label="Fechar revelação"
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            zIndex: 10,
            width: 34,
            height: 34,
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-strong)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <X size={16} />
        </button>

        {!revealed ? (
          /* Estado Inicial: Carta Fechada / Selada */
          <button
            type="button"
            onClick={() => setRevealed(true)}
            data-testid="atlas-reveal-sealed"
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "var(--radius-lg)",
              background: "linear-gradient(160deg, #002a32 0%, #063842 100%)",
              border: `1.5px solid ${isHighRarity ? "#f7a072" : "rgba(115, 186, 155, 0.5)"}`,
              boxShadow: "var(--shadow-xl)",
              color: "#f3f7f8",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: 410,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#89a5ab",
              }}
            >
              <span className="tabular-nums">{formatCardNumber(definition.number)}</span>
              <span style={{ color: isHighRarity ? "#f7a072" : "#73ba9b" }}>{rarityMeta.label}</span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
                padding: "1.5rem 1rem",
              }}
            >
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: "50%",
                  border: `1.5px solid ${isHighRarity ? "rgba(247, 160, 114, 0.55)" : "rgba(115, 186, 155, 0.45)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                }}
              >
                <Compass size={34} strokeWidth={1.4} style={{ color: isHighRarity ? "#f7a072" : "#73ba9b" }} />
              </div>

              <div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#73ba9b",
                    marginBottom: "0.35rem",
                  }}
                >
                  Nova Conquista Registrada
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                  Selo do Arquivo ATLAS
                </div>
                <div style={{ fontSize: "0.8rem", color: "#bfd2d6", marginTop: "0.3rem" }}>
                  Toque para revelar a carta colecionável
                </div>
              </div>
            </div>

            <div
              style={{
                width: "100%",
                padding: "0.7rem 1rem",
                borderRadius: "var(--radius-full)",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                fontSize: "0.82rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.45rem",
              }}
            >
              <Sparkles size={15} style={{ color: "#f7a072" }} />
              <span>Revelar Carta</span>
            </div>
          </button>
        ) : (
          /* Estado Revelado com animação por raridade */
          <div
            data-testid="atlas-reveal-opened"
            className={`atlas-reveal--${definition.rarity}`}
            style={{
              width: "100%",
              padding: "0.85rem",
              borderRadius: "var(--radius-lg)",
              background: rarityStyle.cardBg,
              border: `1.5px solid ${rarityStyle.border}`,
              boxShadow: "var(--shadow-xl)",
              display: "flex",
              flexDirection: "column",
              gap: "0.9rem",
            }}
          >
            <div
              style={{
                padding: "0.65rem",
                borderRadius: "calc(var(--radius-lg) - 6px)",
                border: `1px solid ${definition.rarity !== "common" ? rarityStyle.innerBorder : "transparent"}`,
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <AtlasIllustrationFrame definition={definition} unlocked={true} large />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: rarityStyle.mutedColor,
                  }}
                >
                  {categoryMeta.label}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "0.18rem 0.6rem",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: rarityStyle.badgeBg,
                    color: rarityStyle.badgeText,
                    border: `1px solid ${rarityStyle.badgeBorder}`,
                  }}
                >
                  {rarityMeta.label}
                </span>
              </div>

              <div>
                <h2
                  style={{
                    fontSize: "1.3rem",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: rarityStyle.titleColor,
                  }}
                >
                  {definition.name}
                </h2>
                <p
                  style={{
                    fontSize: "0.84rem",
                    lineHeight: 1.55,
                    color: rarityStyle.bodyColor,
                    marginTop: "0.35rem",
                  }}
                >
                  {definition.description}
                </p>
              </div>

              <div
                style={{
                  fontSize: "0.74rem",
                  color: isLegendary ? "#73ba9b" : "var(--brand-sage-dark)",
                  fontWeight: 600,
                  paddingTop: "0.55rem",
                  borderTop: `1px solid ${isLegendary ? "rgba(255,255,255,0.12)" : "var(--border-subtle)"}`,
                }}
              >
                Adquirida em {dateLabel}
              </div>

              <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.25rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  style={{ flex: 1, justifyContent: "center", fontSize: "0.82rem" }}
                >
                  Continuar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onGoToCollection}
                  style={{
                    flex: 1.3,
                    justifyContent: "center",
                    fontSize: "0.82rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <span>Ver na Coleção</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

