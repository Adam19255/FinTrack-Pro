const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveData: (key, data) => ipcRenderer.invoke('save-data', key, data),
  getData: (key) => ipcRenderer.invoke('get-data', key),
});