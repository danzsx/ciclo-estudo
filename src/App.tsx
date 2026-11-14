import React from "react";
import { AppProvider, useApp, type NavTab } from "./context/AppContext";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./views/DashboardView";
import { SubjectsView } from "./views/SubjectsView";
import { CycleView } from "./views/CycleView";
import { StudyView } from "./views/StudyView";
import { HistoryView } from "./views/HistoryView";
import { CollectionView } from "./views/CollectionView";
import { SettingsView } from "./views/SettingsView";
import { AtlasRevealModal } from "./components/AtlasRevealModal";
import { RARITY_META } from "./core";
import {
  Check,
  X,
  AlertTriangle,
  Search,
  Sun,
  Moon,
  Home,
  Plus,
  Folder,
  Play,
  BarChart2,
  Compass,
} from "lucide-react";

const MainContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    notices,
    clearNotice,
    saveError,
    searchQuery,
    setSearchQuery,
    data,
    handleUpdateTheme,
    streakCount,
    pendingReveals,
    activeReveal,
    openReveal,
    dismissReveal,
    closeActiveReveal,
  } = useApp();

  const isDarkMode =
    data.preferences.theme === "dark" ||
    (data.preferences.theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    handleUpdateTheme(isDarkMode ? "light" : "dark");
  };

  const dockItems: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: "dashboard", label: "Início", icon: <Home size={17} strokeWidth={1.9} /> },
    { id: "study", label: "Estudar", icon: <Play size={17} strokeWidth={1.9} /> },
    { id: "subjects", label: "Criar", icon: <Plus size={18} strokeWidth={1.9} /> },
    { id: "cycle", label: "Biblioteca", icon: <Folder size={17} strokeWidth={1.9} /> },
    { id: "history", label: "Análise", icon: <BarChart2 size={17} strokeWidth={1.9} /> },
    { id: "collection", label: "Coleção", icon: <Compass size={17} strokeWidth={1.9} /> },
  ];

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-wrapper">
        <header className="top-bar">
          {/* Pill Search Bar inspired by the Reference Image */}
          <div className="search-capsule-wrapper">
            <Search size={16} className="search-icon-inside" />
            <input
              type="text"
              className="search-capsule"
              placeholder="Buscar disciplina, bloco ou anotação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="btn-icon"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "0.6rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: "0.25rem",
                }}
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {saveError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.78rem",
                  color: "var(--accent-hard)",
                  backgroundColor: "var(--accent-hard-bg)",
                  padding: "0.35rem 0.85rem",
                  borderRadius: "var(--radius-full)",
                }}
              >
                <AlertTriangle size={14} />
                <span>{saveError}</span>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              className="btn-icon"
              onClick={toggleTheme}
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                boxShadow: "var(--shadow-sm)",
              }}
              title={isDarkMode ? "Alternar para superfície clara" : "Alternar para superfície escura"}
            >
              {isDarkMode ? (
                <Sun size={16} style={{ color: "#f7a072" }} />
              ) : (
                <Moon size={16} style={{ color: "var(--brand-petrol)" }} />
              )}
            </button>

            {/* Profile / Cadence Avatar Badge (Inspired by top-right avatar in Reference Image) */}
            <button
              onClick={() => setActiveTab("settings")}
              title={`Ciclo #${data.cycle.cycleNumber} • ${streakCount} dias de sequência`}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #73ba9b 0%, #3b43d6 100%)",
                padding: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  backgroundColor: "var(--brand-petrol)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                C{data.cycle.cycleNumber}
              </div>
            </button>
          </div>
        </header>

        <section className="content-scroll">
          {activeTab === "dashboard" && <DashboardView />}
          {activeTab === "subjects" && <SubjectsView />}
          {activeTab === "cycle" && <CycleView />}
          {activeTab === "study" && <StudyView />}
          {activeTab === "history" && <HistoryView />}
          {activeTab === "collection" && <CollectionView />}
          {activeTab === "settings" && <SettingsView />}
        </section>

        {/* Reference-Inspired Floating Bottom Pill Navigation Dock */}
        <nav className="floating-pill-dock" aria-label="Acesso rápido">
          {dockItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`dock-pill-btn ${isActive ? "active" : ""}`}
                onClick={() => setActiveTab(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Floating Toasts for notices */}
        {notices.map((n, idx) => (
          <div key={idx} className="toast-notice">
            <Check size={16} style={{ color: "#73ba9b" }} />
            <span style={{ fontSize: "0.84rem", fontWeight: 500 }}>{n}</span>
            <button
              className="btn-icon"
              onClick={() => clearNotice(idx)}
              style={{ color: "rgba(255,255,255,0.7)", padding: "0.2rem" }}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Discrete ATLAS Unlock Notification */}
        {pendingReveals.length > 0 && !activeReveal && (
          <div
            className="toast-notice"
            data-testid="atlas-unlock-toast"
            style={{
              bottom: notices.length > 0 ? "8.5rem" : "5rem",
              border: "1px solid rgba(115, 186, 155, 0.35)",
              borderRadius: "var(--radius-md)",
              padding: "0.75rem 1rem",
              maxWidth: 380,
            }}
          >
            <Compass size={18} style={{ color: "#f7a072", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#73ba9b" }}>
                ATLAS · {RARITY_META[pendingReveals[0].rarity].label}
              </div>
              <div style={{ fontSize: "0.84rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {pendingReveals[0].name}
              </div>
            </div>
            <button
              type="button"
              onClick={() => openReveal(pendingReveals[0])}
              style={{
                backgroundColor: "#73ba9b",
                color: "#002a32",
                border: "none",
                borderRadius: "var(--radius-full)",
                padding: "0.35rem 0.75rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Abrir carta
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={() => dismissReveal(pendingReveals[0].id)}
              aria-label="Dispensar notificação"
              style={{ color: "rgba(255,255,255,0.7)", padding: "0.2rem" }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ATLAS Card Revelation Modal */}
        {activeReveal && (
          <AtlasRevealModal
            definition={activeReveal}
            unlocked={data.atlas.unlocked.find((u) => u.id === activeReveal.id)}
            onClose={closeActiveReveal}
            onGoToCollection={() => {
              closeActiveReveal();
              setActiveTab("collection");
            }}
          />
        )}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
};

export default App;
