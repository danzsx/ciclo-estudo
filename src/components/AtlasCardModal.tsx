import React, { useEffect } from "react";
import { X, Calendar, CheckCircle2, Lock, Tag, Layers, Compass } from "lucide-react";
import {
  CATEGORY_META,
  RARITY_META,
  formatCardNumber,
  type AchievementDefinition,
  type UnlockedAchievement,
} from "../core";
import { AtlasIllustrationFrame, RARITY_STYLES } from "./AtlasCard";

interface AtlasCardModalProps {
  definition: AchievementDefinition;
  unlocked?: UnlockedAchievement;
  onClose: () => void;
}

export const AtlasCardModal: React.FC<AtlasCardModalProps> = ({ definition, unlocked, onClose }) => {
  const isUnlocked = Boolean(unlocked);
  const rarityMeta = RARITY_META[definition.rarity];
  const categoryMeta = CATEGORY_META[definition.category];
  const rarityStyle = RARITY_STYLES[definition.rarity];
  const isLegendary = definition.rarity === "legendary";

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const formattedDateTime = unlocked
    ? new Date(unlocked.unlockedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Catálogo ATLAS — ${definition.name}`}
      className="atlas-modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0, 24, 29, 0.62)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="editorial-card atlas-modal-panel"
        style={{
          width: "100%",
          maxWidth: 640,
          backgroundColor: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: `1px solid ${isUnlocked ? rarityStyle.border : "var(--border-strong)"}`,
          boxShadow: "var(--shadow-xl)",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Top Archival Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            paddingBottom: "0.85rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <Compass size={15} style={{ color: "var(--brand-sage-dark)" }} />
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              Catálogo ATLAS · Prancha{" "}
              <span className="tabular-nums" style={{ color: "var(--text-primary)" }}>
                {formatCardNumber(definition.number)}
              </span>
            </span>
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Fechar visualização"
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Artifact Catalog Two-Column Layout */}
        <div className="atlas-catalog-layout">
          {/* Left: Vertical Artifact Plate */}
          <div
            style={{
              padding: "0.65rem",
              borderRadius: "var(--radius-md)",
              background: isUnlocked ? rarityStyle.cardBg : "var(--bg-surface-subtle)",
              border: `1px solid ${isUnlocked ? rarityStyle.border : "var(--border-subtle)"}`,
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <AtlasIllustrationFrame definition={definition} unlocked={isUnlocked} large />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 0.25rem 0.2rem" }}>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "0.18rem 0.55rem",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: isUnlocked ? rarityStyle.badgeBg : "var(--bg-surface)",
                  color: isUnlocked ? rarityStyle.badgeText : "var(--text-muted)",
                  border: `1px solid ${isUnlocked ? rarityStyle.badgeBorder : "var(--border-subtle)"}`,
                }}
              >
                {rarityMeta.label}
              </span>
              <span
                className="tabular-nums"
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: isUnlocked && isLegendary ? "#bfd2d6" : "var(--text-muted)",
                }}
              >
                {categoryMeta.label}
              </span>
            </div>
          </div>

          {/* Right: Archival Ledger Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  color: isUnlocked ? "var(--brand-sage-dark)" : "var(--text-muted)",
                }}
              >
                {isUnlocked ? <CheckCircle2 size={14} /> : <Lock size={14} />}
                {isUnlocked ? "Carta Desbloqueada" : "Carta Bloqueada"}
              </span>

              <h2
                style={{
                  fontSize: "1.45rem",
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                }}
              >
                {definition.name}
              </h2>
              <p style={{ fontSize: "0.88rem", lineHeight: 1.6, color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                {definition.description}
              </p>
            </div>

            <div
              style={{
                padding: "0.95rem 1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-surface-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "0.7rem",
                fontSize: "0.8rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.55rem" }}>
                <Tag size={14} style={{ color: "var(--text-muted)", marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Condição de desbloqueio
                  </div>
                  <div style={{ color: "var(--text-primary)", fontWeight: 500, marginTop: "0.1rem" }}>
                    {definition.conditionText}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.55rem" }}>
                <Layers size={14} style={{ color: "var(--text-muted)", marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Coleção & Prancha
                  </div>
                  <div style={{ color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                    {definition.collectionName} · <code style={{ fontSize: "0.74rem" }}>{definition.illustration}</code>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.55rem" }}>
                <Calendar size={14} style={{ color: "var(--text-muted)", marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Data de aquisição
                  </div>
                  <div style={{ color: "var(--text-primary)", fontWeight: 500, marginTop: "0.1rem" }}>
                    {formattedDateTime ?? "Ainda não desbloqueada"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
