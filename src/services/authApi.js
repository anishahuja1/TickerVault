/**
 * TickerVault — Auth API Client.
 *
 * Handles JWT token storage and auth API calls.
 */

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE = `${API_URL}/api/v1`;
const TOKEN_KEY = 'tickervault_token';
const USER_KEY = 'tickervault_user';

// ── Token Management ─────────────────────────────────────────────────────

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export function hasValidToken() {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// ── Auth API Calls ───────────────────────────────────────────────────────

export async function register(username, email, password) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let message = err.detail || 'Registration failed';
      if (Array.isArray(message)) {
        message = message.map((m) => m.msg).join(', ');
      }
      throw new Error(message);
    }

    const data = await res.json();
    setToken(data.access_token);
    setStoredUser(data.user);
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Server is waking up, please try again in 30 seconds.');
    }
    throw err;
  }
}

export async function login(username, password) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let message = err.detail || 'Login failed';
      if (Array.isArray(message)) {
        message = message.map((m) => m.msg).join(', ');
      }
      throw new Error(message);
    }

    const data = await res.json();
    setToken(data.access_token);
    setStoredUser(data.user);
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Server is waking up, please try again in 30 seconds.');
    }
    throw err;
  }
}

export async function fetchMe() {
  const token = getToken();
  if (!token) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      clearAuth();
      return null;
    }

    const user = await res.json();
    setStoredUser(user);
    return user;
  } catch (err) {
    clearTimeout(timeoutId);
    return null; // Silent fail for initial check
  }
}
