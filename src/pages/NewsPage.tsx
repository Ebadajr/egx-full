import { useState, useEffect, useCallback } from 'react';

const API = '/api/news';

interface Article {
  id: number;
  title: string;
  url: string;
  source: string;
  published_at: string;
  summary: string | null;
  sentiment: string | null;
  category: string | null;
  scope: string | null;
  tickers: string[] | null;
  image_url: string | null;
  egx_official: boolean;
}

interface Filters {
  source: string;
  sentiment: string;
  category: string;
  scope: string;
  ticker: string;
  from_date: string;
  to_date: string;
  search: string;
  egx_official: boolean | null;
  limit: number;
}

const DEFAULT_FILTERS: Filters = {
  source: '',
  sentiment: '',
  category: '',
  scope: '',
  ticker: '',
  from_date: '',
  to_date: '',
  search: '',
  egx_official: null,
  limit: 50,
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#16a34a',
  negative: '#dc2626',
  neutral: '#6b7280',
};

const SENTIMENT_BG: Record<string, string> = {
  positive: '#dcfce7',
  negative: '#fee2e2',
  neutral: '#f3f4f6',
};

function buildQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.source) params.set('source', filters.source);
  if (filters.sentiment) params.set('sentiment', filters.sentiment);
  if (filters.category) params.set('category', filters.category);
  if (filters.scope) params.set('scope', filters.scope);
  if (filters.ticker) params.set('ticker', filters.ticker);
  if (filters.from_date) params.set('from_date', filters.from_date);
  if (filters.to_date) params.set('to_date', filters.to_date);
  if (filters.search) params.set('search', filters.search);
  if (filters.egx_official !== null) params.set('egx_official', filters.egx_official ? 'true' : 'false');
  params.set('limit', String(filters.limit));
  return params.toString();
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const fetchArticles = useCallback(async (f: Filters) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/articles?${buildQuery(f)}`);
      const data = await res.json();
      setArticles(data.articles ?? []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/sources`);
      const data = await res.json();
      setSources(data.sources ?? []);
    } catch {
      setSources([]);
    }
  }, []);

  useEffect(() => {
    fetchSources();
    fetchArticles(filters);
  }, []);

  useEffect(() => {
    if (!jobId || !polling) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/status/${jobId}`);
        const data = await res.json();
        setPipelineStatus(`${data.status} — ${data.message ?? ''}`);
        if (data.status === 'done' || data.status === 'error') {
          setPolling(false);
          setJobId(null);
          if (data.status === 'done') fetchArticles(filters);
        }
      } catch {
        setPolling(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId, polling, filters]);

  const runPipeline = async () => {
    setPipelineStatus('Starting pipeline…');
    try {
      const res = await fetch(`${API}/run`, { method: 'POST' });
      const data = await res.json();
      if (data.job_id) {
        setJobId(data.job_id);
        setPolling(true);
        setPipelineStatus('Pipeline running…');
      } else {
        setPipelineStatus('Failed to start pipeline');
      }
    } catch (e) {
      setPipelineStatus(`Error: ${e}`);
    }
  };

  const setFilter = (key: keyof Filters, value: string | boolean | null | number) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    fetchArticles(next);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    fetchArticles(DEFAULT_FILTERS);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>EGX News</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            {articles.length} articles
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {pipelineStatus && (
            <span style={{ fontSize: 13, color: '#374151', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8 }}>
              {pipelineStatus}
            </span>
          )}
          <button
            onClick={runPipeline}
            disabled={polling}
            style={{
              background: polling ? '#9ca3af' : '#1d4ed8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              cursor: polling ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {polling ? '⏳ Running…' : '▶ Run Pipeline'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {/* Search */}
          <div style={{ gridColumn: '1 / -1' }}>
            <input
              type="text"
              placeholder="Search articles…"
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Source */}
          <select value={filters.source} onChange={e => setFilter('source', e.target.value)} style={inputStyle}>
            <option value="">All Sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Sentiment */}
          <select value={filters.sentiment} onChange={e => setFilter('sentiment', e.target.value)} style={inputStyle}>
            <option value="">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </select>

          {/* Category */}
          <select value={filters.category} onChange={e => setFilter('category', e.target.value)} style={inputStyle}>
            <option value="">All Categories</option>
            <option value="earnings">Earnings</option>
            <option value="dividends">Dividends</option>
            <option value="ipo">IPO</option>
            <option value="macro">Macro</option>
            <option value="corporate">Corporate</option>
            <option value="market">Market</option>
            <option value="other">Other</option>
          </select>

          {/* Scope */}
          <select value={filters.scope} onChange={e => setFilter('scope', e.target.value)} style={inputStyle}>
            <option value="">All Scopes</option>
            <option value="egypt">Egypt</option>
            <option value="global">Global</option>
            <option value="regional">Regional</option>
          </select>

          {/* Ticker */}
          <input
            type="text"
            placeholder="Ticker (e.g. COMI)"
            value={filters.ticker}
            onChange={e => setFilter('ticker', e.target.value.toUpperCase())}
            style={inputStyle}
          />

          {/* From date */}
          <input
            type="date"
            value={filters.from_date}
            onChange={e => setFilter('from_date', e.target.value)}
            style={inputStyle}
          />

          {/* To date */}
          <input
            type="date"
            value={filters.to_date}
            onChange={e => setFilter('to_date', e.target.value)}
            style={inputStyle}
          />

          {/* Limit */}
          <select value={filters.limit} onChange={e => setFilter('limit', Number(e.target.value))} style={inputStyle}>
            <option value={25}>25 articles</option>
            <option value={50}>50 articles</option>
            <option value={100}>100 articles</option>
            <option value={200}>200 articles</option>
          </select>
        </div>

        {/* EGX Official toggle + clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={filters.egx_official === true}
              onChange={e => setFilter('egx_official', e.target.checked ? true : null)}
            />
            EGX Official only
          </label>
          <button
            onClick={clearFilters}
            style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Articles */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Loading…</div>
      ) : articles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          No articles found. Run the pipeline to fetch news.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {articles.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  const sentiment = article.sentiment?.toLowerCase() ?? 'neutral';
  const color = SENTIMENT_COLORS[sentiment] ?? '#6b7280';
  const bg = SENTIMENT_BG[sentiment] ?? '#f3f4f6';
  const published = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      {article.image_url && (
        <img
          src={article.image_url}
          alt=""
          style={{ width: '100%', height: 180, objectFit: 'cover' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{article.source}</span>
          {article.egx_official && (
            <span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>EGX Official</span>
          )}
          {article.sentiment && (
            <span style={{ fontSize: 11, background: bg, color, borderRadius: 4, padding: '2px 6px', fontWeight: 600, textTransform: 'capitalize' }}>
              {article.sentiment}
            </span>
          )}
          {article.category && (
            <span style={{ fontSize: 11, background: '#f3f4f6', color: '#374151', borderRadius: 4, padding: '2px 6px' }}>{article.category}</span>
          )}
        </div>

        {/* Title */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontWeight: 600, fontSize: 15, color: '#111827', textDecoration: 'none', lineHeight: 1.4 }}
        >
          {article.title}
        </a>

        {/* Summary */}
        {article.summary && (
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {article.summary}
          </p>
        )}

        {/* Tickers */}
        {article.tickers && article.tickers.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {article.tickers.map(t => (
              <span key={t} style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{published}</span>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}
          >
            Read →
          </a>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  background: '#fff',
  boxSizing: 'border-box',
};
