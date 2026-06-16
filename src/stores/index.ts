import type { PluginSettings, RemoteStore } from "../types";
import { GitHubStore, validateGitHubSettings } from "./github";

export function createActiveStore(settings: PluginSettings): RemoteStore | null {
  const storeSettings = settings.stores.find((store) => store.id === settings.activeStoreId) ?? settings.stores[0];
  if (!storeSettings) return null;
  if (storeSettings.type === "github") {
    return new GitHubStore(storeSettings.id, storeSettings.github);
  }
  return null;
}

export function hasValidActiveStore(settings: PluginSettings): boolean {
  const storeSettings = settings.stores.find((store) => store.id === settings.activeStoreId) ?? settings.stores[0];
  return storeSettings?.type === "github" ? validateGitHubSettings(storeSettings.github) : false;
}
