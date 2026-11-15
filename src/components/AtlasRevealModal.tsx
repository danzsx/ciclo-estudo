import React, { useEffect, useState } from "react";
import { Compass, Sparkles, X, ArrowRight, RotateCw } from "lucide-react";
import {
  RARITY_META,
  formatCardNumber,
  type AchievementDefinition,
  type UnlockedAchievement,
} from "../core";
import { AtlasCard, RARITY_STYLES } from "./AtlasCard";
import { useCardTilt } from "./useCardTilt";
import { rarityToRevealSoundId, soundEngine } from "../audio";

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
  const [flipped, setFlipped] = useState(false);

  const rarityMeta = RARITY_META[definition.rarity];
  const rarityStyle = RARITY_STYLES[definition.rarity];
  const isLegendary = definition.rarity === "legendary";
  const isHighRarity = definition.rarity === "epic" || isLegendary;

  const { ref: sealedTiltRef, tiltHandlers: sealedTiltHandlers } = useCardTilt<HTMLDivElement>({
    maxTilt: 8,
    allowTouchDrag: true,
    disabled: revealed,
  });

  useEffect(() => {
    setRevealed(false);
    setFlipped(false);
  }, [definition.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (revealed && (e.key === "f" || e.key === "F")) {
        setFlipped((prev) => {
          void soundEngine.play("atlas-card-select");
          return !prev;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, revealed]);

  const effectiveUnlocked: UnlockedAchievement = unlocked ?? {
    id: definition.id,
    unlockedAt: new Date().toISOString(),
    collectionId: definition.collectionId,
  };

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
        backgroundColor: "rgba(0, 24, 29, 0.72)",
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
        className="atlas-modal-panel"
        style={{
          width: "100%",
          maxWidth: 300,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.9rem",
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
            top: -10,
            right: -10,
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
          /* Estado Inicial: Carta Fechada / Selada com inclinação 2.5D */
          <div className="atlas-card-stage atlas-card-stage--modal" style={{ width: "100%" }}>
            <div
              ref={sealedTiltRef}
              className="atlas-card-3d"
              data-tilting="false"
              {...sealedTiltHandlers}
            >
              <button
                type="button"
                onClick={() => {
                  setRevealed(true);
                  void soundEngine.play(rarityToRevealSoundId(definition.rarity));
                }}
                data-testid="atlas-reveal-sealed"
                style={{
                  width: "100%",
                  padding: "1.1rem",
                  borderRadius: "var(--radius-lg)",
                  background: isLegendary
                    ? "linear-gradient(160deg, #07120e 0%, #102a21 55%, #07120e 100%)"
                    : "linear-gradient(160deg, #002a32 0%, #063842 100%)",
                  border: `1.5px solid ${isHighRarity ? rarityStyle.border : "rgba(115, 186, 155, 0.5)"}`,
                  boxShadow: isLegendary
                    ? "0 20px 44px -10px rgba(0,0,0,0.82), 0 0 28px -6px rgba(243, 217, 125, 0.35)"
                    : "var(--shadow-xl)",
                  color: "#f3f7f8",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: 420,
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  aria-hidden="true"
                  className={`atlas-holo-layer atlas-holo-layer--${definition.rarity}`}
                />

                <div
                  className="atlas-layer-frame"
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#89a5ab",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <span className="tabular-nums">{formatCardNumber(definition.number)}</span>
                  <span style={{ color: isHighRarity ? rarityStyle.badgeText : "#73ba9b" }}>
                    {rarityMeta.label}
                  </span>
                </div>

                <div
                  className="atlas-layer-animal"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1.5rem 1rem",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: "50%",
                      border: `1.5px solid ${isHighRarity ? rarityStyle.border : "rgba(115, 186, 155, 0.45)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      boxShadow: isLegendary ? "0 0 24px rgba(243, 217, 125, 0.25)" : "none",
                    }}
                  >
                    <Compass
                      size={36}
                      strokeWidth={1.4}
                      style={{ color: isHighRarity ? rarityStyle.accent : "#73ba9b" }}
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: isLegendary ? "#f3d97d" : "#73ba9b",
                        marginBottom: "0.35rem",
                      }}
                    >
                      {isLegendary ? "Relíquia Lendária Desbloqueada" : "Nova Conquista Registrada"}
                    </div>
                    <div style={{ fontSize: "1.18rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                      {definition.name}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#bfd2d6", marginTop: "0.3rem" }}>
                      Toque para revelar a carta colecionável
                    </div>
                  </div>
                </div>

                <div
                  className="atlas-layer-frame"
                  style={{
                    width: "100%",
                    padding: "0.72rem 1rem",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.45rem",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <Sparkles size={15} style={{ color: isHighRarity ? rarityStyle.accent : "#f7a072" }} />
                  <span>Revelar Carta</span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* Estado Revelado com animação por raridade, holografia, flip e acesso à coleção */
          <div
            data-testid="atlas-reveal-opened"
            className={`atlas-reveal--${definition.rarity}`}
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
            }}
          >
            <AtlasCard
              definition={definition}
              unlocked={effectiveUnlocked}
              variant="inspect"
              flipped={flipped}
              onFlipChange={setFlipped}
              animateArtwork={true}
              allowTouchDrag={true}
            />

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setFlipped((prev) => !prev);
                  void soundEngine.play("atlas-card-select");
                }}
                style={{
                  justifyContent: "center",
                  fontSize: "0.78rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.55rem 0.85rem",
                }}
              >
                <RotateCw size={13} />
                <span>{flipped ? "Frente" : "Verso"}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                style={{ flex: 1, justifyContent: "center", fontSize: "0.8rem" }}
              >
                Continuar
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={onGoToCollection}
                style={{
                  flex: 1.25,
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span>Coleção</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
