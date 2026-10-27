// Built-in Google OAuth client for Prompt Vault.
//
// These constants hold the app's OWN OAuth client (a "Desktop app" client
// created once by the app owner in Google Cloud Console). They are NOT the
// end user's values: when they are filled in, every install of Prompt Vault
// can sign in to Google with a single click, and no per-user setup is ever
// shown in Account & Sync.
//
// When they are empty strings, the app falls back to the previous behaviour:
// the owner can paste a personal Client ID / secret in the "Google sign-in
// setup" box in Account & Sync, and those values are used instead.

export const BUILT_IN_OAUTH_CLIENT_ID = '634030976876-96bpgm3e0nbnprio644hftcr58ovvj0u.apps.googleusercontent.com';
export const BUILT_IN_OAUTH_CLIENT_SECRET = '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';
