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
    <div className="stock-detail-overlay" onClick={onClose}>
      <div className="stock-detail-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sd-header">
          <div className="sd-header-left">
            <h2 className="sd-ticker">{ticker}</h2>
            {company && <span className="sd-name">{company.name}</span>}
          </div>
          {quote && (
            <div className="sd-price-block">
              <span className="sd-price">${quote.price?.toFixed(2)}</span>
              <span className={`sd-change ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? '+' : ''}{quote.change?.toFixed(2)} ({isPositive ? '+' : ''}{quote.change_percent?.toFixed(2)}%)
              </span>
            </div>
          )}
          <button className="sd-close" onClick={onClose} title="Close">✕</button>
        </div>

        {/* Tab Bar */}
        <div className="sd-tabs">
          {['chart', 'about', 'news'].map((tab) => (
            <button
              key={tab}
              className={`sd-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'chart' ? '📊 Chart' : tab === 'about' ? '🏢 About' : '📰 News'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="sd-content">
          {activeTab === 'chart' && (
            <>
              <StockChart ticker={ticker} />
              {quote && (
                <div className="sd-stats-grid">
                  <div className="sd-stat">
                    <span className="sd-stat-label">Open</span>
                    <span className="sd-stat-value">${quote.open?.toFixed(2)}</span>
                  </div>
                  <div className="sd-stat">
                    <span className="sd-stat-label">High</span>
                    <span className="sd-stat-value">${quote.high?.toFixed(2)}</span>
                  </div>
                  <div className="sd-stat">
                    <span className="sd-stat-label">Low</span>
                    <span className="sd-stat-value">${quote.low?.toFixed(2)}</span>
                  </div>
                  <div className="sd-stat">
                    <span className="sd-stat-label">Prev Close</span>
                    <span className="sd-stat-value">${quote.previous_close?.toFixed(2)}</span>
                  </div>
                  <div className="sd-stat">
                    <span className="sd-stat-label">Volume</span>
                    <span className="sd-stat-value">{(quote.volume || 0).toLocaleString()}</span>
                  </div>
                  <div className="sd-stat">
                    <span className="sd-stat-label">Mkt Cap</span>
                    <span className="sd-stat-value">{formatMarketCap(quote.market_cap)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'about' && company && (
            <div className="sd-about">
              <div className="sd-about-tags">
                {company.sector && <span className="sd-tag">{company.sector}</span>}
                {company.industry && <span className="sd-tag">{company.industry}</span>}
                {company.country && <span className="sd-tag">{company.country}</span>}
              </div>
              {company.description && (
                <p className="sd-description">{company.description}</p>
              )}
              <div className="sd-about-details">
                {company.website && (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="sd-website">
                    🔗 {company.website}
                  </a>
                )}
                {company.employees > 0 && (
                  <p className="sd-employees">👥 {company.employees.toLocaleString()} employees</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="sd-news">
              {news.length === 0 ? (
                <p className="sd-empty">No recent news</p>
              ) : (
                news.map((article, i) => (
                  <a
                    key={i}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sd-news-item"
                  >
                    {article.image && (
                      <img src={article.image} alt="" className="sd-news-img" />
                    )}
                    <div className="sd-news-text">
                      <h4>{article.title}</h4>
                      <span className="sd-news-meta">
                        {article.source}
                        {article.published_at && ` · ${new Date(article.published_at).toLocaleDateString()}`}
                      </span>
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
