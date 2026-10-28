# Prompt Vault: Prototype vs Real App — Design Fidelity Diff

**Purpose:** Section-by-section audit of how far the shipped desktop app (`~/workspace/prompt-vault-app/src/`)
has drifted from the approved prototype (`~/workspace/ts-spaces/prompt-library-dashboard/index.html`, v3 state =
approved v2 design + v3 fix list). No code was changed for this audit; this document is the fix list.

**Method:** Full read of both codebases (prototype CSS/HTML/template data; app `style.css`, `index.html`,
`main.js`, `editor.js`, `onboarding.js`, `templates-data.js`, `store.js`, `tauri.conf.json`), cross-checked
against frames from Sami's 2026-10-27 screen recording comparing the two side by side.

**Severity key:** **MAJOR** = the screen looks different at a glance / an approved element is missing or
replaced. **minor** = noticeable when compared directly. **cosmetic** = small value differences.

**Headline finding:** The app is not a port of the prototype's design. It is a second, independently
invented design that shares only the colour family (cream + indigo) and the page list. Icons, cards,
controls, the editor chrome, the template set, the Account and Settings pages, and the guide were all
re-designed from scratch instead of copied. 29 major differences are listed below.

---

## 1. Overall theme, colours, typography

- **MAJOR — The Inter font is never loaded in the app.** Prototype loads Inter (plus 23 other fonts) from
  Google Fonts, so every screen renders in real Inter. The app declares `font-family: "Inter", …` in
  `style.css` but ships no `@font-face`, no webfont link, and no bundled font file anywhere (checked
  `index.html`, `style.css`, and the built `dist` CSS: 0 `@font-face`). On any PC without Inter installed
  (most Windows PCs) the whole app silently falls back to Segoe UI / system-ui. Every screen therefore has
  different type than the approved design.
- **MAJOR — Button shape language is different everywhere.** Prototype buttons are rounded rectangles,
  `border-radius: 8px`, padding `8px 14px`, font 13.5px/500. App buttons (`.btn`, `.chip-select`) are full
  pills, `border-radius: 999px`, padding `8px 14px`, font 13.5px. Every button, dropdown and chip in the app
  is a capsule; in the prototype none are. Confirmed in the recording (pill search, pill "Comfortable"
  dropdown, pill buttons on the dark All Prompts page).
- **MAJOR — Surface shades differ in both themes.** Light mode: prototype sidebar is the white panel
  colour `#FFFFFF` against the cream `#FAF6EF` background. App sidebar is a third cream tint `--bg-soft:
  #F3EEE3`, so the rail blends into the page instead of reading as a white panel. Dark mode: prototype
  background `#171717`, panels `#202020` / `#262626`. App background `#1C1C1E`, sidebar `#242426`, surfaces
  `#2A2A2C` / `#323234` — every app surface sits one step lighter, and dark borders are `#3D3D40` vs the
  prototype's `#2F2F2F`, so app panels are outlined much more visibly.
- **MAJOR — Type scale is bigger and looser in the app.** Prototype sets a 14px base font-size on `body`.
  The app sets no base size (browser default 16px) and then uses larger components almost everywhere:
  page titles 26px/700 vs prototype 21px/600; sidebar items 14.5px vs 13.5px; brand name 18px/700 vs
  15px/600. The app reads noticeably "zoomed" next to the prototype.
- minor — Grey palette temperature differs. Prototype text/borders are warm: ink `#2B2520`, secondary
  `#6F6459`, faint `#A29688`, line `#E7DDCE`. App uses cool slate greys: `#1F2430`, `#5C6370`, `#9AA0AB`,
  border `#E7E0D0`. The prototype's warm paper feel is lost.
- minor — Dark accent differs: prototype `#7AA0FF` with accent-soft `#1E2A4A`; app `#5B8CFF` with
  accent-soft `#2C3A5E`. Active sidebar items and pills in the app are a deeper, more saturated blue block
  (clearly visible in the recording's Recent/AI Chat states). Light accent-soft also differs: `#DBEAFE`
  (prototype) vs `#E3EBFD` (app). Accent itself matches: `#1A56DB` in both.
- minor — No "Follow system" theme. Prototype defaults to the OS setting (`prefers-color-scheme` +
  `color-scheme: light dark`) and its Settings offer Follow system / Light / Dark. The app hard-defaults to
  light (`settings.theme: 'light'`) and offers only Light / Dark.
- cosmetic — Card/panel radius: 14px (app `--radius`) vs 12px (prototype). Shadows: prototype uses a soft
  warm shadow `0 1px 2px rgba(60,40,20,.05), 0 8px 24px rgba(60,40,20,.05)` at rest; app uses a cooler,
  heavier `0 8px 30px rgba(31,36,48,.12)` and mostly shows it only on hover. Search highlight: `#FDE047`
  (prototype) vs `#FFE98A` light / `#8A7420` dark (app).

## 2. Sidebar

- **MAJOR — All sidebar icons are emoji / text glyphs in the app; the prototype uses one consistent set of
  16px monochrome line SVG icons.** App (`index.html`): All Prompts `▦`, Pinned `📌`, Recent `🕘`,
  AI Chat `✦`, Notes `🗒`, Templates `▤`, Insights `📊`, Import/Export `⇅`, Trash `🗑`, Account `👤`,
  Settings `⚙`. These render as full-colour OS emoji at inconsistent sizes and weights (in the recording:
  red pin, colour bar-chart, purple person). The prototype draws every icon as a 2px-stroke SVG in the
  current text colour. This single difference changes the character of every screen.
- **MAJOR — The sidebar footer's sync block is missing.** Prototype pins, under Account & Sync / Settings,
  a `sync-mini` block: 30px avatar circle, account name (or "Not signed in"), and a status line with a
  pulse dot ("Sign in to sync to Drive"). The app's sidebar bottom is just the two nav buttons over empty
  space; there is no account/sync presence in the sidebar at all.
- minor — Nav item styling: prototype padding `7px 9px`, radius 8px, gap 1px, text colour `--ink-2` (grey)
  at rest, active text `--accent-ink #1E40AF`. App: padding `9px 10px`, radius 10px, gap 2px, text in full
  `--text`, active text `--accent #1A56DB`. App items look heavier and the active blue is brighter.
- minor — Separator: prototype's bottom nav sits above a `border-top` on the footer and a `border-bottom`
  under the bottom nav. The app has no separators around the bottom nav.
- cosmetic — Brand mark: both show the logo image at 34px, but the app rounds the image itself
  (`border-radius: 9px`) and sets the name at 18px/700; the prototype's name is 15px/600.

## 3. All Prompts (library)

- **MAJOR — No page heading.** Prototype shows a 21px/600 "All Prompts" heading above the search row. The
  app's library view (`renderLibrary` in `main.js`) renders no heading at all; the search box is the first
  element on the page. (The app's own Recent page does have a heading, so the app is also internally
  inconsistent.) Confirmed in the recording.
- **MAJOR — Card preview shows stripped plain text instead of the formatted prompt.** Prototype preview is
  a miniature of the real document: it renders the prompt's HTML (headings at 19/16.5/15px, bold, lists,
  tables, blockquotes, images) at 13.5px/1.72 inside a 196px-tall "book page" area (`--paper` background)
  with a mask fade at the bottom. App preview takes `promptText(p).slice(0, 600)` — plain text only, all
  formatting removed — at 13.5px/1.6 in a 150px box on the plain card surface with a gradient fade. A
  rich prompt and a flat prompt look identical in the app's grid.
- **MAJOR — Card meta layout is different.** Prototype meta is a column: the title gets the full card width
  (16.5px/700, up to 2 lines, small blue pin glyph before it when pinned), then a second row with
  "Opened …" on the left and the copy + ⋮ buttons on the right. App puts title, pin button, copy button and
  ⋮ button all on one flex row (long titles are squeezed by three buttons), with the date alone on the row
  below. App title is a single-line flex child; prototype titles wrap to two lines.
- **MAJOR — Filter / Sort / Grid-view controls are native dropdowns.** Prototype: a "Filter" button that
  opens a checkbox panel (with Clear all and a count badge), a compact Sort select, and a segmented
  3-icon pill switch for Comfortable / Compact / List. App: three `<select>` pills labelled "Filter: All",
  "Sort: Last opened", and "Comfortable" — the control names and current values are baked into the visible
  labels, and the view switcher is a text dropdown instead of the icon switch.
- **MAJOR — List view geometry is different.** Prototype list view makes each card a horizontal row: a
  180px-wide preview strip on the left, meta on the right. App list view keeps the normal stacked card and
  just shrinks the preview to a 64px strip on top, one card per row.
- **MAJOR — Search box shape.** Prototype: rectangular box, radius 12px, resting shadow, 19px SVG magnifier,
  padding `12px 16px`. App: full pill (radius 999px), no shadow, "⌕" text glyph as the icon, padding
  `10px 18px`.
- minor — No prompt count. Prototype toolbar shows "12 prompts" on the left. The app shows no count
  anywhere in the library.
- minor — Empty state: prototype is a dashed-border panel with a bold title ("Nothing here yet") and a
  sub-line. App is a plain centred 40px emoji/glyph ("▦", "🕘") over one line of text, no panel.
- minor — Date wording: prototype "Opened today, 11:20 AM" / "Opened Oct 24". App `fmtDate` gives
  "Today · 11:20 AM" / "24 Oct 2026 · 9:02 AM" — no "Opened" prefix, always includes year and time.
- minor — Grid metrics: comfortable grid gap 18px (app) vs 14px (prototype); content width max 1180px with
  34px side padding (app) vs max 1460px with 22px padding (prototype). Compact view: app forces 5 fixed
  columns; prototype uses `auto-fill, minmax(215px, 1fr)`. Card hover: app lifts with a shadow; prototype
  only darkens the border.
- minor — Three-dot menu wording: app menu item is "Copy"; prototype (and the locked spec) is "Copy prompt".
- minor — FAB menu: prototype's create menu is a 340px card titled "Create new" whose options carry a bold
  label plus a description line ("Blank Prompt — Start with an empty editor"), and the same menu also opens
  anchored under the top "New Prompt" button. App's FAB menu is a 200px list of emoji + label rows with no
  descriptions, and the top New Prompt button creates a prompt directly with no menu.

## 4. Pinned / Recent

- minor — Prototype treats Pinned and Recent as the same library view with the heading switched and the
  full search + toolbar kept. App Pinned reuses the library (but, like All Prompts, has no heading); App
  Recent is a separate bare grid with a heading but no search row and no Filter/Sort/View toolbar, capped
  at 30 items.
- cosmetic — Recent/Pinned empty states: app shows a large emoji (🕘 at 40px, in a circle in the recording);
  prototype uses the shared dashed empty panel.

## 5. Editor

- **MAJOR — Header row composition is different.** Prototype row 1, left to right: back-arrow icon button,
  26px logo mark, title input (17px/600), pin icon button, cloud-check "Saved" status, then right cluster:
  history icon, ⋮ icon, Share pill (globe icon + "Share"), AI sparkle. App row 1: 38px logo image, title
  input (21px/600), pin shown as `📍`/`📌` emoji, a `🕘` glyph doing duty as the history indicator, Share
  pill with no icon, AI sparkle, and the ⋮ menu moved to the far right after the AI button. There is no
  back arrow anywhere in the app header — Back is a "← Back" text button at the right end of the menu row.
- **MAJOR — The AI button is a text glyph, not the drawn sparkle.** Prototype: a bare 27px two-sparkle SVG
  with a blue→indigo→violet gradient (`#2E7CF6 → #5B5BD6 → #9333EA`), no pill/border/label, scaling to
  1.16 on hover inside a 42px round hit area. App: the character `✦` at 34px with a CSS gradient clipped
  to the text (`#1A56DB → #7C3AED → #DB2777`). What renders depends on the OS emoji/text font — in practice
  a plain four-point star, not the prototype's two-sparkle mark.
- **MAJOR — Toolbar icons are glyphs/emoji instead of SVGs.** Prototype draws undo, redo, link, image,
  alignment, bullet/numbered/checklist and clear-formatting as 16px stroke SVGs. App uses text symbols:
  `↶ ↷`, colour swatch labelled `▨`, link `🔗`, image `🖼`, table `▦`, alignment arrows `⬅ ⬌ ➡`, lists
  `•≡` / `1≡`, checklist `☑`, clear `⌫`, mode select prefixed `✎`/`👁`. Emoji rendering varies by machine,
  so the toolbar looks different on every PC.
- **MAJOR — The paper is always bright white in the app.** Prototype paper uses `--paper` (`#FFFEFB` light,
  `#232323` dark) with theme ink, so in dark mode you write on a dark sheet. App `.ed-paper` hard-codes
  `background: #FFFFFF; color: #1F2430` in both themes (dark theme only changes its border to black). In
  dark mode the app editor is a glaring white rectangle. Paper size also differs: app max-width 920px,
  padding 64px 72px, radius 4px, min-height 900px; prototype paper padding 56px 68px, radius 6px, sized
  from page setup under a 1020px layout cap.
- minor — Editor chrome background: prototype's header, menu bar and toolbar sit on the panel colour with
  hairline separators, like Google Docs. The app header has no panel background or bottom border; only the
  pill toolbar is surfaced (`--surface-2`).
- minor — No "Saved" affordance in the header. Prototype shows the cloud-check icon + "Saved" text
  (accent-coloured while saving). The app shows nothing (an empty `ed-save-state` span); its only save
  feedback is the "Saved" toast on exit.
- minor — Left panel: prototype background is the panel colour, its search box has an icon and the
  placeholder "Search prompts" and filters the panel, section heads are 11.5px uppercase "Tabs / Outline /
  Prompts", tabs are bordered rows with their own ⋮ menu and inline rename, and there is a "Hide panel"
  button. App panel background is the page background, the search is a bare pill input with placeholder
  "Search in outline" that only filters outline items, the first section is headed "Document tabs", tabs
  are plain buttons with a `📄` emoji and an `✕`, rename is a double-click into a native `prompt()` dialog,
  and there is no Hide panel control.
- minor — AI panel: 320px wide (app) vs 340px (prototype); quick actions reduced to 3 (Improve, Shorten,
  Rewrite) vs prototype's 5 (also Translate to Bangla, Add variables); the app panel header reads
  "✦ AI Assistant".
- minor — Spec violation carried into the editor: the app's font dropdown ends with a "↻ Sync PC fonts"
  option. The prototype's font menu lists fonts only (and actually loads them). Locked spec explicitly bans
  a Sync PC fonts control.
- minor — Native dialogs in place of in-app modals: the app uses `window.prompt()` for link URL, tab
  rename, Save-as-Template group, and template creation (see §8). The prototype uses in-app modal forms
  for template creation and Save as Template.
- cosmetic — Zoom steps differ (app adds 90%/110%); mode select wording equivalent; page-setup swatch grid
  wraps freely in the app vs the prototype's fixed 8-column grid in a wide modal.

## 6. AI Chat

- minor — Connect gate layout: prototype gate is a left-aligned panel ("Connect your AI API key" head,
  explanatory paragraph, Connect API button). App gate is a centred card (`text-align:center`, 44px padding)
  with a 34px `✦` over the heading "Connect your AI to start chatting".
- minor — Composer: prototype is a single-line input + Send button in a row separated by a top border.
  App is a sticky rounded-16px bordered bar containing a textarea + Send. App also adds a provider/model
  badge pill in the page head that the prototype does not have.
- cosmetic — Message bubbles are close (accent user bubble, panel AI bubble) but app reuses the editor's
  `.ai-msg` styles with 13px radius vs prototype chat's 12px with a 4px squared corner.

## 7. Notes

- **MAJOR — The note editor lost the whole Docs-style page.** Prototype opens a note in the same full-page
  editor chrome as prompts: back arrow, title, menu bar, pill toolbar, and a themed paper (max-width
  880px) with a rich-text body. App opens a bare page: a "← Back" button and a red Delete button over a
  plain 25px title input and a plain `<textarea>` — no toolbar, no menus, no paper card, no formatting.
- minor — Notes grid: prototype `auto-fill, minmax(260px, 1fr)`, gap 12px, card padding 15px, title 14px,
  body unclamped. App: fixed 3 columns, gap 16px, padding 18px, title 16px, body clamped to 4 lines.
  Prototype note cards lift on hover (shadow + translateY); app only shadows.

## 8. Templates

- **MAJOR — The shipped template set is not the approved set.** `templates-data.js` still carries its
  staging comment ("staging data for the desktop app build") and the shipped set was invented separately.
  Only **3 of the prototype's 22 names survive exactly** (Character Design Sheet, Cinematic Product Clip,
  Bug Report). The prototype itself ships **22** templates, not 23 — its groups are uneven
  (Image 5, Video 3, Coding 4, Writing 3, Business 4, Study 3) against the locked 4/3/4/4/4/4 = 23. The app
  ships 23 with the locked distribution but with different names and bodies. Name-by-name:

  | Group | Prototype (approved) | App (shipped) |
  |---|---|---|
  | Image | Hero Image Brief; Product Photo Shot; Social Post Visual; Cover Art; Character Design Sheet | Cinematic Photo Prompt; Product Photography; Character Design Sheet; Logo Concept Brief |
  | Video | Cinematic Product Clip; Talking Head Scene; B-Roll Sequence | Cinematic Product Clip; Short-Form Hook Video; Explainer Video Script |
  | Coding | Bug Report; Senior Code Review; Explain This Code; Write a Function | Bug Report; Code Review Request; Feature Build Brief; API Integration Guide |
  | Writing | Blog Outline to Draft; Rewrite in My Voice; Five Line Summary | Blog Article Outline; Story Opening; Social Media Caption Set; Email Draft |
  | Business | WhatsApp Outreach Opener; Facebook Launch Post; Client Proposal; Ad Copy, Three Angles | Service Proposal; Pricing Package Pitch; Client Onboarding; Meeting Summary |
  | Study | Explain Simply in Bangla; MCQ Quiz Drill; Make Flashcards | Study Notes; Q and A Practice; Concept Explainer; Exam Revision Checklist |

  Near-matches only: Product Photo Shot ≈ Product Photography; Senior Code Review ≈ Code Review Request;
  Blog Outline to Draft ≈ Blog Article Outline; Client Proposal ≈ Service Proposal; Explain Simply in
  Bangla ≈ Concept Explainer; MCQ Quiz Drill ≈ Q and A Practice. The remaining 13 app templates have no
  prototype counterpart, and 13 approved templates (incl. WhatsApp Outreach Opener, Facebook Launch Post,
  Rewrite in My Voice, Five Line Summary, Make Flashcards, Talking Head Scene, B-Roll Sequence, Cover Art,
  Social Post Visual, Hero Image Brief, Explain This Code, Write a Function, Ad Copy Three Angles) are
  simply absent.
- **MAJOR — Group names, accent colours and headers all differ.** Group names: prototype "Image Prompts",
  "Video / Flow", "Coding", "Writing", "Business & Marketing", "Study"; app shortens them to "Image",
  "Video", "Coding", "Writing", "Business", "Study". Every group dot colour changed:

  | Group | Prototype dot | App dot |
  |---|---|---|
  | Image | `#2563EB` | `#D97706` |
  | Video | `#7C3AED` | `#DB2777` |
  | Coding | `#EA580C` | `#1A56DB` |
  | Writing | `#D97706` | `#7C3AED` |
  | Business | `#E11D48` | `#0F766E` |
  | Study | `#0284C7` | `#059669` |

  (Several are swaps: the prototype's Writing amber is the app's Image colour; the prototype's Video violet
  is the app's Writing colour.) Prototype group heads are 15.5px/700 with a trailing "N templates" count;
  app heads are 17px/700 with no count.
- **MAJOR — Template card layout is different.** Prototype card: the preview fills the top of the card
  edge-to-edge (132px, paper background, mask fade), then a meta block separated by a hairline containing
  the name (14.5px), the group name in small faint text, and a working "Use template" button on the card
  itself. App card: 18px padding all round, the preview is an inset white rectangle (`.tpl-mini`, 132px,
  bordered, radius 9px) floating inside a (in dark mode) dark card, then only the name (15.5px) below — no
  group name, no Use button; using a template requires opening the preview page first.
- **MAJOR — Stock image slots show flat illustrations, with no badge or caption.** Prototype slots display
  real photographs (`picsum.photos/seed/…/880/495`) with a dark "Stock" pill badge in the corner and a
  caption bar under the photo: the slot's label in bold plus "Stock image · replaced by yours when you use
  the template". App slots substitute 8 bundled flat SVG illustrations (`public/stock/*.svg`: scene,
  product, character, sketch, film, social, storyboard, thumbnail) and `tplDisplayHTML` replaces the whole
  slot content with the bare `<img>` — no badge, no caption, and the slot's label text is thrown away.
- minor — Body styling language differs. Prototype templates use `.ph` grey placeholder spans, amber
  highlight lines (`.hl-line`, `#FEF3C7` / dark `#3A2E10`), panel-tinted code blocks, and `☐` checklist
  glyphs. App templates hard-code inline styles: `#9aa0a6` placeholder spans, `<mark>` elements (default
  browser-yellow highlight), cream `#f3efe7` `<pre>` blocks, and real `<input type="checkbox">` elements.
- minor — "Create template": prototype opens an in-app modal with name, group select and body fields. App
  asks with two native `prompt()` dialogs ("Template title:", "Group name:") and seeds a one-line body.
- minor — Preview page: prototype header is back arrow + small logo + template title (17px/700) with a
  "Group · Template preview" sub-line and a Use button; body text 15.5px/1.8. App header is a "← Back"
  button + "Use template" pill over a separate block with the group dot/name and a 28px title.
- cosmetic — The app's `GROUP_COLORS` map also defines colours for groups that do not exist in the shipped
  set ("Marketing" `#DB2777`, "Image & Video" `#D97706`), leftovers of the staging data.

## 9. Insights

- **MAJOR — Two whole content blocks are missing.** Prototype Insights has, below the Activity panel, a
  second stats row (Current streak, Longest streak, Active days last 6 months, Edits this month) and a
  two-column row with a **Weekly usage bar chart** (last 8 weeks) beside Most used. The app has neither:
  its page ends at Activity + Most Used.
- **MAJOR — Stat card design is inverted.** Prototype stat: small label on top (12px), number below
  (24px/600), and a sub-line (12px) that can carry an accent delta ("+29% vs last month"). App stat: number
  on top at 30px/800, label below at 13.5px, and no sub-line at all — the fourth card crams two facts into
  its label ("Current streak · N edits this month").
- minor — Heatmap dressing: prototype shows month labels above the grid and a "Less → More" legend below,
  11px cells, and its Filter popover (time range + activity type) re-filters the heatmap itself, defaulting
  to "This year". App: 12px cells, no month labels, no legend; the range/type selects sit under the
  heatmap, default to "This month", and only re-filter the recent-activity list — the heatmap is always
  the last 26 weeks regardless of the select.
- minor — Recent activity rows: prototype feed rows carry a 28px icon chip in accent-soft, text, and a
  right-aligned time. App rows carry a type badge pill (`act-badge`), the title, and a date. Most Used:
  prototype rows are ranked with numbered circles (1, 2, 3…) and a "×N uses" figure; app rows are plain
  buttons reading "used N times".
- cosmetic — Heatmap step colours are close but not equal: prototype `#BFDBFE / #93C5FD / #3B82F6 /
  #1A56DB` on base `#E8EDF5`; app `#B9D0FA / #7FA6F5 / #4376EE / #1A56DB` on `--surface-2`.

## 10. Import / Export

- minor — Layout and order differ. Prototype: two panels side by side, Import on the left, Export on the
  right, each a list of rows (bold title + description left, action button right): "Prompt files
  (.txt / .md)", "Library backup (.json)" / "Full backup (.json)", "Prompts as .zip of .md files". App:
  two full-width cards stacked, Export first, each a paragraph of hint text over a row of pill buttons
  ("Export JSON", "Export ZIP" / "Import JSON backup", "Import TXT / MD files"). The per-format rows and
  their descriptions are gone.

## 11. Trash

- **MAJOR — Trash is a bare list instead of the card grid.** Prototype renders trashed prompts with the
  same library cards (formatted preview, title, date) with Restore / Delete forever buttons in the card
  meta (`.trash-actions`). App renders plain text rows: `📄`/`🗒` emoji, title, date, and two pill buttons —
  no preview, no cards.
- minor — App-only: trashed notes are mixed into the same Trash list. The prototype's Trash is prompts in
  the library grid.

## 12. Account & Sync

- **MAJOR — The page structure is a different page.** Prototype panels, in order: (1) account panel with a
  52px avatar, "You're not signed in" heading and explanatory text (signed in: name, email, "Free plan",
  a "Signed in with Google" status pill and Sign out); (2) **Cloud Sync** panel — status pill top-right,
  Automatic sync toggle-switch row, Sync now row, Restore from backup row, Backup history row; (3) AI API
  Connection panel; (4) Danger zone panel (Delete cloud data). App cards, in order: (1) Google account —
  when signed out just a paragraph and the sign-in button (no avatar/header block); backup/restore/sign-out
  buttons exist only inside the signed-in branch; (2) **Share viewer** card (app-only, see below); (3) AI
  API keys card. **The Cloud Sync panel does not exist in the app**: no automatic-sync switch, no sync
  status pill, no backup history, no last-backup line in a sync context. The Danger zone (Delete cloud
  data) is also absent from this page.
- **MAJOR — The Google button lost the Google logo.** Prototype uses the official four-colour "G" SVG
  inside the white pill button. App renders a plain blue letter "G" in a `<span class="g">`
  (`font-weight: 800; color: #1A56DB`). In the recording this reads as a text initial, not the Google mark.
- minor — AI section layout: prototype puts Provider and Model selects side by side in two columns, with a
  "Fetch models" button beside the model select, a custom-model field, the API key field, then Save key /
  Test connection buttons and a status pill. App stacks Provider, API key, Model (+ Fetch models button),
  Custom model vertically, has Save only (no Test connection), and shows status as a small dot + text line
  instead of the pill.
- minor — App-only: the "Share viewer" card (viewer address field) sits as the second card on this page.
  The prototype has no such card (its share viewer is not user-configurable). Also app-only when the
  built-in client is absent: a collapsed "Google sign-in setup (one time, by the app owner)" details block
  with raw Client ID/Secret fields — developer plumbing exposed in a user page.

## 13. Settings

- **MAJOR — The Preferences panel and its toggle switches are missing entirely.** Prototype Preferences
  rows, each with a switch: AI semantic search (on), Fill variables before copying (on), Start with
  Windows (off), plus the Welcome guide row. The app has no switch component anywhere (no `.switch` styles
  exist in `style.css`) and none of these settings exist in its Settings page.
- **MAJOR — Section set and order differ.** Prototype order: Preferences → Appearance → System → About the
  Developer. App order: Appearance → Welcome guide (its own card) → About → Danger zone → About the
  Developer. The prototype's System panel (App version row with Check for updates, Local database row with
  Open data folder, Keyboard shortcuts row listing Ctrl K / Ctrl N / Ctrl S) is folded into the app's About
  card as prose text (version + data-folder path), with no shortcuts row and no Open data folder button.
- minor — App-only: a Danger zone card with "Erase local library" (the prototype's danger action, Delete
  cloud data, lives in Account & Sync; the app's erases local data from Settings).
- cosmetic — About the Developer: placement matches (quiet section at the very bottom, only GitHub and Web
  buttons, no visible username/domain in both). Styling differs slightly: prototype is a standard panel
  with a panel-head and two `.btn` links; app is a separate card with a smaller, softened 15px heading and
  pill buttons with a `↗` glyph.

## 14. First-launch guide

- **MAJOR — The guide card is a different design.** What matches: full-window solid black backdrop
  (`#000`, app `.ob-backdrop` / prototype `.guide-overlay`), one centred card, 4 steps, Skip and Continue,
  final button "Get Started", progress dots, shown once and replayable from Settings. Everything inside
  the card differs. Prototype card: max-width 480px, centre-aligned, a 64px rounded-18px icon tile in
  accent-soft holding the step icon (app logo image, then SVG plus / search / drive icons), title 19px,
  body 14px with a fixed min-height, round 8px dots (active dot scales), footer with Skip left and the
  primary button right (min-width 104px). App card: max-width 560px, left-aligned, topped by a 168px
  illustrated "art" banner (logo surrounded by fake mini-cards / chips / a fake search bar / a cloud
  glyph, varying per step), an uppercase "Step N of 4" eyebrow tag, title 24px, body 15px, and 2–3 feature
  point rows with icon tiles that the prototype does not have; the active dot is an elongated 24px pill;
  and there is an extra `✕` close button at the card's top-right that the prototype does not have.
- cosmetic — Both close on Skip/final button; the app additionally closes on backdrop click and Esc, the
  prototype on overlay click. No visual difference.

## 15. Window level

- cosmetic — App window itself matches the locked spec (Tauri: title "Prompt Vault", 1280×800 default,
  min 960×640, centred, resizable, not maximised) with the standard OS title bar; the prototype is a web
  page whose tab title and favicon are "Prompt Vault" + the logo. The app icon set is generated from a
  512×512 copy of the logo artwork; the prototype references the canonical 722×722 file. The artwork
  itself is identical (blue gradient rounded square, three white lines, white spark) — no visual difference
  at icon sizes.
- minor — App-only: an update banner (fixed strip at the very top of the window, accent-soft background)
  appears when an update is available. The prototype has no equivalent element.

---

## Present in the app but not in the prototype

- Update banner strip (top of window) when an update is available.
- "Share viewer" settings card on Account & Sync, plus a raw OAuth Client ID/Secret setup block shown when
  no built-in client is configured.
- A "↻ Sync PC fonts" option in the editor font menu (explicitly banned by the locked spec).
- Notes listed inside Trash alongside prompts.
- Provider/model badge pill in the AI Chat page head.
- "Erase local library" danger action inside Settings.
- Editor document tabs with an `✕` delete affordance (prototype tabs have a ⋮ menu instead).
- Guide: per-step illustrated art banner, feature point rows, and a card close `✕`.

## Present in the prototype but not in the app

- Sidebar sync footer (avatar, name, sync status with pulse dot).
- Prompt count in the library toolbar; "All Prompts / Pinned" headings over the library.
- Rich formatted card previews; Filter checkbox panel with badge; segmented grid-view icon switch.
- Insights: second stats row (streak details), Weekly usage bar chart, heatmap month labels + Less/More
  legend, ranked Most used list with numbered circles.
- Account & Sync: Cloud Sync panel (automatic-sync switch, Sync now, Restore, Backup history, status
  pill), Danger zone (Delete cloud data), official Google "G" logo, Test connection button.
- Settings: Preferences switches (AI semantic search, Fill variables before copying, Start with
  Windows), System panel with keyboard shortcuts and Open data folder.
- Follow-system theme option.
- Note editor with the full Docs-style chrome and rich text.
- Create-menu option descriptions; in-app modal forms for Create template / Save as Template.
- 13 approved templates (see §8) and the real-photo stock slots with Stock badge + caption bar.

## By design, not drift (do not "fix")

- The prototype contains demo prompts, notes and activity; the real app correctly starts empty
  (0 prompts, 0 notes, zeroed Insights) per Sami's no-demo-data rule. The empty app in the recording is
  expected; the *design of the empty states* is what differs (§3, §4).
- The prototype is a web page; the app is a native Tauri window. Browser chrome vs OS title bar is not a
  design difference.

---

## Summary

- **Major differences: 29**
  - §1 Theme/typography: 4 (Inter never loaded; pill buttons; surface shades; type scale)
  - §2 Sidebar: 2 (emoji icons; missing sync footer)
  - §3 All Prompts: 6 (no heading; plain-text previews; card meta layout; native dropdown controls;
    list-view geometry; pill search box)
  - §5 Editor: 4 (header composition; AI sparkle glyph; toolbar glyph icons; always-white paper)
  - §7 Notes: 1 (note editor lost its Docs-style page)
  - §8 Templates: 4 (different template set; group names/colours/headers; card layout; stock slots)
  - §9 Insights: 2 (missing weekly chart + streak stats row; inverted stat cards)
  - §11 Trash: 1 (bare list instead of cards)
  - §12 Account & Sync: 2 (page structure / missing Cloud Sync panel; text "G" Google button)
  - §13 Settings: 2 (missing Preferences switches; section set and order)
  - §14 Guide: 1 (card redesigned)
  - (§4, §6, §10, §15 have no major differences.)
- Minor differences: 33. Cosmetic differences: 10.

**Suggested fix order:** (1) ship/load Inter; (2) replace all emoji/glyph icons with the prototype's SVG
icon set (sidebar, toolbar, editor header, FAB, menus); (3) restore rich HTML card previews and the
prototype card meta layout; (4) restore the library heading, count, Filter panel and view switch; (5) swap
in the approved 22/23 template set with prototype group names/colours and photo stock slots with badge +
caption; (6) rebuild Account & Sync (Cloud Sync panel, Google "G") and Settings (Preferences switches,
System panel) to the prototype structure; (7) theme the editor paper and restore the note editor chrome;
(8) align the guide card, Insights blocks, Trash cards and the remaining values in §§1–15.
