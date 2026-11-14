import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = "data.json";
const BACKUP_FILE = "data.json.bak";
function getDataDir() {
    if (process.env.CICLO_DATA_DIR && process.env.CICLO_DATA_DIR.trim().length > 0) {
        return process.env.CICLO_DATA_DIR;
    }
    const appData = app.getPath("userData");
    return appData;
}
function ensureDir(dir) {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}
async function loadData() {
    const dir = getDataDir();
    ensureDir(dir);
    const mainPath = path.join(dir, DATA_FILE);
    const backupPath = path.join(dir, BACKUP_FILE);
    let main = null;
    let backup = null;
    try {
        main = await fs.readFile(mainPath, "utf-8");
    }
    catch {
        main = null;
    }
    try {
        backup = await fs.readFile(backupPath, "utf-8");
    }
    catch {
        backup = null;
    }
    return { main, backup };
}
async function saveData(content) {
    const dir = getDataDir();
    ensureDir(dir);
    const mainPath = path.join(dir, DATA_FILE);
    const backupPath = path.join(dir, BACKUP_FILE);
    const tempPath = path.join(dir, `${DATA_FILE}.tmp.${Date.now()}`);
    if (existsSync(mainPath)) {
        try {
            const prev = await fs.readFile(mainPath, "utf-8");
            await fs.writeFile(backupPath, prev, "utf-8");
        }
        catch (err) {
            console.warn("Falha ao criar backup anterior:", err);
        }
    }
    await fs.writeFile(tempPath, content, "utf-8");
    await fs.rename(tempPath, mainPath);
}
async function quarantineData() {
    const dir = getDataDir();
    const mainPath = path.join(dir, DATA_FILE);
    if (!existsSync(mainPath))
        return null;
    const targetName = `corrupt-${Date.now()}.json`;
    const targetPath = path.join(dir, targetName);
    try {
        await fs.copyFile(mainPath, targetPath);
        return targetPath;
    }
    catch {
        return null;
    }
}
function getDataLocation() {
    return path.join(getDataDir(), DATA_FILE);
}
async function openDataFolder() {
    const dir = getDataDir();
    ensureDir(dir);
    await shell.openPath(dir);
}
function setupIpc(win) {
    ipcMain.handle("ciclo:load_data", async () => {
        return await loadData();
    });
    ipcMain.handle("ciclo:save_data", async (_e, content) => {
        await saveData(content);
    });
    ipcMain.handle("ciclo:quarantine_data", async () => {
        return await quarantineData();
    });
    ipcMain.handle("ciclo:data_location", async () => {
        return getDataLocation();
    });
    ipcMain.handle("ciclo:open_data_folder", async () => {
        await openDataFolder();
    });
    ipcMain.handle("ciclo:export_file", async (_e, defaultName, content) => {
        const res = await dialog.showSaveDialog(win, {
            defaultPath: defaultName,
            filters: [{ name: "Backup do Ciclo", extensions: ["json"] }],
        });
        if (res.canceled || !res.filePath)
            return null;
        await fs.writeFile(res.filePath, content, "utf-8");
        return res.filePath;
    });
    ipcMain.handle("ciclo:import_file", async () => {
        const res = await dialog.showOpenDialog(win, {
            properties: ["openFile"],
            filters: [{ name: "Backup do Ciclo", extensions: ["json"] }],
        });
        if (res.canceled || res.filePaths.length === 0)
            return null;
        const filePath = res.filePaths[0];
        const stat = await fs.stat(filePath);
        if (stat.size > 50 * 1024 * 1024) {
            throw new Error("Arquivo grande demais para ser um backup do Ciclo.");
        }
        return await fs.readFile(filePath, "utf-8");
    });
}
function createWindow() {
    const iconPath = path.join(__dirname, "icon.ico");
    const win = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 900,
        minHeight: 620,
        center: true,
        title: "Ciclo",
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    win.setMenuBarVisibility(false);
    setupIpc(win);
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (devUrl) {
        win.loadURL(devUrl);
    }
    else {
        win.loadFile(path.join(__dirname, "../dist/index.html"));
    }
}
app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
