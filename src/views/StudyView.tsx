import React, { useState } from "react";
import {
  Play,
  Pause,
  CheckCircle,
  SkipForward,
  RotateCcw,
  Clock,
  FileText,
  AlertCircle,
  Repeat,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatClock, formatMinutes, DIFFICULTY_LABELS } from "../core";
import { getSubjectVisual, formatTiimoDuration } from "../utils/visuals";
import { SubjectIcon } from "../components/SubjectIcon";
import { soundEngine } from "../audio";

export const StudyView: React.FC = () => {
  const {
    data,
    activeCourse,
    activeSession,
    activeElapsedMs,
    currentCycleBlock,
    handleStartSession,
    handlePauseSession,
    handleResumeSession,
    handleDiscardSession,
    handleFinishSession,
    handleSkipBlock,
    handleUpdateSessionNotes,
    setActiveTab,
  } = useApp();

  const [customMinutesInput, setCustomMinutesInput] = useState<string>("");
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [finishErrors, setFinishErrors] = useState<Record<string, string>>({});
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const allSubjects = data.courses?.length ? data.courses.flatMap((c) => c.subjects) : data.subjects;
  const currentSubject = activeSession
    ? allSubjects.find((s) => s.id === activeSession.subjectId) ?? {
        id: activeSession.subjectId,
        name: activeSession.subjectName,
        weight: 3,
        difficulty: "medium" as const,
        sessionMinutes: activeSession.plannedMinutes,
        color: "#002a32",
        createdAt: "",
        updatedAt: "",
      }
    : currentCycleBlock
      ? data.subjects.find((s) => s.id === currentCycleBlock.subjectId)
      : null;

  if ((!activeSession && !currentCycleBlock) || !currentSubject) {
    return (
      <div
        className="editorial-card"
        style={{ textAlign: "center", padding: "3.75rem 2rem", maxWidth: 580, margin: "2.5rem auto" }}
      >
        <div className="section-kicker" style={{ color: "#73ba9b" }}>
          Sessão de Foco
        </div>
        <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Nenhuma sessão <span className="serif-accent">disponível</span>
        </h3>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.75rem", fontSize: "0.92rem", lineHeight: 1.6 }}>
          Adicione disciplinas à sua biblioteca para iniciar o cronômetro inteligente do ciclo.
        </p>
        <button className="btn-continue-pill" onClick={() => setActiveTab("subjects")} style={{ maxWidth: 260 }}>
          Cadastrar Disciplinas
        </button>
      </div>
    );
  }

  const isRunning = activeSession?.status === "running";
  const isPaused = activeSession?.status === "paused";
  const plannedMinutes = activeSession?.plannedMinutes ?? currentCycleBlock!.minutes;
  const elapsedMinutes = activeElapsedMs / 60_000;
  const progressRatio = plannedMinutes > 0 ? Math.min(1, elapsedMinutes / plannedMinutes) : 0;
  const visual = getSubjectVisual(currentSubject.name);

  const sageFill = Math.round(progressRatio * 88);
  const apricotCap = progressRatio > 0 ? Math.min(12, 100 - sageFill) : 10;

  const openFinishModal = () => {
    const mins = Math.max(0, Math.round(elapsedMinutes));
    setCustomMinutesInput(String(mins > 0 ? mins : plannedMinutes));
    setFinishErrors({});
    setFinishModalOpen(true);
    void soundEngine.play("ui-modal-open");
  };

  const closeFinishModal = () => {
    setFinishModalOpen(false);
    void soundEngine.play("ui-modal-close");
  };

  const handleConfirmFinish = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(customMinutesInput.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      setFinishErrors({ studiedMinutes: "Informe um tempo de estudo válido em minutos." });
      return;
    }
    const res = handleFinishSession(parsed, activeSession?.notes);
    if (res.ok) {
      setFinishModalOpen(false);
    } else if (res.errors) {
      setFinishErrors(res.errors);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: 800, margin: "0 auto" }}>
      {/* Subject Header Card */}
      <div
        className="editorial-card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.1rem" }}>
          <SubjectIcon visual={visual} size="lg" active={isRunning} />

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
              <span className="section-kicker" style={{ marginBottom: 0 }}>
                {(activeSession?.courseName ?? activeCourse?.name) ? `${activeSession?.courseName ?? activeCourse?.name} • ` : ""}
                Ciclo #{activeSession?.cycleNumber ?? data.cycle.cycleNumber}
                {currentCycleBlock && !activeSession ? ` • Bloco ${currentCycleBlock.part} de ${currentCycleBlock.parts}` : ""}
              </span>
            </div>

            <h1
              style={{
                fontSize: "1.6rem",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: "var(--text-primary)",
                lineHeight: 1.2,
              }}
            >
              {currentSubject.name}
            </h1>

            <div
              className="tabular-nums"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginTop: "0.35rem",
                color: "var(--text-secondary)",
                fontSize: "0.82rem",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontWeight: 500 }}>
                <Clock size={14} style={{ color: "#73ba9b" }} />
                Meta da sessão: <strong>{formatTiimoDuration(plannedMinutes)}</strong>
              </span>
              <span>•</span>
              <span>Peso {currentSubject.weight}</span>
              <span>•</span>
              <span>{DIFFICULTY_LABELS[currentSubject.difficulty]}</span>
            </div>
          </div>
        </div>

        <button className="chip-pill" onClick={() => setActiveTab("cycle")}>
          <Repeat size={14} />
          <span>Sequência do Ciclo</span>
        </button>
      </div>

      {/* Main Architectural Stopwatch Card */}
      <div
        className="editorial-card"
        style={{
          textAlign: "center",
          padding: "3.5rem 2.25rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.85rem",
          border: isRunning
            ? "1.5px solid var(--brand-identity)"
            : "1px solid var(--border-subtle)",
        }}
      >
        {/* Minimal Status Indicator */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.35rem 0.95rem",
            borderRadius: "var(--radius-full)",
            backgroundColor: isRunning
              ? "var(--brand-sage-subtle)"
              : isPaused
              ? "var(--brand-apricot-subtle)"
              : "var(--bg-surface-subtle)",
            color: isRunning
              ? "var(--brand-sage-dark)"
              : isPaused
              ? "var(--brand-apricot-dark)"
              : "var(--text-muted)",
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: isRunning ? "#73ba9b" : isPaused ? "#f7a072" : "var(--text-muted)",
            }}
          />
          <span>
            {isRunning
              ? elapsedMinutes >= plannedMinutes
                ? "Meta Atingida"
                : "Foco em Curso"
              : isPaused
              ? "Sessão Pausada"
              : "Pronto para Iniciar"}
          </span>
        </div>

        {/* High-Precision Digital Clock */}
        <div
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "5.25rem",
            fontWeight: 700,
            letterSpacing: "-0.045em",
            color: "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          {activeSession ? formatClock(activeElapsedMs) : "00:00"}
        </div>

        {/* Reference-Inspired Dual-Tone Progress Bar towards planned session time */}
        <div style={{ width: "100%", maxWidth: 460 }}>
          <div className="dual-progress-track">
            <div className="dual-progress-fill-sage" style={{ width: `${sageFill}%` }} />
            <div className="dual-progress-fill-apricot" style={{ width: `${apricotCap}%` }} />
          </div>
          <div
            className="tabular-nums"
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginTop: "0.55rem",
              fontWeight: 500,
            }}
          >
            <span>Tempo decorrido: {formatMinutes(elapsedMinutes)}</span>
            <span>Meta: {formatMinutes(plannedMinutes)}</span>
          </div>
        </div>

        {/* Primary Timer Controls */}
        <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 460 }}>
          {!activeSession ? (
            <button className="btn-continue-pill" onClick={handleStartSession}>
              <Play size={18} fill="currentColor" />
              <span>Iniciar Sessão</span>
            </button>
          ) : isRunning ? (
            <>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, height: 48 }}
                onClick={handlePauseSession}
              >
                <Pause size={18} />
                <span>Pausar</span>
              </button>
              <button
                className="btn-continue-pill"
                style={{ flex: 1.4 }}
                onClick={openFinishModal}
              >
                <CheckCircle size={18} />
                <span>Concluir Bloco</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-continue-pill"
                style={{ flex: 1.4 }}
                onClick={handleResumeSession}
              >
                <Play size={18} fill="currentColor" />
                <span>Retomar Foco</span>
              </button>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, height: 48 }}
                onClick={openFinishModal}
              >
                <CheckCircle size={18} />
                <span>Concluir</span>
              </button>
            </>
          )}
        </div>

        {/* Secondary options: Skip / Discard */}
        <div style={{ display: "flex", gap: "1.25rem" }}>
          {activeSession ? (
            <button
              className="btn-icon"
              style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 500 }}
              onClick={() => {
                setConfirmDiscardOpen(true);
                void soundEngine.play("ui-modal-open");
              }}
            >
              <RotateCcw size={14} />
              <span>Descartar sessão atual</span>
            </button>
          ) : (
            <button
              className="btn-icon"
              style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 500 }}
              onClick={handleSkipBlock}
            >
              <SkipForward size={14} />
              <span>Pular este bloco no ciclo</span>
            </button>
          )}
        </div>
      </div>

      {/* Session Notes Card */}
      <div className="editorial-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
          <span style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={16} style={{ color: "#73ba9b" }} />
            Registro de <span className="serif-accent" style={{ fontSize: "1.1rem" }}>Anotações</span>
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Vinculado ao histórico desta sessão
          </span>
        </div>

        <textarea
          className="textarea"
          rows={3}
          placeholder="Tópicos abordados, jurisprudência, artigos lidos ou pontos para revisão futura..."
          value={activeSession?.notes ?? ""}
          onChange={(e) => handleUpdateSessionNotes(e.target.value)}
          disabled={!activeSession}
        />
        {!activeSession && (
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.45rem", display: "block" }}>
            Inicie o cronômetro para registrar anotações da sessão.
          </span>
        )}
      </div>

      {/* Finish Session Confirmation Modal */}
      {finishModalOpen && (
        <div className="modal-overlay" onClick={closeFinishModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleConfirmFinish}>
              <div className="modal-header">
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                  Concluir Bloco — <span className="serif-accent">{currentSubject.name}</span>
                </h3>
              </div>

              <div className="modal-body">
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.55, marginBottom: "1.25rem" }}>
                  Confirme os minutos efetivamente estudados para registrar no histórico e avançar para o próximo bloco.
                </p>

                <div className="form-group">
                  <label className="form-label">Tempo Estudado (minutos) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="1440"
                    className={`input ${finishErrors.studiedMinutes ? "input-error" : ""}`}
                    value={customMinutesInput}
                    onChange={(e) => setCustomMinutesInput(e.target.value)}
                    autoFocus
                  />
                  {finishErrors.studiedMinutes && (
                    <span className="form-error">{finishErrors.studiedMinutes}</span>
                  )}
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                    Meta prevista para o bloco: {plannedMinutes} min.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeFinishModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar e Avançar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discard Confirmation Modal */}
      {confirmDiscardOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            setConfirmDiscardOpen(false);
            void soundEngine.play("ui-modal-close");
          }}
        >
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: "center", padding: "2rem" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent-medium-bg)",
                  color: "var(--accent-medium)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                }}
              >
                <AlertCircle size={24} />
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.45rem" }}>
                Descartar sessão em andamento?
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
                O tempo corrido será zerado sem registro no histórico e a posição atual do ciclo será mantida.
              </p>
              <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setConfirmDiscardOpen(false);
                    void soundEngine.play("ui-modal-close");
                  }}
                >
                  Voltar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    handleDiscardSession();
                    setConfirmDiscardOpen(false);
                  }}
                >
                  Confirmar Descarte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
