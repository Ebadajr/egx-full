import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { COMPANIES, ACTION_TYPES, CorporateActionWithStatus, fmtDate, fmtMoney, daysFromToday } from '../data/designData';
import { useSheetActions } from '../data/sheetActionsContext';
import { useT } from '../lib/i18n';
import { actionRenderer, InfoDot, hexToRgba, PdfViewerModal } from '../lib/shared';
import { useWatchlist } from '../lib/watchlistStore';
import { usePdfs } from '../lib/pdfStore';
const MOCK_PRICES: Record<string, { price: number; change: number; changePct: number; tone: 'up' | 'down' | 'flat' }> = {
  ABUK: { price: 85.80, change: 0, changePct: 0, tone: 'flat' },
  HRHO: { price: 27.40, change: 0.58, changePct: 2.18, tone: 'up' },
  COMI: { price: 65.85, change: 2.18, changePct: 3.42, tone: 'up' },
  FWRY: { price: 9.40, change: -0.18, changePct: -1.92, tone: 'down' },
  TMGH: { price: 5.20, change: 0.08, changePct: 1.55, tone: 'up' },
  EAST: { price: 25.05, change: 0.55, changePct: 2.24, tone: 'up' },
  ORWE: { price: 12.40, change: -0.22, changePct: -1.74, tone: 'down' },
  HELI: { price: 9.20, change: 0.11, changePct: 1.21, tone: 'up' },
  MASR: { price: 2.70, change: 0.02, changePct: 0.74, tone: 'up' },
  EFIH: { price: 27.10, change: -0.30, changePct: -1.10, tone: 'down' },
  ETEL: { price: 26.05, change: 0.45, changePct: 1.76, tone: 'up' },
  MNHD: { price: 10.70, change: -0.05, changePct: -0.47, tone: 'down' },
  OCDI: { price: 13.40, change: 0, changePct: 0, tone: 'flat' },
  UTOP: { price: 32.30, change: 0.40, changePct: 1.25, tone: 'up' },
  CIEB: { price: 31.50, change: 0.18, changePct: 0.57, tone: 'up' },
  SWDY: { price: 40.10, change: 0.65, changePct: 1.64, tone: 'up' },
  AMOC: { price: 88.50, change: -1.20, changePct: -1.34, tone: 'down' },
  PHDC: { price: 4.95, change: 0, changePct: 0, tone: 'flat' },
  ASPI: { price: 0.21, change: 0.01, changePct: 5.00, tone: 'up' },
};

/* ─── Language toggle ────────────────────────────────────────── */
function LangToggle() {
  const { lang, setLang } = useT();
  return (
    <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} style={{
      padding: '6px 12px', borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.2)',
      background: 'rgba(255,255,255,0.08)', color: 'var(--mhero-fg)', fontWeight: 700,
      fontSize: 12, cursor: 'pointer', letterSpacing: '0.04em',
      fontFamily: lang === 'ar' ? "'DM Sans', sans-serif" : "'Cairo', sans-serif",
    }}>
      {lang === 'en' ? 'ع' : 'EN'}
    </button>
  );
}

export default function AppStockActions() {
  const { t, lang } = useT();
  const isAr = lang === 'ar';
  const fontFamily = "var(--font-sans)";
  const dir = isAr ? 'rtl' : 'ltr';

  const { inWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const symbol = (ticker || 'ABUK').toUpperCase();
  const company = COMPANIES[symbol] || COMPANIES['ABUK'];
  const { actions: sheetActions } = useSheetActions();
  const actions = useMemo(() =>
    sheetActions.filter(a => a.symbol === symbol)
      .sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime()),
  [sheetActions, symbol]);
  const dividends = actions.filter(a => a.type === 'cash_dividend');
  const p = MOCK_PRICES[symbol] || { price: 0, change: 0, changePct: 0, tone: 'flat' as const };

  const TABS = [
    { id: 'details',           label: t.tabDetails },
    { id: 'my_position',       label: t.tabMyPosition },
    { id: 'orders',            label: t.tabOrders },
    { id: 'dividends',         label: t.tabDividends },
    { id: 'corporate_actions', label: t.tabCorporateActions },
  ];

  const [tab, setTab] = useState('corporate_actions');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tabsRef.current) return;
    const active = tabsRef.current.querySelector('[data-active="true"]') as HTMLElement;
    if (active) {
      const r = active.getBoundingClientRect();
      const c = tabsRef.current.getBoundingClientRect();
      if (r.right > c.right || r.left < c.left) {
        tabsRef.current.scrollLeft += (r.left - c.left) - 12;
      }
    }
  }, [tab]);

  const activeActions = actions.filter(a => a.status !== 'paid' && a.status !== 'cancelled').length;
  const companyName = isAr ? (company.nameAr || company.name) : company.name;

  return (
    <div dir={dir} data-mtheme="dark" style={{ background: '#fff', color: '#111', minHeight: '100vh', position: 'relative', fontFamily }}>
      {/* Dark hero */}
      <div style={{ background: 'var(--mhero-bg)', color: 'var(--mhero-fg)', paddingTop: 56 }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', padding: '8px 16px 0' }}>
          <button onClick={() => (location.state as { fromFeed?: boolean })?.fromFeed ? navigate('/app/actions') : navigate(-1)} style={{ background: 'none', border: 0, color: 'var(--mhero-fg)', cursor: 'pointer', padding: 4, marginTop: 4 }}>
            <i className={`ph ph-caret-${isAr ? 'right' : 'left'}`} style={{ fontSize: 22 }}/>
          </button>
          <div style={{ flex: 1, minWidth: 0, marginInlineStart: 4 }}>
            <div style={{ fontSize: 12, color: 'var(--mfg2)', fontWeight: 600, letterSpacing: '0.02em' }}>{symbol}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--mhero-fg)', marginTop: 2, lineHeight: 1.2, letterSpacing: '-0.01em', maxWidth: 280 }}>{companyName}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 6 }}>
            <LangToggle />
            <button style={{ background: 'transparent', border: 0, color: 'var(--mhero-fg)', cursor: 'pointer', padding: 0 }}><i className="ph ph-bell" style={{ fontSize: 22 }}/></button>
            <button onClick={() => inWatchlist(symbol) ? removeFromWatchlist(symbol) : addToWatchlist(symbol)} style={{ background: 'transparent', border: 0, color: inWatchlist(symbol) ? '#111' : 'var(--mhero-fg)', cursor: 'pointer', padding: 0 }}>
              <i className={`ph${inWatchlist(symbol) ? '-fill' : ''} ph-bookmark-simple`} style={{ fontSize: 22 }}/>
            </button>
          </div>
        </div>

        {/* Price block */}
        <div style={{ display: 'flex', alignItems: 'flex-end', padding: '20px 20px 24px', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--mhero-fg)', fontWeight: 500 }}>{t.lastTradePrice}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 14, color: 'var(--mhero-fg)', fontWeight: 600 }}>{isAr ? 'ج.م' : 'EGP'}</span>
              <span style={{ fontSize: 36, fontWeight: 700, color: 'var(--mhero-fg)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1 }}>{p.price.toFixed(2)}</span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              {p.tone === 'up' && <i className="ph-fill ph-arrow-up-right" style={{ fontSize: 16, color: 'var(--mup)' }}/>}
              {p.tone === 'down' && <i className="ph-fill ph-arrow-down-right" style={{ fontSize: 16, color: '#FF4136' }}/>}
              {p.tone === 'flat' && <i className="ph ph-minus" style={{ fontSize: 16, color: 'var(--mfg2)' }}/>}
              <span style={{ fontSize: 15, fontWeight: 600, color: p.tone === 'up' ? 'var(--mup)' : p.tone === 'down' ? '#FF4136' : 'var(--mfg2)', fontVariantNumeric: 'tabular-nums' }}>
                {isAr
                  ? `${Math.abs(p.change).toFixed(2)} (${p.tone === 'down' ? '-' : p.tone === 'up' ? '+' : ''}${Math.abs(p.changePct).toFixed(2)}%) ج.م`
                  : `EGP ${Math.abs(p.change).toFixed(2)} (${p.tone === 'down' ? '-' : p.tone === 'up' ? '+' : ''}${Math.abs(p.changePct).toFixed(2)}%)`}
              </span>
            </div>
          </div>
          {/* Brand circle */}
          <div style={{ width: 76, height: 76, borderRadius: 999, background: company.color, display: 'grid', placeItems: 'center', flexShrink: 0, color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', boxShadow: '0 0 0 4px rgba(255,255,255,0.04)' }}>
            {symbol.slice(0, 2)}
          </div>
        </div>

        {/* Tab strip */}
        <div ref={tabsRef} style={{ display: 'flex', gap: 6, padding: '0 16px 18px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(td => (
            <button key={td.id} data-active={tab === td.id ? 'true' : 'false'} onClick={() => setTab(td.id)} style={{
              flexShrink: 0, padding: '10px 18px', borderRadius: 999,
              background: tab === td.id ? '#111' : 'transparent',
              color: tab === td.id ? '#fff' : 'var(--mfg2)',
              border: 0, fontWeight: 700, fontSize: 15, letterSpacing: '-0.005em', cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'inline-flex', alignItems: 'center',
            }}>
              {td.label}
              {td.id === 'corporate_actions' && activeActions > 0 && (
                <span style={{ background: tab === td.id ? 'rgba(255,255,255,0.18)' : '#111', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999, marginInlineStart: 6, lineHeight: 1.3 }}>
                  {activeActions}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Light content */}
      <div style={{ background: '#fff', minHeight: 360, padding: '24px 20px 140px' }}>
        {tab === 'corporate_actions' && (
          <CorporateActionsTab actions={actions} expandedId={expandedId} setExpandedId={setExpandedId} symbol={symbol} infoOpen={infoOpen} setInfoOpen={setInfoOpen}/>
        )}
        {tab === 'dividends' && (
          <DividendsTab dividends={dividends} symbol={symbol} expandedId={expandedId} setExpandedId={setExpandedId} infoOpen={infoOpen} setInfoOpen={setInfoOpen}/>
        )}
        {(tab === 'details' || tab === 'my_position' || tab === 'orders') && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--mfg2)', fontSize: 14 }}>
            <i className="ph ph-circle-dashed" style={{ fontSize: 32, color: '#D0D0D0', marginBottom: 10, display: 'block' }}/>
            <div style={{ fontWeight: 700, color: '#666', marginBottom: 4 }}>{TABS.find(td => td.id === tab)?.label}</div>
            <div style={{ fontSize: 12 }}>{t.placeholderFocus}</div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff', padding: '14px 20px 28px', display: 'flex', gap: 12, borderTop: '1px solid #F0F0F0', zIndex: 20 }}>
        <button style={{ flex: 1, padding: '16px 18px', borderRadius: 999, background: '#000', color: '#fff', border: 0, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{t.buy}</button>
        <button style={{ flex: 1, padding: '16px 18px', borderRadius: 999, background: '#fff', color: '#000', border: '1.5px solid #000', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{t.sell}</button>
      </div>

      {infoOpen && (
        <div onClick={() => setInfoOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 24px 32px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0E0E0', margin: '0 auto 16px' }}/>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px', color: '#111', letterSpacing: '-0.01em' }}>{t.whatAreCorporateActions}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: '#555', margin: '0 0 18px' }}>{t.corporateActionsExplain}</p>
            <button onClick={() => setInfoOpen(false)} style={{ width: '100%', padding: '14px 18px', borderRadius: 999, background: '#000', color: '#fff', border: 0, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>{t.gotIt}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tabs ─────────────────────────────────────────────────── */
function CorporateActionsTab({ actions, expandedId, setExpandedId, symbol, infoOpen: _info, setInfoOpen }: {
  actions: CorporateActionWithStatus[];
  expandedId: string | null; setExpandedId: (id: string | null) => void;
  symbol: string; infoOpen: boolean; setInfoOpen: (v: boolean) => void;
}) {
  const { t, lang } = useT();
  const isAr = lang === 'ar';
  const co = COMPANIES[symbol];
  const headingName = isAr ? (co?.nameAr || co?.name || symbol) : symbol;
  const [typeFilter, setTypeFilter] = useState('all');
  const types = Array.from(new Set(actions.map(a => a.type)));
  const filtered = typeFilter === 'all' ? actions : actions.filter(a => a.type === typeFilter);
  const grouped = groupByMonth(filtered, 'exDate', t.months);

  return (
    <>
      <SectionHeading title={t.corporateActionsOf(headingName)} onInfoClick={() => setInfoOpen(true)}/>
      {types.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 0 6px', margin: '6px -20px 6px', paddingInline: 20 }}>
          <FilterChip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>{t.allFilter}</FilterChip>
          {types.map(type => {
            const m = ACTION_TYPES[type];
            return <FilterChip key={type} active={typeFilter === type} tone={m.color} onClick={() => setTypeFilter(type)}>{lang === 'ar' ? m.labelAr : m.label}</FilterChip>;
          })}
        </div>
      )}
      {Object.entries(grouped).map(([key, group]) => (
        <div key={key} style={{ marginBottom: 8 }}>
          <MonthLabel>{group.label}</MonthLabel>
          {group.items.map(a => (
            <CorpActionCard key={a.id} action={a} expanded={expandedId === a.id} onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}/>
          ))}
        </div>
      ))}
      {filtered.length === 0 && <EmptyState label={t.noActionsYet}/>}
    </>
  );
}

function DividendsTab({ dividends, symbol, expandedId, setExpandedId, infoOpen: _info, setInfoOpen }: {
  dividends: CorporateActionWithStatus[];
  symbol: string; expandedId: string | null; setExpandedId: (id: string | null) => void;
  infoOpen: boolean; setInfoOpen: (v: boolean) => void;
}) {
  const { t, lang } = useT();
  const isAr = lang === 'ar';
  const co = COMPANIES[symbol];
  const headingName = isAr ? (co?.nameAr || co?.name || symbol) : symbol;
  const grouped = groupByMonth(dividends, 'exDate', t.months);
  return (
    <>
      <SectionHeading title={t.dividendsOf(headingName)} onInfoClick={() => setInfoOpen(true)}/>
      {Object.entries(grouped).map(([key, group]) => (
        <div key={key} style={{ marginBottom: 8 }}>
          <MonthLabel>{group.label}</MonthLabel>
          {group.items.map(a => (
            <SimpleDividendCard key={a.id} action={a} expanded={expandedId === a.id} onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}/>
          ))}
        </div>
      ))}
      {dividends.length === 0 && <EmptyState label={t.noDividendsYet}/>}
    </>
  );
}

/* ─── Cards ────────────────────────────────────────────────── */
function SimpleDividendCard({ action, expanded, onToggle }: { action: CorporateActionWithStatus; expanded: boolean; onToggle: () => void }) {
  const { lang, t } = useT();
  const isAr = lang === 'ar';
  const r = actionRenderer(action, lang);
  const { pdfs } = usePdfs();
  const sheetPdfs = (action.pdfUrls ?? []).map((url, i) => ({ name: `Document ${i + 1}`, url }));
  const pdfList = pdfs[action.id] ?? [];
  const allPdfs = [...sheetPdfs, ...pdfList];
  const [viewingPdfIdx, setViewingPdfIdx] = useState(-1);
  const isOngoing = action.status === 'upcoming' || action.status === 'announced' || action.status === 'ex_date';
  return (
    <div style={{ background: '#F5F5F5', borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'start' }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: '#111', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.005em' }}>
          {(() => {
            const amt = Number(action.details.amountPerShare);
            const decimalsNeeded = amt % 1 === 0 ? 0 : String(amt).replace(/^[^.]*\.?/, '').replace(/0+$/, '').length;
            const dec = Math.max(2, Math.min(decimalsNeeded, 4));
            const fmt = amt.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
            const cur = action.details.currency || 'EGP';
            return lang === 'ar'
              ? `${fmt} ${cur === 'USD' ? 'USD' : 'جنيه'} للسهم`
              : `${cur} ${fmt} / Share`;
          })()}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {allPdfs.length > 0 && <i className="ph-fill ph-paperclip" style={{ fontSize: 13, color: '#666' }}/>}
          <StatusBadgeLight ongoing={isOngoing}/>
          <i className={`ph ph-caret-${expanded ? 'up' : 'down'}`} style={{ fontSize: 16, color: '#999' }}/>
        </span>
      </button>
      {expanded && (
        <>
          <ExpandedBody rendered={r} completed={action.status === 'paid'}/>
          {allPdfs.length > 0 && allPdfs.map((pdf, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setViewingPdfIdx(i); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 20px', background: 'rgba(255,68,68,0.06)', border: 0, borderTop: '1px solid #E8E8E8', cursor: 'pointer', color: '#111' }}>
              <i className="ph-fill ph-file-pdf" style={{ fontSize: 18, color: '#FF4444', flexShrink: 0 }}/>
              <span style={{ flex: 1, textAlign: 'start', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdf.name}</span>
              <i className={`ph ph-arrow-${isAr ? 'left' : 'right'}`} style={{ fontSize: 14, color: '#999' }}/>
            </button>
          ))}
        </>
      )}
      {viewingPdfIdx >= 0 && allPdfs[viewingPdfIdx] && <PdfViewerModal name={allPdfs[viewingPdfIdx].name} url={allPdfs[viewingPdfIdx].url} onClose={() => setViewingPdfIdx(-1)}/>}
    </div>
  );
}

function CorpActionCard({ action, expanded, onToggle }: { action: CorporateActionWithStatus; expanded: boolean; onToggle: () => void }) {
  const { lang } = useT();
  const r = actionRenderer(action, lang);
  const meta = ACTION_TYPES[action.type];
  const { pdfs } = usePdfs();
  const sheetPdfs = (action.pdfUrls ?? []).map((url, i) => ({ name: `Document ${i + 1}`, url }));
  const pdfList = pdfs[action.id] ?? [];
  const allPdfs = [...sheetPdfs, ...pdfList];
  const [viewingPdfIdx, setViewingPdfIdx] = useState(-1);
  const isOngoing = action.status === 'upcoming' || action.status === 'announced' || action.status === 'ex_date';
  const typeLabel = lang === 'ar' ? meta.labelAr : meta.label;
  return (
    <div style={{ background: '#F5F5F5', borderRadius: 14, marginBottom: 10, overflow: 'hidden', borderInlineStart: `4px solid ${meta.color}` }}>
      <button onClick={onToggle} style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{typeLabel}</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#111', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.005em' }}>
            {r.summary.primary}{r.summary.secondary ? ` ${r.summary.secondary}` : ''}
          </div>
          {r.summary.detail && <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>{r.summary.detail}</div>}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {allPdfs.length > 0 && <i className="ph-fill ph-paperclip" style={{ fontSize: 13, color: '#666' }}/>}
          <StatusBadgeLight ongoing={isOngoing}/>
          <i className={`ph ph-caret-${expanded ? 'up' : 'down'}`} style={{ fontSize: 16, color: '#999' }}/>
        </span>
      </button>
      {expanded && (
        <>
          <ExpandedBody rendered={r} completed={action.status === 'paid'}/>
          {allPdfs.length > 0 && allPdfs.map((pdf, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setViewingPdfIdx(i); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 20px', background: 'rgba(255,68,68,0.06)', border: 0, borderTop: '1px solid #E8E8E8', cursor: 'pointer', color: '#111' }}>
              <i className="ph-fill ph-file-pdf" style={{ fontSize: 18, color: '#FF4444', flexShrink: 0 }}/>
              <span style={{ flex: 1, textAlign: 'start', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdf.name}</span>
              <i className={`ph ph-arrow-${lang === 'ar' ? 'left' : 'right'}`} style={{ fontSize: 14, color: '#999' }}/>
            </button>
          ))}
        </>
      )}
      {viewingPdfIdx >= 0 && allPdfs[viewingPdfIdx] && <PdfViewerModal name={allPdfs[viewingPdfIdx].name} url={allPdfs[viewingPdfIdx].url} onClose={() => setViewingPdfIdx(-1)}/>}
    </div>
  );
}

function ExpandedBody({ rendered, completed }: { rendered: ReturnType<typeof actionRenderer>; completed?: boolean }) {
  const { t } = useT();
  return (
    <div style={{ padding: '0 20px 18px' }}>
      <div style={{ marginTop: 4 }}>
        <SectionLabel>{t.keyDatesLabel}</SectionLabel>
        <LightTimeline dates={rendered.keyDates} completed={completed}/>
        {rendered.sections?.map((sec, si) => (
          <div key={si} style={{ marginTop: 18 }}>
            <SectionLabel>{sec.label}</SectionLabel>
            {sec.keyDates && sec.keyDates.length > 0 && <LightTimeline dates={sec.keyDates} completed={completed}/>}
            {sec.terms && sec.terms.length > 0 && (
              <div style={{ marginTop: 10, background: '#fff', borderRadius: 12, padding: '4px 14px', border: '1px solid #EFEFEF' }}>
                {sec.terms.map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, padding: '10px 0', borderBottom: i === sec.terms!.length - 1 ? 'none' : '1px solid #F0F0F0' }}>
                    <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#222', textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18 }}>
        <SectionLabel>{t.detailsLabel}</SectionLabel>
        <div style={{ background: '#fff', borderRadius: 12, padding: '4px 14px', border: '1px solid #EFEFEF' }}>
          {rendered.terms.map((row, i) => {
            const accent = row.accent === 'positive' ? '#1B7A00' : row.accent === 'negative' ? '#C42821' : null;
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, padding: '10px 0', borderBottom: i === rendered.terms.length - 1 ? 'none' : '1px solid #F0F0F0' }}>
                <span style={{ fontSize: 12, color: '#666', fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}>
                  {row.label}{row.defKey && <InfoDot defKey={row.defKey} dark={false}/>}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: accent || '#222', textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>
                  {row.value}
                </span>
              </div>
            );
          })}
        </div>
        {rendered.disclaimer && (
          <div style={{ marginTop: 10, fontSize: 10, color: '#999', lineHeight: 1.5, fontStyle: 'italic' }}>
            {rendered.disclaimer}
          </div>
        )}
      </div>
    </div>
  );
}

function LightTimeline({ dates, completed }: { dates: ReturnType<typeof actionRenderer>['keyDates']; completed?: boolean }) {
  const { t, lang } = useT();
  const isAr = lang === 'ar';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
      {dates.map((d, i) => {
        if (d.value && !d.date) {
          return (
            <div key={d.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < dates.length - 1 ? 14 : 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{d.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#555', fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
            </div>
          );
        }
        const days = d.date ? daysFromToday(d.date) : null;
        const isPast = days != null && days < 0;
        const isToday = days === 0;
        const isFuture = days != null && days > 0;
        const isYellow  = isPast || isToday || d.emphasis;
        const dotFilled = isYellow || completed;
        const dotColor  = isYellow ? '#FFFF00' : '#111';
        const dotBorder = isYellow ? '#FFFF00' : '#111';
        const dotShadow = isToday ? '0 0 0 4px rgba(243,243,3,0.25)' : d.emphasis ? '0 0 0 3px rgba(243,243,3,0.30)' : 'none';
        const lineColor = isPast ? 'rgba(243,243,3,0.25)' : '#EFEFEF';
        return (
          <div key={d.key} style={{ display: 'flex', gap: 12, paddingBottom: i < dates.length - 1 ? 14 : 0, position: 'relative' }}>
            {i < dates.length - 1 && <div style={{ position: 'absolute', insetInlineStart: 5, top: 14, bottom: 0, width: 2, background: lineColor }}/>}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 999, background: dotFilled ? dotColor : '#fff', border: `2px solid ${dotBorder}`, boxShadow: dotShadow }}/>
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: isPast ? '#999' : '#111', display: 'flex', alignItems: 'center' }}>
                  {d.label}<InfoDot defKey={d.key} dark={false}/>
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: isPast ? '#999' : '#555', fontVariantNumeric: 'tabular-nums' }}>
                  {d.date ? fmtDate(d.date, { long: true }) : '—'}
                </span>
              </div>
              {isFuture && !completed && <div style={{ fontSize: 11, color: d.emphasis ? '#8A7A00' : '#999', marginTop: 2, fontWeight: d.emphasis ? 700 : 500 }}>{isAr ? (days === 2 ? 'خلال يومين' : `خلال ${days} ${days >= 3 && days <= 10 ? 'أيام' : 'يوم'}`) : days === 1 ? `1 ${t.inDay}` : `${days} ${t.inDays_}`}</div>}
              {isToday && <div style={{ fontSize: 11, color: '#8A7A00', marginTop: 2, fontWeight: 700 }}>{t.todayLabel}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── atoms ────────────────────────────────────────────────── */
function StatusBadgeLight({ ongoing }: { ongoing: boolean }) {
  const { t } = useT();
  return (
    <span style={{ padding: '5px 14px', borderRadius: 999, background: ongoing ? '#FFFBD6' : '#EFEFEF', color: ongoing ? '#8A7A00' : '#555', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {ongoing ? t.ongoing : t.pastStatus}
    </span>
  );
}

function FilterChip({ active, tone, onClick, children }: { active: boolean; tone?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, padding: '6px 12px', borderRadius: 999,
      background: active ? (tone ? hexToRgba(tone, 0.18) : '#111') : '#F5F5F5',
      color: active ? (tone || '#fff') : '#666',
      border: active && tone ? `1px solid ${tone}` : '1px solid transparent',
      fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>{children}</button>
  );
}

function SectionHeading({ title, onInfoClick }: { title: string; onInfoClick: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111', letterSpacing: '-0.02em', fontFamily: 'inherit' }}>{title}</h2>
      <button onClick={onInfoClick} style={{ width: 28, height: 28, borderRadius: 999, background: '#fff', border: '1.5px solid #111', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 4 }}>
        <i className="ph ph-info" style={{ fontSize: 14, color: '#111' }}/>
      </button>
    </div>
  );
}

function MonthLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 17, fontWeight: 500, color: '#999', padding: '14px 4px 12px', letterSpacing: '-0.01em' }}>{children}</div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: '#999', fontWeight: 700, letterSpacing: '0.14em', marginBottom: 12, marginTop: 4 }}>{children}</div>;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999' }}>
      <i className="ph ph-calendar-blank" style={{ fontSize: 36, color: '#D0D0D0', marginBottom: 10, display: 'block' }}/>
      <div style={{ fontWeight: 700, color: '#666' }}>{label}</div>
    </div>
  );
}

function groupByMonth(items: CorporateActionWithStatus[], dateKey: 'exDate' | 'announceDate', months: string[]) {
  const sorted = [...items].sort((a, b) => new Date(b[dateKey] || '').getTime() - new Date(a[dateKey] || '').getTime());
  const g: Record<string, { label: string; items: typeof items }> = {};
  sorted.forEach(a => {
    const d = new Date(a[dateKey] || a.exDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = months[d.getMonth()] + ' ' + d.getFullYear();
    if (!g[key]) g[key] = { label, items: [] };
    g[key].items.push(a);
  });
  return g;
}

void fmtMoney;
