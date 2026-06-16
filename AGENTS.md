# AGENTS.md

## Project

This repository is an Obsidian community plugin.

Runtime release files are:

- `manifest.json`
- `main.js`
- `styles.css`

Source code lives under `src/`. Do not hand-edit generated `main.js`; change TypeScript source and run the build.

## Development

Use npm.

```bash
npm install
npm run build
```

Before finishing code changes, run:

```bash
npm run build
```

## Changesets

This project uses Changesets for feature notes, changelog generation, and version bumps.

For user-visible changes, add a changeset file under `.changeset/`:

```markdown
---
"ok-obsidian-plugin-image": patch
---

Short description of the change.
```

Use:

- `patch` for fixes and small compatible improvements.
- `minor` for new user-facing features.
- `major` for breaking changes.

Do not add a changeset for purely internal maintenance unless it affects release artifacts, user behavior, documentation, or packaging.

## Release Flow

The default branch is `main`.

When commits land on `main`:

1. GitHub Actions runs CI.
2. The Changesets release workflow creates or updates a version PR when pending changesets exist.
3. Maintainers review and merge the version PR.
4. After the version PR is merged, the release workflow builds the plugin.
5. The workflow creates a Git tag, creates a GitHub Release, and uploads:
   - `main.js`
   - `manifest.json`
   - `styles.css`

The npm `version` script runs `changeset version`, then syncs `manifest.json` and `versions.json` from `package.json`.

## Implementation Notes

- Keep remote stores behind the store abstraction in `src/stores/`.
- GitHub is currently the only implemented store.
- Image replacement must happen only after upload succeeds.
- Replace the old image link in place; do not insert a new link first and delete later.
- If the original image is a local vault file, delete it only after successful upload and markdown replacement.
- Keep upload concurrency bounded by the configured setting.
- Update i18n strings for Simplified Chinese, Traditional Chinese, English, Korean, and Japanese when adding user-visible settings or messages.
