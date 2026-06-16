import { normalizePath, requestUrl } from "obsidian";
import type { GitHubStoreSettings, RemoteStore, UploadInput, UploadResult } from "../types";
import { arrayBufferToBase64, sanitizePathSegment } from "../utils";

interface GitHubContentResponse {
  content?: {
    download_url?: string;
    path?: string;
  };
}

export class GitHubStore implements RemoteStore {
  readonly type = "github" as const;

  constructor(readonly id: string, private settings: GitHubStoreSettings) {}

  async upload(input: UploadInput): Promise<UploadResult> {
    const { owner, repo } = parseRepo(this.settings.repo);
    const remotePath = this.createRemotePath(input);
    const endpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(remotePath)}`;
    const response = await requestUrl({
      url: endpoint,
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.settings.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify({
        message: `Upload image ${remotePath}`,
        content: arrayBufferToBase64(input.data),
        branch: this.settings.branch
      })
    });

    const json = response.json as GitHubContentResponse;
    return {
      remotePath,
      url: this.publicUrl(remotePath, json.content?.download_url)
    };
  }

  isOwnedUrl(value: string): boolean {
    try {
      const url = new URL(value);
      const { owner, repo } = parseRepo(this.settings.repo);
      const branch = this.settings.branch;
      const customDomain = this.normalizedCustomDomain();
      if (customDomain && value.startsWith(`${customDomain}/`)) {
        return true;
      }
      if (url.hostname === "raw.githubusercontent.com") {
        const prefix = `/${owner}/${repo}/${branch}/`;
        return decodeURIComponent(url.pathname).startsWith(prefix);
      }
      if (url.hostname === "github.com") {
        const prefix = `/${owner}/${repo}/raw/${branch}/`;
        return decodeURIComponent(url.pathname).startsWith(prefix);
      }
      return false;
    } catch {
      return false;
    }
  }

  private createRemotePath(input: UploadInput): string {
    const ext = input.extension.toLowerCase();
    const documentName = input.activeFile?.basename ?? input.fileName.replace(/\.[^.]+$/, "");
    const folder = sanitizePathSegment(documentName);
    const originalName = sanitizePathSegment(input.fileName.replace(/\.[^.]+$/, ""), "image");
    const fileName = `${originalName}-${randomSuffix()}.${ext}`;
    return normalizePath(`${folder}/${fileName}`).replace(/^\/+/, "");
  }

  private publicUrl(remotePath: string, fallback?: string): string {
    const { owner, repo } = parseRepo(this.settings.repo);
    const customDomain = this.normalizedCustomDomain();
    const encodedPath = remotePath.split("/").map(encodeURIComponent).join("/");
    if (customDomain) {
      return `${customDomain}/${encodedPath}`;
    }
    if (this.settings.useTokenForPrivateImages && this.settings.token) {
      const token = encodeURIComponent(this.settings.token);
      return `https://x-access-token:${token}@raw.githubusercontent.com/${owner}/${repo}/${this.settings.branch}/${encodedPath}`;
    }
    return fallback ?? `https://raw.githubusercontent.com/${owner}/${repo}/${this.settings.branch}/${encodedPath}`;
  }

  private normalizedCustomDomain(): string {
    return this.settings.customDomain.trim().replace(/\/+$/, "");
  }
}

export function validateGitHubSettings(settings: GitHubStoreSettings): boolean {
  return /^[^/\s]+\/[^/\s]+$/.test(settings.repo.trim()) && settings.branch.trim().length > 0 && settings.token.trim().length > 0;
}

function parseRepo(shortPath: string): { owner: string; repo: string } {
  const [owner, repo] = shortPath.trim().split("/");
  if (!owner || !repo) {
    throw new Error("GitHub repository must use owner/repo format.");
  }
  return { owner, repo };
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 12);
}
