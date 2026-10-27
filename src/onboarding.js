// First-time onboarding guide.
// Shows once on first launch: a 4-step introduction popup.
//  1) Welcome - all your prompts in one place
//  2) Add prompts - the + button, Import, Templates
//  3) Search & AI - keyword, meaning-based search, AI Chat
//  4) Stay safe - Google sign-in for Drive backup + your own API key for AI
// Skip / finish / Esc / outside click all mark the guide as seen
// (settings.onboardingSeen in the vault data, so it persists in the app
// data folder and never pops up on its own again).
// Settings -> "View guide again" reopens it any time via showOnboarding(true).

import { store } from './store.js';

const STEPS = [
  {
    icon: '▦',
    art: 'vault',
    title: 'Welcome to Prompt Vault',
    body: 'Every prompt you have ever written, saved in one calm place. No more hunting through chats, notes and screenshots when you need that one perfect prompt again.',
    points: [
      ['▦', 'All Prompts', 'Your whole library as clean, readable cards'],
      ['📌', 'Pin & Recent', 'The prompts you use most, always one click away'],
    ],
  },
  {
    icon: '+',
    art: 'add',
    title: 'Add prompts in seconds',
    body: 'Start from a blank page, a ready-made template, or a file you already have. Writing feels like a document, and everything saves automatically as you type.',
    points: [
      ['+', 'The + button', 'New prompt, from template, or a new note'],
      ['▤', 'Templates', 'Ready formats for writing, coding, study and more'],
      ['⇅', 'Import', 'Bring prompts in from TXT, Markdown or JSON files'],
    ],
  },
  {
    icon: '✦',
    art: 'search',
    title: 'Find anything, even by meaning',
    body: 'Search finds your words instantly and highlights them on the card. Connect your own AI key and you can also search by meaning, or just describe what you are looking for in AI Chat.',
    points: [
      ['⌕', 'Search', 'Type a word, see it highlighted in the preview'],
      ['✦', 'AI Chat', 'Describe the prompt you need, get matching cards'],
    ],
  },
  {
    icon: '☁',
    art: 'sync',
    title: 'Backed up, and truly yours',
    body: 'Sign in with Google and your library backs up to your own Google Drive, so it can always be restored. Your AI keys stay on this computer only, and everything works fully offline.',
    points: [
      ['G', 'Sign in with Google', 'Drive backup and restore, from Account & Sync'],
      ['⚿', 'Your API key', 'Add a key in Account & Sync to switch on AI features'],
    ],
  },
];

let current = 0;
let rootEl = null;
let keyHandler = null;

function artHTML(kind) {
  // Small decorative scenes built from the app logo + simple shapes.
  if (kind === 'vault') {
    return `<div class="ob-art">
      <img src="/logo.png" alt="" class="ob-art-logo" />
      <div class="ob-art-card ob-c1"></div><div class="ob-art-card ob-c2"></div><div class="ob-art-card ob-c3"></div>
    </div>`;
  }
  if (kind === 'add') {
    return `<div class="ob-art">
      <div class="ob-fab">+</div>
      <div class="ob-art-chip ob-chip1">Blank Prompt</div>
      <div class="ob-art-chip ob-chip2">From Template</div>
      <div class="ob-art-chip ob-chip3">Import File</div>
    </div>`;
  }
  if (kind === 'search') {
    return `<div class="ob-art">
      <div class="ob-searchbar"><span>⌕</span><span class="ob-search-text">a prompt for study notes</span></div>
      <div class="ob-art-card ob-s1"><mark>study notes</mark> maker</div>
      <div class="ob-art-card ob-s2">Quiz me on any topic</div>
    </div>`;
  }
  return `<div class="ob-art">
    <div class="ob-cloud">☁</div>
    <div class="ob-art-chip ob-chip1">Google Drive backup</div>
    <div class="ob-art-chip ob-chip2">API key stays on this PC</div>
  </div>`;
}

function render() {
  const step = STEPS[current];
  const last = current === STEPS.length - 1;
  rootEl.innerHTML = `
  <div class="ob-backdrop" id="ob-backdrop">
    <div class="ob-card" role="dialog" aria-modal="true" aria-label="Welcome guide, step ${current + 1} of ${STEPS.length}">
      <button class="ob-close" id="ob-close" aria-label="Close guide">✕</button>
      <div class="ob-slide" key="${current}">
        ${artHTML(step.art)}
        <div class="ob-step-tag">Step ${current + 1} of ${STEPS.length}</div>
        <h2 class="ob-title">${step.title}</h2>
        <p class="ob-body">${step.body}</p>
        <div class="ob-points">
          ${step.points.map(([ic, t, d]) => `
            <div class="ob-point">
              <span class="ob-point-ic">${ic}</span>
              <span><b>${t}</b><small>${d}</small></span>
            </div>`).join('')}
        </div>
      </div>
      <div class="ob-footer">
        <button class="btn ghost" id="ob-skip">Skip</button>
        <div class="ob-dots" aria-hidden="true">
          ${STEPS.map((_, i) => `<button class="ob-dot ${i === current ? 'on' : ''}" data-dot="${i}" aria-label="Go to step ${i + 1}"></button>`).join('')}
        </div>
        <button class="btn primary ob-next" id="ob-next">${last ? 'Get Started' : 'Continue'}</button>
      </div>
    </div>
  </div>`;

  rootEl.querySelector('#ob-next').addEventListener('click', () => {
    if (current < STEPS.length - 1) { current++; render(); }
    else finish();
  });
  rootEl.querySelector('#ob-skip').addEventListener('click', finish);
  rootEl.querySelector('#ob-close').addEventListener('click', finish);
  rootEl.querySelector('#ob-backdrop').addEventListener('mousedown', (e) => {
    if (e.target.id === 'ob-backdrop') finish();
  });
  rootEl.querySelectorAll('.ob-dot').forEach((d) =>
    d.addEventListener('click', () => { current = Number(d.dataset.dot); render(); })
  );
}

async function markSeen() {
  if (!store.data.settings.onboardingSeen) {
    store.data.settings.onboardingSeen = true;
    await store.saveNow();
  }
}

function teardown() {
  if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
  if (rootEl) rootEl.innerHTML = '';
}

async function finish() {
  await markSeen();
  teardown();
}

/** Open the guide. force=false (startup) shows it only if never seen. */
export function showOnboarding(force = false) {
  if (!force && store.data?.settings?.onboardingSeen) return false;
  rootEl = document.getElementById('onboarding-root');
  if (!rootEl) return false;
  current = 0;
  render();
  keyHandler = (e) => {
    if (e.key === 'Escape') finish();
    else if (e.key === 'ArrowRight') { if (current < STEPS.length - 1) { current++; render(); } }
    else if (e.key === 'ArrowLeft') { if (current > 0) { current--; render(); } }
  };
  document.addEventListener('keydown', keyHandler);
  return true;
}

export function closeOnboarding() { teardown(); }
