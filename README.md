<p align="center">
  <img src="src-tauri/icons/icon.png" alt="Prompt Vault logo" width="120" />
</p>

<h1 align="center">Prompt Vault</h1>

---

<p align="center">
  <b>Your personal prompt library. Every AI prompt you have ever written, saved in one calm place, searchable in seconds, and backed up to your own Google Drive.</b>
</p>

<p align="center">
  <a href="https://github.com/heyysam1/prompt-vault/releases"><img src="https://img.shields.io/badge/release-v1.0.3-brightgreen" alt="Release v1.0.3" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform: Windows, macOS, Linux" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-brightgreen" alt="License: MIT" /></a>
</p>

<p align="center">
  <a href="https://github.com/heyysam1/prompt-vault/releases/latest">Download Prompt Vault (v1.0.3)</a> •
  <a href="#-features">Features</a> •
  <a href="#-screenshots">Screenshots</a> •
  <a href="#security-overview">Security</a> •
  <a href="#-privacy">Privacy</a> •
  <a href="CONTRIBUTING.md">Contributing</a> •
  <a href="SECURITY.md">Security Policy</a> •
  <a href="#-license">License</a>
</p>

---

## Overview

If you work with AI every day, your best prompts end up scattered across chat windows, notes apps and screenshots, and the one you need is never the one you can find. Prompt Vault gives them one home: a lightweight desktop app with a clean, document-style editor, instant search, and optional AI features powered by **your own API key**.

Everything works fully offline. Your data lives on your computer, and it only goes anywhere when **you** sign in and back it up to **your own Google Drive**.

## ✨ Features

- **A calm prompt library** — Google Docs style cards with readable previews of the real content, pinning, a recent view, and a trash with restore
- **A full document editor** — rich formatting toolbar, many fonts (including the fonts installed on your PC), images you can resize and move, tables, checklists, links with hover previews, page colour and page setup saved per prompt, multiple document tabs inside one prompt, and a heading outline panel
- **Silent autosave** — no save button and no interruptions while you type; one quiet "Saved" note when you leave the editor
- **Search that understands** — fast keyword and fuzzy search built in; connect your own API key and you can also find prompts by *describing* them, even if you forgot the name
- **AI Chat and an in-editor AI assistant** — ask about your prompts, improve them, or find the right one by describing it, using your own key from Google Gemini, OpenAI, Anthropic, OpenRouter, or a local Ollama model
- **Rich templates** — a gallery of ready-made formats (headings, tables, checklists, image placeholders and more), each with a full preview, plus creating your own templates and "Save as Template" from any prompt
- **Share links** — send anyone a link and they see your prompt on a clean read-only web page, with a Copy button. No app install and no login needed on their side, just like a Google Docs "anyone with the link" share. Stop sharing any time and the link stops working
- **Notes** — a simple, spacious place for drafts and ideas that are not prompts yet
- **Insights** — total prompts, what you added and used this month, your daily streak, and a GitHub-style activity heatmap, all computed from your real usage
- **Google Drive backup and restore** — sign in with Google and keep a backup of your whole library in your own Drive's private app folder; restore it on any computer
- **Import / Export** — export everything as JSON or ZIP; import backups, TXT and Markdown files; download any single prompt as DOCX, TXT, Markdown, PDF or HTML
- **First-run guide** — a short introduction the first time you open the app, with Skip and Continue, replayable any time from Settings

---

## Installation

### ⬇️ Download

> ## Get Prompt Vault in under a minute
>
> **1.** Go to the [**latest release**](https://github.com/heyysam1/prompt-vault/releases/latest) page.
>
> **2.** Scroll to **Assets** at the bottom of that page.
>
> **3.** Download the **one file** that matches your computer from the table below.
>
> **4.** Open the downloaded file. That is all, no account needed to install.

| Your computer | ⬇️ Download this file | How to install |
| --- | --- | --- |
| **Windows 10 / 11** | `Prompt.Vault_1.0.3_x64-setup.exe` | Double-click it and follow the installer |
| **Windows (alternative)** | `Prompt.Vault_1.0.3_x64_en-US.msi` | Double-click it and follow the installer |
| **Mac with Apple Silicon** (M1, M2, M3, M4) | `Prompt.Vault_1.0.3_aarch64.dmg` | Open it, then drag **Prompt Vault** into **Applications** |
| **Mac with an Intel chip** | `Prompt.Vault_1.0.3_x64.dmg` | Open it, then drag **Prompt Vault** into **Applications** |
| **Linux, any distribution** | `Prompt.Vault_1.0.3_amd64.AppImage` | Right-click → Properties → allow executing as a program, then double-click |
| **Linux, Ubuntu / Debian / Mint** | `Prompt.Vault_1.0.3_amd64.deb` | Double-click to install with your software centre, or run `sudo dpkg -i <file>` |

**Not sure which Mac you have?** Click the Apple menu → *About This Mac*. If it says "Apple M1" (or M2, M3, M4), download the `aarch64` file. If it says "Intel", download the `x64` file.

**Not sure which Linux file?** Take the **AppImage**. It runs on almost every Linux system with no installation at all. Use the `.deb` only if your system is Ubuntu, Debian, Mint or similar.

### If your computer shows a security warning

Prompt Vault is a new, unsigned app, so your system may warn you the first time you open it. This is normal for independent apps. Here is what to do:

- **Windows (SmartScreen):** click **More info**, then **Run anyway**.
- **macOS ("unidentified developer"):** do not double-click the first time. Instead, **right-click (or Control-click) the app → Open → Open**. You only need to do this once. If macOS still blocks it, go to **System Settings → Privacy & Security** and click **Open Anyway**.
- **Linux:** for the AppImage, make sure "allow executing file as program" is switched on (see the table above).

## 📸 Screenshots

**All Prompts, your library at a glance**

![All Prompts, dark theme](docs/screenshots/all-prompts-dark.png)

![All Prompts, light theme](docs/screenshots/all-prompts-light.png)

**The document editor**

![Editor, dark theme](docs/screenshots/editor-dark.png)

![Editor, light theme](docs/screenshots/editor-light.png)

**Templates gallery**

![Templates](docs/screenshots/templates-dark.png)

**Insights: streaks, activity and most used prompts**

![Insights](docs/screenshots/insights-dark.png)

**First-launch guide**

![First-launch guide](docs/screenshots/guide-dark.png)

**Settings**

![Settings](docs/screenshots/settings-dark.png)

*The app opens at a comfortable 1280 × 800 window, in a cream light theme or a neutral dark theme.*

---

## Security Overview

Prompt Vault is designed to be local-first and privacy-conscious:

- **Local first.** Your prompts, notes and settings are stored on your own computer, in the app's data folder. The app works completely offline, and there is no Prompt Vault server collecting your data.
- **Your cloud, not ours.** Backup and sync go to **your own Google Drive**, in the app's private `appDataFolder` that other apps cannot see. There is no account with us.
- **Your API key stays yours.** AI features use the API key you provide. Keys are stored in a separate local file on your computer and are **never** included in backups, exports or shared links, and never synced to Google Drive.
- **Sign-in just works.** Prompt Vault ships with its own built-in Google OAuth client, so Google sign-in works out of the box with a single click. There is nothing for you to set up or enter, and no OAuth credentials of yours are ever collected.
- **Sharing is explicit.** A prompt is only reachable through a share link if you choose to share that prompt. Sharing publishes a snapshot of that one prompt; stop sharing at any time and the link stops working.
- **Signed updates.** In-app updates are delivered through Tauri's updater with signed release artifacts, so the app only installs updates that match the project's signing key. The installers themselves are not yet code-signed by an OS certificate, which is why Windows and macOS show the first-launch warnings described above.

## 🔒 Privacy

- Your library never leaves your computer unless you sign in and run a backup, or you share a single prompt yourself.
- Google sign-in is used only for Drive backup, restore and share publishing, through the Drive scopes the app requests.
- AI requests go directly from the app to the provider you chose, using your own API key. No prompt content is sent to any Prompt Vault server, because there is none.

## 📄 License

Prompt Vault is open-source software licensed under the [MIT License](LICENSE).

---

<p align="center">
  Made by <b>Mohammed Sami</b>
  <br />
  <a href="https://github.com/heyysam1">GitHub</a> · <a href="https://heyysami.bond">Personal Website</a>
</p>
