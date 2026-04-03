import { useState, useEffect, useRef } from 'react';
import './StockRow.css';

/**
 * Format a number as currency (e.g., 148.52)
 */
function formatPrice(value) {
  if (value == null || isNaN(value)) return '—';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format volume with suffixes (K, M, B)
 */
function formatVolume(value) {
  if (value == null || isNaN(value)) return '—';
  const num = Number(value);
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString();
}

export default function StockRow({ ticker, name, stockData, livePrice, onRemove, onRowClick }) {
  const [flashClass, setFlashClass] = useState('');
  const prevPriceRef = useRef(null);

  const currentPrice = livePrice?.price ?? stockData?.price ?? null;
  const change = livePrice?.change ?? stockData?.change ?? null;
  const changePercent = livePrice?.change_percent ?? stockData?.change_percent ?? null;

  const isPositive = change > 0;
  const isNegative = change < 0;

  useEffect(() => {
    if (currentPrice == null || prevPriceRef.current == null) {
      prevPriceRef.current = currentPrice;
      return;
    }

    if (currentPrice !== prevPriceRef.current) {
      const direction = currentPrice > prevPriceRef.current ? 'flash-up' : 'flash-down';
      setFlashClass(direction);
      prevPriceRef.current = currentPrice;

      const timer = setTimeout(() => setFlashClass(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPrice]);

  return (
    <tr className={`stock-row-item ${flashClass}`} onClick={() => onRowClick?.(ticker)}>
      <td className="td-ticker">
        <div className="symbol-cell">
          <span className="symbol-primary">{ticker}</span>
          <span className="symbol-secondary">{name || '—'}</span>
        </div>
      </td>
      <td className="td-name td-desktop">
        <span className="company-name">{name || '—'}</span>
      </td>
      <td className={`td-price text-right ${flashClass}`}>
        <div className="price-wrap">
          <span className="price-main">${formatPrice(currentPrice)}</span>
          {livePrice && <span className="live-pill">LIVE</span>}
        </div>
      </td>
      <td className="text-right">
        <span className={`change-badge ${isPositive ? 'pos' : isNegative ? 'neg' : ''}`}>
          {isPositive ? '↑' : isNegative ? '↓' : ''} {formatPrice(Math.abs(change))}
        </span>
      </td>
      <td className="text-right">
        <span className={`percent-label ${isPositive ? 'pos' : isNegative ? 'neg' : ''}`}>
          {isPositive ? '+' : ''}{changePercent?.toFixed(2)}%
        </span>
      </td>
      <td className="td-desktop text-right text-muted">${formatPrice(livePrice?.high ?? stockData?.high)}</td>
      <td className="td-desktop text-right text-muted">${formatPrice(livePrice?.low ?? stockData?.low)}</td>
      <td className="td-desktop text-right text-muted">{formatVolume(livePrice?.volume ?? stockData?.volume)}</td>
      <td className="td-action">
        <button 
          className="row-delete-btn"
          onClick={(e) => { e.stopPropagation(); onRemove(ticker); }}
          title="Remove from watchlist"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
