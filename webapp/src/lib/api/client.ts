import { auth } from '$lib/state/auth.svelte';
import type { ApiBody, FieldError } from './types';

/** Semua request lewat nginx: /api/* diteruskan ke API Services. */
const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }

  /** Error validasi per field, dari details response VALIDATION_ERROR. */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    return Object.fromEntries(
      (this.details as FieldError[]).map((error) => [error.field, error.messages.join(', ')]),
    );
  }
}

type Query = Record<string, string | number | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** false untuk endpoint publik (login, refresh). */
  authenticated?: boolean;
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
}

async function send(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Tidak bisa terhubung ke server');
  }
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error ?? {};
    throw new ApiError(response.status, error.code ?? `HTTP_${response.status}`, error.message ?? response.statusText, error.details);
  }
  return body as T;
}

/**
 * Request ke API Services. Kalau access token kedaluwarsa (401), token di-refresh sekali lalu request diulang.
 * Kalau refresh juga gagal, user di-logout.
 */
export async function api<T, M = undefined>(path: string, options: RequestOptions = {}): Promise<ApiBody<T, M>> {
  const authenticated = options.authenticated ?? true;
  let response = await send(path, options, authenticated ? auth.accessToken : null);

  if (response.status === 401 && authenticated) {
    if (await auth.refresh()) {
      response = await send(path, options, auth.accessToken);
    } else {
      auth.logout();
    }
  }
  return parse<ApiBody<T, M>>(response);
}
