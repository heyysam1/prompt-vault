// Self-update for Prompt Vault (Tauri Updater plugin).
// Checks GitHub Releases (latest.json) quietly a few seconds after launch.
// Nothing is shown when there is no update or when the check fails
// (offline etc.). A found update appears as a slim banner at the top:
// "Update now" downloads with progress, installs, then relaunches.
// The Settings page can also check by hand.
//
// Outside the installed app (plain browser preview) every entry point
// here is a safe no-op, because the plugins only exist inside Tauri.
import { toast } from './editor.js';
import { esc } from './store.js';

const FALLBACK_VERSION = '1.0.1'; // matches package.json / tauri.conf.json
const inTauri = () => !!(window.__TAURI_INTERNALS__ || window.__TAURI__?.core?.invoke);

export async function currentVersion() {
  if (!inTauri()) return FALLBACK_VERSION;
  try {
    const { getVersion } = await import('@tauri-apps/api/app');
    return (await getVersion()) || FALLBACK_VERSION;
  } catch {
    return FALLBACK_VERSION;
  }
}

export function scheduleUpdateCheck() {
  // A few seconds after launch, once, silently.
  setTimeout(() => { checkForUpdates({ manual: false }); }, 4000);
}

export async function checkForUpdates({ manual = false } = {}) {
  if (!inTauri()) {
    if (manual) toast('Updates are checked inside the installed app.');
    return;
  }
  let update = null;
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    update = await check();
  } catch {
    // Offline or endpoint unreachable: stay silent on auto-check.
    if (manual) toast('Could not check for updates. Please try again later.');
    return;
  }
  if (!update) {
    if (manual) toast('You are up to date');
    return;
  }
  showUpdateBanner(update);
}

function showUpdateBanner(update) {
  document.querySelector('.update-banner')?.remove();
  const notes = (update.body || '').replace(/\s+/g, ' ').trim();
  const notesShort = notes.length > 140 ? notes.slice(0, 140) + '…' : notes;
  const bar = document.createElement('div');
  bar.className = 'update-banner';
  bar.innerHTML = `
    <div class="update-banner-main">
      <span class="update-banner-title">Prompt Vault ${esc(update.version)} is available</span>
      ${notesShort ? `<span class="update-banner-notes">${esc(notesShort)}</span>` : ''}
    </div>
    <div class="update-banner-actions">
      <span class="update-progress hidden"></span>
      <button class="btn primary update-now">Update now</button>
      <button class="btn update-later">Later</button>
    </div>`;
  document.body.appendChild(bar);

  const nowBtn = bar.querySelector('.update-now');
  const laterBtn = bar.querySelector('.update-later');
  const progress = bar.querySelector('.update-progress');
  laterBtn.addEventListener('click', () => bar.remove());

  nowBtn.addEventListener('click', async () => {
    nowBtn.disabled = true;
    laterBtn.disabled = true;
    nowBtn.textContent = 'Updating…';
    progress.classList.remove('hidden');
    progress.textContent = 'Downloading… 0%';
    let downloaded = 0;
    let total = 0;
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength || 0;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength || 0;
          const pct = total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : null;
          progress.textContent = pct === null ? 'Downloading…' : `Downloading… ${pct}%`;
        } else if (event.event === 'Finished') {
          progress.textContent = 'Installing…';
        }
      });
      progress.textContent = 'Installed. Restarting…';
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch {
      progress.classList.add('hidden');
      nowBtn.disabled = false;
      laterBtn.disabled = false;
      nowBtn.textContent = 'Update now';
      toast('Update failed. Please try again later.');
    }
  });
}
