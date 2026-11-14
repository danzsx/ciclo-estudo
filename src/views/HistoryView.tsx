import React, { useMemo, useState } from "react";
import {
  Clock,
  Trash2,
  Edit2,
  Filter,
  CheckCircle2,
  AlertCircle,
  SkipForward,
  X,
  FileText,
  Calendar,
  Compass,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  ATLAS_CATALOG,
  formatMinutes,
  dailySeries,
  daySummary,
  weekComparison,
  type SessionRecord,
} from "../core";
import { getSubjectVisual, formatTiimoDuration } from "../utils/visuals";
import { SubjectIcon } from "../components/SubjectIcon";

export const HistoryView: React.FC = () => {
  const {
    data,
    setActiveTab,
    subjectStatsData,
    totalStudiedMinutes,
    statusCounts,
    streakCount,
    handleUpdateHistoryRecord,
    handleDeleteHistoryRecord,
    searchQuery,
  } = useApp();

  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [periodDays, setPeriodDays] = useState<7 | 14 | 30>(14);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<SessionRecord | null>(null);
  const [editMinutes, setEditMinutes] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const seriesPeriod = useMemo(() => dailySeries(data.history, periodDays, new Date()), [data.history, periodDays]);
  const weekComp = useMemo(() => weekComparison(data.history, new Date()), [data.history]);
  const maxPeriodMinutes = Math.max(30, ...seriesPeriod.map((d) => d.minutes));
  const maxSubjectMinutes = Math.max(30, ...subjectStatsData.map((s) => s.minutes));
  const selectedDayDetails = useMemo(
    () => (selectedDay ? daySummary(data.history, selectedDay) : null),
    [data.history, selectedDay],
  );
  const atlasUnlockedCount = data.atlas?.unlocked.length ?? 0;
  const atlasTotalCount = ATLAS_CATALOG.length;
  const atlasPct = atlasTotalCount > 0 ? Math.round((atlasUnlockedCount / atlasTotalCount) * 100) : 0;

  const filteredHistory = data.history.filter((h) => {
    if (selectedSubjectFilter !== "all" && h.subjectId !== selectedSubjectFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = h.subjectName.toLowerCase().includes(q);
      const matchNotes = (h.notes || "").toLowerCase().includes(q);
      return matchName || matchNotes;
    }
    return true;
  });

  const openEdit = (h: SessionRecord) => {
    setEditingRecord(h);
    setEditMinutes(h.studiedMinutes);
    setEditNotes(h.notes);
    setEditErrors({});
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const res = handleUpdateHistoryRecord(editingRecord.id, {
      studiedMinutes: editMinutes,
      notes: editNotes,
    });
    if (res.ok) {
      setEditingRecord(null);
    } else if (res.errors) {
      setEditErrors(res.errors);
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
          <div className="section-kicker">Métricas & Registro</div>
          <h1 className="section-hero-title">
            Estatísticas &{" "}
            <span className="serif-accent" style={{ fontSize: "1.9rem", fontWeight: 400 }}>
              Histórico
            </span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
            Análise discreta de desempenho, constância quinzenal e arquivo completo de sessões.
          </p>
        </div>

        {/* High-level KPI Strip */}
        <div className="tabular-nums" style={{ display: "flex", gap: "1.75rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Volume Total
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{formatMinutes(totalStudiedMinutes)}</div>
          </div>
          <div style={{ width: 1, height: 28, backgroundColor: "var(--border-subtle)" }} />
          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Sessões Concluídas
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>
              {statusCounts.completed}{" "}
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
                (+{statusCounts.partial} parciais)
              </span>
            </div>
          </div>
          <div style={{ width: 1, height: 28, backgroundColor: "var(--border-subtle)" }} />
          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Sequência Atual
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#286e53" }}>
              {streakCount} {streakCount === 1 ? "dia" : "dias"}
            </div>
          </div>
        </div>
      </div>

      {/* ATLAS Summary Strip */}
      <div
        className="editorial-card"
        style={{
          padding: "1rem 1.35rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--brand-sage-subtle)",
              border: "1px solid var(--brand-sage-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--brand-sage-dark)",
              flexShrink: 0,
            }}
          >
            <Compass size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
              ATLAS · Arquivo de Conquistas
            </div>
            <div className="tabular-nums" style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {atlasUnlockedCount} de {atlasTotalCount} cartas desbloqueadas{" "}
              <span style={{ color: "var(--brand-sage-dark)", fontWeight: 600 }}>({atlasPct}%)</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setActiveTab("collection")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.82rem",
            padding: "0.48rem 0.95rem",
          }}
        >
          <span>Explorar Coleção</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Two-Column Analytics Grid: Interactive Cadence + Subject Volume Distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Interactive Cadence Chart */}
        <div className="editorial-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Calendar size={15} style={{ color: "#73ba9b" }} />
              Cadência{" "}
              <span className="serif-accent" style={{ fontSize: "1.15rem" }}>
                {periodDays === 7 ? "Semanal" : periodDays === 14 ? "Quinzenal" : "Mensal"}
              </span>
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              {([7, 14, 30] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPeriodDays(p);
                    setSelectedDay(null);
                  }}
                  className="tabular-nums"
                  style={{
                    padding: "0.22rem 0.55rem",
                    borderRadius: "var(--radius-full)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: periodDays === p ? "var(--brand-petrol)" : "var(--bg-surface-subtle)",
                    color: periodDays === p ? "#ffffff" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {p}d
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              height: 120,
              gap: periodDays === 30 ? "0.2rem" : "0.35rem",
              paddingTop: "0.5rem",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "0.65rem",
            }}
          >
            {seriesPeriod.map((d, i) => {
              const pct = Math.round((d.minutes / maxPeriodMinutes) * 100);
              const dayNum = new Date(d.date + "T12:00:00").getDate();
              const isToday = i === seriesPeriod.length - 1;
              const isSelected = selectedDay === d.date;

              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : d.date)}
                  aria-label={`Ver detalhes de ${d.date}: ${formatMinutes(d.minutes)}`}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.4rem",
                    height: "100%",
                    justifyContent: "flex-end",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                  title={`${d.date}: ${formatMinutes(d.minutes)}`}
                >
                  <div
                    style={{
                      width: periodDays === 30 ? 6 : 8,
                      height: `${Math.max(8, pct)}%`,
                      borderRadius: 999,
                      backgroundColor: isSelected
                        ? "var(--brand-identity)"
                        : d.minutes > 0
                        ? isToday
                          ? "#f7a072"
                          : "#73ba9b"
                        : "var(--bg-surface-subtle)",
                      outline: isSelected ? "2px solid var(--brand-identity-subtle)" : "none",
                      transition: "height 0.25s ease, background-color 0.15s ease",
                    }}
                  />
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: periodDays === 30 ? "0.55rem" : "0.62rem",
                      fontWeight: isToday || isSelected ? 700 : 500,
                      color: isSelected
                        ? "var(--brand-identity)"
                        : isToday
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                    }}
                  >
                    {periodDays === 30 && i % 2 === 1 && !isToday && !isSelected ? "" : dayNum}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedDayDetails && (
            <div
              data-testid="cadence-day-details"
              style={{
                marginTop: "0.85rem",
                padding: "0.85rem 1rem",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-surface-subtle)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {new Date(selectedDayDetails.date + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "long",
                  })}
                </span>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setSelectedDay(null)}
                  aria-label="Fechar detalhes do dia"
                  style={{ padding: "0.15rem" }}
                >
                  <X size={13} />
                </button>
              </div>
              <div className="tabular-nums" style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                <strong>{formatMinutes(selectedDayDetails.totalMinutes)}</strong> estudados ·{" "}
                <strong>{selectedDayDetails.sessionsCount}</strong>{" "}
                {selectedDayDetails.sessionsCount === 1 ? "sessão" : "sessões"}
              </div>
              {selectedDayDetails.subjects.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.15rem" }}>
                  {selectedDayDetails.subjects.map((sub) => (
                    <span
                      key={sub.subjectId}
                      className="tabular-nums"
                      style={{
                        fontSize: "0.72rem",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "var(--radius-full)",
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                        fontWeight: 500,
                      }}
                    >
                      {sub.name} · {formatMinutes(sub.minutes)}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Nenhuma sessão registrada neste dia.
                </div>
              )}
            </div>
          )}

          <div
            className="tabular-nums"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "0.75rem",
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
            }}
          >
            <span>Semana anterior: {formatMinutes(weekComp.previous)}</span>
            <span style={{ color: "#286e53", fontWeight: 600 }}>
              {weekComp.delta !== null
                ? `${weekComp.delta >= 0 ? "+" : ""}${Math.round(weekComp.delta * 100)}% vs. semana anterior`
                : "Consistência em construção"}
            </span>
          </div>
        </div>

        {/* Subject Performance Bars (Interactive filter) */}
        <div className="editorial-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.1rem", gap: "0.5rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Clock size={15} style={{ color: "#f7a072" }} />
              Desempenho por <span className="serif-accent" style={{ fontSize: "1.15rem" }}>Disciplina</span>
            </h3>
            {selectedSubjectFilter !== "all" ? (
              <button
                type="button"
                onClick={() => setSelectedSubjectFilter("all")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  color: "var(--brand-identity)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={12} />
                Voltar à visão geral
              </button>
            ) : (
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Clique para filtrar
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {subjectStatsData.slice(0, 6).map((st) => {
              const barPct = Math.round((st.minutes / maxSubjectMinutes) * 100);
              const isSelected = selectedSubjectFilter === st.subjectId;
              return (
                <button
                  key={st.subjectId}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(isSelected ? "all" : st.subjectId)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                    textAlign: "left",
                    padding: "0.45rem 0.6rem",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${isSelected ? "var(--brand-sage-border)" : "transparent"}`,
                    backgroundColor: isSelected ? "var(--brand-sage-subtle)" : "transparent",
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", width: "100%" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{st.name}</span>
                    <span className="tabular-nums" style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                      {formatTiimoDuration(st.minutes)}{" "}
                      <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                        ({st.sessions} {st.sessions === 1 ? "sessão" : "sessões"})
                      </span>
                    </span>
                  </div>
                  <div className="dual-progress-track" style={{ height: 7, width: "100%" }}>
                    <div
                      className="dual-progress-fill-sage"
                      style={{ width: `${Math.max(4, Math.min(88, barPct))}%` }}
                    />
                    {st.minutes > 0 && (
                      <div className="dual-progress-fill-apricot" style={{ width: "8%" }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* History Log Table */}
      <div className="editorial-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
            Arquivo de <span className="serif-accent" style={{ fontSize: "1.2rem" }}>Sessões</span>{" "}
            <span className="tabular-nums" style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
              ({filteredHistory.length})
            </span>
          </h3>

          {/* Filter Select */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Filter size={15} style={{ color: "var(--text-muted)" }} />
            <select
              className="select"
              style={{ width: "auto", padding: "0.4rem 0.9rem", fontSize: "0.82rem", borderRadius: "var(--radius-full)" }}
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            >
              <option value="all">Todas as Disciplinas</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
            <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>
              Nenhuma sessão registrada para o filtro selecionado.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {filteredHistory.map((h, idx) => {
              const isCompleted = h.status === "completed";
              const isPartial = h.status === "partial";
              const visual = getSubjectVisual(h.subjectName, idx);
              const isExpanded = expandedSessionId === h.id;

              return (
                <div
                  key={h.id}
                  onClick={() => setExpandedSessionId(isExpanded ? null : h.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedSessionId(isExpanded ? null : h.id);
                    }
                  }}
                  style={{
                    padding: "0.9rem 1.15rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-subtle)",
                    border: `1px solid ${isExpanded ? "var(--border-strong)" : "transparent"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "1rem",
                    cursor: "pointer",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 220 }}>
                    <SubjectIcon visual={visual} size="sm" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-primary)" }}>
                        {h.subjectName}
                      </div>
                      <div className="tabular-nums" style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                        {formatDateTime(h.endedAt)} • Ciclo #{h.cycleNumber}
                      </div>
                    </div>
                  </div>

                  {/* Time & Status */}
                  <div className="tabular-nums" style={{ display: "flex", alignItems: "center", gap: "1.15rem" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                        {formatMinutes(h.studiedMinutes)}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        meta: {formatMinutes(h.plannedMinutes)}
                      </div>
                    </div>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        fontSize: "0.72rem",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "var(--radius-full)",
                        backgroundColor: isCompleted
                          ? "var(--accent-easy-bg)"
                          : isPartial
                          ? "var(--accent-medium-bg)"
                          : "var(--bg-surface-hover)",
                        color: isCompleted
                          ? "var(--accent-easy)"
                          : isPartial
                          ? "var(--accent-medium)"
                          : "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={12} />
                      ) : isPartial ? (
                        <AlertCircle size={12} />
                      ) : (
                        <SkipForward size={12} />
                      )}
                      <span>{isCompleted ? "Concluída" : isPartial ? "Parcial" : "Pulada"}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginLeft: "auto" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="btn-icon" onClick={() => openEdit(h)} title="Editar registro">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn-icon" onClick={() => handleDeleteHistoryRecord(h.id)} title="Excluir registro">
                      <Trash2 size={14} style={{ color: "var(--accent-hard)" }} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => setExpandedSessionId(isExpanded ? null : h.id)}
                      aria-label={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Expanded Session Details */}
                  {isExpanded && (
                    <div
                      style={{
                        width: "100%",
                        padding: "0.75rem 0.9rem",
                        backgroundColor: "var(--bg-surface)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.45rem",
                        fontSize: "0.8rem",
                      }}
                    >
                      <div className="tabular-nums" style={{ display: "flex", flexWrap: "wrap", gap: "1rem", color: "var(--text-secondary)" }}>
                        <span>
                          <strong>Início:</strong> {formatDateTime(h.startedAt)}
                        </span>
                        <span>
                          <strong>Término:</strong> {formatDateTime(h.endedAt)}
                        </span>
                        <span>
                          <strong>Bloco:</strong> #{h.blockIndex + 1} · Ciclo #{h.cycleNumber}
                        </span>
                      </div>
                      {h.notes ? (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.45rem", color: "var(--text-primary)", marginTop: "0.15rem" }}>
                          <FileText size={13} style={{ color: "var(--text-muted)", marginTop: 3, flexShrink: 0 }} />
                          <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{h.notes}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                          Sem anotações registradas nesta sessão.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit History Modal */}
      {editingRecord && (
        <div className="modal-overlay" onClick={() => setEditingRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={saveEdit}>
              <div className="modal-header">
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                  Editar <span className="serif-accent">Sessão</span>
                </h3>
                <button type="button" className="btn-icon" onClick={() => setEditingRecord(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Disciplina</label>
                  <input type="text" className="input" value={editingRecord.subjectName} disabled />
                </div>

                <div className="form-group" style={{ marginTop: "1rem" }}>
                  <label className="form-label">Tempo Efetivamente Estudado (minutos) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="1440"
                    className={`input ${editErrors.studiedMinutes ? "input-error" : ""}`}
                    value={editMinutes}
                    onChange={(e) => setEditMinutes(Number(e.target.value))}
                    autoFocus
                  />
                  {editErrors.studiedMinutes && <span className="form-error">{editErrors.studiedMinutes}</span>}
                </div>

                <div className="form-group" style={{ marginTop: "1rem" }}>
                  <label className="form-label">Anotações da Sessão</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingRecord(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
