import './style.css';
import './fidelity-main.css';
import { ICONS } from './icons.js';
import { store, uid, nowISO, esc, fmtDate, plainText, promptHTML, promptText, FONT_LIST, PROVIDERS } from './store.js';
import { openEditor, closeEditor, toast, openNoteEditor, closeNoteEditor } from './editor.js';
import { showOnboarding } from './onboarding.js';
import { scheduleUpdateCheck, checkForUpdates, currentVersion } from './updater.js';
import { openUrl } from '@tauri-apps/plugin-opener';
import { hasAnyKey, activeProvider, chat, fetchModels, semanticSearch, fuzzyScore } from './ai.js';
import * as google from './google.js';

let state = {
  nav: 'all',
  query: '',
  filter: 'all',       // all | pinned | shared | images
  sort: 'opened',      // opened | edited | newest | oldest | az | za
  view: 'comfortable', // comfortable | compact | list
  semanticResults: null,
};

const root = () => document.getElementById('view-root');

// ---------- global helpers used by editor.js ----------
window.__pvCloseMenus = () => document.querySelectorAll('.pv-menu,.pv-modal-menu').forEach((m) => m.remove());
window.__pvNavigate = (nav) => navigate(nav);
window.__pvNewPrompt = () => { closeEditor(false); navigate('all'); createPrompt(); };
window.__pvPromptMenu = (p, x, y, opts = {}) => promptMenu(p, x, y, opts);
window.__pvDownload = (p, fmt) => downloadPrompt(p, fmt);
window.__pvSharePrompt = (p) => sharePrompt(p);
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.pop-menu')) window.__pvCloseMenus();
});

// ---------- boot ----------
let _sysThemeListenerAdded = false;
async function boot() {
  await store.init();
  applyTheme();
  updateSyncMini();
  document.querySelectorAll('[data-nav]').forEach((b) =>
    b.addEventListener('click', () => { navigate(b.dataset.nav); closeDrawer(); })
  );
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('drawer-backdrop').classList.toggle('hidden');
  });
  document.getElementById('drawer-backdrop').addEventListener('click', closeDrawer);
  const fab = document.getElementById('fab');
  fab.addEventListener('click', toggleFabMenu);
  window.addEventListener('scroll', updateFabVisibility, true);
  navigate('all');
  // First-time onboarding guide: only if never seen (persisted in app data).
  showOnboarding(false);
  // Quiet self-update check a few seconds after launch (silent if none).
  scheduleUpdateCheck();
}

function closeDrawer() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('drawer-backdrop').classList.add('hidden');
}

function resolvedTheme() {
  const t = store.data.settings.theme || 'light';
  if (t === 'system') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return t === 'dark' ? 'dark' : 'light';
}
function applyTheme() {
  document.documentElement.dataset.theme = resolvedTheme();
  if (!_sysThemeListenerAdded && window.matchMedia) {
    _sysThemeListenerAdded = true;
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if ((store.data.settings.theme || 'light') === 'system') applyTheme();
      });
    } catch { /* older webviews: theme still resolves on each applyTheme() */ }
  }
  if (store.data.settings.defaultFont) {
    document.body.style.fontFamily = `'${store.data.settings.defaultFont}', 'Hind Siliguri', sans-serif`;
  }
}

// ---------- Sidebar sync-mini (prototype footer block) ----------
function updateSyncMini() {
  const nameEl = document.getElementById('sync-mini-name');
  if (!nameEl) return;
  const statusEl = document.getElementById('sync-mini-status');
  const avatarEl = document.getElementById('sync-mini-avatar');
  const user = google.currentUser();
  if (!user) {
    nameEl.textContent = 'Not signed in';
    if (statusEl) statusEl.innerHTML = '<span class="pulse"></span>Sign in to sync to Drive';
    if (avatarEl) avatarEl.textContent = '?';
    return;
  }
  const name = user.name || user.email || 'Signed in';
  nameEl.textContent = name;
  const last = store.data.settings.lastBackupAt;
  if (statusEl) statusEl.innerHTML = '<span class="pulse"></span>' + esc(last ? 'Last backup ' + fmtDate(last) : 'Synced');
  if (avatarEl) avatarEl.textContent = (name || 'G').slice(0, 1).toUpperCase();
}

function navigate(nav) {
  state.nav = nav;
  state.semanticResults = null;
  document.querySelectorAll('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === nav));
  document.getElementById('topbar-title').textContent =
    document.querySelector(`[data-nav="${nav}"]`)?.textContent.trim() || 'Prompt Vault';
  updateFabVisibility();
  ({ all: renderLibrary, pinned: renderLibrary, recent: renderLibrary, aichat: renderAiChat,
     notes: renderNotes, templates: renderTemplates, insights: renderInsights,
     importexport: renderImportExport, trash: renderTrash, account: renderAccount,
     settings: renderSettings }[nav] || renderLibrary)();
  pvRecord({ kind: 'view', nav });
}

// ---------- Mouse side buttons (back / forward) ----------
// Why they did nothing (Sami, 2026-10-28): the thumb buttons only
// work when the app itself keeps a navigation history, and this
// single-page app never did, so the webview had nowhere to go. The
// app now keeps its own location stack: sidebar views plus the
// full-screen overlays (prompt editor, note editor, template
// preview). Button 3 walks it back, button 4 walks it forward.
const pvHist = { stack: [{ kind: 'view', nav: 'all' }], idx: 0, applying: false };
function pvLocKey(loc) { return loc.kind + ':' + (loc.nav || loc.id || ''); }
function pvRecord(loc) {
  if (pvHist.applying || !loc) return;
  if (pvLocKey(pvHist.stack[pvHist.idx]) === pvLocKey(loc)) return;
  pvHist.stack = pvHist.stack.slice(0, pvHist.idx + 1);
  pvHist.stack.push(loc);
  pvHist.idx = pvHist.stack.length - 1;
}
// The note editor's close is async and ends by navigating to Notes
// itself; during a history jump that final navigation must not fire,
// or it would drag the app back to Notes after the jump. Swallow just
// that one navigation and let the caller go where the stack says.
function closeNoteEditorQuietly() {
  const orig = window.__pvNavigate;
  window.__pvNavigate = () => {};
  Promise.resolve(closeNoteEditor()).finally(() => { window.__pvNavigate = orig; });
}
function pvApplyLoc(loc) {
  const editorView = document.getElementById('editor-view');
  const noteView = document.getElementById('note-view');
  const tplView = document.getElementById('template-view');
  const editorOpen = editorView && !editorView.classList.contains('hidden');
  const noteOpen = noteView && !noteView.classList.contains('hidden');
  const tplOpen = tplView && !tplView.classList.contains('hidden');
  if (loc.kind === 'view') {
    if (tplOpen) tplView.classList.add('hidden');
    if (noteOpen) closeNoteEditorQuietly();
    if (editorOpen) closeEditor(false); // its onClose navigates underneath
    // The prompt editor's close already navigated to the view below
    // it; the note editor's was swallowed, so it needs the explicit
    // navigation. Plain view-to-view always navigates.
    if (noteOpen) navigate(loc.nav);
    else if (state.nav !== loc.nav || !editorOpen) navigate(loc.nav);
    return;
  }
  if (loc.kind === 'editor') {
    if (noteOpen) closeNoteEditorQuietly();
    if (tplOpen) tplView.classList.add('hidden');
    if (editorOpen) closeEditor(false);
    if (store.getPrompt(loc.id)) openEditor(loc.id, { onClose: () => navigate(state.nav) });
    return;
  }
  if (loc.kind === 'note') {
    if (editorOpen) closeEditor(false);
    if (tplOpen) tplView.classList.add('hidden');
    if (!noteOpen && store.getNote(loc.id)) openNote(loc.id);
    return;
  }
  if (loc.kind === 'template') {
    if (editorOpen) closeEditor(false);
    if (noteOpen) closeNoteEditorQuietly();
    openTemplatePreview(loc.id);
  }
}
function pvGo(dir) {
  const next = pvHist.idx + dir;
  if (next < 0 || next >= pvHist.stack.length) return;
  pvHist.idx = next;
  pvHist.applying = true;
  try { pvApplyLoc(pvHist.stack[next]); } finally { pvHist.applying = false; }
}
// An overlay closed through its own Back button counts as one step
// back in the stack, so Forward can reopen it afterwards.
function pvOverlayClosed(kind) {
  if (pvHist.applying) return;
  const cur = pvHist.stack[pvHist.idx];
  if (cur && cur.kind === kind) pvGo(-1);
}
window.addEventListener('pv:loc', (e) => pvRecord(e.detail));
window.addEventListener('pv:editor-closed', () => pvOverlayClosed('editor'));
window.addEventListener('pv:note-closed', () => pvOverlayClosed('note'));
document.addEventListener('mousedown', (e) => {
  if (e.button === 3) { e.preventDefault(); pvGo(-1); }
  else if (e.button === 4) { e.preventDefault(); pvGo(1); }
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 3 || e.button === 4) e.preventDefault();
});

// ---------- FAB ----------
function fabPages() { return state.nav === 'all' || state.nav === 'notes'; }
function updateFabVisibility() {
  const wrap = document.getElementById('fab-wrap');
  const editorOpen = !document.getElementById('editor-view').classList.contains('hidden');
  const scroller = root();
  const scrolled = scroller && scroller.scrollTop > 140;
  const show = fabPages() && !editorOpen && scrolled;
  wrap.classList.toggle('hidden', !show);
  if (!show) { document.getElementById('fab-menu').classList.add('hidden'); document.getElementById('fab').classList.remove('open'); }
}
// ---------- Create menu (prototype "Create new" card, 340px) ----------
// One card, shared by the floating + button and the top "New Prompt"
// button: every option is a bold label plus a description line.
function createMenuHTML() {
  if (state.nav === 'notes') {
    return `<div class="fid-create-menu"><h4>Create new</h4>
      <button class="fid-create-opt" data-fab="note"><span class="fid-co-ic">${ICONS.note}</span><span><b>New Note</b><span class="fid-co-desc">Quick note beside your prompts</span></span></button></div>`;
  }
  return `<div class="fid-create-menu"><h4>Create new</h4>
    <button class="fid-create-opt" data-fab="blank"><span class="fid-co-ic">${ICONS.plus}</span><span><b>Blank Prompt</b><span class="fid-co-desc">Start with an empty editor</span></span></button>
    <button class="fid-create-opt" data-fab="template"><span class="fid-co-ic">${ICONS.template}</span><span><b>From Template</b><span class="fid-co-desc">Pick a format from the template gallery</span></span></button>
    <button class="fid-create-opt" data-fab="import"><span class="fid-co-ic">${ICONS.upload}</span><span><b>Import File</b><span class="fid-co-desc">Add .txt, .md or backup .json</span></span></button>
    <button class="fid-create-opt" data-fab="note"><span class="fid-co-ic">${ICONS.note}</span><span><b>New Note</b><span class="fid-co-desc">Quick note beside your prompts</span></span></button></div>`;
}
function bindCreateMenu(scopeEl, closeFn) {
  scopeEl.querySelectorAll('[data-fab]').forEach((b) => b.addEventListener('click', () => {
    closeFn();
    const a = b.dataset.fab;
    if (a === 'blank') createPrompt();
    else if (a === 'template') navigate('templates');
    else if (a === 'import') importFileFlow();
    else if (a === 'note') createNote();
  }));
}
function closeCreateMenus() {
  document.querySelectorAll('.fid-create-menu-pop').forEach((m) => m.remove());
  const menu = document.getElementById('fab-menu');
  if (menu) { menu.classList.add('hidden'); menu.classList.remove('fid-fab-menu'); }
  document.getElementById('fab')?.classList.remove('open');
}
// Anchored copy of the same card, used by the top "New Prompt" button.
function openCreateMenu(anchorEl) {
  const existing = document.querySelector('.fid-create-menu-pop');
  if (existing) { existing.remove(); return; }
  closeCreateMenus();
  const pop = document.createElement('div');
  pop.className = 'fid-create-menu-pop';
  pop.innerHTML = createMenuHTML();
  document.body.appendChild(pop);
  const card = pop.firstElementChild;
  card.style.position = 'fixed';
  card.style.zIndex = '120';
  if (anchorEl) {
    const r = anchorEl.getBoundingClientRect();
    card.style.top = (r.bottom + 8) + 'px';
    card.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
  } else {
    card.style.top = '112px'; card.style.right = '22px';
  }
  bindCreateMenu(pop, closeCreateMenus);
  setTimeout(() => {
    document.addEventListener('mousedown', function onDoc(e) {
      if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('mousedown', onDoc); }
    });
  }, 0);
}
function toggleFabMenu() {
  const menu = document.getElementById('fab-menu');
  const fab = document.getElementById('fab');
  const opening = menu.classList.contains('hidden');
  if (!opening) { menu.classList.add('hidden'); menu.classList.remove('fid-fab-menu'); fab.classList.remove('open'); return; }
  closeCreateMenus();
  menu.innerHTML = createMenuHTML();
  menu.classList.add('fid-fab-menu');
  menu.classList.remove('hidden'); fab.classList.add('open');
  bindCreateMenu(menu, () => { menu.classList.add('hidden'); menu.classList.remove('fid-fab-menu'); fab.classList.remove('open'); });
}

// ---------- prompt creation ----------
function createPrompt(seed = {}) {
  const p = {
    id: uid(),
    title: seed.title || 'Untitled prompt',
    tabs: [{ id: uid(), name: 'Document', html: seed.html || '' }],
    activeTab: 0, pinned: false,
    createdAt: nowISO(), updatedAt: nowISO(), lastOpenedAt: nowISO(),
    usageCount: 0, deletedAt: null,
    page: { color: '', size: 'A4', orientation: 'portrait', margin: 'normal' },
  };
  store.data.prompts.unshift(p);
  store.logActivity('added', p.id, p.title);
  store.save();
  openEditor(p.id, { onClose: () => navigate(state.nav) });
  return p;
}
function createNote() {
  const n = { id: uid(), title: 'Untitled note', body: '', createdAt: nowISO(), updatedAt: nowISO(), deletedAt: null };
  store.data.notes.unshift(n);
  store.save();
  openNote(n.id);
}

// ---------- Library (All Prompts / Pinned / Recent: one view) ----------
const LIB_HEADINGS = { all: 'All Prompts', pinned: 'Pinned', recent: 'Recent' };
const LIB_FILTER_DEFS = [
  { key: 'pinned', label: 'Pinned' },
  { key: 'shared', label: 'Shared' },
  { key: 'images', label: 'With images' },
];
function fmtOpened(iso) {
  if (!iso) return 'Not opened yet';
  const d = new Date(iso);
  if (isNaN(d)) return 'Not opened yet';
  const today = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return 'Opened today, ' + time;
  const yest = new Date(Date.now() - 864e5);
  if (d.toDateString() === yest.toDateString()) return 'Opened yesterday, ' + time;
  const datePart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    (d.getFullYear() !== today.getFullYear() ? ', ' + d.getFullYear() : '');
  return 'Opened ' + datePart;
}
// Search highlighting inside formatted HTML: wrap query terms in text
// nodes only, so the miniature document keeps its real formatting.
function highlightHTML(html, query) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html || '';
  const terms = (query || '').trim().split(/\s+/).filter((w) => w.length > 1)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!terms.length) return wrap.innerHTML;
  const re = new RegExp('(' + terms.join('|') + ')', 'gi');
  const walker = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement && /^(SCRIPT|STYLE|MARK)$/.test(n.parentElement.tagName)
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (!re.test(node.nodeValue)) { re.lastIndex = 0; continue; }
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0; let m;
    while ((m = re.exec(node.nodeValue))) {
      frag.appendChild(document.createTextNode(node.nodeValue.slice(last, m.index)));
      const mark = document.createElement('mark');
      mark.className = 'hl';
      mark.textContent = m[0];
      frag.appendChild(mark);
      last = m.index + m[0].length;
      if (!m[0].length) re.lastIndex++;
    }
    frag.appendChild(document.createTextNode(node.nodeValue.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }
  return wrap.innerHTML;
}
function previewInnerHTML(p) {
  const html = promptHTML(p);
  if (!html || !plainText(html)) return '<span style="color:var(--ink-3)">Empty prompt</span>';
  return state.query ? highlightHTML(html, state.query) : html;
}

function renderLibrary() {
  root().innerHTML = `
  <div class="page">
    <div class="page-head"><div><h1 class="fid-title">${LIB_HEADINGS[state.nav] || 'All Prompts'}</h1></div></div>
    <div class="search-row">
      <div class="search-box"><span class="s-ic">${ICONS.search}</span><input id="lib-search" type="text" placeholder="Search" value="${esc(state.query)}" /></div>
      ${state.nav === 'all' ? `<button class="btn primary" id="lib-new">${ICONS.plus} New Prompt</button>` : ''}
    </div>
    <div class="fid-lib-tools">
      <span class="fid-lib-count" id="lib-count"></span>
      <div class="fid-lib-tools-right">
        <div class="fid-filter-wrap">
          <button class="btn small" id="lib-filter-btn">${ICONS.filter} Filter <span class="fid-f-badge" id="lib-filter-badge" style="display:none"></span></button>
          <div class="fid-filter-panel" id="lib-filter-panel">
            <div class="fid-fp-head"><span>Filter by</span><button class="fid-fp-clear" id="lib-filter-clear" type="button">Clear all</button></div>
            <div id="lib-filter-list">
              ${LIB_FILTER_DEFS.map((d) => `<button class="fid-fp-item ${state.filter === d.key ? 'on' : ''}" data-filter-key="${d.key}"><span class="fid-fp-check">${ICONS.check}</span>${d.label}</button>`).join('')}
            </div>
          </div>
        </div>
        <select class="fid-sort-select" id="lib-sort" aria-label="Sort prompts">
          <option value="opened" ${state.sort === 'opened' ? 'selected' : ''}>Last opened</option>
          <option value="edited" ${state.sort === 'edited' ? 'selected' : ''}>Recently edited</option>
          <option value="newest" ${state.sort === 'newest' ? 'selected' : ''}>Newest first</option>
          <option value="oldest" ${state.sort === 'oldest' ? 'selected' : ''}>Oldest first</option>
          <option value="az" ${state.sort === 'az' ? 'selected' : ''}>Name A-Z</option>
          <option value="za" ${state.sort === 'za' ? 'selected' : ''}>Name Z-A</option>
        </select>
        <div class="fid-view-switch" role="group" aria-label="Grid view">
          <button data-view-mode="comfortable" class="${state.view === 'comfortable' ? 'on' : ''}" title="Comfortable" aria-label="Comfortable grid"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg></button>
          <button data-view-mode="compact" class="${state.view === 'compact' ? 'on' : ''}" title="Compact" aria-label="Compact grid"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="9.5" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="9.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><rect x="16" y="9.5" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><rect x="9.5" y="16" width="5" height="5" rx="1"/><rect x="16" y="16" width="5" height="5" rx="1"/></svg></button>
          <button data-view-mode="list" class="${state.view === 'list' ? 'on' : ''}" title="List" aria-label="List view"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.3" fill="currentColor" stroke="none"/></svg></button>
        </div>
      </div>
    </div>
    <div id="lib-grid"></div>
  </div>`;
  document.getElementById('lib-new')?.addEventListener('click', (e) => openCreateMenu(e.currentTarget));
  const search = document.getElementById('lib-search');
  let debounce;
  search.addEventListener('input', () => {
    state.query = search.value;
    // Keyword/fuzzy search is fully local and needs no AI key: it runs
    // on every keystroke below. AI semantic search is only an extra
    // layer on top when a key is connected. The previous query's
    // semantic results must be dropped at once, or the instant redraw
    // mixes the old query's matches into the new one.
    state.semanticResults = null;
    const queryAtType = state.query;
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      if (state.query !== queryAtType) return; // a newer keystroke owns the box now
      // Preferences switch: AI semantic search off means keyword/fuzzy only.
      if (state.query.trim().length >= 4 && store.data.settings.semanticSearch !== false) {
        const base = filteredPrompts(false);
        try {
          const found = await semanticSearch(state.query, base, promptText);
          // Apply only if the box still holds the query they were
          // computed for; a slow reply must not overwrite newer results.
          if (state.query === queryAtType) state.semanticResults = found;
        } catch { if (state.query === queryAtType) state.semanticResults = null; }
      }
      if (state.query === queryAtType) drawGrid();
    }, 220);
    drawGrid();
  });
  const filterBtn = document.getElementById('lib-filter-btn');
  const filterPanel = document.getElementById('lib-filter-panel');
  const syncFilterUI = () => {
    const active = state.filter !== 'all';
    filterBtn.classList.toggle('active-filter', active);
    const badge = document.getElementById('lib-filter-badge');
    badge.style.display = active ? '' : 'none';
    badge.textContent = active ? '1' : '';
    filterPanel.querySelectorAll('[data-filter-key]').forEach((b) =>
      b.classList.toggle('on', b.dataset.filterKey === state.filter));
  };
  filterBtn.addEventListener('click', (e) => { e.stopPropagation(); filterPanel.classList.toggle('on'); });
  document.addEventListener('mousedown', function libFilterOutside(e) {
    if (!document.body.contains(filterPanel)) { document.removeEventListener('mousedown', libFilterOutside); return; }
    if (!e.target.closest('.fid-filter-wrap')) filterPanel.classList.remove('on');
  });
  filterPanel.querySelectorAll('[data-filter-key]').forEach((b) => b.addEventListener('click', () => {
    state.filter = state.filter === b.dataset.filterKey ? 'all' : b.dataset.filterKey;
    syncFilterUI(); drawGrid();
  }));
  document.getElementById('lib-filter-clear').addEventListener('click', () => { state.filter = 'all'; syncFilterUI(); drawGrid(); });
  syncFilterUI();
  document.getElementById('lib-sort').addEventListener('change', (e) => { state.sort = e.target.value; drawGrid(); });
  root().querySelectorAll('[data-view-mode]').forEach((b) => b.addEventListener('click', () => {
    state.view = b.dataset.viewMode;
    root().querySelectorAll('[data-view-mode]').forEach((x) => x.classList.toggle('on', x === b));
    drawGrid();
  }));
  drawGrid();
  updateFabVisibility();
}

function filteredPrompts(applySearch = true) {
  let list = store.activePrompts();
  if (state.nav === 'pinned') list = list.filter((p) => p.pinned);
  if (state.filter === 'pinned') list = list.filter((p) => p.pinned);
  if (state.filter === 'shared') list = list.filter((p) => p.sharedUrl);
  if (state.filter === 'images') list = list.filter((p) => /<img/i.test(promptHTML(p)));
  if (applySearch && state.query.trim()) {
    if (state.semanticResults) {
      const ids = new Set(state.semanticResults.map((p) => p.id));
      const kw = list.filter((p) => fuzzyScore(p.title + ' ' + promptText(p), state.query) > 0);
      const seen = new Set();
      list = [...state.semanticResults.filter((p) => list.includes(p)), ...kw].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
      void ids;
    } else {
      list = list
        .map((p) => ({ p, s: fuzzyScore(p.title + ' ' + promptText(p), state.query) + (p.title.toLowerCase().includes(state.query.toLowerCase()) ? 5 : 0) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.p);
    }
  }
  const by = {
    opened: (a, b) => new Date(b.lastOpenedAt) - new Date(a.lastOpenedAt),
    edited: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    az: (a, b) => a.title.localeCompare(b.title),
    za: (a, b) => b.title.localeCompare(a.title),
  }[state.sort];
  if (!(applySearch && state.query.trim())) list = [...list].sort(by);
  return list;
}

function emptyStateHTML(sub) {
  return `<div class="fid-empty"><b>Nothing here yet</b><span>${esc(sub)}</span></div>`;
}
function drawGrid() {
  const host = document.getElementById('lib-grid');
  if (!host) return;
  const list = filteredPrompts();
  const countEl = document.getElementById('lib-count');
  if (countEl) countEl.textContent = list.length + (list.length === 1 ? ' prompt' : ' prompts');
  if (!list.length) {
    const emptyMsg = state.query
      ? 'No prompts match. Try describing what the prompt does instead of its name.'
      : state.nav === 'pinned'
        ? 'No pinned prompts yet. Pin a prompt and it will show up here.'
        : state.nav === 'recent'
          ? 'No prompts opened yet.'
          : 'No prompts yet. Create your first one with the New Prompt button.';
    host.innerHTML = emptyStateHTML(emptyMsg);
    return;
  }
  const cls = state.view === 'compact' ? 'prompt-grid compact' : state.view === 'list' ? 'prompt-grid list' : 'prompt-grid';
  host.innerHTML = `<div class="${cls}">${list.map((p) => cardHTML(p)).join('')}</div>`;
  bindPromptCards(host);
}
function bindPromptCards(scope) {
  scope.querySelectorAll('.prompt-card').forEach((card) => {
    const p = store.getPrompt(card.dataset.id);
    if (!p) return;
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-act],[data-restore],[data-kill],button,a')) return;
      openEditor(p.id, { onClose: () => navigate(state.nav) });
    });
    card.querySelector('[data-act="copy"]')?.addEventListener('click', (e) => { e.stopPropagation(); copyPromptText(p); });
    card.querySelector('[data-act="pin"]')?.addEventListener('click', (e) => { e.stopPropagation(); p.pinned = false; store.save(); drawGridOrRefresh(); toast('Unpinned'); });
    card.querySelector('[data-act="menu"]')?.addEventListener('click', (e) => { e.stopPropagation(); promptMenu(p, e.clientX, e.clientY); });
  });
}

function cardHTML(p, opts = {}) {
  const pinBtn = p.pinned && !opts.trash
    ? `<button class="fid-pin-btn" data-act="pin" title="Pinned. Click to unpin" aria-label="Unpin">${ICONS.pin}</button>` : '';
  const right = opts.trash
    ? `<span class="trash-actions"><button class="btn small" data-restore="${p.id}">${ICONS.history} Restore</button><button class="btn small danger" data-kill="${p.id}">Delete forever</button></span>`
    : `<button class="fid-copy-btn" data-act="copy" title="Copy prompt" aria-label="Copy prompt">${ICONS.copy}</button><button class="fid-copy-btn" data-act="menu" title="More actions" aria-label="More actions">${ICONS.dotsHorizontal}</button>`;
  return `
  <article class="prompt-card" data-id="${p.id}">
    <div class="card-preview"><div class="prev-inner">${previewInnerHTML(p)}</div></div>
    <div class="card-meta">
      <h4 class="fid-card-title">${pinBtn}${esc(p.title)}</h4>
      <div class="fid-meta-row"><span class="fid-opened">${esc(opts.trash && p.deletedAt ? fmtDate(p.deletedAt) : fmtOpened(p.lastOpenedAt))}</span>${right}</div>
    </div>
  </article>`;
}

async function doCopyText(p, text) {
  try { await navigator.clipboard.writeText(text); toast('Copied'); }
  catch { toast('Copy failed in this environment'); }
  store.logActivity('used', p.id, p.title);
}

async function copyPromptText(p) {
  const text = promptText(p);
  // Preferences -> "Fill variables before copying": when on and the
  // prompt carries [placeholder] variables, ask for values first.
  if (store.data.settings.fillVariables !== false) {
    const vars = [...new Set([...text.matchAll(/\[([^\[\]\n]{1,60})\]/g)].map((m) => m[1].trim()).filter(Boolean))];
    if (vars.length) { openFillVariablesModal(p, text, vars); return; }
  }
  await doCopyText(p, text);
}

function openFillVariablesModal(p, text, vars) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop pv-modal';
  modal.innerHTML = `
    <div class="modal-card">
      <h2>Fill variables</h2>
      <p class="hint">This prompt has ${vars.length} variable${vars.length > 1 ? 's' : ''}. Fill them in and the copied text uses your values.</p>
      ${vars.map((v, i) => `<div class="field"><input type="text" data-var="${i}" placeholder="${esc(v)}" /></div>`).join('')}
      <div class="modal-actions">
        <button class="btn" id="fv-original">Copy original</button>
        <button class="btn" id="fv-cancel">Cancel</button>
        <button class="btn primary" id="fv-copy">Copy with values</button>
      </div>
    </div>`;
  document.getElementById('modal-root').appendChild(modal);
  modal.querySelector('#fv-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#fv-original').addEventListener('click', async () => { modal.remove(); await doCopyText(p, text); });
  modal.querySelector('#fv-copy').addEventListener('click', async () => {
    let out = text;
    vars.forEach((v, i) => {
      const val = modal.querySelector(`[data-var="${i}"]`).value;
      if (val) out = out.split('[' + v + ']').join(val);
    });
    modal.remove();
    await doCopyText(p, out);
  });
  modal.querySelector('input')?.focus();
}

// ---------- three-dot menu / downloads / share ----------
function promptMenu(p, x, y, opts = {}) {
  window.__pvCloseMenus();
  const menu = document.createElement('div');
  menu.className = 'pop-menu pv-menu';
  menu.innerHTML = `
    <button data-m="open">Open</button>
    <button data-m="copy">Copy prompt</button>
    <button data-m="share">Share</button>
    <button data-m="pin">${p.pinned ? 'Unpin' : 'Pin'}</button>
    <button data-m="download">Download <span style="margin-left:auto">${ICONS.chevronDown}</span></button>
    <button data-m="delete" class="danger">Delete</button>`;
  document.body.appendChild(menu);
  menu.style.left = Math.min(window.innerWidth - 210, x - 170) + 'px';
  menu.style.top = Math.min(window.innerHeight - 260, y + 4) + 'px';
  const dl = menu.querySelector('[data-m="download"]');
  dl.addEventListener('mouseenter', () => {
    menu.querySelector('.pop-sub')?.remove();
    const sub = document.createElement('div');
    sub.className = 'pop-menu pop-sub';
    sub.innerHTML = ['docx', 'txt', 'md', 'pdf', 'html'].map((f) =>
      `<button data-f="${f}">${f === 'md' ? 'Markdown' : f.toUpperCase()}</button>`).join('');
    dl.appendChild(sub);
    sub.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation(); window.__pvCloseMenus(); downloadPrompt(p, b.dataset.f);
    }));
  });
  menu.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.m;
    if (a === 'download') return;
    window.__pvCloseMenus();
    if (a === 'open') openEditor(p.id, { onClose: () => navigate(state.nav) });
    if (a === 'copy') copyPromptText(p);
    if (a === 'share') sharePrompt(p);
    if (a === 'pin') { p.pinned = !p.pinned; store.save(); if (!opts.fromEditor) drawGridOrRefresh(); else toast(p.pinned ? 'Pinned' : 'Unpinned'); }
    if (a === 'delete') {
      p.deletedAt = nowISO(); store.save();
      if (opts.fromEditor) { closeEditor(false); navigate('trash'); }
      else drawGridOrRefresh();
      toast('Moved to Trash');
    }
  }));
}
function drawGridOrRefresh() { if (state.nav === 'all' || state.nav === 'pinned' || state.nav === 'recent') drawGrid(); else if (state.nav === 'trash') renderTrash(); }

function downloadPrompt(p, fmt) {
  const text = promptText(p);
  const html = promptHTML(p);
  const title = p.title || 'prompt';
  if (fmt === 'txt') return saveBlob(new Blob([text], { type: 'text/plain' }), title + '.txt');
  if (fmt === 'md') return saveBlob(new Blob(['# ' + title + '\n\n' + text], { type: 'text/markdown' }), title + '.md');
  if (fmt === 'html') return saveBlob(new Blob([`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body><h1>${esc(title)}</h1>${html}</body></html>`], { type: 'text/html' }), title + '.html');
  if (fmt === 'pdf') {
    const w = window.open('', '_blank');
    if (!w) { toast('Popup blocked: allow popups to save as PDF'); return; }
    w.document.write(`<html><head><title>${esc(title)}</title></head><body style="font-family:sans-serif;padding:40px"><h1>${esc(title)}</h1>${html}<script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
    return;
  }
  if (fmt === 'docx') {
    // Minimal Word-compatible .doc (HTML based, opens in Word / Docs).
    const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title></head><body><h1>${esc(title)}</h1>${html}</body></html>`;
    return saveBlob(new Blob(['\ufeff' + doc], { type: 'application/msword' }), title + '.doc');
  }
}
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function viewerBase() {
  const b = (store.data.settings.shareViewerBase || '').trim();
  if (!b) return '';
  return b.replace(/\/?$/, '/');
}
function buildShareLink(p) {
  const base = viewerBase();
  if (!base) return '';
  if (p.sharedFileId) return base + '?f=' + encodeURIComponent(p.sharedFileId);
  // Offline fallback: the whole snapshot travels inside the link itself.
  const snap = { title: p.title, html: promptHTML(p), text: promptText(p) };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(snap)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base + '#d=' + b64;
}

async function sharePrompt(p) {
  const user = google.currentUser();
  const base = viewerBase();
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop pv-modal';
  const render = (msg = '') => {
    const link = p.sharedFileId || !user ? buildShareLink(p) : '';
    modal.innerHTML = `
    <div class="modal-card">
      <h2>Share "${esc(p.title)}"</h2>
      ${p.sharedFileId ? `
        <p class="hint">Anyone with this link can view this prompt in their browser, read-only. No app install, no login. The content is a snapshot: edit the prompt and share again to update it.</p>
        ${user ? '' : '<p class="hint" style="color:var(--danger)">You are signed out right now. To stop sharing or update the snapshot, sign in with Google first: the file lives in your Drive, and only a signed-in app can delete it.</p>'}
        <div class="share-link-box"><input readonly value="${esc(link)}" id="share-link-input" /><button class="btn primary" id="share-copy">Copy link</button></div>
        <div class="modal-actions">
          <button class="btn danger" id="share-stop" ${user ? '' : 'disabled'}>Stop sharing</button>
          <button class="btn" id="share-refresh" ${user ? '' : 'disabled'}>Update snapshot</button>
          <button class="btn" id="share-close">Done</button>
        </div>`
      : user ? `
        <p class="hint">This publishes a snapshot of this prompt to your Google Drive as an anyone-with-the-link file, and gives you a viewer link like Google Docs. Stop sharing any time and the link dies.</p>
        ${base ? '' : '<p class="hint" style="color:var(--danger)">One setup step first: host the share-viewer folder from the app repo (for example on GitHub Pages) and paste its address in Account &amp; Sync, in the Share viewer box.</p>'}
        <div class="modal-actions">
          <button class="btn" id="share-close">Cancel</button>
          <button class="btn primary" id="share-create" ${base ? '' : 'disabled'}>Create share link</button>
        </div>`
      : `
        <p class="hint">Sign in with Google (Account & Sync) to create a real share link backed by your Drive.${base ? ' Or use an offline link that carries a copy of the prompt inside the link itself:' : ''}</p>
        ${base ? `<div class="share-link-box"><input readonly value="${esc(link)}" id="share-link-input" /><button class="btn primary" id="share-copy">Copy link</button></div>` : '<p class="hint" style="color:var(--danger)">Set the Share viewer address in Account &amp; Sync first (host the share-viewer folder, for example on GitHub Pages).</p>'}
        <div class="modal-actions"><button class="btn" id="share-close">Done</button></div>`}
      ${msg ? `<p class="hint" style="margin-top:12px">${msg}</p>` : ''}
    </div>`;
    modal.querySelector('#share-close')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#share-copy')?.addEventListener('click', async () => {
      const val = modal.querySelector('#share-link-input').value;
      try { await navigator.clipboard.writeText(val); toast('Link copied'); }
      catch { modal.querySelector('#share-link-input').select(); }
    });
    modal.querySelector('#share-create')?.addEventListener('click', async () => {
      render('<span style="color:var(--text-soft)">Publishing to Google Drive...</span>');
      try {
        p.sharedFileId = await google.publishSharedPrompt(p, promptHTML(p), promptText(p));
        p.sharedUrl = buildShareLink(p);
        await store.saveNow();
        render('<span style="color:#2E9E5B">Share link created.</span>');
        drawGridOrRefresh();
      } catch (e) { render('<span style="color:var(--danger)">' + esc(e.message) + '</span>'); }
    });
    modal.querySelector('#share-refresh')?.addEventListener('click', async () => {
      render('<span style="color:var(--text-soft)">Updating the shared snapshot...</span>');
      try {
        p.sharedFileId = await google.publishSharedPrompt(p, promptHTML(p), promptText(p));
        p.sharedUrl = buildShareLink(p);
        await store.saveNow();
        render('<span style="color:#2E9E5B">Snapshot updated.</span>');
      } catch (e) { render('<span style="color:var(--danger)">' + esc(e.message) + '</span>'); }
    });
    modal.querySelector('#share-stop')?.addEventListener('click', async () => {
      if (!confirm('Stop sharing? The shared file will be deleted from Drive and the link will stop working for everyone.')) return;
      try {
        await google.unpublishSharedPrompt(p);
        p.sharedFileId = null; p.sharedUrl = null;
        await store.saveNow();
        modal.remove(); toast('Sharing stopped');
        drawGridOrRefresh();
      } catch (e) { render('<span style="color:var(--danger)">' + esc(e.message) + '</span>'); }
    });
  };
  render();
  document.body.appendChild(modal);
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) modal.remove(); });
}

// ---------- Recent ----------
// Recent is the same library view (heading "Recent", full search +
// Filter/Sort/View toolbar), listing by lastOpenedAt. The prototype
// applies no item cap to Recent, so neither does the app.
function renderRecent() { renderLibrary(); }

// ---------- AI Chat page ----------
function renderAiChat() {
  if (!hasAnyKey()) {
    root().innerHTML = `
    <div class="page">
      <div class="page-head"><h1>AI Chat</h1></div>
      <div class="fid-panel fid-chat-gate">
        <div class="fid-panel-head"><h3>Connect your AI API key</h3></div>
        <p style="margin:0 0 14px;color:var(--ink-2);font-size:13.5px;line-height:1.6">AI Chat runs on your own AI API key. Connect a key in Account &amp; Sync and this chat unlocks. Without a key, the chat stays off. AI Chat, the editor assistant and meaning-based search all run on that key, which stays on this computer and is never synced.</p>
        <button class="btn primary" id="aichat-connect">Connect API</button>
      </div>
    </div>`;
    document.getElementById('aichat-connect').addEventListener('click', () => navigate('account'));
    return;
  }
  const provider = activeProvider();
  root().innerHTML = `
  <div class="page chat-page" style="height:calc(100vh - 120px)">
    <div class="page-head"><h1>AI Chat</h1></div>
    <div class="chat-scroll" id="chat-scroll">
      <div class="ai-msg bot">Ask me anything, or describe a prompt you are looking for, like "a prompt that makes study notes", and I will find matching cards from your library.</div>
    </div>
    <form class="fid-chat-form" id="chat-form">
      <input id="chat-input" type="text" autocomplete="off" placeholder="Message…" />
      <button class="btn primary" id="chat-send" type="submit">Send</button>
    </form>
  </div>`;
  const scroll = document.getElementById('chat-scroll');
  const send = async () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    scroll.insertAdjacentHTML('beforeend', `<div class="ai-msg user">${esc(text)}</div>`);
    scroll.scrollTop = scroll.scrollHeight;

    // Prompt-finding intent: description-like queries search the library.
    const lower = text.toLowerCase();
    const wantsFind = /(find|search|prompt for|prompt that|looking for|খুঁজ|প্রম্পট)/i.test(lower) || text.split(/\s+/).length <= 8;
    if (wantsFind) {
      let matches = null;
      try { matches = await semanticSearch(text, store.activePrompts(), promptText); } catch {}
      if (!matches) {
        matches = store.activePrompts()
          .map((p) => ({ p, s: fuzzyScore(p.title + ' ' + promptText(p), text) }))
          .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 5).map((x) => x.p);
      }
      if (matches && matches.length) {
        const wrap = document.createElement('div');
        wrap.innerHTML = `<div class="ai-msg bot">Here is what matches in your library:</div>
          <div class="match-cards">${matches.slice(0, 5).map((p) => `
            <button class="match-card" data-open="${p.id}"><b>${esc(p.title)}</b><p>${esc(promptText(p).slice(0, 160))}</p></button>`).join('')}</div>`;
        scroll.appendChild(wrap);
        wrap.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () =>
          openEditor(b.dataset.open, { onClose: () => navigate('aichat') })));
        scroll.scrollTop = scroll.scrollHeight;
        return;
      }
    }
    const wait = document.createElement('div');
    wait.className = 'ai-msg bot'; wait.textContent = 'Thinking...';
    scroll.appendChild(wait);
    try {
      const libSummary = store.activePrompts().slice(0, 40).map((p) => '- ' + p.title).join('\n');
      const reply = await chat(provider, [
        { role: 'system', content: 'You are the assistant inside Prompt Vault, a personal prompt library app. The user\'s prompts are:\n' + libSummary },
        { role: 'user', content: text },
      ]);
      wait.textContent = reply || '(empty reply)';
    } catch (e) { wait.textContent = 'Could not reach the AI: ' + e.message; }
    scroll.scrollTop = scroll.scrollHeight;
  };
  document.getElementById('chat-form').addEventListener('submit', (e) => { e.preventDefault(); send(); });
}

// ---------- Notes ----------
function renderNotes() {
  const notes = store.activeNotes();
  root().innerHTML = `
  <div class="page">
    <div class="page-head"><h1>Notes</h1><span class="toolbar-spacer"></span><button class="btn primary" id="note-new">New Note</button></div>
    ${notes.length ? `<div class="notes-grid">${notes.map((n) => `
      <button class="note-card" data-id="${n.id}">
        <h3>${esc(n.title || 'Untitled note')}</h3>
        <p>${esc(plainText(n.body || ''))}</p>
        <div class="card-date">${fmtDate(n.updatedAt)}</div>
      </button>`).join('')}</div>`
    : emptyStateHTML('No notes yet. Jot down ideas, drafts and anything that is not a prompt yet.')}
  </div>`;
  document.getElementById('note-new').addEventListener('click', createNote);
  root().querySelectorAll('.note-card').forEach((c) => c.addEventListener('click', () => openNote(c.dataset.id)));
  updateFabVisibility();
}

function openNote(id) {
  // Note editing lives in editor.js (full Docs-style chrome, §7 port).
  openNoteEditor(id);
}

// ---------- Templates ----------
// Display-only transform for template gallery cards and the preview page,
// ported from the prototype's stockInner()/tplHtml() logic: each image
// slot shows its stock photo (data-stock-src, a bundled /stock/*.jpg file
// shipped with the app) with a caption bar carrying the slot's label. The
// stored template body is never touched by this transform.
function tplDisplayHTML(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html || '';
  const stockInner = (label, src) =>
    `<img class="stock-img" src="${esc(src)}" alt="${esc(label)}" loading="lazy" />` +
    `<div class="stock-cap"><b>${esc(label)}</b><span>Replaced by yours when you use the template</span></div>`;
  wrap.querySelectorAll('[data-image-slot]').forEach((slot) => {
    const label = slot.querySelector('b')?.textContent.trim() || 'Image';
    const seed = slot.getAttribute('data-stock') || ('pv-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
    const src = slot.getAttribute('data-stock-src') || `/stock/${encodeURIComponent(seed)}.jpg`;
    slot.classList.add('has-stock');
    slot.removeAttribute('style');
    slot.innerHTML = stockInner(label, src);
  });
  // A saved body can still hold an unfilled editor drop zone; in
  // read-only views the prototype shows it as a stock slot too.
  wrap.querySelectorAll('.img-drop').forEach((z) => {
    const label = z.getAttribute('data-label') || 'Image';
    const d = document.createElement('div');
    d.className = 'img-ph has-stock';
    const seed = 'pv-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    d.innerHTML = stockInner(label, `/stock/${encodeURIComponent(seed)}.jpg`);
    z.replaceWith(d);
  });
  return wrap.innerHTML;
}
const GROUP_COLORS = {
  'Image Prompts': '#2563EB', 'Video / Flow': '#7C3AED', Coding: '#EA580C',
  Writing: '#D97706', 'Business & Marketing': '#E11D48', Study: '#0284C7',
};
function useTemplateById(id) {
  const t = store.data.templates.find((x) => x.id === id);
  if (!t) return;
  document.getElementById('template-view').classList.add('hidden');
  createPrompt({ title: t.title, html: t.body });
}
function renderTemplates() {
  const groups = [];
  for (const t of store.data.templates) if (!groups.includes(t.group)) groups.push(t.group);
  root().innerHTML = `
  <div class="page">
    <div class="page-head"><h1>Templates</h1><span class="toolbar-spacer"></span><button class="btn primary" id="tpl-create">${ICONS.plus} Create template</button></div>
    <p class="page-sub">Click any template to preview it in full, then use it as a new prompt.</p>
    ${groups.map((g) => {
      const items = store.data.templates.filter((t) => t.group === g);
      return `
      <div class="fid-tpl-group-head"><span class="tpl-dot" style="background:${GROUP_COLORS[g] || '#1A56DB'}"></span><h3>${esc(g)}</h3><span>${items.length} template${items.length === 1 ? '' : 's'}</span></div>
      <div class="tpl-grid">
        ${items.map((t) => `
          <article class="fid-tpl-card" data-id="${t.id}" role="button" tabindex="0" aria-label="Preview template ${esc(t.title)}">
            <div class="fid-tpl-preview"><div class="prev-inner">${tplDisplayHTML(t.body)}</div></div>
            <div class="fid-tpl-meta"><h4>${esc(t.title)}</h4><span class="fid-tpl-gname">${esc(g)}</span><button class="btn small" data-use-tpl="${t.id}">Use template</button></div>
          </article>`).join('')}
      </div>`;
    }).join('')}
  </div>`;
  root().querySelectorAll('.fid-tpl-card').forEach((c) => {
    c.addEventListener('click', (e) => {
      if (e.target.closest('[data-use-tpl]')) return;
      openTemplatePreview(c.dataset.id);
    });
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter') openTemplatePreview(c.dataset.id); });
  });
  root().querySelectorAll('[data-use-tpl]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    useTemplateById(b.dataset.useTpl);
  }));
  document.getElementById('tpl-create').addEventListener('click', openCreateTemplateModal);
}
// In-app create-template modal (replaces the old window.prompt() flow):
// name field, group select of existing groups plus a new-group field,
// and a body field. Created templates keep the shape { custom: true }.
function openCreateTemplateModal() {
  const groups = [];
  for (const t of store.data.templates) if (!groups.includes(t.group)) groups.push(t.group);
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop pv-modal';
  modal.innerHTML = `
  <div class="modal-card">
    <h2>Create template</h2>
    <p class="hint">Add your own format to the gallery.</p>
    <div class="field"><label>Template name</label><input type="text" id="ct-name" placeholder="Template name" /></div>
    <div class="field"><label>Group</label>
      <select id="ct-group">${groups.map((g) => `<option>${esc(g)}</option>`).join('')}</select>
    </div>
    <div class="field"><label>New group (optional, overrides the list above)</label><input type="text" id="ct-new-group" placeholder="Type a new group name" /></div>
    <div class="field"><label>Body</label><textarea id="ct-body" rows="7" placeholder="Write the template content here. HTML formatting is kept."></textarea></div>
    <div class="modal-actions">
      <button class="btn" id="ct-cancel">Cancel</button>
      <button class="btn primary" id="ct-save">Create template</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#ct-cancel').addEventListener('click', () => modal.remove());
  setTimeout(() => modal.querySelector('#ct-name')?.focus(), 30);
  modal.querySelector('#ct-save').addEventListener('click', () => {
    const title = modal.querySelector('#ct-name').value.trim();
    if (!title) { toast('Give the template a name first'); return; }
    const group = modal.querySelector('#ct-new-group').value.trim() || modal.querySelector('#ct-group').value || 'My Templates';
    const rawBody = modal.querySelector('#ct-body').value.trim();
    const body = !rawBody
      ? '<p>Write the template content here, then edit it any time from a prompt.</p>'
      : /<[a-z][\s\S]*>/i.test(rawBody) ? rawBody
        : rawBody.split(/\n{2,}/).map((para) => `<p>${esc(para).replace(/\n/g, '<br>')}</p>`).join('');
    const t = { id: uid(), group, color: GROUP_COLORS[group] || '#1A56DB', title, body, custom: true };
    store.data.templates.push(t);
    store.save();
    modal.remove();
    openTemplatePreview(t.id);
  });
}
function openTemplatePreview(id) {
  const t = store.data.templates.find((x) => x.id === id);
  if (!t) return;
  const view = document.getElementById('template-view');
  view.innerHTML = `
    <div class="ed-header">
      <div class="ed-row1">
        <button class="fid-icon-btn" id="tpl-back" title="Back to templates" aria-label="Back to templates">${ICONS.back}</button>
        <img src="/logo.png" alt="" style="width:26px;height:26px;border-radius:7px" />
        <div style="flex:1;min-width:0">
          <div class="fid-tpl-title">${esc(t.title)}</div>
          <div class="fid-tpl-sub">${esc(t.group)} · Template preview</div>
        </div>
        ${t.custom ? '<button class="btn danger" id="tpl-delete">Delete template</button>' : ''}
        <button class="btn primary" id="tpl-use">Use this template</button>
      </div>
    </div>
    <div class="ed-scroll">
      <div class="ed-paper" style="min-height:400px"><div class="prev-inner fid-tpl-full">${tplDisplayHTML(t.body)}</div></div>
    </div>`;
  view.classList.remove('hidden');
  document.getElementById('fab-wrap').classList.add('hidden');
  pvRecord({ kind: 'template', id });
  view.querySelector('#tpl-back').addEventListener('click', () => { view.classList.add('hidden'); navigate('templates'); pvOverlayClosed('template'); });
  view.querySelector('#tpl-use').addEventListener('click', () => useTemplateById(id));
  view.querySelector('#tpl-delete')?.addEventListener('click', () => {
    store.data.templates = store.data.templates.filter((x) => x.id !== id);
    store.save(); view.classList.add('hidden'); navigate('templates'); pvOverlayClosed('template'); toast('Template deleted');
  });
}

// ---------- Insights ----------
function renderInsights() {
  const prompts = store.activePrompts();
  const act = store.data.activity || [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const inThisMonth = (iso) => new Date(iso) >= monthStart;
  const inLastMonth = (iso) => { const d = new Date(iso); return d >= lastMonthStart && d < monthStart; };
  const countType = (type, pred) => act.filter((a) => a.type === type && pred(a.at)).length;
  const addedMonth = countType('added', inThisMonth) || prompts.filter((p) => inThisMonth(p.createdAt)).length;
  const addedLast = countType('added', inLastMonth) || prompts.filter((p) => inLastMonth(p.createdAt)).length;
  const usedMonth = countType('used', inThisMonth);
  const editedActs = act.filter((a) => a.type === 'edited' && inThisMonth(a.at));
  const editedMonth = editedActs.length;
  const editedPrompts = new Set(editedActs.map((a) => a.promptId).filter(Boolean)).size;
  const monthName = now.toLocaleDateString(undefined, { month: 'long' });

  // Streaks from real active days (activity dates + prompt created dates).
  const dayKey = (d) => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const activeDays = new Set(act.map((a) => dayKey(a.at)));
  prompts.forEach((pr) => activeDays.add(dayKey(pr.createdAt)));
  const sortedDays = [...activeDays].sort();
  let longest = 0; let runLen = 0; let prevDay = null; let longestEnd = null;
  for (const k of sortedDays) {
    const d = new Date(k + 'T12:00:00');
    runLen = prevDay && (d - prevDay) === 864e5 ? runLen + 1 : 1;
    if (runLen >= longest) { longest = runLen; longestEnd = d; }
    prevDay = d;
  }
  let streak = 0; const cursor = new Date(); cursor.setHours(12, 0, 0, 0);
  if (!activeDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  const streakEnd = new Date(cursor);
  while (activeDays.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  const streakStart = new Date(cursor); streakStart.setDate(streakStart.getDate() + 1);
  const fmtDay = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  // Active days in the last 6 months.
  const sixAgo = new Date(now); sixAgo.setMonth(sixAgo.getMonth() - 6); sixAgo.setHours(0, 0, 0, 0);
  const windowDays = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(sixAgo.getFullYear(), sixAgo.getMonth(), sixAgo.getDate())) / 864e5) + 1;
  const active6 = sortedDays.filter((k) => new Date(k + 'T12:00:00') >= sixAgo).length;

  const deltaSub = addedLast > 0
    ? `<b>${addedMonth >= addedLast ? '+' : ''}${Math.round(((addedMonth - addedLast) / addedLast) * 100)}%</b> vs last month`
    : (addedMonth > 0 ? 'first adds this month' : 'none added last month either');
  const statCard = (lbl, num, sub) => `<div class="fid-stat"><div class="lbl">${lbl}</div><div class="num">${num}</div><div class="sub">${sub}</div></div>`;

  if (!state._insRange) state._insRange = 'year';
  if (!state._insType) state._insType = 'all';
  const rangeSel = state._insRange;
  const typeSel = state._insType;

  root().innerHTML = `
  <div class="page">
    <div class="page-head"><h1>Insights</h1></div>
    <div class="fid-stats">
      ${statCard('Total prompts', prompts.length, 'saved in your library')}
      ${statCard('Added this month', addedMonth, deltaSub)}
      ${statCard('Used this month', usedMonth, 'copies and opens in ' + esc(monthName))}
      ${statCard('Daily streak', streak + (streak === 1 ? ' day' : ' days'), 'best: ' + longest + (longest === 1 ? ' day' : ' days'))}
    </div>
    <div class="fid-panel">
      <div class="fid-panel-head">
        <h3>Activity</h3><p>Prompts added, edited and used</p>
        <span class="right" id="ins-filter-label"></span>
        <select class="fid-sort-select" id="ins-range" aria-label="Time range">
          <option value="year" ${rangeSel === 'year' ? 'selected' : ''}>This year</option>
          <option value="6m" ${rangeSel === '6m' ? 'selected' : ''}>Last 6 months</option>
          <option value="month" ${rangeSel === 'month' ? 'selected' : ''}>This month</option>
        </select>
        <select class="fid-sort-select" id="ins-type" aria-label="Activity type">
          <option value="all" ${typeSel === 'all' ? 'selected' : ''}>All activity</option>
          <option value="added" ${typeSel === 'added' ? 'selected' : ''}>Added</option>
          <option value="used" ${typeSel === 'used' ? 'selected' : ''}>Used</option>
          <option value="edited" ${typeSel === 'edited' ? 'selected' : ''}>Edited</option>
        </select>
      </div>
      <div class="fid-hm-scroll"><div style="width:max-content"><div class="fid-hm-months" id="hm-months"></div><div class="fid-hm-grid" id="heatmap"></div></div></div>
      <div class="fid-hm-legend">Less <span class="hm-cell"></span><span class="hm-cell l1"></span><span class="hm-cell l2"></span><span class="hm-cell l3"></span><span class="hm-cell l4"></span> More</div>
    </div>
    <div class="fid-stats">
      ${statCard('Current streak', streak + (streak === 1 ? ' day' : ' days'), streak > 0 ? esc(fmtDay(streakStart) + ' to today') : 'no streak yet')}
      ${statCard('Longest streak', longest + (longest === 1 ? ' day' : ' days'), longestEnd ? esc(longestEnd.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })) : 'no activity yet')}
      ${statCard('Active days last 6 months', active6, 'of ' + windowDays + ' days')}
      ${statCard('Edits this month', editedMonth, editedMonth > 0 ? 'across ' + editedPrompts + (editedPrompts === 1 ? ' prompt' : ' prompts') : 'no edits yet this month')}
    </div>
    <div class="fid-two-col">
      <div class="fid-panel">
        <div class="fid-panel-head"><h3>Weekly usage</h3><p>Last 8 weeks</p></div>
        <div class="fid-bars" id="ins-weekly"></div>
      </div>
      <div class="fid-panel">
        <div class="fid-panel-head"><h3>Most used prompts</h3><p>All time</p></div>
        <div id="ins-most"></div>
      </div>
    </div>
    <div class="fid-panel">
      <div class="fid-panel-head"><h3>Recent activity</h3></div>
      <div id="ins-recent"></div>
    </div>
  </div>`;

  // Filtered activity set: the heatmap AND the recent list both follow it.
  const rangeDays = { month: null, '6m': 182, year: null }[rangeSel];
  const rangeStart = rangeSel === 'month' ? monthStart
    : rangeSel === 'year' ? new Date(now.getFullYear(), 0, 1)
    : new Date(Date.now() - 182 * 864e5);
  void rangeDays;
  const filteredAct = act.filter((a) => new Date(a.at) >= rangeStart && (typeSel === 'all' || a.type === typeSel));

  // Heatmap: one column per week, 11px cells, month labels above.
  const counts = {};
  filteredAct.forEach((a) => { const k = dayKey(a.at); counts[k] = (counts[k] || 0) + 1; });
  const hm = document.getElementById('heatmap');
  const startDay = new Date(rangeStart); startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(now); endDay.setHours(0, 0, 0, 0);
  const pad = startDay.getDay();
  const totalDays = Math.round((endDay - startDay) / 864e5) + 1;
  const weeks = Math.ceil((pad + totalDays) / 7);
  let maxCount = 1;
  Object.values(counts).forEach((c) => { if (c > maxCount) maxCount = c; });
  let cells = '';
  for (let i = 0; i < pad; i++) cells += '<div class="hm-cell" style="visibility:hidden"></div>';
  let totalActions = 0;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDay); d.setDate(d.getDate() + i);
    const c = counts[dayKey(d)] || 0;
    totalActions += c;
    const lvl = c === 0 ? 0 : Math.max(1, Math.ceil((c / maxCount) * 4));
    cells += `<div class="hm-cell ${lvl ? 'l' + lvl : ''}" title="${esc(dayKey(d))}: ${c} activities"></div>`;
  }
  hm.innerHTML = cells;
  const monthsEl = document.getElementById('hm-months');
  monthsEl.style.width = (weeks * 14 - 3) + 'px';
  let mh = ''; let lastM = -1; let lastLeft = -100;
  for (let w = 0; w < weeks; w++) {
    const d = new Date(startDay); d.setDate(d.getDate() + Math.min(w * 7, totalDays - 1));
    if (d.getMonth() !== lastM) {
      if (w * 14 - lastLeft >= 30) { mh += `<span style="left:${w * 14}px">${d.toLocaleDateString(undefined, { month: 'short' })}</span>`; lastLeft = w * 14; }
      lastM = d.getMonth();
    }
  }
  monthsEl.innerHTML = mh;
  const rangeLabel = { year: 'This year', '6m': 'Last 6 months', month: 'This month' }[rangeSel];
  const typeLabel = { all: 'All activity', added: 'Added', used: 'Used', edited: 'Edited' }[typeSel];
  document.getElementById('ins-filter-label').innerHTML = `${esc(rangeLabel)} · ${esc(typeLabel)} · <b style="color:var(--ink)">${totalActions}</b> actions`;

  // Weekly usage: last 8 weeks, counts from activity.
  const weekBuckets = [];
  for (let i = 7; i >= 0; i--) {
    const wEnd = new Date(endDay); wEnd.setDate(wEnd.getDate() - i * 7);
    const wStart = new Date(wEnd); wStart.setDate(wStart.getDate() - 6);
    const c = act.filter((a) => { const d = new Date(a.at); return d >= wStart && d <= new Date(wEnd.getTime() + 864e5 - 1); }).length;
    weekBuckets.push({ label: fmtDay(wStart), count: c });
  }
  const wMax = Math.max(1, ...weekBuckets.map((w) => w.count));
  document.getElementById('ins-weekly').innerHTML = weekBuckets.map((w, i) =>
    `<div class="fid-bar-col"><b>${w.count}</b><div class="fid-bar ${i < 4 ? 'faint' : ''}" style="height:${Math.max(4, Math.round((w.count / wMax) * 110))}px"></div><span>${esc(w.label)}</span></div>`).join('');

  // Recent activity rows: icon chip + text + right-aligned time.
  const typeIcon = { added: ICONS.plus, used: ICONS.copy, edited: ICONS.note };
  const typeVerb = { added: 'Added', used: 'Used', edited: 'Edited' };
  const rows = filteredAct.slice(0, 20);
  document.getElementById('ins-recent').innerHTML = rows.length
    ? rows.map((a) => `<button class="fid-feed-row" data-open="${a.promptId || ''}"><span class="fic">${typeIcon[a.type] || ICONS.chart}</span><span>${esc(typeVerb[a.type] || a.type)} &ldquo;${esc(a.title || 'Prompt')}&rdquo;</span><time>${esc(fmtDate(a.at))}</time></button>`).join('')
    : '<p style="color:var(--ink-2);font-size:13.5px;margin:0">No activity in this range yet. Open or add a prompt and it will show up here.</p>';
  document.getElementById('ins-recent').querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.open && store.getPrompt(b.dataset.open)) openEditor(b.dataset.open, { onClose: () => navigate('insights') });
  }));
  document.getElementById('ins-range').addEventListener('change', (e) => { state._insRange = e.target.value; renderInsights(); });
  document.getElementById('ins-type').addEventListener('change', (e) => { state._insType = e.target.value; renderInsights(); });

  // Most used: ranked rows, numbered circles, uses from usageCount
  // (incremented on open/copy, as before).
  const most = [...prompts].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 6);
  document.getElementById('ins-most').innerHTML = most.length && most.some((pr) => pr.usageCount)
    ? most.filter((pr) => pr.usageCount).map((pr, i) => `<button class="fid-rank-row" data-open="${pr.id}"><span class="n">${i + 1}</span><span>${esc(pr.title)}</span><span class="u">&times;${pr.usageCount || 0} uses</span></button>`).join('')
    : '<p style="color:var(--ink-2);font-size:13.5px;margin:0">Open a few prompts and your most used ones will appear here.</p>';
  document.getElementById('ins-most').querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () =>
    openEditor(b.dataset.open, { onClose: () => navigate('insights') })));
}

// ---------- Import / Export ----------
function renderImportExport() {
  root().innerHTML = `
  <div class="page">
    <div class="page-head"><h1>Import / Export</h1></div>
    <div class="fid-two-col">
      <div class="fid-panel">
        <div class="fid-panel-head"><h3>Import</h3></div>
        <div class="fid-row"><div class="txt"><b>Prompt files (.txt / .md)</b><span>Each file becomes a prompt. Title comes from the file name.</span></div>
          <button class="btn" id="imp-files">Choose files</button></div>
        <div class="fid-row"><div class="txt"><b>Library backup (.json)</b><span>Restore a full export, including pins and history. Replaces the current library on this device. API keys are never included.</span></div>
          <button class="btn" id="imp-json">Choose backup</button></div>
      </div>
      <div class="fid-panel">
        <div class="fid-panel-head"><h3>Export</h3></div>
        <div class="fid-row"><div class="txt"><b>Full backup (.json)</b><span>Everything: prompts, notes, templates and activity. One file.</span></div>
          <button class="btn" id="exp-json">Download</button></div>
        <div class="fid-row"><div class="txt"><b>Prompts as .zip of .md files</b><span>One file per prompt, readable anywhere.</span></div>
          <button class="btn" id="exp-zip">Download</button></div>
      </div>
    </div>
  </div>`;
  document.getElementById('exp-json').addEventListener('click', () => {
    saveBlob(new Blob([store.exportPayload()], { type: 'application/json' }), 'prompt-vault-backup.json');
    toast('Backup downloaded');
  });
  document.getElementById('exp-zip').addEventListener('click', async () => {
    const blob = await makeZip();
    saveBlob(blob, 'prompt-vault-export.zip');
    toast('ZIP downloaded');
  });
  document.getElementById('imp-json').addEventListener('click', () => pickFiles('.json,application/json', async (files) => {
    try {
      const text = await files[0].text();
      if (!confirm('Importing a backup replaces your current library on this device. Continue?')) return;
      store.importPayload(text);
      toast('Backup imported');
      navigate('all');
    } catch (e) { alert('Import failed: ' + e.message); }
  }));
  document.getElementById('imp-files').addEventListener('click', () => importFileFlow());
}

function pickFiles(accept, cb, multiple = true) {
  const picker = document.getElementById('file-picker');
  picker.accept = accept; picker.multiple = multiple;
  picker.onchange = () => { if (picker.files.length) cb(picker.files); picker.value = ''; };
  picker.click();
}
function importFileFlow() {
  pickFiles('.txt,.md,.markdown,text/plain', async (files) => {
    let count = 0;
    for (const f of files) {
      const text = await f.text();
      const title = f.name.replace(/\.(txt|md|markdown)$/i, '');
      const html = text.split(/\n{2,}/).map((para) => `<p>${esc(para).replace(/\n/g, '<br>')}</p>`).join('');
      const p = {
        id: uid(), title, tabs: [{ id: uid(), name: 'Document', html }],
        activeTab: 0, pinned: false, createdAt: nowISO(), updatedAt: nowISO(), lastOpenedAt: nowISO(),
        usageCount: 0, deletedAt: null, page: { color: '', size: 'A4', orientation: 'portrait', margin: 'normal' },
      };
      store.data.prompts.unshift(p);
      store.logActivity('added', p.id, p.title);
      count++;
    }
    store.save();
    toast(count + ' file(s) imported');
    navigate('all');
  });
}

// Minimal stored ZIP writer (no compression) so ZIP export works offline
// with zero dependencies. Files are readable by any unzip tool.
async function makeZip() {
  const files = [
    { name: 'prompt-vault-backup.json', data: new TextEncoder().encode(store.exportPayload()) },
    ...store.activePrompts().map((p) => ({
      name: 'prompts/' + (p.title || 'untitled').replace(/[^\w\- ]+/g, '').trim().slice(0, 60) + '.txt',
      data: new TextEncoder().encode(promptText(p)),
    })),
  ];
  const encoder = new TextEncoder();
  let offset = 0; const chunks = []; const central = [];
  const crcTable = makeZip._t || (makeZip._t = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })());
  const crc32 = (buf) => { let c = 0xFFFFFFFF; for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  for (const f of files) {
    const nameBytes = encoder.encode(f.name);
    const crc = crc32(f.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true);
    local.setUint32(14, crc, true); local.setUint32(18, f.data.length, true); local.setUint32(22, f.data.length, true);
    local.setUint16(26, nameBytes.length, true);
    chunks.push(new Uint8Array(local.buffer), nameBytes, f.data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, f.data.length, true); cen.setUint32(24, f.data.length, true);
    cen.setUint16(28, nameBytes.length, true); cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), nameBytes);
    offset += 30 + nameBytes.length + f.data.length;
  }
  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true); end.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

// ---------- Trash ----------
function renderTrash() {
  const trashedP = store.trashedPrompts();
  const trashedN = store.data.notes.filter((n) => n.deletedAt);
  const hasItems = trashedP.length || trashedN.length;
  root().innerHTML = `
  <div class="page">
    <div class="page-head"><h1>Trash</h1><span class="toolbar-spacer"></span>${hasItems ? '<button class="btn danger" id="trash-empty">Empty trash</button>' : ''}</div>
    ${!hasItems ? emptyStateHTML('Trash is empty. Deleted prompts will land here.') : ''}
    ${trashedP.length ? `<div class="prompt-grid">${trashedP.map((p) => cardHTML(p, { trash: true })).join('')}</div>` : ''}
    ${trashedN.length ? `
      <div class="fid-tpl-group-head"><h3>Notes</h3></div>
      <div class="notes-grid">${trashedN.map((n) => `
        <div class="fid-note-trash-card">
          <h4>${esc(n.title || 'Untitled note')}</h4>
          <div class="fid-meta-row"><span class="fid-opened">${esc(fmtDate(n.deletedAt))}</span>
            <span class="trash-actions"><button class="btn small" data-restore-note="${n.id}">${ICONS.history} Restore</button><button class="btn small danger" data-kill-note="${n.id}">Delete forever</button></span></div>
        </div>`).join('')}</div>` : ''}
  </div>`;
  root().querySelectorAll('[data-restore]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const p = store.getPrompt(b.dataset.restore); p.deletedAt = null; store.save(); renderTrash(); }));
  root().querySelectorAll('[data-kill]').forEach((b) => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    const p = store.getPrompt(b.dataset.kill);
    if (p?.sharedFileId) {
      // A shared prompt still has a live public file in Drive. Deleting
      // forever must close that link too, which needs a signed-in app.
      if (!google.currentUser()) {
        alert('This prompt is shared. Sign in with Google first (Account & Sync), then delete it forever, so its share link can be closed as well.');
        return;
      }
      if (!confirm('Delete forever? Its share link will also be closed. This cannot be undone.')) return;
      try { await google.unpublishSharedPrompt(p); }
      catch (err) { alert('Could not close the share link: ' + err.message); return; }
    } else if (!confirm('Delete forever? This cannot be undone.')) return;
    store.data.prompts = store.data.prompts.filter((x) => x.id !== b.dataset.kill);
    store.save(); renderTrash();
  }));
  root().querySelectorAll('[data-restore-note]').forEach((b) => b.addEventListener('click', () => { const n = store.getNote(b.dataset.restoreNote); n.deletedAt = null; store.save(); renderTrash(); }));
  root().querySelectorAll('[data-kill-note]').forEach((b) => b.addEventListener('click', () => { if (confirm('Delete forever? This cannot be undone.')) { store.data.notes = store.data.notes.filter((n) => n.id !== b.dataset.killNote); store.save(); renderTrash(); } }));
  document.getElementById('trash-empty')?.addEventListener('click', async () => {
    if (!confirm('Empty the trash? Everything in it will be deleted forever. This cannot be undone.')) return;
    const kept = [];
    for (const p of store.trashedPrompts()) {
      if (p.sharedFileId) {
        // Same rule as single delete: a live share link must be closed
        // first, which needs a signed-in app.
        if (!google.currentUser()) { kept.push(p); continue; }
        try { await google.unpublishSharedPrompt(p); } catch { kept.push(p); }
      }
    }
    const keptIds = new Set(kept.map((p) => p.id));
    store.data.prompts = store.data.prompts.filter((p) => !p.deletedAt || keptIds.has(p.id));
    store.data.notes = store.data.notes.filter((n) => !n.deletedAt);
    store.save(); renderTrash();
    if (kept.length) alert(kept.length + ' shared prompt(s) were kept: sign in with Google so their share links can be closed, then delete them forever.');
    else toast('Trash emptied');
  });
}

// ---------- Account & Sync ----------
const GOOGLE_G_SVG = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.5 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.5 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>';
function renderAccount() {
  const user = google.currentUser();
  const settings = store.data.settings;
  const providerKeys = Object.keys(PROVIDERS);
  const activeP = state._accProvider || 'gemini';
  const saved = store.keys[activeP] || {};
  const fetched = saved.fetchedModels || [];
  const modelOptions = Array.from(new Set([...PROVIDERS[activeP].models, ...fetched]));
  const lastBackup = settings.lastBackupAt;
  const syncPill = !user
    ? '<span class="fid-status-pill off">Not signed in</span>'
    : lastBackup
      ? '<span class="fid-status-pill">Synced</span>'
      : '<span class="fid-status-pill">Signed in · no backup yet</span>';
  root().innerHTML = `
  <div class="page">
    <div class="page-head"><h1>Account &amp; Sync</h1></div>

    <div class="fid-panel">
      ${user ? `
        <div class="fid-acct-head">
          <div class="fid-avatar">${esc((user.name || user.email || 'G').slice(0, 1).toUpperCase())}</div>
          <div style="flex:1;min-width:200px">
            <h3>${esc(user.name || 'Signed in')}</h3>
            <p>${esc(user.email || '')} · Free plan</p>
          </div>
          <span class="fid-status-pill"><span class="pulse"></span> Signed in with Google</span>
          <button class="btn small" id="acc-signout">Sign out</button>
        </div>`
      : `
        <div class="fid-acct-head">
          <div class="fid-avatar out">${ICONS.user}</div>
          <div style="flex:1;min-width:200px">
            <h3>You're not signed in</h3>
            <p>Sign in with your Google account. Your library is backed up to your own Google Drive, so a lost or deleted library can always be brought back. Everything works offline without signing in.</p>
          </div>
        </div>
        <div style="margin-top:18px;display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          <button class="google-btn" id="acc-signin">${GOOGLE_G_SVG} Sign in with Google</button>
          <span style="font-size:12.5px;color:var(--ink-3);max-width:300px;line-height:1.5">Your prompts stay on this device until you sign in. Sync saves them to your Google Drive.</span>
        </div>
        <div id="acc-signin-msg" style="margin-top:12px"></div>
        ${google.hasBuiltInClient() ? '' : `<details style="margin-top:18px">
          <summary style="cursor:pointer;font-weight:600;font-size:14.5px">Google sign-in setup (one time, by the app owner)</summary>
          <p class="hint" style="margin-top:8px;color:var(--ink-2);font-size:13.5px">Google requires each app to use its own free OAuth client. In Google Cloud Console: create a project, enable the Google Drive API, create an OAuth client of type <b>Desktop app</b>, then paste its details here. Until this is set, sign-in cannot run, but every other feature works.</p>
          <div class="field"><label>OAuth Client ID</label><input type="text" id="acc-client-id" placeholder="...apps.googleusercontent.com" value="${esc(settings.googleClientId || '')}" /></div>
          <div class="field"><label>OAuth Client Secret (if your client has one)</label><input type="password" id="acc-client-secret" placeholder="Client secret" value="${esc(settings.googleClientSecret || '')}" /></div>
          <button class="btn" id="acc-save-client">Save setup</button>
        </details>`}`}
    </div>

    <div class="fid-panel">
      <div class="fid-panel-head"><h3>Cloud Sync</h3><p>Your library, backed up to Google Drive</p>
        <span class="right">${syncPill}</span>
      </div>
      <div class="fid-row"><div class="txt"><b>Automatic sync</b><span>Every change is backed up to your Google Drive as you work.</span></div>
        <button class="switch ${settings.autoSync ? 'on' : ''}" id="acc-autosync" aria-label="Toggle automatic sync"></button></div>
      <div class="fid-row"><div class="txt"><b>Sync now</b><span>${user ? (lastBackup ? 'Last backup: ' + esc(fmtDate(lastBackup)) : 'No backup yet. Run your first backup now.') : 'Sign in with Google to start backing up.'}</span></div>
        <button class="btn" id="acc-backup" ${user ? '' : 'disabled'}>Sync now</button></div>
      <div class="fid-row"><div class="txt"><b>Restore from backup</b><span>Pick a restore point from Google Drive and bring the whole library back.</span></div>
        <button class="btn" id="acc-restore" ${user ? '' : 'disabled'}>Restore</button></div>
      <div class="fid-row"><div class="txt"><b>Backup history</b><span>${lastBackup ? 'Last backup: ' + esc(fmtDate(lastBackup)) : 'No backups yet'}</span></div></div>
      <div id="acc-sync-msg" style="margin-top:10px"></div>
    </div>

    <div class="fid-panel" id="api-section">
      <div class="fid-panel-head"><h3>AI API Connection</h3><p>Powers semantic search, AI Chat and the editor AI panel</p></div>
      <p style="margin:0 0 14px;color:var(--ink-2);font-size:13.5px">Keys are stored only on this computer, in a separate file from your library, and are never included in Drive backups or exports. Each provider keeps its own key and model choice.</p>
      <div class="fid-api-grid">
        <div class="field"><label>Provider</label>
          <select id="acc-provider">${providerKeys.map((k) => `<option value="${k}" ${k === activeP ? 'selected' : ''}>${PROVIDERS[k].label}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Model</label>
          <div class="row-flex">
            <select id="acc-model" style="flex:1;min-width:160px">
              ${modelOptions.map((m) => `<option ${m === (saved.model || 'Latest') ? 'selected' : ''}>${esc(m)}</option>`).join('')}
            </select>
            <button class="btn small" id="acc-fetch-models" style="white-space:nowrap">Fetch models</button>
          </div>
          <div id="acc-fetch-msg"></div>
        </div>
      </div>
      <div class="field"><label>Custom model (optional, overrides the list)</label>
        <input type="text" id="acc-custom-model" placeholder="Type an exact model id" value="${esc(saved.customModel || '')}" />
      </div>
      <div class="field"><label>API key</label>
        <input type="password" id="acc-key" placeholder="${esc(PROVIDERS[activeP].keyPlaceholder)}" value="${esc(saved.key || '')}" />
      </div>
      <div class="row-flex">
        <button class="btn primary" id="acc-save-key">Save key</button>
        <button class="btn" id="acc-test-key">Test connection</button>
        <span class="fid-status-pill ${hasAnyKey() ? '' : 'off'}" id="acc-api-status">${hasAnyKey() ? 'Connected' : 'Not connected'}</span>
      </div>
    </div>

    <div class="fid-panel">
      <div class="fid-panel-head"><h3>Danger zone</h3></div>
      <div class="fid-row"><div class="txt"><b>Delete cloud data</b><span>Removes every backup from your account. Local library stays.</span></div>
        <button class="btn danger" id="acc-delete-cloud" disabled>Delete cloud data</button></div>
      <div class="fid-row"><div class="txt"><b>Erase local library</b><span>Erase the whole local library on this device. A Drive backup, if you made one, is not touched.</span></div>
        <button class="btn danger" id="acc-wipe">Erase local library</button></div>
      <p style="margin:10px 0 0;color:var(--ink-3);font-size:12.5px">Not available in this build yet</p>
    </div>

    <div class="fid-panel">
      <div class="fid-panel-head"><h3>Share viewer</h3></div>
      <p style="margin:0 0 14px;color:var(--ink-2);font-size:13.5px">Share links open in a small static viewer page (the <b>share-viewer</b> folder in the app repository). Host that folder anywhere static, for example GitHub Pages, and paste its address here once. Links then look like Google Docs share links: anyone can view, nobody needs the app or a login.</p>
      <div class="field"><label>Viewer address</label>
        <input type="text" id="acc-viewer-base" placeholder="https://your-name.github.io/prompt-vault/share-viewer/" value="${esc(settings.shareViewerBase || '')}" />
      </div>
      <button class="btn" id="acc-save-viewer">Save viewer address</button>
    </div>
  </div>`;

  // Account actions
  document.getElementById('acc-wipe')?.addEventListener('click', async () => {
    if (!confirm('Erase the whole local library? This cannot be undone.')) return;
    store.data.prompts = []; store.data.notes = []; store.data.activity = [];
    await store.saveNow();
    toast('Local library erased'); navigate('all');
  });
  document.getElementById('acc-save-viewer')?.addEventListener('click', () => {
    store.data.settings.shareViewerBase = document.getElementById('acc-viewer-base').value.trim();
    store.save(); toast('Viewer address saved');
  });
  document.getElementById('acc-save-client')?.addEventListener('click', () => {
    store.data.settings.googleClientId = document.getElementById('acc-client-id').value.trim();
    store.data.settings.googleClientSecret = document.getElementById('acc-client-secret').value.trim();
    store.save(); toast('Google setup saved');
  });
  document.getElementById('acc-signin')?.addEventListener('click', async () => {
    const msg = document.getElementById('acc-signin-msg');
    msg.innerHTML = '<span style="color:var(--ink-2)">Opening Google sign-in...</span>';
    try {
      const opener = window.__TAURI__?.plugins?.opener?.openUrl
        ? (u) => window.__TAURI__.plugins.opener.openUrl(u) : null;
      await google.signInWithGoogle(opener);
      updateSyncMini();
      toast('Signed in');
      // Automatic sync: a fresh sign-in backs up right away when it is on.
      if (store.data.settings.autoSync) {
        try { await google.backupToDrive(); updateSyncMini(); toast('Backup complete'); }
        catch (e) { toast('Signed in, but the first backup failed: ' + e.message); }
      }
      renderAccount();
    } catch (e) { msg.innerHTML = `<span style="color:var(--danger)">${esc(e.message)}</span>`; }
  });
  document.getElementById('acc-signout')?.addEventListener('click', async () => { await google.signOut(); updateSyncMini(); toast('Signed out'); renderAccount(); });
  document.getElementById('acc-autosync')?.addEventListener('click', async (e) => {
    const on = !store.data.settings.autoSync;
    store.data.settings.autoSync = on;
    store.save();
    e.currentTarget.classList.toggle('on', on);
    toast(on ? 'Automatic sync on' : 'Automatic sync off');
    if (on && google.currentUser()) {
      const msg = document.getElementById('acc-sync-msg');
      if (msg) msg.textContent = 'Backing up to Google Drive...';
      try { await google.backupToDrive(); updateSyncMini(); toast('Backup complete'); renderAccount(); }
      catch (err) { if (msg) msg.innerHTML = `<span style="color:var(--danger)">${esc(err.message)}</span>`; }
    }
  });
  document.getElementById('acc-backup')?.addEventListener('click', async () => {
    const msg = document.getElementById('acc-sync-msg');
    msg.textContent = 'Backing up to Google Drive...';
    try { await google.backupToDrive(); updateSyncMini(); toast('Backup complete'); renderAccount(); }
    catch (e) { msg.innerHTML = `<span style="color:var(--danger)">${esc(e.message)}</span>`; }
  });
  document.getElementById('acc-restore')?.addEventListener('click', async () => {
    if (!confirm('Restore replaces the library on this device with the Drive backup. Continue?')) return;
    const msg = document.getElementById('acc-sync-msg');
    msg.textContent = 'Restoring from Google Drive...';
    try { await google.restoreFromDrive(); updateSyncMini(); msg.innerHTML = '<span style="color:#2E9E5B">Restore complete.</span>'; navigate('all'); }
    catch (e) { msg.innerHTML = `<span style="color:var(--danger)">${esc(e.message)}</span>`; }
  });

  // API key section
  document.getElementById('acc-provider').addEventListener('change', (e) => { state._accProvider = e.target.value; renderAccount(); });
  document.getElementById('acc-save-key').addEventListener('click', async () => {
    const p = document.getElementById('acc-provider').value;
    store.keys[p] = {
      ...(store.keys[p] || {}),
      key: document.getElementById('acc-key').value.trim(),
      model: document.getElementById('acc-model').value,
      customModel: document.getElementById('acc-custom-model').value.trim(),
    };
    await store.saveKeys();
    toast('API settings saved');
    renderAccount();
  });
  document.getElementById('acc-test-key')?.addEventListener('click', async () => {
    const p = document.getElementById('acc-provider').value;
    const pill = document.getElementById('acc-api-status');
    const msg = document.getElementById('acc-fetch-msg');
    // Mirror the Fetch models flow: save the typed key first so the
    // test uses exactly what is in the field.
    store.keys[p] = { ...(store.keys[p] || {}), key: document.getElementById('acc-key').value.trim() };
    pill.textContent = 'Testing…'; pill.classList.remove('off');
    try {
      const models = await fetchModels(p);
      pill.textContent = 'Connected';
      msg.innerHTML = `<span style="color:#2E9E5B">Connection works. The provider returned ${models.length} models.</span>`;
      toast('Connection works');
    } catch (e) {
      pill.textContent = 'Connection failed'; pill.classList.add('off');
      msg.innerHTML = `<span style="color:var(--danger)">${esc(e.message)}</span>`;
      toast('Connection failed');
    }
  });
  document.getElementById('acc-fetch-models').addEventListener('click', async () => {
    const p = document.getElementById('acc-provider').value;
    const msg = document.getElementById('acc-fetch-msg');
    // save the typed key first so fetch uses it
    store.keys[p] = { ...(store.keys[p] || {}), key: document.getElementById('acc-key').value.trim() };
    msg.innerHTML = '<span style="color:var(--ink-2)">Fetching model list...</span>';
    try {
      const models = await fetchModels(p);
      store.keys[p].fetchedModels = models.slice(0, 300);
      await store.saveKeys();
      msg.innerHTML = `<span style="color:#2E9E5B">Fetched ${models.length} models. The list above is updated.</span>`;
      setTimeout(renderAccount, 600);
    } catch (e) { msg.innerHTML = `<span style="color:var(--danger)">${esc(e.message)}</span>`; }
  });
}

// ---------- Settings ----------
function switchRow(title, desc, on, id) {
  return `<div class="fid-row"><div class="txt"><b>${title}</b><span>${desc}</span></div>
    <button class="switch ${on ? 'on' : ''}" id="${id}" aria-label="Toggle ${title}"></button></div>`;
}
function bindSwitch(id, get, set) {
  document.getElementById(id)?.addEventListener('click', (e) => {
    const on = !get();
    set(on);
    store.save();
    e.currentTarget.classList.toggle('on', on);
  });
}
function renderSettings() {
  const s = store.data.settings;
  const themeVal = s.theme === 'system' || s.theme === 'dark' ? s.theme : 'light';
  root().innerHTML = `
  <div class="page">
    <div class="page-head"><h1>Settings</h1></div>

    <div class="fid-panel">
      <div class="fid-panel-head"><h3>Preferences</h3></div>
      ${switchRow('AI semantic search', 'Search by meaning using your connected API. Falls back to keyword search offline.', s.semanticSearch !== false, 'set-semantic')}
      ${switchRow('Fill variables before copying', 'Prompts with variables ask for values in a small form before copying.', s.fillVariables !== false, 'set-fillvars')}
      ${switchRow('Start with Windows', 'Launch quietly in the background so the library is always close by.', s.startWithWindows === true, 'set-startwin')}
      <div class="fid-row"><div class="txt"><b>Welcome guide</b><span>The short 4-step introduction to Prompt Vault.</span></div>
        <button class="btn" id="set-guide">View guide again</button></div>
    </div>

    <div class="fid-panel">
      <div class="fid-panel-head"><h3>Appearance</h3></div>
      <div class="fid-api-grid">
        <div class="field"><label>Theme</label>
          <select id="set-theme">
            <option value="system" ${themeVal === 'system' ? 'selected' : ''}>Follow system</option>
            <option value="light" ${themeVal === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${themeVal === 'dark' ? 'selected' : ''}>Dark</option>
          </select>
        </div>
        <div class="field"><label>Default font</label>
          <select id="set-font">${FONT_LIST.map((f) => `<option ${f === s.defaultFont ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select>
        </div>
      </div>
    </div>

    <div class="fid-panel">
      <div class="fid-panel-head"><h3>System</h3></div>
      <div class="fid-row"><div class="txt"><b>App version</b><span id="set-version">Prompt Vault 1.0.2</span></div>
        <button class="btn" id="set-check-updates">Check for updates</button></div>
      <div class="fid-row"><div class="txt"><b>Local database</b><span>Stored on this PC, works fully offline. Data folder: <span id="set-datapath">this device's app data folder</span></span></div>
        <button class="btn" id="set-open-folder">Open data folder</button></div>
      <div class="fid-row"><div class="txt"><b>Keyboard shortcuts</b><span>Ctrl K search · Ctrl N new prompt · Ctrl S save in the editor</span></div></div>
    </div>

    <div class="fid-panel">
      <div class="fid-panel-head"><h3>About the Developer</h3></div>
      <div class="row-flex">
        <button class="btn" id="dev-github">GitHub</button>
        <button class="btn" id="dev-site">Web</button>
      </div>
    </div>
  </div>`;
  bindSwitch('set-semantic', () => s.semanticSearch !== false, (on) => { s.semanticSearch = on; });
  bindSwitch('set-fillvars', () => s.fillVariables !== false, (on) => { s.fillVariables = on; });
  bindSwitch('set-startwin', () => s.startWithWindows === true, (on) => { s.startWithWindows = on; });
  document.getElementById('set-theme').addEventListener('change', (e) => { s.theme = e.target.value; store.save(); applyTheme(); });
  document.getElementById('set-font').addEventListener('change', (e) => { s.defaultFont = e.target.value; store.save(); applyTheme(); toast('Default font: ' + s.defaultFont); });
  document.getElementById('set-guide').addEventListener('click', () => showOnboarding(true));
  document.getElementById('set-check-updates').addEventListener('click', () => checkForUpdates({ manual: true }));
  currentVersion().then((v) => {
    const el = document.getElementById('set-version'); if (el) el.textContent = 'Prompt Vault ' + v;
  }).catch(() => {});
  const openExternal = async (url) => {
    try { await openUrl(url); }
    catch { window.open(url, '_blank', 'noopener'); }
  };
  document.getElementById('dev-github').addEventListener('click', () => openExternal('https://github.com/heyysam1'));
  document.getElementById('dev-site').addEventListener('click', () => openExternal('https://heyysami.bond'));
  let dataPath = '';
  if (window.__TAURI__?.core?.invoke) {
    window.__TAURI__.core.invoke('app_data_path').then((p) => {
      dataPath = p;
      const el = document.getElementById('set-datapath'); if (el) el.textContent = p;
    }).catch(() => {});
  }
  document.getElementById('set-open-folder')?.addEventListener('click', async () => {
    if (!dataPath) { toast('The data folder path is only available in the installed app'); return; }
    // No folder-opening mechanism existed in this build (the old About
    // card only displayed the path), so fall back to the existing
    // opener plugin, then to copying the path.
    try { await openUrl(dataPath); }
    catch {
      try { await navigator.clipboard.writeText(dataPath); toast('Data folder path copied'); }
      catch { toast('Data folder: ' + dataPath); }
    }
  });
}

boot();
