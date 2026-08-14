const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mahfelDesktop', {
  isElectron: true,
  appVersion: ipcRenderer.sendSync('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
