const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mahfelDesktop', {
  isElectron: true,
  appVersion: ipcRenderer.sendSync('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  // اعلان سیستمی ویندوز (main process) — قابلاطمینانتر از Notification مرورگر
  showNotification: (title, body, link) => ipcRenderer.send('show-notif', { title, body, link }),
});

// کلیک روی اعلان سیستمی → اپ به همان صفحه میرود
ipcRenderer.on('open-notif', (_e, link) => {
  window.dispatchEvent(new CustomEvent('mahfel-open-notif', { detail: link }));
});