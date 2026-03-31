import { useEffect, useRef, useState, useCallback } from "react";
import { useWatchlist } from "../context/WatchlistContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace(/^http/, 'ws') + '/api/v1/ws/prices';
const RECONNECT_DELAY = 5000;

export default function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const { updatePrices } = useWatchlist();

  const connect = useCallback(() => {
    const token = localStorage.getItem("tickervault_token");
    if (!token) {
      console.warn("No token found, skipping WebSocket connection");
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const url = `${WS_URL}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      // Clear any pending reconnect
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "price_update" && Array.isArray(msg.data)) {
          // Wrap the array of price objects back into the {TICKER: priceObject} dictionary 
          // that our updatePrices likely expects, or pass it verbatim. 
          // The backend sends msg.data as a list: [{"ticker": "AAPL", "price": 178}, ...]
          // Our context usually expects a dictionary. 
          const dictData = {};
          msg.data.forEach(item => {
            if (item.ticker) dictData[item.ticker] = item;
          });
          updatePrices(dictData);
        }
        // heartbeat: do nothing, connection is alive
      } catch (err) {
        console.error("WebSocket message parse error:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      setIsConnected(false);
      wsRef.current = null;

      // Don't reconnect if closed due to auth failure (1008)
      if (event.code === 1008) {
        console.warn("WebSocket closed due to auth failure — not reconnecting");
        return;
      }

      // Auto-reconnect after delay
      reconnectTimer.current = setTimeout(() => {
        console.log("Attempting WebSocket reconnect...");
        connect();
      }, RECONNECT_DELAY);
    };
  }, [updatePrices]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "User logged out");
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect]);

  return { isConnected, reconnect: connect, disconnect };
}
