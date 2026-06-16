import type { PluginSettings } from "./types";

export const DEFAULT_STORE_ID = "github-default";

export const DEFAULT_SETTINGS: PluginSettings = {
  activeStoreId: DEFAULT_STORE_ID,
  concurrency: 3,
  locale: "auto",
  logLevel: "log",
  deleteLocalAfterUpload: true,
  stores: [
    {
      id: DEFAULT_STORE_ID,
      name: "GitHub",
      type: "github",
      github: {
        repo: "",
        branch: "main",
        basePath: "images/{yyyy}/{MM}",
        token: "",
        customDomain: "",
        useTokenForPrivateImages: false
      }
    }
  ]
};
