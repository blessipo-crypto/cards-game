'use strict';

const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const verifyUpdateFileAuthenticodeSignature = require('./verify-signature.cjs');

const APP_TITLE = 'Royal Velvet Suite';
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';

// Prevent duplicate instances from corrupting saved bankroll state
const hasSingleLock = app.requestSingleInstanceLock();
if (!hasSingleLock) {
  app.quit();
  process.exit(0);
}

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createMainWindow() {
  Menu.setApplicationMenu(null);

  const iconPath = path.join(__dirname, '..', 'build', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 940,
    minWidth: 1280,
    minHeight: 720,
    title: APP_TITLE,
    backgroundColor: '#080A0F',
    frame: false,
    show: false,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('win:maximized-changed', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('win:maximized-changed', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Security hardening: block arbitrary external navigation or popup windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const isLocalFile = navigationUrl.startsWith('file://');
    const isDevServer = !app.isPackaged && navigationUrl.startsWith(DEV_URL);
    if (!isLocalFile && !isDevServer) {
      event.preventDefault();
    }
  });

  if (!app.isPackaged) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  app.setAppUserModelId('com.royalvelvetsuite.montecarlo');
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('win:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('win:toggle-maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  }
  mainWindow.maximize();
  return true;
});

ipcMain.handle('win:close', () => {
  mainWindow?.close();
});

ipcMain.handle('win:is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('app:get-desktop-info', () => ({
  isDesktop: true,
  version: app.getVersion(),
  platform: process.platform,
  isPackaged: app.isPackaged,
}));

ipcMain.handle('app:verify-authenticode', async (_event, publisherNames) => {
  const publishers = Array.isArray(publisherNames) && publisherNames.length > 0
    ? publisherNames
    : ['Royal Velvet Suite'];
  return verifyUpdateFileAuthenticodeSignature(publishers, process.execPath);
});
