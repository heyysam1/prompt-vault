// First-time onboarding guide.
// Shows once on first launch: a 4-step introduction card on a blurred
// indigo/blue gradient full-window backdrop:
// centred 480px card, 64px accent-soft icon tile, 19px title, 14px
// body, 8px progress dots, Skip left / Continue right, final button
// "Get Started". Step text and icons are the prototype's own.
// Skip / finish / Esc / outside click all mark the guide as seen
// (settings.onboardingSeen in the vault data, so it persists in the app
// data folder and never pops up on its own again).
// Settings -> "View guide again" reopens it any time via showOnboarding(true).

import { store } from './store.js';

// Prototype GUIDE_STEPS (prototype index.html, welcome guide section).
const STEPS = [
  {
    icon: 'logo',
    title: 'Welcome to Prompt Vault',
    text: 'Every prompt you rely on lives here, in one calm place. No more hunting through chats, notes and screenshots to find that one prompt again.',
  },
  {
    icon: 'plus',
    title: 'Add prompts your way',
    text: 'Tap the + button for a blank prompt, start from a ready-made Template in the gallery, or Import the prompt files you already have.',
  },
  {
    icon: 'search',
    title: 'Find it, even without the name',
    text: 'Search understands meaning, not just titles. Describe what the prompt does, or ask in AI Chat, and the right prompt comes up.',
  },
  {
    icon: 'drive',
    title: 'Back up & switch on AI',
    text: 'Sign in with Google and your whole library backs up to your Google Drive. Add your own AI API key in Account & Sync to unlock AI Chat and the editor\'s AI Assistant.',
  },
];

// Prototype GUIDE_ICONS: step 1 is the app logo image, the rest are
// the prototype's 30px stroke SVGs.
const GUIDE_ICONS = {
  logo: '<img src="/logo.png" alt="" />',
  plus: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  drive: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 0 0 .4-8.97 6 6 0 0 0-11.7 1.22A4 4 0 0 0 6.5 19z"/><path d="M12 21v-8M8.8 16.2L12 13l3.2 3.2"/></svg>',
};

let current = 0;
let rootEl = null;
let keyHandler = null;

function render() {
  const step = STEPS[current];
  const last = current === STEPS.length - 1;
  rootEl.innerHTML = `
  <div class="ob-backdrop" id="ob-backdrop">
    <div class="ob-card" role="dialog" aria-modal="true" aria-label="Welcome guide">
      <div class="ob-slide" key="${current}">
        <div class="ob-icon">${GUIDE_ICONS[step.icon] || ''}</div>
        <h2 class="ob-title">${step.title}</h2>
        <p class="ob-body">${step.text}</p>
      </div>
      <div class="ob-dots" aria-hidden="true">
        ${STEPS.map((_, i) => `<button class="ob-dot ${i === current ? 'on' : ''}" data-dot="${i}" aria-label="Go to step ${i + 1}"></button>`).join('')}
      </div>
      <div class="ob-footer">
        <button class="btn ghost" id="ob-skip">Skip</button>
        <button class="btn primary ob-next" id="ob-next">${last ? 'Get Started' : 'Continue'}</button>
      </div>
    </div>
  </div>`;

  rootEl.querySelector('#ob-next').addEventListener('click', () => {
    if (current < STEPS.length - 1) { current++; render(); }
    else finish();
  });
  rootEl.querySelector('#ob-skip').addEventListener('click', finish);
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
