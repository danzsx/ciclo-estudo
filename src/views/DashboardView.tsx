import React, { useMemo, useState } from "react";
import {
  Play,
  ArrowRight,
  BookOpen,
  MoreVertical,
  Sparkles,
  CheckCircle2,
  Calendar as CalendarIcon,
  TrendingUp,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  formatMinutes,
  dailySeries,
  DIFFICULTY_LABELS,
  subjectCycleProgress,
} from "../core";
import {
  getSubjectVisual,
  getTimeOfDayContext,
  formatTiimoDuration,
} from "../utils/visuals";
import { SubjectIcon } from "../components/SubjectIcon";

export const DashboardView: React.FC = () => {
  const {
    data,
    setActiveTab,
    activeSession,
    currentCycleBlock,
    upcomingCycleBlocks,
    cycleProgressData,
    streakCount,
    totalStudiedMinutes,
    statusCounts,
    dailySeriesData,
    handleLoadDemo,
    searchQuery,
    handleJumpTo,
  } = useApp();

  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [listMode, setListMode] = useState<"upcoming" | "subjects" | "recent">("upcoming");
  const [heroMenuOpen, setHeroMenuOpen] = useState(false);

  const timeContext = getTimeOfDayContext();

  // 28-day calendar series for the Calendar widget
  const calendarDays = useMemo(() => dailySeries(data.history, 28, new Date()), [data.history]);

  // Empty state when no subjects are registered
  if (data.subjects.length === 0) {
    return (
      <div style={{ maxWidth: 680, margin: "2.5rem auto" }}>
        <div
          className="editorial-card"
          style={{
            padding: "3.75rem 2.75rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "1.5rem",
          }}
        >
          <div className="section-kicker" style={{ color: "#73ba9b" }}>
            Arquitetura de Estudos
          </div>

          <div>
            <h1
              style={{
                fontSize: "2.15rem",
                fontWeight: 700,
                letterSpacing: "-0.035em",
                color: "var(--text-primary)",
                lineHeight: 1.15,
                marginBottom: "0.75rem",
              }}
            >
              Estruture seu ciclo com{" "}
              <span className="serif-accent" style={{ fontSize: "2.3rem", fontWeight: 400 }}>
                precisão editorial.
              </span>
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.95rem",
                lineHeight: 1.65,
                maxWidth: 540,
              }}
            >
              O Ciclo calcula automaticamente a proporção ideal de tempo entre suas disciplinas
              combinando relevância no edital e dificuldade individual, em uma sequência clara e contínua.
            </p>
          </div>

          <div
            style={{
              width: "100%",
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <div className="dual-progress-track" style={{ height: 12, maxWidth: 260 }}>
              <div className="dual-progress-fill-sage" style={{ width: "74%" }} />
              <div className="dual-progress-fill-apricot" style={{ width: "16%" }} />
            </div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Distribuição equilibrada por blocos
            </span>
          </div>

          <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", width: "100%", marginTop: "0.25rem" }}>
            <button
              className="btn-continue-pill"
              onClick={() => setActiveTab("subjects")}
              style={{ flex: 1, minWidth: 220 }}
            >
              <BookOpen size={17} />
              <span>Cadastrar Disciplinas</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleLoadDemo}
              style={{ height: 48, padding: "0 1.5rem" }}
            >
              <Sparkles size={16} style={{ color: "#f7a072" }} />
              <span>Carregar Ciclo de Demonstração</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Hero carousel blocks (up to 4 upcoming blocks from the cycle)
  const heroBlocks = upcomingCycleBlocks.slice(0, 4);
  const safeSlideIdx = heroSlideIndex < heroBlocks.length ? heroSlideIndex : 0;
  const featuredBlock = heroBlocks[safeSlideIdx] ?? currentCycleBlock;
  const featuredSubject = featuredBlock
    ? data.subjects.find((s) => s.id === featuredBlock.subjectId)
    : null;

  const subjectProg = featuredSubject
    ? subjectCycleProgress(data, featuredSubject.id)
    : { planned: 0, studied: 0, ratio: 0 };

  // Dual-tone bar calculation (Sage #73ba9b for completed ratio + Apricot #f7a072 for current active block share)
  const cycleRatioPct = Math.round(cycleProgressData.ratio * 100);
  const sageWidthPct = Math.max(8, Math.min(88, cycleRatioPct > 0 ? cycleRatioPct : 68));
  const apricotWidthPct = Math.min(100 - sageWidthPct, 14);

  const maxDayMinutes = Math.max(30, ...dailySeriesData.map((d) => d.minutes));

  const filteredSubjects = data.subjects.filter((s) => {
    if (!searchQuery) return true;
    return s.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const now = new Date();
  const currentMonthName = now.toLocaleDateString("pt-BR", { month: "long" });
  const currentYear = now.getFullYear();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2.25rem",
        maxWidth: 1120,
        margin: "0 auto",
      }}
    >
      {/* Editorial Top Greeting & Cycle Summary Strip */}
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
          <div className="section-kicker">
            {timeContext.greeting} • {timeContext.sectionLabel}
          </div>
          <h1 className="section-hero-title">
            {searchQuery ? (
              <>
                Resultados para <span className="serif-accent">“{searchQuery}”</span>
              </>
            ) : (
              <>
                Visão Geral do{" "}
                <span className="serif-accent" style={{ fontSize: "1.9rem", fontWeight: 400 }}>
                  Ciclo
                </span>
              </>
            )}
          </h1>
        </div>

        {/* Minimalist KPI Summary Strip */}
        <div
          className="tabular-nums"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.75rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Progresso do Ciclo #{data.cycle.cycleNumber}
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {formatMinutes(cycleProgressData.minutesDone)}{" "}
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                / {formatMinutes(cycleProgressData.minutesTotal)}
              </span>
            </div>
          </div>

          <div style={{ width: 1, height: 28, backgroundColor: "var(--border-subtle)" }} />

          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Acumulado Geral
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {formatMinutes(totalStudiedMinutes)}
            </div>
          </div>

          <div style={{ width: 1, height: 28, backgroundColor: "var(--border-subtle)" }} />

          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Consistência
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: streakCount > 0 ? "#73ba9b" : "#f7a072",
                }}
              />
              <span>
                {streakCount} {streakCount === 1 ? "dia" : "dias"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Two-Column Architectural Grid:
          Left: "Jump back in" Reference Hero Card + Carousel Dots
          Right: Impeccable Study Calendar & Discrete Performance Chart */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 1fr",
          gap: "1.75rem",
          alignItems: "start",
        }}
      >
        {/* LEFT COLUMN: Reference Image "Jump back in" Section */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "0.85rem",
            }}
          >
            <h2 className="section-title-editorial">
              Retome de onde <span className="serif-accent" style={{ fontSize: "1.3rem" }}>parou</span>
            </h2>
            <span className="tabular-nums" style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Bloco {cycleProgressData.blocksDone + 1} de {cycleProgressData.blocksTotal}
            </span>
          </div>

          {featuredSubject && featuredBlock ? (
            <div>
              <div
                className="editorial-card"
                style={{
                  padding: "1.9rem 2rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.4rem",
                  border:
                    activeSession && safeSlideIdx === 0
                      ? "1.5px solid var(--brand-identity)"
                      : "1px solid var(--border-subtle)",
                }}
              >
                {/* Top Header of Hero Card: Bold Subject Title + 3-dots menu */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: safeSlideIdx === 0 ? "var(--brand-identity)" : "var(--text-muted)",
                        }}
                      >
                        {activeSession && safeSlideIdx === 0
                          ? activeSession.status === "running"
                            ? "● Sessão em andamento"
                            : "⏸ Sessão pausada"
                          : safeSlideIdx === 0
                          ? "Bloco atual do ciclo"
                          : `Na sequência (+${safeSlideIdx})`}
                      </span>
                      <span style={{ color: "var(--border-strong)" }}>•</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                        {DIFFICULTY_LABELS[featuredSubject.difficulty]} (Peso {featuredSubject.weight})
                      </span>
                    </div>

                    <h3
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "1.45rem",
                        fontWeight: 700,
                        letterSpacing: "-0.025em",
                        color: "var(--text-primary)",
                        lineHeight: 1.25,
                      }}
                    >
                      {featuredSubject.name}: Parte {featuredBlock.part} de {featuredBlock.parts}
                    </h3>
                  </div>

                  {/* Three-dots menu button from Reference Image */}
                  <div style={{ position: "relative" }}>
                    <button
                      className="btn-icon"
                      onClick={() => setHeroMenuOpen((prev) => !prev)}
                      title="Opções do bloco"
                      style={{ borderRadius: "50%", padding: "0.4rem" }}
                    >
                      <MoreVertical size={18} />
                    </button>

                    {heroMenuOpen && (
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: "110%",
                          backgroundColor: "var(--bg-surface)",
                          border: "1px solid var(--border-strong)",
                          borderRadius: "var(--radius-md)",
                          boxShadow: "var(--shadow-lg)",
                          padding: "0.4rem",
                          minWidth: 185,
                          zIndex: 25,
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.15rem",
                        }}
                      >
                        <button
                          className="nav-item-btn"
                          style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}
                          onClick={() => {
                            setHeroMenuOpen(false);
                            setActiveTab("cycle");
                          }}
                        >
                          Ver sequência completa
                        </button>
                        <button
                          className="nav-item-btn"
                          style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}
                          onClick={() => {
                            setHeroMenuOpen(false);
                            setActiveTab("subjects");
                          }}
                        >
                          Editar disciplina
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Signature Dual-Tone Progress Bar (#73ba9b + #f7a072) & Status Label */}
                <div>
                  <div className="dual-progress-track">
                    <div
                      className="dual-progress-fill-sage"
                      style={{ width: `${sageWidthPct}%` }}
                    />
                    <div
                      className="dual-progress-fill-apricot"
                      style={{ width: `${apricotWidthPct}%` }}
                    />
                  </div>

                  <div
                    className="tabular-nums"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "0.65rem",
                      fontSize: "0.84rem",
                      color: "var(--text-secondary)",
                      fontWeight: 500,
                    }}
                  >
                    <span>
                      {cycleProgressData.blocksDone}/{cycleProgressData.blocksTotal} blocos ordenados •{" "}
                      {formatTiimoDuration(featuredBlock.minutes)} nesta sessão
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                      {formatMinutes(subjectProg.studied)}/{formatMinutes(subjectProg.planned)} na matéria
                    </span>
                  </div>
                </div>

                {/* Full-Width "Continue" Pill Button (Reference Image CTA) */}
                <button
                  className="btn-continue-pill"
                  onClick={() => {
                    if (safeSlideIdx !== 0 && !activeSession) {
                      handleJumpTo(featuredBlock.index);
                    }
                    setActiveTab("study");
                  }}
                >
                  <span>
                    {activeSession && safeSlideIdx === 0
                      ? "Continuar Sessão"
                      : safeSlideIdx === 0
                      ? "Continuar"
                      : "Estudar Este Bloco"}
                  </span>
                </button>
              </div>

              {/* Pagination Dots below Hero Card (Reference Image • • • •) */}
              {heroBlocks.length > 1 && (
                <div className="hero-dots" role="tablist" aria-label="Próximos blocos">
                  {heroBlocks.map((b, idx) => {
                    const subj = data.subjects.find((s) => s.id === b.subjectId);
                    return (
                      <button
                        key={`${b.index}-${idx}`}
                        type="button"
                        className={`hero-dot ${safeSlideIdx === idx ? "active" : ""}`}
                        onClick={() => setHeroSlideIndex(idx)}
                        title={subj ? `${subj.name} (${b.minutes} min)` : `Bloco ${idx + 1}`}
                        aria-label={`Visualizar bloco ${idx + 1}`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="editorial-card" style={{ textAlign: "center", padding: "2.5rem" }}>
              <h3 className="serif-title" style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
                Ciclo #{data.cycle.cycleNumber} concluído
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
                Todos os blocos planejados foram percorridos.
              </p>
              <button className="btn-continue-pill" onClick={() => setActiveTab("cycle")}>
                Revisar ou Reiniciar Ciclo
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Impeccable Calendar & Discrete Performance Chart */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "0.85rem",
            }}
          >
            <h2 className="section-title-editorial">
              Calendário & <span className="serif-accent" style={{ fontSize: "1.3rem" }}>Desempenho</span>
            </h2>
            <span
              style={{
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                fontWeight: 500,
                textTransform: "capitalize",
              }}
            >
              {currentMonthName}{" "}
              <span className="serif-accent" style={{ fontSize: "0.88rem" }}>
                {currentYear}
              </span>
            </span>
          </div>

          <div
            className="editorial-card"
            style={{
              padding: "1.45rem 1.6rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            {/* 28-Day Compact Architectural Calendar Matrix */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.65rem",
                }}
              >
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <CalendarIcon size={13} style={{ color: "#73ba9b" }} />
                  Frequência ( últimos 28 dias )
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", fontSize: "0.68rem", color: "var(--text-muted)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: "#f7a072" }} /> Parcial
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: "#73ba9b" }} /> Meta
                  </span>
                </div>
              </div>

              <div className="calendar-matrix">
                {calendarDays.map((d, i) => {
                  const dayNum = new Date(d.date + "T12:00:00").getDate();
                  const isToday = i === calendarDays.length - 1;
                  const hasFullStudy = d.minutes >= 45;
                  const hasLightStudy = d.minutes > 0 && d.minutes < 45;

                  return (
                    <div
                      key={d.date}
                      title={`${d.date}: ${formatMinutes(d.minutes)}`}
                      style={{
                        height: 28,
                        borderRadius: 7,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem",
                        fontWeight: isToday || d.minutes > 0 ? 700 : 500,
                        fontVariantNumeric: "tabular-nums",
                        backgroundColor: hasFullStudy
                          ? "#73ba9b"
                          : hasLightStudy
                          ? "var(--brand-apricot-subtle)"
                          : "var(--bg-surface-subtle)",
                        color: hasFullStudy
                          ? "#002a32"
                          : hasLightStudy
                          ? "var(--brand-apricot-dark)"
                          : "var(--text-muted)",
                        border: isToday
                          ? "1.5px solid var(--brand-petrol)"
                          : hasLightStudy
                          ? "1px solid var(--brand-apricot-border)"
                          : "1px solid transparent",
                      }}
                    >
                      {dayNum}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hairline Divider */}
            <div style={{ height: 1, backgroundColor: "var(--border-subtle)" }} />

            {/* Discrete 7-Day Performance Chart */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.6rem",
                }}
              >
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <TrendingUp size={13} style={{ color: "#f7a072" }} />
                  Ritmo Semanal Discreto
                </span>
                <span className="tabular-nums" style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
                  {formatMinutes(dailySeriesData.reduce((a, b) => a + b.minutes, 0))} na semana
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  height: 68,
                  gap: "0.5rem",
                  paddingTop: "0.25rem",
                }}
              >
                {dailySeriesData.map((d, i) => {
                  const pct = Math.round((d.minutes / maxDayMinutes) * 100);
                  const dayLabel = new Date(d.date + "T12:00:00")
                    .toLocaleDateString("pt-BR", { weekday: "short" })
                    .replace(".", "")
                    .slice(0, 3);
                  const isToday = i === dailySeriesData.length - 1;

                  return (
                    <div
                      key={d.date}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.35rem",
                        height: "100%",
                        justifyContent: "flex-end",
                      }}
                      title={`${d.date}: ${formatMinutes(d.minutes)}`}
                    >
                      <div
                        style={{
                          width: 10,
                          height: `${Math.max(10, pct)}%`,
                          borderRadius: 999,
                          backgroundColor:
                            d.minutes > 0
                              ? isToday
                                ? "#f7a072"
                                : "#73ba9b"
                              : "var(--bg-surface-subtle)",
                          transition: "height 0.3s ease",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: isToday ? 700 : 500,
                          color: isToday ? "var(--text-primary)" : "var(--text-muted)",
                          textTransform: "uppercase",
                        }}
                      >
                        {dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reference Image "Recents" Section: Clean Rounded-Square Icon Tiles + Impeccable Hierarchy */}
      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
            <h2 className="section-title-editorial">
              Recentes & <span className="serif-accent" style={{ fontSize: "1.3rem" }}>Sequência</span>
            </h2>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Toque em qualquer item para iniciar
            </span>
          </div>

          {/* Minimal Segmented Filter Pills */}
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`chip-pill ${listMode === "upcoming" ? "active" : ""}`}
              onClick={() => setListMode("upcoming")}
            >
              Próximos Blocos ({upcomingCycleBlocks.length})
            </button>
            <button
              type="button"
              className={`chip-pill ${listMode === "subjects" ? "active" : ""}`}
              onClick={() => setListMode("subjects")}
            >
              Biblioteca ({filteredSubjects.length})
            </button>
            <button
              type="button"
              className={`chip-pill ${listMode === "recent" ? "active" : ""}`}
              onClick={() => setListMode("recent")}
            >
              Histórico Recente ({data.history.slice(0, 6).length})
            </button>
          </div>
        </div>

        {/* 2-Column Clean List inspired by Quizlet/Mobbin "Recents" */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "0.85rem",
          }}
        >
          {listMode === "upcoming" &&
            upcomingCycleBlocks.map((b, idx) => {
              const subj = data.subjects.find((s) => s.id === b.subjectId);
              if (!subj) return null;
              const visual = getSubjectVisual(subj.name, idx);
              const isCurrent = idx === 0;

              return (
                <div
                  key={`${b.index}-${idx}`}
                  className="editorial-card tiimo-card-interactive"
                  style={{
                    padding: "1.05rem 1.25rem",
                    borderRadius: "var(--radius-lg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    border: isCurrent
                      ? "1.5px solid var(--brand-petrol)"
                      : "1px solid var(--border-subtle)",
                  }}
                  onClick={() => {
                    if (!activeSession) {
                      handleJumpTo(b.index);
                    }
                    setActiveTab("study");
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.95rem", minWidth: 0 }}>
                    <SubjectIcon visual={visual} size="md" active={isCurrent} />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {subj.name}
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-secondary)",
                          marginTop: "0.15rem",
                        }}
                      >
                        {formatTiimoDuration(b.minutes)} • Bloco {b.part} de {b.parts} • Peso {subj.weight}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: "0.66rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.55rem",
                          borderRadius: "var(--radius-full)",
                          backgroundColor: "var(--brand-sage-subtle)",
                          color: "var(--brand-sage-dark)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        Atual
                      </span>
                    )}
                    <ArrowRight size={16} style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
              );
            })}

          {listMode === "subjects" &&
            filteredSubjects.map((subj, idx) => {
              const visual = getSubjectVisual(subj.name, idx);
              const alloc = data.cycle.plan?.allocations.find((a) => a.subjectId === subj.id);

              return (
                <div
                  key={subj.id}
                  className="editorial-card tiimo-card-interactive"
                  style={{
                    padding: "1.05rem 1.25rem",
                    borderRadius: "var(--radius-lg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                  }}
                  onClick={() => {
                    const blk = data.cycle.plan?.blocks.find((b) => b.subjectId === subj.id);
                    if (blk && !activeSession) {
                      handleJumpTo(blk.index);
                      setActiveTab("study");
                    } else {
                      setActiveTab("subjects");
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.95rem", minWidth: 0 }}>
                    <SubjectIcon visual={visual} size="md" />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {subj.name}
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-secondary)",
                          marginTop: "0.15rem",
                        }}
                      >
                        {alloc ? `${alloc.blocks} blocos (${formatTiimoDuration(alloc.minutes)})` : "No ciclo"} •{" "}
                        {DIFFICULTY_LABELS[subj.difficulty]}
                      </div>
                    </div>
                  </div>

                  <Play size={15} style={{ color: "var(--brand-identity)", flexShrink: 0 }} />
                </div>
              );
            })}

          {listMode === "recent" &&
            (data.history.length === 0 ? (
              <div
                className="editorial-card"
                style={{
                  gridColumn: "1 / -1",
                  padding: "2rem",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "0.88rem",
                }}
              >
                Nenhuma sessão finalizada ainda. Inicie seu primeiro bloco acima para registrar seu histórico.
              </div>
            ) : (
              data.history.slice(0, 6).map((h, idx) => {
                const visual = getSubjectVisual(h.subjectName, idx);
                return (
                  <div
                    key={h.id}
                    className="editorial-card tiimo-card-interactive"
                    style={{
                      padding: "1.05rem 1.25rem",
                      borderRadius: "var(--radius-lg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                    }}
                    onClick={() => setActiveTab("history")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.95rem", minWidth: 0 }}>
                      <SubjectIcon visual={visual} size="md" />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {h.subjectName}
                        </div>
                        <div
                          className="tabular-nums"
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--text-secondary)",
                            marginTop: "0.15rem",
                          }}
                        >
                          {formatMinutes(h.studiedMinutes)} estudados • Ciclo #{h.cycleNumber}
                        </div>
                      </div>
                    </div>

                    <CheckCircle2
                      size={16}
                      style={{
                        color: h.status === "completed" ? "#73ba9b" : "#f7a072",
                        flexShrink: 0,
                      }}
                    />
                  </div>
                );
              })
            ))}
        </div>
      </section>

      {/* Bottom Architectural Overview Strip: Cycle Proportion & Statistics */}
      {data.cycle.plan && data.cycle.plan.allocations.length > 0 && (
        <section className="editorial-card" style={{ padding: "1.5rem 1.85rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.9rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Equilíbrio Proporcional do <span className="serif-accent" style={{ fontSize: "1.1rem" }}>Ciclo</span>
              </h3>
              <span className="tabular-nums" style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                {statusCounts.completed + statusCounts.partial} sessões realizadas •{" "}
                {data.cycle.completedCycles} ciclos completos
              </span>
            </div>

            <button
              onClick={() => setActiveTab("cycle")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--brand-identity)",
              }}
            >
              <span>Inspecionar distribuição</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Clean Proportional Segmented Bar */}
          <div
            style={{
              height: 10,
              width: "100%",
              borderRadius: 999,
              overflow: "hidden",
              display: "flex",
              gap: 2,
              backgroundColor: "var(--bg-surface-subtle)",
            }}
          >
            {data.cycle.plan.allocations.map((a, idx) => {
              const subj = data.subjects.find((s) => s.id === a.subjectId);
              if (!subj || a.minutes === 0) return null;
              const pct = (a.minutes / data.cycle.plan!.totalMinutes) * 100;
              const barPalette = ["#002a32", "#73ba9b", "#f7a072", "#3b43d6", "#1e555c", "#529e7e"];
              return (
                <div
                  key={a.subjectId}
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    backgroundColor: barPalette[idx % barPalette.length],
                    borderRadius: 999,
                  }}
                  title={`${subj.name}: ${formatMinutes(a.minutes)}`}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
