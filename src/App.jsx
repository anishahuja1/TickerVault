import { useState, useMemo } from 'react';
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
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const { watchlist, stockData, addTicker, removeTicker, isLoading } = useWatchlist();

  const [activeView, setActiveView] = useState('watchlist'); // 'watchlist' | 'portfolio'
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);

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
    <>
      <Header
        connectionStatus={connectionStatus}
        user={user}
        onLogout={logout}
        onAlertsClick={() => setShowAlerts(true)}
        onExport={exportWatchlistCSV}
      />

      <main className="app-main">
        {/* Market Status */}
        <div className={`market-banner ${marketOpen ? 'market-open' : 'market-closed'}`}>
          <span className="banner-dot"></span>
          <span>
            {marketOpen
              ? 'Market is open — Streaming live data'
              : 'Market is closed — Showing last available data'}
          </span>
        </div>

        {/* View Tabs */}
        <div className="view-tabs">
          <button
            className={`view-tab ${activeView === 'watchlist' ? 'active' : ''}`}
            onClick={() => setActiveView('watchlist')}
          >
            📋 Watchlist
            {watchlist.length > 0 && <span className="tab-badge">{watchlist.length}</span>}
          </button>
          <button
            className={`view-tab ${activeView === 'portfolio' ? 'active' : ''}`}
            onClick={() => setActiveView('portfolio')}
          >
            💰 Portfolio
          </button>
        </div>

        {/* Watchlist View */}
        {activeView === 'watchlist' && (
          <>
            <SearchBar onAddTicker={addTicker} watchlist={watchlist} />

            {isLoading && (
              <div className="app-loading">
                <div className="loading-spinner"></div>
                <span>Loading watchlist data...</span>
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
          </>
        )}

        {/* Portfolio View */}
        {activeView === 'portfolio' && <PortfolioPanel />}
      </main>

      {/* Stock Detail Panel */}
      {selectedTicker && (
        <StockDetail
          ticker={selectedTicker}
          onClose={() => setSelectedTicker(null)}
        />
      )}

      {/* Alerts Panel */}
      <AlertPanel isOpen={showAlerts} onClose={() => setShowAlerts(false)} />

      <footer className="app-footer">
        Powered by <a href="https://finnhub.io" target="_blank" rel="noopener noreferrer">Finnhub</a> &amp; <a href="https://finance.yahoo.com" target="_blank" rel="noopener noreferrer">Yahoo Finance</a> · 
        TickerVault v1.0
      </footer>
    </>
  );
}
