/**
 * Firefox Remote Debugging Protocol (RDP) types
 */

export type ActorId = string;

export interface RdpPacket {
  from?: ActorId;
  to?: ActorId;
  type?: string;
  [key: string]: unknown;
}

export interface Tab {
  actor: ActorId;
  title: string;
  url: string;
  consoleActor?: ActorId;
  threadActor?: ActorId;
  browsingContextID?: number;
}

export interface AttachResult {
  consoleActor: ActorId;
  threadActor: ActorId;
}

export interface EvaluateResult {
  result?: unknown;
  exception?: unknown;
  exceptionMessage?: string;
}

export interface NavigateOptions {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

export interface RootActorInfo {
  actor: ActorId;
  applicationType: string;
  traits?: Record<string, unknown>;
}

export interface ListTabsResponse {
  tabs: Tab[];
  selected?: number;
}

export class RdpError extends Error {
  constructor(
    message: string,
    public code: string,
    public reason?: string,
    public actor?: ActorId,
    public payload?: unknown
  ) {
    super(message);
    this.name = 'RdpError';
  }
}

export interface FirefoxLaunchOptions {
  firefoxPath?: string | undefined;
  headless: boolean;
  rdpHost: string;
  rdpPort: number;
  bidiPort: number;
  profilePath?: string | undefined;
  viewport?: { width: number; height: number } | undefined;
  args?: string[] | undefined;
}

export interface ScreenshotOptions {
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  fullPage?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ConsoleMessage {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug' | 'trace';
  text: string;
  timestamp?: number;
  source?: string;
  arguments?: unknown[];
}

export interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  timestamp?: number;
  resourceType?: string;
  cause?: string;
  isXHR?: boolean;
}

export interface NetworkMonitorActor {
  actor: ActorId;
}
