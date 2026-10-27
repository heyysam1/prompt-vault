import './style.css';
import { store, uid, nowISO, esc, fmtDate, highlight, plainText, promptHTML, promptText, FONT_LIST, PROVIDERS } from './store.js';
import { openEditor, closeEditor, toast } from './editor.js';
import { showOnboarding } from './onboarding.js';
import { scheduleUpdateCheck, checkForUpdates, currentVersion } from './updater.js';
import { openUrl } from '@tauri-apps/plugin-opener';
import { hasAnyKey, activeProvider, chat, fetchModels, semanticSearch, fuzzyScore, providerConfig } from './ai.js';
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
async function boot() {
  await store.init();
  applyTheme();
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

function applyTheme() {
  document.documentElement.dataset.theme = store.data.settings.theme || 'light';
  if (store.data.settings.defaultFont) {
    document.body.style.fontFamily = `'${store.data.settings.defaultFont}', 'Hind Siliguri', sans-serif`;
  }
}

function navigate(nav) {
  state.nav = nav;
  state.semanticResults = null;
  document.querySelectorAll('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === nav));
  document.getElementById('topbar-title').textContent =
    document.querySelector(`[data-nav="${nav}"]`)?.textContent.trim() || 'Prompt Vault';
  updateFabVisibility();
  ({ all: renderLibrary, pinned: renderLibrary, recent: renderRecent, aichat: renderAiChat,
     notes: renderNotes, templates: renderTemplates, insights: renderInsights,
     importexport: renderImportExport, trash: renderTrash, account: renderAccount,
     settings: renderSettings }[nav] || renderLibrary)();
}

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
function toggleFabMenu() {
  const menu = document.getElementById('fab-menu');
  const fab = document.getElementById('fab');
  const opening = menu.classList.contains('hidden');
  if (!opening) { menu.classList.add('hidden'); fab.classList.remove('open'); return; }
  if (state.nav === 'notes') {
    menu.innerHTML = `<button data-fab="note">🗒 New Note</button>`;
  } else {
    menu.innerHTML = `
      <button data-fab="blank">📄 Blank Prompt</button>
      <button data-fab="template">▤ From Template</button>
      <button data-fab="import">⇅ Import File</button>
      <button data-fab="note">🗒 New Note</button>`;
  }
  menu.classList.remove('hidden'); fab.classList.add('open');
  menu.querySelectorAll('[data-fab]').forEach((b) => b.addEventListener('click', () => {
    menu.classList.add('hidden'); fab.classList.remove('open');
    const a = b.dataset.fab;
    if (a === 'blank') createPrompt();
    else if (a === 'template') navigate('templates');
    else if (a === 'import') importFileFlow();
    else if (a === 'note') createNote();
  }));
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
    page: { color: '#FFFFFF', size: 'A4', orientation: 'portrait', margin: 'normal' },
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

// ---------- Library (All Prompts / Pinned) ----------
function renderLibrary() {
  const isPinnedPage = state.nav === 'pinned';
  root().innerHTML = `
  <div class="page">
    <div class="search-row">
      <div class="search-box"><span class="s-ic">⌕</span><input id="lib-search" type="text" placeholder="Search" value="${esc(state.query)}" /></div>
      ${state.nav === 'all' ? '<button class="btn primary" id="lib-new">New Prompt</button>' : ''}
    </div>
    <div class="library-toolbar">
      <select class="chip-select" id="lib-filter">
        <option value="all" ${state.filter === 'all' ? 'selected' : ''}>Filter: All</option>
        <option value="pinned" ${state.filter === 'pinned' ? 'selected' : ''}>Pinned</option>
        <option value="shared" ${state.filter === 'shared' ? 'selected' : ''}>Shared</option>
        <option value="images" ${state.filter === 'images' ? 'selected' : ''}>With images</option>
      </select>
      <select class="chip-select" id="lib-sort">
        <option value="opened" ${state.sort === 'opened' ? 'selected' : ''}>Sort: Last opened</option>
        <option value="edited" ${state.sort === 'edited' ? 'selected' : ''}>Recently edited</option>
        <option value="newest" ${state.sort === 'newest' ? 'selected' : ''}>Newest</option>
        <option value="oldest" ${state.sort === 'oldest' ? 'selected' : ''}>Oldest</option>
        <option value="az" ${state.sort === 'az' ? 'selected' : ''}>Name A-Z</option>
        <option value="za" ${state.sort === 'za' ? 'selected' : ''}>Name Z-A</option>
      </select>
      <span class="toolbar-spacer"></span>
      <select class="chip-select" id="lib-view">
        <option value="comfortable" ${state.view === 'comfortable' ? 'selected' : ''}>Comfortable</option>
        <option value="compact" ${state.view === 'compact' ? 'selected' : ''}>Compact</option>
        <option value="list" ${state.view === 'list' ? 'selected' : ''}>List</option>
      </select>
    </div>
    <div id="lib-grid"></div>
  </div>`;
  document.getElementById('lib-new')?.addEventListener('click', () => createPrompt());
  const search = document.getElementById('lib-search');
  let debounce;
  search.addEventListener('input', () => {
    state.query = search.value;
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      state.semanticResults = null;
      if (state.query.trim().length >= 4) {
        const base = filteredPrompts(false);
        try { state.semanticResults = await semanticSearch(state.query, base, promptText); } catch { state.semanticResults = null; }
      }
      drawGrid();
    }, 220);
    drawGrid();
  });
  document.getElementById('lib-filter').addEventListener('change', (e) => { state.filter = e.target.value; drawGrid(); });
  document.getElementById('lib-sort').addEventListener('change', (e) => { state.sort = e.target.value; drawGrid(); });
  document.getElementById('lib-view').addEventListener('change', (e) => { state.view = e.target.value; drawGrid(); });
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

function drawGrid() {
  const host = document.getElementById('lib-grid');
  if (!host) return;
  const list = filteredPrompts();
  if (!list.length) {
    const emptyMsg = state.query
      ? 'No prompts match your search.'
      : state.nav === 'pinned'
        ? 'No pinned prompts yet. Pin a prompt and it will show up here.'
        : 'No prompts yet. Create your first one with the New Prompt button, or tap the + button.';
    host.innerHTML = `<div class="empty-state"><span class="big">▦</span>${emptyMsg}</div>`;
    return;
  }
  const cls = state.view === 'compact' ? 'prompt-grid compact' : state.view === 'list' ? 'prompt-grid list' : 'prompt-grid';
  host.innerHTML = `<div class="${cls}">${list.map((p) => cardHTML(p)).join('')}</div>`;
  host.querySelectorAll('.prompt-card').forEach((card) => {
    const p = store.getPrompt(card.dataset.id);
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-act]')) return;
      openEditor(p.id, { onClose: () => navigate(state.nav) });
    });
    card.querySelector('[data-act="copy"]')?.addEventListener('click', (e) => { e.stopPropagation(); copyPromptText(p); });
    card.querySelector('[data-act="pin"]')?.addEventListener('click', (e) => { e.stopPropagation(); p.pinned = false; store.save(); drawGrid(); toast('Unpinned'); });
    card.querySelector('[data-act="menu"]')?.addEventListener('click', (e) => { e.stopPropagation(); promptMenu(p, e.clientX, e.clientY); });
  });
}

function cardHTML(p) {
  const text = promptText(p);
  const preview = state.query ? highlight(text.slice(0, 600), state.query) : esc(text.slice(0, 600)) || '<span style="color:var(--text-faint)">Empty prompt</span>';
  const previewHTML = state.query ? preview : esc(text.slice(0, 600));
  return `
  <article class="prompt-card" data-id="${p.id}">
    <div class="card-preview">${previewHTML || '<span style="color:var(--text-faint)">Empty prompt</span>'}</div>
    <div class="card-meta">
      <div class="card-title-row">
        <span class="card-title">${esc(p.title)}</span>
        ${p.pinned ? '<button class="icon-btn" data-act="pin" title="Unpin"><span class="pin-ic">📌</span></button>' : ''}
        <button class="icon-btn" data-act="copy" title="Copy prompt">⧉</button>
        <button class="icon-btn" data-act="menu" title="More">⋮</button>
      </div>
      <div class="card-date">${fmtDate(p.lastOpenedAt)}</div>
    </div>
  </article>`;
}

async function copyPromptText(p) {
  try { await navigator.clipboard.writeText(promptText(p)); toast('Copied'); }
  catch { toast('Copy failed in this environment'); }
  store.logActivity('used', p.id, p.title);
}

// ---------- three-dot menu / downloads / share ----------
function promptMenu(p, x, y, opts = {}) {
  window.__pvCloseMenus();
  const menu = document.createElement('div');
  menu.className = 'pop-menu pv-menu';
  menu.innerHTML = `
    <button data-m="open">Open</button>
    <button data-m="copy">Copy</button>
    <button data-m="share">Share</button>
    <button data-m="pin">${p.pinned ? 'Unpin' : 'Pin'}</button>
    <button data-m="download">Download ▸</button>
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
function drawGridOrRefresh() { if (state.nav === 'all' || state.nav === 'pinned') drawGrid(); else if (state.nav === 'recent') renderRecent(); else if (state.nav === 'trash') renderTrash(); }

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
function renderRecent() {
  const list = [...store.activePrompts()].sort((a, b) => new Date(b.lastOpenedAt) - new Date(a.lastOpenedAt)).slice(0, 30);
  root().innerHTML = `
  <div class="page">
    <div class="page-head"><h1>Recent</h1></div>
    ${list.length ? `<div class="prompt-grid">${list.map((p) => cardHTML(p)).join('')}</div>`
      : '<div class="empty-state"><span class="big">🕘</span>No prompts opened yet.</div>'}
  </div>`;
  root().querySelectorAll('.prompt-card').forEach((card) => {
    const p = store.getPrompt(card.dataset.id);
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-act]')) return;
      openEditor(p.id, { onClose: () => navigate('recent') });
    });
    card.querySelector('[data-act="copy"]')?.addEventListener('click', (e) => { e.stopPropagation(); copyPromptText(p); });
    card.querySelector('[data-act="pin"]')?.addEventListener('click', (e) => { e.stopPropagation(); p.pinned = false; store.save(); renderRecent(); });
    card.querySelector('[data-act="menu"]')?.addEventListener('click', (e) => { e.stopPropagation(); promptMenu(p, e.clientX, e.clientY); });
  });
}

// ---------- AI Chat page ----------
function renderAiChat() {
  if (!hasAnyKey()) {
    root().innerHTML = `
    <div class="page">
      <div class="page-head"><h1>AI Chat</h1></div>
      <div class="form-card" style="text-align:center;padding:44px 24px">
        <div style="font-size:34px" class="ai-sparkle">✦</div>
        <h3>Connect your AI to start chatting</h3>
        <p class="hint">AI Chat, the editor assistant and meaning-based search all run on your own API key. Your key stays on this computer and is never synced.</p>
        <button class="btn primary" id="aichat-connect">Connect API</button>
      </div>
    </div>`;
    document.getElementById('aichat-connect').addEventListener('click', () => navigate('account'));
    return;
  }
  const provider = activeProvider();
  root().innerHTML = `
  <div class="page chat-page" style="height:calc(100vh - 120px)">
    <div class="page-head"><h1>AI Chat</h1><span class="act-badge">${esc(PROVIDERS[provider].label)} · ${esc(providerConfig(provider).display)}</span></div>
    <div class="chat-scroll" id="chat-scroll">
      <div class="ai-msg bot">Ask me anything, or describe a prompt you are looking for, like "a prompt that makes study notes", and I will find matching cards from your library.</div>
    </div>
    <div class="chat-input-bar">
      <div class="ai-input-row">
        <textarea id="chat-input" rows="1" placeholder="Message or describe a prompt..."></textarea>
        <button class="btn primary" id="chat-send">Send</button>
      </div>
    </div>
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
  document.getElementById('chat-send').addEventListener('click', send);
  document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
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
        <p>${esc(n.body || '')}</p>
        <div class="card-date">${fmtDate(n.updatedAt)}</div>
      </button>`).join('')}</div>`
    : '<div class="empty-state"><span class="big">🗒</span>No notes yet. Jot down ideas, drafts and anything that is not a prompt yet.</div>'}
  </div>`;
  document.getElementById('note-new').addEventListener('click', createNote);
  root().querySelectorAll('.note-card').forEach((c) => c.addEventListener('click', () => openNote(c.dataset.id)));
  updateFabVisibility();
}

function openNote(id) {
  const n = store.getNote(id);
  if (!n) return;
  const view = document.getElementById('note-view');
  view.innerHTML = `
    <div class="ed-header">
      <div class="ed-row1">
        <button class="btn" id="note-back">← Back</button>
        <span style="flex:1"></span>
        <button class="btn danger" id="note-delete">Delete</button>
      </div>
    </div>
    <div class="ed-scroll">
      <div class="note-paper">
        <input class="note-title-input" id="note-title" value="${esc(n.title)}" placeholder="Note title" />
        <textarea class="note-body-input" id="note-body" placeholder="Write your note...">${esc(n.body)}</textarea>
      </div>
    </div>`;
  view.classList.remove('hidden');
  document.getElementById('fab-wrap').classList.add('hidden');
  const save = () => {
    n.title = document.getElementById('note-title').value;
    n.body = document.getElementById('note-body').value;
    n.updatedAt = nowISO();
    store.save(); // silent autosave
  };
  view.querySelector('#note-title').addEventListener('input', save);
  view.querySelector('#note-body').addEventListener('input', save);
  view.querySelector('#note-back').addEventListener('click', async () => {
    save(); await store.saveNow();
    view.classList.add('hidden');
    toast('Saved');
    navigate('notes');
  });
  view.querySelector('#note-delete').addEventListener('click', () => {
    n.deletedAt = nowISO(); store.save();
    view.classList.add('hidden');
    toast('Note moved to Trash'); navigate('notes');
  });
}

// ---------- Templates ----------
// Display-only transform for template gallery cards and the preview page:
// each image slot shows its bundled stock picture (public/stock/, works
// offline) so the template looks complete. The stored template body keeps
// the empty slot; the stock picture is never saved into user data.
function tplDisplayHTML(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html || '';
  wrap.querySelectorAll('[data-image-slot]').forEach((slot) => {
    const stock = slot.getAttribute('data-stock') || 'scene';
    slot.removeAttribute('style');
    slot.style.cssText = 'border-radius:10px;overflow:hidden;line-height:0';
    slot.innerHTML = `<img src="stock/${stock}.svg" alt="" style="display:block;width:100%;height:auto" />`;
  });
  return wrap.innerHTML;
}
const GROUP_COLORS = { Image: '#D97706', Video: '#DB2777', Writing: '#7C3AED', Coding: '#1A56DB', Marketing: '#DB2777', Study: '#059669', 'Image & Video': '#D97706', Business: '#0F766E' };
function renderTemplates() {
  const groups = [];
  for (const t of store.data.templates) if (!groups.includes(t.group)) groups.push(t.group);
  root().innerHTML = `
  <div class="page">
    <div class="page-head"><h1>Templates</h1><span class="toolbar-spacer"></span><button class="btn primary" id="tpl-create">Create template</button></div>
    <p class="page-sub">Click any template to preview it in full, then use it as a new prompt.</p>
    ${groups.map((g) => `
      <div class="tpl-group-head"><span class="tpl-dot" style="background:${GROUP_COLORS[g] || '#1A56DB'}"></span>${esc(g)}</div>
      <div class="tpl-grid">
        ${store.data.templates.filter((t) => t.group === g).map((t) => `
          <button class="tpl-card" data-id="${t.id}"><div class="tpl-mini"><div class="tpl-mini-inner">${tplDisplayHTML(t.body)}</div></div><h3>${esc(t.title)}</h3></button>`).join('')}
      </div>`).join('')}
  </div>`;
  root().querySelectorAll('.tpl-card').forEach((c) => c.addEventListener('click', () => openTemplatePreview(c.dataset.id)));
  document.getElementById('tpl-create').addEventListener('click', () => {
    const title = prompt('Template title:');
    if (!title) return;
    const group = prompt('Group name:', 'My Templates') || 'My Templates';
    const t = { id: uid(), group, color: GROUP_COLORS[group] || '#1A56DB', title, body: '<p>Write the template content here, then edit it any time from a prompt.</p>', custom: true };
    store.data.templates.push(t);
    store.save();
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
        <button class="btn" id="tpl-back">← Back</button>
        <span style="flex:1"></span>
        ${t.custom ? '<button class="btn danger" id="tpl-delete">Delete template</button>' : ''}
        <button class="btn primary" id="tpl-use">Use template</button>
      </div>
    </div>
    <div class="ed-scroll">
      <div style="max-width:920px;margin:16px auto 6px">
        <div class="tpl-group-head" style="margin:0 0 6px"><span class="tpl-dot" style="background:${GROUP_COLORS[t.group] || t.color || '#1A56DB'}"></span>${esc(t.group)}</div>
        <h1 style="margin:0 0 4px;font-size:28px">${esc(t.title)}</h1>
      </div>
      <div class="ed-paper" style="min-height:400px">${tplDisplayHTML(t.body)}</div>
    </div>`;
  view.classList.remove('hidden');
  document.getElementById('fab-wrap').classList.add('hidden');
  view.querySelector('#tpl-back').addEventListener('click', () => { view.classList.add('hidden'); navigate('templates'); });
  view.querySelector('#tpl-use').addEventListener('click', () => {
    view.classList.add('hidden');
    createPrompt({ title: t.title, html: t.body });
  });
  view.querySelector('#tpl-delete')?.addEventListener('click', () => {
    store.data.templates = store.data.templates.filter((x) => x.id !== id);
    store.save(); view.classList.add('hidden'); navigate('templates'); toast('Template deleted');
  });
}

// ---------- Insights ----------
function renderInsights() {
  const prompts = store.activePrompts();
  const act = store.data.activity;
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const inMonth = (iso) => new Date(iso) >= thisMonth;
  const addedMonth = act.filter((a) => a.type === 'added' && inMonth(a.at)).length || prompts.filter((p) => inMonth(p.createdAt)).length;
  const usedMonth = act.filter((a) => a.type === 'used' && inMonth(a.at)).length;
  const editedMonth = act.filter((a) => a.type === 'edited' && inMonth(a.at)).length;

  // streak + heatmap from real activity dates (plus prompt created/opened dates)
  const dayKey = (d) => d.toISOString().slice(0, 10);
  const activeDays = new Set(act.map((a) => dayKey(new Date(a.at))));
  prompts.forEach((p) => { activeDays.add(dayKey(new Date(p.createdAt))); });
  let streak = 0; const cursor = new Date();
  if (!activeDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (activeDays.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }

  const rangeSel = state._insRange || 'month';
  const typeSel = state._insType || 'all';
  root().innerHTML = `
  <div class="page">
    <div class="page-head"><h1>Insights</h1></div>
    <div class="stat-grid">
      <div class="stat-card"><div class="num">${prompts.length}</div><div class="lbl">Total prompts</div></div>
      <div class="stat-card"><div class="num">${addedMonth}</div><div class="lbl">Added this month</div></div>
      <div class="stat-card"><div class="num">${usedMonth}</div><div class="lbl">Used this month</div></div>
      <div class="stat-card"><div class="num">${streak} day${streak === 1 ? '' : 's'}</div><div class="lbl">Current streak · ${editedMonth} edits this month</div></div>
    </div>
    <div class="panel">
      <h3>Activity</h3>
      <div class="heatmap" id="heatmap"></div>
      <div class="row-flex" style="margin-top:14px">
        <select class="chip-select" id="ins-range">
          <option value="month" ${rangeSel === 'month' ? 'selected' : ''}>This month</option>
          <option value="3m" ${rangeSel === '3m' ? 'selected' : ''}>Last 3 months</option>
          <option value="6m" ${rangeSel === '6m' ? 'selected' : ''}>Last 6 months</option>
          <option value="year" ${rangeSel === 'year' ? 'selected' : ''}>This year</option>
        </select>
        <select class="chip-select" id="ins-type">
          <option value="all" ${typeSel === 'all' ? 'selected' : ''}>All activity</option>
          <option value="added" ${typeSel === 'added' ? 'selected' : ''}>Added</option>
          <option value="used" ${typeSel === 'used' ? 'selected' : ''}>Used</option>
          <option value="edited" ${typeSel === 'edited' ? 'selected' : ''}>Edited</option>
        </select>
      </div>
      <div id="ins-recent" style="margin-top:8px"></div>
    </div>
    <div class="panel">
      <h3>Most Used</h3>
      <div id="ins-most"></div>
    </div>
  </div>`;

  // heatmap: last 26 weeks, GitHub style columns of 7 days
  const counts = {};
  act.forEach((a) => { const k = dayKey(new Date(a.at)); counts[k] = (counts[k] || 0) + 1; });
  prompts.forEach((p) => { const k = dayKey(new Date(p.createdAt)); counts[k] = (counts[k] || 0) + 1; });
  const hm = document.getElementById('heatmap');
  const end = new Date(); end.setHours(0, 0, 0, 0);
  const start = new Date(end); start.setDate(start.getDate() - 26 * 7 + 1);
  let cells = '';
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const c = counts[dayKey(d)] || 0;
    const lvl = c === 0 ? 0 : c <= 1 ? 1 : c <= 3 ? 2 : c <= 6 ? 3 : 4;
    cells += `<div class="hm-cell ${lvl ? 'hm-' + lvl : ''}" title="${dayKey(d)}: ${c} activities"></div>`;
  }
  hm.innerHTML = cells;

  const drawRecent = () => {
    const days = { month: 31, '3m': 92, '6m': 183, year: 366 }[state._insRange || 'month'];
    const since = Date.now() - days * 864e5;
    const rows = act.filter((a) => new Date(a.at).getTime() >= since && ((state._insType || 'all') === 'all' || a.type === state._insType)).slice(0, 20);
    document.getElementById('ins-recent').innerHTML = rows.length
      ? rows.map((a) => `<button class="activity-row" data-open="${a.promptId || ''}"><span class="act-badge">${esc(a.type)}</span>${esc(a.title || 'Prompt')}<span class="when">${fmtDate(a.at)}</span></button>`).join('')
      : '<p style="color:var(--text-soft)">No activity in this range yet. Open or add a prompt and it will show up here.</p>';
    document.getElementById('ins-recent').querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.open && store.getPrompt(b.dataset.open)) openEditor(b.dataset.open, { onClose: () => navigate('insights') });
    }));
  };
  drawRecent();
  document.getElementById('ins-range').addEventListener('change', (e) => { state._insRange = e.target.value; drawRecent(); });
  document.getElementById('ins-type').addEventListener('change', (e) => { state._insType = e.target.value; drawRecent(); });

  const most = [...prompts].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 6);
  document.getElementById('ins-most').innerHTML = most.length && most.some((p) => p.usageCount)
    ? most.map((p) => `<button class="activity-row" data-open="${p.id}">${esc(p.title)}<span class="when">used ${p.usageCount || 0} times</span></button>`).join('')
    : '<p style="color:var(--text-soft)">Open a few prompts and your most used ones will appear here.</p>';
  document.getElementById('ins-most').querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () =>
    openEditor(b.dataset.open, { onClose: () => navigate('insights') })));
}

// ---------- Import / Export ----------
function renderImportExport() {
  root().innerHTML = `
  <div class="page">
    <div class="page-head"><h1>Import / Export</h1></div>
    <div class="form-card">
      <h3>Export your library</h3>
      <p class="hint">Download everything (prompts, notes, templates and activity) as one JSON backup, or as a ZIP-style bundle file. API keys are never included in exports.</p>
      <div class="row-flex">
        <button class="btn primary" id="exp-json">Export JSON</button>
        <button class="btn" id="exp-zip">Export ZIP</button>
      </div>
    </div>
    <div class="form-card">
      <h3>Import</h3>
      <p class="hint">Import a Prompt Vault JSON backup (replaces the current library), or add prompts from TXT / Markdown files.</p>
      <div class="row-flex">
        <button class="btn" id="imp-json">Import JSON backup</button>
        <button class="btn" id="imp-files">Import TXT / MD files</button>
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
        usageCount: 0, deletedAt: null, page: { color: '#FFFFFF', size: 'A4', orientation: 'portrait', margin: 'normal' },
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
  root().innerHTML = `
  <div class="page">
    <div class="page-head"><h1>Trash</h1></div>
    ${!trashedP.length && !trashedN.length ? '<div class="empty-state"><span class="big">🗑</span>Trash is empty.</div>' : ''}
    ${trashedP.map((p) => `
      <div class="activity-row" style="cursor:default">
        <span>📄 ${esc(p.title)}</span><span class="when">${fmtDate(p.deletedAt)}</span>
        <button class="btn" data-restore="${p.id}">Restore</button>
        <button class="btn danger" data-kill="${p.id}">Delete forever</button>
      </div>`).join('')}
    ${trashedN.map((n) => `
      <div class="activity-row" style="cursor:default">
        <span>🗒 ${esc(n.title || 'Untitled note')}</span><span class="when">${fmtDate(n.deletedAt)}</span>
        <button class="btn" data-restore-note="${n.id}">Restore</button>
        <button class="btn danger" data-kill-note="${n.id}">Delete forever</button>
      </div>`).join('')}
  </div>`;
  root().querySelectorAll('[data-restore]').forEach((b) => b.addEventListener('click', () => { const p = store.getPrompt(b.dataset.restore); p.deletedAt = null; store.save(); renderTrash(); }));
  root().querySelectorAll('[data-kill]').forEach((b) => b.addEventListener('click', async () => {
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
      catch (e) { alert('Could not close the share link: ' + e.message); return; }
    } else if (!confirm('Delete forever? This cannot be undone.')) return;
    store.data.prompts = store.data.prompts.filter((x) => x.id !== b.dataset.kill);
    store.save(); renderTrash();
  }));
  root().querySelectorAll('[data-restore-note]').forEach((b) => b.addEventListener('click', () => { const n = store.getNote(b.dataset.restoreNote); n.deletedAt = null; store.save(); renderTrash(); }));
  root().querySelectorAll('[data-kill-note]').forEach((b) => b.addEventListener('click', () => { if (confirm('Delete forever? This cannot be undone.')) { store.data.notes = store.data.notes.filter((n) => n.id !== b.dataset.killNote); store.save(); renderTrash(); } }));
}

// ---------- Account & Sync ----------
function renderAccount() {
  const user = google.currentUser();
  const providerKeys = Object.keys(PROVIDERS);
  const activeP = state._accProvider || 'gemini';
  const saved = store.keys[activeP] || {};
  const fetched = saved.fetchedModels || [];
  const modelOptions = Array.from(new Set([...PROVIDERS[activeP].models, ...fetched]));
  root().innerHTML = `
  <div class="page">
    <div class="page-head"><h1>Account &amp; Sync</h1></div>

    <div class="form-card">
      <h3>Google account</h3>
      ${user ? `
        <div class="row-flex">
          <div class="avatar-circle">${esc((user.name || user.email || 'G').slice(0, 1).toUpperCase())}</div>
          <div><b>${esc(user.name || 'Signed in')}</b><br/><span style="color:var(--text-soft)">${esc(user.email || '')}</span></div>
        </div>
        <p class="hint" style="margin-top:14px">Your library backs up to your own Google Drive (private app folder). ${store.data.settings.lastBackupAt ? 'Last backup: ' + fmtDate(store.data.settings.lastBackupAt) : 'No backup yet.'}</p>
        <div class="row-flex">
          <button class="btn primary" id="acc-backup">Back up now</button>
          <button class="btn" id="acc-restore">Restore from Drive</button>
          <button class="btn ghost" id="acc-signout">Sign out</button>
        </div>
        <div id="acc-sync-msg" style="margin-top:10px"></div>`
      : `
        <p class="hint">You are signed out. Sign in with Google to back up your library to your Google Drive and restore it on any computer. Everything works offline without signing in.</p>
        <button class="google-btn" id="acc-signin"><span class="g">G</span> Sign in with Google</button>
        <div id="acc-signin-msg" style="margin-top:12px"></div>
        <details style="margin-top:18px">
          <summary style="cursor:pointer;font-weight:600;font-size:14.5px">Google sign-in setup (one time, by the app owner)</summary>
          <p class="hint" style="margin-top:8px">Google requires each app to use its own free OAuth client. In Google Cloud Console: create a project, enable the Google Drive API, create an OAuth client of type <b>Desktop app</b>, then paste its details here. Until this is set, sign-in cannot run, but every other feature works.</p>
          <div class="field"><label>OAuth Client ID</label><input type="text" id="acc-client-id" placeholder="...apps.googleusercontent.com" value="${esc(store.data.settings.googleClientId || '')}" /></div>
          <div class="field"><label>OAuth Client Secret (if your client has one)</label><input type="password" id="acc-client-secret" placeholder="Client secret" value="${esc(store.data.settings.googleClientSecret || '')}" /></div>
          <button class="btn" id="acc-save-client">Save setup</button>
        </details>`}
    </div>

    <div class="form-card">
      <h3>Share viewer</h3>
      <p class="hint">Share links open in a small static viewer page (the <b>share-viewer</b> folder in the app repository). Host that folder anywhere static, for example GitHub Pages, and paste its address here once. Links then look like Google Docs share links: anyone can view, nobody needs the app or a login.</p>
      <div class="field"><label>Viewer address</label>
        <input type="text" id="acc-viewer-base" placeholder="https://your-name.github.io/prompt-vault/share-viewer/" value="${esc(store.data.settings.shareViewerBase || '')}" />
      </div>
      <button class="btn" id="acc-save-viewer">Save viewer address</button>
    </div>

    <div class="form-card" id="api-section">
      <h3>AI API keys</h3>
      <p class="hint">Keys are stored only on this computer, in a separate file from your library, and are never included in Drive backups or exports. Each provider keeps its own key and model choice.</p>
      <div class="field"><label>Provider</label>
        <select id="acc-provider">${providerKeys.map((k) => `<option value="${k}" ${k === activeP ? 'selected' : ''}>${PROVIDERS[k].label}</option>`).join('')}</select>
      </div>
      <div class="field"><label>API key</label>
        <input type="password" id="acc-key" placeholder="${esc(PROVIDERS[activeP].keyPlaceholder)}" value="${esc(saved.key || '')}" />
      </div>
      <div class="field"><label>Model</label>
        <div class="row-flex">
          <select id="acc-model" style="flex:1;min-width:200px">
            ${modelOptions.map((m) => `<option ${m === (saved.model || 'Latest') ? 'selected' : ''}>${esc(m)}</option>`).join('')}
          </select>
          <button class="btn" id="acc-fetch-models">Fetch models</button>
        </div>
        <div id="acc-fetch-msg"></div>
      </div>
      <div class="field"><label>Custom model (optional, overrides the list)</label>
        <input type="text" id="acc-custom-model" placeholder="Type an exact model id" value="${esc(saved.customModel || '')}" />
      </div>
      <div class="row-flex">
        <button class="btn primary" id="acc-save-key">Save API settings</button>
        <span class="status-line">${hasAnyKey() ? '<span class="dot-on"></span> AI connected' : '<span class="dot-off"></span> No AI connected'}</span>
      </div>
    </div>
  </div>`;

  // Account actions
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
    msg.innerHTML = '<span style="color:var(--text-soft)">Opening Google sign-in...</span>';
    try {
      const opener = window.__TAURI__?.plugins?.opener?.openUrl
        ? (u) => window.__TAURI__.plugins.opener.openUrl(u) : null;
      await google.signInWithGoogle(opener);
      toast('Signed in'); renderAccount();
    } catch (e) { msg.innerHTML = `<span style="color:var(--danger)">${esc(e.message)}</span>`; }
  });
  document.getElementById('acc-signout')?.addEventListener('click', async () => { await google.signOut(); toast('Signed out'); renderAccount(); });
  document.getElementById('acc-backup')?.addEventListener('click', async () => {
    const msg = document.getElementById('acc-sync-msg');
    msg.textContent = 'Backing up to Google Drive...';
    try { await google.backupToDrive(); msg.innerHTML = '<span style="color:#2E9E5B">Backup complete.</span>'; }
    catch (e) { msg.innerHTML = `<span style="color:var(--danger)">${esc(e.message)}</span>`; }
  });
  document.getElementById('acc-restore')?.addEventListener('click', async () => {
    if (!confirm('Restore replaces the library on this device with the Drive backup. Continue?')) return;
    const msg = document.getElementById('acc-sync-msg');
    msg.textContent = 'Restoring from Google Drive...';
    try { await google.restoreFromDrive(); msg.innerHTML = '<span style="color:#2E9E5B">Restore complete.</span>'; navigate('all'); }
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
  document.getElementById('acc-fetch-models').addEventListener('click', async () => {
    const p = document.getElementById('acc-provider').value;
    const msg = document.getElementById('acc-fetch-msg');
    // save the typed key first so fetch uses it
    store.keys[p] = { ...(store.keys[p] || {}), key: document.getElementById('acc-key').value.trim() };
    msg.innerHTML = '<span style="color:var(--text-soft)">Fetching model list...</span>';
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
function renderSettings() {
  const s = store.data.settings;
  root().innerHTML = `
  <div class="page">
    <div class="page-head"><h1>Settings</h1></div>
    <div class="form-card">
      <h3>Appearance</h3>
      <div class="field"><label>Theme</label>
        <select id="set-theme">
          <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light (cream)</option>
          <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark (neutral)</option>
        </select>
      </div>
      <div class="field"><label>Default font</label>
        <select id="set-font">${FONT_LIST.map((f) => `<option ${f === s.defaultFont ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-card">
      <h3>Welcome guide</h3>
      <p class="hint">The short introduction that appears the first time Prompt Vault is opened.</p>
      <button class="btn" id="set-guide">View guide again</button>
    </div>
    <div class="form-card">
      <h3>About</h3>
      <p class="hint"><span id="set-version">Prompt Vault 0.1.0</span> · Your personal prompt library.<br/>Data folder: <span id="set-datapath">this device's app data folder</span><br/>Your library, notes, templates and activity are stored locally and work fully offline. API keys are kept in a separate local file and are never synced or exported.</p>
      <button class="btn" id="set-check-updates" style="margin-top:10px">Check for updates</button>
    </div>
    <div class="form-card">
      <h3>Danger zone</h3>
      <p class="hint">Erase the whole local library on this device. A Drive backup, if you made one, is not touched.</p>
      <button class="btn danger" id="set-wipe">Erase local library</button>
    </div>
    <div class="form-card" style="margin-top:34px">
      <h3 style="font-size:15px;color:var(--text-soft)">About the Developer</h3>
      <div class="row-flex" style="margin-top:6px">
        <button class="btn" id="dev-github">GitHub <span style="color:var(--text-faint)">↗</span></button>
        <button class="btn" id="dev-site">Web <span style="color:var(--text-faint)">↗</span></button>
      </div>
    </div>
  </div>`;
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
  document.getElementById('set-wipe').addEventListener('click', async () => {
    if (!confirm('Erase the whole local library? This cannot be undone.')) return;
    store.data.prompts = []; store.data.notes = []; store.data.activity = [];
    await store.saveNow();
    toast('Local library erased'); navigate('all');
  });
  if (window.__TAURI__?.core?.invoke) {
    window.__TAURI__.core.invoke('app_data_path').then((p) => {
      const el = document.getElementById('set-datapath'); if (el) el.textContent = p;
    }).catch(() => {});
  }
}

boot();
