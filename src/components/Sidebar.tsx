import React from "react";
import {
  LayoutGrid,
  BookOpen,
  Repeat,
  Play,
  BarChart2,
  Compass,
  Sliders,
  ArrowUpRight,
} from "lucide-react";
import { useApp, type NavTab } from "../context/AppContext";
import { ATLAS_CATALOG, formatMinutes } from "../core";

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    activeSession,
    data,
    streakCount,
    cycleProgressData,
  } = useApp();

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
  }> = [
    {
      id: "dashboard",
      label: "Início",
      icon: <LayoutGrid size={17} strokeWidth={1.85} />,
    },
    {
      id: "study",
      label: "Sessão de Foco",
      icon: <Play size={17} strokeWidth={1.85} />,
      badge: activeSession
        ? activeSession.status === "running"
          ? "Em curso"
          : "Pausa"
        : undefined,
    },
    {
      id: "cycle",
      label: "Ciclo de Estudos",
      icon: <Repeat size={17} strokeWidth={1.85} />,
      badge: data.cycle.plan ? `${data.cycle.plan.blocks.length}` : undefined,
    },
    {
      id: "subjects",
      label: "Biblioteca",
      icon: <BookOpen size={17} strokeWidth={1.85} />,
      badge: data.subjects.length > 0 ? data.subjects.length : undefined,
    },
    {
      id: "history",
      label: "Estatísticas",
      icon: <BarChart2 size={17} strokeWidth={1.85} />,
      badge: data.history.length > 0 ? data.history.length : undefined,
    },
    {
      id: "collection",
      label: "Coleção",
      icon: <Compass size={17} strokeWidth={1.85} />,
      badge: `${data.atlas.unlocked.length}/${ATLAS_CATALOG.length}`,
    },
    {
      id: "settings",
      label: "Parâmetros",
      icon: <Sliders size={17} strokeWidth={1.85} />,
    },
  ];

  const pct = Math.round(cycleProgressData.ratio * 100);

  return (
    <aside className="sidebar">
      <div>
        {/* Bespoke Brand Identity Header */}
        <div className="brand-header">
          <div className="brand-mark" title="Ciclo — Arquitetura de Estudos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3.5A8.5 8.5 0 1 0 20.5 12"
                stroke="#73ba9b"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M20.5 12A8.5 8.5 0 0 0 14.5 3.88"
                stroke="#f7a072"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="2.6" fill="#ffffff" />
            </svg>
          </div>
          <div className="brand-title-wrap">
            <span className="brand-title">
              Ciclo <span className="serif-accent" style={{ fontSize: "1.05rem", color: "var(--text-secondary)" }}>editorial</span>
            </span>
            <span className="brand-tagline">Arquitetura de Estudos</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav aria-label="Navegação principal">
          <ul className="nav-list">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const isSessionTab = item.id === "study" && activeSession;
              return (
                <li key={item.id}>
                  <button
                    className={`nav-item-btn ${isActive ? "active" : ""}`}
                    onClick={() => setActiveTab(item.id)}
                    style={
                      isSessionTab && !isActive
                        ? {
                            border: "1px solid var(--brand-sage-border)",
                            backgroundColor: "var(--brand-sage-subtle)",
                            color: "var(--brand-petrol)",
                          }
                        : undefined
                    }
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Minimalist Architectural Footer */}
      <div className="sidebar-footer">
        {activeSession ? (
          <div
            onClick={() => setActiveTab("study")}
            style={{
              padding: "0.85rem 0.95rem",
              backgroundColor: "var(--brand-petrol)",
              color: "#ffffff",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "transform var(--transition-fast)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: "#73ba9b",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "0.15rem",
                }}
              >
                {activeSession.status === "running" ? "● Em andamento" : "⏸ Em pausa"}
              </div>
              <div
                style={{
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {activeSession.subjectName}
              </div>
            </div>
            <ArrowUpRight size={16} style={{ color: "#f7a072", flexShrink: 0 }} />
          </div>
        ) : (
          <div
            style={{
              padding: "0.85rem 0.95rem",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              flexDirection: "column",
              gap: "0.55rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.75rem",
              }}
            >
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                Ciclo <span className="serif-accent">#{data.cycle.cycleNumber}</span>
              </span>
              <span className="tabular-nums" style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                {pct}%
              </span>
            </div>

            {/* Mini Dual-Tone Progress Strip */}
            <div
              style={{
                height: 6,
                width: "100%",
                borderRadius: 999,
                backgroundColor: "var(--bg-surface-subtle)",
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: `${Math.max(0, pct)}%`,
                  backgroundColor: "#73ba9b",
                  transition: "width 0.3s ease",
                }}
              />
              {pct < 100 && data.subjects.length > 0 && (
                <div
                  style={{
                    width: "12%",
                    backgroundColor: "#f7a072",
                  }}
                />
              )}
            </div>

            <div
              className="tabular-nums"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.7rem",
                color: "var(--text-muted)",
              }}
            >
              <span>{formatMinutes(cycleProgressData.minutesDone)} concluídos</span>
              <span>{streakCount}d seguidos</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
