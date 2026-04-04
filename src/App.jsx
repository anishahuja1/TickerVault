import { useState, useMemo, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import WatchlistGrid from './components/WatchlistGrid';
import EmptyState from './components/EmptyState';
import AuthModal from './components/AuthModal';
import StockDetail from './components/StockDetail';
import PortfolioPanel from './components/PortfolioPanel';
import AlertPanel from './components/AlertPanel';
import { useAuth } from './hooks/useAuth';
import { useStockWebSocket } from './hooks/useStockWebSocket';
import { useWatchlist } from './hooks/useWatchlist';
import { exportWatchlistCSV } from './services/watchlistApi';

function isMarketOpen() {
  return true; // Demo purposes
}

export default function App() {
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const { watchlist, stockData, addTicker, removeTicker, isLoading: watchlistLoading } = useWatchlist();
  
  const [activeView, setActiveView] = useState('watchlist');
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!selectedTicker && activeView === 'detail') {
      setActiveView('watchlist');
    }
  }, [selectedTicker, activeView]);

  const tickers = useMemo(() => watchlist.map((w) => w.ticker), [watchlist]);
  const { priceData, connectionStatus } = useStockWebSocket(isAuthenticated ? tickers : []);
  const marketOpen = isMarketOpen();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center gap-6 animate-in fade-in duration-700">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-accent/10 border-t-accent rounded-full animate-spin" />
          <div className="absolute inset-0 bg-accent/20 blur-2xl animate-pulse rounded-full" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.3em]">TickerVault</h3>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] italic">Initializing Secure Terminal</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <AuthModal />;

  const handleTickerSelect = (ticker) => {
    setSelectedTicker(ticker);
    setActiveView('detail');
  };

  return (
    <div className="flex min-h-screen bg-bg-main text-text-primary font-sans selection:bg-accent/30">
      {/* ── Sidebar Navigation ─────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 w-[260px] bg-bg-surface border-r border-border-subtle flex flex-col z-50 transform transition-all duration-500 ease-in-out lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        {/* Brand Container */}
        <div className="h-20 flex items-center px-8 border-b border-border-subtle group">
          <div className="w-8 h-8 bg-gradient-to-br from-accent to-purple-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-accent/20 group-hover:scale-105 transition-transform">
             <svg className="w-5 h-5 text-[#fff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
             </svg>
          </div>
          <span className="text-sm font-black uppercase tracking-[0.3em] overflow-hidden whitespace-nowrap">
            Ticker<span className="text-accent underline decoration-accent/30 underline-offset-4">Vault</span>
          </span>
          <button className="ml-auto lg:hidden text-text-muted hover:text-text-primary" onClick={() => setIsMobileMenuOpen(false)}>✕</button>
        </div>

        {/* Global Navigation */}
        <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
          {[
            { id: 'watchlist', label: 'Monitor', icon: '📊' },
            { id: 'portfolio', label: 'Holdings', icon: '💼' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveView(item.id); setSelectedTicker(null); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all relative group overflow-hidden ${activeView === item.id || (item.id === 'watchlist' && activeView === 'detail') ? 'bg-bg-surface-elevated text-accent border border-border-subtle shadow-md shadow-black/20' : 'text-text-muted hover:text-text-primary hover:bg-bg-surface-elevated/40'}`}
            >
              <span className="text-base group-hover:scale-110 transition-transform">{item.icon}</span>
              {item.label}
              {(activeView === item.id || (item.id === 'watchlist' && activeView === 'detail')) && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-accent rounded-r-full shadow-[0_0_8px_rgba(47,129,247,0.6)]" />}
            </button>
          ))}
          
          <div className="pt-4 pb-2 px-5">
             <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em] opacity-40">Systems</span>
          </div>

          <button
            onClick={() => { setShowAlerts(true); setIsMobileMenuOpen(false); }}
            className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-accent hover:bg-accent/5 transition-all group"
          >
            <span className="text-base group-hover:animate-bounce">🔔</span>
            Price Triggers
          </button>
        </nav>

        {/* Terminal Operator Panel */}
        <div className="p-6 border-t border-border-subtle bg-bg-surface-elevated/30">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-accent text-[#fff] flex items-center justify-center text-xs font-black shadow-lg shadow-accent/20">
                    {user?.username?.[0]?.toUpperCase()}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-bg-surface ${connectionStatus === 'connected' ? 'bg-positive' : 'bg-negative'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-text-primary uppercase tracking-widest truncate">{user?.username}</p>
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter truncate opacity-60">Session active</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full h-10 flex items-center justify-center gap-2 bg-negative/5 hover:bg-negative/10 border border-negative/20 text-negative/70 hover:text-negative rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Terminate Interface
          </button>
        </div>
      </aside>

      {/* ── Main Viewport ────────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-[260px] min-h-screen flex flex-col relative">
        {/* Dashboard Header */}
        <header className="h-20 sticky top-0 bg-bg-main/70 backdrop-blur-3xl border-b border-border-subtle flex items-center justify-between px-8 z-[40]">
          <div className="flex items-center gap-6">
            <button className="lg:hidden p-2 text-2xl" onClick={() => setIsMobileMenuOpen(true)}>☰</button>
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
               <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-1">Terminal</p>
               <h2 className="text-xl font-black tracking-tight text-text-primary uppercase italic">
                {activeView === 'detail' ? `${selectedTicker}` : activeView === 'portfolio' ? 'Asset Ledger' : 'Global Monitor'}
               </h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <SearchBar onAddTicker={addTicker} watchlist={watchlist} />
            <button 
              onClick={exportWatchlistCSV}
              className="h-11 w-11 flex items-center justify-center bg-bg-surface-elevated border border-border-subtle rounded-xl text-lg hover:border-accent/50 hover:text-accent transition-all shadow-lg shadow-black/20"
              title="Export Terminal Flux"
            >
              📥
            </button>
          </div>
        </header>

        {/* Dynamic Viewport Container */}
        <section className="flex-1 p-8 lg:p-12 overflow-x-hidden">
          <div className="max-w-[1400px] mx-auto">
            {/* Context Breadcrumbs / Status */}
            {activeView !== 'detail' && (
              <div className="mb-10 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-700">
                <div className="px-4 py-1.5 bg-bg-surface border border-border-subtle rounded-full flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${marketOpen ? 'bg-positive shadow-[0_0_8px_rgba(63,185,80,0.6)]' : 'bg-negative animate-pulse'}`} />
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">
                        {marketOpen ? 'Market Active' : 'Exchange Closed'}
                    </span>
                    <span className="w-px h-2.5 bg-border-subtle" />
                    <span className="text-[9px] font-bold text-text-muted uppercase opacity-60">Ticker Feed v4.2</span>
                </div>
              </div>
            )}

            {/* View Transitions */}
            <div className="relative">
                {activeView === 'watchlist' ? (
                <WatchlistGrid
                    watchlist={watchlist}
                    stockData={stockData}
                    priceData={priceData}
                    onRemove={removeTicker}
                    onSelect={handleTickerSelect}
                    isLoading={watchlistLoading}
                />
                ) : activeView === 'portfolio' ? (
                <PortfolioPanel />
                ) : (
                <StockDetail
                    ticker={selectedTicker}
                    onClose={() => setSelectedTicker(null)}
                />
                )}
            </div>
          </div>
        </section>

        {/* Interface Footer */}
        <footer className="py-10 px-8 border-t border-border-subtle/30 bg-bg-main">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-[1400px] mx-auto">
             <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em] opacity-40">
                © 2026 TickerVault Engineering · All protocols secured
             </p>
             <div className="flex gap-8 text-[9px] font-black text-text-muted uppercase tracking-widest">
                <span className="hover:text-accent cursor-pointer transition-colors">API Docs</span>
                <span className="hover:text-accent cursor-pointer transition-colors">Infrastructure</span>
                <span className="hover:text-accent cursor-pointer transition-colors">Compliance</span>
             </div>
          </div>
        </footer>
      </main>

      {/* Global Overlays */}
      <AlertPanel isOpen={showAlerts} onClose={() => setShowAlerts(false)} />
    </div>
  );
}
