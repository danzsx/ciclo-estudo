//! Persistência local do Ciclo.
//!
//! Os dados ficam em um único arquivo JSON no diretório de dados do aplicativo
//! (no Windows: `%APPDATA%\com.ciclo.app\`). A gravação é atômica:
//! 1. o conteúdo é gravado em `ciclo-data.json.tmp` e sincronizado no disco;
//! 2. o arquivo atual é copiado para `ciclo-data.bak.json` (cópia de segurança);
//! 3. o temporário substitui o arquivo principal via `rename` (atômico no NTFS).
//! Assim, uma queda de energia nunca deixa o arquivo principal pela metade.

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

pub const DATA_FILE: &str = "ciclo-data.json";
pub const BACKUP_FILE: &str = "ciclo-data.bak.json";
pub const TMP_FILE: &str = "ciclo-data.json.tmp";

#[derive(serde::Serialize, Debug, PartialEq)]
pub struct Snapshot {
    pub main: Option<String>,
    pub backup: Option<String>,
}

fn read_optional(path: &Path) -> Result<Option<String>, String> {
    match fs::read_to_string(path) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("Falha ao ler {}: {e}", path.display())),
    }
}

pub fn load(dir: &Path) -> Result<Snapshot, String> {
    Ok(Snapshot {
        main: read_optional(&dir.join(DATA_FILE))?,
        backup: read_optional(&dir.join(BACKUP_FILE))?,
    })
}

pub fn write_atomic(path: &Path, content: &str) -> Result<(), String> {
    let dir = path.parent().ok_or("Caminho inválido")?;
    fs::create_dir_all(dir).map_err(|e| format!("Falha ao criar pasta de dados: {e}"))?;
    let tmp: PathBuf = path.with_extension("tmp-write");
    {
        let mut f = fs::File::create(&tmp).map_err(|e| format!("Falha ao criar arquivo temporário: {e}"))?;
        f.write_all(content.as_bytes())
            .map_err(|e| format!("Falha ao gravar dados: {e}"))?;
        f.sync_all().map_err(|e| format!("Falha ao sincronizar dados: {e}"))?;
    }
    fs::rename(&tmp, path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("Falha ao substituir arquivo: {e}")
    })
}

pub fn save(dir: &Path, content: &str) -> Result<(), String> {
    fs::create_dir_all(dir).map_err(|e| format!("Falha ao criar pasta de dados: {e}"))?;
    let main = dir.join(DATA_FILE);
    let tmp = dir.join(TMP_FILE);
    {
        let mut f = fs::File::create(&tmp).map_err(|e| format!("Falha ao criar arquivo temporário: {e}"))?;
        f.write_all(content.as_bytes())
            .map_err(|e| format!("Falha ao gravar dados: {e}"))?;
        f.sync_all().map_err(|e| format!("Falha ao sincronizar dados: {e}"))?;
    }
    if main.exists() {
        // A cópia de segurança é "best effort": não impede a gravação principal.
        let _ = fs::copy(&main, dir.join(BACKUP_FILE));
    }
    fs::rename(&tmp, &main).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("Falha ao substituir arquivo de dados: {e}")
    })
}

/// Copia o arquivo principal (possivelmente corrompido) para um nome com data/hora.
pub fn quarantine(dir: &Path) -> Result<Option<String>, String> {
    let main = dir.join(DATA_FILE);
    if !main.exists() {
        return Ok(None);
    }
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let target = dir.join(format!("ciclo-data.corrupt-{stamp}.json"));
    fs::copy(&main, &target).map_err(|e| format!("Falha ao preservar arquivo danificado: {e}"))?;
    Ok(Some(target.display().to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "ciclo-test-{name}-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn load_empty_dir_returns_none() {
        let dir = temp_dir("empty");
        assert_eq!(load(&dir).unwrap(), Snapshot { main: None, backup: None });
        fs::remove_dir_all(dir).ok();
    }

    #[test]
    fn save_then_load_roundtrip_with_backup_rotation() {
        let dir = temp_dir("roundtrip");
        save(&dir, "{\"v\":1}").unwrap();
        let s = load(&dir).unwrap();
        assert_eq!(s.main.as_deref(), Some("{\"v\":1}"));
        assert_eq!(s.backup, None);

        save(&dir, "{\"v\":2}").unwrap();
        let s = load(&dir).unwrap();
        assert_eq!(s.main.as_deref(), Some("{\"v\":2}"));
        assert_eq!(s.backup.as_deref(), Some("{\"v\":1}"));
        assert!(!dir.join(TMP_FILE).exists(), "temporário deve ser removido");
        fs::remove_dir_all(dir).ok();
    }

    #[test]
    fn save_creates_missing_directory() {
        let dir = temp_dir("nested").join("a").join("b");
        save(&dir, "{}").unwrap();
        assert_eq!(load(&dir).unwrap().main.as_deref(), Some("{}"));
    }

    #[test]
    fn quarantine_copies_main_file() {
        let dir = temp_dir("quarantine");
        assert_eq!(quarantine(&dir).unwrap(), None);
        save(&dir, "corrompido{").unwrap();
        let path = quarantine(&dir).unwrap().expect("deve criar cópia");
        assert_eq!(fs::read_to_string(path).unwrap(), "corrompido{");
        fs::remove_dir_all(dir).ok();
    }

    #[test]
    fn write_atomic_overwrites_file() {
        let dir = temp_dir("atomic");
        let file = dir.join("export.json");
        write_atomic(&file, "a").unwrap();
        write_atomic(&file, "bb").unwrap();
        assert_eq!(fs::read_to_string(&file).unwrap(), "bb");
        fs::remove_dir_all(dir).ok();
    }
}
