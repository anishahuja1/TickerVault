import { useState } from 'react';

export default function Header({ connectionStatus, user, onLogout, onAlertsClick, onExport }) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const statusMap = {
    connected: { label: 'Active Terminal', className: 'bg-positive/10 text-positive border-positive/20' },
    connecting: { label: 'Establishing...', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' },
    authenticating: { label: 'Authenticating', className: 'bg-accent/10 text-accent border-accent/20 animate-pulse' },
    reconnecting: { label: 'Re-establishing', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    disconnected: { label: 'Terminal Offline', className: 'bg-negative/10 text-negative border-negative/20' },
  };

  const status = statusMap[connectionStatus] || statusMap.disconnected;

  return (
    <header className="h-16 border-b border-border-subtle bg-bg-main/80 backdrop-blur-md sticky top-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Brand Section */}
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-lg shadow-accent/20">
            <svg className="w-5 h-5 text-[#fff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-sm font-black uppercase tracking-[0.3em] text-text-primary hidden sm:block">
            Ticker<span className="text-accent">Vault</span>
          </h1>
        </div>

        {/* Action Center */}
        <div className="flex items-center gap-4">
          {/* Connection Status Badge */}
          <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${status.className}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-positive animate-pulse' : 'bg-current'}`} />
            {status.label}
          </div>

          <div className="h-4 w-px bg-border-subtle mx-2 hidden md:block" />

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button 
              onClick={onAlertsClick}
              className="p-2 text-text-muted hover:text-accent transition-all relative group"
              title="Notifications"
            >
              <span className="text-lg group-hover:scale-110 transition-transform block">🔔</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full border-2 border-bg-main" />
            </button>
            <button 
              onClick={onExport}
              className="p-2 text-text-muted hover:text-text-primary transition-all group"
              title="Export Terminal Data"
            >
              <span className="text-lg group-hover:scale-110 transition-transform block">📥</span>
            </button>
          </div>

          <div className="h-4 w-px bg-border-subtle mx-2" />

          {/* User Profile */}
          <div className="relative">
            <button 
              className="flex items-center gap-3 p-1 pl-3 bg-bg-surface-elevated/50 border border-border-subtle rounded-xl hover:border-accent/30 transition-all group"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted group-hover:text-text-primary transition-colors hidden sm:block">
                {user?.username || 'Operator'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-accent text-[#fff] flex items-center justify-center text-[10px] font-black shadow-lg shadow-accent/20">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute top-12 right-0 w-56 bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-border-subtle/50 mb-2">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest truncate">{user?.email || 'authenticated user'}</p>
                    <p className="text-sm font-black text-text-primary mt-1">{user?.username || 'Private Operator'}</p>
                  </div>
                  <button 
                    onClick={() => { onLogout(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-negative hover:bg-negative/5 rounded-xl transition-all"
                  >
                    🚪 Terminate Session
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
