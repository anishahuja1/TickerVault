import { useEffect, useState, useCallback } from 'react';
import StockChart from './StockChart';
import { getCompanyInfo, getNews, getQuote } from '../services/stockApi';

export default function StockDetail({ ticker, onClose }) {
  const [quote, setQuote] = useState(null);
  const [company, setCompany] = useState(null);
  const [news, setNews] = useState([]);
  const [chartMeta, setChartMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('performance');

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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-20">
      {/* ── Page Header & Critical Stats ──────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 text-text-muted hover:text-text-primary transition-colors lg:hidden"
            >
              ← Back
            </button>
            <h1 className="text-4xl font-black tracking-tighter text-text-primary px-3 py-1 bg-accent/10 border border-accent/20 rounded-xl leading-none">
              {ticker}
            </h1>
            <div className="flex flex-col">
               <h2 className="text-xl font-bold text-text-primary truncate max-w-[300px]">
                {company?.name || 'Asset Terminal'}
              </h2>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                {company?.exchange || 'NASDAQ'} · {company?.sector || 'Industrial'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-bg-surface-elevated/50 p-4 rounded-2xl border border-border-subtle">
          <div className="text-right">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Live Price</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black tracking-tighter text-text-primary leading-none">
                ${quote?.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`px-2 py-1 rounded-lg text-xs font-black ${isPositive ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                {isPositive ? '+' : ''}{quote?.change_percent?.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ─────────────────────────────────────────── */}
      <div className="border-b border-border-subtle flex gap-8">
        {['performance', 'insights', 'news'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === tab ? 'text-accent' : 'text-text-muted hover:text-text-secondary'}`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent shadow-[0_0_8px_rgba(47,129,247,0.6)]" />}
          </button>
        ))}
      </div>

      {/* ── Dynamic View Content ────────────────────────────────────── */}
      <div className="min-h-[500px]">
        {activeTab === 'performance' && (
          <div className="space-y-10">
            {/* Hero Chart Section */}
            <StockChart ticker={ticker} onMetaUpdate={setChartMeta} />

            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[
                { label: 'Open', value: `$${quote?.open?.toFixed(2)}` },
                { label: 'High', value: `$${quote?.high?.toFixed(2)}`, color: 'text-positive' },
                { label: 'Low', value: `$${quote?.low?.toFixed(2)}`, color: 'text-negative' },
                { label: 'Volume', value: (quote?.volume || 0).toLocaleString() },
                { label: 'Market Cap', value: formatMarketCap(quote?.market_cap) },
                { label: 'P/E Ratio', value: company?.val_pe ? company.val_pe.toFixed(2) : '—' },
                { label: '52W High', value: `$${company?.val_high52?.toFixed(2)}` },
                { label: '52W Low', value: `$${company?.val_low52?.toFixed(2)}` },
                { label: 'Avg Vol', value: formatMarketCap(company?.avg_volume) },
                { label: 'Last Close', value: `$${(quote?.previous_close || quote?.prev_close)?.toFixed(2) || '—'}` },
              ].map((stat, idx) => (
                <div key={idx} className="bg-bg-surface border border-border-subtle p-4 rounded-xl hover:border-accent/30 transition-colors">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className={`text-sm font-bold ${stat.color || 'text-text-primary'}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-bg-surface/50 border border-border-subtle p-8 rounded-2xl">
                <h3 className="text-lg font-bold mb-4">Corporate Strategy</h3>
                <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
                  {company?.description || 'Strategic insights unavailable for this asset.'}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-bg-surface border border-border-subtle p-6 rounded-2xl">
                <h4 className="text-xs font-black text-text-muted uppercase tracking-widest mb-4">Identity</h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-text-muted font-bold uppercase mb-1">Headquarters</p>
                    <p className="text-sm font-bold">{company?.address || 'Silicon Valley, CA'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted font-bold uppercase mb-1">Official Website</p>
                    <a href={company?.website} target="_blank" rel="noreferrer" className="text-sm font-bold text-accent hover:underline truncate block">
                      {company?.website?.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.length > 0 ? news.map((item, idx) => (
              <a 
                key={idx} 
                href={item.url} 
                target="_blank" 
                rel="noreferrer" 
                className="group bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden hover:border-accent/50 transition-all flex flex-col"
              >
                {item.image && (
                  <div className="h-40 w-full overflow-hidden">
                    <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-black text-accent uppercase tracking-widest">{item.source}</span>
                    <span className="text-[10px] text-text-muted">•</span>
                    <span className="text-[10px] text-text-muted font-bold uppercase">{new Date(item.published_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-sm font-bold leading-snug text-text-primary group-hover:text-accent transition-colors">
                    {item.title}
                  </h4>
                </div>
              </a>
            )) : (
              <div className="col-span-full py-20 text-center text-text-muted font-bold uppercase tracking-widest text-sm">
                No recent coverage found in terminal feed
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer Actions ───────────────────────────────────────────── */}
      <div className="pt-10 flex border-t border-border-subtle">
        <button 
          onClick={onClose}
          className="px-6 py-3 bg-bg-surface-elevated hover:bg-negative/10 border border-border-subtle hover:border-negative/30 text-text-muted hover:text-negative rounded-xl text-xs font-black uppercase tracking-widest transition-all"
        >
          Close Terminal View
        </button>
      </div>
    </div>
  );
}

function formatMarketCap(val) {
  if (!val) return '—';
  if (val >= 1e12) return `${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
  return val.toLocaleString();
}
