/**
 * TickerVault — WebSocket Hook for price streaming.
 *
 * Connects to the backend WebSocket, authenticates with JWT,
 * and streams real-time price updates for subscribed tickers.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getToken } from '../services/authApi';

const getWsUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://tickervault-api.onrender.com';
  const url = `${apiUrl.replace(/\/+$/, '').replace(/^http/, 'ws')}/api/v1/ws/prices`;
  console.log('WS URL (useStockWebSocket):', url);
  return url;
};
const RECONNECT_INTERVALS = [1000, 2000, 4000, 8000, 16000, 30000];

export function useStockWebSocket(tickers) {
  const [priceData, setPriceData] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastTriggeredAlert, setLastTriggeredAlert] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef(null);
  const tickersRef = useRef(tickers);

  useEffect(() => {
    tickersRef.current = tickers;
  }, [tickers]);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) {
      setConnectionStatus('disconnected');
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionStatus('connecting');
    // Send token in query auth per robust implementation
    const url = `${getWsUrl()}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      reconnectAttempt.current = 0;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'price_update') {
          // Backend sends list of updates: {"type": "price_update", "data": [{"ticker": "AAPL", "price": 100}]}
          if (Array.isArray(msg.data)) {
            setPriceData((prev) => {
              const newData = { ...prev };
              msg.data.forEach((item) => {
                if (item.ticker) {
                  newData[item.ticker] = {
                    ...item,
                    timestamp: Date.now()
                  };
                }
              });
              return newData;
            });
          } else if (msg.ticker) {
            // Our backend might send single dicts
            setPriceData((prev) => ({
              ...prev,
              [msg.ticker]: {
                ...msg,
                timestamp: Date.now(),
              },
            }));
          }
        } else if (msg.type === 'alert_triggered') {
          setLastTriggeredAlert({
            ...msg.data,
            timestamp: Date.now()
          });
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onerror = () => {
      setConnectionStatus('disconnected');
    };

    ws.onclose = (event) => {
      setConnectionStatus('disconnected');
      wsRef.current = null;
      
      // Don't reconnect if closed due to auth failure (1008)
      if (event.code === 1008) {
        console.warn('WebSocket closed due to auth failure — not reconnecting');
        return;
      }

    const delay = RECONNECT_INTERVALS[
      Math.min(reconnectAttempt.current, RECONNECT_INTERVALS.length - 1)
    ];
    if (reconnectAttempt.current >= 15) {
      console.warn('[WS] Max retries reached');
      return;
    }
    reconnectAttempt.current += 1;
    reconnectTimer.current = setTimeout(connect, Math.min(4000 * reconnectAttempt.current, 20000));
  };
}, []);

useEffect(() => {
  const initTimer = setTimeout(() => {
    connect();
  }, 500);
    return () => {
      clearTimeout(initTimer);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Status mapping for App.jsx compatibility
  return { priceData, connectionStatus, lastTriggeredAlert };
}
