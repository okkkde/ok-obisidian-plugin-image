import { TFile, type App, type MarkdownPostProcessorContext } from "obsidian";
import type { ImageReference } from "./types";
import { parseImageReferences } from "./utils";
import type { Logger } from "./logger";

const MIN_IMAGE_WIDTH = 48;
interface ImageResizeTarget {
  ref: ImageReference;
  lineStart: number;
  index: number;
}

export interface RenderedImageContext {
  sourcePath: string;
  imageTarget: string;
  lineStart: number;
  imageIndex: number;
  refStart: number;
  refEnd: number;
}

export class ImageResizeController {
  constructor(
    private app: App,
    private logger: Logger,
    private onImageContextMenu?: (event: MouseEvent, context: RenderedImageContext) => void
  ) {}

  process(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    const sectionInfo = ctx.getSectionInfo(el);
    if (!sectionInfo) return;

    const refs = parseImageReferences(sectionInfo.text).filter((ref) => ref.kind === "markdown" || ref.kind === "wiki");
    if (refs.length === 0) return;

    const images = Array.from(el.querySelectorAll("img")).filter((img) => !img.closest(".ok-image-resize-wrapper"));
    for (const [index, img] of images.entries()) {
      const ref = refs[index];
      if (!ref) continue;
      this.applyExistingAttributes(img, sectionInfo.text, ref);
      removeRenderedAttributeText(img);
      this.attachResizeHandle(img, ctx.sourcePath, {
        ref,
        lineStart: sectionInfo.lineStart,
        index
      });
    }
  }

  private attachResizeHandle(img: HTMLImageElement, sourcePath: string, target: ImageResizeTarget): void {
    const parent = img.parentElement;
    if (!parent) return;

    const wrapper = document.createElement("span");
    wrapper.className = "ok-image-resize-wrapper";
    wrapper.dataset.sourcePath = sourcePath;
    wrapper.dataset.lineStart = String(target.lineStart);
    wrapper.dataset.imageIndex = String(target.index);
    wrapper.dataset.refStart = String(target.ref.start);
    wrapper.dataset.refEnd = String(target.ref.end);
    wrapper.dataset.imageTarget = target.ref.target;
    parent.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    const context: RenderedImageContext = {
      sourcePath,
      imageTarget: target.ref.target,
      lineStart: target.lineStart,
      imageIndex: target.index,
      refStart: target.ref.start,
      refEnd: target.ref.end
    };
    wrapper.addEventListener("contextmenu", (event) => {
      this.showImageContextMenu(event, context);
    });
    wrapper.addEventListener("pointerdown", (event) => {
      if (event.button !== 2 && !(event.button === 0 && event.ctrlKey)) return;
      this.showImageContextMenu(event, context);
    });

    const handle = document.createElement("span");
    handle.className = "ok-image-resize-handle";
    handle.setAttribute("aria-hidden", "true");
    wrapper.appendChild(handle);
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const rect = img.getBoundingClientRect();
      const startX = event.clientX;
      const startWidth = Math.max(MIN_IMAGE_WIDTH, rect.width);
      const ratio = rect.width > 0 && rect.height > 0 ? rect.height / rect.width : 1;

      handle.setPointerCapture(event.pointerId);
      wrapper.classList.add("is-resizing");

      const onPointerMove = (moveEvent: PointerEvent) => {
        const width = Math.max(MIN_IMAGE_WIDTH, Math.round(startWidth + moveEvent.clientX - startX));
        const height = Math.max(1, Math.round(width * ratio));
        img.style.width = `${width}px`;
        img.style.height = `${height}px`;
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        handle.removeEventListener("pointermove", onPointerMove);
        handle.removeEventListener("pointerup", onPointerUp);
        handle.removeEventListener("pointercancel", onPointerUp);
        wrapper.classList.remove("is-resizing");

        const width = Math.max(MIN_IMAGE_WIDTH, Math.round(img.getBoundingClientRect().width));
        const height = Math.max(1, Math.round(width * ratio));
        img.style.width = `${width}px`;
        img.style.height = `${height}px`;
        void this.updateMarkdownSize(sourcePath, target, width, height).catch((error) => {
          this.logger.error("Failed to update image size attributes", error);
        });

        try {
          handle.releasePointerCapture(upEvent.pointerId);
        } catch {
          // Pointer capture can already be released by the browser when the element unloads.
        }
      };

      handle.addEventListener("pointermove", onPointerMove);
      handle.addEventListener("pointerup", onPointerUp);
      handle.addEventListener("pointercancel", onPointerUp);
    });
  }

  private showImageContextMenu(event: MouseEvent, context: RenderedImageContext): void {
    if (!this.onImageContextMenu) return;
    event.preventDefault();
    event.stopPropagation();
    this.onImageContextMenu(event, context);
  }

  private applyExistingAttributes(img: HTMLImageElement, sectionText: string, ref: ImageReference): void {
    const attributes = parseAttributeBlock(sectionText.slice(ref.end));
    if (!attributes) return;

    const width = parsePixelAttribute(attributes, "width");
    const height = parsePixelAttribute(attributes, "height");
    if (width) img.style.width = `${width}px`;
    if (height) img.style.height = `${height}px`;
  }

  private async updateMarkdownSize(sourcePath: string, target: ImageResizeTarget, width: number, height: number): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) return;

    const markdown = await this.app.vault.read(file);
    const lineStartOffset = offsetForLine(markdown, target.lineStart);
    const expectedStart = lineStartOffset + target.ref.start;
    const expectedEnd = expectedStart + target.ref.fullMatch.length;

    let range = findCurrentImageRange(markdown, expectedStart, expectedEnd, target.ref.fullMatch);
    if (!range) {
      range = findImageRangeBySectionIndex(markdown, target.lineStart, target.index);
    }
    if (!range) return;

    const nextMarkdown =
      markdown.slice(0, range.end) +
      buildAttributeBlock(markdown.slice(range.end), width, height) +
      markdown.slice(range.end + existingAttributeLength(markdown.slice(range.end)));
    await this.app.vault.modify(file, nextMarkdown);
  }
}

function findCurrentImageRange(markdown: string, start: number, end: number, fullMatch: string): { start: number; end: number } | null {
  if (markdown.slice(start, end) === fullMatch) return { start, end };
  const searchStart = Math.max(0, start - 200);
  const searchEnd = Math.min(markdown.length, end + 200);
  const index = markdown.slice(searchStart, searchEnd).indexOf(fullMatch);
  if (index === -1) return null;
  const resolvedStart = searchStart + index;
  return { start: resolvedStart, end: resolvedStart + fullMatch.length };
}

function findImageRangeBySectionIndex(markdown: string, lineStart: number, index: number): { start: number; end: number } | null {
  const lineStartOffset = offsetForLine(markdown, lineStart);
  const nextLineOffset = offsetForLine(markdown, lineStart + 1);
  const searchEnd = nextLineOffset > lineStartOffset ? nextLineOffset : markdown.length;
  const refs = parseImageReferences(markdown.slice(lineStartOffset, searchEnd)).filter(
    (ref) => ref.kind === "markdown" || ref.kind === "wiki"
  );
  const ref = refs[index];
  if (!ref) return null;
  return {
    start: lineStartOffset + ref.start,
    end: lineStartOffset + ref.end
  };
}

function offsetForLine(markdown: string, line: number): number {
  if (line <= 0) return 0;
  let offset = 0;
  for (let current = 0; current < line && offset < markdown.length; current += 1) {
    const next = markdown.indexOf("\n", offset);
    if (next === -1) return markdown.length;
    offset = next + 1;
  }
  return offset;
}

function parseAttributeBlock(value: string): string | null {
  const match = /^\s*(\{[^}\n]*\})/.exec(value);
  return match?.[1] ?? null;
}

function existingAttributeLength(value: string): number {
  const match = /^\s*\{[^}\n]*\}/.exec(value);
  return match?.[0].length ?? 0;
}

function buildAttributeBlock(afterImage: string, width: number, height: number): string {
  const existing = parseAttributeBlock(afterImage);
  const preserved = existing
    ? existing
        .slice(1, -1)
        .replace(/\s*\b(?:width|height)\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
        .trim()
    : "";
  const sizeAttrs = `width="${width}px" height="${height}px"`;
  return `{${[preserved, sizeAttrs].filter(Boolean).join(" ")}}`;
}

function parsePixelAttribute(attributes: string, name: "width" | "height"): number | null {
  const regex = new RegExp(`\\b${name}\\s*=\\s*["']?(\\d+(?:\\.\\d+)?)px["']?`, "i");
  const match = regex.exec(attributes);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function removeRenderedAttributeText(img: HTMLImageElement): void {
  let sibling = img.nextSibling;
  while (sibling && sibling.nodeType === Node.TEXT_NODE && sibling.textContent?.trim() === "") {
    sibling = sibling.nextSibling;
  }
  if (!sibling || sibling.nodeType !== Node.TEXT_NODE || !sibling.textContent) return;

  const nextText = sibling.textContent;
  const match = /^\s*\{[^}\n]*\}/.exec(nextText);
  if (!match) return;
  sibling.textContent = nextText.slice(match[0].length);
}
