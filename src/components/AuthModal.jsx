/**
 * TickerVault — Auth Modal (Login / Register).
 *
 * Premium glassmorphism modal with tabbed login/register forms.
 */

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import './AuthModal.css';

export default function AuthModal() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        if (!username || !email || !password) {
          setError('All fields are required');
          setIsSubmitting(false);
          return;
        }
        await register(username, email, password);
      } else {
        if (!username || !password) {
          setError('Username and password are required');
          setIsSubmitting(false);
          return;
        }
        await login(username, password);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    }
    setIsSubmitting(false);
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError('');
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="12" fill="url(#tv-grad)" fillOpacity="0.15" />
            <path d="M14 28l6-8 6 4 8-10" stroke="url(#tv-stroke)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="14" cy="28" r="2" fill="#06b6d4" />
            <circle cx="20" cy="20" r="2" fill="#8b5cf6" />
            <circle cx="26" cy="24" r="2" fill="#10b981" />
            <circle cx="34" cy="14" r="2" fill="#f59e0b" />
            <defs>
              <linearGradient id="tv-grad" x1="0" y1="0" x2="48" y2="48">
                <stop stopColor="#06b6d4" /><stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="tv-stroke" x1="14" y1="14" x2="34" y2="28">
                <stop stopColor="#06b6d4" /><stop offset="1" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h2 className="auth-title">TickerVault</h2>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to your stock dashboard'
            : 'Create your free account'}
        </p>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              autoComplete="username"
              autoFocus
            />
          </div>

          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                autoComplete="email"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder={mode === 'register' ? 'Min 8 chars, with a digit' : 'Enter password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <><span className="auth-spinner"></span>Processing...</>
            ) : mode === 'login' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={switchMode} className="auth-switch-btn">
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>

        <div className="auth-footer">
          <p>🔒 Your data is stored securely on the server</p>
        </div>
      </div>
    </div>
  );
}
