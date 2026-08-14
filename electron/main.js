const { app, BrowserWindow, session, powerSaveBlocker, shell, ipcMain } = require('electron');
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

let win = null;

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

  win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (isMainFrame && code !== -3) {
      setTimeout(() => win.loadURL(APP_URL), 3000);
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => { win = null; });
}

app.whenReady().then(() => {
  powerSaveBlocker.start('prevent-app-suspension');
  ipcMain.handle('open-external', (_e, url) => {
    if (typeof url === 'string' && /^https?:/.test(url)) shell.openExternal(url);
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
