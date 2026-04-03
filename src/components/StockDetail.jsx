/**
 * TickerVault — Stock Detail Panel.
 *
 * Slide-out panel with chart, company info, and news for a selected stock.
 */

import { useEffect, useState, useCallback } from 'react';
import StockChart from './StockChart';
import { getCompanyInfo, getNews, getQuote } from '../services/stockApi';
import './StockDetail.css';

export default function StockDetail({ ticker, onClose }) {
  const [quote, setQuote] = useState(null);
  const [company, setCompany] = useState(null);
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chart');

  const load = useCallback(async () => {
    if (!ticker) return;
    setIsLoading(true);

    const [quoteData, companyData, newsData] = await Promise.allSettled([
      getQuote(ticker),
      getCompanyInfo(ticker),
      getNews(ticker),
    ]);

    if (quoteData.status === 'fulfilled') setQuote(quoteData.value);
    if (companyData.status === 'fulfilled') setCompany(companyData.value);
    if (newsData.status === 'fulfilled') setNews(newsData.value?.articles || []);

    setIsLoading(false);
  }, [ticker]);

  useEffect(() => { load(); }, [load]);

  if (!ticker) return null;

  const isPositive = (quote?.change || 0) >= 0;

  return (
    <div className="modern-drawer-overlay" onClick={onClose}>
      <div className="modern-drawer glass" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="drawer-header">
          <div className="header-info">
            <h2 className="drawer-symbol">{ticker}</h2>
            <p className="drawer-company-name">{company?.name || 'Loading data...'}</p>
          </div>
          <div className="header-pricing">
             {quote && (
               <>
                 <span className="drawer-price">${quote.price?.toFixed(2)}</span>
                 <span className={`drawer-change ${isPositive ? 'pos' : 'neg'}`}>
                    {isPositive ? '↑' : '↓'} {Math.abs(quote.change_percent || 0).toFixed(2)}%
                 </span>
               </>
             )}
          </div>
          <button className="drawer-close-btn" onClick={onClose}>✕</button>
        </header>

        {/* Tab Controls */}
        <nav className="drawer-tabs">
          <button 
            className={`drawer-tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
            onClick={() => setActiveTab('chart')}
          >
            Performance
          </button>
          <button 
            className={`drawer-tab-btn ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            Insights
          </button>
          <button 
            className={`drawer-tab-btn ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => setActiveTab('news')}
          >
            Market News
          </button>
        </nav>

        {/* Dynamic Content Area */}
        <div className="drawer-body">
          {activeTab === 'chart' && (
            <div className="chart-view-wrap">
              <StockChart ticker={ticker} />
              
              <div className="snapshot-grid">
                <div className="snapshot-card">
                  <span className="label">Open</span>
                  <span className="value">${quote?.open?.toFixed(2)}</span>
                </div>
                <div className="snapshot-card">
                  <span className="label">Range</span>
                  <span className="value">${quote?.low?.toFixed(2)} - ${quote?.high?.toFixed(2)}</span>
                </div>
                <div className="snapshot-card">
                  <span className="label">Volume</span>
                  <span className="value">{(quote?.volume || 0).toLocaleString()}</span>
                </div>
                <div className="snapshot-card">
                  <span className="label">Mkt Cap</span>
                  <span className="value">{formatMarketCap(quote?.market_cap)}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="about-view">
              <div className="sector-tag-row">
                 {company?.sector && <span className="sector-pill">{company.sector}</span>}
                 {company?.industry && <span className="industry-pill">{company.industry}</span>}
              </div>
              <p className="company-description">{company?.description || 'Corporate profile unavailable for this ticker.'}</p>
              
              <div className="corporate-details">
                {company?.website && (
                  <div className="detail-row">
                    <span className="label">Official Website</span>
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="link">{company.website.replace(/^https?:\/\//, '')}</a>
                  </div>
                )}
                {company?.employees && (
                   <div className="detail-row">
                    <span className="label">Workforce</span>
                    <span className="value">{company.employees.toLocaleString()} Professionals</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="news-feed">
              {news.length === 0 ? (
                <div className="empty-news">No recent coverage for {ticker}.</div>
              ) : (
                news.map((item, idx) => (
                  <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="news-card glass">
                    {item.image && <img src={item.image} alt="" className="news-thumb" />}
                    <div className="news-info">
                      <h4 className="news-title">{item.title}</h4>
                      <div className="news-meta">
                        <span className="source">{item.source}</span>
                        <span className="dot">·</span>
                        <span className="date">{new Date(item.published_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </a>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatMarketCap(val) {
  if (!val) return 'N/A';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toLocaleString()}`;
}
