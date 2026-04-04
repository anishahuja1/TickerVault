import { useEffect, useState, useCallback } from 'react';
import { getAlerts, createAlert, deleteAlert } from '../services/watchlistApi';

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
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
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
    <div className="fixed inset-0 z-[200] overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-bg-main/40 backdrop-blur-sm" />
      
      <div 
        className="absolute top-20 right-6 w-full max-w-sm bg-bg-surface border border-border-subtle rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-5 border-b border-border-subtle flex justify-between items-center bg-bg-surface-elevated/50">
          <div className="flex items-center gap-3">
            <span className="text-lg">🔔</span>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-primary">Execution Center</h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">✕</button>
        </header>

        <div className="p-6 border-b border-border-subtle/50">
          <button 
            onClick={() => setShowForm(!showForm)}
            className={`w-full h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showForm ? 'bg-bg-surface-elevated text-text-primary border border-border-subtle' : 'bg-accent text-[#fff] shadow-lg shadow-accent/20 hover:bg-accent-light'}`}
          >
            {showForm ? 'Cancel Alert Configuration' : '+ Configure Price Trigger'}
          </button>
        </div>

        {showForm && (
          <div className="p-6 bg-bg-surface-elevated/30 border-b border-border-subtle/50 animate-in slide-in-from-top-2 duration-200">
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="SYM"
                  className="h-10 px-4 bg-bg-main border border-border-subtle rounded-xl text-[10px] font-black uppercase tracking-widest text-text-primary focus-ring"
                  value={formTicker}
                  onChange={(e) => setFormTicker(e.target.value.toUpperCase())}
                  required
                />
                <select 
                  className="h-10 px-4 bg-bg-main border border-border-subtle rounded-xl text-[10px] font-black uppercase tracking-widest text-text-primary focus-ring"
                  value={formCondition} 
                  onChange={(e) => setFormCondition(e.target.value)}
                >
                  <option value="above">Above ↑</option>
                  <option value="below">Below ↓</option>
                </select>
              </div>
              <div className="flex gap-4">
                <input
                  type="number"
                  step="any"
                  placeholder="Target Price ($)"
                  className="flex-1 h-10 px-4 bg-bg-main border border-border-subtle rounded-xl text-[10px] font-black uppercase tracking-widest text-text-primary focus-ring"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  required
                />
                <button type="submit" disabled={isSubmitting} className="px-6 bg-accent text-[#fff] text-[10px] font-black uppercase rounded-xl hover:bg-accent-light transition-all shadow-lg shadow-accent/15">
                  {isSubmitting ? '...' : 'Deploy'}
                </button>
              </div>
            </form>
          </div>
        )}

        {error && <div className="px-6 py-3 bg-negative/10 border-b border-negative/20 text-negative text-[10px] font-bold text-center uppercase tracking-widest leading-tight">{error}</div>}

        <div className="max-h-[400px] overflow-y-auto">
          {active.length === 0 && triggered.length === 0 ? (
            <div className="px-8 py-16 text-center space-y-3">
               <p className="text-sm font-black text-text-secondary uppercase tracking-widest italic opacity-40">Zero Monitors</p>
               <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest leading-relaxed block">Establish price thresholds to receive high-priority execution alerts.</span>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle/30">
              {active.map((a) => (
                <div key={a.id} className="px-6 py-5 flex items-center justify-between group hover:bg-bg-surface-elevated transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black tracking-tight text-text-primary">{a.ticker}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${a.condition === 'above' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                      ${a.target_price.toFixed(2)} {a.condition === 'above' ? '▲' : '▼'}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(a.id)} className="text-text-muted hover:text-negative transition-colors p-2 text-sm">✕</button>
                </div>
              ))}
              
              {triggered.length > 0 && (
                <div className="px-6 py-3 bg-bg-surface-elevated/50 border-y border-border-subtle/50 text-[9px] font-black uppercase tracking-[0.2em] text-text-muted">
                  Executed Historical Events
                </div>
              )}

              {triggered.map((a) => (
                <div key={a.id} className="px-6 py-5 flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black tracking-tight text-text-secondary">{a.ticker}</span>
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-accent/10 text-accent">
                      Triggered ${a.target_price.toFixed(2)} ✓
                    </span>
                  </div>
                  <button onClick={() => handleDelete(a.id)} className="text-text-muted hover:text-negative transition-colors p-2 text-sm">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
