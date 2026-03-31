import { useState } from 'react';
import './Header.css';

export default function Header({ connectionStatus, user, onLogout, onAlertsClick, onExport }) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const statusMap = {
    connected: { label: 'Live', className: 'status-live' },
    connecting: { label: 'Connecting', className: 'status-connecting' },
    authenticating: { label: 'Authenticating', className: 'status-connecting' },
    reconnecting: { label: 'Reconnecting', className: 'status-reconnecting' },
    disconnected: { label: 'Offline', className: 'status-offline' },
  };

  const status = statusMap[connectionStatus] || statusMap.disconnected;

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-brand">
          <div className="logo-icon">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />
              <path
                d="M8 22L12 14L16 18L20 10L24 16"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#06b6d4" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="app-title">
            Ticker<span className="title-accent">Vault</span>
          </h1>
        </div>

        <div className="header-meta">
          <div className={`connection-status ${status.className}`}>
            <span className="status-dot"></span>
            <span className="status-label">{status.label}</span>
          </div>

          {/* Alerts Bell */}
          <button className="header-icon-btn" onClick={onAlertsClick} title="Price Alerts">
            🔔
          </button>

          {/* Export */}
          <button className="header-icon-btn" onClick={() => onExport?.()} title="Export CSV">
            📥
          </button>

          {/* User Menu */}
          <div className="header-user" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="user-avatar">
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <span className="user-name">{user?.username || 'User'}</span>
          </div>

          {showUserMenu && (
            <div className="user-menu-overlay" onClick={() => setShowUserMenu(false)}>
              <div className="user-menu" onClick={(e) => e.stopPropagation()}>
                <div className="um-header">
                  <span className="um-name">{user?.username}</span>
                  <span className="um-email">{user?.email}</span>
                </div>
                <button className="um-item logout" onClick={onLogout}>
                  🚪 Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
