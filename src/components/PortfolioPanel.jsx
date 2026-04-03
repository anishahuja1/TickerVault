/**
 * TickerVault — Portfolio Panel.
 *
 * Displays portfolio holdings with P&L, allocation, and transaction history.
 */

import { useEffect, useState, useCallback } from 'react';
import { getPortfolio, addTransaction, getTransactions } from '../services/watchlistApi';
import './PortfolioPanel.css';

export default function PortfolioPanel() {
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [formTicker, setFormTicker] = useState('');
  const [formType, setFormType] = useState('buy');
  const [formQty, setFormQty] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadPortfolio = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPortfolio();
      setPortfolio(data);
    } catch (err) {
      setError(err.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadPortfolio(); }, [loadPortfolio]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setError('');

    try {
      await addTransaction(
        formTicker,
        '',
        formType,
        parseFloat(formQty),
        parseFloat(formPrice),
        formNotes || null
      );
      setShowAddForm(false);
      setFormTicker('');
      setFormQty('');
      setFormPrice('');
      setFormNotes('');
      await loadPortfolio();
    } catch (err) {
      setError(err.message);
    }
    setFormSubmitting(false);
  };

  const loadHistory = async () => {
    try {
      const data = await getTransactions();
      setTransactions(data.transactions || []);
      setShowHistory(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="portfolio-loading-container">
        <div className="loading-spinner"></div>
        <span>Syncing your assets...</span>
      </div>
    );
  }

  const isEmpty = !portfolio || portfolio.holdings_count === 0;

  return (
    <div className="portfolio-content-wrap">
      {/* ── Summary Metrics ─────────────────────────────────────────────── */}
      {!isEmpty && (
        <div className="portfolio-stats-grid">
          <div className="stat-card glass">
            <span className="stat-label">Total Invested</span>
            <span className="stat-value">${portfolio.total_invested.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="stat-desc">Cash deployment across all holdings</span>
          </div>
          <div className="stat-card glass">
            <span className="stat-label">Current Value</span>
            <span className="stat-value highlight">${portfolio.current_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="stat-desc">Marked to market live prices</span>
          </div>
          <div className="stat-card glass">
            <span className="stat-label">Total Profit / Loss</span>
            <div className="stat-val-group">
              <span className={`stat-value ${portfolio.total_pnl >= 0 ? 'pos' : 'neg'}`}>
                {portfolio.total_pnl >= 0 ? '+' : ''}${Math.abs(portfolio.total_pnl).toFixed(2)}
              </span>
              <span className={`stat-badge ${portfolio.total_pnl >= 0 ? 'pos' : 'neg'}`}>
                {portfolio.total_pnl >= 0 ? '↑' : '↓'} {Math.abs(portfolio.total_pnl_percent).toFixed(2)}%
              </span>
            </div>
            <span className="stat-desc">Lifetime performance yield</span>
          </div>
        </div>
      )}

      {/* ── Action Bar ─────────────────────────────────────────────────── */}
      <div className="portfolio-action-row">
        <button className="btn-action-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Close Form' : '+ Add Transaction'}
        </button>
        {!isEmpty && (
          <button className="btn-action-secondary" onClick={loadHistory}>
            📜 History ({portfolio.transactions_count})
          </button>
        )}
      </div>

      {/* ── Add Transaction Form ────────────────────────────────────────── */}
      {showAddForm && (
        <div className="portfolio-form-wrap glass">
          <form className="modern-form" onSubmit={handleAddTransaction}>
            <div className="form-grid">
              <div className="form-group">
                <label>Ticker Symbol</label>
                <input type="text" value={formTicker} onChange={(e) => setFormTicker(e.target.value.toUpperCase())} placeholder="Ex: AAPL" required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="buy">BUY</option>
                  <option value="sell">SELL</option>
                </select>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input type="number" step="any" min="0" value={formQty} onChange={(e) => setFormQty(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Execution Price ($)</label>
                <input type="number" step="any" min="0" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} required />
              </div>
            </div>
            <div className="form-group full">
              <label>Notes (Optional)</label>
              <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Investment thesis..." />
            </div>
            <button type="submit" className="btn-form-submit" disabled={formSubmitting}>
              {formSubmitting ? 'Recording...' : `Execute ${formType.toUpperCase()}`}
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="auth-error-card" style={{ marginBottom: '2rem' }}>
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* ── Holdings Data Grid ─────────────────────────────────────────── */}
      {isEmpty ? (
        <div className="empty-portfolio glass">
          <p className="empty-icon">📂</p>
          <h3>Portfolio Empty</h3>
          <p>Record your first trade to activate the automated tracking engine.</p>
        </div>
      ) : (
        <div className="table-responsive glass">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th className="text-right">Shares</th>
                <th className="text-right">Avg Cost</th>
                <th className="text-right">Market Price</th>
                <th className="text-right">Value</th>
                <th className="text-right">Unrealized P&L</th>
                <th className="text-right">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.map((h) => (
                <tr key={h.ticker} className="stock-row-item no-hover">
                  <td>
                    <div className="symbol-cell">
                      <span className="symbol-primary">{h.ticker}</span>
                      <span className="symbol-secondary">{h.company_name}</span>
                    </div>
                  </td>
                  <td className="text-right font-bold">{h.total_shares.toFixed(h.total_shares % 1 !== 0 ? 4 : 0)}</td>
                  <td className="text-right text-muted">${h.avg_cost.toFixed(2)}</td>
                  <td className="text-right font-semibold">${h.current_price.toFixed(2)}</td>
                  <td className="text-right font-bold">${h.current_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="text-right">
                    <div className={`pnl-wrap ${h.unrealized_pnl >= 0 ? 'pos' : 'neg'}`}>
                      <span className="pnl-value">{h.unrealized_pnl >= 0 ? '+' : ''}${Math.abs(h.unrealized_pnl).toFixed(2)}</span>
                      <span className="pnl-percent">({h.unrealized_pnl_percent >= 0 ? '+' : ''}{h.unrealized_pnl_percent.toFixed(1)}%)</span>
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="allocation-pill">
                      <div className="pill-fill" style={{ width: `${h.allocation_percent}%` }}></div>
                      <span className="pill-text">{h.allocation_percent.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Transaction History Overlay ─────────────────────────────────── */}
      {showHistory && (
        <div className="modern-overlay" onClick={() => setShowHistory(false)}>
          <div className="history-modal glass" onClick={(e) => e.stopPropagation()}>
            <header className="history-header">
              <h3>Transaction History</h3>
              <button className="close-btn" onClick={() => setShowHistory(false)}>✕</button>
            </header>
            <div className="history-list">
              {transactions.map((t) => (
                <div key={t.id} className="history-item">
                  <div className="h-left">
                    <span className={`type-tag ${t.transaction_type}`}>{t.transaction_type}</span>
                    <div className="h-info">
                      <p className="h-ticker">{t.ticker}</p>
                      <p className="h-qty">{t.quantity} shares @ ${t.price_per_share.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="h-right">
                    <p className="h-total">${t.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="h-date">{new Date(t.transacted_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
