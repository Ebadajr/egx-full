import { useState, useEffect, useCallback, useRef } from 'react';

const BASE = '/api/news';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Article {
  key: string; title: string; link: string; source: string;
  image_url: string; summary: string; title_en: string; title_ar: string;
  summary_ar: string; sentiment: string; tickers: string[];
  published_at: string; added_at: string; category: string;
  scope: string; is_egx_official: boolean; dup_group: string;
}

interface CalDay { date: string; Economic: number; Earnings: number; total: number; [k: string]: number | string; }

type Tk = {
  body: string; fg: string; fg2: string; fg3: string;
  card: string; cardBorder: string; accent: string; navActiveFg: string;
  btnBg: string; btnBorder: string; searchBg: string; searchBorder: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const SENT_COLOR: Record<string, string> = { Positive: '#3DB200', Negative: '#FF4136', Neutral: '#9A9A9A' };
const CAT_COLOR: Record<string, string> = {
  Economic: '#4C9EFF', Earnings: '#F59E0B', 'Board Meeting': '#A78BFA',
  'Cash Dividends': '#3DB200', IPO: '#F97316', 'CBE Decision': '#EC4899',
  'Stock Split': '#06B6D4', Holiday: '#8B5CF6', default: '#9A9A9A',
};
const CAT_SHORT: Record<string, string> = {
  Economic: 'Eco', Earnings: 'Earn', 'Board Meeting': 'BM', 'Cash Dividends': 'Div',
  IPO: 'IPO', 'CBE Decision': 'CBE', 'Stock Split': 'Split', Holiday: 'Hol',
};
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function isoToday() { return new Date().toISOString().slice(0, 10); }
function weekDates(anchor: Date): string[] {
  const d = new Date(anchor);
  d.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const c = new Date(d); c.setDate(d.getDate() + i);
    return c.toISOString().slice(0, 10);
  });
}
function fmtWeekRange(dates: string[]) {
  const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(dates[0])} — ${fmt(dates[6])}`;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function NewsSection({ TK }: { TK: Tk }) {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [scope, setScope] = useState<'all' | 'local' | 'global'>('all');
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [sentFilter, setSentFilter] = useState('');
  const [srcFilter, setSrcFilter] = useState('');
  const [tickerFilter, setTickerFilter] = useState('');

  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [calData, setCalData] = useState<Record<string, CalDay>>({});
  const [loading, setLoading] = useState(false);

  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [running, setRunning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [detailArticle, setDetailArticle] = useState<Article | null>(null);

  const weekDays = weekDates(weekAnchor);
  const today = isoToday();

  const fetchArticles = useCallback(async (overrides: Record<string, string> = {}) => {
    setLoading(true);
    const p = new URLSearchParams({ limit: '300' });
    const s = overrides.scope ?? (scope === 'all' ? '' : scope);
    if (s) p.set('scope', s);
    const cat = overrides.cat ?? catFilter;
    if (cat) p.set('category', cat);
    const sent = overrides.sent ?? sentFilter;
    if (sent) p.set('sentiment', sent);
    const src = overrides.src ?? srcFilter;
    if (src) p.set('source', src);
    const srch = overrides.search ?? search;
    if (srch) p.set('search', srch);
    const ticker = overrides.ticker !== undefined ? overrides.ticker : tickerFilter;
    if (ticker) p.set('ticker', ticker);
    const day = overrides.day !== undefined ? overrides.day : selectedDay;
    if (day) { p.set('from_date', day); p.set('to_date', day); }
    try {
      const res = await fetch(`${BASE}/api/articles?${p}`);
      setArticles(await res.json());
    } catch { setArticles([]); }
    finally { setLoading(false); }
  }, [scope, catFilter, sentFilter, srcFilter, search, tickerFilter, selectedDay]);

  const fetchCalendar = useCallback(async (dates: string[]) => {
    try {
      const res = await fetch(`${BASE}/api/calendar?from_date=${dates[0]}&to_date=${dates[6]}`);
      const arr: CalDay[] = await res.json();
      const map: Record<string, CalDay> = {};
      arr.forEach(d => { map[d.date as string] = d; });
      setCalData(map);
    } catch { setCalData({}); }
  }, []);

  useEffect(() => {
    fetch(`${BASE}/api/sources`).then(r => r.json()).then(setSources).catch(() => {});
    fetchCalendar(weekDays);
    fetchArticles();
  }, []);

  useEffect(() => { fetchCalendar(weekDays); }, [weekAnchor]);

  useEffect(() => {
    if (!jobId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BASE}/status/${jobId}`);
        const d = await res.json();
        setJobStatus(d.message ?? d.status ?? '');
        if (d.status === 'done' || d.status === 'error') {
          clearInterval(pollRef.current!);
          setRunning(false); setJobId(null);
          if (d.status === 'done') { fetchArticles(); fetchCalendar(weekDays); }
        }
      } catch { clearInterval(pollRef.current!); setRunning(false); }
    }, 2000);
    return () => clearInterval(pollRef.current!);
  }, [jobId]);

  const runPipeline = async () => {
    setRunning(true); setJobStatus('Starting…');
    try {
      const res = await fetch(`${BASE}/run`, { method: 'POST' });
      const d = await res.json();
      if (d.job_id) { setJobId(d.job_id); setJobStatus('Processing…'); }
      else { setRunning(false); setJobStatus('Failed to start'); }
    } catch (e) { setRunning(false); setJobStatus(`Error: ${e}`); }
  };

  const stopPipeline = async () => {
    if (!jobId) return;
    await fetch(`${BASE}/stop/${jobId}`, { method: 'POST' });
    clearInterval(pollRef.current!);
    setRunning(false); setJobId(null); setJobStatus('Stopped');
  };

  const ingest = async () => {
    setJobStatus('Ingesting…');
    try {
      await fetch(`${BASE}/api/ingest`, { method: 'POST' });
      setJobStatus('Ingest started');
      setTimeout(() => fetchArticles(), 3000);
    } catch { setJobStatus('Ingest failed'); }
  };

  const exportCsv = () => {
    const p = new URLSearchParams();
    if (srcFilter) p.set('source', srcFilter);
    if (sentFilter) p.set('sentiment', sentFilter);
    if (search) p.set('search', search);
    if (scope !== 'all') p.set('scope', scope);
    if (tickerFilter) p.set('ticker', tickerFilter);
    window.open(`${BASE}/api/export/csv?${p}`, '_blank');
  };

  const handleDayClick = (date: string) => {
    const next = selectedDay === date ? null : date;
    setSelectedDay(next);
    fetchArticles({ day: next ?? '' });
  };

  const handleTickerClick = (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = tickerFilter === ticker ? '' : ticker;
    setTickerFilter(next);
    fetchArticles({ ticker: next });
  };

  const setFilter = (key: 'cat' | 'sent' | 'src' | 'scope' | 'search', val: string) => {
    if (key === 'cat') setCatFilter(val);
    else if (key === 'sent') setSentFilter(val);
    else if (key === 'src') setSrcFilter(val);
    else if (key === 'search') setSearch(val);
    else if (key === 'scope') {
      const sc = val as 'all' | 'local' | 'global';
      setScope(sc);
      fetchArticles({ scope: sc === 'all' ? '' : sc });
      return;
    }
    fetchArticles({ [key]: val });
  };

  let displayArticles = articles;
  if (showDuplicates) displayArticles = articles.filter(a => a.dup_group);

  const isAr = lang === 'ar';

  const pill = (active: boolean, color?: string): React.CSSProperties => ({
    padding: '5px 14px', borderRadius: 20, border: `1px solid ${active ? (color ?? TK.accent) : TK.btnBorder}`,
    background: active ? (color ?? TK.accent) : TK.btnBg,
    color: active ? (color ? '#fff' : TK.navActiveFg) : TK.fg2,
    fontWeight: 600, fontSize: 12, cursor: 'pointer',
  });

  const inp: React.CSSProperties = {
    background: TK.searchBg, border: `1px solid ${TK.searchBorder}`, borderRadius: 8,
    color: TK.fg, fontSize: 13, padding: '7px 12px', outline: 'none',
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: 0, margin: '-32px -32px -40px', position: 'relative' }}>

      {/* ── Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 24px', borderBottom: `1px solid ${TK.cardBorder}`, flexWrap: 'wrap', background: TK.body }}>
        <span style={{ fontWeight: 800, fontSize: 16, color: TK.fg, marginInlineEnd: 8, whiteSpace: 'nowrap' }}>
          <span style={{ color: TK.accent }}>thndr</span> news
        </span>
        <div style={{ position: 'relative', flex: '1 1 160px', maxWidth: 260 }}>
          <i className="ph ph-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: TK.fg3, fontSize: 14 }} />
          <input type="text" placeholder="Search ticker or company…" value={search}
            onChange={e => setFilter('search', e.target.value)}
            style={{ ...inp, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['en', 'ar'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)}
              style={{ ...pill(lang === l, lang === l ? '#3B82F6' : undefined), textTransform: 'uppercase', fontSize: 11 }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {([['all', 'All'], ['local', 'EGX'], ['global', 'Global']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setFilter('scope', v)}
              style={pill(scope === v, scope === v ? '#22C55E' : undefined)}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowDuplicates(p => !p)} style={pill(showDuplicates)}>
          <i className="ph ph-copy" /> Duplicates
        </button>
        <button onClick={exportCsv} style={pill(false)}>
          <i className="ph ph-download-simple" /> CSV
        </button>
        <button onClick={() => setSelectMode(p => !p)} style={pill(selectMode)}>
          <i className="ph ph-check-square" /> Select
        </button>
        <button onClick={ingest} style={{ ...pill(false), background: TK.btnBg, border: `1px solid ${TK.btnBorder}`, color: TK.fg2 }}>
          + Ingest
        </button>
        <button onClick={running ? stopPipeline : runPipeline}
          style={{ ...pill(true, running ? '#EF4444' : '#3B82F6'), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <i className={`ph ${running ? 'ph-stop' : 'ph-play'}`} />
          {running ? 'Stop' : 'Run'}
        </button>
      </div>

      {/* ── Status bar */}
      {(running || jobStatus) && (
        <div style={{ background: running ? 'rgba(59,130,246,0.1)' : TK.btnBg, borderBottom: `1px solid ${TK.cardBorder}`, padding: '8px 24px', fontSize: 12, color: TK.fg2, display: 'flex', alignItems: 'center', gap: 8 }}>
          {running && <div style={{ width: 12, height: 12, border: `2px solid ${TK.btnBorder}`, borderTop: '2px solid #3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
          {jobStatus}
        </div>
      )}

      {/* ── Week calendar */}
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${TK.cardBorder}`, background: TK.body }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={() => setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}
            style={{ ...pill(false), padding: '4px 12px', fontSize: 12 }}>← Prev</button>
          <span style={{ fontWeight: 600, fontSize: 14, color: TK.fg }}>{fmtWeekRange(weekDays)}</span>
          <button onClick={() => setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}
            style={{ ...pill(false), padding: '4px 12px', fontSize: 12 }}>Next →</button>
          <button onClick={() => { setWeekAnchor(new Date()); setSelectedDay(null); fetchArticles({ day: '' }); }}
            style={{ ...pill(false), padding: '4px 12px', fontSize: 12 }}>Today</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {weekDays.map(date => {
            const d = new Date(date + 'T00:00:00');
            const isToday = date === today;
            const isSelected = date === selectedDay;
            const cal = calData[date];
            const topCats = cal
              ? Object.entries(cal).filter(([k, v]) => k !== 'date' && k !== 'total' && typeof v === 'number' && (v as number) > 0)
                  .sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 3)
              : [];
            return (
              <button key={date} onClick={() => handleDayClick(date)}
                style={{ background: isSelected ? 'rgba(59,130,246,0.15)' : TK.card, border: `1px solid ${isSelected ? '#3B82F6' : TK.cardBorder}`, borderRadius: 10, padding: '10px', cursor: 'pointer', textAlign: 'left', minHeight: 80 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: TK.fg3, letterSpacing: '0.08em', marginBottom: 4 }}>{DAY_NAMES[d.getDay()]}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: isToday ? '#3B82F6' : TK.fg, marginBottom: 8 }}>{d.getDate()}</div>
                {cal && cal.total > 0 ? (
                  <>
                    {topCats.map(([cat, cnt]) => (
                      <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: CAT_COLOR[cat] ?? CAT_COLOR.default, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: TK.fg2 }}>{CAT_SHORT[cat] ?? cat}</span>
                        <span style={{ fontSize: 11, color: TK.fg3, marginLeft: 'auto' }}>{cnt as number}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: TK.fg3, marginTop: 4 }}>{cal.total} total</div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: TK.fg3 }}>No news</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderBottom: `1px solid ${TK.cardBorder}`, background: TK.body, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '0 0 180px' }}>
          <i className="ph ph-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: TK.fg3, fontSize: 13 }} />
          <input type="text" placeholder="Search articles…" value={search}
            onChange={e => setFilter('search', e.target.value)}
            style={{ ...inp, paddingLeft: 30, width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '6px 10px 6px 30px' }} />
        </div>
        {[
          { label: 'All Categories', val: catFilter, key: 'cat' as const, opts: ['Economic', 'Earnings', 'Board Meeting', 'Cash Dividends', 'IPO', 'CBE Decision', 'Stock Split', 'Holiday'] },
          { label: 'All Sentiment', val: sentFilter, key: 'sent' as const, opts: ['Positive', 'Negative', 'Neutral'] },
          { label: 'All Sources', val: srcFilter, key: 'src' as const, opts: sources },
        ].map(({ label, val, key, opts }) => (
          <select key={key} value={val} onChange={e => setFilter(key, e.target.value)}
            style={{ ...inp, fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}>
            <option value="">{label}</option>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        {tickerFilter && (
          <button onClick={() => { setTickerFilter(''); fetchArticles({ ticker: '' }); }}
            style={{ ...pill(true, '#FFFF00'), color: '#000', fontSize: 11 }}>
            {tickerFilter} ✕
          </button>
        )}
        {selectedDay && (
          <button onClick={() => { setSelectedDay(null); fetchArticles({ day: '' }); }}
            style={{ ...pill(false), fontSize: 11 }}>
            ✕ {selectedDay}
          </button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: TK.fg3, whiteSpace: 'nowrap' }}>{displayArticles.length} articles</span>
      </div>

      {/* ── Article list */}
      <div style={{ padding: '0 24px 40px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: TK.fg3 }}>
            <div style={{ width: 28, height: 28, border: `3px solid ${TK.btnBorder}`, borderTop: '3px solid #3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Loading…
          </div>
        ) : displayArticles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: TK.fg3 }}>
            <i className="ph ph-newspaper" style={{ fontSize: 36, display: 'block', marginBottom: 12 }} />
            No articles. Run the pipeline to fetch news.
          </div>
        ) : (
          displayArticles.map(a => (
            <ArticleRow key={a.key} article={a} TK={TK} isAr={isAr}
              selectMode={selectMode} selected={selected.has(a.key)}
              tickerFilter={tickerFilter}
              onSelect={k => setSelected(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; })}
              onTickerClick={handleTickerClick}
              onOpen={() => setDetailArticle(a)} />
          ))
        )}
      </div>

      {/* ── Article detail drawer */}
      {detailArticle && (
        <ArticleDrawer article={detailArticle} TK={TK} isAr={isAr}
          onClose={() => setDetailArticle(null)}
          onTickerClick={(t, e) => { handleTickerClick(t, e); setDetailArticle(null); }} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}

// ── Article Row ───────────────────────────────────────────────────────────────
function ArticleRow({ article: a, TK, isAr, selectMode, selected, tickerFilter, onSelect, onTickerClick, onOpen }:
  { article: Article; TK: Tk; isAr: boolean; selectMode: boolean; selected: boolean; tickerFilter: string;
    onSelect: (k: string) => void; onTickerClick: (t: string, e: React.MouseEvent) => void; onOpen: () => void }) {
  const sentColor = SENT_COLOR[a.sentiment] ?? '#9A9A9A';
  const catColor = CAT_COLOR[a.category] ?? CAT_COLOR.default;
  const title = isAr && a.title_ar ? a.title_ar : a.title_en || a.title;
  const summary = isAr && a.summary_ar ? a.summary_ar : a.summary;
  const pub = a.published_at
    ? new Date(a.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div onClick={() => selectMode ? onSelect(a.key) : onOpen()}
      style={{
        display: 'flex', gap: 14, padding: '14px 0',
        borderBottom: `1px solid ${TK.cardBorder}`,
        cursor: 'pointer',
        background: selected ? 'rgba(59,130,246,0.06)' : 'transparent',
      }}>
      {selectMode && (
        <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected ? '#3B82F6' : TK.btnBorder}`, background: selected ? '#3B82F6' : 'transparent', flexShrink: 0, marginTop: 2 }} />
      )}
      {a.image_url && (
        <img src={a.image_url} alt="" style={{ width: 80, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: TK.fg3 }}>{a.source}</span>
          {a.is_egx_official && (
            <span style={{ fontSize: 10, background: 'rgba(255,255,0,0.12)', color: '#FFFF00', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>EGX Official</span>
          )}
          <span style={{ fontSize: 10, color: catColor, border: `1px solid ${catColor}`, borderRadius: 4, padding: '1px 6px' }}>{a.category}</span>
          <span style={{ fontSize: 10, color: sentColor, border: `1px solid ${sentColor}`, borderRadius: 4, padding: '1px 6px' }}>{a.sentiment}</span>
          {a.dup_group && <span style={{ fontSize: 10, color: TK.fg3, borderRadius: 4, padding: '1px 6px', border: `1px solid ${TK.btnBorder}` }}>Dup</span>}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, color: TK.fg, lineHeight: 1.4, marginBottom: 4 }}>
          {title || a.title}
        </div>
        {summary && (
          <p style={{ fontSize: 12, color: TK.fg2, margin: '0 0 6px', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {summary}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {a.tickers.map(t => (
            <span key={t} onClick={e => onTickerClick(t, e)}
              style={{
                fontSize: 10, borderRadius: 4, padding: '1px 6px', fontWeight: 700, cursor: 'pointer',
                background: tickerFilter === t ? '#FFFF00' : 'rgba(255,255,0,0.08)',
                color: tickerFilter === t ? '#000' : '#FFFF00',
                border: tickerFilter === t ? '1px solid #FFFF00' : '1px solid transparent',
              }}>
              {t}
            </span>
          ))}
          <span style={{ fontSize: 11, color: TK.fg3, marginLeft: 'auto' }}>{pub}</span>
        </div>
      </div>
    </div>
  );
}

// ── Article Detail Drawer ────────────────────────────────────────────────────────────
function ArticleDrawer({ article: a, TK, isAr, onClose, onTickerClick }:
  { article: Article; TK: Tk; isAr: boolean; onClose: () => void; onTickerClick: (t: string, e: React.MouseEvent) => void }) {
  const sentColor = SENT_COLOR[a.sentiment] ?? '#9A9A9A';
  const catColor = CAT_COLOR[a.category] ?? CAT_COLOR.default;
  const title = isAr && a.title_ar ? a.title_ar : a.title_en || a.title;
  const summary = isAr && a.summary_ar ? a.summary_ar : a.summary;
  const pub = a.published_at
    ? new Date(a.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', maxWidth: '100vw',
        background: TK.body, borderLeft: `1px solid ${TK.cardBorder}`,
        zIndex: 101, overflowY: 'auto', animation: 'slideIn 0.2s ease',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${TK.cardBorder}`, flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: TK.fg }}>Article Detail</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: TK.fg3, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '20px', flex: 1 }}>
          {a.image_url && (
            <img src={a.image_url} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: TK.fg3 }}>{a.source}</span>
            {a.is_egx_official && (
              <span style={{ fontSize: 11, background: 'rgba(255,255,0,0.12)', color: '#FFFF00', borderRadius: 4, padding: '2px 8px', fontWeight: 700 }}>EGX Official</span>
            )}
            <span style={{ fontSize: 11, color: catColor, border: `1px solid ${catColor}`, borderRadius: 4, padding: '2px 8px' }}>{a.category}</span>
            <span style={{ fontSize: 11, color: sentColor, border: `1px solid ${sentColor}`, borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>{a.sentiment}</span>
            {a.scope && <span style={{ fontSize: 11, color: TK.fg3, border: `1px solid ${TK.btnBorder}`, borderRadius: 4, padding: '2px 8px' }}>{a.scope}</span>}
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: TK.fg, lineHeight: 1.4, margin: '0 0 8px' }}>
            {title || a.title}
          </h2>
          <div style={{ fontSize: 12, color: TK.fg3, marginBottom: 16 }}>{pub}</div>
          {a.tickers.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TK.fg3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tickers</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {a.tickers.map(t => (
                  <span key={t} onClick={e => onTickerClick(t, e)}
                    style={{ fontSize: 13, fontWeight: 700, background: 'rgba(255,255,0,0.12)', color: '#FFFF00', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', border: '1px solid rgba(255,255,0,0.2)' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {summary && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TK.fg3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Summary</div>
              <p style={{ fontSize: 14, color: TK.fg2, lineHeight: 1.7, margin: 0, background: TK.card, borderRadius: 8, padding: '14px 16px', border: `1px solid ${TK.cardBorder}` }}>
                {summary}
              </p>
            </div>
          )}
          {!isAr && a.summary_ar && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TK.fg3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>ملخص</div>
              <p dir="rtl" style={{ fontSize: 14, color: TK.fg2, lineHeight: 1.7, margin: 0, background: TK.card, borderRadius: 8, padding: '14px 16px', border: `1px solid ${TK.cardBorder}` }}>
                {a.summary_ar}
              </p>
            </div>
          )}
          <a href={a.link} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: TK.card, border: `1px solid ${TK.cardBorder}`, borderRadius: 10, textDecoration: 'none', color: TK.fg }}>
            <i className="ph ph-arrow-square-out" style={{ fontSize: 18, color: TK.fg3 }} />
            <span style={{ flex: 1, fontSize: 13, color: TK.fg2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.link}</span>
            <span style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600, whiteSpace: 'nowrap' }}>Open →</span>
          </a>
        </div>
      </div>
    </>
  );
}
