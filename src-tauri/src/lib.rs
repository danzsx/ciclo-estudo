mod store;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_opener::OpenerExt;

/// Serializa as gravações no arquivo de dados.
struct DataLock(Mutex<()>);

/// Diretório de dados. Pode ser sobrescrito pela variável `CICLO_DATA_DIR`
/// (usada nos testes ponta a ponta para não tocar nos dados reais do usuário).
fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(custom) = std::env::var("CICLO_DATA_DIR") {
        if !custom.trim().is_empty() {
            return Ok(PathBuf::from(custom));
        }
    }
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Não foi possível localizar a pasta de dados: {e}"))
}

#[tauri::command]
fn load_data(app: AppHandle) -> Result<store::Snapshot, String> {
    store::load(&data_dir(&app)?)
}

#[tauri::command]
fn save_data(app: AppHandle, lock: State<DataLock>, content: String) -> Result<(), String> {
    let _guard = lock.0.lock().map_err(|_| "Falha ao obter trava de gravação".to_string())?;
    store::save(&data_dir(&app)?, &content)
}

#[tauri::command]
fn quarantine_data(app: AppHandle, lock: State<DataLock>) -> Result<Option<String>, String> {
    let _guard = lock.0.lock().map_err(|_| "Falha ao obter trava de gravação".to_string())?;
    store::quarantine(&data_dir(&app)?)
}

#[tauri::command]
fn data_location(app: AppHandle) -> Result<String, String> {
    Ok(data_dir(&app)?.join(store::DATA_FILE).display().to_string())
}

#[tauri::command]
fn open_data_folder(app: AppHandle) -> Result<(), String> {
    let dir = data_dir(&app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    app.opener()
        .open_path(dir.display().to_string(), None::<&str>)
        .map_err(|e| e.to_string())
}

/// Grava um backup exportado no caminho escolhido pelo usuário (via diálogo).
#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    store::write_atomic(&PathBuf::from(path), &content)
}

/// Lê um backup escolhido pelo usuário (via diálogo). Limitado a 50 MB.
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    let meta = std::fs::metadata(&path).map_err(|e| format!("Falha ao abrir arquivo: {e}"))?;
    if meta.len() > 50 * 1024 * 1024 {
        return Err("Arquivo grande demais para ser um backup do Ciclo.".into());
    }
    std::fs::read_to_string(&path).map_err(|e| format!("Falha ao ler arquivo: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(DataLock(Mutex::new(())))
        .invoke_handler(tauri::generate_handler![
            load_data,
            save_data,
            quarantine_data,
            data_location,
            open_data_folder,
            write_text_file,
            read_text_file
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Ciclo");
}
