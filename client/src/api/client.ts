/**
 * Base API client.
 *
 * - All requests go to /api/* (proxied to Express in dev, served directly in prod)
 * - Cookies are sent automatically (credentials: 'include')
 * - ISO date strings in responses are auto-converted to JS Date (via reviver)
 * - Non-OK responses throw a descriptive Error
 */

function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d;
  }
  return value;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body = text ? JSON.parse(text, reviveDates) : {};
  if (!res.ok) {
    throw new Error(body.message ?? `שגיאה ${res.status}`);
  }
  return body as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  return parseResponse<T>(res);
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return parseResponse<T>(res);
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return parseResponse<T>(res);
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse<T>(res);
}
