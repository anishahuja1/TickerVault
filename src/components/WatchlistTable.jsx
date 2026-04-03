import StockRow from './StockRow';
import './WatchlistTable.css';

export default function WatchlistTable({ watchlist, stockData, priceData, onRemove, onRowClick }) {
  return (
    <div className="table-responsive glass">
      <table className="modern-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Name</th>
            <th className="text-right">Price</th>
            <th className="text-right">Change</th>
            <th className="text-right">Change %</th>
            <th className="th-desktop text-right">High</th>
            <th className="th-desktop text-right">Low</th>
            <th className="th-desktop text-right">Volume</th>
            <th className="th-action"></th>
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
  );
}
