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

export default function StockChart({ ticker, onMetaUpdate }) {
  const [period, setPeriod] = useState("1mo");
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  const sanitizeChartData = useCallback((data) => {
    if (!data || !data.dates || data.dates.length === 0) return [];
    return data.dates.map((date, i) => {
      const time = new Date(date).getTime() / 1000;
      const open = parseFloat(data.opens[i]);
      const high = parseFloat(data.highs[i]);
      const low = parseFloat(data.lows[i]);
      const close = parseFloat(data.closes[i]);
      
      if (isNaN(time) || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
        return null;
      }

      return {
        time,
        open,
        high,
        low,
        close,
      };
    }).filter(p => p !== null).sort((a, b) => a.time - b.time);
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!ticker) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getStockHistory(ticker, period);
      const sanitized = sanitizeChartData(data);
      setChartData(sanitized);
      if (onMetaUpdate) {
        onMetaUpdate({
          change: data.period_change,
          changePct: data.period_change_pct,
          high: data.period_high,
          low: data.period_low,
        });
      }
    } catch (err) {
      setError(err?.message || "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  }, [ticker, period, sanitizeChartData, onMetaUpdate]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ── Chart Lifecycle Management ──────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8b949e",
        fontSize: 11,
        fontFamily: "Inter, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(240, 246, 252, 0.05)" },
        horzLines: { color: "rgba(240, 246, 252, 0.05)" },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: "#2F81F7", labelBackgroundColor: "#2F81F7" },
        horzLine: { color: "#2F81F7", labelBackgroundColor: "#2F81F7" },
      },
      rightPriceScale: {
        borderColor: "rgba(240, 246, 252, 0.1)",
        autoScale: true,
      },
      timeScale: {
        borderColor: "rgba(240, 246, 252, 0.1)",
        timeVisible: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#3FB950",
      downColor: "#F85149",
      borderUpColor: "#3FB950",
      borderDownColor: "#F85149",
      wickUpColor: "#3FB950",
      wickDownColor: "#F85149",
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    // Initial data if ready
    if (chartData.length > 0) {
      candleSeries.setData(chartData);
      chart.timeScale().fitContent();
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []); // Only run on mount

  // ── Data Update Hook ──────────────────────────────────────────
  useEffect(() => {
    if (seriesRef.current && chartRef.current && chartData.length > 0) {
      try {
        seriesRef.current.setData(chartData);
        chartRef.current.timeScale().fitContent();
      } catch (e) {
        console.warn("Chart update suppressed: Instance likely disposed", e);
      }
    }
  }, [chartData]);

  return (
    <div className="flex flex-col gap-6">
      {/* Chart Canvas */}
      <div className="relative w-full h-[450px] bg-bg-surface-elevated/30 rounded-2xl border border-border-subtle overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-main/40 backdrop-blur-sm z-10">
            <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          </div>
        )}
        
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6">
            <p className="text-negative font-bold text-sm tracking-wide">{error}</p>
            <button onClick={fetchHistory} className="px-5 py-2 bg-accent/10 border border-accent/20 text-accent rounded-lg text-xs font-black uppercase hover:bg-accent/20 transition-all">Retry Terminal</button>
          </div>
        ) : (
          <div ref={chartContainerRef} className="w-full h-full" />
        )}
      </div>

      {/* Period Selectors */}
      <div className="flex justify-center">
        <div className="flex bg-bg-surface border border-border-subtle rounded-xl p-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${period === p.value ? 'bg-accent text-[#fff] shadow-lg shadow-accent/20' : 'text-text-muted hover:text-text-secondary'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
