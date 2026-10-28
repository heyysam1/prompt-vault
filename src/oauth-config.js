// Built-in Google OAuth client for Prompt Vault.
//
// The client values are NOT stored in this file or anywhere else in the
// repo. They are supplied at build time from one of:
//   1. src/oauth-config.local.js  (gitignored; exists only on the owner's
//      machine - see src/oauth-config.local.example.js for its shape)
//   2. the VITE_PV_OAUTH_CLIENT_ID / VITE_PV_OAUTH_CLIENT_SECRET
//      environment variables
//
// When both sources are empty, the app falls back to the previous
// behaviour: the owner can paste a personal Client ID / secret in the
// "Google sign-in setup" box in Account & Sync, and those values are
// used instead.

const localModules = import.meta.glob('./oauth-config.local.js', { eager: true });
const local = Object.values(localModules)[0] || {};

export const BUILT_IN_OAUTH_CLIENT_ID =
  import.meta.env.VITE_PV_OAUTH_CLIENT_ID || local.BUILT_IN_OAUTH_CLIENT_ID || '';
export const BUILT_IN_OAUTH_CLIENT_SECRET =
  import.meta.env.VITE_PV_OAUTH_CLIENT_SECRET || local.BUILT_IN_OAUTH_CLIENT_SECRET || '';
