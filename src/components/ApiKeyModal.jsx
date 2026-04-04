import { useState } from 'react';

const STORAGE_KEY = 'stockpulse_api_key';

export function getApiKey() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {}
  return import.meta.env.VITE_POLYGON_API_KEY || '';
}

export function setApiKey(key) {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {}
}

export function hasApiKey() {
  const key = getApiKey();
  return key && key.length > 5 && key !== 'YOUR_API_KEY_HERE';
}

export default function ApiKeyModal({ onKeySet }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed || trimmed.length < 5) {
      setError('Please enter a valid API key');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const res = await fetch(`https://api.polygon.io/v3/reference/tickers?search=AAPL&limit=1&apiKey=${trimmed}`);
      if (res.status === 401 || res.status === 403) {
        setError('Invalid API key. Please check and try again.');
        setIsValidating(false);
        return;
      }
      if (!res.ok) {
        setError(`API error (${res.status}). Please try again.`);
        setIsValidating(false);
        return;
      }
      setApiKey(trimmed);
      onKeySet(trimmed);
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-bg-main/60 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="w-full max-w-md bg-bg-surface border border-border-subtle rounded-[32px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-2xl shadow-accent/20 mb-8 overflow-hidden relative">
            <div className="absolute inset-0 bg-white/10" />
            <svg className="w-10 h-10 text-[#fff] relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-4-4" />
            </svg>
          </div>

          <h2 className="text-2xl font-black text-text-primary uppercase tracking-widest mb-4">Connect Terminal</h2>
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest leading-relaxed">
            Provision your high-frequency connection via Polygon.io to enable real-time asset monitoring.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <div className="relative group">
              <input
                type="text"
                className={`w-full h-14 pl-5 pr-5 bg-bg-main border rounded-2xl text-sm font-black tracking-widest transition-all focus-ring ${error ? 'border-negative/50 text-negative' : 'border-border-subtle text-text-primary'}`}
                placeholder="PROVISIONING KEY..."
                value={key}
                onChange={(e) => { setKey(e.target.value); setError(''); }}
                autoFocus
                spellCheck={false}
              />
              {isValidating && (
                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {error && <p className="text-[10px] font-black text-negative uppercase tracking-widest ml-2">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full h-14 bg-accent text-[#fff] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-accent-light transition-all shadow-xl shadow-accent/20 disabled:opacity-50"
            disabled={isValidating || !key.trim()}
          >
            {isValidating ? 'Validating Connection...' : 'Initialize Interface'}
          </button>
        </form>

        <div className="pt-6 border-t border-border-subtle/50 text-center">
            <a 
                href="https://polygon.io/dashboard/signup" 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline"
            >
                Acquire API Credentials →
            </a>
            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-4 leading-relaxed px-4">
              Credentials are encrypted locally within the browser terminal and never reach external servers.
            </p>
        </div>
      </div>
    </div>
  );
}

export function ApiKeySettingsButton({ onClick }) {
  return (
    <button 
      className="p-2 text-text-muted hover:text-accent transition-all group"
      onClick={onClick} 
      title="Terminal Configuration"
    >
      <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  );
}
