import './EmptyState.css';

export default function EmptyState() {
  return (
    <div className="modern-empty-state glass">
      <div className="empty-state-icon">
        <svg viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="30" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 4" opacity="0.3" />
          <path
            d="M30 45L38 35L46 40L54 28"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="54" cy="28" r="3" fill="var(--accent)" />
        </svg>
      </div>
      <h3 className="empty-state-title">Market Watch Empty</h3>
      <p className="empty-state-desc">
        Begin your monitoring by searching for tickers. We'll track real-time volatility and execution targets for you.
      </p>
      <div className="empty-state-suggestions">
        <span className="suggestion-pill">NVDA</span>
        <span className="suggestion-pill">TSLA</span>
        <span className="suggestion-pill">AAPL</span>
        <span className="suggestion-pill">BTC</span>
      </div>
    </div>
  );
}
