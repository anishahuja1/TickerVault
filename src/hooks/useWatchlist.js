/**
 * TickerVault — Watchlist Hook (Backend-Backed).
 *
 * Fetches and manages the watchlist from the backend API.
 * Falls back to localStorage only when not authenticated.
 */

import { useState, useEffect, useCallback } from 'react';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../services/watchlistApi';
import { getBatchQuotes } from '../services/stockApi';
import { useAuth } from './useAuth';

export function useWatchlist() {
  const { isAuthenticated } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [stockData, setStockData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch watchlist from backend on mount / auth change
  useEffect(() => {
    if (!isAuthenticated) {
      setWatchlist([]);
      setStockData({});
      return;
    }

    const fetchWatchlist = async () => {
      setIsLoading(true);
      try {
        const data = await getWatchlist();
        const items = (data.items || []).map((item) => ({
          ticker: item.ticker,
          name: item.company_name,
          notes: item.notes,
        }));
        setWatchlist(items);

        // Fetch quotes for all tickers
        if (items.length > 0) {
          const tickers = items.map((i) => i.ticker);
          const quotes = await getBatchQuotes(tickers);

          const mapped = {};
          for (const [ticker, quote] of Object.entries(quotes)) {
            mapped[ticker] = {
              ticker,
              previous_close: quote.previous_close || quote.prev_close || 0,
              open: quote.open || 0,
              high: quote.high || 0,
              low: quote.low || 0,
              volume: quote.volume || 0,
              price: quote.price || 0,
              change: quote.change || 0,
              change_percent: quote.change_percent || 0,
            };
          }
          setStockData(mapped);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          setError('Server is starting up, please wait...');
        } else if (err.message === 'Failed to fetch') {
          setError('Cannot connect to terminal. Check your internet connection or backend status.');
        } else {
          setError(err.message || 'Something went wrong. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchWatchlist();
  }, [isAuthenticated]);

  // Add a ticker
  const addTicker = useCallback(
    async (tickerInfo) => {
      // Optimistic update
      setWatchlist((prev) => {
        if (prev.some((item) => item.ticker === tickerInfo.ticker)) return prev;
        return [...prev, { ticker: tickerInfo.ticker, name: tickerInfo.name }];
      });

      try {
        await addToWatchlist(tickerInfo.ticker, tickerInfo.name);

        // Fetch quote for new ticker
        const quotes = await getBatchQuotes([tickerInfo.ticker]);
        const quote = quotes[tickerInfo.ticker];
        if (quote) {
          setStockData((prev) => ({
            ...prev,
            [tickerInfo.ticker]: {
              ticker: tickerInfo.ticker,
              close: quote.previous_close,
              open: quote.open,
              high: quote.high,
              low: quote.low,
              volume: quote.volume,
              price: quote.price,
              change: quote.change,
              change_percent: quote.change_percent,
            },
          }));
        }
      } catch (error) {
        // Revert on failure
        setWatchlist((prev) => prev.filter((i) => i.ticker !== tickerInfo.ticker));
        console.error('Failed to add ticker:', error);
      }
    },
    []
  );

  // Remove a ticker
  const removeTicker = useCallback(async (ticker) => {
    const previous = watchlist;
    setWatchlist((prev) => prev.filter((item) => item.ticker !== ticker));
    setStockData((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });

    try {
      await removeFromWatchlist(ticker);
    } catch (error) {
      setWatchlist(previous); // Revert
      console.error('Failed to remove ticker:', error);
    }
  }, [watchlist]);

  return { watchlist, stockData, addTicker, removeTicker, isLoading, error };
}
