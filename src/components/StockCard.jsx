import React, { useMemo } from 'react';

export default function StockCard({ ticker, data, price, onRemove, onSelect }) {
  const currentPrice = typeof price === 'object' ? (price?.price || price?.p || 0) : (price || 0);
  const prevClose = data?.previous_close || data?.previousClose || currentPrice;
  const change = currentPrice - prevClose;
  const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
  
  const isPositive = change >= 0;
  
  return (
    <div 
      className="group relative bg-bg-surface border border-border-subtle rounded-2xl p-5 hover:border-accent/40 hover:bg-bg-surface-elevated transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={() => onSelect(ticker)}
    >
      {/* Background Glow */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-[40px] opacity-0 group-hover:opacity-10 transition-opacity ${isPositive ? 'bg-positive' : 'bg-negative'}`} />

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-text-primary">{ticker}</h3>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest truncate max-w-[120px]">
            {data?.name || 'Loading Asset...'}
          </p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(ticker); }}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-text-muted hover:text-negative hover:bg-negative/10 opacity-0 group-hover:opacity-100 transition-all"
        >
          ✕
        </button>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-black tracking-tighter text-text-primary">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${isPositive ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
              {isPositive ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Mini Sparkline Placeholder (or real one if library supports) */}
        <div className="w-16 h-8 flex items-end gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
          {[40, 70, 45, 90, 65].map((h, i) => (
            <div 
              key={i} 
              className={`flex-1 rounded-t-sm ${isPositive ? 'bg-positive' : 'bg-negative'}`} 
              style={{ height: `${h}%` }} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
