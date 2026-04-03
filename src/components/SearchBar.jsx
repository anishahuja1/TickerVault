import { useState, useRef, useEffect, useCallback } from 'react';
import { searchTickers } from '../services/stockApi';
import './SearchBar.css';

export default function SearchBar({ onAddTicker, watchlist }) {
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
    const data = await searchTickers(searchQuery);
    setResults(data);
    setIsOpen(data.length > 0);
    setIsLoading(false);
    setActiveIndex(-1);
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      doSearch(value);
    }, 300);
  };

  const handleSelect = (ticker) => {
    onAddTicker({ ticker: ticker.ticker, name: ticker.name });
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
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
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="modern-search-box">
      <div className="search-field-wrap glass">
        <svg className="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="search-input-field"
          placeholder="Search markets..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {isLoading && <div className="spinner-sm"></div>}
        {query && !isLoading && (
          <button className="clear-search-btn" onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}>
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="search-results-popover glass" ref={dropdownRef}>
          {results.length > 0 ? (
            results.map((ticker, index) => {
              const isWatched = watchedTickers.has(ticker.ticker);
              return (
                <div
                  key={ticker.ticker}
                  className={`suggestion-item ${index === activeIndex ? 'active' : ''} ${isWatched ? 'watched' : ''}`}
                  onClick={() => !isWatched && handleSelect(ticker)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="sug-left">
                    <span className="sug-ticker">{ticker.ticker}</span>
                    <span className="sug-name">{ticker.name}</span>
                  </div>
                  <div className="sug-right">
                     {isWatched ? (
                       <span className="sug-badge watched">Watching</span>
                     ) : (
                       <span className="sug-badge add">+ Add</span>
                     )}
                  </div>
                </div>
              );
            })
          ) : (
            !isLoading && query.length > 0 && (
              <div className="search-no-results">
                <span>No tickers found for "{query}"</span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
