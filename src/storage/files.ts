/**
 * Operações de arquivo dependentes de plataforma (exportar/importar backup,
 * abrir a pasta de dados).
 */
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./tauriAdapter";
import { isElectron } from "./electronAdapter";

export interface PlatformFiles {
  /** Salva texto em um arquivo escolhido pelo usuário. Retorna o caminho ou null se cancelado. */
  exportText(defaultName: string, content: string): Promise<string | null>;
  /** Lê um arquivo escolhido pelo usuário. Retorna null se cancelado. */
  importText(): Promise<string | null>;
  /** Abre a pasta de dados no explorador de arquivos (se suportado). */
  revealDataFolder?(): Promise<void>;
}

const electronFiles: PlatformFiles = {
  async exportText(defaultName, content) {
    if (!window.cicloElectron) return null;
    return window.cicloElectron.exportFile(defaultName, content);
  },
  async importText() {
    if (!window.cicloElectron) return null;
    return window.cicloElectron.importFile();
  },
  async revealDataFolder() {
    if (window.cicloElectron) {
      await window.cicloElectron.openDataFolder();
    }
  },
};

const tauriFiles: PlatformFiles = {
  async exportText(defaultName, content) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: "Backup do Ciclo", extensions: ["json"] }],
    });
    if (!path) return null;
    await invoke("write_text_file", { path, content });
    return path;
  },
  async importText() {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const path = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Backup do Ciclo", extensions: ["json"] }],
    });
    if (!path || Array.isArray(path)) return null;
    return invoke<string>("read_text_file", { path });
  },
  async revealDataFolder() {
    await invoke("open_data_folder");
  },
};

const browserFiles: PlatformFiles = {
  async exportText(defaultName, content) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return defaultName;
  },
  importText() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.onchange = async () => {
        const file = input.files?.[0];
        resolve(file ? await file.text() : null);
      };
      input.click();
    });
  },
};

export function getPlatformFiles(): PlatformFiles {
  if (isElectron()) return electronFiles;
  return isTauri() ? tauriFiles : browserFiles;
}
