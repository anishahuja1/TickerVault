/**
 * TickerVault — Auth API Client.
 *
 * Handles JWT token storage and auth API calls.
 */

const API_URL = (import.meta.env.VITE_API_URL || 'https://tickervault-api.onrender.com').replace(/\/+$/, '');
const API_BASE = `${API_URL}/api/v1`;
console.log('Auth API Base:', API_BASE);
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
  // Frontend-side password length check (72 bytes for bcrypt)
  const passwordBytes = new TextEncoder().encode(password);
  if (passwordBytes.length > 72) {
    throw new Error('Password must be 72 bytes or fewer.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `${API_BASE}/auth/register`;
    console.log('Calling:', url);
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorMessage = `Server error (${res.status})`;
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          errorMessage = Array.isArray(errorData.detail)
            ? errorData.detail.map((e) => e.msg || e).join(', ')
            : String(errorData.detail);
        }
      } catch (_) {
        // Fallback for non-JSON responses
      }
      throw new Error(errorMessage);
    }

    const data = await res.json();
    setToken(data.access_token);
    setStoredUser(data.user);
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function login(username, password) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `${API_BASE}/auth/login`;
    console.log('Calling:', url);
    const res = await fetch(url, {
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
    throw err;
  }
}

export async function fetchMe() {
  const token = getToken();
  if (!token) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `${API_BASE}/auth/me`;
    console.log('Calling:', url);
    const res = await fetch(url, {
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
