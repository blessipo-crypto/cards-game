export type VerifyUpdateFileResult =
  | { response: 'success' }
  | { response: 'failure'; message: string };

export type VerifyUpdateFileAuthenticodeSignature = (
  publisherName: string[],
  path: string
) => Promise<VerifyUpdateFileResult>;

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
  verifyAuthenticode: (publisherNames?: string[]) => Promise<VerifyUpdateFileResult>;
  onMaximizedChange: (callback: (maximized: boolean) => void) => () => void;
}

declare global {
  interface Window {
    desktopBridge?: DesktopBridgeAPI;
  }
}

export {};
