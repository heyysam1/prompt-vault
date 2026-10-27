// Data layer.
// In the Tauri app, data is persisted through Rust commands into the OS
// app-data folder (vault.json). In a plain browser (dev preview) it falls
// back to localStorage so the UI still works end to end.
// API keys live in a SEPARATE store (api_keys.json / localStorage key) and
// are never part of the vault object, so they can never be synced to Drive.

const LS_VAULT = 'promptvault.vault.v1';
const LS_KEYS = 'promptvault.keys.v1';
const LS_AUTH = 'promptvault.auth.v1';

import { TEMPLATES } from './templates-data.js';

export const isTauri = typeof window !== 'undefined' && !!window.__TAURI__?.core?.invoke;
const invoke = (...args) => window.__TAURI__.core.invoke(...args);

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
export function nowISO() { return new Date().toISOString(); }

export const FONT_LIST = [
  'Inter', 'Hind Siliguri', 'Noto Sans Bengali', 'Noto Serif Bengali',
  'Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Trebuchet MS',
  'Georgia', 'Times New Roman', 'Palatino', 'Garamond',
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Source Sans 3',
  'Merriweather', 'Playfair Display', 'Lora', 'PT Serif',
  'Baloo Da 2', 'Tiro Bangla', 'SolaimanLipi', 'Kalpurush',
  'Comic Sans MS', 'Impact', 'Courier New',
];

export const PROVIDERS = {
  gemini: {
    label: 'Google Gemini',
    models: ['Latest', 'Gemini 3 Pro', 'Gemini 3 Flash', 'Gemini 2.5 Pro', 'Gemini 2.5 Flash', 'Gemini 2.5 Flash-Lite', 'Gemini 2.0 Flash', 'Gemini 1.5 Pro', 'Gemini 1.5 Flash'],
    base: 'https://generativelanguage.googleapis.com/v1beta',
    keyPlaceholder: 'AIza...',
  },
  openai: {
    label: 'OpenAI',
    models: ['Latest', 'GPT-5', 'GPT-5 Mini', 'GPT-5 Nano', 'GPT-4.1', 'GPT-4.1 Mini', 'GPT-4o', 'GPT-4o Mini', 'o3', 'o4-mini'],
    base: 'https://api.openai.com/v1',
    keyPlaceholder: 'sk-...',
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    models: ['Latest', 'Claude Sonnet 4.5', 'Claude Opus 4.5', 'Claude Haiku 4.5', 'Claude Sonnet 4', 'Claude Opus 4', 'Claude 3.7 Sonnet', 'Claude 3.5 Haiku'],
    base: 'https://api.anthropic.com/v1',
    keyPlaceholder: 'sk-ant-...',
  },
  openrouter: {
    label: 'OpenRouter',
    models: ['Latest', 'openai/gpt-5', 'anthropic/claude-sonnet-4.5', 'google/gemini-3-pro', 'meta-llama/llama-4-maverick', 'deepseek/deepseek-r1', 'mistralai/mistral-large'],
    base: 'https://openrouter.ai/api/v1',
    keyPlaceholder: 'sk-or-...',
  },
  ollama: {
    label: 'Local (Ollama)',
    models: ['Latest', 'llama3.1', 'llama3.2', 'mistral', 'qwen2.5', 'phi3', 'gemma2'],
    base: 'http://localhost:11434/v1',
    keyPlaceholder: 'No key needed for local Ollama',
  },
};

// Model id resolution for well known display names; unknown names pass through.
export const MODEL_IDS = {
  'Gemini 3 Pro': 'gemini-3-pro-preview', 'Gemini 3 Flash': 'gemini-3-flash-preview',
  'Gemini 2.5 Pro': 'gemini-2.5-pro', 'Gemini 2.5 Flash': 'gemini-2.5-flash',
  'Gemini 2.5 Flash-Lite': 'gemini-2.5-flash-lite', 'Gemini 2.0 Flash': 'gemini-2.0-flash',
  'Gemini 1.5 Pro': 'gemini-1.5-pro', 'Gemini 1.5 Flash': 'gemini-1.5-flash',
  'GPT-5': 'gpt-5', 'GPT-5 Mini': 'gpt-5-mini', 'GPT-5 Nano': 'gpt-5-nano',
  'GPT-4.1': 'gpt-4.1', 'GPT-4.1 Mini': 'gpt-4.1-mini', 'GPT-4o': 'gpt-4o', 'GPT-4o Mini': 'gpt-4o-mini',
  'Claude Sonnet 4.5': 'claude-sonnet-4-5', 'Claude Opus 4.5': 'claude-opus-4-5',
  'Claude Haiku 4.5': 'claude-haiku-4-5', 'Claude Sonnet 4': 'claude-sonnet-4-0',
  'Claude Opus 4': 'claude-opus-4-0', 'Claude 3.7 Sonnet': 'claude-3-7-sonnet-latest',
  'Claude 3.5 Haiku': 'claude-3-5-haiku-latest',
};
export function modelId(provider, display) {
  if (!display || display === 'Latest') {
    const list = PROVIDERS[provider]?.models || [];
    const first = list.find((m) => m !== 'Latest');
    return MODEL_IDS[first] || (first ? first.toLowerCase().replace(/\s+/g, '-') : 'default');
  }
  return MODEL_IDS[display] || display;
}

// Built-in templates live in templates-data.js as rich HTML, one distinct
// structure per template (headings, tables, checklists, quote blocks,
// highlight lines, image placeholders). seedTemplates() maps them into the
// vault shape. When the shipped set changes, bump TEMPLATES_VERSION: the
// migration in VaultStore then swaps the built-ins on existing installs
// while keeping every user-made (custom) template untouched.
const TEMPLATE_GROUP_COLORS = { Image: '#D97706', Video: '#DB2777', Coding: '#1A56DB', Writing: '#7C3AED', Business: '#0F766E', Study: '#059669' };
export const TEMPLATES_VERSION = 3;

export function seedTemplates() {
  return TEMPLATES.map((t) => ({
    id: t.id,
    group: t.group,
    color: TEMPLATE_GROUP_COLORS[t.group] || '#1A56DB',
    title: t.name,
    body: t.html,
    custom: false,
  }));
}

function seedVault() {
  // First run starts completely empty: no sample prompts, notes or
  // activity. Only the built-in templates ship with the app (they are
  // part of the app, not user data). Every screen has a calm empty
  // state, and Insights numbers all read 0 until real data builds up.
  return {
    version: 1,
    templatesVersion: TEMPLATES_VERSION,
    prompts: [],
    notes: [],
    templates: seedTemplates(),
    activity: [],
    settings: {
      theme: 'light',
      defaultFont: 'Inter',
      onboardingSeen: false,
      googleClientId: '',
    },
  };
}

class VaultStore {
  constructor() {
    this.data = null;
    this.keys = {};   // { provider: { key, model, customModel, fetchedModels } }
    this.auth = null; // { email, name, accessToken, refreshToken, expiresAt }
    this._saveTimer = null;
  }

  async init() {
    let raw = null;
    if (isTauri) {
      try { raw = await invoke('load_vault'); } catch (e) { console.warn('load_vault failed', e); }
    } else {
      raw = localStorage.getItem(LS_VAULT);
    }
    if (raw) {
      try { this.data = JSON.parse(raw); } catch { this.data = null; }
    }
    if (!this.data || !Array.isArray(this.data.prompts)) {
      this.data = seedVault();
      await this.saveNow();
    }
    // merge any missing defaults for older files
    this.data.settings = Object.assign(seedVault().settings, this.data.settings || {});
    if (!Array.isArray(this.data.templates) || !this.data.templates.length) this.data.templates = seedTemplates();
    // Built-in template upgrade: when the shipped templates change (richer
    // formatting etc.), replace the old built-ins but keep the user's own.
    if (this.data.templatesVersion !== TEMPLATES_VERSION) {
      const mine = (this.data.templates || []).filter((t) => t.custom);
      this.data.templates = [...seedTemplates(), ...mine];
      this.data.templatesVersion = TEMPLATES_VERSION;
    }
    if (!Array.isArray(this.data.activity)) this.data.activity = [];

    let kraw = null;
    if (isTauri) { try { kraw = await invoke('load_api_keys'); } catch {} }
    else kraw = localStorage.getItem(LS_KEYS);
    if (kraw) { try { this.keys = JSON.parse(kraw) || {}; } catch { this.keys = {}; } }

    let araw = null;
    if (isTauri) { try { araw = await invoke('load_auth'); } catch {} }
    else araw = localStorage.getItem(LS_AUTH);
    if (araw) { try { this.auth = JSON.parse(araw); } catch { this.auth = null; } }
    return this.data;
  }

  save() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.saveNow(), 250);
  }
  async saveNow() {
    const raw = JSON.stringify(this.data);
    if (isTauri) { try { await invoke('save_vault', { contents: raw }); } catch (e) { console.warn(e); } }
    else localStorage.setItem(LS_VAULT, raw);
  }
  async saveKeys() {
    const raw = JSON.stringify(this.keys);
    if (isTauri) { try { await invoke('save_api_keys', { contents: raw }); } catch (e) { console.warn(e); } }
    else localStorage.setItem(LS_KEYS, raw);
  }
  async saveAuth() {
    const raw = JSON.stringify(this.auth || null);
    if (isTauri) { try { await invoke('save_auth', { contents: raw }); } catch (e) { console.warn(e); } }
    else localStorage.setItem(LS_AUTH, raw);
  }

  logActivity(type, promptId, title) {
    this.data.activity.unshift({ id: uid(), type, promptId: promptId || null, title: title || '', at: nowISO() });
    if (this.data.activity.length > 3000) this.data.activity.length = 3000;
    this.save();
  }

  activePrompts() { return this.data.prompts.filter((p) => !p.deletedAt); }
  trashedPrompts() { return this.data.prompts.filter((p) => p.deletedAt); }
  activeNotes() { return this.data.notes.filter((n) => !n.deletedAt); }
  getPrompt(id) { return this.data.prompts.find((p) => p.id === id); }
  getNote(id) { return this.data.notes.find((n) => n.id === id); }

  /** The exact payload that goes to Google Drive. Keys/auth are never in here. */
  exportPayload() {
    return JSON.stringify({
      app: 'Prompt Vault', version: 1, exportedAt: nowISO(),
      prompts: this.data.prompts, notes: this.data.notes,
      templates: this.data.templates, activity: this.data.activity,
      // The OAuth client secret is a credential: it never rides along
      // in a backup or export. It stays only in local settings.
      settings: { ...this.data.settings, googleClientSecret: undefined },
    }, null, 2);
  }
  importPayload(json) {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    if (!obj || !Array.isArray(obj.prompts)) throw new Error('This file is not a Prompt Vault backup.');
    this.data.prompts = obj.prompts;
    this.data.notes = Array.isArray(obj.notes) ? obj.notes : [];
    this.data.templates = Array.isArray(obj.templates) && obj.templates.length ? obj.templates : seedTemplates();
    this.data.activity = Array.isArray(obj.activity) ? obj.activity : [];
    if (obj.settings) this.data.settings = Object.assign(this.data.settings, obj.settings);
    this.save();
  }
}

export const store = new VaultStore();

export function plainText(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return (div.textContent || '').replace(/\s+\n/g, '\n').trim();
}
export function promptHTML(p) {
  const tab = p.tabs[p.activeTab || 0] || p.tabs[0] || { html: '' };
  return tab.html || '';
}
export function promptText(p) { return plainText(promptHTML(p)); }
export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const yest = new Date(Date.now() - 864e5).toDateString() === d.toDateString();
  const datePart = sameDay ? 'Today' : yest ? 'Yesterday' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return datePart + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function highlight(text, query) {
  const safe = esc(text);
  if (!query) return safe;
  const q = query.trim().split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!q.length) return safe;
  return safe.replace(new RegExp('(' + q.join('|') + ')', 'gi'), '<mark>$1</mark>');
}
