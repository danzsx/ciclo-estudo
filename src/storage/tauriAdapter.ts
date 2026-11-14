import { invoke } from "@tauri-apps/api/core";
import type { StorageAdapter, StoredSnapshot } from "./adapter";

interface RustSnapshot {
  main: string | null;
  backup: string | null;
}

/** Persistência no desktop: arquivo JSON gravado atomicamente pelo backend Rust. */
export class TauriAdapter implements StorageAdapter {
  readonly kind = "tauri" as const;

  async load(): Promise<StoredSnapshot> {
    const snap = await invoke<RustSnapshot>("load_data");
    return { main: snap.main, backup: snap.backup };
  }
  async save(content: string): Promise<void> {
    await invoke("save_data", { content });
  }
  async quarantine(): Promise<string | null> {
    return invoke<string | null>("quarantine_data");
  }
  async location(): Promise<string> {
    return invoke<string>("data_location");
  }
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
