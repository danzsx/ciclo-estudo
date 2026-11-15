import React, { useEffect, useState } from "react";
import { X, Calendar, CheckCircle2, Lock, Tag, Layers, Compass, RotateCw, MapPin, Sparkles } from "lucide-react";
import {
  ATLAS_COLLECTIONS,
  formatCardNumber,
  type AchievementDefinition,
  type UnlockedAchievement,
} from "../core";
import { AtlasCard, RARITY_STYLES } from "./AtlasCard";
import { soundEngine } from "../audio";

interface AtlasCardModalProps {
  definition: AchievementDefinition;
  unlocked?: UnlockedAchievement;
  onClose: () => void;
}

export const AtlasCardModal: React.FC<AtlasCardModalProps> = ({ definition, unlocked, onClose }) => {
  const [flipped, setFlipped] = useState(false);
  const isUnlocked = Boolean(unlocked);
  const rarityStyle = RARITY_STYLES[definition.rarity];

  useEffect(() => {
    setFlipped(false);
  }, [definition.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "f" || e.key === "F") {
        setFlipped((prev) => {
          void soundEngine.play("atlas-card-select");
          return !prev;
        });
      }
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

  const biomeNames = definition.collections
    .map((cid) => ATLAS_COLLECTIONS.find((c) => c.id === cid)?.name ?? cid)
    .join(" · ");

  const handleToggleFlip = () => {
    setFlipped((prev) => !prev);
    void soundEngine.play("atlas-card-select");
  };

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
        backgroundColor: "rgba(0, 24, 29, 0.68)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="editorial-card atlas-modal-panel"
        style={{
          width: "100%",
          maxWidth: 700,
          backgroundColor: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: `1px solid ${isUnlocked ? rarityStyle.border : "var(--border-strong)"}`,
          boxShadow: "var(--shadow-xl)",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          maxHeight: "92vh",
          overflowY: "auto",
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
              Inspeção ATLAS · Prancha{" "}
              <span className="tabular-nums" style={{ color: "var(--text-primary)" }}>
                {formatCardNumber(definition.number)}
              </span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleToggleFlip}
              data-testid="atlas-modal-flip-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.36rem 0.78rem",
                fontSize: "0.76rem",
                fontWeight: 600,
                borderRadius: "var(--radius-full)",
              }}
            >
              <RotateCw size={13} />
              <span>{flipped ? "Ver Frente" : "Virar para o Verso"}</span>
            </button>

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
        </div>

        {/* Artifact Catalog Two-Column Layout */}
        <div className="atlas-catalog-layout">
          {/* Left: Enlarged Interactive 2.5D Collectible Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", alignItems: "center" }}>
            <div style={{ width: "100%", maxWidth: 260 }}>
              <AtlasCard
                definition={definition}
                unlocked={unlocked}
                variant="inspect"
                flipped={flipped}
                onFlipChange={setFlipped}
                animateArtwork={true}
                allowTouchDrag={true}
              />
            </div>
            <div
              style={{
                fontSize: "0.71rem",
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Mova o cursor para inclinar · Toque na carta ou pressione <kbd style={{ fontSize: "0.66rem", padding: "0.06rem 0.3rem", borderRadius: 4, border: "1px solid var(--border-subtle)" }}>F</kbd> para virar
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
                {isUnlocked ? `Carta Desbloqueada · ${definition.name}` : `Carta Bloqueada · ${definition.name}`}
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
                {isUnlocked ? definition.speciesName : "Espécie Oculta"}
              </h2>
              {isUnlocked && (
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: "0.95rem",
                    color: "var(--text-muted)",
                  }}
                >
                  {definition.scientificName}
                </div>
              )}

              {isUnlocked && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.25rem" }}>
                  {definition.attributes.map((attr) => (
                    <span
                      key={attr}
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        padding: "0.14rem 0.5rem",
                        borderRadius: "4px",
                        backgroundColor: "var(--bg-surface-subtle)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {attr}
                    </span>
                  ))}
                </div>
              )}

              <p style={{ fontSize: "0.88rem", lineHeight: 1.6, color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                {isUnlocked ? definition.narrative : definition.description}
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
              {isUnlocked && (
                <>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.55rem" }}>
                    <MapPin size={14} style={{ color: "var(--text-muted)", marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Habitat
                      </div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 500, marginTop: "0.1rem" }}>
                        {definition.habitat}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.55rem" }}>
                    <Sparkles size={14} style={{ color: "var(--text-muted)", marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Características da espécie
                      </div>
                      <div style={{ color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                        {definition.characteristics}
                      </div>
                    </div>
                  </div>
                </>
              )}

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
                    Coleções temáticas & Biomas
                  </div>
                  <div style={{ color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                    {biomeNames}
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
