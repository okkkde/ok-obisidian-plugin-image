import { MarkdownView, Menu, Notice, Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS } from "./defaults";
import { createTranslator } from "./i18n";
import { Logger } from "./logger";
import { ImageUploadProcessor } from "./processor";
import { ImageResizeController, type RenderedImageContext } from "./resize";
import { ImageUploaderSettingTab } from "./settings";
import { createActiveStore, hasValidActiveStore } from "./stores";
import type { PluginSettings, RemoteStore } from "./types";
import { isImagePath, isRemoteUrl, parseImageReferences, resolveLocalFile, stripLinkDecorations } from "./utils";

export default class ImageUploaderPlugin extends Plugin {
  settings: PluginSettings = structuredClone(DEFAULT_SETTINGS);
  t = createTranslator(() => this.settings.locale);
  private logger = new Logger(() => this.settings.logLevel);
  private processor!: ImageUploadProcessor;
  private resizeController!: ImageResizeController;
  private pasteListenerMonitor?: PasteListenerMonitor;
  private warnedAboutPasteListeners = false;
  private lastPreviewImageContext: PreviewImageContext | null = null;
  private fallbackImageMenuTimer?: number;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.processor = new ImageUploadProcessor(this.app, this.settings, () => this.getActiveStore(), this.logger, this.t);
    this.resizeController = new ImageResizeController(this.app, this.logger, (event, context) => {
      this.showRenderedImageMenu(event, context);
    });
    this.pasteListenerMonitor = createPasteListenerMonitor(document);
    this.register(() => this.pasteListenerMonitor?.restore());

    this.addSettingTab(new ImageUploaderSettingTab(this.app, this));
    this.registerMarkdownPostProcessor((el, ctx) => {
      this.resizeController.process(el, ctx);
    });

    this.registerDomEvent(
      document,
      "contextmenu",
      (event: MouseEvent) => {
        const target = this.capturePreviewImageContext(event);
        if (target) {
          this.showFallbackImageMenuIfNeeded(event, target);
        }
      },
      { capture: true }
    );

    this.registerDomEvent(
      document,
      "pointerdown",
      (event: PointerEvent) => {
        if (event.button !== 2 && !(event.button === 0 && event.ctrlKey)) return;
        const target = this.capturePreviewImageContext(event);
        if (target) {
          this.showFallbackImageMenuIfNeeded(event, target);
        }
      },
      { capture: true }
    );

    this.addCommand({
      id: "upload-and-replace-all-images-in-current-note",
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
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile) || !isImagePath(file.path)) return;
        const target = this.getFileMenuImageTarget(file);
        if (!target) return;

        this.addPreviewImageUploadMenuItem(menu, target.sourceFile, target.context);
      })
    );

    this.registerEvent(
      this.app.workspace.on("url-menu", (menu, url) => {
        const context = this.getFreshPreviewImageContext();
        if (!context || !isSameRemoteUrl(url, context.imageTarget)) return;

        const sourceFile = this.app.vault.getAbstractFileByPath(context.sourcePath);
        if (!(sourceFile instanceof TFile) || sourceFile.extension !== "md") return;

        this.addPreviewImageUploadMenuItem(menu, sourceFile, context);
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

  private capturePreviewImageContext(event: MouseEvent): PreviewImageMenuTarget | null {
    const target = this.getContextMenuImageTarget(event);
    if (!target) return null;
    this.lastPreviewImageContext = target.context;
    return target;
  }

  private getContextMenuImageTarget(event: MouseEvent): PreviewImageMenuTarget | null {
    const target = event.target instanceof Element ? event.target : null;
    const wrapper = target?.closest(".ok-image-resize-wrapper");
    if (wrapper instanceof HTMLElement) {
      const wrappedTarget = this.getWrappedImageTarget(wrapper);
      if (wrappedTarget) return wrappedTarget;
    }

    const img = getContextMenuImageElement(target);
    return img ? this.findImageElementTarget(img) : null;
  }

  private getWrappedImageTarget(wrapper: HTMLElement): PreviewImageMenuTarget | null {
    const sourcePath = wrapper.dataset.sourcePath;
    const imageTarget = wrapper.dataset.imageTarget;
    const lineStart = Number(wrapper.dataset.lineStart);
    const imageIndex = Number(wrapper.dataset.imageIndex);
    if (!sourcePath || !imageTarget || !Number.isInteger(lineStart) || !Number.isInteger(imageIndex)) {
      return null;
    }

    const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(sourceFile instanceof TFile) || sourceFile.extension !== "md") return null;

    const refStart = numberFromDataset(wrapper.dataset.refStart);
    const refEnd = numberFromDataset(wrapper.dataset.refEnd);
    return {
      sourceFile,
      context: {
        sourcePath,
        imageTarget,
        lineStart,
        imageIndex,
        refStart,
        refEnd,
        expiresAt: Date.now() + 5000
      }
    };
  }

  private findImageElementTarget(img: HTMLImageElement): PreviewImageMenuTarget | null {
    const view = this.findMarkdownViewContaining(img);
    const sourceFile = view?.file;
    if (!view || !(sourceFile instanceof TFile) || sourceFile.extension !== "md") return null;

    const refs = parseImageReferences(view.getViewData());
    const images = getMarkdownImagesInView(view);
    const imageIndex = images.indexOf(img);
    const ref = imageIndex >= 0 ? refs[imageIndex] : null;
    if (!ref) return null;

    return {
      sourceFile,
      context: {
        sourcePath: sourceFile.path,
        imageTarget: ref.target,
        lineStart: 0,
        imageIndex,
        refStart: ref.start,
        refEnd: ref.end,
        expiresAt: Date.now() + 5000
      }
    };
  }

  private findMarkdownViewContaining(element: Element): MarkdownView | null {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (view instanceof MarkdownView && view.containerEl.contains(element)) {
        return view;
      }
    }
    return this.app.workspace.getActiveViewOfType(MarkdownView);
  }

  private getFreshPreviewImageContext(): PreviewImageContext | null {
    if (!this.lastPreviewImageContext || this.lastPreviewImageContext.expiresAt < Date.now()) {
      this.lastPreviewImageContext = null;
      return null;
    }
    return this.lastPreviewImageContext;
  }

  private getFileMenuImageTarget(imageFile: TFile): PreviewImageMenuTarget | null {
    const context = this.getFreshPreviewImageContext();
    if (context) {
      const sourceFile = this.app.vault.getAbstractFileByPath(context.sourcePath);
      if (sourceFile instanceof TFile && sourceFile.extension === "md") {
        const linkedImage = resolveLocalFile(this.app, context.imageTarget, sourceFile);
        if (linkedImage instanceof TFile && linkedImage.path === imageFile.path) {
          return { sourceFile, context };
        }
      }
    }

    return this.findActiveViewImageTarget(imageFile);
  }

  private findActiveViewImageTarget(imageFile: TFile): PreviewImageMenuTarget | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return null;
    const sourceFile = view?.file;
    if (!(sourceFile instanceof TFile) || sourceFile.extension !== "md") return null;

    const refs = parseImageReferences(view.editor.getValue());
    const cursorOffset = view.editor.posToOffset(view.editor.getCursor());
    const matches = refs
      .map((ref, index) => ({ ref, index }))
      .filter(({ ref }) => {
        const linkedImage = resolveLocalFile(this.app, ref.target, sourceFile);
        return linkedImage instanceof TFile && linkedImage.path === imageFile.path;
      })
      .sort((a, b) => distanceToRange(a.ref.start, a.ref.end, cursorOffset) - distanceToRange(b.ref.start, b.ref.end, cursorOffset));
    const match = matches[0];
    if (match) {
      const { ref, index } = match;
      const linkedImage = resolveLocalFile(this.app, ref.target, sourceFile);
      if (linkedImage instanceof TFile && linkedImage.path === imageFile.path) {
        return {
          sourceFile,
          context: {
            sourcePath: sourceFile.path,
            imageTarget: ref.target,
            lineStart: 0,
            imageIndex: index,
            refStart: ref.start,
            refEnd: ref.end,
            expiresAt: Date.now() + 5000
          }
        };
      }
    }

    return null;
  }

  private addPreviewImageUploadMenuItem(menu: Menu, sourceFile: TFile, context: PreviewImageContext): void {
    menu.addItem((item) => {
      item
        .setTitle(this.t("uploadAndReplaceImage"))
        .setIcon("upload")
        .onClick(async () => {
          try {
            const handled = await this.processor.processRenderedImage(
              sourceFile,
              {
                lineStart: context.lineStart,
                imageIndex: context.imageIndex,
                refStart: context.refStart,
                refEnd: context.refEnd
              },
              true
            );
            if (!handled) new Notice(this.t("batchSkipped"));
          } catch (error) {
            this.logger.error("Failed to upload image from preview menu", error);
            new Notice(this.t("uploadFailed"));
          }
        });
    });
  }

  private showRenderedImageMenu(event: MouseEvent, context: RenderedImageContext): void {
    const sourceFile = this.app.vault.getAbstractFileByPath(context.sourcePath);
    if (!(sourceFile instanceof TFile) || sourceFile.extension !== "md") return;

    const previewContext: PreviewImageContext = {
      sourcePath: context.sourcePath,
      imageTarget: context.imageTarget,
      lineStart: context.lineStart,
      imageIndex: context.imageIndex,
      refStart: context.refStart,
      refEnd: context.refEnd,
      expiresAt: Date.now() + 5000
    };
    this.lastPreviewImageContext = previewContext;

    const menu = new Menu();
    this.addPreviewImageUploadMenuItem(menu, sourceFile, previewContext);
    menu.showAtPosition({ x: event.clientX, y: event.clientY }, document);
  }

  private showFallbackImageMenuIfNeeded(event: MouseEvent, target: PreviewImageMenuTarget): void {
    const position = { x: event.clientX, y: event.clientY };
    window.clearTimeout(this.fallbackImageMenuTimer);
    this.fallbackImageMenuTimer = window.setTimeout(() => {
      if (hasVisibleObsidianMenu()) return;

      const menu = new Menu();
      this.addPreviewImageUploadMenuItem(menu, target.sourceFile, target.context);
      menu.showAtPosition(position, document);
    }, 120);
  }
}

function isPasteTargetInView(event: ClipboardEvent, view: MarkdownView): boolean {
  return event.target instanceof Node && view.containerEl.contains(event.target);
}

interface PasteListenerMonitor {
  count(): number;
  restore(): void;
}

interface PreviewImageContext {
  sourcePath: string;
  imageTarget: string;
  lineStart: number;
  imageIndex: number;
  refStart?: number;
  refEnd?: number;
  expiresAt: number;
}

interface PreviewImageMenuTarget {
  sourceFile: TFile;
  context: PreviewImageContext;
}

function numberFromDataset(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function isSameRemoteUrl(left: string, right: string): boolean {
  const leftTarget = stripLinkDecorations(left);
  const rightTarget = stripLinkDecorations(right);
  if (!isRemoteUrl(leftTarget) || !isRemoteUrl(rightTarget)) return false;
  try {
    return new URL(leftTarget).href === new URL(rightTarget).href;
  } catch {
    return leftTarget === rightTarget;
  }
}

function distanceToRange(start: number, end: number, position: number): number {
  if (start <= position && position <= end) return 0;
  return Math.min(Math.abs(position - start), Math.abs(position - end));
}

function getContextMenuImageElement(target: Element | null): HTMLImageElement | null {
  if (!target) return null;
  if (target instanceof HTMLImageElement) return target;

  const image = target.closest("img");
  if (image instanceof HTMLImageElement) return image;

  const wrappedImage = target.closest(".ok-image-resize-wrapper")?.querySelector("img");
  return wrappedImage instanceof HTMLImageElement ? wrappedImage : null;
}

function getMarkdownImagesInView(view: MarkdownView): HTMLImageElement[] {
  return Array.from(view.containerEl.querySelectorAll("img")).filter((img) => {
    if (!(img instanceof HTMLImageElement)) return false;
    return Boolean(img.closest(".markdown-preview-view, .markdown-source-view"));
  });
}

function hasVisibleObsidianMenu(): boolean {
  return Array.from(document.querySelectorAll(".menu")).some((menu) => {
    if (!(menu instanceof HTMLElement)) return false;
    if (!menu.querySelector(".menu-item")) return false;
    const rect = menu.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
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
  merged.stores = merged.stores.filter(
    (store, index, stores) => stores.findIndex((candidate) => candidate.type === store.type) === index
  );
  if (!merged.stores.some((store) => store.id === merged.activeStoreId)) {
    merged.activeStoreId = merged.stores[0]?.id ?? defaults.activeStoreId;
  }
  merged.concurrency = Math.max(1, Math.min(8, Number(merged.concurrency) || defaults.concurrency));
  merged.logLevel = merged.logLevel ?? defaults.logLevel;
  merged.locale = merged.locale ?? defaults.locale;
  merged.deleteLocalAfterUpload = merged.deleteLocalAfterUpload ?? defaults.deleteLocalAfterUpload;
  return merged;
}
