const { app, BrowserWindow, session, powerSaveBlocker, shell, ipcMain, Notification } = require('electron');
const path = require('path');

const APP_URL = 'https://app.soha-sima.ir';
const allowedPermissions = [
  'notifications',
  'media',
  'fullscreen',
  'clipboard-read',
  'clipboard-sanitized-write'
];

app.setAppUserModelId('com.mahfel.app');
app.commandLine.appendSwitch('no-proxy-server');
app.commandLine.appendSwitch('disable-http-cache');

let win = null;
let showingOffline = false;

function showOfflinePage() {
  if (!win || win.isDestroyed() || showingOffline) return;
  showingOffline = true;
  win.loadFile(path.join(__dirname, 'offline.html'), { query: { url: APP_URL } });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#0b0b0f',
    title: 'محفل',
    icon: path.join(__dirname, 'logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.setMenuBarVisibility(false);
  win.loadURL(APP_URL);

  win.webContents.on('did-fail-load', (_e, code, _desc, _url, isMainFrame) => {
    if (isMainFrame && code !== -3) {
      showOfflinePage();
    }
  });

  win.webContents.on('did-navigate', (_e, url) => {
    if (url.startsWith('file:')) return;
    showingOffline = false;
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => { win = null; });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
  powerSaveBlocker.start('prevent-app-suspension');
  const ses = session.defaultSession;
  try {
    await ses.clearCache();
    await ses.clearCodeCaches({});
  } catch (_err) {
    /* ignore */
  }
  ipcMain.handle('open-external', (_e, url) => {
    if (typeof url === 'string' && /^https?:/.test(url)) shell.openExternal(url);
  });
  // اعلان سیستمی: از رندرر میآید → خود Electron (main) نمایش میدهد — روی ویندوز همیشه کار میکند
  ipcMain.on('show-notif', (_e, data) => {
    try {
      if (!Notification.isSupported()) return;
      const n = new Notification({
        title: (data && data.title) || 'محفل',
        body: (data && data.body) || '',
        icon: path.join(__dirname, 'logo.png'),
        silent: false,
      });
      n.on('click', () => {
        if (win) {
          if (win.isMinimized()) win.restore();
          win.show();
          win.focus();
          if (data && data.link) win.webContents.send('open-notif', data.link);
        }
      });
      n.show();
    } catch (_err) {
      /* ignore */
    }
  });
  ipcMain.on('get-app-version', (e) => {
    e.returnValue = app.getVersion();
  });
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(allowedPermissions.includes(permission));
  });
  createWindow();
});

app.on('window-all-closed', () => app.quit());
}
