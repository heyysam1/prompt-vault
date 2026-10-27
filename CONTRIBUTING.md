# Contributing to Prompt Vault

Thank you for your interest in contributing to **Prompt Vault**! This project aims to provide a calm, lightweight desktop home for your AI prompts: local-first, private by design, and simple to use.

---

## Code of Conduct

We are committed to providing a friendly, welcoming, and inclusive environment for all contributors. Please be respectful, professional, and constructive in all interactions.

---

## Welcome Contributions

The project welcomes community contributions, including:

- **Bug Fixes**: Resolving defects, crashes, or unexpected behaviour on Windows, macOS, or Linux.
- **Security Fixes**: Addressing security disclosures and defensive hygiene.
- **Documentation Improvements**: Clarifying the README, guides, and in-app wording.
- **Templates**: New built-in prompt templates with genuinely useful structure, or fixes to existing ones.
- **Tests & Quality Assurance**: Adding regression tests and reporting platform-specific issues.
- **Small Feature Improvements**: Thoughtful additions that keep the app minimal and focused.
- **Performance Optimizations**: Minimizing memory footprint and startup overhead.

---

## How to Contribute

### 1. Reporting Bugs

Before creating a bug report, please check the [existing issues](https://github.com/heyysam1/prompt-vault/issues) to avoid duplicates.

When filing a bug report, include:

- A clear, descriptive title.
- Steps to reproduce the behaviour.
- Expected vs. actual results.
- Your operating system (Windows, macOS, or Linux) and the Prompt Vault version (shown in **Settings**).
- Any relevant screenshots or error messages.

### 2. Suggesting Enhancements

We welcome ideas for new features and workflow improvements.

- Open an issue describing the proposed feature.
- Explain the motivation and concrete use cases.
- For larger ideas, discuss the approach in the issue before submitting a large pull request, so the change stays aligned with the app's minimal design.

### 3. Submitting Pull Requests

Please follow these steps:

1. **Fork** the repository and create a branch for your change.
2. Set up the project: you need [Node.js](https://nodejs.org/) 18 or newer, [Rust](https://rustup.rs/) (stable), and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your operating system.
3. Install dependencies with `npm install`, then run the app with `npm run tauri dev` while you work.
4. Keep each pull request focused on one change, and match the existing code style.
5. Make sure `npm run build` passes before submitting.
6. Open the pull request with a clear description of what changed and why, and link any related issue.

---

## A Note on Design

Prompt Vault is deliberately minimal: a clean, document-style interface with generous spacing and no clutter. Contributions that add UI are expected to respect that simplicity, one consistent sans-serif font throughout, and the cream light theme with a neutral dark theme.

Thank you for helping make Prompt Vault better.
