# Ok Obsidian Plugin Image

An Obsidian plugin that uploads pasted and embedded images to a remote store.

This release implements the remote store abstraction with GitHub repository support.

## Features

- Multiple remote store settings with a selectable active store.
- GitHub repository uploads through the GitHub Contents API.
- Paste image files directly into a note and upload them before inserting the final image link.
- On note save/modify, upload all image links that are not already GitHub repository URLs.
- Editor right-click menu item for uploading the image under the cursor or current selection.
- Replace image links in place only after upload succeeds.
- Delete the original local vault image after a successful upload and replacement.
- Optional custom domain or CDN URL generation.
- Optional private repository URL mode that embeds the token into raw GitHub image URLs.
- Configurable upload concurrency.
- Plugin log levels: trace, debug, log, info, warn, error, off.
- UI languages: Simplified Chinese, Traditional Chinese, English, Korean, Japanese.

## Configuration

Open Obsidian settings, find **Ok Obsidian Plugin Image**, then configure:

- GitHub repository short path: `owner/repo`
- Branch, for example `main`
- Upload path, for example `images/{yyyy}/{MM}`
- Personal Access Token with `contents:write` access to the repository
- Optional custom domain or CDN, for example `https://img.example.com`
- Upload concurrency
- Log level

Upload paths support:

- `{yyyy}`
- `{MM}`
- `{dd}`
- `{timestamp}`
- `{name}`
- `{ext}`

## Private Repositories

Markdown image requests cannot attach an `Authorization` header. When private image URL mode is enabled, generated URLs use `x-access-token` basic-auth style raw GitHub URLs. This may expose the token anywhere the note is visible.

Custom domains and third-party CDNs generally cannot use the GitHub token automatically, so private repository images may not work through a custom domain.

## Development

```bash
npm install
npm run dev
npm run build
```

For manual testing, copy or symlink this repository into:

```text
<vault>/.obsidian/plugins/ok-obsidian-plugin-image
```

The plugin runtime files are:

- `manifest.json`
- `main.js`
- `styles.css`

## Release Flow

This project uses Changesets and GitHub Actions.

- New commits on `main` with changesets create or update a version PR.
- Merging the version PR updates version files and changelog.
- After merge, the release workflow builds the plugin, creates a tag, creates a GitHub Release, and uploads `main.js`, `manifest.json`, and `styles.css`.
