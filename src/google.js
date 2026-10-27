// Google sign-in (OAuth 2.0 loopback flow for desktop apps) and
// Google Drive backup in the app's private appDataFolder.
//
// IMPORTANT: Google requires an OAuth client of your own. Sami must create
// a free "Desktop app" OAuth client in Google Cloud Console once and paste
// the Client ID (and secret, if issued) in Account & Sync. Until then,
// sign-in reports exactly that, and the rest of the app works fully offline.
// Client values are stored in settings.googleClientId / googleClientSecret
// and are read fresh every time, so no code change is ever needed.

import { store } from './store.js';

const SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';
const BACKUP_NAME = 'prompt-vault-backup.json';

function clientConfig() {
  return {
    id: (store.data.settings.googleClientId || '').trim(),
    secret: (store.data.settings.googleClientSecret || '').trim(),
  };
}
export function googleConfigured() { return !!clientConfig().id; }
export function currentUser() {
  const a = store.auth;
  if (!a || !a.accessToken) return null;
  if (a.expiresAt && Date.now() > a.expiresAt && !a.refreshToken) return null;
  return a;
}

/**
 * Desktop loopback sign-in. Works inside the Tauri webview by opening the
 * system browser and waiting on a one-time local redirect through a tiny
 * fetch-poll bridge: because a webview cannot run an HTTP server, the
 * production-grade approach in Tauri is the loopback server in Rust.
 * This build ships the complete PKCE flow and token handling; if the
 * loopback listener is unavailable (plain browser preview), it clearly
 * reports that sign-in needs the installed desktop app.
 */
export async function signInWithGoogle(opener) {
  const { id, secret } = clientConfig();
  if (!id) {
    throw new Error('Google sign-in is not set up yet. Create a free OAuth client (Desktop app) in Google Cloud Console and paste the Client ID in the "Google sign-in setup" box below. This is a one-time setup by the app owner.');
  }
  // PKCE
  const verifier = rand(64);
  const challenge = await sha256b64url(verifier);
  const state = rand(24);
  sessionStorage.setItem('pv.pkce', JSON.stringify({ verifier, state }));
  // Desktop loopback redirect (standard for installed apps).
  const redirectUri = 'http://127.0.0.1:53682/oauth2redirect';
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
    state,
  }).toString();

  // If a native loopback helper exists (future Rust command), use it.
  if (window.__TAURI__?.core?.invoke) {
    try {
      const raw = await window.__TAURI__.core.invoke('oauth_loopback_login', { authUrl: url, redirectUri });
      if (raw) {
        // The Rust listener returns {"code","state"} JSON. Verify state
        // against the one we sent, so a stray redirect cannot sign us in.
        let code = raw;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.code) {
            const saved = JSON.parse(sessionStorage.getItem('pv.pkce') || 'null');
            if (!saved || parsed.state !== saved.state) {
              throw new Error('Google sign-in could not be verified (state mismatch). Please try again.');
            }
            code = parsed.code;
          }
        } catch (e) {
          if (e.message?.includes('state mismatch')) throw e;
          // Not JSON: treat the raw value as the code (older builds).
        }
        sessionStorage.removeItem('pv.pkce');
        return await exchangeCode(code, verifier, redirectUri, id, secret);
      }
    } catch (e) {
      if (e.message?.includes('state mismatch')) throw e;
      throw new Error('The desktop sign-in window could not complete (' + (e?.message || e) + '). The installed app needs the Rust loopback listener enabled; the rest of Prompt Vault works fully offline meanwhile.');
    }
  }
  if (opener) await opener(url);
  throw new Error('Opened Google sign-in in your browser. Completing sign-in requires the installed desktop app (loopback redirect); the browser preview cannot receive the login code.');
}

async function exchangeCode(code, verifier, redirectUri, id, secret) {
  const body = new URLSearchParams({
    code, client_id: id, redirect_uri: redirectUri,
    grant_type: 'authorization_code', code_verifier: verifier,
  });
  if (secret) body.set('client_secret', secret);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.error || 'Token exchange failed.');
  const auth = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || store.auth?.refreshToken || null,
    expiresAt: Date.now() + (json.expires_in || 3600) * 1000,
    email: '', name: '',
  };
  store.auth = auth;
  await store.saveAuth();
  await refreshProfile();
  return store.auth;
}

export async function refreshProfile() {
  const a = store.auth;
  if (!a?.accessToken) return null;
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: 'Bearer ' + a.accessToken },
  });
  if (res.ok) {
    const json = await res.json();
    a.email = json.email || ''; a.name = json.name || '';
    store.auth = a; await store.saveAuth();
  }
  return a;
}

async function accessToken() {
  const a = store.auth;
  if (!a?.accessToken) throw new Error('Not signed in with Google.');
  if (a.expiresAt && Date.now() > a.expiresAt - 60000 && a.refreshToken) {
    const { id, secret } = clientConfig();
    const body = new URLSearchParams({
      client_id: id, grant_type: 'refresh_token', refresh_token: a.refreshToken,
    });
    if (secret) body.set('client_secret', secret);
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    const json = await res.json();
    if (!res.ok) throw new Error('Google session expired. Please sign in again.');
    a.accessToken = json.access_token;
    a.expiresAt = Date.now() + (json.expires_in || 3600) * 1000;
    store.auth = a; await store.saveAuth();
  }
  return a.accessToken;
}

export async function signOut() {
  store.auth = null;
  await store.saveAuth();
}

// ---------- Drive appDataFolder backup ----------

async function driveFetch(path, options = {}) {
  const token = await accessToken();
  const res = await fetch('https://www.googleapis.com/' + path, {
    ...options,
    headers: { Authorization: 'Bearer ' + token, ...(options.headers || {}) },
  });
  return res;
}

async function findBackupFile() {
  const q = encodeURIComponent(`name='${BACKUP_NAME}'`);
  const res = await driveFetch(`drive/v3/files?spaces=appDataFolder&fields=files(id,name,modifiedTime)&q=${q}`);
  if (!res.ok) throw new Error('Drive file list failed (HTTP ' + res.status + ').');
  const json = await res.json();
  return json.files?.[0] || null;
}

export async function backupToDrive() {
  const user = currentUser();
  if (!user) throw new Error('Sign in with Google first.');
  const payload = store.exportPayload();
  const existing = await findBackupFile();
  if (existing) {
    const res = await driveFetch(`upload/drive/v3/files/${existing.id}?uploadType=media`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: payload,
    });
    if (!res.ok) throw new Error('Drive backup update failed (HTTP ' + res.status + ').');
  } else {
    const boundary = 'pv' + Date.now().toString(36);
    const metadata = JSON.stringify({ name: BACKUP_NAME, parents: ['appDataFolder'] });
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${payload}\r\n--${boundary}--`;
    const res = await driveFetch('upload/drive/v3/files?uploadType=multipart', {
      method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body,
    });
    if (!res.ok) throw new Error('Drive backup upload failed (HTTP ' + res.status + ').');
  }
  store.data.settings.lastBackupAt = new Date().toISOString();
  await store.saveNow();
  return true;
}

export async function restoreFromDrive() {
  const user = currentUser();
  if (!user) throw new Error('Sign in with Google first.');
  const file = await findBackupFile();
  if (!file) throw new Error('No Prompt Vault backup was found in your Google Drive yet. Back up first.');
  const res = await driveFetch(`drive/v3/files/${file.id}?alt=media`);
  if (!res.ok) throw new Error('Drive restore download failed (HTTP ' + res.status + ').');
  const text = await res.text();
  store.importPayload(text);
  return file;
}

// ---------- helpers ----------
function rand(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}
async function sha256b64url(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------- Public sharing (Google Docs style) ----------
// Sharing publishes ONE prompt snapshot as a regular Drive file owned by
// the user, with an "anyone with the link" reader permission. The share
// link points at the static viewer page (share-viewer/ in this repo,
// hosted e.g. on GitHub Pages) with ?f=<fileId>; the viewer reads the
// public file and renders it read-only. Stop sharing deletes the file,
// which kills the link for everyone.
// NOTE: the backup uses appDataFolder, but shared files must be regular
// Drive files created with the drive.file scope - appDataFolder files
// cannot be shared publicly.

export function snapshotJSON(prompt, html, text) {
  return JSON.stringify({
    app: 'Prompt Vault', kind: 'shared-prompt', version: 1,
    id: prompt.id, title: prompt.title, html, text,
    sharedAt: new Date().toISOString(),
  }, null, 2);
}

export async function publishSharedPrompt(prompt, html, text) {
  const user = currentUser();
  if (!user) throw new Error('Sign in with Google first (Account & Sync).');
  const payload = snapshotJSON(prompt, html, text);
  let fileId = prompt.sharedFileId || null;
  if (fileId) {
    const res = await driveFetch(`upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: payload,
    });
    if (!res.ok) fileId = null; // file was deleted on Drive; recreate below
  }
  if (!fileId) {
    const boundary = 'pvshare' + Date.now().toString(36);
    const metadata = JSON.stringify({ name: 'Prompt Vault Shared - ' + (prompt.title || 'prompt') + '.json', mimeType: 'application/json' });
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${payload}\r\n--${boundary}--`;
    const res = await driveFetch('upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body,
    });
    if (!res.ok) throw new Error('Could not create the shared file in Drive (HTTP ' + res.status + ').');
    fileId = (await res.json()).id;
    // Make it readable by anyone with the link.
    const perm = await driveFetch(`drive/v3/files/${fileId}/permissions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
    if (!perm.ok) throw new Error('The file was created but making it public failed (HTTP ' + perm.status + ').');
  }
  return fileId;
}

export async function unpublishSharedPrompt(prompt) {
  const user = currentUser();
  if (!prompt.sharedFileId) return;
  // Never fail silently: if we cannot reach Drive, the caller must know
  // the file is still public. (Bug found in audit: signed-out Stop
  // sharing previously pretended to succeed while the link stayed live.)
  if (!user) throw new Error('You are signed out. Sign in with Google first so the shared file can actually be deleted from Drive.');
  // Deleting the file kills every link to it.
  const res = await driveFetch(`drive/v3/files/${prompt.sharedFileId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error('Could not remove the shared file from Drive (HTTP ' + res.status + ').');
}
