# Prompt Vault Share Viewer

A tiny static page that renders a Prompt Vault shared prompt in the
browser: read-only, no app install, no login. It is the page that
Prompt Vault share links point to.

## Host it (one time)

Copy this whole `share-viewer` folder to any static host. With GitHub Pages:

1. Push this repository to GitHub.
2. In the repo: **Settings → Pages → Deploy from a branch**, pick your
   branch and the `/ (root)` folder (or copy this folder's contents into a
   `docs/` folder and select that).
3. Your viewer address will look like
   `https://<your-name>.github.io/prompt-vault/share-viewer/`
4. Paste that address in the Prompt Vault app under
   **Account & Sync → Share viewer**.

## Optional: Drive API key

For the most reliable reading of Drive-shared files, open `config.js`
and paste a Google API key (browser key restricted to the Drive API and
to your viewer domain). Without it, the viewer uses Google's public
download endpoint as a fallback.

## How links work

- `?f=<drive-file-id>` — the app published a snapshot of the prompt to
  the owner's Google Drive as an anyone-with-the-link file. Deleting
  that file in the app ("Stop sharing") makes this page report the
  link as no longer available.
- `#d=<base64 snapshot>` — offline links that carry the prompt inside
  the link itself. These cannot be revoked, since nothing is hosted.
