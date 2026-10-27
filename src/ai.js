// AI provider calls, model fetching and semantic search.
// Every call uses the USER's own API key, stored locally only.
// Providers: Google Gemini, OpenAI, Anthropic, OpenRouter, Local Ollama.

import { store, PROVIDERS, modelId } from './store.js';

export function activeProvider() {
  // first provider (in a sensible order) that has a key or is keyless Ollama with a model set
  for (const p of ['gemini', 'openai', 'anthropic', 'openrouter', 'ollama']) {
    const k = store.keys[p];
    if (k && (k.key || p === 'ollama')) return p;
  }
  return null;
}
export function hasAnyKey() { return !!activeProvider(); }
export function providerConfig(provider) {
  const k = store.keys[provider] || {};
  const display = k.customModel || k.model || 'Latest';
  return { key: k.key || '', model: modelId(provider, display), display };
}

async function fetchJSON(url, options, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    if (!res.ok) {
      const msg = json?.error?.message || json?.message || text.slice(0, 200) || ('HTTP ' + res.status);
      throw new Error(msg);
    }
    return json;
  } finally { clearTimeout(t); }
}

export async function chat(provider, messages) {
  const cfg = providerConfig(provider);
  if (provider === 'gemini') {
    if (!cfg.key) throw new Error('No Gemini API key saved.');
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const json = await fetchJSON(
      `${PROVIDERS.gemini.base}/models/${cfg.model}:generateContent?key=${encodeURIComponent(cfg.key)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents }) }
    );
    return json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  }
  if (provider === 'anthropic') {
    if (!cfg.key) throw new Error('No Anthropic API key saved.');
    const system = messages.find((m) => m.role === 'system')?.content;
    const rest = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));
    const json = await fetchJSON(`${PROVIDERS.anthropic.base}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'x-api-key': cfg.key,
        'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: cfg.model, max_tokens: 1024, system, messages: rest }),
    });
    return json.content?.map((b) => b.text || '').join('') || '';
  }
  // OpenAI-compatible: openai, openrouter, ollama
  const base = PROVIDERS[provider].base;
  if (provider !== 'ollama' && !cfg.key) throw new Error('No API key saved for ' + PROVIDERS[provider].label + '.');
  const headers = { 'Content-Type': 'application/json' };
  if (cfg.key) headers['Authorization'] = 'Bearer ' + cfg.key;
  const json = await fetchJSON(`${base}/chat/completions`, {
    method: 'POST', headers,
    body: JSON.stringify({ model: cfg.model, messages }),
  });
  return json.choices?.[0]?.message?.content || '';
}

export async function fetchModels(provider) {
  const k = store.keys[provider] || {};
  if (provider === 'gemini') {
    if (!k.key) throw new Error('Add your Gemini API key first.');
    const json = await fetchJSON(`${PROVIDERS.gemini.base}/models?key=${encodeURIComponent(k.key)}`);
    return (json.models || []).map((m) => m.name.replace(/^models\//, '')).filter(Boolean);
  }
  if (provider === 'anthropic') throw new Error('Anthropic does not offer a public model list endpoint. Pick from the list or type a Custom model.');
  const base = PROVIDERS[provider].base;
  const headers = {};
  if (k.key) headers['Authorization'] = 'Bearer ' + k.key;
  const json = await fetchJSON(`${base}/models`, { headers });
  return (json.data || []).map((m) => m.id).filter(Boolean);
}

// ---------- Semantic search ----------
// With a Gemini or OpenAI key we embed the query and every prompt, then rank
// by cosine similarity. Result is cached per session in memory.

let embedCache = new Map();

async function embed(provider, texts) {
  const cfg = providerConfig(provider);
  if (provider === 'gemini') {
    const out = [];
    for (const text of texts) {
      const json = await fetchJSON(
        `${PROVIDERS.gemini.base}/models/text-embedding-004:embedContent?key=${encodeURIComponent(cfg.key)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 8000) }] } }) }
      );
      out.push(json.embedding?.values || []);
    }
    return out;
  }
  const json = await fetchJSON(`${PROVIDERS[provider].base}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
    body: JSON.stringify({ model: provider === 'openai' ? 'text-embedding-3-small' : 'text-embedding-3-small', input: texts.map((t) => t.slice(0, 8000)) }),
  });
  return (json.data || []).map((d) => d.embedding || []);
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export function semanticProvider() {
  if (store.keys.gemini?.key) return 'gemini';
  if (store.keys.openai?.key) return 'openai';
  return null;
}

export async function semanticSearch(query, prompts, textOf) {
  const provider = semanticProvider();
  if (!provider) return null; // caller falls back to keyword/fuzzy
  const q = query.trim();
  if (!q) return null;
  const [qVec] = await embed(provider, [q]);
  if (!qVec?.length) return null;
  const scored = [];
  for (const p of prompts) {
    const cacheKey = p.id + ':' + (p.updatedAt || '');
    let vec = embedCache.get(cacheKey);
    if (!vec) {
      const [v] = await embed(provider, [(p.title + '\n' + textOf(p)).slice(0, 4000)]);
      vec = v; embedCache.set(cacheKey, vec);
    }
    scored.push({ p, score: vec?.length ? cosine(qVec, vec) : 0 });
  }
  return scored.filter((s) => s.score > 0.25).sort((a, b) => b.score - a.score).map((s) => s.p);
}

export function fuzzyScore(text, query) {
  const t = text.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  let score = 0;
  for (const w of words) {
    if (t.includes(w)) score += 3;
    else {
      // subsequence fuzzy match
      let i = 0;
      for (const ch of t) { if (ch === w[i]) i++; if (i === w.length) break; }
      if (i === w.length) score += 1;
    }
  }
  return score;
}
