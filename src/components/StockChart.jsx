import { useState, useEffect, useCallback } from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getStockHistory } from "../services/stockApi";

const PERIODS = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
];

// Custom candlestick shape drawn with SVG
const CandleShape = (props) => {
  const { x, y, width, height, open, close, high, low, yAxis } = props;

  if (!yAxis || !yAxis.scale || open == null || close == null) return null;

  const yScale    = yAxis.scale;
  const isGreen   = close >= open;
  const color     = isGreen ? "#00D4AA" : "#FF4757";
  const bodyTop   = yScale(Math.max(open, close));
  const bodyBot   = yScale(Math.min(open, close));
  const bodyH     = Math.max(Math.abs(bodyBot - bodyTop), 1);
  const wickX     = x + width / 2;
  const highY     = yScale(high);
  const lowY      = yScale(low);
  const candleW   = Math.max(width * 0.7, 2);
  const candleX   = x + (width - candleW) / 2;

  return (
    <g>
      {/* Upper wick: top of body → high */}
      <line
        x1={wickX} y1={bodyTop}
        x2={wickX} y2={highY}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Lower wick: bottom of body → low */}
      <line
        x1={wickX} y1={bodyBot}
        x2={wickX} y2={lowY}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Candle body */}
      <rect
        x={candleX}
        y={bodyTop}
        width={candleW}
        height={bodyH}
        fill={isGreen ? color : color}
        stroke={color}
        strokeWidth={0.5}
        opacity={0.9}
        rx={1}
      />
    </g>
  );
};

// Custom tooltip shown on hover
const CandleTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const isGreen = d.close >= d.open;

  return (
    <div style={{
      background: "#1a1d2e",
      border: "1px solid #2a2d3e",
      borderRadius: 8,
      padding: "12px 16px",
      fontSize: 12,
      minWidth: 160,
    }}>
      <p style={{ color: "#9ca3af", marginBottom: 8, fontSize: 11 }}>{label}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
        {[
          { label: "O", value: d.open,  color: "#9ca3af" },
          { label: "H", value: d.high,  color: "#00D4AA" },
          { label: "L", value: d.low,   color: "#FF4757" },
          { label: "C", value: d.close, color: isGreen ? "#00D4AA" : "#FF4757" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ color: "#6b7280" }}>{label}</span>
            <span style={{ color, fontWeight: 600 }}>${Number(value).toFixed(2)}</span>
          </div>
        ))}
      </div>
      {d.volume > 0 && (
        <p style={{ color: "#6b7280", marginTop: 8, fontSize: 11 }}>
          Vol: {Number(d.volume).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default function StockChart({ ticker }) {
  const [period,    setPeriod]    = useState("1mo");
  const [chartData, setChartData] = useState([]);
  const [meta,      setMeta]      = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!ticker) return;
    setIsLoading(true);
    setError(null);
    setChartData([]);
    try {
      const data = await getStockHistory(ticker, period);

      const formatted = data.dates.map((date, i) => ({
        date:   formatLabel(date, period),
        open:   data.opens[i],
        high:   data.highs[i],
        low:    data.lows[i],
        close:  data.closes[i],
        volume: data.volumes?.[i] ?? 0,
        // Recharts Bar needs a single value for its height calculation
        // We pass [low, high] as the bar domain so the bar spans that range
        range:  [data.lows[i], data.highs[i]],
      }));

      setChartData(formatted);
      setMeta({
        change:    data.period_change,
        changePct: data.period_change_pct,
        high:      data.period_high,
        low:       data.period_low,
      });
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load chart");
    } finally {
      setIsLoading(false);
    }
  }, [ticker, period]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatLabel = (iso, period) => {
    const d = new Date(iso);
    if (period === "1d")  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (period === "5d")  return d.toLocaleDateString([], { month: "short", day: "numeric" });
    if (period === "1mo") return d.toLocaleDateString([], { month: "short", day: "numeric" });
    return d.toLocaleDateString([], { month: "short", year: "2-digit" });
  };

  const isPositive = !meta || meta.change >= 0;
  const accentColor = isPositive ? "#00D4AA" : "#FF4757";

  // Tight Y domain for realistic chart — most important for realism
  const prices  = chartData.flatMap(d => [d.high, d.low]).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const pad      = (maxPrice - minPrice) * 0.06 || 1;
  const yDomain  = [
    parseFloat((minPrice - pad).toFixed(2)),
    parseFloat((maxPrice + pad).toFixed(2)),
  ];

  if (!ticker) {
    return (
      <div style={{
        background: "#242736",
        borderRadius: 12,
        height: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#4b5563",
        fontSize: 14,
      }}>
        Click a stock to view its candlestick chart
      </div>
    );
  }

  return (
    <div style={{ background: "#242736", borderRadius: 12, padding: "24px", marginTop: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 600, margin: 0 }}>
            {ticker}
          </h2>
          {meta && (
            <p style={{ color: accentColor, fontSize: 13, marginTop: 4, fontWeight: 500 }}>
              {isPositive ? "▲" : "▼"} ${Math.abs(meta.change).toFixed(2)} (
              {isPositive ? "+" : ""}{meta.changePct.toFixed(2)}%) this period
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
                color:      period === p.value ? "#000"    : "#6b7280",
                transition: "all 0.15s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div style={{
          height: 300,
          background: "#1a1d2e",
          borderRadius: 8,
          animation: "pulse 1.5s infinite",
        }} />
      ) : error ? (
        <div style={{ height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <p style={{ color: "#FF4757", fontSize: 14 }}>{error}</p>
          <button onClick={fetchHistory} style={{
            padding: "8px 20px", borderRadius: 8, border: "1px solid #00D4AA",
            background: "transparent", color: "#00D4AA", cursor: "pointer", fontSize: 13,
          }}>
            Retry
          </button>
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563" }}>
          No data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#4b5563", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: "#4b5563", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `$${Number(v).toFixed(0)}`}
              width={58}
              orientation="right"
            />
            <Tooltip content={<CandleTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar
              dataKey="range"
              shape={<CandleShape />}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.close >= entry.open ? "#00D4AA" : "#FF4757"}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* Footer stats — Period OHLC */}
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
