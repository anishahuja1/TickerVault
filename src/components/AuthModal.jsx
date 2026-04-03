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
        
        const passwordBytes = new TextEncoder().encode(password);
        if (passwordBytes.length > 72) {
          setError('Password must be 72 characters or fewer.');
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
      if (err.name === 'AbortError') {
        setError('Server is starting up, please wait 30 seconds and try again.');
      } else if (err.message === 'Failed to fetch') {
        setError('Cannot connect to server. Check your internet connection.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Decorative Orbs handled in index.css body::before/after */}
      
      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l6-6 4 4 8-8" />
              <circle cx="3" cy="17" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="21" cy="9" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h1 className="auth-main-title text-gradient">TickerVault</h1>
          <p className="auth-tagline">Real-time stock tracking, beautifully simple</p>
        </div>

        <div className="auth-card glass">
          {/* Tab Switcher */}
          <div className="auth-mode-pill">
            <button 
              type="button"
              className={mode === 'login' ? 'active' : ''} 
              onClick={() => { setMode('login'); setError(''); }}
            >
              Sign In
            </button>
            <button 
              type="button"
              className={mode === 'register' ? 'active' : ''} 
              onClick={() => { setMode('register'); setError(''); }}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="Ex. ticker_king"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                autoComplete="username"
                required
              />
            </div>

            {mode === 'register' && (
              <div className="auth-input-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  autoComplete="email"
                  required
                />
              </div>
            )}

            <div className="auth-input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="auth-error-card">
                <span className="error-icon">⚠️</span>
                <p>{error}</p>
              </div>
            )}

            <button type="submit" className="auth-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : mode === 'login' ? 'Access Dashboard' : 'Get Started for Free'}
            </button>
          </form>

          <div className="auth-card-footer">
            <p>
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
              <button 
                type="button" 
                className="auth-link-btn" 
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              >
                {mode === 'login' ? 'Create one now' : 'Sign in here'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
