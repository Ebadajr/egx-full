import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMPANIES, ACTION_TYPES, CorporateActionWithStatus, fmtDate, daysFromToday } from '../data/designData';
import { useSheetActions } from '../data/sheetActionsContext';
import { useWatchlist } from '../lib/watchlistStore';
import { useT } from '../lib/i18n';
import { StatusPill, TypeBadge, TickerTile, actionRenderer, hexToRgba, isSameDay, PdfViewerModal, InfoDot } from '../lib/shared';
import { usePdfs } from '../lib/pdfStore';
/* ─── Language toggle ────────────────────────────────────────── */
function LangToggle() {
  const { lang, setLang } = useT();
  return (
    <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} style={{
      padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.06)', color: 'var(--mfg)', fontWeight: 700,
      fontSize: 12, cursor: 'pointer', letterSpacing: '0.04em',
      fontFamily: lang === 'ar' ? "'DM Sans', sans-serif" : "'Cairo', sans-serif",
    }}>
      {lang === 'en' ? 'ع' : 'EN'}
    </button>
  );
}

export default function AppAllActions() {
  const { t, lang } = useT();
  const isAr = lang === 'ar';
  const { watchlist } = useWatchlist();
  const fontFamily = "var(--font-sans)";
  const dir = isAr ? 'rtl' : 'ltr';

  const [activeTab, setActiveTab] = useState<'feed' | 'watchlist'>('feed');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [holdingsOnly, setHoldingsOnly] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const { actions: sheetActions, loading, error, refresh } = useSheetActions();
  const all = useMemo(() => sheetActions, [sheetActions]);

  const filtered = useMemo(() => {
    let list = all;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => {
        const co = COMPANIES[a.symbol];
        return a.symbol.toLowerCase().includes(q)
          || (co?.name || '').toLowerCase().includes(q)
          || (isAr && (co?.nameAr || '').includes(q));
      });
    }
    if (typeFilter.size > 0) list = list.filter(a => typeFilter.has(a.type));
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);
    if (holdingsOnly) list = list.filter(a => watchlist.includes(a.symbol));
    if (dateRange !== 'all') {
      list = list.filter(a => {
        const d = daysFromToday(a.exDate);
        if (dateRange === '30') return d >= 0 && d <= 30;
        if (dateRange === '90') return d >= 0 && d <= 90;
        if (dateRange === 'past') return d < 0 && a.status !== 'ongoing';
        return true;
      });
    }
    if (selectedDate) {
      list = list.filter(a => isSameDay(a.exDate, selectedDate) || isSameDay(a.paymentDate, selectedDate) || isSameDay(a.recordDate, selectedDate));
    }
    return list.sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime());
  }, [all, search, typeFilter, statusFilter, holdingsOnly, dateRange, selectedDate, isAr]);

  const activeFilters = typeFilter.size + (statusFilter !== 'all' ? 1 : 0) + (holdingsOnly ? 1 : 0) + (dateRange !== 'all' ? 1 : 0);

  const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const grouped = useMemo(() => {
    const g: Record<string, { label: string; items: typeof filtered }> = {};
    filtered.forEach(a => {
      const d = new Date(a.exDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = (isAr ? MONTHS_AR : MONTHS_EN)[d.getMonth()] + ' ' + d.getFullYear();
      if (!g[key]) g[key] = { label, items: [] };
      g[key].items.push(a);
    });
    return g;
  }, [filtered, isAr]);

  if (loading && sheetActions.length === 0) return (
    <div data-mtheme="dark" style={{ minHeight: '100vh', background: 'var(--mbg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, fontFamily }}>
      <img src="/thndr-logo-full.png" height={22} alt="Thndr" style={{ opacity: 0.8 }} />
      <div style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #FFFF00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error && sheetActions.length === 0) return (
    <div data-mtheme="dark" style={{ minHeight: '100vh', background: 'var(--mbg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily, textAlign: 'center', padding: 32 }}>
      <img src="/thndr-logo-full.png" height={22} alt="Thndr" style={{ opacity: 0.8, marginBottom: 16 }} />
      <div style={{ fontSize: 40, marginBottom: 4 }}>⚠️</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--mfg)', fontFamily: "'Recoleta', Georgia, serif" }}>Unable to load data</div>
      <div style={{ fontSize: 14, color: 'var(--mfg2)', maxWidth: 320, lineHeight: 1.6 }}>We couldn't connect to the data source. Please check your connection and try again.</div>
      <button onClick={refresh} style={{ marginTop: 8, background: '#FFFF00', color: '#000', border: 0, borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Try again</button>
    </div>
  );

  return (
    <div dir={dir} data-mtheme="dark" style={{ background: 'var(--mbg)', color: 'var(--mfg)', minHeight: '100vh', paddingTop: 50, paddingBottom: 80, position: 'relative', fontFamily }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/thndr-logo-full.png" height="22" alt="Thndr" style={{ display: 'block' }}/>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{t.corporateActions}</div>
            <div style={{ fontSize: 11, color: 'var(--mfg2)', marginTop: 1 }}>
              EGX · {filtered.length} {filtered.length === 1 ? t.event : t.events_}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LangToggle />
          <button style={{ width: 36, height: 36, borderRadius: 10, border: 0, background: 'transparent', color: 'var(--mfg)', cursor: 'pointer' }}>
            <i className="ph ph-bell" style={{ fontSize: 20 }}/>
          </button>
        </div>
      </div>

      {activeTab === 'feed' ? (
        <>
          {/* Search */}
          <div style={{ padding: '12px 20px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--mcard)', borderRadius: 14, padding: '11px 14px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <i className="ph ph-magnifying-glass" style={{ fontSize: 18, color: 'var(--mfg3)' }}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchPlaceholder}
                style={{ border: 0, background: 'transparent', outline: 'none', color: 'var(--mfg)', fontFamily, fontSize: 14, flex: 1, minWidth: 0, textAlign: isAr ? 'right' : 'left' }}/>
              {search && <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 0, color: 'var(--mfg3)', cursor: 'pointer', padding: 0 }}><i className="ph ph-x-circle" style={{ fontSize: 18 }}/></button>}
            </div>
          </div>

          {/* View toggle + filter button */}
          <div style={{ display: 'flex', gap: 8, padding: '4px 20px 8px', alignItems: 'center' }}>
            <div style={{ display: 'inline-flex', background: 'var(--mcard)', borderRadius: 10, padding: 3, border: '1px solid rgba(255,255,255,0.04)' }}>
              {[{ id: 'list' as const, icon: 'list-bullets', label: t.list }, { id: 'calendar' as const, icon: 'calendar-blank', label: t.calendarView }].map(o => (
                <button key={o.id} onClick={() => setView(o.id)} style={{
                  padding: '6px 12px', borderRadius: 8, border: 0,
                  background: view === o.id ? 'var(--mchip)' : 'transparent',
                  color: view === o.id ? 'var(--mfg)' : 'var(--mfg2)',
                  fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <i className={`ph ph-${o.icon}`} style={{ fontSize: 14 }}/>{o.label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }}/>
            <button onClick={() => setFilterOpen(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: activeFilters > 0 ? 'rgba(243,243,3,0.14)' : 'var(--mcard)',
              color: activeFilters > 0 ? '#FFFF00' : 'var(--mfg)',
              border: `1px solid ${activeFilters > 0 ? 'rgba(243,243,3,0.32)' : 'var(--mborder-2)'}`,
              padding: '8px 12px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
              <i className="ph ph-sliders-horizontal" style={{ fontSize: 16 }}/>{t.filters}
              {activeFilters > 0 && <span style={{ background: '#FFFF00', color: 'var(--mbg)', borderRadius: 999, padding: '0 6px', fontSize: 10, fontWeight: 800, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilters}</span>}
            </button>
          </div>

          {/* Quick chips */}
          <div style={{ display: 'flex', gap: 8, padding: '4px 20px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[
              { active: holdingsOnly, icon: 'bookmark-simple-fill', label: t.myHoldings, onClick: () => setHoldingsOnly(v => !v) },
              { active: dateRange === '30', label: t.last30, onClick: () => setDateRange(dateRange === '30' ? 'all' : '30') },
              { active: dateRange === '90', label: t.last90, onClick: () => setDateRange(dateRange === '90' ? 'all' : '90') },
              { active: dateRange === 'past', label: t.past, onClick: () => setDateRange(dateRange === 'past' ? 'all' : 'past') },
            ].map((c, i) => (
              <button key={i} onClick={c.onClick} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 999,
                border: `1px solid ${c.active ? '#FFFF00' : 'var(--mborder-3)'}`,
                background: c.active ? 'rgba(243,243,3,0.12)' : 'var(--mcard)',
                color: c.active ? '#FFFF00' : 'var(--mfg-soft)',
                fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {(c as { icon?: string }).icon && <i className={`ph ph-${(c as { icon?: string }).icon}`} style={{ fontSize: 13 }}/>}
                {c.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {view === 'list' ? (
            <div style={{ padding: '0 20px' }}>
              {Object.keys(grouped).sort().reverse().length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <i className="ph ph-calendar-x" style={{ fontSize: 40, color: 'var(--mfg4)', marginBottom: 12, display: 'block' }}/>
                  <div style={{ fontWeight: 700, color: 'var(--mfg)', marginBottom: 4 }}>{t.noActionsMatch}</div>
                  <div style={{ fontSize: 13, color: 'var(--mfg2)' }}>{t.clearFiltersHint}</div>
                </div>
              ) : Object.keys(grouped).sort().reverse().map(k => (
                <div key={k} style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mfg3)', letterSpacing: '0.12em', padding: '14px 0 8px', textTransform: 'uppercase' }}>{grouped[k].label}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {grouped[k].items.map(a => (
                      <ActionListCard key={a.id} action={a} expanded={openActionId === a.id} onToggle={() => setOpenActionId(openActionId === a.id ? null : a.id)}/>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <MobileCalendar actions={filtered} allActions={all} selectedDate={selectedDate}
              onSelectDate={d => setSelectedDate(prev => isSameDay(prev, d) ? null : d)}
              openActionId={openActionId} onToggleAction={id => setOpenActionId(openActionId === id ? null : id)}/>
          )}

          {filterOpen && (
            <FilterSheet
              typeFilter={typeFilter} setTypeFilter={setTypeFilter}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              onClose={() => setFilterOpen(false)}
              onClear={() => { setTypeFilter(new Set()); setStatusFilter('all'); }}
            />
          )}
        </>
      ) : (
        <WatchlistView all={all} openActionId={openActionId} onToggleAction={id => setOpenActionId(openActionId === id ? null : id)}/>
      )}

      {/* Bottom tab bar */}
      <div dir={isAr ? 'rtl' : 'ltr'} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--mbg)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', zIndex: 40 }}>
        {[
          { id: 'feed' as const, icon: 'list-bullets', label: isAr ? 'الكل' : 'Feed' },
          { id: 'watchlist' as const, icon: 'heart', label: isAr ? 'المتابعة' : 'Watchlist' },
        ].map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 4, padding: '10px 0 14px', border: 0, background: 'transparent', cursor: 'pointer',
              color: active ? '#FFFF00' : 'var(--mfg3)', fontFamily,
            }}>
              <i className={`ph${active ? '-fill' : ''} ph-${tab.icon}`} style={{ fontSize: 22 }}/>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: isAr ? 0 : '0.04em' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── WatchlistView ──────────────────────────────────────────── */
function WatchlistView({ all, openActionId, onToggleAction }: {
  all: CorporateActionWithStatus[];
  openActionId: string | null;
  onToggleAction: (id: string) => void;
}) {
  const { t, lang } = useT();
  const isAr = lang === 'ar';
  const fontFamily = "var(--font-sans)";
  const { watchlist, removeFromWatchlist, inWatchlist } = useWatchlist();
  const navigate = useNavigate();

  const actionsBySymbol = useMemo(() => {
    const m: Record<string, CorporateActionWithStatus[]> = {};
    watchlist.forEach(s => { m[s] = []; });
    all.forEach(a => {
      if (watchlist.includes(a.symbol) && a.status !== 'paid') {
        m[a.symbol].push(a);
      }
    });
    return m;
  }, [all, watchlist]);

  if (watchlist.length === 0) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <i className="ph ph-heart" style={{ fontSize: 48, color: 'var(--mfg4)', marginBottom: 16, display: 'block' }}/>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--mfg)', marginBottom: 8, fontFamily }}>
          {t.watchlistEmpty}
        </div>
        <div style={{ fontSize: 14, color: 'var(--mfg2)', fontFamily }}>
          {t.watchlistEmptyHint}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mfg3)', letterSpacing: '0.12em', padding: '14px 0 8px', textTransform: 'uppercase', fontFamily }}>
        {t.stocksSaved(watchlist.length)}
      </div>
      {watchlist.map(symbol => {
        const co = COMPANIES[symbol];
        if (!co) return null;
        const upcoming = actionsBySymbol[symbol] || [];
        const companyName = isAr ? (co.nameAr || co.name) : co.name;
        return (
          <div key={symbol} style={{ marginBottom: 24 }}>
            {/* Stock header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: '12px 14px', background: 'var(--mcard)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)' }}>
              <div onClick={() => navigate(`/app/stock/${symbol}`, { state: { fromFeed: true } })} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer', minWidth: 0 }}>
                <TickerTile symbol={symbol} size={40} radius={10}/>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--mfg)', letterSpacing: '-0.01em', fontFamily }}>{symbol}</div>
                  <div style={{ fontSize: 12, color: 'var(--mfg2)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily }}>{companyName}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {upcoming.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFF00', background: 'rgba(243,243,3,0.12)', border: '1px solid rgba(243,243,3,0.24)', borderRadius: 999, padding: '3px 8px' }}>
                    {upcoming.length} {t.upcomingBadge}
                  </span>
                )}
                <button onClick={() => removeFromWatchlist(symbol)} style={{ width: 30, height: 30, borderRadius: 999, border: 0, background: 'rgba(255,65,54,0.12)', color: '#FF4136', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <i className="ph-fill ph-heart" style={{ fontSize: 15 }}/>
                </button>
                <button onClick={() => navigate(`/app/stock/${symbol}`, { state: { fromFeed: true } })} style={{ width: 30, height: 30, borderRadius: 999, border: 0, background: 'rgba(255,255,255,0.06)', color: 'var(--mfg2)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <i className="ph ph-arrow-right" style={{ fontSize: 15 }}/>
                </button>
              </div>
            </div>
            {/* Actions for this stock */}
            {upcoming.length === 0 ? (
              <div style={{ padding: '14px 16px', background: 'var(--mcard)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', fontSize: 12, color: 'var(--mfg3)', fontFamily }}>
                {t.noUpcomingActions}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map(a => (
                  <ActionListCard key={a.id} action={a} expanded={openActionId === a.id} onToggle={() => onToggleAction(a.id)}/>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── ActionListCard ─────────────────────────────────────────── */
function ActionListCard({ action, expanded, onToggle }: { action: CorporateActionWithStatus; expanded: boolean; onToggle: () => void }) {
  const { t, lang } = useT();
  const isAr = lang === 'ar';
  const { pdfs } = usePdfs();
  const { inWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const sheetPdfs = (action.pdfUrls ?? []).map((url, i) => ({ name: `Document ${i + 1}`, url }));
  const pdfList = pdfs[action.id] ?? [];
  const allPdfs = [...sheetPdfs, ...pdfList];
  const [viewingPdfIdx, setViewingPdfIdx] = useState(-1);
  const meta = ACTION_TYPES[action.type];
  const company = COMPANIES[action.symbol];
  const rendered = actionRenderer(action, lang);
  const cardDateStr = action.type === 'cash_dividend' ? (action.recordDate ?? action.exDate) : action.exDate;
  const cardDate = new Date(cardDateStr);
  const dayNum = cardDate.getDate();
  const monthLabel = isAr
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][cardDate.getMonth()]
    : ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][cardDate.getMonth()];
  const yearNum = cardDate.getFullYear();
  const days = daysFromToday(cardDateStr);
  const companyName = isAr ? (company?.nameAr || company?.name) : company?.name;
  const arDayWord = (n: number) => n === 2 ? 'يومين' : n >= 3 && n <= 10 ? `${n} أيام` : `${n} يوم`;
  const daysLabel = days === 0 ? t.today_
    : days > 0
      ? isAr ? (days === 2 ? 'خلال يومين' : `خلال ${arDayWord(days)}`) : `in ${days}d`
      : isAr ? ((-days) === 2 ? 'منذ يومين' : `منذ ${arDayWord(-days)}`) : `${-days}d ago`;
  const isFav = inWatchlist(action.symbol);

  return (
    <div style={{ borderRadius: 16, background: 'var(--mcard)', border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ display: 'flex', alignItems: 'stretch', gap: 14, padding: 14, width: '100%', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'start' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
          <div style={{ minWidth: 38, textAlign: 'center', alignSelf: 'center' }}>
            <div style={{ fontSize: 9, color: 'var(--mfg2)', fontWeight: 700, letterSpacing: isAr ? 0 : '0.12em' }}>{monthLabel}</div>
            <div style={{ fontSize: 22, color: 'var(--mfg)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05, letterSpacing: '-0.02em' }}>{dayNum}</div>
            <div style={{ fontSize: 9, color: 'var(--mfg3)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{yearNum}</div>
          </div>
          <div style={{ width: 3, borderRadius: 4, background: meta.color, flexShrink: 0 }}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <TickerTile symbol={action.symbol} size={24} radius={6}/>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--mfg)', letterSpacing: '-0.01em' }}>{action.symbol}</span>
            <TypeBadge type={action.type} size="xs"/>
          </div>
          <div style={{ fontSize: 12, color: 'var(--mfg2)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{companyName}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--mfg)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{rendered.summary.primary}</span>
            <span style={{ fontSize: 11, color: 'var(--mfg2)' }}>{rendered.summary.secondary}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, minWidth: 64 }}>
          <StatusPill status={action.status} size="sm"/>
          <div style={{ fontSize: 10, color: 'var(--mfg3)', fontWeight: 600 }}>{daysLabel}</div>
        </div>
        {/* Heart toggle */}
        <div role="button" onClick={e => { e.stopPropagation(); isFav ? removeFromWatchlist(action.symbol) : addToWatchlist(action.symbol); }}
          style={{ alignSelf: 'center', padding: '4px 2px', cursor: 'pointer', color: isFav ? '#FF4136' : 'var(--mfg3)', lineHeight: 1, transition: 'color 150ms', flexShrink: 0 }}>
          <i className={`ph${isFav ? '-fill' : ''} ph-heart`} style={{ fontSize: 18 }}/>
        </div>
        {allPdfs.length > 0 && <i className="ph-fill ph-paperclip" style={{ fontSize: 13, color: '#FFFF00', alignSelf: 'center', opacity: 0.8 }}/>}
        <i className={`ph ph-caret-${expanded ? 'up' : 'down'}`} style={{ fontSize: 16, color: 'var(--mfg3)', alignSelf: 'center' }}/>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <ExpandedDates dates={rendered.keyDates} completed={action.status === 'paid'}/>
          {rendered.sections?.map((sec, si) => (
            <div key={si} style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--mfg3)', marginBottom: 8, textTransform: 'uppercase' }}>{sec.label}</div>
              {sec.keyDates && sec.keyDates.length > 0 && <ExpandedDates dates={sec.keyDates} completed={action.status === 'paid'}/>}
              {sec.terms && sec.terms.length > 0 && (
                <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '2px 12px' }}>
                  {sec.terms.map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '9px 0', borderBottom: i === sec.terms!.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: 12, color: 'var(--mfg2)', fontWeight: 500 }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--mfg)', fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '2px 12px' }}>
            {rendered.terms.map((row, i) => {
              const accent = row.accent === 'positive' ? 'var(--mup)' : row.accent === 'negative' ? '#FF4136' : undefined;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '9px 0', borderBottom: i === rendered.terms.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 12, color: 'var(--mfg2)', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: accent || 'var(--mfg)', fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                </div>
              );
            })}
          </div>
          {rendered.disclaimer && (
            <div style={{ marginTop: 10, fontSize: 10, color: 'var(--mfg3)', lineHeight: 1.5, fontStyle: 'italic' }}>
              {rendered.disclaimer}
            </div>
          )}
          {allPdfs.length > 0 && (
            <div style={{ marginTop: 12, marginInline: -16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {allPdfs.map((pdf, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setViewingPdfIdx(i); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'rgba(255,65,54,0.06)', border: 0, borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none', cursor: 'pointer', color: 'var(--mfg)' }}>
                  <i className="ph-fill ph-file-pdf" style={{ fontSize: 18, color: '#FF4444', flexShrink: 0 }}/>
                  <span style={{ flex: 1, textAlign: 'start', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdf.name}</span>
                  <i className="ph ph-arrow-right" style={{ fontSize: 14, color: 'var(--mfg3)' }}/>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {viewingPdfIdx >= 0 && allPdfs[viewingPdfIdx] && <PdfViewerModal name={allPdfs[viewingPdfIdx].name} url={allPdfs[viewingPdfIdx].url} onClose={() => setViewingPdfIdx(-1)}/>}
    </div>
  );
}

function ExpandedDates({ dates, completed }: { dates: ReturnType<typeof actionRenderer>['keyDates']; completed?: boolean }) {
  const { lang } = useT();
  const isAr = lang === 'ar';
  return (
    <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
      {dates.map((d, i) => {
        if (d.value && !d.date) {
          return (
            <div key={d.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < dates.length - 1 ? 12 : 0 }}>
              <span style={{ fontSize: 12, color: 'var(--mfg2)', fontWeight: 500 }}>{d.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mfg)', fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
            </div>
          );
        }
        const days = d.date ? daysFromToday(d.date) : null;
        const isPast = days != null && days < 0;
        const isToday = days === 0;
        const isFuture = days != null && days > 0;
        const isYellow = isPast || isToday || d.emphasis;
        const dotColor = isYellow ? '#FFFF00' : 'rgba(255,255,255,0.5)';
        const lineColor = isPast ? 'rgba(243,243,3,0.2)' : 'rgba(255,255,255,0.08)';
        const labelColor = isPast ? 'var(--mfg3)' : 'var(--mfg2)';
        const valueColor = isPast ? 'var(--mfg3)' : 'var(--mfg)';
        const daysAhead = isFuture && !completed
          ? isAr ? (days === 2 ? 'خلال يومين' : `خلال ${days! >= 3 && days! <= 10 ? days + ' أيام' : days + ' يوم'}`) : `in ${days}d`
          : null;
        return (
          <div key={d.key} style={{ display: 'flex', gap: 10, paddingBottom: i < dates.length - 1 ? 12 : 0, position: 'relative' }}>
            {i < dates.length - 1 && <div style={{ position: 'absolute', insetInlineStart: 5, top: 14, bottom: 0, width: 2, background: lineColor }}/>}
            <div style={{ flexShrink: 0, paddingTop: 3 }}>
              <span style={{ display: 'block', width: 12, height: 12, borderRadius: 999, background: dotColor, boxShadow: (isToday && !completed) ? '0 0 0 3px rgba(255,255,255,0.15)' : completed ? '0 0 0 3px rgba(243,243,3,0.2)' : 'none' }}/>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: labelColor, fontWeight: 500, display: 'flex', alignItems: 'center' }}>{d.label}<InfoDot defKey={d.key} dark/></span>
              <span style={{ fontSize: 12, fontWeight: 600, color: valueColor, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {d.date ? fmtDate(d.date, isAr ? { lang: 'ar' } : { long: true }) : '—'}
                {daysAhead && <span style={{ fontSize: 10, color: 'var(--mfg3)', marginInlineStart: 4 }}>{daysAhead}</span>}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Calendar view ──────────────────────────────────────────── */
function MobileCalendar({ actions, allActions: allA, selectedDate, onSelectDate, openActionId, onToggleAction }: {
  actions: CorporateActionWithStatus[];
  allActions: CorporateActionWithStatus[];
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
  openActionId: string | null;
  onToggleAction: (id: string) => void;
}) {
  const { t, lang } = useT();
  const isAr = lang === 'ar';
  const [viewMonth, setViewMonth] = useState(new Date('2026-05-01'));
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const monthName = t.months[month];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayMap = useMemo(() => {
    const m: Record<number, Set<string>> = {};
    allA.forEach(a => {
      [a.exDate, a.paymentDate, a.recordDate].forEach(d => {
        if (!d) return;
        const dt = new Date(d);
        if (dt.getMonth() === month && dt.getFullYear() === year) {
          const key = dt.getDate();
          if (!m[key]) m[key] = new Set();
          m[key].add(ACTION_TYPES[a.type].color);
        }
      });
    });
    return m;
  }, [allA, year, month]);

  const today = new Date('2026-05-17');
  const isToday = (d: number) => year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const dayActions = selectedDate ? actions.filter(a => isSameDay(a.exDate, selectedDate) || isSameDay(a.paymentDate, selectedDate) || isSameDay(a.recordDate, selectedDate)) : [];

  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ background: 'var(--mcard)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} style={{ border: 0, background: 'rgba(255,255,255,0.08)', color: 'var(--mfg)', cursor: 'pointer', width: 28, height: 28, borderRadius: 8 }}>
            <i className="ph ph-caret-left" style={{ fontSize: 14 }}/>
          </button>
          <div style={{ fontWeight: 700, color: 'var(--mfg)', fontSize: 15 }}>{monthName} {year}</div>
          <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} style={{ border: 0, background: 'rgba(255,255,255,0.08)', color: 'var(--mfg)', cursor: 'pointer', width: 28, height: 28, borderRadius: 8 }}>
            <i className="ph ph-caret-right" style={{ fontSize: 14 }}/>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
          {t.dayAbbr.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--mfg3)', fontWeight: 600 }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (d == null) return <div key={i}/>;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const selected = selectedDate && isSameDay(selectedDate, dateStr);
            const dots = dayMap[d] ? [...dayMap[d]].slice(0, 3) : [];
            const today_ = isToday(d);
            return (
              <button key={i} onClick={() => onSelectDate(dateStr)} style={{
                aspectRatio: '1/1', border: 0, borderRadius: 10,
                background: selected ? '#FFFF00' : today_ ? 'rgba(243,243,3,0.10)' : 'transparent',
                color: selected ? 'var(--mbg)' : today_ ? '#FFFF00' : 'var(--mfg)',
                fontWeight: selected || today_ ? 700 : 500, fontSize: 13, cursor: 'pointer',
                position: 'relative', display: 'grid', placeItems: 'center',
              }}>
                {d}
                {dots.length > 0 && (
                  <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 2 }}>
                    {dots.map((c, j) => <span key={j} style={{ width: 4, height: 4, borderRadius: 999, background: c }}/>)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {selectedDate ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 10px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--mfg)' }}>{fmtDate(selectedDate, isAr ? { lang: 'ar' } : { long: true })}</div>
              <button onClick={() => onSelectDate(selectedDate)} style={{ background: 'transparent', border: 0, color: 'var(--mfg2)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{t.clear}</button>
            </div>
            {dayActions.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--mcard)', borderRadius: 14, color: 'var(--mfg2)' }}>{t.noActionsDay}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dayActions.map(a => <ActionListCard key={a.id} action={a} expanded={openActionId === a.id} onToggle={() => onToggleAction(a.id)}/>)}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--mfg2)', textAlign: 'center', padding: '16px' }}>{t.tapDateHint}</div>
        )}
      </div>
    </div>
  );
}

/* ─── Filter sheet ───────────────────────────────────────────── */
function FilterSheet({ typeFilter, setTypeFilter, statusFilter, setStatusFilter, onClose, onClear }: {
  typeFilter: Set<string>; setTypeFilter: (s: Set<string>) => void;
  statusFilter: string; setStatusFilter: (s: string) => void;
  onClose: () => void; onClear: () => void;
}) {
  const { t, lang } = useT();
  const isAr = lang === 'ar';

  const toggleType = (k: string) => {
    const next = new Set(typeFilter);
    if (next.has(k)) next.delete(k); else next.add(k);
    setTypeFilter(next);
  };

  const statusOptions = [
    { id: 'all', label: t.allFilter },
    { id: 'ongoing', label: t.ongoing },
    { id: 'paid', label: t.completed },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} dir={isAr ? 'rtl' : 'ltr'} style={{ background: 'var(--mbg)', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', maxHeight: '80vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--mfg)' }}>{t.filtersTitle}</div>
          <button onClick={onClear} style={{ background: 'transparent', border: 0, color: '#FFFF00', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t.clear}</button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mfg3)', letterSpacing: '0.12em', marginBottom: 10 }}>{t.filterTypeLabel}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(ACTION_TYPES).map(([k, m]) => {
              const active = typeFilter.has(k);
              return (
                <button key={k} onClick={() => toggleType(k)} style={{
                  padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${active ? m.color : 'rgba(255,255,255,0.10)'}`,
                  background: active ? hexToRgba(m.color, 0.16) : 'transparent',
                  color: active ? m.color : 'var(--mfg2)',
                }}>
                  {isAr ? m.labelAr : m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mfg3)', letterSpacing: '0.12em', marginBottom: 10 }}>{t.filterStatusLabel}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {statusOptions.map(o => {
              const active = statusFilter === o.id;
              return (
                <button key={o.id} onClick={() => setStatusFilter(o.id)} style={{
                  padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${active ? '#FFFF00' : 'rgba(255,255,255,0.10)'}`,
                  background: active ? 'rgba(243,243,3,0.14)' : 'transparent',
                  color: active ? '#FFFF00' : 'var(--mfg2)',
                }}>
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 0, background: '#FFFF00', color: '#000', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          {t.apply}
        </button>
      </div>
    </div>
  );
}
