/**
 * TickerVault — Stock Data API Client.
 *
 * All stock data goes through the backend (no direct external API calls).
 * Backend handles caching, rate limiting, and data enrichment.
 */

import { getToken } from './authApi';

const API_URL = (import.meta.env.VITE_API_URL || 'https://tickervault-api.onrender.com').replace(/\/+$/, '');
const API_BASE = `${API_URL}/api/v1`;
console.log('Stock API Base:', API_BASE);

async function apiFetch(path) {
  const token = getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `${API_BASE}${path}`;
    console.log('Calling:', url);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `API error: ${res.status}`);
    }

    return res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ── Search ───────────────────────────────────────────────────────────────

export async function searchTickers(query) {
  if (!query || query.trim().length < 1) return [];
  try {
    const data = await apiFetch(`/stocks/search?q=${encodeURIComponent(query)}`);
    return data.results || [];
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

// ── Quotes ───────────────────────────────────────────────────────────────

export async function getQuote(ticker) {
  return apiFetch(`/stocks/${encodeURIComponent(ticker)}/quote`);
}

export async function getBatchQuotes(tickers) {
  if (!tickers.length) return {};
  const joined = tickers.join(',');
  const data = await apiFetch(`/stocks/batch/quotes?tickers=${encodeURIComponent(joined)}`);
  return data.quotes || {};
}

// ── History (for charts) ─────────────────────────────────────────────────

export async function getHistory(ticker, period = '1mo', interval = '1d') {
  return apiFetch(
    `/stocks/${encodeURIComponent(ticker)}/history?period=${period}&interval=${interval}`
  );
}

export const getStockHistory = async (ticker, period = "1mo") => {
  // Return the inner data object because the backend now returns just the dictionary directly for get_stock_history
  return apiFetch(`/stocks/${encodeURIComponent(ticker)}/history?period=${period}`);
};

// ── Technical Indicators ─────────────────────────────────────────────────

export async function getIndicators(ticker, type = 'sma', period = '6mo', indicatorPeriod = 20) {
  return apiFetch(
    `/stocks/${encodeURIComponent(ticker)}/indicators?types=${type}&period=${period}&indicator_period=${indicatorPeriod}`
  );
}

// ── Company Info ─────────────────────────────────────────────────────────

export async function getCompanyInfo(ticker) {
  return apiFetch(`/stocks/${encodeURIComponent(ticker)}/info`);
}

// ── News ─────────────────────────────────────────────────────────────────

export async function getNews(ticker) {
  return apiFetch(`/stocks/${encodeURIComponent(ticker)}/news`);
}
