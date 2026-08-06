const TOKEN_KEY = "salvio.access_token";
const REFRESH_TOKEN_KEY = "salvio.refresh_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearStoredRefreshToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
