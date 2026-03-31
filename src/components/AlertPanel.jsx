/**
 * TickerVault — Alert Panel (dropdown from header bell icon).
 */

import { useEffect, useState, useCallback } from 'react';
import { getAlerts, createAlert, deleteAlert } from '../services/watchlistApi';
import './AlertPanel.css';

export default function AlertPanel({ isOpen, onClose }) {
  const [alerts, setAlerts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formTicker, setFormTicker] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCondition, setFormCondition] = useState('above');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadAlerts = useCallback(async () => {
    try {
      const data = await getAlerts();
      setAlerts(data.alerts || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen) loadAlerts();
  }, [isOpen, loadAlerts]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await createAlert(formTicker, parseFloat(formPrice), formCondition);
      setShowForm(false);
      setFormTicker('');
      setFormPrice('');
      await loadAlerts();
    } catch (err) {
      setError(err.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {}
  };

  if (!isOpen) return null;

  const active = alerts.filter((a) => !a.is_triggered);
  const triggered = alerts.filter((a) => a.is_triggered);

  return (
    <div className="alert-panel-overlay" onClick={onClose}>
      <div className="alert-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ap-header">
          <h3>🔔 Price Alerts</h3>
          <button className="ap-close" onClick={onClose}>✕</button>
        </div>

        <div className="ap-actions">
          <button className="ap-add-btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Alert'}
          </button>
        </div>

        {showForm && (
          <form className="ap-form" onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="Ticker (e.g. AAPL)"
              value={formTicker}
              onChange={(e) => setFormTicker(e.target.value.toUpperCase())}
              required
            />
            <select value={formCondition} onChange={(e) => setFormCondition(e.target.value)}>
              <option value="above">Above ↑</option>
              <option value="below">Below ↓</option>
            </select>
            <input
              type="number"
              step="any"
              placeholder="$0.00"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              required
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '...' : 'Set Alert'}
            </button>
          </form>
        )}

        {error && <p className="ap-error">{error}</p>}

        <div className="ap-list">
          {active.length === 0 && triggered.length === 0 ? (
            <p className="ap-empty">No alerts set. Create one to get notified!</p>
          ) : (
            <>
              {active.map((a) => (
                <div key={a.id} className="ap-item">
                  <div className="ap-item-left">
                    <span className="ap-ticker">{a.ticker}</span>
                    <span className={`ap-condition ${a.condition}`}>
                      {a.condition === 'above' ? '↑' : '↓'} ${a.target_price.toFixed(2)}
                    </span>
                  </div>
                  <button className="ap-delete" onClick={() => handleDelete(a.id)}>✕</button>
                </div>
              ))}
              {triggered.length > 0 && (
                <>
                  <h4 className="ap-section-title">Triggered</h4>
                  {triggered.map((a) => (
                    <div key={a.id} className="ap-item triggered">
                      <div className="ap-item-left">
                        <span className="ap-ticker">{a.ticker}</span>
                        <span className="ap-condition triggered">
                          ✓ ${a.target_price.toFixed(2)}
                        </span>
                      </div>
                      <button className="ap-delete" onClick={() => handleDelete(a.id)}>✕</button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
