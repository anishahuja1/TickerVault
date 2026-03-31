import { getApiKey } from '../components/ApiKeyModal';

const BASE_URL = 'https://api.polygon.io';

function apiKey() {
  return getApiKey();
}

/**
 * Search for stock tickers matching a query string.
 * Uses Polygon.io Reference Tickers endpoint.
 * @param {string} query - Search term (ticker or company name)
 * @returns {Promise<Array>} Array of ticker objects
 */
export async function searchTickers(query) {
  if (!query || query.trim().length === 0) return [];

  const url = `${BASE_URL}/v3/reference/tickers?search=${encodeURIComponent(query)}&market=stocks&active=true&limit=10&apiKey=${apiKey()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Ticker search failed:', error);
    return [];
  }
}

/**
 * Get previous trading day's close data for a ticker.
 * @param {string} ticker - Stock ticker symbol (e.g., "AAPL")
 * @returns {Promise<Object|null>} Previous close data or null
 */
export async function getPreviousClose(ticker) {
  const url = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(ticker)}/prev?adjusted=true&apiKey=${apiKey()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        ticker: result.T,
        open: result.o,
        high: result.h,
        low: result.l,
        close: result.c,
        volume: result.v,
        vwap: result.vw,
        timestamp: result.t,
      };
    }
    return null;
  } catch (error) {
    console.error(`Previous close failed for ${ticker}:`, error);
    return null;
  }
}

/**
 * Get previous close data for multiple tickers in parallel.
 * @param {string[]} tickers - Array of ticker symbols
 * @returns {Promise<Object>} Map of ticker -> close data
 */
export async function getBatchPreviousClose(tickers) {
  const results = await Promise.allSettled(
    tickers.map((t) => getPreviousClose(t))
  );

  const dataMap = {};
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      dataMap[tickers[index]] = result.value;
    }
  });

  return dataMap;
}

/**
 * Get a snapshot of a single ticker (requires paid plan).
 * Falls back gracefully if unavailable.
 * @param {string} ticker
 * @returns {Promise<Object|null>}
 */
export async function getTickerSnapshot(ticker) {
  const url = `${BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(ticker)}?apiKey=${apiKey()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null; // Graceful fallback for free tier
    const data = await response.json();
    if (data.ticker) {
      return {
        ticker: data.ticker.ticker,
        todaysChange: data.ticker.todaysChange,
        todaysChangePerc: data.ticker.todaysChangePerc,
        day: data.ticker.day,
        prevDay: data.ticker.prevDay,
        lastTrade: data.ticker.lastTrade,
        min: data.ticker.min,
      };
    }
    return null;
  } catch {
    return null;
  }
}
