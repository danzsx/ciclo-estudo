/**
 * Contrato de persistência. Cada plataforma fornece um adaptador:
 * - desktop (Tauri): arquivo JSON com gravação atômica no diretório de dados do app;
 * - navegador (desenvolvimento): localStorage;
 * - testes: memória.
 * Uma versão mobile só precisa implementar esta interface.
 */
export interface StoredSnapshot {
  main: string | null;
  backup: string | null;
}

export interface StorageAdapter {
  readonly kind: "tauri" | "electron" | "browser" | "memory";
  load(): Promise<StoredSnapshot>;
  save(content: string): Promise<void>;
  /** Preserva uma cópia do arquivo principal corrompido antes de sobrescrevê-lo. */
  quarantine(): Promise<string | null>;
  /** Descrição legível do local de armazenamento. */
  location(): Promise<string>;
}

export class MemoryAdapter implements StorageAdapter {
  readonly kind = "memory" as const;
  main: string | null = null;
  backup: string | null = null;
  quarantined: string[] = [];
  saves = 0;
  failNextSave = false;

  async load(): Promise<StoredSnapshot> {
    return { main: this.main, backup: this.backup };
  }
  async save(content: string): Promise<void> {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error("Falha simulada de gravação");
    }
    if (this.main !== null) this.backup = this.main;
    this.main = content;
    this.saves += 1;
  }
  async quarantine(): Promise<string | null> {
    if (this.main === null) return null;
    this.quarantined.push(this.main);
    return `memory://corrupt-${this.quarantined.length}`;
  }
  async location(): Promise<string> {
    return "memória (testes)";
  }
}

const KEY = "ciclo:data";
const BACKUP_KEY = "ciclo:data:bak";

export class LocalStorageAdapter implements StorageAdapter {
  readonly kind = "browser" as const;
  constructor(private readonly storage: Storage = window.localStorage) {}

  async load(): Promise<StoredSnapshot> {
    return { main: this.storage.getItem(KEY), backup: this.storage.getItem(BACKUP_KEY) };
  }
  async save(content: string): Promise<void> {
    const prev = this.storage.getItem(KEY);
    if (prev !== null) this.storage.setItem(BACKUP_KEY, prev);
    this.storage.setItem(KEY, content);
  }
  async quarantine(): Promise<string | null> {
    const prev = this.storage.getItem(KEY);
    if (prev === null) return null;
    const key = `ciclo:corrupt:${Date.now()}`;
    this.storage.setItem(key, prev);
    return key;
  }
  async location(): Promise<string> {
    return "localStorage do navegador (modo de desenvolvimento)";
  }
}
