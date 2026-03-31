import StockRow from './StockRow';
import './WatchlistTable.css';

export default function WatchlistTable({ watchlist, stockData, priceData, onRemove, onRowClick }) {
  return (
    <div className="watchlist-container">
      <div className="watchlist-header-bar">
        <h2 className="watchlist-title">
          Your Watchlist
          <span className="watchlist-count">{watchlist.length}</span>
        </h2>
      </div>
      <div className="table-wrapper">
        <table className="watchlist-table" id="watchlist-table">
          <thead>
            <tr>
              <th className="th-ticker">Ticker</th>
              <th className="th-price">Price</th>
              <th className="th-change">Change</th>
              <th className="th-change-pct">Change %</th>
              <th className="th-high">High</th>
              <th className="th-low">Low</th>
              <th className="th-volume">Volume</th>
              <th className="th-actions"></th>
            </tr>
          </thead>
          <tbody>
            {watchlist.map((item) => (
              <StockRow
                key={item.ticker}
                ticker={item.ticker}
                name={item.name}
                stockData={stockData[item.ticker]}
                livePrice={priceData[item.ticker]}
                onRemove={onRemove}
                onRowClick={onRowClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
