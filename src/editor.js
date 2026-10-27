// Full-page Google Docs style editor for one prompt.
// - Two-row header: logo, editable title, pin, history, Share pill, big AI sparkle
// - Menus: File, Edit, View, Insert, Format, AI only
// - One pill toolbar, left tabs/outline panel, silent autosave,
//   "Saved" toast only when leaving, per-prompt page setup.

import { store, uid, nowISO, esc, plainText, promptHTML, FONT_LIST } from './store.js';
import { chat, hasAnyKey, activeProvider } from './ai.js';

let current = null;   // prompt object being edited
let onCloseCb = null;
let aiOpen = false;
let imgBarEl = null;
let linkCardEl = null;
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
}

export function closeEditor(showToast = true) {
  syncFromDOM();
  store.saveNow();
  document.getElementById('editor-view').classList.add('hidden');
  hideImgBar(); hideLinkCard();
  current = null;
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

function markEdited() {
  syncFromDOM();
  store.logActivityDebounced?.('edited', current.id, current.title);
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
  const root = document.getElementById('editor-view');
  const tab = activeTabObj();
  const zoom = p._zoom || 100;
  root.innerHTML = `
  <div class="ed-header">
    <div class="ed-row1">
      <img src="/logo.png" class="ed-logo" alt="" />
      <input id="ed-title-input" class="ed-title" value="${esc(p.title)}" placeholder="Untitled prompt" />
      <button class="icon-btn" id="ed-pin" title="${p.pinned ? 'Unpin' : 'Pin'}">${p.pinned ? '<span class="pin-ic">📌</span>' : '📍'}</button>
      <span class="ed-save-state" id="ed-history" title="Created ${new Date(p.createdAt).toLocaleString()}">🕘</span>
      <span class="ed-save-state"></span>
      <button class="share-pill" id="ed-share">Share</button>
      <button class="ai-sparkle-btn" id="ed-ai-toggle" title="AI Assistant"><span class="ai-sparkle">✦</span></button>
      <button class="icon-btn" id="ed-menu" title="More">⋮</button>
    </div>
    <div class="ed-menus" id="ed-menus">
      ${['File', 'Edit', 'View', 'Insert', 'Format', 'AI'].map((m) => `<button data-menu="${m}">${m}</button>`).join('')}
      <span style="flex:1"></span>
      <button id="ed-back">← Back</button>
    </div>
    <div class="ed-toolbar" id="ed-toolbar">
      <button data-cmd="undo" title="Undo">↶</button>
      <button data-cmd="redo" title="Redo">↷</button>
      <span class="sep"></span>
      <select id="tb-zoom" title="Zoom">
        ${[50, 75, 90, 100, 110, 125, 150].map((z) => `<option value="${z}" ${z === zoom ? 'selected' : ''}>${z}%</option>`).join('')}
      </select>
      <span class="sep"></span>
      <select id="tb-style" title="Text style">
        <option value="p">Normal text</option><option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option><option value="h3">Heading 3</option>
        <option value="blockquote">Quote</option>
      </select>
      <select id="tb-font" title="Font" style="max-width:150px">
        ${fontOptions(p._font || store.data.settings.defaultFont || 'Inter')}
      </select>
      <span class="sep"></span>
      <button id="tb-size-minus">−</button>
      <input class="font-size-box" id="tb-size" type="text" value="16" />
      <button id="tb-size-plus">+</button>
      <span class="sep"></span>
      <button data-cmd="bold" title="Bold"><b>B</b></button>
      <button data-cmd="italic" title="Italic"><i>I</i></button>
      <button data-cmd="underline" title="Underline"><u>U</u></button>
      <button data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
      <label title="Text colour" style="display:flex;align-items:center">A<input type="color" id="tb-color" value="#1F2430" /></label>
      <label title="Highlight" style="display:flex;align-items:center">▨<input type="color" id="tb-hilite" value="#FFE98A" /></label>
      <span class="sep"></span>
      <button id="tb-link" title="Insert link">🔗</button>
      <button id="tb-image" title="Insert image">🖼</button>
      <button id="tb-table" title="Insert table">▦</button>
      <span class="sep"></span>
      <button data-cmd="justifyLeft" title="Align left">⬅</button>
      <button data-cmd="justifyCenter" title="Centre">⬌</button>
      <button data-cmd="justifyRight" title="Align right">➡</button>
      <button data-cmd="insertUnorderedList" title="Bullet list">•≡</button>
      <button data-cmd="insertOrderedList" title="Numbered list">1≡</button>
      <button id="tb-check" title="Checklist">☑</button>
      <button data-cmd="removeFormat" title="Clear formatting">⌫</button>
      <span class="sep"></span>
      <select id="tb-mode" title="Mode"><option value="editing">✎ Editing</option><option value="viewing">👁 Viewing</option></select>
    </div>
  </div>
  <div class="ed-body">
    <aside class="ed-side" id="ed-side"></aside>
    <div class="ed-scroll" id="ed-scroll">
      <div class="ed-paper" id="ed-paper" contenteditable="true" spellcheck="false"
        style="background:${esc(p.page?.color || '#FFFFFF')};font-family:${cssFont(p._font || store.data.settings.defaultFont || 'Inter')};zoom:${zoom / 100}">${tab.html || ''}</div>
    </div>
    <aside class="ed-ai-panel hidden" id="ed-ai-panel"></aside>
  </div>`;

  wire();
  enhanceImageSlots();
  renderSide();
  renderAiPanel();
}

function fontOptions(selected) {
  const systemFonts = (navigator.fonts && window.__pvSystemFonts) || [];
  const all = Array.from(new Set([...FONT_LIST, ...systemFonts]));
  return all.map((f) => `<option value="${esc(f)}" ${f === selected ? 'selected' : ''}>${esc(f)}</option>`).join('') +
    `<option value="__sync__">↻ Sync PC fonts</option>`;
}
function cssFont(f) { return `'${String(f).replace(/'/g, '')}', sans-serif`; }

function renderSide() {
  const side = document.getElementById('ed-side');
  if (!side || !current) return;
  const others = store.activePrompts().filter((x) => x.id !== current.id);
  side.innerHTML = `
    <input class="side-search" id="side-search" placeholder="Search in outline" />
    <h4>Document tabs</h4>
    <div id="side-tabs">
      ${current.tabs.map((t, i) => `
        <button class="doc-tab ${i === (current.activeTab || 0) ? 'active' : ''}" data-tab="${i}">
          📄 <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.name)}</span>
          ${current.tabs.length > 1 ? `<span class="tab-x" data-deltab="${i}" title="Delete tab">✕</span>` : ''}
        </button>`).join('')}
      <button class="doc-tab" id="tab-add">＋ Add tab</button>
    </div>
    <h4 class="side-section-head ${outlineOpen ? '' : 'collapsed'}" id="head-outline" title="Show or hide the outline">
      <span>Outline</span><span class="chev">▾</span>
    </h4>
    <div class="side-collapse ${outlineOpen ? '' : 'closed'}" id="collapse-outline">
      <div class="side-collapse-inner"><div id="side-outline"></div></div>
    </div>
    <h4 class="side-section-head ${promptsOpen ? '' : 'collapsed'}" id="head-prompts" title="Show or hide the prompt list">
      <span>Prompts</span><span class="chev">▾</span>
    </h4>
    <div class="side-collapse ${promptsOpen ? '' : 'closed'}" id="collapse-prompts">
      <div class="side-collapse-inner">
        ${others.slice(0, 30).map((o) => `<button class="side-prompt" data-open="${o.id}">${o.pinned ? '📌 ' : ''}${esc(o.title)}</button>`).join('') || '<p style="color:var(--text-faint);font-size:13px;padding:0 10px">No other prompts yet</p>'}
      </div>
    </div>`;
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
  side.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', (e) => {
    if (e.target.dataset.deltab !== undefined) return;
    syncFromDOM();
    current.activeTab = Number(b.dataset.tab);
    store.save();
    render();
  }));
  side.querySelectorAll('[data-deltab]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const i = Number(b.dataset.deltab);
    if (!confirm('Delete this document tab?')) return;
    current.tabs.splice(i, 1);
    current.activeTab = 0;
    store.save(); render();
  }));
  side.querySelectorAll('.doc-tab span[style]').forEach((s) => s.addEventListener('dblclick', () => {
    const idx = Number(s.closest('[data-tab]').dataset.tab);
    const name = prompt('Tab name:', current.tabs[idx].name);
    if (name) { current.tabs[idx].name = name; store.save(); renderSide(); }
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
  side.querySelector('#side-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    side.querySelectorAll('.outline-item').forEach((el) => {
      el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
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
}

function renderAiPanel() {
  const panel = document.getElementById('ed-ai-panel');
  if (!panel) return;
  panel.classList.toggle('hidden', !aiOpen);
  if (!aiOpen) return;
  if (!hasAnyKey()) {
    panel.innerHTML = `
      <div class="ai-head">✦ AI Assistant <span style="flex:1"></span><button class="icon-btn" id="ai-close">✕</button></div>
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
    <div class="ai-head">✦ AI Assistant <span style="flex:1"></span><button class="icon-btn" id="ai-close">✕</button></div>
    <div class="ai-messages" id="ai-msgs">
      <div class="ai-msg bot">Connected. Ask me to improve, shorten, or rewrite this prompt, or anything else.</div>
    </div>
    <div class="row-flex" style="padding:0 12px 8px">
      <button class="btn" data-quick="improve">Improve</button>
      <button class="btn" data-quick="shorten">Shorten</button>
      <button class="btn" data-quick="rewrite">Rewrite</button>
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
      ? { improve: 'Improve this prompt and return the improved version.', shorten: 'Shorten this prompt without losing meaning.', rewrite: 'Rewrite this prompt in a clearer structure.' }[preset]
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

function wire() {
  const p = current;
  const paper = document.getElementById('ed-paper');
  document.getElementById('ed-back').addEventListener('click', () => closeEditor(true));
  document.getElementById('ed-title-input').addEventListener('input', markEdited);
  document.getElementById('ed-pin').addEventListener('click', () => { p.pinned = !p.pinned; store.save(); render(); });
  document.getElementById('ed-ai-toggle').addEventListener('click', () => { aiOpen = !aiOpen; renderAiPanel(); });
  document.getElementById('ed-share').addEventListener('click', () => window.__pvSharePrompt?.(p));
  document.getElementById('ed-menu').addEventListener('click', (e) => {
    window.__pvPromptMenu?.(p, e.clientX, e.clientY, { fromEditor: true });
  });
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
  document.getElementById('tb-font').addEventListener('change', async (e) => {
    if (e.target.value === '__sync__') { await syncSystemFonts(e.target); return; }
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
  document.getElementById('tb-color').addEventListener('input', (e) => document.execCommand('foreColor', false, e.target.value));
  document.getElementById('tb-hilite').addEventListener('input', (e) => { document.execCommand('hiliteColor', false, e.target.value) || document.execCommand('backColor', false, e.target.value); });
  document.getElementById('tb-link').addEventListener('click', () => {
    const url = prompt('Link URL:', 'https://');
    if (url) { document.execCommand('createLink', false, url); markEdited(); }
  });
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

async function syncSystemFonts(selectEl) {
  try {
    if (window.queryLocalFonts) {
      const fonts = await window.queryLocalFonts();
      window.__pvSystemFonts = Array.from(new Set(fonts.map((f) => f.family)));
      toast('Synced ' + window.__pvSystemFonts.length + ' fonts from this PC');
    } else {
      toast('Font sync runs in the desktop app / supported browsers');
    }
  } catch { toast('Font access was not allowed'); }
  render();
}

function openMenu(name, anchor) {
  window.__pvCloseMenus?.();
  const items = menuItems(name);
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
    { label: 'Toggle AI panel', action: () => { aiOpen = !aiOpen; renderAiPanel(); } },
  ];
  if (name === 'Insert') return [
    { label: 'Image', action: pickImage },
    { label: 'Link', action: () => { const u = prompt('Link URL:', 'https://'); if (u) { document.execCommand('createLink', false, u); markEdited(); } } },
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

function saveAsTemplate() {
  syncFromDOM();
  const groups = Array.from(new Set(store.data.templates.map((t) => t.group)));
  const group = prompt('Template group:', groups[0] || 'My Templates');
  if (group === null) return;
  store.data.templates.push({
    id: uid(), group: group || 'My Templates', color: '#1A56DB',
    title: current.title, body: activeTabObj().html, custom: true,
  });
  store.save();
  toast('Saved as template');
}

function pageSetup() {
  const p = current;
  p.page = p.page || { color: '#FFFFFF', size: 'A4', orientation: 'portrait', margin: 'normal' };
  const colors = ['#FFFFFF', '#FAF6EF', '#FFF7E0', '#FDECEC', '#EAF4EC', '#E8F0FE', '#F1EAFE', '#FDEAF3', '#E9F7F7', '#F5F0E6', '#FFEFD5', '#EFEFEF', '#FFF0F5', '#E6FFFA', '#FEFCBF', '#FED7D7', '#C6F6D5', '#BEE3F8', '#E9D8FD', '#FBB6CE', '#2B2B2B', '#1A365D', '#276749', '#744210'];
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop pv-modal';
  modal.innerHTML = `
  <div class="modal-card">
    <h2>Page setup</h2>
    <p class="hint">Saved with this prompt.</p>
    <div class="field"><label>Page colour</label>
      <div class="row-flex" id="ps-colors">
        ${colors.map((c) => `<button class="ps-color" data-c="${c}" title="${c}" style="width:32px;height:32px;border-radius:9px;border:2px solid ${p.page.color === c ? 'var(--accent)' : 'var(--border)'};background:${c}"></button>`).join('')}
        <input type="color" id="ps-custom" value="${esc(p.page.color)}" title="Custom colour" />
      </div>
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
  let chosen = p.page.color;
  modal.querySelectorAll('.ps-color').forEach((b) => b.addEventListener('click', () => { chosen = b.dataset.c; modal.querySelectorAll('.ps-color').forEach((x) => (x.style.borderColor = 'var(--border)')); b.style.borderColor = 'var(--accent)'; }));
  modal.querySelector('#ps-custom').addEventListener('input', (e) => (chosen = e.target.value));
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
  paper.style.background = pg.color || '#FFFFFF';
  const widths = { A4: 920, Letter: 940, A5: 660, Legal: 940 };
  const margins = { narrow: '36px 40px', normal: '64px 72px', wide: '84px 110px' };
  paper.style.maxWidth = (pg.orientation === 'landscape' ? 1120 : (widths[pg.size] || 920)) + 'px';
  paper.style.padding = margins[pg.margin] || margins.normal;
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
    slot.innerHTML = '<span class="pv-slot-ic">🖼</span><span>Click to add image, or drag and drop</span>';
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
