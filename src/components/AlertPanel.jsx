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
    <div className="modern-dropdown-overlay" onClick={onClose}>
      <div className="modern-dropdown glass" onClick={(e) => e.stopPropagation()}>
        <header className="dropdown-header">
          <div className="header-title">
             <span className="bell-icon">🔔</span>
             <h3>Notifications</h3>
          </div>
          <button className="dropdown-close-btn" onClick={onClose}>✕</button>
        </header>

        <div className="dropdown-actions">
           <button 
             className={`btn-toggle-form ${showForm ? 'active' : ''}`}
             onClick={() => setShowForm(!showForm)}
           >
             {showForm ? 'Close Form' : '+ New Price Alert'}
           </button>
        </div>

        {showForm && (
          <div className="dropdown-form-wrap glass">
            <form className="modern-mini-form" onSubmit={handleCreate}>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Ticker"
                  value={formTicker}
                  onChange={(e) => setFormTicker(e.target.value.toUpperCase())}
                  required
                />
                <select value={formCondition} onChange={(e) => setFormCondition(e.target.value)}>
                  <option value="above">Above ↑</option>
                  <option value="below">Below ↓</option>
                </select>
              </div>
              <div className="form-row">
                <input
                  type="number"
                  step="any"
                  placeholder="Target Price ($)"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  required
                />
                <button type="submit" disabled={isSubmitting} className="btn-submit-alert">
                  {isSubmitting ? '...' : 'Notify Me'}
                </button>
              </div>
            </form>
          </div>
        )}

        {error && <div className="mini-error-box">{error}</div>}

        <div className="dropdown-scroll-list">
          {active.length === 0 && triggered.length === 0 ? (
            <div className="dropdown-empty-state">
               <p>No active price monitors.</p>
               <span>Set targets to receive real-time execution alerts.</span>
            </div>
          ) : (
            <div className="alert-groups">
              {active.map((a) => (
                <div key={a.id} className="alert-item">
                  <div className="alert-info">
                    <span className="alert-ticker">{a.ticker}</span>
                    <span className={`alert-trigger-label ${a.condition}`}>
                      Crossing ${a.target_price.toFixed(2)} {a.condition === 'above' ? '▲' : '▼'}
                    </span>
                  </div>
                  <button className="alert-remove-btn" onClick={() => handleDelete(a.id)}>✕</button>
                </div>
              ))}
              
              {triggered.length > 0 && (
                <div className="triggered-divider">
                  <span>Triggered Recently</span>
                </div>
              )}

              {triggered.map((a) => (
                <div key={a.id} className="alert-item triggered">
                  <div className="alert-info">
                    <span className="alert-ticker">{a.ticker}</span>
                    <span className="alert-trigger-label success">
                      EXECUTED ${a.target_price.toFixed(2)} ✓
                    </span>
                  </div>
                  <button className="alert-remove-btn" onClick={() => handleDelete(a.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
