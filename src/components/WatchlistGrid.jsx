import React from 'react';
import StockCard from './StockCard';
import EmptyState from './EmptyState';

export default function WatchlistGrid({ 
  watchlist, 
  stockData, 
  priceData, 
  onRemove, 
  onSelect, 
  isLoading 
}) {
  if (isLoading && watchlist.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[180px] bg-bg-surface border border-border-subtle rounded-2xl" />
        ))}
      </div>
    );
  }

  if (watchlist.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {watchlist.map((item) => (
        <StockCard
          key={item.ticker}
          ticker={item.ticker}
          data={stockData[item.ticker]}
          price={priceData[item.ticker] || stockData[item.ticker]}
          onRemove={onRemove}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
