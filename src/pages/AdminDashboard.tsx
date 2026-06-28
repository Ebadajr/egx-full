import { useState, useMemo, createContext, useContext, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { COMPANIES, ACTION_TYPES, STATUS_META, CorporateActionWithStatus, fmtDate, daysFromToday } from '../data/designData';
import { useSheetActions } from '../data/sheetActionsContext';
import { useT } from '../lib/i18n';
import { StatusPill, TypeBadge, TickerTile, InfoDot, actionRenderer, hexToRgba, isSameDay, PdfViewerModal } from '../lib/shared';


import { useWatchlist } from '../lib/watchlistStore';
import NewsSection from './NewsSection';

const TK_DARK = {
  body: '#000', fg: '#fff', fg2: '#9A9A9A', fg3: '#767676',
  card: '#0E0E0E', cardBorder: 'rgba(255,255,255,0.06)',
  sidebar: '#000', sidebarFg: '#fff', sidebarFg2: '#BEBEBE', sidebarMuted: '#767676',
  navActive: '#FFFF00', navActiveFg: '#000', accent: '#FFFF00', emphasisText: '#FFFF00',
  searchBg: 'rgba(255,255,255,0.04)', searchBorder: 'rgba(255,255,255,0.06)',
  btnBg: 'rgba(255,255,255,0.04)', btnBorder: 'rgba(255,255,255,0.08)',
  rowBg: '#171717', rowBorder: 'rgba(255,255,255,0.04)',
  divider: 'rgba(255,255,255,0.06)',
  detailsBg: '#0A0A0A',
  pdfBg: 'rgba(255,255,255,0.04)', pdfBorder: 'rgba(255,255,255,0.08)',
  modalBg: '#111', modalBorder: 'rgba(255,255,255,0.08)',
  modalItem: 'rgba(255,255,255,0.04)', modalSearch: 'rgba(255,255,255,0.06)',
};

const TK_LIGHT = {
  body: '#F5F5F7', fg: '#111', fg2: '#555', fg3: '#888',
  card: '#fff', cardBorder: 'rgba(0,0,0,0.08)',
  sidebar: '#fff', sidebarFg: '#111', sidebarFg2: '#555', sidebarMuted: '#888',
  navActive: '#FFFF00', navActiveFg: '#000', accent: '#111', emphasisText: '#8A7A00',
  searchBg: 'rgba(0,0,0,0.05)', searchBorder: 'rgba(0,0,0,0.09)',
  btnBg: 'rgba(0,0,0,0.05)', btnBorder: 'rgba(0,0,0,0.10)',
  rowBg: '#EBEBED', rowBorder: 'rgba(0,0,0,0.07)',
  divider: 'rgba(0,0,0,0.08)',
  detailsBg: '#F0F0F2',
  pdfBg: 'rgba(0,0,0,0.04)', pdfBorder: 'rgba(0,0,0,0.08)',
  modalBg: '#fff', modalBorder: 'rgba(0,0,0,0.10)',
  modalItem: 'rgba(0,0,0,0.04)', modalSearch: 'rgba(0,0,0,0.05)',
};

type Tk = typeof TK_DARK;
const AdminTkCtx = createContext<Tk>(TK_DARK);
const useAdminTk = () => useContext(AdminTkCtx);

export default function AdminDashboard({ readOnly = false }: { readOnly?: boolean }) {
  const { t, lang, setLang } = useT();
  const isAr = lang === 'ar';
  const [isDark, setIsDark] = useState(true);
  const TK = isDark ? TK_DARK : TK_LIGHT;
  const navigate = useNavigate();

  const { actions: sheetActions, loading, error, refresh } = useSheetActions();
  const all = useMemo(() => sheetActions, [sheetActions]);

  const upcoming = useMemo(() =>
    all.filter(a => a.status === 'upcoming' || a.status === 'announced')
       .sort((a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime()),
  [all]);
  const completed = all.filter(a => a.status === 'paid').length;
  const ongoing = all.filter(a => a.status === 'ongoing').length;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeNav, setActiveNav] = useState('overview');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visible = useMemo(() => {
    let list = all;
    if (activeFilter === 'upcoming') list = list.filter(a => a.status === 'upcoming' || a.status === 'announced');
    if (activeFilter === 'completed') list = list.filter(a => a.status === 'paid');
    if (activeFilter === 'ongoing') list = list.filter(a => a.status === 'ongoing');
    if (typeFilter) list = list.filter(a => a.type === typeFilter);
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      list = list.filter(a => {
        const co = COMPANIES[a.symbol];
        const typeInfo = ACTION_TYPES[a.type];
        return a.symbol.toLowerCase().includes(q)
          || (co?.name || '').toLowerCase().includes(q)
          || (co?.nameAr || '').includes(q)
          || (typeInfo?.label || '').toLowerCase().includes(q)
          || (typeInfo?.labelAr || '').includes(q);
      });
    }
    if (selectedDate) {
      list = list.filter(a => isSameDay(a.exDate, selectedDate) || isSameDay(a.paymentDate, selectedDate) || isSameDay(a.recordDate, selectedDate));
    }
    return list.sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime());
  }, [activeFilter, selectedDate, all, searchQ, typeFilter]);

  const hasFilter = activeFilter !== 'all' || typeFilter || searchQ.trim() || selectedDate;
  const listToShow = hasFilter
    ? visible
    : showAll
      ? all.slice().sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime())
      : upcoming.slice(0, 8);

  let listTitle = t.upcomingActions;
  let listSub = '';
  if (selectedDate) { listTitle = isAr ? `إجراءات ${fmtDate(selectedDate, { long: true, lang: 'ar' })}` : `Actions on ${fmtDate(selectedDate, { long: true })}`; listSub = isAr ? `${visible.length} إجراء مجدول` : `${visible.length} action${visible.length === 1 ? '' : 's'} scheduled`; }
  else if (hasFilter) { listTitle = isAr ? 'نتائج البحث' : 'Filtered results'; listSub = isAr ? `${visible.length} إجراء` : `${visible.length} action${visible.length === 1 ? '' : 's'}`; }
  else if (showAll) { listTitle = isAr ? 'كل الإجراءات' : 'All actions'; listSub = isAr ? `${all.length} إجمالي` : `${all.length} total · past + upcoming`; }

  const clearAll = () => { setActiveFilter('all'); setTypeFilter(null); setSearchQ(''); setSelectedDate(null); };

  if (loading && sheetActions.length === 0) return (
    <div style={{ minHeight: '100vh', background: TK.body, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <img src="/thndr-logo-full.png" height={22} alt="Thndr" style={{ opacity: 0.8 }} />
      <div style={{ width: 32, height: 32, border: `3px solid rgba(255,255,255,0.08)`, borderTop: `3px solid ${TK.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error && sheetActions.length === 0) return (
    <div style={{ minHeight: '100vh', background: TK.body, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: "'DM Sans', sans-serif", textAlign: 'center', padding: 32 }}>
      <img src="/thndr-logo-full.png" height={22} alt="Thndr" style={{ opacity: 0.8, marginBottom: 16 }} />
      <div style={{ fontSize: 40, marginBottom: 4 }}>⚠️</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: TK.fg, fontFamily: "'Recoleta', Georgia, serif" }}>Unable to load data</div>
      <div style={{ fontSize: 14, color: TK.fg2, maxWidth: 320, lineHeight: 1.6 }}>We couldn't connect to the data source. Please check your connection and try again.</div>
      <button onClick={refresh} style={{ marginTop: 8, background: TK.accent, color: TK.navActiveFg, border: 0, borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Try again</button>
    </div>
  );

  const toggleStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '7px 12px', borderRadius: 9, border: `1px solid ${TK.btnBorder}`,
    background: TK.btnBg, color: TK.sidebarFg, fontWeight: 700, fontSize: 12,
    cursor: 'pointer', gap: 6,
  };

  return (
    <AdminTkCtx.Provider value={TK}>
      <div dir={isAr ? 'rtl' : 'ltr'} style={{ display: 'flex', minHeight: '100vh', background: TK.body, color: TK.fg, fontFamily: "var(--font-sans)" }}>
        {/* ─── Sidebar ──────────────────────────────────────── */}
        <aside style={{ width: 260, background: TK.sidebar, display: 'flex', flexDirection: 'column', padding: '24px 18px', borderInlineEnd: `1px solid ${TK.divider}`, position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 32px' }}>
            <img src="/thndr-logo-full.png" height="24" alt="Thndr" style={{ display: 'block' }}/>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: TK.sidebarMuted, letterSpacing: '0.12em', marginBottom: 10, padding: '0 8px' }}>{isAr ? 'القائمة' : 'MENU'}</div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 28 }}>
            {[
              { id: 'overview', icon: 'squares-four', label: t.overview },
              { id: 'watchlist', icon: 'bookmark-simple', label: isAr ? 'قائمة المتابعة' : 'Watchlist' },
              { id: 'news', icon: 'newspaper', label: isAr ? 'الأخبار' : 'News' },
            ].map(n => (
              <button key={n.id} onClick={() => setActiveNav(n.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, border: 0,
                background: activeNav === n.id ? TK.navActive : 'transparent',
                color: activeNav === n.id ? TK.navActiveFg : TK.sidebarFg,
                fontWeight: activeNav === n.id ? 700 : 600, fontSize: 14, cursor: 'pointer',
              }}>
                <i className={`ph ${activeNav === n.id ? 'ph-fill' : ''} ph-${n.icon}`} style={{ fontSize: 18 }}/>
                <span style={{ flex: 1 }}>{n.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ fontSize: 11, fontWeight: 700, color: TK.sidebarMuted, letterSpacing: '0.12em', marginBottom: 10, padding: '0 8px' }}>{isAr ? 'البحث' : 'SEARCH'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: TK.searchBg, borderRadius: 12, padding: '10px 12px', border: `1px solid ${TK.searchBorder}` }}>
            <i className="ph ph-magnifying-glass" style={{ fontSize: 16, color: TK.sidebarMuted }}/>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder={isAr ? 'سهم، شركة، نوع الإجراء…' : 'Stock, company, action type…'}
              style={{ border: 0, background: 'transparent', outline: 'none', color: TK.sidebarFg, fontFamily: "'DM Sans', sans-serif", fontSize: 13, flex: 1, minWidth: 0 }}/>
            {searchQ && <button onClick={() => setSearchQ('')} style={{ background: 'transparent', border: 0, color: TK.sidebarMuted, cursor: 'pointer', padding: 0 }}><i className="ph ph-x-circle" style={{ fontSize: 14 }}/></button>}
          </div>

          <div style={{ marginTop: 24, padding: '0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TK.sidebarMuted, letterSpacing: '0.12em' }}>{isAr ? t.filterTypeLabel : 'ACTION TYPES'}</span>
              {typeFilter && <button onClick={() => setTypeFilter(null)} style={{ background: 'transparent', border: 0, color: '#FFFF00', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: 0 }}>{isAr ? t.clear : 'CLEAR'}</button>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(ACTION_TYPES).map(([k, m]) => {
                const active = typeFilter === k;
                return (
                  <button key={k} onClick={() => setTypeFilter(active ? null : k)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
                    color: active ? TK.fg : TK.sidebarFg2,
                    background: active ? hexToRgba(m.color, 0.16) : 'transparent',
                    border: 0, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'start',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: m.color, flexShrink: 0 }}/>
                    <span style={{ fontWeight: active ? 700 : 500, flex: 1 }}>{isAr ? m.labelAr : m.label}</span>
                    {active && <i className="ph ph-check" style={{ fontSize: 12, color: m.color }}/>}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1 }}/>

          {/* Bottom controls */}
          <div style={{ padding: '0 8px 14px', display: 'flex', gap: 8 }}>
            <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} style={toggleStyle} title="Toggle language">
              <span style={{ fontSize: 13 }}>
                {lang === 'en' ? 'ع' : 'EN'}
              </span>
            </button>
            <button onClick={() => setIsDark(v => !v)} style={toggleStyle} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              <i className={`ph ph-${isDark ? 'sun' : 'moon'}`} style={{ fontSize: 15 }}/>
              <span style={{ fontSize: 11 }}>{isDark ? t.light : t.dark}</span>
            </button>
          </div>
          <div style={{ fontSize: 11, color: TK.sidebarMuted, padding: '0 8px' }}>{t.egxCorpActions}</div>
        </aside>

        {/* ─── Main ─────────────────────────────────────────── */}
        <main style={{ flex: 1, padding: '32px 32px 40px', minWidth: 0, overflowY: 'auto' }}>
          {activeNav === 'news' ? (
            <NewsSection TK={TK} />
          ) : activeNav === 'watchlist' ? <WatchlistPanel all={all} navigate={navigate} readOnly={readOnly}/> : <>
          <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', color: TK.fg }}>{t.marketOverview}</h1>
            </div>
            {!readOnly && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ padding: '9px 14px', borderRadius: 10, border: `1px solid ${TK.btnBorder}`, background: TK.btnBg, color: TK.fg, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <i className="ph ph-download-simple"/> {t.export}
                </button>
                <button onClick={() => navigate('/admin/actions')} style={{ padding: '9px 16px', borderRadius: 10, border: 0, background: '#FFFF00', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <i className="ph ph-plus"/> {t.addAction}
                </button>
              </div>
            )}
          </header>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
            {[
              { label: t.ongoing, value: ongoing, icon: 'spinner', tone: 'orange', filter: 'ongoing' },
              { label: t.upcoming, value: upcoming.length, icon: 'clock', tone: 'yellow', filter: 'upcoming' },
              { label: t.completed, value: completed, icon: 'check-circle', tone: 'green', filter: 'completed' },
            ].map(s => {
              const active = activeFilter === s.filter;
              const c = { default: TK.fg, yellow: '#FFFF00', green: '#3DB200', red: '#FF4136', orange: '#FFA000' }[s.tone] || TK.fg;
              return (
                <button key={s.filter} onClick={() => setActiveFilter(activeFilter === s.filter ? 'all' : s.filter)} style={{
                  background: TK.card, borderRadius: 16, padding: '18px 20px', textAlign: 'start',
                  border: `1px solid ${active ? c : TK.cardBorder}`,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14,
                  transform: active ? 'translateY(-2px)' : 'none', transition: 'border 160ms, transform 160ms',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ color: TK.fg2, fontSize: 13, fontWeight: 600 }}>{s.label}</span>
                    <i className={`ph ph-${s.icon}`} style={{ fontSize: 22, color: c, opacity: 0.9 }}/>
                  </div>
                  <div style={{ fontSize: 42, fontWeight: 700, color: c, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{s.value}</div>
                </button>
              );
            })}
          </div>

          {/* Body: list + calendar sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
            {/* Action list */}
            <section style={{ background: TK.card, borderRadius: 18, padding: 22, border: `1px solid ${TK.cardBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: TK.fg, letterSpacing: '-0.01em' }}>{listTitle}</h2>
                  {listSub && <div style={{ color: TK.fg2, fontSize: 13, marginTop: 4 }}>{listSub}</div>}
                  {(typeFilter || activeFilter !== 'all' || searchQ.trim()) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      {activeFilter !== 'all' && <FChip label={isAr ? (STATUS_META[activeFilter as keyof typeof STATUS_META]?.labelAr ?? activeFilter) : `Status: ${activeFilter}`} onClear={() => setActiveFilter('all')}/>}
                      {typeFilter && <FChip label={isAr ? (ACTION_TYPES[typeFilter as keyof typeof ACTION_TYPES]?.labelAr ?? typeFilter) : `Type: ${ACTION_TYPES[typeFilter as keyof typeof ACTION_TYPES]?.label}`} tone={ACTION_TYPES[typeFilter as keyof typeof ACTION_TYPES]?.color} onClear={() => setTypeFilter(null)}/>}
                      {searchQ.trim() && <FChip label={isAr ? `بحث: ${searchQ}` : `Search: ${searchQ}`} onClear={() => setSearchQ('')}/>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(hasFilter || showAll) && (
                    <button onClick={() => { clearAll(); setShowAll(false); }} style={{ padding: '7px 12px', borderRadius: 10, border: `1px solid ${TK.btnBorder}`, background: TK.btnBg, color: TK.fg2, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{isAr ? 'ازالة البحث' : 'Clear all'}</button>
                  )}
                  <button onClick={() => { setShowAll(s => !s); setSelectedDate(null); }} style={{
                    padding: '7px 14px', borderRadius: 10, border: `1px solid ${TK.btnBorder}`,
                    background: showAll ? hexToRgba('#FFFF00', 0.14) : TK.btnBg,
                    color: showAll ? '#FFFF00' : TK.fg, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    {showAll ? t.showUpcoming : t.viewAll}
                    <i className={`ph ph-arrow-${showAll ? 'left' : 'right'}`} style={{ fontSize: 11 }}/>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {listToShow.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', textAlign: 'center', borderRadius: 14, background: TK.rowBg, border: `1px dashed ${TK.cardBorder}` }}>
                    <i className="ph ph-calendar-blank" style={{ fontSize: 36, color: TK.fg3, marginBottom: 12 }}/>
                    <div style={{ fontWeight: 700, color: TK.fg, marginBottom: 4 }}>{t.nothingHere}</div>
                    <div style={{ fontSize: 13, color: TK.fg2 }}>{t.tryDifferent}</div>
                  </div>
                ) : listToShow.map(a => (
                  <ActionRow key={a.id} action={a} expanded={expandedId === a.id} onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)} readOnly={readOnly}/>
                ))}
              </div>
            </section>

            {/* Right sidebar */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <CalendarCard actions={all} selectedDate={selectedDate} onSelectDate={d => setSelectedDate(prev => isSameDay(prev, d) ? null : d)}/>
            </aside>
          </div>
          </>}
        </main>
      </div>
    </AdminTkCtx.Provider>
  );
}

/* ─── ActionRow ─────────────────────────────────────────────── */
function ActionRow({ action, expanded, onToggle, readOnly = false }: { action: CorporateActionWithStatus; expanded: boolean; onToggle: () => void; readOnly?: boolean }) {
  const TK = useAdminTk();
  const { lang, t } = useT();
  const isAr = lang === 'ar';
  const { inWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const allPdfs = (action.pdfUrls ?? []).map((url, i) => ({ name: `Document ${i + 1}`, url }));
  const [viewingPdfIdx, setViewingPdfIdx] = useState(-1);
  const isFav = inWatchlist(action.symbol);

  const rendered = actionRenderer(action, lang);
  const meta = ACTION_TYPES[action.type];
  const company = COMPANIES[action.symbol];
  const cardDateStr = action.type === 'cash_dividend' ? (action.recordDate ?? action.exDate) : action.exDate;
  const cardDate = new Date(cardDateStr);
  const monthLabel = (isAr
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'])[cardDate.getMonth()];
  const days = daysFromToday(cardDateStr);

  return (
    <div style={{ borderRadius: 14, background: expanded ? (TK === TK_LIGHT ? '#E8E8EA' : '#1A1A1A') : TK.rowBg, border: `1px solid ${expanded ? 'rgba(243,243,3,0.24)' : TK.rowBorder}`, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 18px', width: '100%', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'start' }}>
        <div style={{ minWidth: 50, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: TK.fg3, fontWeight: 700, letterSpacing: '0.12em' }}>{monthLabel}</div>
          <div style={{ fontSize: 22, color: TK.fg, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{cardDate.getDate()}</div>
          <div style={{ fontSize: 10, color: TK.fg3, fontWeight: 600, letterSpacing: '0.04em', marginTop: 1 }}>{cardDate.getFullYear()}</div>
        </div>
        <div style={{ width: 3, height: 40, borderRadius: 4, background: meta.color, flexShrink: 0 }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <TickerTile symbol={action.symbol} size={40} radius={10}/>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: TK.fg, letterSpacing: '-0.01em' }}>{action.symbol}</span>
              <TypeBadge type={action.type} size="xs"/>
            </div>
            <div style={{ fontSize: 13, color: TK.fg2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isAr ? (company?.nameAr || company?.name) : company?.name}</div>
          </div>
        </div>
        <div style={{ minWidth: 140, textAlign: 'end' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: TK.fg, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
            {rendered.summary.primary} <span style={{ fontSize: 11, fontWeight: 500, color: TK.fg2 }}>{rendered.summary.secondary}</span>
          </div>
          {rendered.summary.detail && <div style={{ fontSize: 11, color: TK.fg2, marginTop: 2 }}>{rendered.summary.detail}</div>}
        </div>
        <div style={{ minWidth: 80, textAlign: 'end' }}>
          <StatusPill status={action.status} size="sm"/>
          <div style={{ fontSize: 11, color: TK.fg2, marginTop: 6, fontWeight: 500 }}>
            {days === 0 ? t.today_ : days > 0
              ? isAr ? `خلال ${days} ${days === 1 ? 'يوم' : 'أيام'}` : `in ${days}d`
              : isAr ? `منذ ${-days} ${-days === 1 ? 'يوم' : 'أيام'}` : `${-days}d ago`}
          </div>
        </div>
        {allPdfs.length > 0 && <i className="ph-fill ph-paperclip" style={{ fontSize: 14, color: '#FFFF00', opacity: 0.7 }}/>}
        <div role="button" onClick={e => { e.stopPropagation(); isFav ? removeFromWatchlist(action.symbol) : addToWatchlist(action.symbol); }}
          style={{ padding: '4px 6px', borderRadius: 8, cursor: 'pointer', color: isFav ? '#FF4136' : TK.fg3, lineHeight: 1, transition: 'color 150ms' }}>
          <i className={`ph${isFav ? '-fill' : ''} ph-heart`} style={{ fontSize: 18 }}/>
        </div>
        <i className={`ph ph-caret-${expanded ? 'up' : 'down'}`} style={{ fontSize: 14, color: TK.fg3 }}/>
      </button>

      {expanded && (
        <div style={{ padding: '4px 22px 22px', borderTop: `1px solid ${TK.divider}`, marginTop: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) 1.4fr', gap: 22, paddingTop: 18 }}>
            <div>
              <SectionLabel>Key dates</SectionLabel>
              <Timeline dates={rendered.keyDates}/>
              {rendered.sections?.map((sec, si) => (
                <div key={si} style={{ marginTop: 18 }}>
                  <SectionLabel>{sec.label}</SectionLabel>
                  {sec.keyDates && sec.keyDates.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <Timeline dates={sec.keyDates}/>
                    </div>
                  )}
                  {sec.terms && sec.terms.length > 0 && (
                    <div style={{ marginTop: 8, background: TK.detailsBg, borderRadius: 12, padding: '4px 16px', border: `1px solid ${TK.divider}` }}>
                      {sec.terms.map((row, i) => (
                        <TermRow key={i} row={row} isLast={i === sec.terms!.length - 1}/>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div>
              <SectionLabel>{t.details}</SectionLabel>
              <div style={{ background: TK.detailsBg, borderRadius: 12, padding: '4px 16px', border: `1px solid ${TK.divider}` }}>
                {rendered.terms.map((row, i) => (
                  <TermRow key={i} row={row} isLast={i === rendered.terms.length - 1}/>
                ))}
              </div>
              {rendered.disclaimer && (
                <div style={{ marginTop: 10, fontSize: 10, color: TK.fg3, lineHeight: 1.5, fontStyle: 'italic' }}>
                  {rendered.disclaimer}
                </div>
              )}
              {!readOnly && (action.type === 'rights_issue' || action.type === 'tender_offer') && action.status !== 'paid' && (
                <div style={{ marginTop: 16 }}>
                  <button style={{ padding: '10px 18px', borderRadius: 10, border: 0, background: '#FFFF00', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    {action.type === 'rights_issue' ? 'Subscribe via Thndr' : 'Accept tender offer'}
                  </button>
                </div>
              )}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${TK.divider}` }}>
                <div style={{ fontSize: 10, color: TK.fg3, fontWeight: 700, letterSpacing: '0.14em', marginBottom: 10, textTransform: 'uppercase' }}>{t.documents}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {allPdfs.map((pdf, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, background: TK.pdfBg, border: `1px solid ${TK.pdfBorder}`, borderRadius: 10, padding: '10px 14px' }}>
                        <i className="ph-fill ph-file-pdf" style={{ fontSize: 18, color: '#FF4444', flexShrink: 0 }}/>
                        <span style={{ fontSize: 13, color: TK.fg, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdf.name}</span>
                      </div>
                      <BtnSecondary onClick={() => setViewingPdfIdx(i)}><i className="ph ph-eye" style={{ fontSize: 14 }}/> {t.view}</BtnSecondary>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {viewingPdfIdx >= 0 && allPdfs[viewingPdfIdx] && <PdfViewerModal name={allPdfs[viewingPdfIdx].name} url={allPdfs[viewingPdfIdx].url} onClose={() => setViewingPdfIdx(-1)}/>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const TK = useAdminTk();
  return <div style={{ fontSize: 10, color: TK.fg3, fontWeight: 700, letterSpacing: '0.14em', marginBottom: 12, textTransform: 'uppercase' }}>{children}</div>;
}

function BtnSecondary({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const TK = useAdminTk();
  return (
    <button onClick={onClick} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${TK.btnBorder}`, background: TK.btnBg, color: TK.fg, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {children}
    </button>
  );
}

function Timeline({ dates }: { dates: ReturnType<typeof actionRenderer>['keyDates'] }) {
  const TK = useAdminTk();
  const { lang, t } = useT();
  const isAr = lang === 'ar';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {dates.map((d, i) => {
        if (d.value && !d.date) {
          return (
            <div key={d.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < dates.length - 1 ? 12 : 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: TK.fg }}>{d.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: TK.fg2, fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
            </div>
          );
        }
        const days = d.date ? daysFromToday(d.date) : null;
        const isPast = days != null && days < 0;
        const isToday = days === 0;
        const isFuture = days != null && days > 0;
        const isEmph = d.emphasis;
        const isYellow = isPast || isToday || isEmph;
        return (
          <div key={d.key} style={{ display: 'flex', gap: 12, paddingBottom: i < dates.length - 1 ? 12 : 0, position: 'relative' }}>
            {i < dates.length - 1 && <div style={{ position: 'absolute', left: 5, top: 14, bottom: 0, width: 2, background: isPast ? 'rgba(243,243,3,0.20)' : TK.divider }}/>}
            <div style={{ paddingTop: 4, flexShrink: 0 }}>
              <span style={{ display: 'block', width: 12, height: 12, borderRadius: 999, background: isYellow ? '#FFFF00' : TK.fg, border: isYellow ? '2px solid #FFFF00' : `2px solid ${TK.fg}`, boxShadow: isToday ? '0 0 0 3px rgba(243,243,3,0.25)' : isEmph ? '0 0 0 3px rgba(243,243,3,0.20)' : 'none' }}/>
            </div>
            <div style={{ flex: 1, paddingTop: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: isPast ? TK.fg3 : TK.fg, display: 'flex', alignItems: 'center' }}>
                  {d.label}<InfoDot defKey={d.key} dark/>
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: isPast ? TK.fg3 : TK.fg2, fontVariantNumeric: 'tabular-nums' }}>
                  {d.date ? fmtDate(d.date, { lang: isAr ? 'ar' : 'en' }) : '—'}
                </span>
              </div>
              {isFuture && <div style={{ fontSize: 11, color: isEmph ? TK.emphasisText : TK.fg3, marginTop: 2, fontWeight: isEmph ? 700 : 500 }}>{isAr ? `خلال ${days} ${days === 1 ? 'يوم' : 'أيام'}` : `in ${days} ${days === 1 ? 'day' : 'days'}`}</div>}
              {isToday && <div style={{ fontSize: 11, color: TK.emphasisText, marginTop: 2, fontWeight: 700 }}>{t.todayLabel}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TermRow({ row, isLast }: { row: ReturnType<typeof actionRenderer>['terms'][0]; isLast: boolean }) {
  const TK = useAdminTk();
  const accent = row.accent === 'positive' ? '#3DB200' : row.accent === 'negative' ? '#FF4136' : null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: isLast ? 'none' : `1px solid ${TK.divider}` }}>
      <span style={{ fontSize: 12, color: TK.fg2, fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}>
        {row.label}{row.defKey && <InfoDot defKey={row.defKey} dark/>}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: accent || TK.fg, textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>
        {row.value}
      </span>
    </div>
  );
}

function FChip({ label, tone, onClear }: { label: string; tone?: string; onClear: () => void }) {
  const TK = useAdminTk();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: tone ? hexToRgba(tone, 0.14) : TK.btnBg, color: tone || TK.fg, fontSize: 11, fontWeight: 700 }}>
      {label}
      <button onClick={onClear} style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}>
        <i className="ph ph-x" style={{ fontSize: 11 }}/>
      </button>
    </span>
  );
}

/* ─── WatchlistPanel ─────────────────────────────────────────── */
function WatchlistPanel({ all, navigate, readOnly = false }: { all: CorporateActionWithStatus[]; navigate: ReturnType<typeof useNavigate>; readOnly?: boolean }) {
  const TK = useAdminTk();
  const { t, lang } = useT();
  const isAr = lang === 'ar';
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState('');

  const activeBySymbol = useMemo(() => {
    const m: Record<string, number> = {};
    all.forEach(a => {
      if (a.status !== 'paid' && a.status !== 'cancelled') {
        m[a.symbol] = (m[a.symbol] || 0) + 1;
      }
    });
    return m;
  }, [all]);

  const notInWatchlist = Object.keys(COMPANIES).filter(s => !watchlist.includes(s));
  const searchQ = addSearch.trim().toUpperCase();
  const filteredAdd = addSearch.trim()
    ? notInWatchlist.filter(s => s.includes(searchQ) || (COMPANIES[s]?.name || '').toLowerCase().includes(addSearch.toLowerCase()))
    : notInWatchlist;

  return (
    <div>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', color: TK.fg }}>{t.watchlistNav}</h1>
          <div style={{ color: TK.fg2, fontSize: 14, marginTop: 6 }}>{t.stocksTracked(watchlist.length)}</div>
        </div>
        {!readOnly && (
          <button onClick={() => setAddOpen(true)} style={{ padding: '9px 16px', borderRadius: 10, border: 0, background: '#FFFF00', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <i className="ph ph-plus"/> {t.addStock}
          </button>
        )}
      </header>

      {watchlist.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: TK.fg2 }}>
          <i className="ph ph-bookmark-simple" style={{ fontSize: 48, color: TK.fg3, marginBottom: 16, display: 'block' }}/>
          <div style={{ fontWeight: 700, fontSize: 18, color: TK.fg, marginBottom: 8 }}>{t.noStocksYet}</div>
          <div style={{ fontSize: 14, marginBottom: 24 }}>{t.addStocksHint}</div>
          {!readOnly && <button onClick={() => setAddOpen(true)} style={{ padding: '10px 22px', borderRadius: 10, border: 0, background: '#FFFF00', color: '#000', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{t.addFirstStock}</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {watchlist.map(symbol => {
            const co = COMPANIES[symbol];
            if (!co) return null;
            const active = activeBySymbol[symbol] || 0;
            return (
              <div key={symbol} style={{ background: TK.card, borderRadius: 16, padding: 20, border: `1px solid ${TK.cardBorder}`, cursor: 'pointer', position: 'relative' }}
                onClick={() => navigate(`/app/stock/${symbol}`)}>
                {!readOnly && (
                  <button onClick={e => { e.stopPropagation(); removeFromWatchlist(symbol); }}
                    style={{ position: 'absolute', top: 14, insetInlineEnd: 14, width: 26, height: 26, borderRadius: 999, background: TK.btnBg, border: `1px solid ${TK.btnBorder}`, color: TK.fg3, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                    <i className="ph ph-x" style={{ fontSize: 12 }}/>
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: co.color, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                    {symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: TK.fg, letterSpacing: '-0.01em' }}>{symbol}</div>
                    <div style={{ fontSize: 12, color: TK.fg2, marginTop: 1 }}>{co.sector}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: TK.fg2, marginBottom: 12, lineHeight: 1.4 }}>{isAr ? (co.nameAr || co.name) : co.name}</div>
                {active > 0 ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(243,243,3,0.14)', border: '1px solid rgba(243,243,3,0.24)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: '#FFFF00' }}/>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFF00' }}>{t.activeActions(active)}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: TK.fg3, fontWeight: 600 }}>{t.noActiveActions}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && addOpen && (
        <div onClick={() => { setAddOpen(false); setAddSearch(''); }} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: TK.modalBg, borderRadius: 20, padding: 24, width: 460, maxHeight: '72vh', display: 'flex', flexDirection: 'column', border: `1px solid ${TK.modalBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: TK.fg, letterSpacing: '-0.01em' }}>{t.addStock}</h2>
              <button onClick={() => { setAddOpen(false); setAddSearch(''); }} style={{ background: TK.btnBg, border: `1px solid ${TK.btnBorder}`, color: TK.fg, cursor: 'pointer', width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center' }}>
                <i className="ph ph-x" style={{ fontSize: 14 }}/>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: TK.modalSearch, borderRadius: 12, padding: '10px 14px', marginBottom: 14, border: `1px solid ${TK.modalBorder}` }}>
              <i className="ph ph-magnifying-glass" style={{ fontSize: 16, color: TK.fg3 }}/>
              <input autoFocus value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder={t.searchPlaceholder}
                style={{ border: 0, background: 'transparent', outline: 'none', color: TK.fg, fontFamily: "'DM Sans', sans-serif", fontSize: 14, flex: 1, minWidth: 0 }}/>
              {addSearch && <button onClick={() => setAddSearch('')} style={{ background: 'transparent', border: 0, color: TK.fg3, cursor: 'pointer', padding: 0 }}><i className="ph ph-x-circle" style={{ fontSize: 16 }}/></button>}
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredAdd.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: TK.fg3, fontSize: 13 }}>{t.noStocksFound}</div>
              ) : filteredAdd.map(symbol => {
                const co = COMPANIES[symbol];
                return (
                  <button key={symbol} onClick={() => { addToWatchlist(symbol); setAddSearch(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: TK.modalItem, border: '1px solid transparent', cursor: 'pointer', textAlign: 'start' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: co.color, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                      {symbol.slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: TK.fg }}>{symbol}</div>
                      <div style={{ fontSize: 12, color: TK.fg2, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isAr ? (co.nameAr || co.name) : co.name}</div>
                    </div>
                    <i className="ph ph-plus" style={{ fontSize: 16, color: '#FFFF00' }}/>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Calendar ──────────────────────────────────────────────── */
function CalendarCard({ actions, selectedDate, onSelectDate }: { actions: CorporateActionWithStatus[]; selectedDate: string | null; onSelectDate: (d: string) => void }) {
  const TK = useAdminTk();
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
    actions.forEach(a => {
      [a.exDate, a.paymentDate].forEach(d => {
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
  }, [actions, year, month]);

  const todayDay = new Date('2026-05-17');
  const isToday = (d: number) => year === todayDay.getFullYear() && month === todayDay.getMonth() && d === todayDay.getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div style={{ background: TK.card, borderRadius: 18, padding: 18, border: `1px solid ${TK.cardBorder}` }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: TK.fg, letterSpacing: '-0.01em', marginBottom: 4 }}>{t.calendar}</h3>
      <div style={{ color: TK.fg2, fontSize: 12, marginBottom: 14 }}>{t.tapDate}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} style={{ border: 0, background: 'transparent', color: TK.fg2, cursor: 'pointer', padding: 4 }}><i className={`ph ph-caret-${isAr ? 'right' : 'left'}`} style={{ fontSize: 16 }}/></button>
        <div style={{ fontWeight: 700, color: TK.fg, fontSize: 14 }}>{isAr ? `${monthName} ${year}` : `${monthName} ${year}`}</div>
        <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} style={{ border: 0, background: 'transparent', color: TK.fg2, cursor: 'pointer', padding: 4 }}><i className={`ph ph-caret-${isAr ? 'left' : 'right'}`} style={{ fontSize: 16 }}/></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
        {t.dayAbbr.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 11, color: TK.fg2, fontWeight: 600 }}>{d}</div>)}
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
              background: selected ? '#FFFF00' : today_ ? 'rgba(243,243,3,0.12)' : 'transparent',
              color: selected ? '#000' : today_ ? '#FFFF00' : TK.fg,
              fontWeight: selected || today_ ? 700 : 500, fontSize: 13,
              cursor: 'pointer', position: 'relative', display: 'grid', placeItems: 'center',
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
  );
}
