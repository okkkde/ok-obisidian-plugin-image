import type { App, TFile } from "obsidian";

export type StoreType = "github";
export type Locale = "auto" | "zh-CN" | "zh-TW" | "en" | "ko" | "ja";
export type LogLevel = "trace" | "debug" | "log" | "info" | "warn" | "error" | "off";

export interface GitHubStoreSettings {
  repo: string;
  branch: string;
  basePath: string;
  token: string;
  customDomain: string;
  useTokenForPrivateImages: boolean;
}

export interface RemoteStoreSettings {
  id: string;
  name: string;
  type: StoreType;
  github: GitHubStoreSettings;
}

export interface PluginSettings {
  activeStoreId: string;
  stores: RemoteStoreSettings[];
  concurrency: number;
  locale: Locale;
  logLevel: LogLevel;
  deleteLocalAfterUpload: boolean;
}

export interface UploadInput {
  app: App;
  fileName: string;
  extension: string;
  contentType: string;
  data: ArrayBuffer;
  activeFile?: TFile | null;
}

export interface UploadResult {
  url: string;
  remotePath: string;
}

export interface RemoteStore {
  readonly id: string;
  readonly type: StoreType;
  upload(input: UploadInput): Promise<UploadResult>;
  isOwnedUrl(url: string): boolean;
}

export interface ImageReference {
  kind: "markdown" | "wiki" | "html";
  fullMatch: string;
  target: string;
  altOrLabel?: string;
  start: number;
  end: number;
  targetStart: number;
  targetEnd: number;
}

export interface ResolvedImageSource {
  data: ArrayBuffer;
  fileName: string;
  extension: string;
  contentType: string;
  localFile?: TFile;
}
