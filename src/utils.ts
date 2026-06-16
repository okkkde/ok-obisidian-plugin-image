import { normalizePath, requestUrl, TFile, type App } from "obsidian";
import type { ImageReference, ResolvedImageSource } from "./types";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif"]);

export function isImagePath(path: string): boolean {
  const clean = stripLinkDecorations(path).split("?")[0].split("#")[0];
  const ext = clean.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(ext);
}

export function stripLinkDecorations(target: string): string {
  let value = target.trim();
  if (value.startsWith("<") && value.endsWith(">")) {
    value = value.slice(1, -1);
  }
  return value;
}

export function splitWikiTarget(target: string): { path: string; suffix: string } {
  const pipe = target.indexOf("|");
  if (pipe === -1) return { path: target.trim(), suffix: "" };
  return {
    path: target.slice(0, pipe).trim(),
    suffix: target.slice(pipe)
  };
}

export function getExtension(fileName: string, fallback = "png"): string {
  const ext = fileName.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase();
  return ext && IMAGE_EXTENSIONS.has(ext) ? ext : fallback;
}

export function guessContentType(extension: string): string {
  switch (extension.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "bmp":
      return "image/bmp";
    case "svg":
      return "image/svg+xml";
    case "avif":
      return "image/avif";
    default:
      return "image/png";
  }
}

export function sanitizeFileName(value: string): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "image";
}

export function sanitizePathSegment(value: string, fallback = "image"): string {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+$/, "")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
}

export function activeFileFolder(file: TFile | null | undefined): string {
  if (!file) return "";
  const index = file.path.lastIndexOf("/");
  return index === -1 ? "" : file.path.slice(0, index);
}

export function resolveLocalFile(app: App, target: string, activeFile?: TFile | null): TFile | null {
  const stripped = stripLinkDecorations(target);
  const { path } = splitWikiTarget(stripped);
  if (!path || isRemoteUrl(path) || isDataUrl(path)) {
    return null;
  }
  const decoded = decodeURIComponent(path);
  const direct = app.vault.getAbstractFileByPath(normalizePath(decoded));
  if (direct instanceof TFile) return direct;

  const relativeBase = activeFileFolder(activeFile);
  const relativePath = relativeBase ? normalizePath(`${relativeBase}/${decoded}`) : normalizePath(decoded);
  const relative = app.vault.getAbstractFileByPath(relativePath);
  if (relative instanceof TFile) return relative;

  const linked = app.metadataCache.getFirstLinkpathDest(decoded, activeFile?.path ?? "");
  return linked instanceof TFile ? linked : null;
}

export function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(stripLinkDecorations(value));
}

export function isDataUrl(value: string): boolean {
  return /^data:image\//i.test(stripLinkDecorations(value));
}

export function isUploadableTarget(value: string): boolean {
  const target = stripLinkDecorations(value);
  return isDataUrl(target) || isRemoteUrl(target) || isImagePath(target);
}

export async function resolveImageSource(app: App, target: string, activeFile?: TFile | null): Promise<ResolvedImageSource | null> {
  const clean = stripLinkDecorations(target);
  if (isDataUrl(clean)) {
    return dataUrlToSource(clean);
  }

  if (isRemoteUrl(clean)) {
    const response = await requestUrl({ url: clean, method: "GET" });
    const contentType = response.headers["content-type"] ?? response.headers["Content-Type"] ?? "";
    const fallbackExt = extensionFromContentType(contentType) ?? getExtension(new URL(clean).pathname);
    const fileName = sanitizeFileName(decodeURIComponent(new URL(clean).pathname.split("/").pop() || "image"));
    return {
      data: response.arrayBuffer,
      fileName,
      extension: getExtension(fileName, fallbackExt),
      contentType: contentType.split(";")[0] || guessContentType(fallbackExt)
    };
  }

  const localFile = resolveLocalFile(app, clean, activeFile);
  if (!(localFile instanceof TFile) || !isImagePath(localFile.path)) {
    return null;
  }
  const extension = getExtension(localFile.name);
  return {
    data: await app.vault.readBinary(localFile),
    fileName: sanitizeFileName(localFile.name),
    extension,
    contentType: guessContentType(extension),
    localFile
  };
}

export function parseImageReferences(markdown: string): ImageReference[] {
  const refs: ImageReference[] = [];
  collectMarkdownImages(markdown, refs);
  collectWikiImages(markdown, refs);
  collectHtmlImages(markdown, refs);
  return refs
    .filter((ref) => isUploadableTarget(ref.target))
    .sort((a, b) => a.start - b.start);
}

function collectMarkdownImages(markdown: string, refs: ImageReference[]): void {
  const regex = /!\[([^\]]*)\]\(([^)\n]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    const target = stripLinkDecorations(match[2]);
    refs.push({
      kind: "markdown",
      fullMatch: match[0],
      altOrLabel: match[1],
      target,
      start: match.index,
      end: match.index + match[0].length,
      targetStart: match.index + match[0].indexOf(match[2]),
      targetEnd: match.index + match[0].indexOf(match[2]) + match[2].length
    });
  }
}

function collectWikiImages(markdown: string, refs: ImageReference[]): void {
  const regex = /!\[\[([^\]\n]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    const { path } = splitWikiTarget(match[1]);
    refs.push({
      kind: "wiki",
      fullMatch: match[0],
      target: path,
      altOrLabel: match[1],
      start: match.index,
      end: match.index + match[0].length,
      targetStart: match.index + 3,
      targetEnd: match.index + 3 + match[1].length
    });
  }
}

function collectHtmlImages(markdown: string, refs: ImageReference[]): void {
  const regex = /<img\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    const srcOffset = match[0].indexOf(match[2]);
    refs.push({
      kind: "html",
      fullMatch: match[0],
      target: match[2],
      start: match.index,
      end: match.index + match[0].length,
      targetStart: match.index + srcOffset,
      targetEnd: match.index + srcOffset + match[2].length
    });
  }
}

export function replacementFor(ref: ImageReference, url: string): string {
  if (ref.kind === "wiki") {
    return `![](${url})`;
  }
  return ref.fullMatch.slice(0, ref.targetStart - ref.start) + url + ref.fullMatch.slice(ref.targetEnd - ref.start);
}

export async function deleteLocalFiles(app: App, files: TFile[]): Promise<void> {
  const unique = new Map(files.map((file) => [file.path, file]));
  for (const file of unique.values()) {
    await app.vault.delete(file);
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}

function dataUrlToSource(url: string): ResolvedImageSource | null {
  const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/i.exec(url);
  if (!match) return null;
  const contentType = match[1];
  const extension = extensionFromContentType(contentType) ?? "png";
  const binary = typeof atob === "function" ? atob(match[2]) : Buffer.from(match[2], "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return {
    data: bytes.buffer,
    fileName: `image.${extension}`,
    extension,
    contentType
  };
}

function extensionFromContentType(contentType: string): string | null {
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  if (type === "image/svg+xml") return "svg";
  if (type === "image/avif") return "avif";
  if (type === "image/bmp") return "bmp";
  return null;
}
