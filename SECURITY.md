# Security Policy

## Supported Versions

Security updates and patches are actively provided for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Security Architecture

Prompt Vault is engineered with a local-first, privacy-conscious design:

1. **Local-First Storage**: Your prompts, notes, and settings live in the app's data folder on your own computer. The app works fully offline, and there is no Prompt Vault server collecting your data.
2. **Your Cloud, Not Ours**: Backup and sync go only to **your own Google Drive**, in the app's private `appDataFolder` that other apps cannot see. Sign-in uses OAuth 2.0 with PKCE and a loopback redirect on your own machine.
3. **API Keys Stay Local**: AI features use the API key you provide. Keys are stored in a separate local file and are **never** included in backups, exports, or shared links, and never synced to Google Drive. The Google OAuth client secret you enter is likewise kept on your device only and excluded from backup and export files.
4. **Explicit, Revocable Sharing**: A prompt is reachable through a share link only if you choose to share that prompt. Sharing publishes a snapshot of that one prompt; stop sharing at any time and the link stops working.
5. **Signed Updates**: In-app updates are delivered through Tauri's updater with signed release artifacts, so the app only installs updates that match the project's signing key.
6. **No Telemetry**: Prompt Vault does not send your prompts, notes, or usage data anywhere. AI requests go directly from the app to the provider you chose, using your own API key.

---

## Reporting a Vulnerability

We take the security of Prompt Vault seriously. If you discover or suspect a security vulnerability, please do **NOT** disclose it in a public GitHub issue.

### Preferred Disclosure Method

Please report vulnerabilities using **GitHub Private Vulnerability Reporting**:

1. Navigate to the repository's **Security** tab at [https://github.com/heyysam1/prompt-vault/security](https://github.com/heyysam1/prompt-vault/security).
2. Click **Report a vulnerability** to open a private advisory draft.

Please include:

- A description of the vulnerability and its possible impact.
- Steps to reproduce it, or a proof of concept.
- The Prompt Vault version and your operating system.

We will review the report, work on a fix, and credit the reporter in the advisory once a patched release is available, unless you prefer to stay anonymous.
