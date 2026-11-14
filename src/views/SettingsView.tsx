import React, { useState } from "react";
import {
  Moon,
  Sun,
  Laptop,
  Download,
  Upload,
  FolderOpen,
  Sparkles,
  AlertTriangle,
  Check,
  Sliders,
  Database,
  Palette,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatMinutes, type CycleSettings } from "../core";

export const SettingsView: React.FC = () => {
  const {
    data,
    handleUpdateSettings,
    handleUpdateTheme,
    handleExportBackup,
    handleImportBackup,
    handleOpenDataFolder,
    handleLoadDemo,
    handleRemoveDemo,
    hasDemoSubjects,
    handleResetAll,
    storageLocation,
    isNativeDesktop,
  } = useApp();

  const [cycleHours, setCycleHours] = useState(data.settings.cycleMinutes / 60);
  const [sessionMinutes, setSessionMinutes] = useState(data.settings.sessionMinutes);
  const [minBlockMinutes, setMinBlockMinutes] = useState(data.settings.minBlockMinutes);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsErrors, setSettingsErrors] = useState<Record<string, string>>({});
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cycleMinutes = Math.round(cycleHours * 60);
    const newSettings: CycleSettings = {
      cycleMinutes,
      sessionMinutes,
      minBlockMinutes,
    };
    const res = handleUpdateSettings(newSettings);
    if (res.ok) {
      setSettingsSuccess(true);
      setSettingsErrors({});
      setTimeout(() => setSettingsSuccess(false), 3000);
    } else if (res.errors) {
      setSettingsErrors(res.errors);
      setSettingsSuccess(false);
    }
  };

  const onExport = async () => {
    try {
      const path = await handleExportBackup();
      if (path) {
        setBackupMsg(`Backup exportado com sucesso: ${path}`);
      }
    } catch (err: unknown) {
      setBackupMsg(`Erro ao exportar backup: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const onImport = async () => {
    const res = await handleImportBackup();
    if (res.ok) {
      setBackupMsg("Backup importado com sucesso. Todos os dados foram restaurados.");
    } else if (res.error) {
      setBackupMsg(`Erro ao importar: ${res.error}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.85rem", maxWidth: 920, margin: "0 auto" }}>
      {/* Editorial Header */}
      <div
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "1.15rem",
        }}
      >
        <div className="section-kicker">Preferências do Sistema</div>
        <h1 className="section-hero-title">
          Parâmetros &{" "}
          <span className="serif-accent" style={{ fontSize: "1.9rem", fontWeight: 400 }}>
            Calibragem
          </span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
          Configure limites operacionais do ciclo, superfície cromática e persistência de dados locais.
        </p>
      </div>

      {backupMsg && (
        <div
          style={{
            padding: "0.85rem 1.25rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--accent-easy-bg)",
            border: "1px solid var(--accent-easy-border)",
            color: "var(--accent-easy)",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.55rem",
          }}
        >
          <Check size={16} />
          <span>{backupMsg}</span>
        </div>
      )}

      {/* Cycle Parameters Form */}
      <div className="editorial-card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.25rem" }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: "var(--brand-sage-subtle)",
              color: "var(--brand-sage-dark)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sliders size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Dimensionamento do <span className="serif-accent" style={{ fontSize: "1.2rem" }}>Ciclo</span>
            </h3>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Metas de tempo para o algoritmo de distribuição proporcional
            </span>
          </div>
        </div>

        <form onSubmit={saveSettings} style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.15rem" }}>
            <div className="form-group">
              <label className="form-label">Carga Total do Ciclo (horas)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="100"
                className={`input ${settingsErrors.cycleMinutes ? "input-error" : ""}`}
                value={cycleHours}
                onChange={(e) => setCycleHours(Number(e.target.value))}
              />
              <span className="tabular-nums" style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                Equivale a {formatMinutes(cycleHours * 60)} totais.
              </span>
              {settingsErrors.cycleMinutes && <span className="form-error">{settingsErrors.cycleMinutes}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Duração Padrão do Bloco (minutos)</label>
              <input
                type="number"
                step="5"
                min="15"
                max="180"
                className={`input ${settingsErrors.sessionMinutes ? "input-error" : ""}`}
                value={sessionMinutes}
                onChange={(e) => setSessionMinutes(Number(e.target.value))}
              />
              <span style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                Duração base de cada sessão (ex: 50 min).
              </span>
              {settingsErrors.sessionMinutes && <span className="form-error">{settingsErrors.sessionMinutes}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Bloco Mínimo Permitido (minutos)</label>
              <input
                type="number"
                step="5"
                min="10"
                max="60"
                className={`input ${settingsErrors.minBlockMinutes ? "input-error" : ""}`}
                value={minBlockMinutes}
                onChange={(e) => setMinBlockMinutes(Number(e.target.value))}
              />
              <span style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                Impede sessões excessivamente curtas.
              </span>
              {settingsErrors.minBlockMinutes && <span className="form-error">{settingsErrors.minBlockMinutes}</span>}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button type="submit" className="btn btn-primary">
              Salvar e Recalcular Ciclo
            </button>
            {settingsSuccess && (
              <span style={{ color: "var(--accent-easy)", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: 600 }}>
                <Check size={15} /> Parâmetros atualizados com sucesso.
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Theme Preferences */}
      <div className="editorial-card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.25rem" }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: "var(--brand-petrol-subtle)",
              color: "var(--brand-petrol)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Palette size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Superfície & <span className="serif-accent" style={{ fontSize: "1.2rem" }}>Atmosfera</span>
            </h3>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Paleta ancorada em #002a32, #73ba9b e #f7a072
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", maxWidth: 620 }}>
          <button
            type="button"
            className={`chip-pill ${data.preferences.theme === "light" ? "active" : ""}`}
            style={{ padding: "0.75rem 1.1rem", justifyContent: "center" }}
            onClick={() => handleUpdateTheme("light")}
          >
            <Sun size={16} style={{ color: "#f7a072" }} />
            <span>Off-White Editorial</span>
          </button>

          <button
            type="button"
            className={`chip-pill ${data.preferences.theme === "dark" ? "active" : ""}`}
            style={{ padding: "0.75rem 1.1rem", justifyContent: "center" }}
            onClick={() => handleUpdateTheme("dark")}
          >
            <Moon size={16} style={{ color: "#73ba9b" }} />
            <span>Azul Abissal (#002a32)</span>
          </button>

          <button
            type="button"
            className={`chip-pill ${data.preferences.theme === "system" ? "active" : ""}`}
            style={{ padding: "0.75rem 1.1rem", justifyContent: "center" }}
            onClick={() => handleUpdateTheme("system")}
          >
            <Laptop size={16} />
            <span>Automático (Sistema)</span>
          </button>
        </div>
      </div>

      {/* Backup & Persistence */}
      <div className="editorial-card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.25rem" }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: "var(--brand-apricot-subtle)",
              color: "var(--brand-apricot-dark)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Database size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Armazenamento & <span className="serif-accent" style={{ fontSize: "1.2rem" }}>Dados</span>
            </h3>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Persistência local, exportação de backups e dados de demonstração
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Caminho de Armazenamento
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "0.8rem",
                padding: "0.65rem 0.95rem",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-surface-subtle)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)",
                wordBreak: "break-all",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>{storageLocation}</span>
              {isNativeDesktop && (
                <button className="btn-icon" onClick={handleOpenDataFolder} title="Abrir pasta no Explorer">
                  <FolderOpen size={16} />
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.65rem",
              flexWrap: "wrap",
              alignItems: "center",
              paddingTop: "0.75rem",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <button className="chip-pill" onClick={onExport}>
              <Download size={14} />
              <span>Exportar Backup (JSON)</span>
            </button>

            <button className="chip-pill" onClick={onImport}>
              <Upload size={14} />
              <span>Importar Backup</span>
            </button>

            {hasDemoSubjects ? (
              <button className="chip-pill" onClick={handleRemoveDemo}>
                <Sparkles size={14} style={{ color: "#f7a072" }} />
                <span>Remover Matérias de Exemplo</span>
              </button>
            ) : (
              <button className="chip-pill" onClick={handleLoadDemo}>
                <Sparkles size={14} style={{ color: "#f7a072" }} />
                <span>Carregar Exemplo</span>
              </button>
            )}

            <button
              className="btn btn-danger"
              onClick={() => setResetConfirmOpen(true)}
              style={{ marginLeft: "auto", padding: "0.45rem 1rem", fontSize: "0.8rem" }}
            >
              Redefinir Dados
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {resetConfirmOpen && (
        <div className="modal-overlay" onClick={() => setResetConfirmOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: "center", padding: "2rem" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent-hard-bg)",
                  color: "var(--accent-hard)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.45rem" }}>
                Redefinir Todos os Dados?
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
                Todas as disciplinas, parâmetros e sessões serão removidos permanentemente. Exporte um backup antes de prosseguir.
              </p>
              <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center" }}>
                <button className="btn btn-secondary" onClick={() => setResetConfirmOpen(false)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    handleResetAll();
                    setResetConfirmOpen(false);
                  }}
                >
                  Confirmar e Zerar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
