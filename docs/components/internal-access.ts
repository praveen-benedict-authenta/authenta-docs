/**
 * SHA-256 hashes of the public IPs that see the development-server toggle in the API Explorer.
 * Injected at build time by vocs.config.ts from the DEV_EXPLORER_IPS GitHub secret, so the IPs
 * themselves are never in the repo or the published JavaScript.
 * This only hides the toggle: anyone can still call platform-dev directly, so protect it on its own.
 */
declare const __DEV_EXPLORER_IP_HASHES__: string[];
const ALLOWED_IP_HASHES: string[] = typeof __DEV_EXPLORER_IP_HASHES__ === 'undefined' ? [] : __DEV_EXPLORER_IP_HASHES__;

/** IPv4-only and dual-stack lookups, so a visitor on IPv6 is still matched by their IPv4 address */
const IP_LOOKUP_URLS = ['https://api.ipify.org?format=json', 'https://api64.ipify.org?format=json'];

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function lookupIp(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { ip?: unknown };
    return typeof body.ip === 'string' ? body.ip : null;
  } catch {
    return null;
  }
}

/** True when the visitor's public IP is on the allow list. Never looks up the IP while the list is empty. */
export async function isInternalVisitor(): Promise<boolean> {
  if (ALLOWED_IP_HASHES.length === 0) return false;
  const ips = await Promise.all(IP_LOOKUP_URLS.map(lookupIp));
  const hashes = await Promise.all(ips.filter((ip): ip is string => ip !== null).map(sha256));
  return hashes.some(hash => ALLOWED_IP_HASHES.includes(hash));
}
