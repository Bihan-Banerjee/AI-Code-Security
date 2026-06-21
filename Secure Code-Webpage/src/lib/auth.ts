// Single source of truth for auth token + username storage.
// Reads check sessionStorage first, then localStorage, so callers stay consistent.

const TOKEN_KEY = "token";
const USER_KEY = "username";

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY) ?? null;
}

export function getUsername(): string | null {
  return sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY) ?? null;
}

export function setAuth(token: string, username: string, remember = false): void {
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, username);
  // Notify same-tab listeners (the native 'storage' event only fires cross-tab).
  window.dispatchEvent(new Event("auth-change"));
}

export function clearAuth(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("auth-change"));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
