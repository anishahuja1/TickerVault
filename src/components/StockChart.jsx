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
        background: { type: ColorType.Solid, color: "#1a1d2e" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#2a2d3e" },
        horzLines: { color: "#2a2d3e" },
      },
      crosshair: {
        mode: 0, // CrosshairMode.Normal - classic stock style
      },
      rightPriceScale: {
        borderColor: "#2a2d3e",
        autoScale: true,
      },
      timeScale: {
        borderColor: "#2a2d3e",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add Candlestick Series
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#00D4AA",
      downColor: "#FF4757",
      borderUpColor: "#00D4AA",
      borderDownColor: "#FF4757",
      wickUpColor: "#00D4AA",
      wickDownColor: "#FF4757",
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

  if (!ticker) {
    return (
      <div style={{
        background: "#242736",
        borderRadius: 12,
        height: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#4b5563",
        fontSize: 14,
      }}>
        Click a stock to view its real-time candlestick chart
      </div>
    );
  }

  const isPositive = !meta || meta.change >= 0;
  const accentColor = isPositive ? "#00D4AA" : "#FF4757";

  return (
    <div style={{ background: "#242736", borderRadius: 12, padding: "24px", marginTop: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 600, margin: 0 }}>{ticker}</h2>
          {meta && !isLoading && (
            <p style={{ color: accentColor, fontSize: 13, marginTop: 4, fontWeight: 500 }}>
              {isPositive ? "▲" : "▼"} ${Math.abs(meta.change).toFixed(2)} ({isPositive ? "+" : ""}{meta.changePct.toFixed(2)}%) this period
            </p>
          )}
        </div>

        {/* Period tabs */}
        <div style={{ display: "flex", gap: 4, background: "#1a1d2e", borderRadius: 8, padding: 4 }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                background: period === p.value ? "#00D4AA" : "transparent",
                color: period === p.value ? "#000" : "#6b7280",
                transition: "all 0.15s",
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
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginTop: 20,
          paddingTop: 16,
          borderTop: "1px solid #2a2d3e",
        }}>
          {[
            { label: "Period Open",  value: chartData[0]?.open,                    color: "#9ca3af" },
            { label: "Period Close", value: chartData[chartData.length - 1]?.close, color: accentColor },
            { label: "Period High",  value: meta.high,                              color: "#00D4AA" },
            { label: "Period Low",   value: meta.low,                               color: "#FF4757" },
          ].map(stat => (
            <div key={stat.label}>
              <p style={{ color: "#4b5563", fontSize: 11, marginBottom: 4 }}>{stat.label}</p>
              <p style={{ color: stat.color, fontSize: 14, fontWeight: 600 }}>
                ${Number(stat.value ?? 0).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
