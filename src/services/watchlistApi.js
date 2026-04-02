/**
 * TickerVault — Watchlist API Client.
 */

import { getToken } from './authApi';

const API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = `${API_URL.replace(/\/+$/, '')}/api/v1`;

async function authFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error: ${res.status}`);
  }

  // Handle empty responses (DELETE)
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export async function getWatchlist() {
  return authFetch('/watchlist');
}

export async function addToWatchlist(ticker, companyName = '', notes = null) {
  return authFetch('/watchlist', {
    method: 'POST',
    body: JSON.stringify({
      ticker: ticker.toUpperCase(),
      company_name: companyName,
      notes,
    }),
  });
}

export async function removeFromWatchlist(ticker) {
  return authFetch(`/watchlist/${encodeURIComponent(ticker.toUpperCase())}`, {
    method: 'DELETE',
  });
}

export async function exportWatchlistCSV() {
  const token = getToken();
  const res = await fetch(`${API_BASE}/watchlist/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'watchlist.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Alerts ───────────────────────────────────────────────────────────────

export async function getAlerts() {
  return authFetch('/alerts');
}

export async function createAlert(ticker, targetPrice, condition) {
  return authFetch('/alerts', {
    method: 'POST',
    body: JSON.stringify({
      ticker: ticker.toUpperCase(),
      target_price: targetPrice,
      condition,
    }),
  });
}

export async function deleteAlert(alertId) {
  return authFetch(`/alerts/${alertId}`, { method: 'DELETE' });
}

// ── Portfolio ────────────────────────────────────────────────────────────

export async function getPortfolio() {
  return authFetch('/portfolio');
}

export async function addTransaction(ticker, companyName, type, quantity, pricePerShare, notes = null) {
  return authFetch('/portfolio/transactions', {
    method: 'POST',
    body: JSON.stringify({
      ticker: ticker.toUpperCase(),
      company_name: companyName,
      transaction_type: type,
      quantity,
      price_per_share: pricePerShare,
      notes,
    }),
  });
}

export async function getTransactions() {
  return authFetch('/portfolio/transactions');
}
