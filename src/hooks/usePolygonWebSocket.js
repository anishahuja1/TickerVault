import { useEffect, useRef, useState, useCallback } from 'react';
import { getApiKey } from '../components/ApiKeyModal';

const WS_URL = 'wss://socket.polygon.io/stocks';

const RECONNECT_INTERVALS = [1000, 2000, 4000, 8000, 16000, 30000];

/**
 * Custom hook for Polygon.io WebSocket connection.
 * Manages authentication, subscription to tickers, and real-time price updates.
 *
 * @param {string[]} tickers - Array of ticker symbols to subscribe to
 * @returns {{ priceData: Object, connectionStatus: string }}
 */
export function usePolygonWebSocket(tickers) {
  const [priceData, setPriceData] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const wsRef = useRef(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef(null);
  const subscribedTickers = useRef(new Set());
  const tickersRef = useRef(tickers);
  const isAuthenticated = useRef(false);

  // Keep tickersRef in sync
  useEffect(() => {
    tickersRef.current = tickers;
  }, [tickers]);

  const subscribe = useCallback((tickerList) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isAuthenticated.current) return;
    if (tickerList.length === 0) return;

    // Subscribe to Aggregate per Minute (AM) and Trades (T)
    const amParams = tickerList.map((t) => `AM.${t}`).join(',');
    const tParams = tickerList.map((t) => `T.${t}`).join(',');

    wsRef.current.send(JSON.stringify({ action: 'subscribe', params: `${amParams},${tParams}` }));
    tickerList.forEach((t) => subscribedTickers.current.add(t));
  }, []);

  const unsubscribe = useCallback((tickerList) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isAuthenticated.current) return;
    if (tickerList.length === 0) return;

    const amParams = tickerList.map((t) => `AM.${t}`).join(',');
    const tParams = tickerList.map((t) => `T.${t}`).join(',');

    wsRef.current.send(JSON.stringify({ action: 'unsubscribe', params: `${amParams},${tParams}` }));
    tickerList.forEach((t) => subscribedTickers.current.delete(t));
  }, []);

  const connect = useCallback(() => {
    const apiKey = getApiKey();
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      setConnectionStatus('disconnected');
      return;
    }

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setConnectionStatus('connecting');
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[WS] Connected, authenticating...');
      setConnectionStatus('authenticating');
      ws.send(JSON.stringify({ action: 'auth', params: apiKey }));
    };

    ws.onmessage = (event) => {
      try {
        const messages = JSON.parse(event.data);
        for (const msg of messages) {
          // Handle auth status
          if (msg.ev === 'status') {
            if (msg.status === 'auth_success') {
              console.log('[WS] Authenticated successfully');
              isAuthenticated.current = true;
              setConnectionStatus('connected');
              reconnectAttempt.current = 0;
              // Subscribe to current tickers
              if (tickersRef.current.length > 0) {
                subscribe(tickersRef.current);
              }
            } else if (msg.status === 'auth_failed') {
              console.error('[WS] Authentication failed:', msg.message);
              setConnectionStatus('auth_failed');
            }
          }

          // Handle Aggregate per Minute data
          if (msg.ev === 'AM') {
            setPriceData((prev) => ({
              ...prev,
              [msg.sym]: {
                price: msg.c,       // close price of the minute bar
                open: msg.o,
                high: msg.h,
                low: msg.l,
                volume: msg.v,
                vwap: msg.vw,
                timestamp: msg.e,   // end timestamp
                type: 'aggregate',
              },
            }));
          }

          // Handle Trade data (more frequent updates)
          if (msg.ev === 'T') {
            setPriceData((prev) => {
              const existing = prev[msg.sym];
              return {
                ...prev,
                [msg.sym]: {
                  ...existing,
                  price: msg.p,           // trade price
                  tradeSize: msg.s,       // trade size
                  timestamp: msg.t,       // timestamp
                  type: 'trade',
                },
              };
            });
          }
        }
      } catch (err) {
        console.error('[WS] Message parse error:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };

    ws.onclose = (event) => {
      console.log('[WS] Disconnected:', event.code, event.reason);
      isAuthenticated.current = false;
      setConnectionStatus('disconnected');
      subscribedTickers.current.clear();

      // Auto-reconnect with exponential backoff
      const delay = RECONNECT_INTERVALS[Math.min(reconnectAttempt.current, RECONNECT_INTERVALS.length - 1)];
      reconnectAttempt.current += 1;

      console.log(`[WS] Reconnecting in ${delay}ms...`);
      setConnectionStatus('reconnecting');
      reconnectTimer.current = setTimeout(() => {
        connect();
      }, delay);
    };

    wsRef.current = ws;
  }, [subscribe]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Handle ticker changes (subscribe/unsubscribe diffs)
  useEffect(() => {
    if (connectionStatus !== 'connected') return;

    const current = new Set(tickers);
    const subscribed = subscribedTickers.current;

    // New tickers to subscribe
    const toSubscribe = tickers.filter((t) => !subscribed.has(t));
    // Old tickers to unsubscribe
    const toUnsubscribe = [...subscribed].filter((t) => !current.has(t));

    if (toUnsubscribe.length > 0) unsubscribe(toUnsubscribe);
    if (toSubscribe.length > 0) subscribe(toSubscribe);
  }, [tickers, connectionStatus, subscribe, unsubscribe]);

  return { priceData, connectionStatus };
}
