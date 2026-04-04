import { useEffect, useState, useCallback, useMemo } from 'react';
import { getPortfolio, addTransaction, getTransactions } from '../services/watchlistApi';
import AllocationChart from './AllocationChart';

export default function PortfolioPanel({ priceData }) {
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
      await addTransaction(formTicker, '', formType, parseFloat(formQty), parseFloat(formPrice), formNotes || null);
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

  const isEmpty = !portfolio || portfolio.holdings_count === 0;
  
  // ── Live Calculation Engine ─────────────────────────────────────
  const liveData = useMemo(() => {
    if (!portfolio || !portfolio.holdings) return { holdings: [], totalValue: 0, totalPnl: 0, totalPnlPercent: 0 };
    
    let totalValue = 0;
    const holdings = portfolio.holdings.map(h => {
      const livePrice = priceData[h.ticker]?.price;
      const currentPrice = livePrice !== undefined ? livePrice : (h.current_value / h.total_shares);
      const marketValue = h.total_shares * currentPrice;
      totalValue += marketValue;
      
      const unrealizedPnl = marketValue - h.total_invested;
      const pnlPercent = h.total_invested !== 0 ? (unrealizedPnl / h.total_invested) * 100 : 0;
      
      return {
        ...h,
        current_price: currentPrice,
        market_value: marketValue,
        unrealized_pnl: unrealizedPnl,
        unrealized_pnl_percent: pnlPercent,
        isLive: livePrice !== undefined
      };
    });
    
    const totalPnl = totalValue - portfolio.total_invested;
    const totalPnlPercent = portfolio.total_invested !== 0 ? (totalPnl / portfolio.total_invested) * 100 : 0;
    
    return { holdings, totalValue, totalPnl, totalPnlPercent };
  }, [portfolio, priceData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
        <p className="text-text-muted font-bold text-xs uppercase tracking-widest">Syncing Assets</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* ── Summary Metrics ─────────────────────────────────── */}
      {!isEmpty && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-bg-surface border border-border-subtle p-6 rounded-2xl hover:border-accent/30 transition-all group relative overflow-hidden">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Portfolio Value</p>
            <p className="text-3xl font-black tracking-tighter text-text-primary group-hover:text-accent transition-colors">
              ${liveData.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-2 mt-2">
               <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(47,129,247,0.6)]" />
               <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-60">Live Terminal Sync</p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-accent/5 rounded-full blur-2xl" />
          </div>
          
          <div className="bg-bg-surface border border-border-subtle p-6 rounded-2xl hover:border-accent/30 transition-all group">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Lifetime P&L</p>
            <div className="flex items-end gap-3">
              <p className={`text-3xl font-black tracking-tighter ${liveData.totalPnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                {liveData.totalPnl >= 0 ? '+' : ''}${Math.abs(liveData.totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <span className={`mb-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${liveData.totalPnl >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                {liveData.totalPnl >= 0 ? '↑' : '↓'} {Math.abs(liveData.totalPnlPercent).toFixed(2)}%
              </span>
            </div>
            <p className="text-[10px] font-bold text-text-muted mt-2 uppercase tracking-tighter opacity-60">Invested Principle: ${portfolio.total_invested.toLocaleString()}</p>
          </div>

          <div className="md:col-span-1 bg-bg-surface border border-border-subtle p-6 rounded-2xl hover:border-accent/30 transition-all flex flex-col items-center justify-center">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4">Capital Allocation</p>
            <AllocationChart holdings={liveData.holdings} />
          </div>
        </div>
      )}

      {/* ── Action Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-6">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-text-secondary italic">Terminal Ledger</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showAddForm ? 'bg-bg-surface-elevated text-text-primary' : 'bg-accent text-[#fff] shadow-lg shadow-accent/20 hover:bg-accent-light'}`}
        >
          {showAddForm ? 'Close Form' : '+ Record Trade'}
        </button>
      </div>

      {/* ── Add Transaction Form ───────────────────────────── */}
      {showAddForm && (
        <div className="bg-bg-surface border border-border-subtle p-8 rounded-2xl animate-in slide-in-from-top-4 duration-300">
          <form className="space-y-6" onSubmit={handleAddTransaction}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Ticker</label>
                <input 
                  type="text" 
                  className="w-full h-11 px-4 bg-bg-main border border-border-subtle rounded-xl text-text-primary focus-ring uppercase" 
                  placeholder="AAPL" 
                  value={formTicker} 
                  onChange={(e) => setFormTicker(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Action</label>
                <select 
                  className="w-full h-11 px-4 bg-bg-main border border-border-subtle rounded-xl text-text-primary focus-ring"
                  value={formType} 
                  onChange={(e) => setFormType(e.target.value)}
                >
                  <option value="buy">BUY</option>
                  <option value="sell">SELL</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Quantity</label>
                <input 
                  type="number" step="any"
                  className="w-full h-11 px-4 bg-bg-main border border-border-subtle rounded-xl text-text-primary focus-ring" 
                  value={formQty} 
                  onChange={(e) => setFormQty(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Price ($)</label>
                <input 
                  type="number" step="any"
                  className="w-full h-11 px-4 bg-bg-main border border-border-subtle rounded-xl text-text-primary focus-ring" 
                  value={formPrice} 
                  onChange={(e) => setFormPrice(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="w-full h-12 bg-accent text-[#fff] font-bold rounded-xl hover:bg-accent-light transition-all shadow-lg shadow-accent/20 disabled:opacity-50"
              disabled={formSubmitting}
            >
              {formSubmitting ? 'Syncing with Ledger...' : `Confirm ${formType.toUpperCase()} Execution`}
            </button>
          </form>
        </div>
      )}

      {/* ── Holdings Table ─────────────────────────────────── */}
      {isEmpty ? (
        <div className="py-20 flex flex-col items-center justify-center bg-bg-surface border border-border-subtle border-dashed rounded-3xl">
          <p className="text-4xl mb-4 opacity-40">📂</p>
          <h4 className="text-sm font-black uppercase tracking-widest text-text-secondary">Vault Empty</h4>
          <p className="text-xs text-text-muted mt-2">Record your first execution to populate the engine</p>
        </div>
      ) : (
        <div className="bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-bg-surface-elevated/50 text-left">
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Asset</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right">Shares</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right">Market Value</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right">Unrealized P&L</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right">Allocation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {liveData.holdings.map((h) => (
                <tr key={h.ticker} className="hover:bg-bg-surface-elevated transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black tracking-tight group-hover:text-accent transition-colors">{h.ticker}</span>
                          {h.isLive && <div className="w-1 h-1 rounded-full bg-accent shadow-[0_0_4px_rgba(47,129,247,0.8)]" title="Streaming Live" />}
                        </div>
                        <span className="text-[10px] font-bold text-text-muted uppercase truncate max-w-[150px]">{h.company_name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right font-bold text-sm tracking-tighter">{h.total_shares.toFixed(h.total_shares % 1 === 0 ? 0 : 2)}</td>
                  <td className="px-6 py-5 text-right font-black text-sm text-text-primary tabular-nums">
                    ${h.market_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-black tabular-nums transition-colors ${h.unrealized_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {h.unrealized_pnl >= 0 ? '+' : ''}${Math.abs(h.unrealized_pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest leading-none ${h.unrealized_pnl >= 0 ? 'text-positive/70' : 'text-negative/70'}`}>
                        {h.unrealized_pnl_percent >= 0 ? '+' : ''}{h.unrealized_pnl_percent.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="inline-flex items-center justify-end gap-3 min-w-[120px]">
                        <div className="w-16 h-1 bg-border-subtle/30 rounded-full overflow-hidden">
                           <div className="h-full bg-accent shadow-[0_0_8px_rgba(47,129,247,0.4)]" style={{ width: `${(h.market_value / liveData.totalValue * 100) || 0}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-text-muted min-w-[30px] tabular-nums">{((h.market_value / liveData.totalValue * 100) || 0).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── History Overlay ────────────────────────────────── */}
      {showHistory && (
        <div className="fixed inset-0 bg-bg-main/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowHistory(false)}>
          <div className="bg-bg-surface border border-border-subtle w-full max-w-2xl max-h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <header className="px-8 py-6 border-b border-border-subtle flex justify-between items-center bg-bg-surface-elevated/50">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-text-primary">Immutable Ledger History</h3>
              <button onClick={() => setShowHistory(false)} className="text-text-muted hover:text-text-primary transition-colors text-xl">✕</button>
            </header>
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
              {transactions.length > 0 ? transactions.map((t) => (
                <div key={t.id} className="p-4 bg-bg-surface-elevated rounded-2xl border border-border-subtle flex items-center justify-between group hover:border-accent/30 transition-all">
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.transaction_type === 'buy' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                      {t.transaction_type}
                    </span>
                    <div>
                      <p className="text-sm font-black text-text-primary">{t.ticker}</p>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{t.quantity} shares @ ${t.price_per_share.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-text-primary">${t.total_amount.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">{new Date(t.transacted_at).toLocaleDateString()}</p>
                  </div>
                </div>
              )) : (
                <p className="text-center py-20 text-text-muted text-xs font-bold uppercase italic">Genesis record pending</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
