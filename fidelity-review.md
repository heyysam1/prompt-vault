# Prompt Vault — Design Fidelity Review (post-port)

Reviewer pass against `DESIGN-DIFF.md` (29 MAJOR / 33 minor / 10 cosmetic), checking the
integrated app code directly (`src/style.css`, `src/fidelity-main.css`,
`src/fidelity-editor.css`, `src/icons.js`, `index.html`, `src/main.js`, `src/editor.js`,
`src/onboarding.js`, `src/templates-data.js`, `src/store.js`) and the built `dist/` CSS for
cascade order. No app source was edited for this review. A claim is CLOSED only where the
code itself carries the prototype value.

## 1. Majors (29)

| # | § | Item | Verdict | Evidence |
|---|---|---|---|---|
| 1 | §1 | Inter never loaded | CLOSED | `src/style.css:10-25` two `@font-face` for Inter (400-800, latin + latin-ext, woff2); `index.html` Google Fonts link loads Inter + 23 other families; built CSS has 2 `@font-face` (see §3d). |
| 2 | §1 | Pill buttons everywhere | CLOSED | `src/style.css` `.btn,.chip-select`: `border-radius:8px; padding:8px 14px; font-size:13.5px; font-weight:500` — exact prototype `.btn`. Remaining pills are prototype pills (Share pill, view switch, Google button). |
| 3 | §1 | Surface shades differ | CLOSED | `src/style.css` `:root` light `--bg:#FAF6EF; --panel:#FFFFFF; --paper:#FFFEFB`; dark `--bg:#171717; --panel:#202020; --panel-2:#262626; --line:#2F2F2F`; sidebar uses `background:var(--panel)`. All exact prototype values. |
| 4 | §1 | Type scale too big/loose | CLOSED | `body{font-size:14px}`; `.page-head h1` 21px/600; `.nav-item` 13.5px; `.brand-name` 15px/600. All match the prototype. |
| 5 | §2 | Sidebar icons are emoji/glyphs | CLOSED | `index.html` sidebar: all 11 nav items inline 16px stroke SVGs; `src/icons.js` is the full prototype set (16px, stroke currentColor, width 2). Global scan (a): zero UI emoji/glyphs remain. |
| 6 | §2 | Sidebar sync footer missing | CLOSED | `index.html` `.sidebar-foot > #bottom-nav + button.sync-mini#sync-mini` (avatar/name/status); `src/style.css` `.sync-mini` 30px avatar, `.pulse` dot; `main.js updateSyncMini()` wires signed-out ("Not signed in" / "Sign in to sync to Drive") and signed-in states. |
| 7 | §3 | No "All Prompts" heading | CLOSED | `main.js renderLibrary()`: `<h1 class="fid-title">` from `LIB_HEADINGS` (All Prompts / Pinned / Recent); `.fid-title` 21px/600 in fidelity-main.css. |
| 8 | §3 | Plain-text card previews | CLOSED | `main.js previewInnerHTML()` returns real `promptHTML(p)` (with `highlightHTML` search marking); fidelity-main.css `.card-preview` 196px, `background:var(--paper)`, mask fade, `.prev-inner` 13.5px/1.72 with h1/h2/h3 at 19/16.5/15px. Built CSS: the fidelity rule sits after (overrides) the old 150px plain rule. |
| 9 | §3 | Card meta layout | CLOSED | `main.js cardHTML()`: `.card-meta` is a column — `h4.fid-card-title` full width (16.5px/700, 2-line clamp, inline pin SVG before the title when pinned), then `.fid-meta-row` with `.fid-opened` left and copy + dots buttons right (fidelity-main.css). |
| 10 | §3 | Filter/Sort/View are native dropdowns | CLOSED | `main.js renderLibrary()`: Filter button opens `.fid-filter-panel` (checkbox rows `.fid-fp-item/.fid-fp-check`, "Clear all", count badge `#lib-filter-badge`); Sort is the compact `.fid-sort-select`; view is the segmented 3-icon `.fid-view-switch`. Caveat: filter state is single-select (`state.filter` string) under checkbox styling. |
| 11 | §3 | List-view geometry | CLOSED | fidelity-main.css `.prompt-grid.list .prompt-card{flex-direction:row}`, `.card-preview{width:180px; flex:0 0 180px; border-right:1px solid var(--line-2)}`, meta on the right. (At ≤560px the preview strip is hidden — small-screen deviation only.) |
| 12 | §3 | Pill search box | CLOSED | `src/style.css .search-box`: radius 12px, padding 12px 16px, `box-shadow:var(--shadow)`, SVG magnifier via `ICONS.search`. Caveat: the shared icon renders at 16px vs the prototype search icon's 19px. |
| 13 | §5 | Editor header composition | CLOSED | `editor.js render()`: back-arrow icon button, logo, title input, pin SVG, cloud-check Saved status, spacer, history, dots menu, Share pill (globe + "Share"), AI sparkle last. fidelity-editor.css: `.ed-logo` 26px, `.ed-title` 17px/600, header on `var(--panel)` with hairline. No "← Back" text button. |
| 14 | §5 | AI button is a text glyph | CLOSED | `editor.js sparkleGradient()`: dedicated inline SVG, two-sparkle paths, gradient `#2E7CF6 → #5B5BD6 → #9333EA` at 27px; fidelity-editor.css `.ai-spark-btn` 42px round hit area, hover `scale(1.16)`, no pill/border/label. |
| 15 | §5 | Toolbar icons are glyphs/emoji | CLOSED | `editor.js buildToolbarHTML()` + `TB` set: undo/redo/link/image from `ICONS`, table/alignment/bullet/numbered/checklist/clear as 16px stroke SVGs; colour controls are an "A" label + highlight SVG (no `▨`); mode select has no glyph prefix. No toolbar emoji remain (scan a). |
| 16 | §5 | Paper always bright white | CLOSED | fidelity-editor.css `.ed-paper{background:var(--paper); color:var(--ink); max-width:1020px; padding:56px 68px; border-radius:6px}` — verified later in the built CSS than the base rule, so it wins (dist offsets ~47283 vs ~12602). `editor.js applyPageSetup()` sets `paper.style.background = explicit \|\| 'var(--paper)'`. Caveat: the dead hard-coded rule still exists in `src/style.css:330` (`background:#FFFFFF; color:#1F2430`) and is only overridden, not removed; explicit per-prompt page colours from Page setup are still honoured on top. |
| 17 | §7 | Note editor lost its Docs-style page | CLOSED | `editor.js openNoteEditor()`: full chrome into `#note-view` — back arrow, logo, title, save status, Delete, menu bar (File/Edit/View/Insert/Format/AI), same `buildToolbarHTML('nt')` pill toolbar, themed `.ed-paper.note-paper` (fidelity-editor.css `#note-view .note-paper{max-width:880px}`) with rich `contenteditable` `.nt-body`. No `<textarea>` body. |
| 18 | §8 | Template set is not the approved set | CLOSED | `src/templates-data.js`: exactly 22 entries; all 22 names match the §8 prototype column exactly (Hero Image Brief, Product Photo Shot, Social Post Visual, Cover Art, Character Design Sheet; Cinematic Product Clip, Talking Head Scene, B-Roll Sequence; Bug Report, Senior Code Review, Explain This Code, Write a Function; Blog Outline to Draft, Rewrite in My Voice, Five Line Summary; WhatsApp Outreach Opener, Facebook Launch Post, Client Proposal, Ad Copy, Three Angles; Explain Simply in Bangla, MCQ Quiz Drill, Make Flashcards). No "staging data" comment remains. |
| 19 | §8 | Group names / colours / headers differ | CLOSED | Groups are the prototype's full names (Image Prompts, Video / Flow, Coding, Writing, Business & Marketing, Study). `main.js GROUP_COLORS` and `store.js TEMPLATE_GROUP_COLORS` are identical: `#2563EB / #7C3AED / #EA580C / #D97706 / #E11D48 / #0284C7`. fidelity-main.css `.fid-tpl-group-head h3` 15.5px/700 with trailing "N templates" count span. No leftover groups. |
| 20 | §8 | Template card layout | CLOSED | `main.js renderTemplates()` uses `.fid-tpl-card` (padding 0, overflow hidden): `.fid-tpl-preview` edge-to-edge 132px on `var(--paper)` with mask fade, then `.fid-tpl-meta` (hairline top) with name 14.5px, group name `.fid-tpl-gname`, and a working "Use template" button on the card (`data-use-tpl`). |
| 21 | §8 | Stock slots: flat illustrations, no badge/caption | CLOSED | Slots in `templates-data.js` carry `data-stock-src="https://picsum.photos/seed/<seed>/880/495"`; `main.js tplDisplayHTML()` renders `<img class="stock-img">` + `<span class="stock-badge">Stock</span>` + `.stock-cap` (bold slot label + "Stock image · replaced by yours when you use the template"); CSS in `style.css` (`.img-ph.has-stock/.stock-badge/.stock-cap`). In the editor the same slots become live drop zones (`editor.js enhanceImageSlots()`). |
| 22 | §9 | Insights: streak row + Weekly chart missing | CLOSED | `main.js renderInsights()`: second `.fid-stats` row (Current streak, Longest streak, Active days last 6 months, Edits this month) and a `.fid-two-col` row with Weekly usage bar chart (`.fid-bars`, last 8 weeks) beside Most used. |
| 23 | §9 | Stat cards inverted | CLOSED | fidelity-main.css `.fid-stat`: `.lbl` 12px on top, `.num` 24px/600 below, `.sub` 12px with accent `<b>` delta ("+% vs last month" computed in `renderInsights`). No fact is crammed into a label. |
| 24 | §11 | Trash is a bare list | CLOSED | `main.js renderTrash()` renders trashed prompts with the same `cardHTML(p,{trash:true})` library cards in `.prompt-grid` (formatted preview, title, date) with Restore / Delete forever in `.trash-actions`. Caveat (minor §11): trashed notes still appear, now as a separate "Notes" section of `.fid-note-trash-card`s, not mixed rows. |
| 25 | §12 | Account page structure / no Cloud Sync panel | PARTIAL | Restored: account panel (52px `.fid-avatar`, signed-out heading + text, signed-in name/email/"Free plan"/"Signed in with Google" pill/Sign out), then Cloud Sync panel (status pill top-right, Automatic sync `.switch` row, Sync now row, Restore row), then AI API Connection, then Danger zone. Gaps: (1) Backup history is a text-only row ("Last backup: …") — no "View all" button as in the prototype; (2) Danger zone's "Delete cloud data" button is hard-`disabled` with "Not available in this build yet" and has no click handler anywhere in `main.js`; (3) an extra app-only Share viewer panel still follows Danger zone, so the page does not end where the prototype's does. |
| 26 | §12 | Google button lost the Google logo | CLOSED | `main.js GOOGLE_G_SVG`: official four-colour "G" SVG paths (#FFC107/#FF3D00/#4CAF50/#1976D2); fidelity-main.css `.google-btn` white pill `#fff`, border `#DADCE0`. The old `<span class="g">G</span>` markup is gone (a dead `.google-btn .g` rule remains in base style.css, unused). |
| 27 | §13 | Preferences panel + switches missing | PARTIAL | Present: Settings Preferences panel with `.switch` component (fidelity-main.css 40×23, knob, `.on` accent) for AI semantic search (default on), Fill variables before copying (default on), Start with Windows (default off), plus the Welcome guide row — all bound via `bindSwitch()` and persisted. Gap: only the semantic-search switch has a consumer (`main.js` library search checks `settings.semanticSearch !== false`). `fillVariables` and `startWithWindows` are written by `bindSwitch` and read nowhere else in `src/` or `src-tauri/` — the copy flow (`copyPromptText`) never checks fill-variables, and there is no autostart call. Two of the three switches are persistence-only. |
| 28 | §13 | Settings section set and order differ | PARTIAL | The four prototype panels now appear in the prototype order: Preferences → Appearance → System (App version + Check for updates, Local database + Open data folder, Keyboard shortcuts Ctrl K / Ctrl N / Ctrl S) → About the Developer (GitHub + Web only). Gap: an extra app-only Danger zone panel ("Erase local library") is still inserted between System and About the Developer, so the set still differs by one panel and About is not directly after System. Secondary: the Open data folder handler falls back to `openUrl(path)`/clipboard copy (code comment in `renderSettings` admits no folder-opening mechanism exists). |
| 29 | §14 | Guide card redesigned | CLOSED | `onboarding.js` + `style.css .ob-*`: solid `#000` full-window backdrop, centred card max-width 480px, centre-aligned, 64px radius-18 accent-soft icon tile (logo image, then 30px SVG plus/search/drive), title 19px, body 14px with `min-height:72px`, 8px round dots (active scales 1.2), footer Skip left / primary right `min-width:104px`, final label "Get Started". No art banner, no "Step N of 4" eyebrow, no feature rows, no card ✕. |

## 2. Minors / cosmetics spot-checks (26 checked)

| § | Item | Verdict | Evidence |
|---|---|---|---|
| §1 minor | Follow-system theme | PARTIAL | Settings select offers Follow system / Light / Dark (`renderSettings`), `main.js resolvedTheme()` resolves `system` via `matchMedia('(prefers-color-scheme: dark)')` with a change listener. But the seed default is still `theme:'light'` (`store.js seedVault`) and `index.html` ships `data-theme="light"` — a fresh install does not default to the OS as the prototype does. |
| §1 minor | Grey palette temperature | CLOSED | Tokens are the prototype's warm set: ink `#2B2520`, ink-2 `#6F6459`, ink-3 `#A29688`, line `#E7DDCE` (style.css `:root`). |
| §1 minor | Dark accent / accent-soft | CLOSED | Dark accent `#7AA0FF`, accent-soft `#1E2A4A`; light accent-soft `#DBEAFE`; accent `#1A56DB` — all exact. |
| §1 cosmetic | Radius / shadow / highlight | CLOSED | `--radius:12px`; `--shadow: 0 1px 2px rgba(60,40,20,.05), 0 8px 24px rgba(60,40,20,.05)`; `--highlight:#FDE047`. |
| §2 minor | Nav item styling | CLOSED | `.nav-item`: padding 7px 9px, radius 8px, list gap 1px, rest colour `var(--ink-2)`, active `var(--accent-ink)` on accent-soft. |
| §2 minor | Bottom-nav separators | CLOSED | `.sidebar-foot{border-top:1px solid var(--line-2)}`, `#bottom-nav{border-bottom:1px solid var(--line-2)}`. |
| §2 cosmetic | Brand mark | CLOSED | `.brand-name` 15px/600; `.brand-logo` 34px with no rounding on the image. |
| §3 minor | Prompt count | CLOSED | `.fid-lib-count` in the toolbar, updated in `drawGrid()` ("N prompt(s)"). |
| §3 minor | Date wording | CLOSED | Library uses `main.js fmtOpened()`: "Opened today, 11:20 AM" / "Opened yesterday, …" / "Opened Oct 24" (year only when different). (The older `fmtDate` format survives in non-library spots, e.g. Trash note dates.) |
| §3 minor | Grid metrics | PARTIAL | Gap now 14px (fidelity-main `.prompt-grid`), content max-width 1460px (`#view-root .page`), compact is `auto-fill, minmax(215px,1fr)`, hover only darkens the border. But `#view-root` padding is still `28px 34px 90px` in base style.css vs the prototype's 22px side padding. |
| §3 minor | "Copy prompt" menu wording | CLOSED | `promptMenu()` item is "Copy prompt". |
| §3 minor | FAB / New Prompt create menu | CLOSED | `createMenuHTML()`: 340px `.fid-create-menu` titled "Create new", bold label + description per option ("Blank Prompt — Start with an empty editor", From Template, Import File, New Note; Notes page gets only New Note), shared by the FAB and anchored under the top New Prompt button (`openCreateMenu`). No emoji rows. |
| §4 minor | Pinned/Recent = same library view | CLOSED | `navigate()` maps all/pinned/recent to `renderLibrary()` with heading switch; Recent keeps the full search + Filter/Sort/View toolbar and has no 30-item cap (old `renderRecent` is a pass-through). |
| §5 minor | "Saved" affordance | CLOSED | Header `.save-status` shows cloud-check SVG + "Saved"; `editor.js setSaveSaving()` adds the accent `.saving` state while saving. No repeated "Saving…" text. |
| §5 minor | Editor left panel | CLOSED | fidelity-editor.css: panel background `var(--panel)`; `.side-search-box` with search icon, placeholder "Search prompts", and `applySideFilter()` filters tabs, outline and prompts; heads 11.5px uppercase (Tabs / Outline / Prompts); tabs are bordered rows with a dots menu (`openTabMenu`) and inline rename (`startTabRename`, no `prompt()`); "Hide panel" button + "Show panel" affordance exist. |
| §5 minor | Font menu "Sync PC fonts" ban | CLOSED | String absent everywhere (scan c); the font `<select>` is built only from `FONT_LIST`. Residual notes: `editor.js fontOptions()` still merges `window.__pvSystemFonts` if ever set (nothing sets it), and `FONT_LIST` in `store.js` still contains 'Courier New'. |
| §5 minor | Native dialogs for link / rename / Save-as-Template / Create template | CLOSED | All four are in-app now: `showLinkModal()`, inline tab rename, `saveAsTemplate()` modal, `openCreateTemplateModal()`. `window.prompt(` count is 0 (scan b). Native `confirm()`/`alert()` still remain in unrelated flows (tab delete, trash, import). |
| §5 cosmetic | Zoom steps / page-setup grid | CLOSED | Toolbar zoom is `[50,75,100,125,150]` (the added 90%/110% are gone); page setup uses `.ps-colors{grid-template-columns:repeat(8,1fr)}` in a 640px `.ps-modal-card`. |
| §6 minor | AI Chat gate + composer | CLOSED | Gate is a left-aligned `.fid-panel.fid-chat-gate` ("Connect your AI API key" + paragraph + Connect API button); composer is `.fid-chat-form` — single-line input + Send in a row with a top border. The app-only provider/model badge pill in the page head is gone. |
| §6 cosmetic | Chat bubbles | CLOSED | fidelity-main.css: chat `.ai-msg` radius 12px with a 4px squared corner (user bottom-right, bot bottom-left), bot bubble on panel + hairline. |
| §7 minor | Notes grid metrics | CLOSED | fidelity-main.css `.notes-grid{auto-fill, minmax(260px,1fr); gap:12px}`, `.note-card` padding 15px, title 14px, body unclamped (`-webkit-line-clamp:unset`), hover lifts (shadow + translateY). |
| §8 minor | Template body styling language | CLOSED | Templates use `.ph` spans, `.hl-line`, `.code-block`, `ul.chk` with ☐ (style.css carries the prototype values, incl. dark `.hl-line #3A2E10`); scan of `templates-data.js` found no `<mark>`, no `<input type="checkbox">`, no `#9aa0a6`, no `#f3efe7`. |
| §8 minor | Create template / preview page | CLOSED | Create is an in-app modal (name, group select, new-group field, body). Preview header: back arrow + 26px logo + 17px/700 title + "Group · Template preview" sub-line + Use button; body `.fid-tpl-full` 15.5px/1.8. |
| §8 cosmetic | Leftover GROUP_COLORS groups | CLOSED | No "Marketing" or "Image & Video" keys remain in either colour map (scan f). |
| §9 minor | Heatmap dressing + filter | CLOSED | fidelity-main.css `.fid-hm-grid` 11px cells; month labels rendered above (`#hm-months`); "Less → More" legend below; range/type selects sit in the Activity panel head, default range is "This year" (`state._insRange='year'`), and `filteredAct` feeds both the heatmap counts and the recent list. |
| §9 minor | Recent rows / Most used | CLOSED | Recent rows are `.fid-feed-row` with a 28px accent-soft icon chip and right-aligned `<time>`; Most used rows are `.fid-rank-row` with numbered circles and "×N uses". The old `act-badge` pill rows are gone from this page. |
| §9 cosmetic | Heatmap step colours | CLOSED | `--hm-1..4: #BFDBFE / #93C5FD / #3B82F6 / #1A56DB` on base `--hm-0:#E8EDF5` (light) — exact prototype steps. |
| §10 minor | Import/Export layout | CLOSED | Two panels side by side (`.fid-two-col`), Import left / Export right, each a list of `.fid-row`s (bold title + description left, action button right): "Prompt files (.txt / .md)", "Library backup (.json)", "Full backup (.json)", "Prompts as .zip of .md files". |
| §11 minor | Notes mixed into Trash | OPEN | Still present, restyled: trashed notes render in Trash as a separate Notes section (see major #24 caveat). The prototype's Trash is prompts only. |
| §12 minor | AI API layout + Test connection | CLOSED | Provider and Model sit side by side in `.fid-api-grid`, Fetch models beside the model select, custom-model field, then API key field, then Save key / Test connection buttons and a `.fid-status-pill` (`#acc-test-key` handler calls `fetchModels`). |
| §12 minor | App-only Share viewer card + OAuth setup block | OPEN | The Share viewer card is still on Account & Sync (now after Danger zone). The OAuth Client ID/Secret setup `<details>` also still exists, but only renders when `google.hasBuiltInClient()` is false — a built-in client is present in `oauth-config.js`, so it is hidden in this build. |
| §13 minor | App-only Danger zone in Settings | OPEN | Still present ("Erase local library") — this is the gap behind major #28 PARTIAL. |
| §13 cosmetic | About the Developer styling | CLOSED | Last panel on Settings, standard `.fid-panel` with panel head and two `.btn` links (GitHub, Web); no username/domain text is rendered (URLs live only in the click handlers). |
| §14 cosmetic | Guide close behaviour | CLOSED | Skip/final button, backdrop click and Esc all close and mark seen — no visual difference from the prototype. |

## 3. Global scans

- **(a) Emoji/glyphs as UI icons** (`src/*.js` + `index.html`): **0 pictographic/emoji UI icons.**
  A strict scan (U+1F000–1FAFF, U+2600–27BF) over all `src/*.js` and `index.html` returned hits
  only in `templates-data.js`: 31 × `☐`, of which 1 is in the file's header comment and 30 are
  document content inside template bodies (allowed). `src/style.css` adds 2 more `☐`, both as
  checklist `::before` document styling. A direct grep for the old UI glyph set
  (📌 🕘 ✦ 🗒 📊 🗑 👤 ⚙ ▦ ▤ ⇅ ⌕ 📍 🔗 🖼 ⬅ ⬌ ➡ ☑ ⌫ 👁 ✎ ▨) across `src/` + `index.html`
  returned **none**. Broader non-ASCII hits in JS are typographic only (`…`, `—` in strings/comments).
- **(b) `window.prompt(`** in `main.js`/`editor.js`: **0 calls.** The only match in `src/` is a
  comment in `main.js` ("replaces the old window.prompt() flow"). (`prompt(` substring hits
  elsewhere are `sharePrompt`/`openLinkPrompt` identifiers and one `alert(`.)
- **(c) "Sync PC fonts"**: **0 occurrences** in `src/`, `index.html` and `dist/`.
- **(d) `@font-face` for Inter in built CSS**: `dist/assets/index-D73k2DlN.css` contains **2**
  `@font-face` rules, both `font-family:Inter` (weight 400 800, latin and latin-ext woff2);
  `dist/fonts/inter-latin.woff2` (48K) and `inter-latin-ext.woff2` (84K) are present, matching
  `public/fonts/`. Source: `src/style.css:10-25`.
- **(e) Hard-coded paper `#FFFFFF` defaults**: the base rule `src/style.css:330`
  `.ed-paper{background:#FFFFFF; color:#1F2430; …}` still exists but is overridden by
  `fidelity-editor.css` `.ed-paper{background:var(--paper); color:var(--ink)}` (later in the
  built CSS, verified) and by `editor.js applyPageSetup()`, which sets
  `var(--paper)` unless the prompt has an explicit page colour. Also present but dead:
  `.tpl-mini` white-background rules in `style.css` (no JS uses `tpl-mini`; the gallery uses
  `.fid-tpl-*`). `#FFFFFF` in `editor.js PS_COLORS` is the user-selectable page-colour palette,
  not a default.
- **(f) Template group colours**: `main.js GROUP_COLORS` (6 keys) and
  `store.js TEMPLATE_GROUP_COLORS` (6 keys) are identical and equal to the prototype:
  Image Prompts `#2563EB`, Video / Flow `#7C3AED`, Coding `#EA580C`, Writing `#D97706`,
  Business & Marketing `#E11D48`, Study `#0284C7`. The group labels used in
  `templates-data.js` are exactly those 6 keys (5/3/4/3/4/3 templates).
- **(g) Template count**: **22** in `templates-data.js` — name-by-name identical to the
  DESIGN-DIFF §8 prototype column (full list under major #18). Distribution:
  Image Prompts 5, Video / Flow 3, Coding 4, Writing 3, Business & Marketing 4, Study 3.

## 4. Function preservation (code-level)

| Flow | Status | Evidence |
|---|---|---|
| Prompt three-dot menu + Download submenu | Intact | `main.js promptMenu()`: Open, Copy prompt, Share, Pin/Unpin, Download with hover submenu (docx/txt/Markdown/pdf/html → `downloadPrompt`), Delete. Editor dots button delegates via `window.__pvPromptMenu`. |
| Share flow (Drive publish/unpublish) | Intact | `main.js sharePrompt()` calls `google.publishSharedPrompt` (create + Update snapshot) and `google.unpublishSharedPrompt` (Stop sharing), persisting `sharedFileId/sharedUrl`; trash delete-forever also unpublishes first. |
| Import / Export handlers | Intact | `renderImportExport()` wires `#exp-json` (`store.exportPayload`), `#exp-zip` (`makeZip`), `#imp-json` (`store.importPayload` with confirm), `#imp-files` → `importFileFlow()`; the FAB create menu's Import also routes to `importFileFlow()`. |
| Drive backup / restore | Intact | Account: `#acc-backup` → `google.backupToDrive()`, `#acc-restore` → `google.restoreFromDrive()` (with confirm), auto-sync toggle triggers a backup when switched on while signed in, and sign-in triggers one when auto-sync is on. |
| API key save + fetch models | Intact | `#acc-save-key` writes `store.keys[provider]` and `store.saveKeys()`; `#acc-fetch-models` calls `fetchModels(p)` and stores `fetchedModels`; Test connection (`#acc-test-key`) also calls `fetchModels`. |
| Updater wiring in Settings | Intact | Boot calls `scheduleUpdateCheck()`; Settings "Check for updates" → `checkForUpdates({manual:true})`; version line filled from `currentVersion()` (`src/updater.js`). |
| Onboarding show-once | Intact | Boot calls `showOnboarding(false)`; it returns early when `settings.onboardingSeen` is set, and Skip/finish/backdrop/Esc all go through `finish()` → `markSeen()` which sets `settings.onboardingSeen = true` and `saveNow()`. Settings "View guide again" calls `showOnboarding(true)`. |
| Zero demo seed | Intact | `store.js seedVault()`: `prompts: []`, `notes: []`, `activity: []`; the only seeded content is `templates: seedTemplates()` (the 22 built-ins). Template upgrades replace built-ins by `TEMPLATES_VERSION` while keeping `custom` templates. |
| Note-editor integration | Intact | `main.js` imports `openNoteEditor` from `editor.js`; its `openNote(id)` does nothing but delegate: `openNoteEditor(id)`. Notes grid preview renders `esc(plainText(n.body || ''))`, so the note editor's new HTML bodies preview as plain text. |

## 5. Result

MAJORS CLOSED: 26/29

PARTIAL (3, counted as not closed):
- #25 §12 Account & Sync structure — Backup history has no "View all" button; "Delete cloud data" is a disabled, handler-less stub ("Not available in this build yet"); an app-only Share viewer panel still follows Danger zone.
- #27 §13 Preferences switches — panel and switches exist with correct defaults, but Fill variables and Start with Windows have no consumer in the code (persistence-only); only AI semantic search is actually gated by its switch.
- #28 §13 Settings section set/order — the four prototype panels are in order, but an extra Danger zone panel still sits between System and About the Developer (and Open data folder falls back to opening/copying the path rather than opening a folder).

OPEN majors: none. BLOCKED majors: none.
