# ok-obsidian-plugin-image

## 0.2.0

### Minor Changes

- 36e5534: Add proportional drag resizing for rendered images using Markdown attributes.
- e39029a: Initial implementation of the Obsidian image uploader plugin.

### Patch Changes

- a7485a3: Add multilingual README documentation.
- e39029a: Reuse recently uploaded image URLs from an in-memory hash cache to avoid duplicate uploads.
- e39029a: Document the repository development and release flow for future agents.
- e39029a: Store uploaded images under a sanitized current-document folder with original image names plus a random suffix.
- a7485a3: Update GitHub Actions workflow actions and support a dedicated Changesets token.
- e39029a: Warn when multiple paste handlers may process the same pasted image.
- 36e5534: Add the upload-and-replace action to rendered image context menus.
- 36e5534: Rename the command for uploading and replacing all images in the current note.
- 36e5534: Group settings vertically with native Obsidian setting headings.
