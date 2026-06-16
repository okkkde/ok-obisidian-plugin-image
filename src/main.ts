import { MarkdownView, Notice, Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS } from "./defaults";
import { createTranslator } from "./i18n";
import { Logger } from "./logger";
import { ImageUploadProcessor } from "./processor";
import { ImageUploaderSettingTab } from "./settings";
import { createActiveStore, hasValidActiveStore } from "./stores";
import type { PluginSettings, RemoteStore } from "./types";

export default class ImageUploaderPlugin extends Plugin {
  settings: PluginSettings = structuredClone(DEFAULT_SETTINGS);
  t = createTranslator(() => this.settings.locale);
  private logger = new Logger(() => this.settings.logLevel);
  private processor!: ImageUploadProcessor;
  private pasteListenerMonitor?: PasteListenerMonitor;
  private warnedAboutPasteListeners = false;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.processor = new ImageUploadProcessor(this.app, this.settings, () => this.getActiveStore(), this.logger, this.t);
    this.pasteListenerMonitor = createPasteListenerMonitor(document);
    this.register(() => this.pasteListenerMonitor?.restore());

    this.addSettingTab(new ImageUploaderSettingTab(this.app, this));
    this.addCommand({
      id: "upload-images-in-current-note",
      name: this.t("uploadCurrentFile"),
      editorCallback: async (_editor, view) => {
        if (view.file instanceof TFile) {
          await this.processor.processFile(view.file, true);
        }
      }
    });

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile && file.extension === "md") {
          this.processor.scheduleFile(file);
        }
      })
    );

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        if (!(view instanceof MarkdownView)) return;
        menu.addItem((item) => {
          item
            .setTitle(this.t("uploadImage"))
            .setIcon("upload")
            .onClick(async () => {
              try {
                const handled = await this.processor.processEditorSelectionOrCursor(editor, view);
                if (!handled) new Notice(this.t("batchSkipped"));
              } catch (error) {
                this.logger.error("Failed to upload image from menu", error);
                new Notice(this.t("uploadFailed"));
              }
            });
        });
      })
    );

    this.registerDomEvent(document, "paste", (event: ClipboardEvent) => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      const editor = view?.editor;
      if (!view || !editor || !hasValidActiveStore(this.settings)) return;
      if (!isPasteTargetInView(event, view)) return;
      if (!this.processor.canHandlePaste(event)) return;
      this.warnIfMultiplePasteListeners();
      void this.processor.handlePaste(event, editor, view).catch((error) => {
        this.logger.error("Failed to upload pasted image", error);
        new Notice(this.t("uploadFailed"));
      });
    });

    this.logger.log("Plugin loaded");
  }

  onunload(): void {
    this.logger.log("Plugin unloaded");
  }

  async loadSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<PluginSettings> | null;
    this.settings = mergeSettings(DEFAULT_SETTINGS, loaded ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.processor?.updateSettings(this.settings);
  }

  private getActiveStore(): RemoteStore | null {
    if (!hasValidActiveStore(this.settings)) {
      return null;
    }
    return createActiveStore(this.settings);
  }

  private warnIfMultiplePasteListeners(): void {
    const count = this.pasteListenerMonitor?.count() ?? 0;
    if (this.warnedAboutPasteListeners || count <= 1) {
      return;
    }
    this.warnedAboutPasteListeners = true;
    this.logger.warn(
      "Multiple document paste listeners observed while handling an image paste; another plugin may also process the pasted image.",
      { observedDocumentPasteListeners: count }
    );
  }
}

function isPasteTargetInView(event: ClipboardEvent, view: MarkdownView): boolean {
  return event.target instanceof Node && view.containerEl.contains(event.target);
}

interface PasteListenerMonitor {
  count(): number;
  restore(): void;
}

function createPasteListenerMonitor(target: Document): PasteListenerMonitor {
  const listeners = new Set<EventListenerOrEventListenerObject>();
  const originalAddEventListener = target.addEventListener;
  const originalRemoveEventListener = target.removeEventListener;

  target.addEventListener = function addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ) {
    if (type === "paste" && listener) {
      listeners.add(listener);
    }
    return originalAddEventListener.call(this, type, listener, options);
  } as Document["addEventListener"];

  target.removeEventListener = function removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ) {
    if (type === "paste" && listener) {
      listeners.delete(listener);
    }
    return originalRemoveEventListener.call(this, type, listener, options);
  } as Document["removeEventListener"];

  return {
    count: () => listeners.size,
    restore: () => {
      target.addEventListener = originalAddEventListener;
      target.removeEventListener = originalRemoveEventListener;
    }
  };
}

function mergeSettings(defaults: PluginSettings, loaded: Partial<PluginSettings>): PluginSettings {
  const merged = structuredClone(defaults);
  Object.assign(merged, loaded);
  merged.stores = loaded.stores?.length ? loaded.stores : structuredClone(defaults.stores);
  merged.stores = merged.stores.map((store, index) => ({
    ...defaults.stores[Math.min(index, defaults.stores.length - 1)],
    ...store,
    github: {
      ...defaults.stores[0].github,
      ...store.github
    }
  }));
  if (!merged.stores.some((store) => store.id === merged.activeStoreId)) {
    merged.activeStoreId = merged.stores[0]?.id ?? defaults.activeStoreId;
  }
  merged.concurrency = Math.max(1, Math.min(8, Number(merged.concurrency) || defaults.concurrency));
  merged.logLevel = merged.logLevel ?? defaults.logLevel;
  merged.locale = merged.locale ?? defaults.locale;
  merged.deleteLocalAfterUpload = merged.deleteLocalAfterUpload ?? defaults.deleteLocalAfterUpload;
  return merged;
}
