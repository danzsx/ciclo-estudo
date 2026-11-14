/**
 * Repositório: carrega, migra, valida e grava os dados usando um StorageAdapter.
 * Independente de React e de plataforma.
 */
import { DataError, createEmptyData, parseData, restoreSession, serializeData, type AppData } from "../core";
import type { StorageAdapter } from "./adapter";

export interface LoadResult {
  data: AppData;
  source: "main" | "backup" | "new";
  /** Mensagens para informar o usuário (ex.: restauração da cópia de segurança). */
  notices: string[];
  migratedFrom: number | null;
  /** Sessão em andamento restaurada após o app ter sido fechado com o cronômetro rodando. */
  recoveredSession: { uncountedMs: number } | null;
}

export class Repository {
  private pending: string | null = null;
  private writing: Promise<void> | null = null;
  private lastSaved: string | null = null;
  private readonly listeners = new Set<(error: Error | null) => void>();

  constructor(private readonly adapter: StorageAdapter) {}

  get kind() {
    return this.adapter.kind;
  }

  location() {
    return this.adapter.location();
  }

  /** Notifica sucesso (null) ou falha de gravação. */
  onSaveStatus(listener: (error: Error | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async load(now: Date = new Date()): Promise<LoadResult> {
    const snap = await this.adapter.load();
    const notices: string[] = [];
    let data: AppData | null = null;
    let source: LoadResult["source"] = "new";
    let migratedFrom: number | null = null;

    if (snap.main !== null) {
      try {
        const parsed = parseData(snap.main, now);
        data = parsed.data;
        migratedFrom = parsed.migratedFrom;
        source = "main";
      } catch (err) {
        // Dados de versão mais nova nunca devem ser sobrescritos.
        if (err instanceof DataError && err.code === "newer_version") throw err;
        const kept = await this.adapter.quarantine().catch(() => null);
        notices.push(
          "O arquivo de dados principal estava danificado" +
            (kept ? ` (uma cópia foi preservada em ${kept})` : "") +
            ".",
        );
      }
    }
    if (!data && snap.backup !== null) {
      try {
        const parsed = parseData(snap.backup, now);
        data = parsed.data;
        migratedFrom = parsed.migratedFrom;
        source = "backup";
        notices.push("Seus dados foram restaurados da cópia de segurança automática mais recente.");
      } catch (err) {
        if (err instanceof DataError && err.code === "newer_version") throw err;
        notices.push("A cópia de segurança automática também estava danificada.");
      }
    }
    if (!data) {
      data = createEmptyData(now);
      if (notices.length) notices.push("Começando com dados vazios. Se tiver um backup exportado, importe-o em Ajustes.");
    }
    if (migratedFrom !== null) notices.push(`Dados atualizados do formato v${migratedFrom} para o atual.`);

    let recoveredSession: LoadResult["recoveredSession"] = null;
    if (data.activeSession) {
      const restored = restoreSession(data.activeSession, now.getTime());
      if (restored.recovered) {
        data = { ...data, activeSession: restored.session };
        recoveredSession = { uncountedMs: restored.uncountedMs };
      }
    }
    this.lastSaved = source === "main" && migratedFrom === null ? snap.main : null;
    return { data, source, notices, migratedFrom, recoveredSession };
  }

  /**
   * Agenda a gravação. Gravações concorrentes são agrupadas: apenas o estado mais
   * recente é gravado após a gravação em andamento terminar.
   */
  save(data: AppData): Promise<void> {
    const content = serializeData(data);
    if (content === this.lastSaved && !this.writing) return Promise.resolve();
    this.pending = content;
    if (!this.writing) this.writing = this.drain();
    return this.writing;
  }

  /** Aguarda todas as gravações pendentes. */
  async flush(): Promise<void> {
    while (this.writing) await this.writing;
  }

  private async drain(): Promise<void> {
    try {
      while (this.pending !== null) {
        const content = this.pending;
        this.pending = null;
        if (content === this.lastSaved) continue;
        try {
          await this.adapter.save(content);
          this.lastSaved = content;
          this.emit(null);
        } catch (err) {
          this.emit(err instanceof Error ? err : new Error(String(err)));
          // Nova tentativa acontece na próxima alteração (ou via "tentar novamente").
          break;
        }
      }
    } finally {
      this.writing = null;
    }
  }

  private emit(error: Error | null) {
    for (const l of this.listeners) l(error);
  }
}
