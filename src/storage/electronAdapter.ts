import type { StorageAdapter, StoredSnapshot } from "./adapter";

export interface CicloElectronAPI {
  loadData(): Promise<StoredSnapshot>;
  saveData(content: string): Promise<void>;
  quarantineData(): Promise<string | null>;
  dataLocation(): Promise<string>;
  openDataFolder(): Promise<void>;
  exportFile(defaultName: string, content: string): Promise<string | null>;
  importFile(): Promise<string | null>;
}

declare global {
  interface Window {
    cicloElectron?: CicloElectronAPI;
  }
}

export function isElectron(): boolean {
  return typeof window !== "undefined" && Boolean(window.cicloElectron);
}

export class ElectronAdapter implements StorageAdapter {
  readonly kind = "electron" as const;

  async load(): Promise<StoredSnapshot> {
    if (!window.cicloElectron) throw new Error("Electron API não disponível");
    return window.cicloElectron.loadData();
  }

  async save(content: string): Promise<void> {
    if (!window.cicloElectron) throw new Error("Electron API não disponível");
    await window.cicloElectron.saveData(content);
  }

  async quarantine(): Promise<string | null> {
    if (!window.cicloElectron) return null;
    return window.cicloElectron.quarantineData();
  }

  async location(): Promise<string> {
    if (!window.cicloElectron) return "Electron";
    return window.cicloElectron.dataLocation();
  }
}

