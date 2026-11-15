import React, { useState } from "react";
import {
  RotateCw,
  Info,
  Play,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  explainAllocation,
  formatMinutes,
  formatPercent,
  shortReason,
  DIFFICULTY_LABELS,
} from "../core";
import { getSubjectVisual, formatTiimoDuration } from "../utils/visuals";
import { SubjectIcon } from "../components/SubjectIcon";

export const CycleView: React.FC = () => {
  const { data, activeCourse, handleJumpTo, handleRestartCycle, setActiveTab, activeSession } = useApp();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const plan = data.cycle.plan;
  const blocks = plan?.blocks ?? [];
  const allocations = plan?.allocations ?? [];

  if (data.subjects.length === 0 || !plan || blocks.length === 0) {
    return (
      <div
        className="editorial-card"
        style={{ textAlign: "center", padding: "3.75rem 2rem", maxWidth: 580, margin: "2.5rem auto" }}
      >
        <div className="section-kicker" style={{ color: "#73ba9b" }}>
          Ciclo de Estudos
        </div>
        <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Nenhum ciclo <span className="serif-accent">estruturado</span>
        </h3>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.75rem", fontSize: "0.92rem", lineHeight: 1.6 }}>
          Cadastre suas disciplinas na Biblioteca para que o algoritmo calcule automaticamente a sequência intercalada de estudos.
        </p>
        <button className="btn-continue-pill" onClick={() => setActiveTab("subjects")} style={{ maxWidth: 260 }}>
          Cadastrar Disciplinas
        </button>
      </div>
    );
  }

  const selectedAlloc = selectedSubjectId
    ? allocations.find((a) => a.subjectId === selectedSubjectId)
    : allocations[0];
  const selectedSubject = selectedAlloc
    ? data.subjects.find((s) => s.id === selectedAlloc.subjectId)
    : null;

  const paletteCycle = ["#002a32", "#73ba9b", "#f7a072", "#3b43d6", "#1e555c", "#529e7e"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: 1120, margin: "0 auto" }}>
      {/* Editorial Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "1rem",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "1.15rem",
        }}
      >
        <div>
          <div className="section-kicker">Sequência Algorítmica</div>
          <h1 className="section-hero-title">
            Ciclo de{" "}
            <span className="serif-accent" style={{ fontSize: "1.9rem", fontWeight: 400 }}>
              Estudos
            </span>
          </h1>
          <p className="tabular-nums" style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
            {activeCourse?.name ? `${activeCourse.name} • ` : ""}Ciclo #{data.cycle.cycleNumber} • {formatMinutes(plan.totalMinutes)} distribuídos em {blocks.length} blocos intercalados.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
          <button
            className="chip-pill"
            onClick={handleRestartCycle}
            disabled={!!activeSession}
            title={activeSession ? "Finalize a sessão em andamento antes de reiniciar o ciclo" : "Voltar para o primeiro bloco"}
            style={{ opacity: activeSession ? 0.45 : 1 }}
          >
            <RotateCw size={14} />
            <span>Reiniciar Posição</span>
          </button>
          <button className="btn btn-primary" onClick={() => setActiveTab("study")}>
            <Play size={15} fill="currentColor" />
            <span>Iniciar Sessão</span>
          </button>
        </div>
      </div>

      {/* Warnings from algorithm if any */}
      {plan.warnings.length > 0 && (
        <div
          style={{
            padding: "1rem 1.35rem",
            backgroundColor: "var(--accent-medium-bg)",
            border: "1px solid var(--accent-medium-border)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            color: "var(--accent-medium)",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: "0.85rem" }}>
            {plan.warnings.map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Proportional Distribution Bar */}
      <div className="editorial-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <SlidersHorizontal size={16} style={{ color: "#73ba9b" }} />
            Proporção de Tempo no <span className="serif-accent" style={{ fontSize: "1.15rem" }}>Ciclo</span>
          </span>
          <span className="tabular-nums" style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500 }}>
            Carga total: <strong>{formatMinutes(plan.totalMinutes)}</strong>
          </span>
        </div>

        {/* Clean Segmented Bar */}
        <div
          style={{
            height: 16,
            width: "100%",
            borderRadius: "var(--radius-full)",
            overflow: "hidden",
            display: "flex",
            gap: 2,
            backgroundColor: "var(--bg-surface-subtle)",
          }}
        >
          {allocations.map((a, idx) => {
            const subj = data.subjects.find((s) => s.id === a.subjectId);
            if (!subj || a.minutes === 0) return null;
            const pct = (a.minutes / plan.totalMinutes) * 100;
            const segColor = paletteCycle[idx % paletteCycle.length];
            return (
              <div
                key={a.subjectId}
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  backgroundColor: segColor,
                  borderRadius: 999,
                  transition: "width 0.3s ease",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedSubjectId(subj.id)}
                title={`${subj.name}: ${formatMinutes(a.minutes)} (${formatPercent(a.share, 1)})`}
              />
            );
          })}
        </div>

        {/* Legend pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1.1rem" }}>
          {allocations.map((a, idx) => {
            const subj = data.subjects.find((s) => s.id === a.subjectId);
            if (!subj) return null;
            const isSelected = selectedAlloc?.subjectId === a.subjectId;
            const segColor = paletteCycle[idx % paletteCycle.length];

            return (
              <button
                key={a.subjectId}
                className={`chip-pill ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedSubjectId(subj.id)}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: isSelected ? "#73ba9b" : segColor,
                  }}
                />
                <span>{subj.name}</span>
                <span className="tabular-nums" style={{ opacity: 0.75, fontSize: "0.75rem" }}>
                  {formatTiimoDuration(a.minutes)} ({formatPercent(a.share)})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid: Sequence Flow & Algorithmic Justification Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Interactive Sequence Track */}
        <div className="editorial-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Sequência Ordenada de <span className="serif-accent" style={{ fontSize: "1.2rem" }}>Blocos</span>
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Selecione um bloco para torná-lo ativo
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {blocks.map((b, i) => {
              const subj = data.subjects.find((s) => s.id === b.subjectId);
              if (!subj) return null;
              const isCurrent = i === data.cycle.position;
              const isPast = i < data.cycle.position;
              const visual = getSubjectVisual(subj.name, i);

              return (
                <div
                  key={b.index}
                  onClick={() => !activeSession && handleJumpTo(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.8rem 1.05rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: isCurrent
                      ? "var(--bg-surface-elevated)"
                      : "var(--bg-surface-subtle)",
                    border: isCurrent
                      ? "1.5px solid var(--brand-identity)"
                      : "1px solid var(--border-subtle)",
                    opacity: isPast ? 0.55 : 1,
                    cursor: activeSession ? "default" : "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                    {isPast ? (
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 11,
                          backgroundColor: "var(--brand-sage-subtle)",
                          color: "var(--brand-sage-dark)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CheckCircle2 size={17} />
                      </div>
                    ) : (
                      <SubjectIcon visual={visual} size="sm" active={isCurrent} />
                    )}

                    <div>
                      <div style={{ fontWeight: isCurrent ? 700 : 600, fontSize: "0.92rem", color: "var(--text-primary)" }}>
                        {subj.name}
                        {isCurrent && (
                          <span
                            style={{
                              marginLeft: "0.5rem",
                              fontSize: "0.65rem",
                              padding: "0.15rem 0.5rem",
                              borderRadius: "var(--radius-full)",
                              backgroundColor: "var(--brand-identity-subtle)",
                              color: "var(--brand-identity)",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Atual
                          </span>
                        )}
                      </div>
                      <div className="tabular-nums" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Bloco #{i + 1} • Parte {b.part} de {b.parts}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="tabular-nums" style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                      {formatTiimoDuration(b.minutes)}
                    </span>

                    {isCurrent && (
                      <button
                        className="btn-circle-action"
                        style={{ width: 32, height: 32, backgroundColor: "var(--brand-identity)", color: "#fff", borderColor: "var(--brand-identity)" }}
                        title="Iniciar este bloco"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab("study");
                        }}
                      >
                        <ArrowUpRight size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Explain Allocation Panel */}
        <div className="editorial-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.15rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Critério de <span className="serif-accent" style={{ fontSize: "1.2rem" }}>Alocação</span>
            </h3>
            <span className="section-kicker" style={{ marginBottom: 0 }}>
              Transparência
            </span>
          </div>

          {selectedAlloc && selectedSubject ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <SubjectIcon visual={getSubjectVisual(selectedSubject.name)} size="md" />
                <div>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                    {selectedSubject.name}
                  </h4>
                  <span className="tabular-nums" style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
                    {formatMinutes(selectedAlloc.minutes)} no ciclo ({selectedAlloc.blocks} blocos)
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                <span className={`badge badge-${selectedSubject.difficulty}`}>
                  {DIFFICULTY_LABELS[selectedSubject.difficulty]}
                </span>
                <span className="chip-pill" style={{ padding: "0.2rem 0.65rem", fontSize: "0.73rem" }}>
                  Peso {selectedSubject.weight}/5
                </span>
                <span
                  style={{
                    fontSize: "0.73rem",
                    padding: "0.2rem 0.65rem",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--bg-surface-subtle)",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  {shortReason(selectedAlloc)}
                </span>
              </div>

              {/* Step-by-step breakdown */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "1rem 1.1rem",
                  fontSize: "0.83rem",
                  lineHeight: 1.6,
                  color: "var(--text-secondary)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.65rem",
                }}
              >
                {explainAllocation(selectedAlloc, plan).map((line, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span style={{ color: "#73ba9b", fontWeight: 800 }}>•</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  padding: "0.75rem 0.9rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  lineHeight: 1.5,
                }}
              >
                <Info size={13} style={{ display: "inline", marginRight: 5, verticalAlign: "middle", color: "#73ba9b" }} />
                O cálculo pondera a relevância no edital e sua percepção de dificuldade, aplicando limites mínimos e máximos para evitar distorções.
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
              Selecione uma disciplina para examinar o cálculo detalhado.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
