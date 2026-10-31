import './fidelity-editor.css';
// Full-page Google Docs style editor for one prompt — design port of the
// approved prototype (editorPage in the prototype index.html).
// - Header row 1: back arrow, 26px logo, title (17px/600), pin SVG,
//   cloud-check "Saved" status, history, dots menu, Share pill, gradient AI sparkle
// - Menu row: File, Edit, View, Insert, Format, AI only
// - Pill toolbar with prototype SVG icons, left tabs/outline panel,
//   silent autosave, "Saved" toast only when leaving, per-prompt page setup.
// Also exports openNoteEditor(noteId): the prototype notePage chrome
// (full-page editor with menus + pill toolbar + themed 880px paper)
// rendered into #note-view.

import { store, uid, nowISO, esc, plainText, promptHTML, FONT_LIST } from './store.js';
import { chat, hasAnyKey, activeProvider } from './ai.js';
import { ICONS } from './icons.js';

// The prototype's AI mark: a two-sparkle shape filled with a
// blue -> indigo -> violet gradient. Built as a dedicated inline SVG
// with the prototype's path data (not ICONS.sparkle, which is flat).
function sparkleGradient(size = 27, gradId = 'pvSparkGrad') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="${gradId}" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2E7CF6"/><stop offset=".55" stop-color="#5B5BD6"/><stop offset="1" stop-color="#9333EA"/></linearGradient></defs><path fill="url(#${gradId})" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path fill="url(#${gradId})" d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/></svg>`;
}

// Prototype toolbar icons not carried in icons.js (16px stroke SVGs,
// path data copied from the prototype toolbar).
const svg16 = (inner) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const TB = {
  table: svg16('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'),
  alignLeft: svg16('<path d="M3 6h18M3 12h10M3 18h14"/>'),
  alignCenter: svg16('<path d="M3 6h18M6 12h12M4 18h16"/>'),
  alignRight: svg16('<path d="M3 6h18M11 12h10M7 18h14"/>'),
  bullet: svg16('<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none"/>'),
  numbered: svg16('<path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>'),
  checklist: svg16('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 5.5l1.2 1.2L7 4.5M3.5 11.5l1.2 1.2L7 10.5M3.5 17.5l1.2 1.2L7 16.5"/>'),
  clear: svg16('<path d="M4 7V5h16v2M9 20h6M12 5v15"/><path d="M4 4l16 16" stroke="var(--danger)"/>'),
  hilite: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4l-3-3L9 11z"/><path d="M9 11l-5.5 5.5a2.1 2.1 0 0 0 3 3L12 14"/><path d="M3 21h18"/></svg>',
};

// One pill toolbar, shared by the prompt editor (prefix "tb") and the
// note editor (prefix "nt") so both carry the prototype's SVG icon set.
function buildToolbarHTML(pfx, { zoom = 100, font = 'Inter' } = {}) {
  return `
      <button data-cmd="undo" title="Undo">${ICONS.undo}</button>
      <button data-cmd="redo" title="Redo">${ICONS.redo}</button>
      <span class="sep"></span>
      <select id="${pfx}-zoom" title="Zoom">
        ${[50, 75, 100, 125, 150].map((z) => `<option value="${z}" ${z === zoom ? 'selected' : ''}>${z}%</option>`).join('')}
      </select>
      <span class="sep"></span>
      <select id="${pfx}-style" title="Text style">
        <option value="p">Normal text</option><option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option><option value="h3">Heading 3</option>
        <option value="blockquote">Quote</option>
      </select>
      <select id="${pfx}-font" title="Font" style="max-width:150px">
        ${fontOptions(font)}
      </select>
      <span class="sep"></span>
      <button id="${pfx}-size-minus">−</button>
      <input class="font-size-box" id="${pfx}-size" type="text" value="16" />
      <button id="${pfx}-size-plus">+</button>
      <span class="sep"></span>
      <button data-cmd="bold" title="Bold"><b>B</b></button>
      <button data-cmd="italic" title="Italic"><i>I</i></button>
      <button data-cmd="underline" title="Underline"><u>U</u></button>
      <button data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
      <label class="tb-color-lbl" title="Text colour"><span class="tc-a">A</span><input type="color" id="${pfx}-color" value="${document.documentElement.dataset.theme === 'dark' ? '#FFFFFF' : '#000000'}" /></label>
      <label class="tb-color-lbl" title="Highlight colour">${TB.hilite}<input type="color" id="${pfx}-hilite" value="#FDE047" /></label>
      <span class="sep"></span>
      <button id="${pfx}-link" title="Insert link">${ICONS.link}</button>
      <button id="${pfx}-image" title="Insert image">${ICONS.image}</button>
      <button id="${pfx}-table" title="Insert table">${TB.table}</button>
      <span class="sep"></span>
      <button data-cmd="justifyLeft" title="Align left">${TB.alignLeft}</button>
      <button data-cmd="justifyCenter" title="Centre">${TB.alignCenter}</button>
      <button data-cmd="justifyRight" title="Align right">${TB.alignRight}</button>
      <button data-cmd="insertUnorderedList" title="Bullet list">${TB.bullet}</button>
      <button data-cmd="insertOrderedList" title="Numbered list">${TB.numbered}</button>
      <button id="${pfx}-check" title="Checklist">${TB.checklist}</button>
      <button data-cmd="removeFormat" title="Clear formatting">${TB.clear}</button>
      <span class="sep"></span>
      <select id="${pfx}-mode" title="Mode"><option value="editing">Editing</option><option value="viewing">Viewing</option></select>`;
}

let current = null;   // prompt object being edited
let renderedPromptId = null; // prompt whose HTML is currently in #ed-paper
let onCloseCb = null;
let aiOpen = false;
let imgBarEl = null;
let linkCardEl = null;
let sideQuery = '';
// Left panel collapsible sections: both start open, toggle independently.
// Kept in module state so re-rendering the panel never resets them.
let outlineOpen = true;
let promptsOpen = true;

export function openEditor(promptId, opts = {}) {
  const p = store.getPrompt(promptId);
  if (!p) return;
  current = p;
  onCloseCb = opts.onClose || null;
  p.lastOpenedAt = nowISO();
  p.usageCount = (p.usageCount || 0) + 1;
  store.logActivity('used', p.id, p.title);
  store.save();
  aiOpen = false;
  render();
  document.getElementById('editor-view').classList.remove('hidden');
  document.getElementById('fab-wrap').classList.add('hidden');
  // Mouse side-button history (main.js) tracks full-screen locations.
  window.dispatchEvent(new CustomEvent('pv:loc', { detail: { kind: 'editor', id: promptId } }));
}

export function closeEditor(showToast = true) {
  if (markEdited._dt) { clearTimeout(markEdited._dt); markEdited._dt = null; }
  syncFromDOM();
  store.saveNow();
  document.getElementById('editor-view').classList.add('hidden');
  hideImgBar(); hideLinkCard();
  current = null;
  renderedPromptId = null;
  window.dispatchEvent(new CustomEvent('pv:editor-closed'));
  if (showToast) toast('Saved');
  if (onCloseCb) onCloseCb();
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.add('hidden'), 2200);
}
export { toast };

function activeTabObj() {
  return current.tabs[current.activeTab || 0] || current.tabs[0];
}

function syncFromDOM() {
  if (!current) return;
  const paper = document.getElementById('ed-paper');
  const title = document.getElementById('ed-title-input');
  if (paper) activeTabObj().html = paper.innerHTML;
  if (title) current.title = title.value.trim() || 'Untitled prompt';
  current.updatedAt = nowISO();
}

// Header save affordance: cloud-check + "Saved" at rest, accent-coloured
// while an edit is being saved (the prototype's saving state; its wording
// stays "Saved").
function setSaveSaving(saving) {
  const el = document.getElementById('ed-save-status');
  if (el) el.classList.toggle('saving', !!saving);
}

// Autosave is debounced (Sami, 2026-10-28): syncing the DOM on EVERY
// input event meant serialising the whole document and rebuilding the
// outline per keystroke, which lagged badly on large prompts and on
// bulk changes (select a big section, recolour it). Now an edit only
// lights the saving indicator at once; the actual sync + save + outline
// runs once, 700ms after the last change. Anything that needs the
// stored HTML immediately (closing, switching tabs, re-rendering)
// flushes the pending edit first, so nothing is ever lost.
function markEdited() {
  if (!current) return;
  setSaveSaving(true);
  clearTimeout(markEdited._st);
  markEdited._st = setTimeout(() => setSaveSaving(false), 900);
  clearTimeout(markEdited._dt);
  markEdited._dt = setTimeout(() => { markEdited._dt = null; flushEdited(); }, 700);
}
function flushEdited() {
  if (markEdited._dt) { clearTimeout(markEdited._dt); markEdited._dt = null; }
  if (!current || !document.getElementById('ed-paper')) return;
  syncFromDOM();
  if (!markEdited._logged) {
    store.logActivity('edited', current.id, current.title);
    markEdited._logged = true;
    setTimeout(() => (markEdited._logged = false), 30000);
  }
  store.save(); // silent autosave, no "Saving..." text anywhere
  buildOutline();
}

function render() {
  const p = current;
  // Re-rendering the prompt that is already on screen (pin toggle,
  // page setup): flush any debounced edit first so the fresh DOM is
  // built from the latest text, not the last saved copy.
  if (p && renderedPromptId === p.id && document.getElementById('ed-paper')) flushEdited();
  const root = document.getElementById('editor-view');
  const tab = activeTabObj();
  const zoom = p._zoom || 100;
  root.innerHTML = `
  <div class="ed-header">
    <div class="ed-row1">
      <button class="icon-btn ed-back-btn" id="ed-back" title="Back to library" aria-label="Back to library">${ICONS.back}</button>
      <img src="/logo.png" class="ed-logo" alt="" />
      <input id="ed-title-input" class="ed-title" value="${esc(p.title)}" placeholder="Untitled prompt" />
      <button class="icon-btn ed-pin-btn ${p.pinned ? 'pinned' : ''}" id="ed-pin" title="${p.pinned ? 'Pinned. Click to unpin' : 'Pin this prompt'}" aria-label="Pin this prompt">${ICONS.pin}</button>
      <span class="save-status" id="ed-save-status">${ICONS.cloudCheck}<span>Saved</span></span>
      <span style="flex:1"></span>
      <button class="icon-btn ed-history-btn" id="ed-history" title="Created ${new Date(p.createdAt).toLocaleString()}" aria-label="Version history">${ICONS.history}</button>
      <button class="icon-btn ed-menu-btn" id="ed-menu" title="More actions" aria-label="More actions">${ICONS.dots}</button>
      <button class="share-pill" id="ed-share">${ICONS.globe}<span>Share</span></button>
      <button class="ai-spark-btn" id="ed-ai-toggle" title="AI Assistant" aria-label="AI Assistant">${sparkleGradient(27, 'pvSparkGrad')}</button>
    </div>
    <div class="ed-menus" id="ed-menus">
      ${['File', 'Edit', 'View', 'Insert', 'Format', 'AI'].map((m) => `<button data-menu="${m}">${m}</button>`).join('')}
    </div>
    <div class="ed-toolbar" id="ed-toolbar">
      ${buildToolbarHTML('tb', { zoom, font: p._font || store.data.settings.defaultFont || 'Inter' })}
    </div>
  </div>
  <div class="ed-body">
    <aside class="ed-side" id="ed-side"></aside>
    <button class="btn small side-show-btn hidden" id="ed-side-show" title="Show panel">Show panel</button>
    <div class="ed-scroll" id="ed-scroll">
      <div class="ed-paper" id="ed-paper" contenteditable="true" spellcheck="false"
        style="font-family:${cssFont(p._font || store.data.settings.defaultFont || 'Inter')};zoom:${zoom / 100}">${tab.html || ''}</div>
    </div>
    <aside class="ed-ai-panel hidden" id="ed-ai-panel"></aside>
  </div>`;

  wire();
  enhanceImageSlots();
  renderSide();
  renderAiPanel();
  applyPageSetup();
  renderedPromptId = p.id;
}

function fontOptions(selected) {
  const systemFonts = (navigator.fonts && window.__pvSystemFonts) || [];
  const all = Array.from(new Set([...FONT_LIST, ...systemFonts]));
  return all.map((f) => `<option value="${esc(f)}" ${f === selected ? 'selected' : ''}>${esc(f)}</option>`).join('');
}
function cssFont(f) { return `'${String(f).replace(/'/g, '')}', sans-serif`; }

function textOnColor(hex) {
  const c = String(hex).replace('#', '');
  if (c.length !== 6) return '#2B2520';
  const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.45 ? '#F5F1EA' : '#2B2520';
}

function setSideHidden(hidden) {
  const side = document.getElementById('ed-side');
  const show = document.getElementById('ed-side-show');
  side?.classList.toggle('pv-side-hidden', !!hidden);
  show?.classList.toggle('hidden', !hidden);
}

function applySideFilter() {
  const side = document.getElementById('ed-side');
  if (!side) return;
  const q = sideQuery.trim().toLowerCase();
  side.querySelectorAll('#side-tabs [data-tab], .side-prompt, .outline-item').forEach((el) => {
    el.style.display = !q || el.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function renderSide() {
  const side = document.getElementById('ed-side');
  if (!side || !current) return;
  const others = store.activePrompts().filter((x) => x.id !== current.id);
  side.innerHTML = `
    <div class="side-search-box">${ICONS.search}<input id="side-search" type="text" placeholder="Search prompts" autocomplete="off" value="${esc(sideQuery)}" /></div>
    <div>
      <div class="side-head-row"><span class="side-head">Tabs</span><button class="tab-add-btn" id="tab-add" title="Add a new tab" aria-label="Add a new tab">${ICONS.plus}</button></div>
      <div id="side-tabs">
        ${current.tabs.map((t, i) => `
          <div class="doc-tab ${i === (current.activeTab || 0) ? 'active' : ''}" data-tab="${i}" role="button" tabindex="0">
            <span class="tab-name">${esc(t.name)}</span>
            <button class="tab-dots" data-tabdots="${i}" title="Tab options" aria-label="Tab options">${ICONS.dotsHorizontal}</button>
          </div>`).join('')}
      </div>
    </div>
    <div>
      <h4 class="side-section-head ${outlineOpen ? '' : 'collapsed'}" id="head-outline" title="Show or hide the outline">
        <span>Outline</span><span class="chev">${ICONS.chevronDown}</span>
      </h4>
      <div class="side-collapse ${outlineOpen ? '' : 'closed'}" id="collapse-outline">
        <div class="side-collapse-inner"><div id="side-outline"></div></div>
      </div>
    </div>
    <div>
      <h4 class="side-section-head ${promptsOpen ? '' : 'collapsed'}" id="head-prompts" title="Show or hide the prompt list">
        <span>Prompts</span><span class="chev">${ICONS.chevronDown}</span>
      </h4>
      <div class="side-collapse ${promptsOpen ? '' : 'closed'}" id="collapse-prompts">
        <div class="side-collapse-inner">
          ${others.slice(0, 30).map((o) => `<button class="side-prompt" data-open="${o.id}">${o.pinned ? `<span class="pin-mini">${ICONS.pin}</span>` : ''}${esc(o.title)}</button>`).join('') || '<p style="color:var(--text-faint);font-size:13px;padding:0 10px">No other prompts yet</p>'}
        </div>
      </div>
    </div>
    <button class="btn small" id="side-hide" style="align-self:flex-start">Hide panel</button>`;
  buildOutline();
  // Collapsible headings: click toggles only that section, smoothly.
  const bindCollapse = (headId, boxId, get, set) => {
    const head = side.querySelector(headId);
    const box = side.querySelector(boxId);
    head?.addEventListener('click', () => {
      const open = !get();
      set(open);
      box.classList.toggle('closed', !open);
      head.classList.toggle('collapsed', !open);
    });
  };
  bindCollapse('#head-outline', '#collapse-outline', () => outlineOpen, (v) => (outlineOpen = v));
  bindCollapse('#head-prompts', '#collapse-prompts', () => promptsOpen, (v) => (promptsOpen = v));
  side.querySelectorAll('[data-tab]').forEach((row) => row.addEventListener('click', (e) => {
    if (e.target.closest('[data-tabdots]') || e.target.closest('input')) return;
    syncFromDOM();
    current.activeTab = Number(row.dataset.tab);
    store.save();
    render();
  }));
  side.querySelectorAll('[data-tab]').forEach((row) => row.addEventListener('dblclick', (e) => {
    if (e.target.closest('[data-tabdots]')) return;
    startTabRename(row, Number(row.dataset.tab));
  }));
  side.querySelectorAll('[data-tabdots]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    openTabMenu(b, Number(b.dataset.tabdots));
  }));
  side.querySelector('#tab-add')?.addEventListener('click', () => {
    syncFromDOM();
    current.tabs.push({ id: uid(), name: 'Document ' + (current.tabs.length + 1), html: '' });
    current.activeTab = current.tabs.length - 1;
    store.save(); render();
  });
  side.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
    syncFromDOM(); store.saveNow();
    openEditor(b.dataset.open, { onClose: onCloseCb });
  }));
  side.querySelector('#side-hide')?.addEventListener('click', () => setSideHidden(true));
  // Keep the show affordance in sync with the panel's current state.
  document.getElementById('ed-side-show')?.classList.toggle('hidden', !side.classList.contains('pv-side-hidden'));
  side.querySelector('#side-search')?.addEventListener('input', (e) => {
    sideQuery = e.target.value;
    applySideFilter();
  });
  applySideFilter();
}

function startTabRename(row, idx) {
  if (!current || !current.tabs[idx]) return;
  const span = row.querySelector('.tab-name');
  if (!span) return;
  const input = document.createElement('input');
  input.className = 'tab-name-input';
  input.value = current.tabs[idx].name;
  input.setAttribute('aria-label', 'Tab name');
  span.replaceWith(input);
  input.focus(); input.select();
  let done = false;
  const commit = (save) => {
    if (done) return; done = true;
    const v = input.value.trim();
    if (save && v) { current.tabs[idx].name = v; store.save(); }
    renderSide();
  };
  input.addEventListener('blur', () => commit(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(true); }
    if (e.key === 'Escape') commit(false);
    e.stopPropagation();
  });
  input.addEventListener('click', (e) => e.stopPropagation());
  input.addEventListener('dblclick', (e) => e.stopPropagation());
}

function openTabMenu(btn, idx) {
  window.__pvCloseMenus?.();
  const menu = document.createElement('div');
  menu.className = 'pop-menu pv-menu';
  menu.innerHTML = `<button data-tm="rename">Rename tab</button>` +
    (current.tabs.length > 1 ? `<button data-tm="delete" class="danger">Delete tab</button>` : '');
  document.body.appendChild(menu);
  const r = btn.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 210)) + 'px';
  menu.style.top = Math.min(r.bottom + 6, window.innerHeight - 130) + 'px';
  menu.querySelector('[data-tm="rename"]').addEventListener('click', () => {
    window.__pvCloseMenus?.();
    const row = document.querySelector(`#side-tabs [data-tab="${idx}"]`);
    if (row) startTabRename(row, idx);
  });
  menu.querySelector('[data-tm="delete"]')?.addEventListener('click', () => {
    window.__pvCloseMenus?.();
    if (!confirm('Delete this document tab?')) return;
    syncFromDOM();
    current.tabs.splice(idx, 1);
    current.activeTab = 0;
    store.save(); render();
  });
}

function buildOutline() {
  const box = document.getElementById('side-outline');
  const paper = document.getElementById('ed-paper');
  if (!box || !paper) return;
  const heads = paper.querySelectorAll('h1,h2,h3');
  box.innerHTML = heads.length
    ? Array.from(heads).map((h, i) => `<button class="outline-item" data-h="${i}" style="padding-left:${10 + (Number(h.tagName[1]) - 1) * 12}px">${esc(h.textContent || 'Heading')}</button>`).join('')
    : '<p style="color:var(--text-faint);font-size:13px;padding:0 10px">Add a heading to see the outline</p>';
  box.querySelectorAll('[data-h]').forEach((b) => b.addEventListener('click', () => {
    heads[Number(b.dataset.h)]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  applySideFilter();
}

function renderAiPanel() {
  const panel = document.getElementById('ed-ai-panel');
  if (!panel) return;
  panel.classList.toggle('hidden', !aiOpen);
  if (!aiOpen) return;
  const aiHead = `<div class="ai-head"><span class="ai-spark-ic">${ICONS.sparkle}</span> AI Assistant <span style="flex:1"></span><button class="icon-btn" id="ai-close" title="Close">${ICONS.x}</button></div>`;
  if (!hasAnyKey()) {
    panel.innerHTML = `
      ${aiHead}
      <div class="ai-gate">
        <p>AI features need your own API key.<br/>Add one once and the assistant, AI Chat and meaning-based search all switch on.</p>
        <button class="btn primary" id="ai-connect">Connect API</button>
      </div>`;
    panel.querySelector('#ai-close').addEventListener('click', () => { aiOpen = false; renderAiPanel(); });
    panel.querySelector('#ai-connect').addEventListener('click', () => {
      closeEditor(false);
      window.__pvNavigate?.('account');
    });
    return;
  }
  const provider = activeProvider();
  panel.innerHTML = `
    ${aiHead}
    <div class="ai-messages" id="ai-msgs">
      <div class="ai-msg bot">Connected. Ask me to improve, shorten, or rewrite this prompt, or anything else.</div>
    </div>
    <div class="row-flex" style="padding:0 12px 8px">
      <button class="btn small" data-quick="improve">Improve</button>
      <button class="btn small" data-quick="shorten">Shorten</button>
      <button class="btn small" data-quick="rewrite">Rewrite</button>
      <button class="btn small" data-quick="translate">Translate to Bangla</button>
      <button class="btn small" data-quick="variables">Add variables</button>
    </div>
    <div class="ai-input-row">
      <textarea id="ai-input" rows="2" placeholder="Ask AI about this prompt..."></textarea>
      <button class="btn primary" id="ai-send">Send</button>
    </div>`;
  panel.querySelector('#ai-close').addEventListener('click', () => { aiOpen = false; renderAiPanel(); });
  const send = async (preset) => {
    const input = panel.querySelector('#ai-input');
    const msgs = panel.querySelector('#ai-msgs');
    const text = preset || input.value.trim();
    if (!text) return;
    const userMsg = preset
      ? {
          improve: 'Improve this prompt and return the improved version.',
          shorten: 'Shorten this prompt without losing meaning.',
          rewrite: 'Rewrite this prompt in a clearer structure.',
          translate: 'Translate this prompt to Bangla and return the translation.',
          variables: 'Add [variable] placeholders to this prompt for the parts that change each time, and return the result.',
        }[preset]
      : text;
    msgs.insertAdjacentHTML('beforeend', `<div class="ai-msg user">${esc(userMsg)}</div>`);
    if (!preset) input.value = '';
    msgs.scrollTop = msgs.scrollHeight;
    const wait = document.createElement('div');
    wait.className = 'ai-msg bot'; wait.textContent = 'Thinking...';
    msgs.appendChild(wait);
    try {
      const reply = await chat(provider, [
        { role: 'system', content: 'You help improve AI prompts. Be concise and practical.' },
        { role: 'user', content: 'Current prompt titled "' + current.title + '":\n\n' + plainText(activeTabObj().html) + '\n\nRequest: ' + userMsg },
      ]);
      wait.textContent = reply || '(empty reply)';
    } catch (e) {
      wait.textContent = 'Could not reach the AI: ' + e.message;
    }
    msgs.scrollTop = msgs.scrollHeight;
  };
  panel.querySelector('#ai-send').addEventListener('click', () => send());
  panel.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => send(b.dataset.quick)));
}

// Whole colour control clickable, selection preserved (Sami,
// 2026-10-28): the toolbar colour control is a label holding an "A"
// (or highlight icon) plus the colour input swatch. Clicking only the
// swatch used to work; clicking the letter stole focus, collapsed the
// editor selection and applied nothing. Now a mousedown anywhere on
// the label captures the selection first and opens the picker, the
// label's own activation is suppressed so the picker opens once, and
// every picker input restores the captured range before applying, so
// the selected text stays selected and takes the new colour.
function bindColorControl(editableEl, inputEl, applyFn, afterFn) {
  if (!inputEl || !editableEl) return;
  const lbl = inputEl.closest('.tb-color-lbl');
  let range = null;
  const capture = () => {
    const s = window.getSelection();
    if (s && s.rangeCount && editableEl.contains(s.anchorNode)) range = s.getRangeAt(0).cloneRange();
  };
  editableEl.addEventListener('mouseup', capture);
  editableEl.addEventListener('keyup', capture);
  if (lbl) {
    lbl.addEventListener('mousedown', (e) => {
      capture();
      if (e.target !== inputEl) { e.preventDefault(); inputEl.click(); }
    });
    lbl.addEventListener('click', (e) => { if (e.target !== inputEl) e.preventDefault(); });
  }
  inputEl.addEventListener('input', () => {
    editableEl.focus();
    if (range) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(range); }
    applyFn(inputEl.value);
    if (afterFn) afterFn();
    capture();
  });
}

function wire() {
  const p = current;
  const paper = document.getElementById('ed-paper');
  // If the app loses focus mid-edit (user switches away), flush the
  // debounced autosave instead of waiting for the timer.
  if (!wire._blurBound) {
    wire._blurBound = true;
    window.addEventListener('blur', () => { if (markEdited._dt) flushEdited(); });
  }
  document.getElementById('ed-back').addEventListener('click', () => closeEditor(true));
  document.getElementById('ed-title-input').addEventListener('input', markEdited);
  document.getElementById('ed-pin').addEventListener('click', () => { p.pinned = !p.pinned; store.save(); render(); });
  document.getElementById('ed-ai-toggle').addEventListener('click', () => { aiOpen = !aiOpen; renderAiPanel(); });
  document.getElementById('ed-share').addEventListener('click', () => window.__pvSharePrompt?.(p));
  document.getElementById('ed-menu').addEventListener('click', (e) => {
    window.__pvPromptMenu?.(p, e.clientX, e.clientY, { fromEditor: true });
  });
  document.getElementById('ed-side-show')?.addEventListener('click', () => setSideHidden(false));
  paper.addEventListener('input', markEdited);
  paper.addEventListener('click', (e) => {
    const slot = e.target.closest('[data-image-slot]');
    if (slot) { e.preventDefault(); hideImgBar(); pickImageForSlot(slot); return; }
    const img = e.target.closest('img');
    if (img) { selectImage(img); return; }
    hideImgBar();
    const a = e.target.closest('a');
    if (a) { showLinkCard(a, e); } else hideLinkCard();
  });
  paper.addEventListener('mouseover', (e) => {
    const a = e.target.closest('a');
    if (a && (e.ctrlKey || e.metaKey)) showLinkCard(a, e);
  });
  // Image slots (from templates): drag an image file over a slot to fill it.
  paper.addEventListener('dragover', (e) => {
    const slot = e.target.closest?.('[data-image-slot]');
    if (slot && e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      slot.classList.add('drag-over');
    }
  });
  paper.addEventListener('dragleave', (e) => {
    const slot = e.target.closest?.('[data-image-slot]');
    if (slot && !slot.contains(e.relatedTarget)) slot.classList.remove('drag-over');
  });
  paper.addEventListener('drop', (e) => {
    const slot = e.target.closest?.('[data-image-slot]');
    if (!slot) return;
    e.preventDefault();
    slot.classList.remove('drag-over');
    const file = Array.from(e.dataTransfer?.files || []).find((f) => f.type.startsWith('image/'));
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => fillImageSlot(slot, reader.result, file.name);
    reader.readAsDataURL(file);
  });

  // Toolbar
  document.querySelectorAll('#ed-toolbar [data-cmd]').forEach((b) =>
    b.addEventListener('click', () => { document.execCommand(b.dataset.cmd); paper.focus(); markEdited(); })
  );
  document.getElementById('tb-zoom').addEventListener('change', (e) => {
    p._zoom = Number(e.target.value); paper.style.zoom = p._zoom / 100;
  });
  document.getElementById('tb-style').addEventListener('change', (e) => {
    document.execCommand('formatBlock', false, e.target.value); paper.focus();
  });
  document.getElementById('tb-font').addEventListener('change', (e) => {
    p._font = e.target.value;
    paper.style.fontFamily = cssFont(p._font);
    document.execCommand('fontName', false, p._font);
  });
  const sizeInput = document.getElementById('tb-size');
  const applySize = (delta) => {
    let v = parseInt(sizeInput.value || '16', 10) + delta;
    v = Math.max(8, Math.min(72, v));
    sizeInput.value = v;
    document.execCommand('fontSize', false, '7');
    paper.querySelectorAll('font[size="7"]').forEach((f) => { f.removeAttribute('size'); f.style.fontSize = v + 'px'; });
    markEdited();
  };
  document.getElementById('tb-size-minus').addEventListener('click', () => applySize(-1));
  document.getElementById('tb-size-plus').addEventListener('click', () => applySize(1));
  bindColorControl(paper, document.getElementById('tb-color'),
    (v) => document.execCommand('foreColor', false, v), markEdited);
  bindColorControl(paper, document.getElementById('tb-hilite'),
    (v) => { document.execCommand('hiliteColor', false, v) || document.execCommand('backColor', false, v); }, markEdited);
  document.getElementById('tb-link').addEventListener('click', () => openLinkPrompt());
  document.getElementById('tb-image').addEventListener('click', pickImage);
  document.getElementById('tb-table').addEventListener('click', () => {
    const rows = 3, cols = 3;
    let html = '<table>';
    for (let r = 0; r < rows; r++) { html += '<tr>' + '<td>&nbsp;</td>'.repeat(cols) + '</tr>'; }
    html += '</table><p></p>';
    document.execCommand('insertHTML', false, html); markEdited();
  });
  document.getElementById('tb-check').addEventListener('click', () => {
    document.execCommand('insertHTML', false, '<ul class="checklist"><li>Task</li></ul><p></p>'); markEdited();
  });
  document.getElementById('tb-mode').addEventListener('change', (e) => {
    paper.contentEditable = e.target.value === 'editing' ? 'true' : 'false';
  });

  // Menus
  document.querySelectorAll('#ed-menus [data-menu]').forEach((b) =>
    b.addEventListener('click', () => openMenu(b.dataset.menu, b))
  );
}

function createPopMenu(items, anchor) {
  window.__pvCloseMenus?.();
  const menu = document.createElement('div');
  menu.className = 'pop-menu pv-menu';
  menu.innerHTML = items.map((it, i) => it === '-' ? '<hr style="border:none;border-top:1px solid var(--border);margin:5px 4px">' : `<button data-mi="${i}">${esc(it.label)}</button>`).join('');
  document.body.appendChild(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.left = r.left + 'px'; menu.style.top = (r.bottom + 6) + 'px';
  menu.querySelectorAll('[data-mi]').forEach((b) => b.addEventListener('click', () => {
    items[Number(b.dataset.mi)]?.action?.();
    window.__pvCloseMenus?.();
  }));
}

function openMenu(name, anchor) {
  createPopMenu(menuItems(name), anchor);
}

function menuItems(name) {
  const p = current;
  const paper = document.getElementById('ed-paper');
  const cmd = (c, v) => () => { document.execCommand(c, false, v); paper.focus(); };
  if (name === 'File') return [
    { label: 'New prompt', action: () => window.__pvNewPrompt?.() },
    { label: 'Save as Template', action: () => saveAsTemplate() },
    { label: 'Download as TXT', action: () => window.__pvDownload?.(p, 'txt') },
    { label: 'Download as Markdown', action: () => window.__pvDownload?.(p, 'md') },
    { label: 'Download as HTML', action: () => window.__pvDownload?.(p, 'html') },
    '-',
    { label: 'Back to library', action: () => closeEditor(true) },
  ];
  if (name === 'Edit') return [
    { label: 'Undo', action: cmd('undo') }, { label: 'Redo', action: cmd('redo') }, '-',
    { label: 'Cut', action: cmd('cut') }, { label: 'Copy', action: cmd('copy') }, { label: 'Paste', action: cmd('paste') },
    { label: 'Select all', action: cmd('selectAll') },
  ];
  if (name === 'View') return [
    { label: 'Zoom 50%', action: () => setZoom(50) }, { label: 'Zoom 100%', action: () => setZoom(100) },
    { label: 'Zoom 150%', action: () => setZoom(150) }, '-',
    { label: 'Show / hide side panel', action: () => setSideHidden(!document.getElementById('ed-side')?.classList.contains('pv-side-hidden')) },
    { label: 'Toggle AI panel', action: () => { aiOpen = !aiOpen; renderAiPanel(); } },
  ];
  if (name === 'Insert') return [
    { label: 'Image', action: pickImage },
    { label: 'Link', action: () => openLinkPrompt() },
    { label: 'Table (3 x 3)', action: () => document.getElementById('tb-table').click() },
    { label: 'Checklist', action: () => document.getElementById('tb-check').click() },
    { label: 'Horizontal line', action: cmd('insertHorizontalRule') },
  ];
  if (name === 'Format') return [
    { label: 'Page setup (colour, size, margins)', action: pageSetup },
    { label: 'Bold', action: cmd('bold') }, { label: 'Italic', action: cmd('italic') },
    { label: 'Underline', action: cmd('underline') }, { label: 'Clear formatting', action: cmd('removeFormat') },
  ];
  if (name === 'AI') return [
    { label: 'Open AI Assistant panel', action: () => { aiOpen = true; renderAiPanel(); } },
    { label: 'Improve this prompt', action: () => { aiOpen = true; renderAiPanel(); } },
  ];
  return [];
}
function setZoom(z) { if (!current) return; current._zoom = z; const paper = document.getElementById('ed-paper'); if (paper) paper.style.zoom = z / 100; const sel = document.getElementById('tb-zoom'); if (sel) sel.value = String(z); }

// In-app link dialog (replaces the native URL prompt): a small modal
// with a URL field, following the prototype's link modal.
function showLinkModal({ title = 'Add link', initial = 'https://', okLabel = 'Add link', onOk }) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop pv-modal';
  modal.innerHTML = `
  <div class="modal-card">
    <h2>${esc(title)}</h2>
    <div class="field"><label>URL</label>
      <input type="text" id="lk-url" value="${esc(initial)}" placeholder="https://example.com" />
    </div>
    <div class="modal-actions"><button class="btn" id="lk-cancel">Cancel</button><button class="btn primary" id="lk-ok">${esc(okLabel)}</button></div>
  </div>`;
  document.body.appendChild(modal);
  const input = modal.querySelector('#lk-url');
  setTimeout(() => { input.focus(); input.select(); }, 30);
  modal.querySelector('#lk-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) modal.remove(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); modal.querySelector('#lk-ok').click(); } });
  modal.querySelector('#lk-ok').addEventListener('click', () => {
    const u = input.value.trim();
    modal.remove();
    if (u) onOk(u);
  });
}

function openLinkPrompt(anchor) {
  const paper = document.getElementById('ed-paper');
  if (!paper) return;
  if (anchor) {
    showLinkModal({
      title: 'Edit link', initial: anchor.getAttribute('href') || '', okLabel: 'Save link',
      onOk: (u) => { anchor.setAttribute('href', u); markEdited(); },
    });
    return;
  }
  const sel = window.getSelection();
  const range = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  showLinkModal({
    onOk: (u) => {
      paper.focus();
      if (range) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(range); }
      document.execCommand('createLink', false, u);
      markEdited();
    },
  });
}

// In-app Save as Template dialog (name + existing group select),
// following the prototype's Save as Template modal.
function saveAsTemplate() {
  syncFromDOM();
  const groups = Array.from(new Set(store.data.templates.map((t) => t.group).filter(Boolean)));
  if (!groups.length) groups.push('My Templates');
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop pv-modal';
  modal.innerHTML = `
  <div class="modal-card">
    <h2>Save as Template</h2>
    <p class="hint">The current text becomes a reusable template in the gallery.</p>
    <div class="field"><label>Template name</label>
      <input type="text" id="sat-name" value="${esc(current.title)}" placeholder="Template name" />
    </div>
    <div class="field"><label>Group</label>
      <select id="sat-group">${groups.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join('')}</select>
    </div>
    <div class="modal-actions"><button class="btn" id="sat-cancel">Cancel</button><button class="btn primary" id="sat-save">Save template</button></div>
  </div>`;
  document.body.appendChild(modal);
  const nameInput = modal.querySelector('#sat-name');
  setTimeout(() => { nameInput.focus(); nameInput.select(); }, 30);
  modal.querySelector('#sat-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#sat-save').addEventListener('click', () => {
    const group = modal.querySelector('#sat-group').value || 'My Templates';
    store.data.templates.push({
      id: uid(), group, color: '#1A56DB',
      title: nameInput.value.trim() || current.title, body: activeTabObj().html, custom: true,
    });
    store.save();
    modal.remove();
    toast('Saved as template');
  });
}

// Prototype page-setup palette (PS_COLORS), shown as a fixed 8-column
// swatch grid in a wide modal, with a Default swatch first.
const PS_COLORS = ['#FFFFFF', '#FFFEFB', '#FAF6EF', '#FFF7D6', '#FEF3C7', '#FFEDD5', '#FDE68A', '#E0F2FE', '#DBEAFE', '#BFDBFE', '#DCFCE7', '#D1FAE5', '#A7F3D0', '#FCE7F3', '#FBCFE8', '#F3E8FF', '#DDD6FE', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#374151', '#1F2937', '#111827'];

function pageSetup() {
  const p = current;
  p.page = p.page || { color: '', size: 'A4', orientation: 'portrait', margin: 'normal' };
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop pv-modal';
  modal.innerHTML = `
  <div class="modal-card ps-modal-card">
    <h2>Page setup</h2>
    <p class="hint">Paper colour and format for this prompt. Saved with the prompt.</p>
    <div class="field"><label>Page colour</label>
      <div class="ps-colors" id="ps-colors">
        <button type="button" class="ps-sw def" data-c="">Default</button>
        ${PS_COLORS.map((c) => `<button type="button" class="ps-sw" data-c="${c}" style="background:${c}" title="${c}" aria-label="Page colour ${c}"></button>`).join('')}
      </div>
      <div class="ps-custom-row"><span>Custom colour</span><input type="color" id="ps-custom" value="#FFF7D6" title="Custom colour" /></div>
    </div>
    <div class="field"><label>Page size</label>
      <select id="ps-size">${['A4', 'Letter', 'A5', 'Legal'].map((s) => `<option ${p.page.size === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="field"><label>Orientation</label>
      <select id="ps-orient">${['portrait', 'landscape'].map((s) => `<option ${p.page.orientation === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="field"><label>Margins</label>
      <select id="ps-margin">${['narrow', 'normal', 'wide'].map((s) => `<option ${p.page.margin === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="modal-actions"><button class="btn" id="ps-cancel">Cancel</button><button class="btn primary" id="ps-apply">Apply</button></div>
  </div>`;
  document.body.appendChild(modal);
  let chosen = p.page.color || '';
  const paintSel = () => modal.querySelectorAll('.ps-sw').forEach((x) => x.classList.toggle('sel', (x.dataset.c || '') === chosen));
  paintSel();
  if (/^#[0-9a-fA-F]{6}$/.test(chosen)) modal.querySelector('#ps-custom').value = chosen;
  modal.querySelectorAll('.ps-sw').forEach((b) => b.addEventListener('click', () => { chosen = b.dataset.c || ''; paintSel(); }));
  modal.querySelector('#ps-custom').addEventListener('input', (e) => { chosen = e.target.value; paintSel(); });
  modal.querySelector('#ps-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#ps-apply').addEventListener('click', () => {
    p.page = {
      color: chosen,
      size: modal.querySelector('#ps-size').value,
      orientation: modal.querySelector('#ps-orient').value,
      margin: modal.querySelector('#ps-margin').value,
    };
    store.save();
    modal.remove();
    applyPageSetup();
    toast('Page setup saved');
  });
}

function applyPageSetup() {
  const paper = document.getElementById('ed-paper');
  if (!paper || !current) return;
  const pg = current.page || {};
  // No explicit page colour: the paper follows the theme
  // (var(--paper) background, var(--ink) text) in both themes.
  // An explicit colour from Page setup is kept, with readable text.
  const explicit = pg.color ? String(pg.color) : '';
  paper.style.background = explicit || 'var(--paper)';
  paper.style.color = explicit ? textOnColor(explicit) : '';
  // Paper geometry from page setup, under the prototype's 1020px cap.
  const sizes = { A4: [920, 1301], Letter: [946, 1224], A5: [648, 920], Legal: [946, 1562] };
  const sz = sizes[pg.size] || sizes.A4;
  const landscape = pg.orientation === 'landscape';
  const w = landscape ? sz[1] : sz[0];
  const h = landscape ? sz[0] : sz[1];
  paper.style.width = '100%';
  paper.style.maxWidth = Math.min(w, 1020) + 'px';
  paper.style.minHeight = Math.round(h * 0.9) + 'px';
  const margins = { narrow: '34px 36px', normal: '56px 68px', wide: '64px 104px' };
  paper.style.padding = window.innerWidth <= 640 ? '26px 18px' : (margins[pg.margin] || margins.normal);
}

// ---------- Images: insert, select bar, drag, resize ----------
// Image slots arrive from templates (data-image-slot in the stored HTML).
// In the editor a slot is a live empty drop zone, never the stock picture:
// click opens the file picker, dragging an image file over it highlights
// it, and filling it swaps the slot for a normal editor image in the same
// place and size. The slot markup itself is what gets saved (and what
// "Save as Template" stores), so the behaviour survives round trips.
function enhanceImageSlots() {
  const paper = document.getElementById('ed-paper');
  if (!paper) return;
  paper.querySelectorAll('[data-image-slot]').forEach((slot) => {
    slot.classList.add('pv-img-slot');
    slot.contentEditable = 'false';
    slot.innerHTML = `<span class="pv-slot-ic">${ICONS.image}</span><span>Click to add image, or drag and drop</span>`;
  });
}
function pickImageForSlot(slot) {
  const picker = document.getElementById('file-picker');
  picker.accept = 'image/*';
  picker.onchange = () => {
    const file = picker.files[0];
    picker.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => fillImageSlot(slot, reader.result, file.name);
    reader.readAsDataURL(file);
  };
  picker.click();
}
function fillImageSlot(slot, src, name) {
  if (!slot.isConnected) return;
  const img = document.createElement('img');
  img.src = src;
  img.alt = name || '';
  img.style.cssText = 'display:block;width:100%;border-radius:10px';
  slot.replaceWith(img);
  selectImage(img);
  markEdited();
}
function replaceImage(img) {
  const picker = document.getElementById('file-picker');
  picker.accept = 'image/*';
  picker.onchange = () => {
    const file = picker.files[0];
    picker.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; img.alt = file.name; markEdited(); };
    reader.readAsDataURL(file);
  };
  picker.click();
}
function pickImage() {
  const picker = document.getElementById('file-picker');
  picker.accept = 'image/*';
  picker.onchange = () => {
    const file = picker.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById('ed-paper').focus();
      document.execCommand('insertHTML', false, `<p><img src="${reader.result}" alt="${esc(file.name)}" style="max-width:420px" /></p><p></p>`);
      markEdited();
    };
    reader.readAsDataURL(file);
    picker.value = '';
  };
  picker.click();
}
function selectImage(img) {
  document.querySelectorAll('#ed-paper img.selected').forEach((i) => i.classList.remove('selected'));
  img.classList.add('selected');
  showImgBar(img);
}
function showImgBar(img) {
  hideImgBar();
  imgBarEl = document.createElement('div');
  imgBarEl.className = 'img-bar';
  imgBarEl.innerHTML = `
    <button data-a="left">Align left</button><button data-a="center">Centre</button><button data-a="right">Align right</button>
    <button data-a="small">Small</button><button data-a="medium">Medium</button><button data-a="large">Large</button>
    <button data-a="replace">Replace</button><button data-a="remove">Remove</button>`;
  document.body.appendChild(imgBarEl);
  const r = img.getBoundingClientRect();
  imgBarEl.style.left = Math.max(8, r.left) + 'px';
  imgBarEl.style.top = Math.max(8, r.top - 46) + 'px';
  imgBarEl.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.a;
    if (a === 'replace') { replaceImage(img); return; }
    if (a === 'remove') { img.remove(); hideImgBar(); markEdited(); return; }
    if (a === 'left') { img.style.display = 'block'; img.style.margin = '8px auto 8px 0'; img.style.float = 'left'; img.style.marginRight = '18px'; }
    if (a === 'center') { img.style.float = 'none'; img.style.display = 'block'; img.style.margin = '8px auto'; }
    if (a === 'right') { img.style.display = 'block'; img.style.margin = '8px 0 8px auto'; img.style.float = 'right'; img.style.marginLeft = '18px'; }
    if (a === 'small') img.style.maxWidth = '220px';
    if (a === 'medium') img.style.maxWidth = '420px';
    if (a === 'large') img.style.maxWidth = '100%';
    markEdited();
  }));
  // Native drag: HTML5 draggable images inside contenteditable can be
  // repositioned by dragging; enable explicitly.
  img.draggable = true;
}
function hideImgBar() { imgBarEl?.remove(); imgBarEl = null; }
function showLinkCard(a, e) {
  hideLinkCard();
  linkCardEl = document.createElement('div');
  linkCardEl.className = 'link-card';
  linkCardEl.innerHTML = `<b>${esc(a.textContent || 'Link')}</b><br/><a href="${esc(a.href)}" target="_blank" rel="noopener">${esc(a.href)}</a>`;
  document.body.appendChild(linkCardEl);
  linkCardEl.style.left = Math.min(window.innerWidth - 340, e.clientX + 10) + 'px';
  linkCardEl.style.top = (e.clientY + 14) + 'px';
  setTimeout(() => document.addEventListener('mousedown', function h(ev) {
    if (!linkCardEl?.contains(ev.target)) { hideLinkCard(); document.removeEventListener('mousedown', h); }
  }), 0);
}
function hideLinkCard() { linkCardEl?.remove(); linkCardEl = null; }

// ---------- Note editor (prototype notePage, §7) ----------
// Full-page editor chrome for one note, rendered into #note-view:
// back arrow, logo, title, save status, Delete, menu bar
// (File Edit View Insert Format AI), the same SVG pill toolbar, and a
// themed paper (max-width 880px) with a rich-text body.
// Self-contained: the coordinator rewires main.js's openNote call site
// to this export. On close it saves, toasts "Saved" and navigates to
// Notes via window.__pvNavigate('notes').

let noteCurrent = null;
let noteCloseFn = null;
// Lets other code (mouse side-button history in main.js) close the
// note editor through its own save-and-close path.
export function closeNoteEditor() { return noteCloseFn ? noteCloseFn() : undefined; }

function noteBodyHTML(body) {
  const raw = String(body || '');
  if (!raw) return '';
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw; // already rich HTML
  // Legacy plain-text body: blank lines split paragraphs, single
  // line breaks become <br>.
  return raw.split(/\n{2,}/).map((para) =>
    `<p>${para.split('\n').map((line) => esc(line)).join('<br>')}</p>`
  ).join('');
}

function noteAiModal(n, bodyEl) {
  if (!hasAnyKey()) {
    toast('Add an AI API key in Account & Sync to use the AI Assistant');
    return;
  }
  const provider = activeProvider();
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop pv-modal';
  modal.innerHTML = `
  <div class="modal-card">
    <h2>Ask AI about this note</h2>
    <div class="field"><label>Question</label>
      <textarea id="nai-q" rows="3" placeholder="Ask AI about this note..."></textarea>
    </div>
    <div class="ai-msg bot" id="nai-reply" style="display:none;max-width:100%"></div>
    <div class="modal-actions"><button class="btn" id="nai-close">Close</button><button class="btn primary" id="nai-send">Send</button></div>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#nai-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#nai-send').addEventListener('click', async () => {
    const q = modal.querySelector('#nai-q').value.trim();
    if (!q) return;
    const replyBox = modal.querySelector('#nai-reply');
    replyBox.style.display = '';
    replyBox.textContent = 'Thinking...';
    try {
      const reply = await chat(provider, [
        { role: 'system', content: 'You help with notes. Be concise and practical.' },
        { role: 'user', content: 'Note titled "' + (n.title || 'Untitled note') + '":\n\n' + plainText(bodyEl.innerHTML) + '\n\nRequest: ' + q },
      ]);
      replyBox.textContent = reply || '(empty reply)';
    } catch (e) {
      replyBox.textContent = 'Could not reach the AI: ' + e.message;
    }
  });
}

export async function openNoteEditor(noteId) {
  const n = store.getNote(noteId);
  if (!n) return;
  noteCurrent = n;
  const view = document.getElementById('note-view');
  if (!view) return;
  const defaultFont = store.data.settings.defaultFont || 'Inter';
  view.innerHTML = `
  <div class="ed-header">
    <div class="ed-row1">
      <button class="icon-btn ed-back-btn" id="nt-back" title="Back to notes" aria-label="Back to notes">${ICONS.back}</button>
      <img src="/logo.png" class="ed-logo" alt="" />
      <input id="nt-title" class="ed-title" value="${esc(n.title || '')}" placeholder="Note title" autocomplete="off" />
      <span class="save-status" id="nt-save-status">${ICONS.cloudCheck}<span>Saves when you go back</span></span>
      <span style="flex:1"></span>
      <button class="btn small danger" id="nt-delete" type="button">Delete note</button>
    </div>
    <div class="ed-menus" id="nt-menus">
      ${['File', 'Edit', 'View', 'Insert', 'Format', 'AI'].map((m) => `<button data-nmenu="${m}">${m}</button>`).join('')}
    </div>
    <div class="ed-toolbar" id="nt-toolbar">
      ${buildToolbarHTML('nt', { zoom: 100, font: defaultFont })}
    </div>
  </div>
  <div class="ed-body">
    <div class="ed-scroll">
      <div class="ed-paper note-paper" id="nt-paper">
        <div class="nt-body" id="nt-body" contenteditable="true" spellcheck="false">${noteBodyHTML(n.body)}</div>
      </div>
    </div>
  </div>`;
  view.classList.remove('hidden');
  document.getElementById('fab-wrap')?.classList.add('hidden');
  window.dispatchEvent(new CustomEvent('pv:loc', { detail: { kind: 'note', id: noteId } }));

  const titleEl = view.querySelector('#nt-title');
  const bodyEl = view.querySelector('#nt-body');
  const paperEl = view.querySelector('#nt-paper');
  const statusEl = view.querySelector('#nt-save-status');
  let noteZoom = 100;

  // Same debounced autosave as the prompt editor: reading the whole
  // body HTML on every keystroke is what made big notes lag. The sync
  // runs 700ms after the last change; closing flushes it first.
  const syncNote = () => {
    n.title = titleEl.value;
    n.body = bodyEl.innerHTML;
    n.updatedAt = nowISO();
    store.save(); // silent autosave, same pattern as the prompt editor
  };
  const save = () => {
    statusEl?.classList.add('saving');
    clearTimeout(save._st);
    save._st = setTimeout(() => statusEl?.classList.remove('saving'), 900);
    clearTimeout(save._dt);
    save._dt = setTimeout(() => { save._dt = null; syncNote(); }, 700);
  };
  const flushNote = () => {
    if (save._dt) { clearTimeout(save._dt); save._dt = null; }
    syncNote();
  };
  const closeNote = async () => {
    flushNote();
    await store.saveNow();
    view.classList.add('hidden');
    noteCurrent = null;
    noteCloseFn = null;
    window.dispatchEvent(new CustomEvent('pv:note-closed'));
    toast('Saved');
    window.__pvNavigate?.('notes');
  };
  noteCloseFn = closeNote;
  const deleteNote = () => {
    if (save._dt) { clearTimeout(save._dt); save._dt = null; }
    n.deletedAt = nowISO();
    store.save();
    view.classList.add('hidden');
    noteCurrent = null;
    noteCloseFn = null;
    window.dispatchEvent(new CustomEvent('pv:note-closed'));
    toast('Note moved to Trash');
    window.__pvNavigate?.('notes');
  };
  const cmd = (c, v) => { bodyEl.focus(); document.execCommand(c, false, v); save(); };
  const setNoteZoom = (z) => {
    noteZoom = z;
    paperEl.style.zoom = z / 100;
    const sel = view.querySelector('#nt-zoom');
    if (sel) sel.value = String(z);
  };
  const pickNoteImage = () => {
    const picker = document.getElementById('file-picker');
    if (!picker) return;
    picker.accept = 'image/*';
    picker.onchange = () => {
      const file = picker.files[0];
      picker.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        bodyEl.focus();
        document.execCommand('insertHTML', false, `<p><img src="${reader.result}" alt="${esc(file.name)}" style="max-width:420px" /></p><p></p>`);
        save();
      };
      reader.readAsDataURL(file);
    };
    picker.click();
  };
  const openNoteLink = () => {
    const sel = window.getSelection();
    const range = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    showLinkModal({
      onOk: (u) => {
        bodyEl.focus();
        if (range) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(range); }
        document.execCommand('createLink', false, u);
        save();
      },
    });
  };
  const insertNoteTable = () => {
    bodyEl.focus();
    let html = '<table>';
    for (let r = 0; r < 3; r++) { html += '<tr>' + '<td>&nbsp;</td>'.repeat(3) + '</tr>'; }
    html += '</table><p></p>';
    document.execCommand('insertHTML', false, html);
    save();
  };
  const insertNoteChecklist = () => {
    bodyEl.focus();
    document.execCommand('insertHTML', false, '<ul class="checklist"><li>Task</li></ul><p></p>');
    save();
  };

  titleEl.addEventListener('input', save);
  bodyEl.addEventListener('input', save);
  view.querySelector('#nt-back').addEventListener('click', closeNote);
  view.querySelector('#nt-delete').addEventListener('click', deleteNote);

  // Pill toolbar (same wiring pattern as the prompt editor's).
  view.querySelectorAll('#nt-toolbar [data-cmd]').forEach((b) =>
    b.addEventListener('click', () => cmd(b.dataset.cmd))
  );
  view.querySelector('#nt-zoom').addEventListener('change', (e) => setNoteZoom(Number(e.target.value)));
  view.querySelector('#nt-style').addEventListener('change', (e) => cmd('formatBlock', e.target.value));
  view.querySelector('#nt-font').addEventListener('change', (e) => {
    paperEl.style.fontFamily = cssFont(e.target.value);
    bodyEl.focus();
    document.execCommand('fontName', false, e.target.value);
  });
  const sizeInput = view.querySelector('#nt-size');
  const applyNoteSize = (delta) => {
    let v = parseInt(sizeInput.value || '16', 10) + delta;
    v = Math.max(8, Math.min(72, v));
    sizeInput.value = v;
    bodyEl.focus();
    document.execCommand('fontSize', false, '7');
    bodyEl.querySelectorAll('font[size="7"]').forEach((f) => { f.removeAttribute('size'); f.style.fontSize = v + 'px'; });
    save();
  };
  view.querySelector('#nt-size-minus').addEventListener('click', () => applyNoteSize(-1));
  view.querySelector('#nt-size-plus').addEventListener('click', () => applyNoteSize(1));
  bindColorControl(bodyEl, view.querySelector('#nt-color'),
    (v) => document.execCommand('foreColor', false, v), save);
  bindColorControl(bodyEl, view.querySelector('#nt-hilite'),
    (v) => { document.execCommand('hiliteColor', false, v) || document.execCommand('backColor', false, v); }, save);
  view.querySelector('#nt-link').addEventListener('click', openNoteLink);
  view.querySelector('#nt-image').addEventListener('click', pickNoteImage);
  view.querySelector('#nt-table').addEventListener('click', insertNoteTable);
  view.querySelector('#nt-check').addEventListener('click', insertNoteChecklist);
  view.querySelector('#nt-mode').addEventListener('change', (e) => {
    bodyEl.contentEditable = e.target.value === 'editing' ? 'true' : 'false';
  });

  // Menu bar: a reduced functional set over the note body.
  const noteMenuItems = (name) => {
    if (name === 'File') return [
      { label: 'Back to notes', action: () => closeNote() },
      '-',
      { label: 'Delete note', action: () => deleteNote() },
    ];
    if (name === 'Edit') return [
      { label: 'Undo', action: () => cmd('undo') }, { label: 'Redo', action: () => cmd('redo') }, '-',
      { label: 'Cut', action: () => cmd('cut') }, { label: 'Copy', action: () => cmd('copy') }, { label: 'Paste', action: () => cmd('paste') },
      { label: 'Select all', action: () => cmd('selectAll') },
    ];
    if (name === 'View') return [
      { label: 'Zoom 50%', action: () => setNoteZoom(50) }, { label: 'Zoom 100%', action: () => setNoteZoom(100) },
      { label: 'Zoom 150%', action: () => setNoteZoom(150) },
    ];
    if (name === 'Insert') return [
      { label: 'Image', action: pickNoteImage },
      { label: 'Link', action: openNoteLink },
      { label: 'Table (3 x 3)', action: insertNoteTable },
      { label: 'Checklist', action: insertNoteChecklist },
      { label: 'Horizontal line', action: () => cmd('insertHorizontalRule') },
    ];
    if (name === 'Format') return [
      { label: 'Bold', action: () => cmd('bold') }, { label: 'Italic', action: () => cmd('italic') },
      { label: 'Underline', action: () => cmd('underline') }, { label: 'Clear formatting', action: () => cmd('removeFormat') },
    ];
    if (name === 'AI') return [
      { label: 'Ask AI about this note', action: () => noteAiModal(n, bodyEl) },
    ];
    return [];
  };
  view.querySelectorAll('#nt-menus [data-nmenu]').forEach((b) =>
    b.addEventListener('click', () => createPopMenu(noteMenuItems(b.dataset.nmenu), b))
  );
}
