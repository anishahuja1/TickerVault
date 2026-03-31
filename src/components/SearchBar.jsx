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
    <div className="search-container">
      <div className="search-input-wrapper">
        <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clipRule="evenodd"
          />
        </svg>
        <input
          ref={inputRef}
          id="ticker-search"
          type="text"
          className="search-input"
          placeholder="Search tickers... (e.g., AAPL, TSLA, MSFT)"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {isLoading && <div className="search-spinner"></div>}
        {query && !isLoading && (
          <button
            className="search-clear"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="search-dropdown" ref={dropdownRef} role="listbox">
          {results.map((ticker, index) => {
            const isWatched = watchedTickers.has(ticker.ticker);
            return (
              <li
                key={ticker.ticker}
                className={`search-result ${index === activeIndex ? 'active' : ''} ${isWatched ? 'watched' : ''}`}
                onClick={() => !isWatched && handleSelect(ticker)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                aria-selected={index === activeIndex}
              >
                <div className="result-info">
                  <span className="result-ticker">{ticker.ticker}</span>
                  <span className="result-name">{ticker.name}</span>
                </div>
                <div className="result-meta">
                  {ticker.primary_exchange && (
                    <span className="result-exchange">{ticker.primary_exchange}</span>
                  )}
                  {isWatched ? (
                    <span className="result-badge watched-badge">Watching</span>
                  ) : (
                    <span className="result-badge add-badge">+ Add</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isOpen && results.length === 0 && !isLoading && query.length > 0 && (
        <div className="search-dropdown" ref={dropdownRef}>
          <div className="search-no-results">
            <span>No tickers found for "{query}"</span>
          </div>
        </div>
      )}
    </div>
  );
}
