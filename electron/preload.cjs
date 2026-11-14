const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cicloElectron", {
  loadData: () => ipcRenderer.invoke("ciclo:load_data"),
  saveData: (content) => ipcRenderer.invoke("ciclo:save_data", content),
  quarantineData: () => ipcRenderer.invoke("ciclo:quarantine_data"),
  dataLocation: () => ipcRenderer.invoke("ciclo:data_location"),
  openDataFolder: () => ipcRenderer.invoke("ciclo:open_data_folder"),
  exportFile: (defaultName, content) => ipcRenderer.invoke("ciclo:export_file", defaultName, content),
  importFile: () => ipcRenderer.invoke("ciclo:import_file"),
});

