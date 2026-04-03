import { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import WatchlistTable from './components/WatchlistTable';
import EmptyState from './components/EmptyState';
import AuthModal from './components/AuthModal';
import StockDetail from './components/StockDetail';
import PortfolioPanel from './components/PortfolioPanel';
import AlertPanel from './components/AlertPanel';
import { useAuth } from './hooks/useAuth';
import { useStockWebSocket } from './hooks/useStockWebSocket';
import { useWatchlist } from './hooks/useWatchlist';
import { exportWatchlistCSV } from './services/watchlistApi';
import './App.css';

/**
 * Check if US stock market is currently open.
 * Market hours: Mon-Fri, 9:30 AM - 4:00 PM ET
 */
function isMarketOpen() {
  // Hardcoded to true for demo purposes
  return true;
}

export default function App() {
  console.log("API URL (App):", import.meta.env.VITE_API_URL);

  // Wake up backend on load (Render cold start)
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://tickervault-api.onrender.com';
    fetch(`${apiUrl}/health`, { method: "GET" })
      .catch(() => {}); // silent — just wakes Render from sleep
  }, []);

  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const { watchlist, stockData, addTicker, removeTicker, isLoading } = useWatchlist();

  const [activeView, setActiveView] = useState('watchlist'); // 'watchlist' | 'portfolio'
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile toggle

  // Extract ticker symbols for WebSocket
  const tickers = useMemo(() => watchlist.map((w) => w.ticker), [watchlist]);

  // Connect to backend WebSocket
  const { priceData, connectionStatus } = useStockWebSocket(
    isAuthenticated ? tickers : []
  );

  const marketOpen = isMarketOpen();

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="app-auth-loading">
        <div className="loading-spinner"></div>
        <p>Loading TickerVault...</p>
      </div>
    );
  }

  // Show auth modal if not logged in
  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <div className={`app-canvas ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
      {/* ── Sidebar Navigation ───────────────────────────────────────────── */}
      <aside className={`sidebar glass ${isMobileMenuOpen ? 'visible' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">TV</div>
          <h2 className="brand-name">TickerVault</h2>
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>✕</button>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeView === 'watchlist' ? 'active' : ''}`}
            onClick={() => { setActiveView('watchlist'); setIsMobileMenuOpen(false); }}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">Watchlist</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'portfolio' ? 'active' : ''}`}
            onClick={() => { setActiveView('portfolio'); setIsMobileMenuOpen(false); }}
          >
            <span className="nav-icon">💼</span>
            <span className="nav-label">Portfolio</span>
          </button>
          <button 
            className={`nav-item ${showAlerts ? 'active' : ''}`}
            onClick={() => { setShowAlerts(true); setIsMobileMenuOpen(false); }}
          >
            <span className="nav-icon">🔔</span>
            <span className="nav-label">Alerts</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
            <div className="user-info">
              <p className="user-name">{user?.username || 'User'}</p>
              <p className="user-status">Online</p>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <span>Log Out</span>
            <span className="logout-icon">↵</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ───────────────────────────────────────────── */}
      <main className="app-viewport">
        <header className="viewport-header">
          <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(true)}>
            ☰
          </button>
          <div className="header-left">
            <h1 className="welcome-msg">Good morning, {user?.username || 'Trader'} 👋</h1>
            <div className="status-indicator">
              <span className={`status-dot ${connectionStatus === 'connected' ? 'online' : 'offline'}`}></span>
              <span className="status-text">{connectionStatus === 'connected' ? 'Live Stream' : 'Offline'}</span>
            </div>
          </div>
          
          <div className="header-right">
            <SearchBar onAddTicker={addTicker} watchlist={watchlist} />
            <button className="export-btn-minimal" onClick={exportWatchlistCSV} title="Export CSV">
              📥
            </button>
          </div>
        </header>

        <div className="viewport-content">
          {/* Market Status Banner */}
          <div className={`market-status-pills ${marketOpen ? 'open' : 'closed'}`}>
             <span className="pill-dot"></span>
             {marketOpen ? 'Market Open' : 'Market Closed'}
          </div>

          {/* Dynamic Views */}
          {activeView === 'watchlist' ? (
            <div className="watchlist-view">
              {isLoading && (
                <div className="view-loading">
                  <div className="loading-spinner"></div>
                  <span>Syncing watchlist...</span>
                </div>
              )}

              {watchlist.length > 0 ? (
                <WatchlistTable
                  watchlist={watchlist}
                  stockData={stockData}
                  priceData={priceData}
                  onRemove={removeTicker}
                  onRowClick={setSelectedTicker}
                />
              ) : (
                !isLoading && <EmptyState />
              )}
            </div>
          ) : (
            <PortfolioPanel />
          )}
        </div>

        <footer className="view-footer">
          <p>© 2026 TickerVault · Modern High-Precision Trading Environment</p>
        </footer>
      </main>

      {/* Overlays */}
      {selectedTicker && (
        <StockDetail
          ticker={selectedTicker}
          onClose={() => setSelectedTicker(null)}
        />
      )}
      <AlertPanel isOpen={showAlerts} onClose={() => setShowAlerts(false)} />
    </div>
  );
}
