import { useState, useEffect } from 'react';
import './ApiKeyModal.css';

const STORAGE_KEY = 'stockpulse_api_key';

/**
 * Get the stored API key from localStorage or env.
 */
export function getApiKey() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {}
  // Fallback to env var
  return import.meta.env.VITE_POLYGON_API_KEY || '';
}

/**
 * Save the API key to localStorage.
 */
export function setApiKey(key) {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {}
}

/**
 * Check if a valid API key is configured.
 */
export function hasApiKey() {
  const key = getApiKey();
  return key && key.length > 5 && key !== 'YOUR_API_KEY_HERE';
}

/**
 * Modal prompting the user to enter their Polygon.io API key.
 */
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

    // Validate the key by making a test API call
    setIsValidating(true);
    setError('');

    try {
      const res = await fetch(
        `https://api.polygon.io/v3/reference/tickers?search=AAPL&limit=1&apiKey=${trimmed}`
      );

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

      // Key is valid — save and notify parent
      setApiKey(trimmed);
      onKeySet(trimmed);
    } catch (err) {
      setError('Network error. Please check your connection.');
    }

    setIsValidating(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-icon">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="12" fill="url(#key-gradient)" fillOpacity="0.15" />
            <path
              d="M30 20a6 6 0 11-8.48 5.48L16 31l-2-2v-3h3v-3h3l1.52-1.52A6 6 0 0130 20z"
              stroke="url(#key-stroke-gradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="30" cy="18" r="1.5" fill="#06b6d4" />
            <defs>
              <linearGradient id="key-gradient" x1="0" y1="0" x2="48" y2="48">
                <stop stopColor="#06b6d4" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="key-stroke-gradient" x1="14" y1="16" x2="36" y2="32">
                <stop stopColor="#06b6d4" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h2 className="modal-title">Connect to Polygon.io</h2>
        <p className="modal-description">
          Enter your free Polygon.io API key to start tracking stocks in real time.
          Don't have one?{' '}
          <a href="https://polygon.io/dashboard/signup" target="_blank" rel="noopener noreferrer">
            Sign up free →
          </a>
        </p>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="input-group">
            <input
              type="text"
              className={`modal-input ${error ? 'input-error' : ''}`}
              placeholder="Paste your API key here..."
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setError('');
              }}
              autoFocus
              spellCheck={false}
            />
            {error && <p className="error-text">{error}</p>}
          </div>

          <button
            type="submit"
            className="modal-submit"
            disabled={isValidating || !key.trim()}
          >
            {isValidating ? (
              <>
                <span className="btn-spinner"></span>
                Validating...
              </>
            ) : (
              'Connect & Start'
            )}
          </button>
        </form>

        <div className="modal-footer">
          <p>🔒 Your key is stored locally in your browser only — never sent to any server except Polygon.io.</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Small settings button to change API key later.
 */
export function ApiKeySettingsButton({ onClick }) {
  return (
    <button className="settings-key-btn" onClick={onClick} title="Change API Key">
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
        <path
          fillRule="evenodd"
          d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
