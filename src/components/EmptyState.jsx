export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 bg-bg-surface border border-border-subtle border-dashed rounded-[32px] text-center px-10 animate-in fade-in zoom-in duration-700">
      <div className="w-24 h-24 mb-8 relative">
        <div className="absolute inset-0 bg-accent/10 blur-3xl animate-pulse" />
        <svg className="w-full h-full relative z-10" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="30" stroke="currentColor" strokeWidth="1" strokeDasharray="6 6" className="text-accent/30" />
          <path
            d="M25 45L35 35L45 42L55 28"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent shadow-lg shadow-accent/50"
          />
          <circle cx="55" cy="28" r="4" fill="currentColor" className="text-accent animate-ping duration-1000" />
          <circle cx="55" cy="28" r="4" fill="currentColor" className="text-accent" />
        </svg>
      </div>

      <h3 className="text-xl font-black text-text-primary uppercase tracking-widest mb-4 italic">
        Market Watch Genesis
      </h3>
      
      <p className="max-w-[400px] text-xs font-bold text-text-muted leading-relaxed uppercase tracking-widest mb-10">
        Deployment pending. Search for global assets to activate the automated real-time monitoring engine.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {['NVDA', 'TSLA', 'AAPL', 'BTC', 'ETH'].map((sym) => (
          <span key={sym} className="px-4 py-1.5 bg-bg-surface-elevated border border-border-subtle rounded-lg text-[10px] font-black text-text-muted uppercase tracking-widest hover:border-accent/40 hover:text-accent transition-all cursor-default">
            {sym}
          </span>
        ))}
      </div>
    </div>
  );
}
