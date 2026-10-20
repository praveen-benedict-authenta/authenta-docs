/**
 * SHA-256 hashes of the keys that unlock the development-server toggle in the API Explorer.
 * Injected at build time by vocs.config.ts from the DEV_EXPLORER_KEYS GitHub secret, so the keys
 * themselves are never in the repo or the published JavaScript.
 * This only hides the toggle: anyone can still call platform-dev directly, so protect it on its own.
 */
declare const __DEV_EXPLORER_KEY_HASHES__: string[];
const ALLOWED_KEY_HASHES: string[] = typeof __DEV_EXPLORER_KEY_HASHES__ === 'undefined' ? [] : __DEV_EXPLORER_KEY_HASHES__;

const KEY_PARAM = 'devkey';
/** Holds the hash of the key this browser was unlocked with, so changing the secret locks it again */
const UNLOCK_STORAGE_KEY = 'authenta-api-explorer-unlock';

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function readUnlock(): string | null {
  try {
    return localStorage.getItem(UNLOCK_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeUnlock(hash: string | null) {
  try {
    if (hash) localStorage.setItem(UNLOCK_STORAGE_KEY, hash);
    else localStorage.removeItem(UNLOCK_STORAGE_KEY);
  } catch {
    /* storage unavailable — the unlock lasts until the page is reloaded */
  }
}

/** Removes ?devkey= from the address bar so the key isn't left in history or shared by copying the URL */
function stripKeyFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(KEY_PARAM)) return;
  url.searchParams.delete(KEY_PARAM);
  window.history.replaceState(window.history.state, '', url.toString());
}

/** Shared by every mount of the explorer: the first mount strips the key from the URL, so a second one couldn't see it */
let accessCheck: Promise<boolean> | null = null;

async function checkDevAccess(): Promise<boolean> {
  const key = new URL(window.location.href).searchParams.get(KEY_PARAM);

  if (key) {
    const hash = await sha256(key.trim());
    stripKeyFromUrl();
    if (ALLOWED_KEY_HASHES.includes(hash)) {
      writeUnlock(hash);
      return true;
    }
  }

  const stored = readUnlock();
  if (stored && ALLOWED_KEY_HASHES.includes(stored)) return true;
  if (stored) writeUnlock(null);
  return false;
}

/**
 * True when this browser is unlocked: either `?devkey=<key>` is in the URL now (and is remembered),
 * or it was unlocked before with a key that's still in the secret.
 */
export function hasDevAccess(): Promise<boolean> {
  accessCheck ??= checkDevAccess();
  return accessCheck;
}
