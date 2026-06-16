import { Editor, MarkdownView, Notice, TFile, type App } from "obsidian";
import type { ImageReference, PluginSettings, RemoteStore, ResolvedImageSource, UploadInput, UploadResult } from "./types";
import { deleteLocalFiles, isRemoteUrl, parseImageReferences, replacementFor, resolveImageSource, stripLinkDecorations } from "./utils";
import type { Logger } from "./logger";
import { hashArrayBuffer } from "./hash";

const UPLOAD_CACHE_TTL_MS = 5 * 60 * 1000;

interface ProcessResult {
  uploaded: number;
  deleted: number;
}

interface Replacement {
  ref: ImageReference;
  replacement: string;
  source: ResolvedImageSource;
}

interface UploadCacheEntry {
  result: UploadResult;
  expiresAt: number;
}

export class ImageUploadProcessor {
  private processingFiles = new Set<string>();
  private debounceTimers = new Map<string, number>();
  private selfModified = new Set<string>();
  private uploadCache = new Map<string, UploadCacheEntry>();
  private inFlightUploads = new Map<string, Promise<UploadResult>>();

  constructor(
    private app: App,
    private settings: PluginSettings,
    private getStore: () => RemoteStore | null,
    private logger: Logger,
    private t: (key: string) => string
  ) {}

  updateSettings(settings: PluginSettings): void {
    this.settings = settings;
  }

  scheduleFile(file: TFile): void {
    if (this.selfModified.has(file.path)) {
      this.selfModified.delete(file.path);
      return;
    }
    window.clearTimeout(this.debounceTimers.get(file.path));
    const timer = window.setTimeout(() => {
      this.debounceTimers.delete(file.path);
      void this.processFile(file).catch((error) => {
        this.logger.error("Failed to process file", error);
        new Notice(this.t("uploadFailed"));
      });
    }, 600);
    this.debounceTimers.set(file.path, timer);
  }

  async processFile(file: TFile, showNotice = false): Promise<ProcessResult> {
    if (this.processingFiles.has(file.path) || file.extension !== "md") {
      return { uploaded: 0, deleted: 0 };
    }
    const store = this.getStore();
    if (!store) {
      if (showNotice) new Notice(this.t("missingConfig"));
      return { uploaded: 0, deleted: 0 };
    }

    this.processingFiles.add(file.path);
    try {
      const markdown = await this.app.vault.read(file);
      const refs = this.filterUploadableRefs(parseImageReferences(markdown), store);
      if (refs.length === 0) {
        if (showNotice) new Notice(this.t("batchSkipped"));
        return { uploaded: 0, deleted: 0 };
      }

      const replacements = await this.buildReplacements(refs, file, store);
      if (replacements.length === 0) {
        if (showNotice) new Notice(this.t("batchSkipped"));
        return { uploaded: 0, deleted: 0 };
      }

      let nextMarkdown = markdown;
      for (const item of replacements.sort((a, b) => b.ref.start - a.ref.start)) {
        nextMarkdown = nextMarkdown.slice(0, item.ref.start) + item.replacement + nextMarkdown.slice(item.ref.end);
      }
      this.selfModified.add(file.path);
      await this.app.vault.modify(file, nextMarkdown);
      const deleted = await this.deleteLocalSources(replacements.map((item) => item.source));
      if (showNotice) new Notice(this.t("batchDone"));
      return { uploaded: replacements.length, deleted };
    } finally {
      this.processingFiles.delete(file.path);
    }
  }

  async processEditorSelectionOrCursor(editor: Editor, view: MarkdownView): Promise<boolean> {
    const store = this.getStore();
    if (!store) {
      new Notice(this.t("missingConfig"));
      return false;
    }
    const markdown = editor.getValue();
    const selection = editor.getSelection();
    const startOffset = selection
      ? editor.posToOffset(editor.getCursor("from"))
      : editor.posToOffset(editor.getCursor());
    const endOffset = selection ? editor.posToOffset(editor.getCursor("to")) : startOffset;
    const ref = this.findReferenceForRange(parseImageReferences(markdown), startOffset, endOffset, store);
    if (!ref) return false;

    const source = await resolveImageSource(this.app, ref.target, view.file);
    if (!source) return false;
    const result = await this.uploadWithCache(store, {
      app: this.app,
      activeFile: view.file,
      fileName: source.fileName,
      extension: source.extension,
      contentType: source.contentType,
      data: source.data
    });

    editor.replaceRange(replacementFor(ref, result.url), editor.offsetToPos(ref.start), editor.offsetToPos(ref.end));
    await this.deleteLocalSources([source]);
    new Notice(this.t("uploadDone"));
    return true;
  }

  async handlePaste(event: ClipboardEvent, editor: Editor, view: MarkdownView): Promise<boolean> {
    const store = this.getStore();
    if (!store) {
      return false;
    }

    const clipboard = event.clipboardData;
    if (!clipboard) return false;

    const imageFiles = Array.from(clipboard.files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length > 0) {
      event.preventDefault();
      const links = await runWithConcurrency(imageFiles, this.settings.concurrency, async (file) => {
        const data = await file.arrayBuffer();
        const extension = file.name.split(".").pop()?.toLowerCase() || extensionFromMime(file.type);
        const result = await this.uploadWithCache(store, {
          app: this.app,
          activeFile: view.file,
          fileName: file.name || `image.${extension}`,
          extension,
          contentType: file.type || `image/${extension}`,
          data
        });
        return `![](${result.url})`;
      });
      editor.replaceSelection(links.join("\n"));
      new Notice(this.t("uploadDone"));
      return true;
    }

    const text = clipboard.getData("text/markdown") || clipboard.getData("text/plain");
    if (!text || parseImageReferences(text).length === 0) {
      return false;
    }
    const refs = this.filterUploadableRefs(parseImageReferences(text), store);
    if (refs.length === 0) return false;

    event.preventDefault();
    const replacements = await this.buildReplacements(refs, view.file, store);
    let nextText = text;
    for (const item of replacements.sort((a, b) => b.ref.start - a.ref.start)) {
      nextText = nextText.slice(0, item.ref.start) + item.replacement + nextText.slice(item.ref.end);
    }
    editor.replaceSelection(nextText);
    await this.deleteLocalSources(replacements.map((item) => item.source));
    new Notice(this.t("uploadDone"));
    return true;
  }

  canHandlePaste(event: ClipboardEvent): boolean {
    const store = this.getStore();
    const clipboard = event.clipboardData;
    if (!store || !clipboard) return false;

    const hasImageFile = Array.from(clipboard.files).some((file) => file.type.startsWith("image/"));
    if (hasImageFile) return true;

    const text = clipboard.getData("text/markdown") || clipboard.getData("text/plain");
    if (!text) return false;

    return this.filterUploadableRefs(parseImageReferences(text), store).length > 0;
  }

  private filterUploadableRefs(refs: ImageReference[], store: RemoteStore): ImageReference[] {
    return refs.filter((ref) => {
      const target = stripLinkDecorations(ref.target);
      if (isRemoteUrl(target) && (store.isOwnedUrl(target) || isAnyGitHubRepoImageUrl(target))) {
        return false;
      }
      return true;
    });
  }

  private async buildReplacements(refs: ImageReference[], activeFile: TFile | null, store: RemoteStore): Promise<Replacement[]> {
    const results = await runWithConcurrency(refs, this.settings.concurrency, async (ref) => {
      const source = await resolveImageSource(this.app, ref.target, activeFile);
      if (!source) return null;
      const result = await this.uploadWithCache(store, {
        app: this.app,
        activeFile,
        fileName: source.fileName,
        extension: source.extension,
        contentType: source.contentType,
        data: source.data
      });
      return {
        ref,
        source,
        replacement: replacementFor(ref, result.url)
      };
    });
    return results.filter((item): item is Replacement => item !== null);
  }

  private async deleteLocalSources(sources: ResolvedImageSource[]): Promise<number> {
    if (!this.settings.deleteLocalAfterUpload) return 0;
    const files = sources.map((source) => source.localFile).filter((file): file is TFile => file instanceof TFile);
    await deleteLocalFiles(this.app, files);
    return new Set(files.map((file) => file.path)).size;
  }

  private async uploadWithCache(store: RemoteStore, input: UploadInput): Promise<UploadResult> {
    const hash = hashArrayBuffer(input.data);
    const cacheKey = `${store.type}:${store.id}:${hash}`;
    const now = Date.now();
    this.pruneUploadCache(now);

    const cached = this.uploadCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      this.logger.debug("Reusing cached uploaded image URL", { hash, url: cached.result.url });
      return cached.result;
    }

    const inFlight = this.inFlightUploads.get(cacheKey);
    if (inFlight) {
      this.logger.debug("Reusing in-flight image upload", { hash });
      return inFlight;
    }

    const upload = store.upload(input).then((result) => {
      this.uploadCache.set(cacheKey, {
        result,
        expiresAt: Date.now() + UPLOAD_CACHE_TTL_MS
      });
      return result;
    });
    this.inFlightUploads.set(cacheKey, upload);

    try {
      return await upload;
    } finally {
      this.inFlightUploads.delete(cacheKey);
    }
  }

  private pruneUploadCache(now: number): void {
    for (const [key, entry] of this.uploadCache) {
      if (entry.expiresAt <= now) {
        this.uploadCache.delete(key);
      }
    }
  }

  private findReferenceForRange(refs: ImageReference[], start: number, end: number, store: RemoteStore): ImageReference | null {
    return (
      this.filterUploadableRefs(refs, store).find((ref) => {
        if (start === end) {
          return ref.start <= start && start <= ref.end;
        }
        return ref.start <= start && end <= ref.end;
      }) ?? null
    );
  }
}

export async function runWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const limit = Math.max(1, Math.min(10, Math.floor(concurrency || 1)));
  const results: R[] = new Array(items.length);
  let index = 0;
  async function run(): Promise<void> {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function isAnyGitHubRepoImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.hostname === "raw.githubusercontent.com") return true;
    if (url.hostname === "github.com" && /\/raw\//.test(url.pathname)) return true;
    return false;
  } catch {
    return false;
  }
}

function extensionFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  if (mime === "image/svg+xml") return "svg";
  return "png";
}
