import { useState, useEffect, useCallback, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";
import { getStockHistory } from "../services/stockApi";

const PERIODS = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
];

/**
 * Professional Stock Chart using Lightweight Charts.
 * Fixes rendering issues by ensuring explicit heights,
 * data sanitization, and robust cleanup.
 */
export default function StockChart({ ticker }) {
  const [period,    setPeriod]    = useState("1mo");
  const [chartData, setChartData] = useState([]);
  const [meta,      setMeta]      = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState(null);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  /**
   * Sanitizer for Lightweight Charts (Fix 3)
   * Ensures data is strictly typed, sorted, and uses correct time format.
   */
  const sanitizeChartData = useCallback((data) => {
    if (!data || !data.dates || data.dates.length === 0) return [];
    
    return data.dates.map((date, i) => {
      const timeVal = new Date(date).getTime() / 1000;
      return {
        time:  timeVal,
        open:  parseFloat(data.opens[i]),
        high:  parseFloat(data.highs[i]),
        low:   parseFloat(data.lows[i]),
        close: parseFloat(data.closes[i]),
      };
    }).sort((a, b) => a.time - b.time);
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!ticker) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getStockHistory(ticker, period);
      const sanitized = sanitizeChartData(data);
      setChartData(sanitized);
      setMeta({
        change:    data.period_change,
        changePct: data.period_change_pct,
        high:      data.period_high,
        low:       data.period_low,
      });
    } catch (err) {
      setError(err?.message || "Failed to load chart");
    } finally {
      setIsLoading(false);
    }
  }, [ticker, period, sanitizeChartData]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /**
   * Chart Effect Management (Fix 2)
   * Handles initialization, data updates, responsiveness, and cleanup.
   */
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Cleanup previous chart instance (Fix 2)
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Initialize Chart (Hardware Accelerated Canvas)
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontSize: 12,
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: "#14b8a6", labelBackgroundColor: "#14b8a6" },
        horzLine: { color: "#14b8a6", labelBackgroundColor: "#14b8a6" },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        autoScale: true,
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
      },
    });

    // Add Candlestick Series
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#14b8a6",
      downColor: "#ef4444",
      borderUpColor: "#14b8a6",
      borderDownColor: "#ef4444",
      wickUpColor: "#14b8a6",
      wickDownColor: "#ef4444",
    });

    if (chartData && chartData.length > 0) {
      candleSeries.setData(chartData);
      chart.timeScale().fitContent();
    }

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    // Responsive handling
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chartData]);

  const isPositive = !meta || meta.change >= 0;
  const accentColor = isPositive ? "#14b8a6" : "#ef4444";

  return (
    <div className="chart-container-modern glass" style={{ padding: "1.5rem", borderRadius: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h3 style={{ color: "var(--text-primary)", fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Market Trend</h3>
          {meta && !isLoading && (
            <p style={{ color: accentColor, fontSize: "0.85rem", marginTop: "0.25rem", fontWeight: 600 }}>
              {isPositive ? "▲" : "▼"} ${Math.abs(meta.change).toFixed(2)} ({isPositive ? "+" : ""}{meta.changePct.toFixed(2)}%)
            </p>
          )}
        </div>

        {/* Period tabs */}
        <div className="period-pill-group" style={{ display: "flex", gap: "4px", background: "rgba(0,0,0,0.2)", borderRadius: "999px", padding: "4px" }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 700,
                background: period === p.value ? "var(--accent)" : "transparent",
                color: period === p.value ? "#000" : "var(--text-muted)",
                transition: "all 0.2s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart States (Fix 4) */}
      {isLoading && (
        <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", background: "#1a1d2e", borderRadius: 8 }}>
          <div className="loading-spinner" style={{ width: 24, height: 24 }}></div>
          <span style={{ marginLeft: 12 }}>Loading chart history...</span>
        </div>
      )}

      {error && !isLoading && (
        <div style={{ height: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <p style={{ color: "#FF4757", fontSize: 14 }}>{error}</p>
          <button onClick={fetchHistory} style={{
            padding: "8px 20px", borderRadius: 8, border: "1px solid #00D4AA",
            background: "transparent", color: "#00D4AA", cursor: "pointer", fontSize: 13,
          }}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && chartData.length === 0 && (
        <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", background: "#1a1d2e", borderRadius: 8 }}>
          No chart data available for this symbol
        </div>
      )}

      {/* The Chart Container (Fix 1) */}
      {!isLoading && !error && chartData.length > 0 && (
        <div 
          ref={chartContainerRef} 
          id="tv-candlestick-chart"
          style={{ width: "100%", height: "400px", borderRadius: 8, overflow: "hidden" }} 
        />
      )}

      {/* Footer stats */}
      {!isLoading && !error && meta && chartData.length > 0 && (
        <div className="chart-stats-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginTop: "1.5rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid var(--border-subtle)",
        }}>
          {[
            { label: "Open",   value: chartData[0]?.open,                    color: "var(--text-muted)" },
            { label: "Close",  value: chartData[chartData.length - 1]?.close, color: accentColor },
            { label: "High",   value: meta.high,                              color: "var(--positive)" },
            { label: "Low",    value: meta.low,                               color: "var(--negative)" },
          ].map(stat => (
            <div key={stat.label}>
              <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "0.25rem", fontWeight: 700 }}>{stat.label}</p>
              <p style={{ color: stat.color, fontSize: "0.95rem", fontWeight: 700 }}>
                ${Number(stat.value ?? 0).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
