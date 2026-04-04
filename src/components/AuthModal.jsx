import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

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
        const passwordBytes = new TextEncoder().encode(password);
        if (passwordBytes.length > 72) {
          setError('Password must be 72 characters or fewer.');
          setIsSubmitting(false);
          return;
        }
        await register(username, email, password);
      } else {
        await login(username, password);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Server is starting up, please wait...');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-bg-main relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[400px] z-10 flex flex-col items-center">
        {/* Brand Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20 mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#fff]" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M3 17l6-6 4 4 8-8" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">TickerVault</h1>
          <p className="text-text-secondary text-sm font-medium">Access your high-precision terminal</p>
        </div>

        {/* Card */}
        <div className="w-full bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl p-8 transition-all duration-300">
          {/* Tab Selection */}
          <div className="flex p-1 bg-bg-main/50 rounded-xl mb-8 border border-border-subtle">
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-bg-surface-elevated text-accent shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
              onClick={() => setMode('login')}
            >
              Sign In
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'register' ? 'bg-bg-surface-elevated text-accent shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Username</label>
              <input
                type="text"
                className="w-full h-11 px-4 bg-bg-main/50 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus-ring"
                placeholder="Ex. ticker_king"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  className="w-full h-11 px-4 bg-bg-main/50 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus-ring"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Password</label>
              <input
                type="password"
                className="w-full h-11 px-4 bg-bg-main/50 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus-ring"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-negative/10 border border-negative/20 rounded-xl flex gap-3 items-center">
                <span className="text-negative text-lg">⚠️</span>
                <p className="text-xs font-bold text-negative">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full h-12 bg-accent hover:bg-accent-light text-[#fff] font-bold rounded-xl transition-all shadow-lg shadow-accent/20 flex items-center justify-center disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-[#fff]/20 border-t-[#fff] rounded-full animate-spin" />
              ) : (
                mode === 'login' ? 'Access Dashboard' : 'Create My Account'
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-sm font-medium text-text-muted">
          Design inspired by Modern Terminals
        </p>
      </div>
    </div>
  );
}
