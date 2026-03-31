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
      <div className="portfolio-loading">
        <div className="p-spinner"></div>
        <span>Loading portfolio...</span>
      </div>
    );
  }

  const isEmpty = !portfolio || portfolio.holdings_count === 0;

  return (
    <div className="portfolio-panel">
      {/* Summary Card */}
      {!isEmpty && (
        <div className="portfolio-summary">
          <div className="ps-row">
            <div className="ps-metric">
              <span className="ps-label">Total Invested</span>
              <span className="ps-value">${portfolio.total_invested.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="ps-metric">
              <span className="ps-label">Current Value</span>
              <span className="ps-value">${portfolio.current_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="ps-metric">
              <span className="ps-label">Total P&L</span>
              <span className={`ps-value ${portfolio.total_pnl >= 0 ? 'positive' : 'negative'}`}>
                {portfolio.total_pnl >= 0 ? '+' : ''}${portfolio.total_pnl.toFixed(2)}
                <small> ({portfolio.total_pnl_percent >= 0 ? '+' : ''}{portfolio.total_pnl_percent.toFixed(2)}%)</small>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="portfolio-actions">
        <button className="pa-btn primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : '+ Add Transaction'}
        </button>
        {!isEmpty && (
          <button className="pa-btn secondary" onClick={loadHistory}>
            📜 History ({portfolio.transactions_count})
          </button>
        )}
      </div>

      {/* Add Transaction Form */}
      {showAddForm && (
        <form className="portfolio-form" onSubmit={handleAddTransaction}>
          <div className="pf-row">
            <div className="pf-field">
              <label>Ticker</label>
              <input type="text" value={formTicker} onChange={(e) => setFormTicker(e.target.value.toUpperCase())} placeholder="AAPL" required />
            </div>
            <div className="pf-field">
              <label>Type</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
          </div>
          <div className="pf-row">
            <div className="pf-field">
              <label>Quantity</label>
              <input type="number" step="any" min="0" value={formQty} onChange={(e) => setFormQty(e.target.value)} placeholder="10" required />
            </div>
            <div className="pf-field">
              <label>Price per Share ($)</label>
              <input type="number" step="any" min="0" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="150.00" required />
            </div>
          </div>
          <div className="pf-field">
            <label>Notes (optional)</label>
            <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Earnings play..." />
          </div>
          <button type="submit" className="pf-submit" disabled={formSubmitting}>
            {formSubmitting ? 'Adding...' : `Record ${formType === 'buy' ? 'Buy' : 'Sell'}`}
          </button>
        </form>
      )}

      {error && <p className="portfolio-error">{error}</p>}

      {/* Holdings Table */}
      {isEmpty ? (
        <div className="portfolio-empty">
          <p className="pe-icon">📊</p>
          <p className="pe-title">No Holdings Yet</p>
          <p className="pe-text">Add your first transaction to start tracking your portfolio.</p>
        </div>
      ) : (
        <div className="portfolio-holdings">
          <table className="ph-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Shares</th>
                <th>Avg Cost</th>
                <th>Price</th>
                <th>Value</th>
                <th>P&L</th>
                <th>Alloc</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.map((h) => (
                <tr key={h.ticker}>
                  <td>
                    <span className="ph-ticker">{h.ticker}</span>
                    <span className="ph-name">{h.company_name}</span>
                  </td>
                  <td>{h.total_shares.toFixed(h.total_shares % 1 !== 0 ? 4 : 0)}</td>
                  <td>${h.avg_cost.toFixed(2)}</td>
                  <td>${h.current_price.toFixed(2)}</td>
                  <td>${h.current_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className={h.unrealized_pnl >= 0 ? 'positive' : 'negative'}>
                    {h.unrealized_pnl >= 0 ? '+' : ''}${h.unrealized_pnl.toFixed(2)}
                    <small> ({h.unrealized_pnl_percent >= 0 ? '+' : ''}{h.unrealized_pnl_percent.toFixed(1)}%)</small>
                  </td>
                  <td>
                    <div className="ph-alloc">
                      <div className="ph-alloc-bar" style={{ width: `${h.allocation_percent}%` }}></div>
                      <span>{h.allocation_percent.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transaction History Modal */}
      {showHistory && (
        <div className="portfolio-history-overlay" onClick={() => setShowHistory(false)}>
          <div className="portfolio-history" onClick={(e) => e.stopPropagation()}>
            <div className="ph-hist-header">
              <h3>Transaction History</h3>
              <button onClick={() => setShowHistory(false)}>✕</button>
            </div>
            <div className="ph-hist-list">
              {transactions.map((t) => (
                <div key={t.id} className={`ph-hist-item ${t.transaction_type}`}>
                  <div className="ph-hist-main">
                    <span className={`ph-hist-type ${t.transaction_type}`}>
                      {t.transaction_type.toUpperCase()}
                    </span>
                    <span className="ph-hist-ticker">{t.ticker}</span>
                    <span className="ph-hist-qty">{t.quantity} shares @ ${t.price_per_share.toFixed(2)}</span>
                  </div>
                  <div className="ph-hist-meta">
                    <span className="ph-hist-total">${t.total_amount.toFixed(2)}</span>
                    <span className="ph-hist-date">{new Date(t.transacted_at).toLocaleDateString()}</span>
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
