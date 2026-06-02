const KEY = "asab.tokens";

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export function getTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export function setTokens(t: Tokens): void {
  localStorage.setItem(KEY, JSON.stringify(t));
}

export function clearTokens(): void {
  localStorage.removeItem(KEY);
}
