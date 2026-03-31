import './EmptyState.css';

export default function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="80" height="80" rx="20" fill="url(#empty-gradient)" fillOpacity="0.1" />
          <path
            d="M20 55L28 40L36 47L48 28L56 38L64 25"
            stroke="url(#empty-line-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="28" cy="40" r="3" fill="#06b6d4" />
          <circle cx="36" cy="47" r="3" fill="#06b6d4" />
          <circle cx="48" cy="28" r="3" fill="#8b5cf6" />
          <circle cx="56" cy="38" r="3" fill="#8b5cf6" />
          <defs>
            <linearGradient id="empty-gradient" x1="0" y1="0" x2="80" y2="80">
              <stop stopColor="#06b6d4" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="empty-line-gradient" x1="20" y1="25" x2="64" y2="55">
              <stop stopColor="#06b6d4" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <h3 className="empty-title">Your watchlist is empty</h3>
      <p className="empty-description">
        Search for stock tickers above to start tracking prices in real time.
      </p>
      <div className="empty-hints">
        <span className="hint-chip">AAPL</span>
        <span className="hint-chip">TSLA</span>
        <span className="hint-chip">MSFT</span>
        <span className="hint-chip">GOOGL</span>
        <span className="hint-chip">AMZN</span>
      </div>
    </div>
  );
}
