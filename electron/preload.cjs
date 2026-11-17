'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopBridge', {
  isDesktop: true,
  platform: process.platform,
  minimize: () => ipcRenderer.invoke('win:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('win:toggle-maximize'),
  close: () => ipcRenderer.invoke('win:close'),
  isMaximized: () => ipcRenderer.invoke('win:is-maximized'),
  getDesktopInfo: () => ipcRenderer.invoke('app:get-desktop-info'),
  verifyAuthenticode: (publisherNames) => ipcRenderer.invoke('app:verify-authenticode', publisherNames),
  onMaximizedChange: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }
    const listener = (_event, isMax) => callback(Boolean(isMax));
    ipcRenderer.on('win:maximized-changed', listener);
    return () => {
      ipcRenderer.removeListener('win:maximized-changed', listener);
    };
  },
});
