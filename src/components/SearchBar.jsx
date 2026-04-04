import { useState, useRef, useEffect, useCallback } from 'react';
import { searchTickers } from '../services/stockApi';

export default function SearchBar({ onAddTicker, onRecordTrade, watchlist }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  const watchedTickers = new Set(watchlist.map((w) => w.ticker));

  const doSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await searchTickers(searchQuery);
      setResults(data);
      setIsOpen(data.length > 0);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
      setActiveIndex(-1);
    }
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSelect = (ticker) => {
    onAddTicker({ ticker: ticker.ticker, name: ticker.name });
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) handleSelect(results[activeIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !inputRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-[320px]">
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-text-muted group-focus-within:text-accent transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          className="w-full h-11 pl-12 pr-10 bg-bg-surface border border-border-subtle rounded-xl text-sm font-bold placeholder:text-text-muted focus-ring"
          placeholder="Search global assets..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />

        {isLoading && (
          <div className="absolute inset-y-0 right-4 flex items-center">
            <div className="w-4 h-4 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {query && !isLoading && (
          <button 
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
            className="absolute inset-y-0 right-4 flex items-center text-text-muted hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute top-14 left-0 w-full bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="max-h-[360px] overflow-y-auto">
            {results.map((ticker, index) => {
              const isWatched = watchedTickers.has(ticker.ticker);
              return (
                <div
                  key={ticker.ticker}
                  className={`w-full flex items-center justify-between px-5 py-4 border-b border-border-subtle/50 transition-all text-left ${index === activeIndex ? 'bg-bg-surface-elevated text-accent' : 'hover:bg-bg-surface-elevated/50'}`}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-sm font-black tracking-tight ${index === activeIndex ? 'text-accent' : 'text-text-primary'}`}>
                      {ticker.ticker}
                    </span>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider truncate max-w-[150px]">
                      {ticker.name}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${index === activeIndex ? 'bg-accent text-[#fff] shadow-lg shadow-accent/20' : 'bg-accent/10 text-accent hover:bg-accent hover:text-[#fff]'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRecordTrade(ticker);
                        setQuery('');
                        setResults([]);
                        setIsOpen(false);
                      }}
                    >
                      Trade
                    </button>
                    {isWatched ? (
                      <span className="text-[10px] min-w-[70px] text-center font-black uppercase tracking-widest text-positive/60 flex items-center justify-center">Watched</span>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(ticker);
                        }}
                        className={`text-[9px] min-w-[70px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-border-subtle hover:bg-bg-surface-elevated transition-colors ${index === activeIndex ? 'text-accent border-accent/30' : 'text-text-muted'}`}
                      >
                        + Watch
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
