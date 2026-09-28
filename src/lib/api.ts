import { apiUrl } from '../api';

const ADMIN_KEY_STORAGE = 'orionsoft-admin-api-key';

export function getAdminKey(): string {
  try {
    return sessionStorage.getItem(ADMIN_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setAdminKey(key: string): void {
  try {
    if (key.trim()) sessionStorage.setItem(ADMIN_KEY_STORAGE, key.trim());
    else sessionStorage.removeItem(ADMIN_KEY_STORAGE);
  } catch {
    // Session storage may be unavailable in a restricted browser.
  }
}

export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const key = getAdminKey();
  if (key) headers.set('X-API-Key', key);
  return fetch(apiUrl(path), { ...options, headers });
}
