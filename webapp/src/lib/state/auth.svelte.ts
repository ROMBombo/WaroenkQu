import type { AuthTokens, AuthUser } from '$lib/api/types';

const STORAGE_KEY = 'waroenkqu.auth';

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

/** Waktu kedaluwarsa JWT (detik epoch), dibaca dari payload tanpa verifikasi. */
function tokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Sesi login. Access token & refresh token disimpan di localStorage supaya sesi bertahan saat halaman di-refresh.
 * Refresh token dirotasi oleh API: setiap refresh menghasilkan pasangan token baru.
 */
class AuthStore {
  user = $state<AuthUser | null>(null);
  accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshing: Promise<boolean> | null = null;

  constructor() {
    if (typeof localStorage === 'undefined') return;
    const session = readSession();
    if (session) this.setSession(session);
  }

  get isLoggedIn(): boolean {
    return this.user !== null;
  }

  can(permission: string): boolean {
    return this.user?.permissions.includes(permission) ?? false;
  }

  /** true kalau access token sudah atau hampir (10 detik lagi) kedaluwarsa. */
  isAccessTokenExpired(): boolean {
    const exp = this.accessToken ? tokenExpiry(this.accessToken) : null;
    return exp === null || exp * 1000 - Date.now() < 10_000;
  }

  /** null kalau berhasil. Kalau gagal, status HTTP-nya (0 = tidak bisa terhubung ke server). */
  async login(username: string, password: string): Promise<{ status: number } | null> {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username, password }),
    }).catch(() => null);
    if (!response) return { status: 0 };
    if (!response.ok) return { status: response.status };
    this.applyTokens((await response.json()).data as AuthTokens);
    return null;
  }

  /** Request refresh yang bersamaan digabung jadi satu, karena refresh token hanya bisa dipakai sekali. */
  refresh(): Promise<boolean> {
    this.refreshing ??= this.doRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  logout(): void {
    this.user = null;
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  private async doRefresh(): Promise<boolean> {
    if (!this.refreshToken) return false;
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    }).catch(() => null);
    if (!response?.ok) return false;
    this.applyTokens((await response.json()).data as AuthTokens);
    return true;
  }

  private applyTokens(tokens: AuthTokens): void {
    const session = { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, user: tokens.user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.setSession(session);
  }

  private setSession(session: StoredSession): void {
    this.accessToken = session.accessToken;
    this.refreshToken = session.refreshToken;
    this.user = session.user;
  }
}

export const auth = new AuthStore();
