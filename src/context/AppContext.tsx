import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  type ActiveSession,
  type AchievementDefinition,
  type AppData,
  type CycleBlock,
  type CycleSettings,
  type Preferences,
  type SubjectInput,
  addSubject,
  createBackup,
  createEmptyData,
  currentBlock,
  deleteSubject,
  discardSession,
  elapsedMs,
  finishSession,
  hasDemo,
  heartbeatSession,
  jumpTo,
  loadDemo,
  moveSubject,
  parseBackup,
  pauseSession,
  removeDemo,
  resetAll,
  restartCycle,
  resumeSession,
  setSessionNotes,
  skipBlock,
  startSession,
  updateHistoryRecord,
  deleteHistoryRecord,
  updatePreferences,
  updateSettings,
  updateSubject,
  upcomingBlocks,
  cycleProgress,
  statsBySubject,
  dailySeries,
  currentStreak,
  totalStudied,
  countByStatus,
  diffUnlockedAchievements,
} from "../core";
import {
  LocalStorageAdapter,
  TauriAdapter,
  ElectronAdapter,
  isTauri,
  isElectron,
  Repository,
  getPlatformFiles,
} from "../storage";

export type NavTab = "dashboard" | "subjects" | "cycle" | "study" | "history" | "collection" | "settings";

interface AppContextValue {
  data: AppData;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  loading: boolean;
  saveError: string | null;
  notices: string[];
  clearNotice: (idx: number) => void;
  storageLocation: string;
  isNativeDesktop: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Active Session / Timer
  activeSession: ActiveSession | null;
  activeElapsedMs: number;
  currentCycleBlock: CycleBlock | null;
  upcomingCycleBlocks: CycleBlock[];

  // CRUD Subjects
  handleAddSubject: (input: SubjectInput) => { ok: boolean; errors?: Record<string, string> };
  handleUpdateSubject: (id: string, input: SubjectInput) => { ok: boolean; errors?: Record<string, string> };
  handleDeleteSubject: (id: string) => void;
  handleMoveSubject: (id: string, dir: -1 | 1) => void;

  // Settings & Preferences
  handleUpdateSettings: (settings: CycleSettings) => { ok: boolean; errors?: Record<string, string> };
  handleUpdateTheme: (theme: Preferences["theme"]) => void;

  // Cycle navigation
  handleJumpTo: (index: number) => void;
  handleRestartCycle: () => void;

  // Study Flow
  handleStartSession: () => void;
  handlePauseSession: () => void;
  handleResumeSession: () => void;
  handleDiscardSession: () => void;
  handleFinishSession: (studiedMinutes: number, notes?: string) => { ok: boolean; errors?: Record<string, string> };
  handleSkipBlock: () => void;
  handleUpdateSessionNotes: (notes: string) => void;

  // History CRUD
  handleUpdateHistoryRecord: (id: string, patch: { studiedMinutes?: number; notes?: string }) => { ok: boolean; errors?: Record<string, string> };
  handleDeleteHistoryRecord: (id: string) => void;

  // Demos & Backups
  handleLoadDemo: () => void;
  handleRemoveDemo: () => void;
  hasDemoSubjects: boolean;
  handleResetAll: () => void;
  handleExportBackup: () => Promise<string | null>;
  handleImportBackup: () => Promise<{ ok: boolean; error?: string }>;
  handleOpenDataFolder: () => Promise<void>;

  // Analytics Computed
  cycleProgressData: ReturnType<typeof cycleProgress>;
  subjectStatsData: ReturnType<typeof statsBySubject>;
  dailySeriesData: ReturnType<typeof dailySeries>;
  streakCount: number;
  totalStudiedMinutes: number;
  statusCounts: ReturnType<typeof countByStatus>;

  // ATLAS Unlock Revelation
  pendingReveals: AchievementDefinition[];
  activeReveal: AchievementDefinition | null;
  openReveal: (def: AchievementDefinition) => void;
  dismissReveal: (id: string) => void;
  closeActiveReveal: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(() => createEmptyData());
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [storageLocation, setStorageLocation] = useState<string>("Carregando...");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [pendingReveals, setPendingReveals] = useState<AchievementDefinition[]>([]);
  const [activeReveal, setActiveReveal] = useState<AchievementDefinition | null>(null);

  const repoRef = useRef<Repository | null>(null);
  const platformFiles = useMemo(() => getPlatformFiles(), []);

  // Initialize repository
  useEffect(() => {
    let adapter;
    if (isElectron()) {
      adapter = new ElectronAdapter();
    } else if (isTauri()) {
      adapter = new TauriAdapter();
    } else {
      adapter = new LocalStorageAdapter();
    }
    const repo = new Repository(adapter);
    repoRef.current = repo;

    repo.onSaveStatus((err: Error | null) => {
      setSaveError(err ? `Falha ao salvar dados: ${err.message}` : null);
    });

    repo.location().then(setStorageLocation).catch(() => setStorageLocation("Armazenamento local"));

    repo.load(new Date()).then((res: { data: AppData; notices: string[] }) => {
      setData(res.data);
      if (res.notices.length > 0) {
        setNotices(res.notices);
      }
      setLoading(false);
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(`Erro ao carregar dados: ${msg}`);
      setLoading(false);
    });
  }, []);

  // Save automatically when data changes
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!loading && repoRef.current) {
      repoRef.current.save(data).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setSaveError(`Erro ao salvar: ${msg}`);
      });
    }
  }, [data, loading]);

  // Apply Theme
  useEffect(() => {
    const root = document.documentElement;
    const theme = data.preferences.theme;
    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", isDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [data.preferences.theme]);

  // Real-time tick for timer
  useEffect(() => {
    if (data.activeSession && data.activeSession.status === "running") {
      const interval = setInterval(() => {
        setNowMs(Date.now());
      }, 500);
      return () => clearInterval(interval);
    }
  }, [data.activeSession?.status]);

  // Heartbeat periodic recording (every 15s) for crash-safety
  useEffect(() => {
    if (data.activeSession && data.activeSession.status === "running") {
      const hbInterval = setInterval(() => {
        setData((prev) => heartbeatSession(prev, { now: new Date() }));
      }, 15000);
      return () => clearInterval(hbInterval);
    }
  }, [data.activeSession?.status]);

  // Helper context for operations
  const getCtx = () => ({
    now: new Date(),
    newId: () => `c_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  });

  const clearNotice = (idx: number) => {
    setNotices((prev) => prev.filter((_, i) => i !== idx));
  };

  // Timer Calculations
  const activeElapsedMs = useMemo(() => {
    if (!data.activeSession) return 0;
    return elapsedMs(data.activeSession, nowMs);
  }, [data.activeSession, nowMs]);

  const currentCycleBlock = useMemo(() => currentBlock(data), [data]);
  const upcomingCycleBlocks = useMemo(() => upcomingBlocks(data, 6), [data]);

  // CRUD Subjects Handlers
  const handleAddSubject = (input: SubjectInput) => {
    const res = addSubject(data, input, getCtx());
    if (res.ok) {
      setData(res.value);
      return { ok: true };
    }
    return { ok: false, errors: res.errors };
  };

  const handleUpdateSubject = (id: string, input: SubjectInput) => {
    const res = updateSubject(data, id, input, getCtx());
    if (res.ok) {
      setData(res.value);
      return { ok: true };
    }
    return { ok: false, errors: res.errors };
  };

  const handleDeleteSubject = (id: string) => {
    setData((prev) => deleteSubject(prev, id, getCtx()));
  };

  const handleMoveSubject = (id: string, dir: -1 | 1) => {
    setData((prev) => moveSubject(prev, id, dir, getCtx()));
  };

  // Settings & Theme Handlers
  const handleUpdateSettings = (settings: CycleSettings) => {
    const res = updateSettings(data, settings, getCtx());
    if (res.ok) {
      setData(res.value);
      return { ok: true };
    }
    return { ok: false, errors: res.errors };
  };

  const handleUpdateTheme = (theme: Preferences["theme"]) => {
    setData((prev) => updatePreferences(prev, { theme }, getCtx()));
  };

  // Cycle navigation
  const handleJumpTo = (index: number) => {
    setData((prev) => jumpTo(prev, index, getCtx()));
  };

  const handleRestartCycle = () => {
    setData((prev) => restartCycle(prev, getCtx()));
  };

  // Study Flow Handlers
  const handleStartSession = () => {
    setData((prev) => startSession(prev, getCtx()));
  };

  const handlePauseSession = () => {
    setData((prev) => pauseSession(prev, getCtx()));
  };

  const handleResumeSession = () => {
    setData((prev) => resumeSession(prev, getCtx()));
  };

  const handleDiscardSession = () => {
    setData((prev) => discardSession(prev, getCtx()));
  };

  const enqueueReveals = (newlyUnlocked: AchievementDefinition[]) => {
    if (newlyUnlocked.length === 0) return;
    setPendingReveals((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const fresh = newlyUnlocked.filter((a) => !existingIds.has(a.id));
      return fresh.length > 0 ? [...prev, ...fresh] : prev;
    });
  };

  const openReveal = (def: AchievementDefinition) => {
    setPendingReveals((prev) => prev.filter((a) => a.id !== def.id));
    setActiveReveal(def);
  };

  const dismissReveal = (id: string) => {
    setPendingReveals((prev) => prev.filter((a) => a.id !== id));
  };

  const closeActiveReveal = () => {
    setActiveReveal(null);
  };

  const handleFinishSession = (studiedMinutes: number, notes?: string) => {
    const res = finishSession(data, { studiedMinutes, notes }, getCtx());
    if (res.ok) {
      const newlyUnlocked = diffUnlockedAchievements(data, res.value);
      setData(res.value);
      enqueueReveals(newlyUnlocked);
      return { ok: true };
    }
    return { ok: false, errors: res.errors };
  };

  const handleSkipBlock = () => {
    setData((prev) => skipBlock(prev, getCtx()));
  };

  const handleUpdateSessionNotes = (notes: string) => {
    setData((prev) => setSessionNotes(prev, notes));
  };

  // History CRUD
  const handleUpdateHistoryRecord = (id: string, patch: { studiedMinutes?: number; notes?: string }) => {
    const res = updateHistoryRecord(data, id, patch, getCtx());
    if (res.ok) {
      const newlyUnlocked = diffUnlockedAchievements(data, res.value);
      setData(res.value);
      enqueueReveals(newlyUnlocked);
      return { ok: true };
    }
    return { ok: false, errors: res.errors };
  };

  const handleDeleteHistoryRecord = (id: string) => {
    setData((prev) => deleteHistoryRecord(prev, id, getCtx()));
  };

  // Demo & Reset
  const handleLoadDemo = () => {
    setData((prev) => loadDemo(prev, getCtx()));
  };

  const handleRemoveDemo = () => {
    setData((prev) => removeDemo(prev, getCtx()));
  };

  const hasDemoSubjects = useMemo(() => hasDemo(data), [data]);

  const handleResetAll = () => {
    setData((prev) => resetAll(prev, getCtx()));
  };

  // Backup handlers
  const handleExportBackup = async () => {
    const backupJson = createBackup(data, new Date());
    const p = (n: number) => String(n).padStart(2, "0");
    const d = new Date();
    const filename = `ciclo-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
    return platformFiles.exportText(filename, backupJson);
  };

  const handleImportBackup = async () => {
    try {
      const text = await platformFiles.importText();
      if (!text) return { ok: false };
      const parsed = parseBackup(text, new Date());
      setData(parsed.data);
      if (parsed.migratedFrom !== null) {
        setNotices((prev) => [...prev, `Backup importado e migrado do esquema v${parsed.migratedFrom}.`]);
      } else {
        setNotices((prev) => [...prev, "Backup importado com sucesso!"]);
      }
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Arquivo de backup inválido.";
      return { ok: false, error: msg };
    }
  };

  const handleOpenDataFolder = async () => {
    if (platformFiles.revealDataFolder) {
      await platformFiles.revealDataFolder();
    }
  };

  // Analytics
  const cycleProgressData = useMemo(() => cycleProgress(data), [data]);
  const subjectStatsData = useMemo(() => statsBySubject(data.history, data.subjects), [data.history, data.subjects]);
  const dailySeriesData = useMemo(() => dailySeries(data.history, 7, new Date()), [data.history]);
  const streakCount = useMemo(() => currentStreak(data.history, new Date()), [data.history]);
  const totalStudiedMinutes = useMemo(() => totalStudied(data.history), [data.history]);
  const statusCounts = useMemo(() => countByStatus(data.history), [data.history]);

  return (
    <AppContext.Provider
      value={{
        data,
        activeTab,
        setActiveTab,
        loading,
        saveError,
        notices,
        clearNotice,
        storageLocation,
        isNativeDesktop: isElectron() || isTauri(),
        searchQuery,
        setSearchQuery,
        activeSession: data.activeSession,
        activeElapsedMs,
        currentCycleBlock,
        upcomingCycleBlocks,
        handleAddSubject,
        handleUpdateSubject,
        handleDeleteSubject,
        handleMoveSubject,
        handleUpdateSettings,
        handleUpdateTheme,
        handleJumpTo,
        handleRestartCycle,
        handleStartSession,
        handlePauseSession,
        handleResumeSession,
        handleDiscardSession,
        handleFinishSession,
        handleSkipBlock,
        handleUpdateSessionNotes,
        handleUpdateHistoryRecord,
        handleDeleteHistoryRecord,
        handleLoadDemo,
        handleRemoveDemo,
        hasDemoSubjects,
        handleResetAll,
        handleExportBackup,
        handleImportBackup,
        handleOpenDataFolder,
        cycleProgressData,
        subjectStatsData,
        dailySeriesData,
        streakCount,
        totalStudiedMinutes,
        statusCounts,
        pendingReveals,
        activeReveal,
        openReveal,
        dismissReveal,
        closeActiveReveal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
};
