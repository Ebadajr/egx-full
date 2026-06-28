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
  source: '', sentiment: '', category: '', scope: '',
  ticker: '', from_date: '', to_date: '', search: '',
  egx_official: null, limit: 50,
};

function buildQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.source) p.set('source', f.source);
  if (f.sentiment) p.set('sentiment', f.sentiment);
  if (f.category) p.set('category', f.category);
  if (f.scope) p.set('scope', f.scope);
  if (f.ticker) p.set('ticker', f.ticker);
  if (f.from_date) p.set('from_date', f.from_date);
  if (f.to_date) p.set('to_date', f.to_date);
  if (f.search) p.set('search', f.search);
  if (f.egx_official !== null) p.set('egx_official', f.egx_official ? 'true' : 'false');
  p.set('limit', String(f.limit));
  return p.toString();
}

const SENT_COLOR: Record<string, string> = {
  positive: '#3DB200', negative: '#FF4136', neutral: '#9A9A9A',
};

type Tk = {
  body: string; fg: string; fg2: string; fg3: string;
  card: string; cardBorder: string; accent: string;
  navActiveFg: string; btnBg: string; btnBorder: string;
  searchBg: string; searchBorder: string; rowBg: string;
  divider: string;
};

export default function NewsSection({ TK }: { TK: Tk }) {
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
    } catch { setArticles([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch(`${API}/api/sources`).then(r => r.json()).then(d => setSources(d.sources ?? [])).catch(() => {});
    fetchArticles(DEFAULT_FILTERS);
  }, []);

  useEffect(() => {
    if (!jobId || !polling) return;
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`${API}/status/${jobId}`);
        const d = await res.json();
        setPipelineStatus(`${d.status} — ${d.message ?? ''}`);
        if (d.status === 'done' || d.status === 'error') {
          setPolling(false); setJobId(null);
          if (d.status === 'done') fetchArticles(filters);
        }
      } catch { setPolling(false); }
    }, 2000);
    return () => clearInterval(iv);
  }, [jobId, polling, filters]);

  const runPipeline = async () => {
    setPipelineStatus('Starting pipeline…');
    try {
      const res = await fetch(`${API}/run`, { method: 'POST' });
      const d = await res.json();
      if (d.job_id) { setJobId(d.job_id); setPolling(true); setPipelineStatus('Pipeline running…'); }
      else setPipelineStatus('Failed to start');
    } catch (e) { setPipelineStatus(`Error: ${e}`); }
  };

  const setFilter = (key: keyof Filters, value: string | boolean | null | number) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    fetchArticles(next);
  };

  const inputSty: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: `1px solid ${TK.searchBorder}`,
    borderRadius: 8, fontSize: 13, background: TK.searchBg, color: TK.fg,
    boxSizing: 'border-box', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: TK.fg }}>News</h1>
          <p style={{ margin: '4px 0 0', color: TK.fg3, fontSize: 13 }}>{articles.length} articles</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {pipelineStatus && (
            <span style={{ fontSize: 12, color: TK.fg2, background: TK.btnBg, border: `1px solid ${TK.btnBorder}`, padding: '6px 12px', borderRadius: 8 }}>
              {pipelineStatus}
            </span>
          )}
          <button
            onClick={runPipeline}
            disabled={polling}
            style={{
              background: polling ? TK.btnBg : TK.accent,
              color: polling ? TK.fg2 : TK.navActiveFg,
              border: polling ? `1px solid ${TK.btnBorder}` : 0,
              borderRadius: 10, padding: '9px 18px',
              cursor: polling ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: 13,
              display: 'inline-flex', alignItems: 'center', gap: 7,
            }}
          >
            <i className={`ph ${polling ? 'ph-spinner' : 'ph-play'}`} />
            {polling ? 'Running…' : 'Run Pipeline'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: TK.card, border: `1px solid ${TK.cardBorder}`, borderRadius: 14, padding: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <input type="text" placeholder="Search articles…" value={filters.search}
              onChange={e => setFilter('search', e.target.value)} style={inputSty} />
          </div>
          <select value={filters.source} onChange={e => setFilter('source', e.target.value)} style={inputSty}>
            <option value="">All Sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.sentiment} onChange={e => setFilter('sentiment', e.target.value)} style={inputSty}>
            <option value="">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </select>
          <select value={filters.category} onChange={e => setFilter('category', e.target.value)} style={inputSty}>
            <option value="">All Categories</option>
            <option value="earnings">Earnings</option>
            <option value="dividends">Dividends</option>
            <option value="ipo">IPO</option>
            <option value="macro">Macro</option>
            <option value="corporate">Corporate</option>
            <option value="market">Market</option>
          </select>
          <select value={filters.scope} onChange={e => setFilter('scope', e.target.value)} style={inputSty}>
            <option value="">All Scopes</option>
            <option value="egypt">Egypt</option>
            <option value="global">Global</option>
            <option value="regional">Regional</option>
          </select>
          <input type="text" placeholder="Ticker (e.g. COMI)" value={filters.ticker}
            onChange={e => setFilter('ticker', e.target.value.toUpperCase())} style={inputSty} />
          <input type="date" value={filters.from_date}
            onChange={e => setFilter('from_date', e.target.value)} style={inputSty} />
          <input type="date" value={filters.to_date}
            onChange={e => setFilter('to_date', e.target.value)} style={inputSty} />
          <select value={filters.limit} onChange={e => setFilter('limit', Number(e.target.value))} style={inputSty}>
            <option value={25}>25 articles</option>
            <option value={50}>50 articles</option>
            <option value={100}>100 articles</option>
            <option value={200}>200 articles</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: TK.fg2 }}>
            <input type="checkbox" checked={filters.egx_official === true}
              onChange={e => setFilter('egx_official', e.target.checked ? true : null)} />
            EGX Official only
          </label>
          <button onClick={() => { setFilters(DEFAULT_FILTERS); fetchArticles(DEFAULT_FILTERS); }}
            style={{ fontSize: 12, color: TK.fg3, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Clear filters
          </button>
        </div>
      </div>

      {/* Articles */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: TK.fg3 }}>
          <div style={{ width: 28, height: 28, border: `3px solid ${TK.btnBorder}`, borderTop: `3px solid ${TK.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading…
        </div>
      ) : articles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: TK.fg3, fontSize: 14 }}>
          <i className="ph ph-newspaper" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
          No articles found. Run the pipeline to fetch news.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {articles.map(a => <ArticleCard key={a.id} article={a} TK={TK} />)}
        </div>
      )}
    </div>
  );
}

function ArticleCard({ article: a, TK }: { article: Article; TK: Tk }) {
  const sentiment = a.sentiment?.toLowerCase() ?? 'neutral';
  const sentColor = SENT_COLOR[sentiment] ?? '#9A9A9A';
  const published = a.published_at
    ? new Date(a.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div style={{ background: TK.card, border: `1px solid ${TK.cardBorder}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {a.image_url && (
        <img src={a.image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 11, color: TK.fg3 }}>{a.source}</span>
          {a.egx_official && (
            <span style={{ fontSize: 11, background: 'rgba(255,255,0,0.12)', color: '#FFFF00', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>EGX Official</span>
          )}
          {a.sentiment && (
            <span style={{ fontSize: 11, color: sentColor, border: `1px solid ${sentColor}`, borderRadius: 4, padding: '2px 6px', fontWeight: 600, textTransform: 'capitalize' }}>
              {a.sentiment}
            </span>
          )}
          {a.category && (
            <span style={{ fontSize: 11, background: TK.btnBg, color: TK.fg2, borderRadius: 4, padding: '2px 6px' }}>{a.category}</span>
          )}
        </div>
        <a href={a.url} target="_blank" rel="noopener noreferrer"
          style={{ fontWeight: 600, fontSize: 14, color: TK.fg, textDecoration: 'none', lineHeight: 1.45 }}>
          {a.title}
        </a>
        {a.summary && (
          <p style={{ fontSize: 13, color: TK.fg2, margin: 0, lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {a.summary}
          </p>
        )}
        {a.tickers && a.tickers.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {a.tickers.map(t => (
              <span key={t} style={{ fontSize: 11, background: 'rgba(255,255,0,0.08)', color: '#FFFF00', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>{t}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${TK.cardBorder}` }}>
          <span style={{ fontSize: 11, color: TK.fg3 }}>{published}</span>
          <a href={a.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: TK.accent, textDecoration: 'none', fontWeight: 600 }}>
            Read →
          </a>
        </div>
      </div>
    </div>
  );
}
