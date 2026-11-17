export interface DesktopRuntimeInfo {
  isDesktop: boolean;
  version: string;
  platform: string;
  isPackaged: boolean;
}

export interface DesktopBridgeAPI {
  isDesktop: boolean;
  platform: string;
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<boolean>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  getDesktopInfo: () => Promise<DesktopRuntimeInfo>;
  onMaximizedChange: (callback: (maximized: boolean) => void) => () => void;
}

declare global {
  interface Window {
    desktopBridge?: DesktopBridgeAPI;
  }
}

export {};
