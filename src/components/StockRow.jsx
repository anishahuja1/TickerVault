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

  // Determine the display price: live WebSocket price > REST previous close
  const currentPrice = livePrice?.price ?? stockData?.price ?? null;

  // Utilize the pre-calculated change/change_percent from backend if available
  const change = livePrice?.change !== undefined 
    ? livePrice.change 
    : (stockData?.change ?? null);
  
  const changePercent = livePrice?.change_percent !== undefined
    ? livePrice.change_percent
    : (stockData?.change_percent ?? null);

  const isPositive = change > 0;
  const isNegative = change < 0;

  // Flash animation when price changes
  useEffect(() => {
    if (currentPrice == null || prevPriceRef.current == null) {
      prevPriceRef.current = currentPrice;
      return;
    }

    if (currentPrice !== prevPriceRef.current) {
      const direction = currentPrice > prevPriceRef.current ? 'flash-green' : 'flash-red';
      setFlashClass(direction);
      prevPriceRef.current = currentPrice;

      const timer = setTimeout(() => setFlashClass(''), 800);
      return () => clearTimeout(timer);
    }
  }, [currentPrice]);

  return (
    <tr className={`stock-row ${flashClass}`} onClick={() => onRowClick?.(ticker)} style={{ cursor: 'pointer' }}>
      <td className="col-ticker">
        <div className="ticker-cell">
          <span className="ticker-symbol">{ticker}</span>
          <span className="ticker-name">{name || '—'}</span>
        </div>
      </td>
      <td className={`col-price ${flashClass ? 'price-updating' : ''}`}>
        <span className="price-value">
          ${formatPrice(currentPrice)}
        </span>
        {livePrice && (
          <span className="live-indicator" title="Live data">
            <span className="live-dot"></span>
          </span>
        )}
      </td>
      <td className={`col-change ${isPositive ? 'positive' : ''} ${isNegative ? 'negative' : ''}`}>
        {change != null ? (
          <>
            <span className="change-arrow">{isPositive ? '▲' : isNegative ? '▼' : '—'}</span>
            <span>{isPositive ? '+' : ''}{formatPrice(change)}</span>
          </>
        ) : (
          '—'
        )}
      </td>
      <td className={`col-change-pct ${isPositive ? 'positive' : ''} ${isNegative ? 'negative' : ''}`}>
        {changePercent != null ? (
          <span>{isPositive ? '+' : ''}{changePercent.toFixed(2)}%</span>
        ) : (
          '—'
        )}
      </td>
      <td className="col-high px-4 py-3 text-sm text-gray-300">
        {(livePrice?.high ?? stockData?.high) > 0
          ? `$${Number(livePrice?.high ?? stockData?.high).toFixed(2)}`
          : <span className="text-gray-600">—</span>
        }
      </td>
      <td className="col-low px-4 py-3 text-sm text-gray-300">
        {(livePrice?.low ?? stockData?.low) > 0
          ? `$${Number(livePrice?.low ?? stockData?.low).toFixed(2)}`
          : <span className="text-gray-600">—</span>
        }
      </td>
      <td className="col-volume">
        {formatVolume(livePrice?.volume ?? stockData?.volume)}
      </td>
      <td className="col-actions">
        <button
          className="remove-btn"
          onClick={(e) => { e.stopPropagation(); onRemove(ticker); }}
          aria-label={`Remove ${ticker} from watchlist`}
          title="Remove from watchlist"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </td>
    </tr>
  );
}
