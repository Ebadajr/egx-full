import { useState, useMemo, useEffect } from 'react';
import { COMPANIES, ACTION_TYPES, STATUS_META, fmtDate, daysFromToday, CorporateActionWithStatus, CorporateAction, ActionType, ActionStatus } from '../data/designData';
import { useSheetActions } from '../data/sheetActionsContext';
import { useT } from '../lib/i18n';
import { StatusPill, TypeBadge, TickerTile, actionRenderer, hexToRgba, PdfViewerModal } from '../lib/shared';

import { useNavigate } from 'react-router-dom';

const TK = {
  body: '#000', fg: '#fff', fg2: '#9A9A9A', fg3: '#767676',
  card: '#0E0E0E', cardBorder: 'rgba(255,255,255,0.06)',
  rowBg: '#111', rowBorder: 'rgba(255,255,255,0.06)',
  divider: 'rgba(255,255,255,0.06)',
  btnBg: 'rgba(255,255,255,0.04)', btnBorder: 'rgba(255,255,255,0.08)',
};

export default function AdminActions() {
  const { t, lang } = useT();
  const isAr = lang === 'ar';
  const navigate = useNavigate();
  const { actions: sheetActions } = useSheetActions();
  const [items, setItems] = useState<CorporateActionWithStatus[]>([]);
  useEffect(() => { setItems(sheetActions); }, [sheetActions]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = items;
    if (typeFilter !== 'all') list = list.filter(a => a.type === typeFilter);
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => a.symbol.toLowerCase().includes(q) || (COMPANIES[a.symbol]?.name || '').toLowerCase().includes(q) || a.title.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime());
  }, [items, typeFilter, statusFilter, search]);

  const deleteAction = (id: string) => setItems(prev => prev.filter(a => a.id !== id));

  const exportCSV = () => {
    const rows = [
      ['ID','Symbol','Company','Type','Status','Title','Announce','Ex-Date','Record','Payment'],
      ...filtered.map(a => [
        a.id, a.symbol, COMPANIES[a.symbol]?.name || '', a.type, a.status, a.title,
        a.announceDate, a.exDate, a.recordDate || '', a.paymentDate || '',
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'corporate-actions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: TK.body, color: TK.fg, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Minimal sidebar */}
      <aside style={{ width: 64, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: 24, borderRight: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 8 }}>
          <img src="/thndr-logo-full.png" height="20" alt="Thndr" style={{ display: 'block' }}/>
        </button>
        <button onClick={() => navigate('/')} title="Overview" style={{ width: 40, height: 40, borderRadius: 10, border: 0, background: 'transparent', color: TK.fg2, cursor: 'pointer', fontSize: 20 }}>
          <i className="ph ph-squares-four"/>
        </button>
        <button title="All Actions" style={{ width: 40, height: 40, borderRadius: 10, border: 0, background: 'rgba(243,243,3,0.14)', color: '#FFFF00', cursor: 'pointer', fontSize: 20 }}>
          <i className="ph-fill ph-list-bullets"/>
        </button>
      </aside>

      <main style={{ flex: 1, padding: '32px 32px 40px', minWidth: 0, overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', color: TK.fg }}>{t.allActions}</h1>
            <div style={{ color: TK.fg2, fontSize: 14, marginTop: 4 }}>{t.ofActions(filtered.length, items.length)}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={exportCSV} style={{ padding: '9px 14px', borderRadius: 10, border: `1px solid ${TK.btnBorder}`, background: TK.btnBg, color: TK.fg, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <i className="ph ph-download-simple"/> {t.exportCsv}
            </button>
            <button onClick={() => setAddOpen(true)} style={{ padding: '9px 16px', borderRadius: 10, border: 0, background: '#FFFF00', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <i className="ph ph-plus"/> {t.addAction}
            </button>
          </div>
        </div>

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.06)', flex: '1 1 200px', minWidth: 180 }}>
            <i className="ph ph-magnifying-glass" style={{ fontSize: 16, color: TK.fg3 }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={isAr ? 'ابحث بالرمز، الشركة، العنوان…' : 'Search symbol, company, title…'}
              style={{ border: 0, background: 'transparent', outline: 'none', color: TK.fg, fontSize: 13, flex: 1, minWidth: 0 }}/>
            {search && <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 0, color: TK.fg3, cursor: 'pointer', padding: 0 }}><i className="ph ph-x" style={{ fontSize: 14 }}/></button>}
          </div>

          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: '#111', color: TK.fg, fontSize: 13, cursor: 'pointer', outline: 'none' }}>
            <option value="all" style={{ background: '#111', color: '#fff' }}>{t.allTypes}</option>
            {Object.entries(ACTION_TYPES).map(([k, m]) => <option key={k} value={k} style={{ background: '#111', color: '#fff' }}>{isAr ? m.labelAr : m.label}</option>)}
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: '#111', color: TK.fg, fontSize: 13, cursor: 'pointer', outline: 'none' }}>
            <option value="all" style={{ background: '#111', color: '#fff' }}>{t.allStatuses}</option>
            {(['ex_date','paid','announced','cancelled','ongoing'] as const).map(s => (
              <option key={s} value={s} style={{ background: '#111', color: '#fff' }}>{isAr ? STATUS_META[s].labelAr : STATUS_META[s].label}</option>
            ))}
          </select>

          {(typeFilter !== 'all' || statusFilter !== 'all' || search) && (
            <button onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setSearch(''); }} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: TK.fg2, fontSize: 13, cursor: 'pointer' }}>
              {t.clearFilters}
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ background: TK.card, borderRadius: 18, border: `1px solid ${TK.cardBorder}`, overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '50px 80px 1fr 140px 110px 100px 110px 50px', gap: 0, padding: '12px 18px', borderBottom: `1px solid ${TK.divider}` }}>
            {t.tableHeaders.map((h, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 700, color: TK.fg3, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: i >= 5 ? 'end' : 'start' }}>{h}</div>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: TK.fg2 }}>
              <i className="ph ph-funnel" style={{ fontSize: 32, color: TK.fg3, marginBottom: 12, display: 'block' }}/>
              <div style={{ fontWeight: 700 }}>{t.noActionsMatchFilters}</div>
            </div>
          ) : filtered.map((a, idx) => (
            <AdminTableRow key={a.id} action={a} idx={idx} expanded={expandedId === a.id} onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)} onDelete={() => deleteAction(a.id)}/>
          ))}
        </div>
      </main>

      {addOpen && <AddModal onClose={() => setAddOpen(false)} onAdd={action => { setItems(prev => [action, ...prev]); setAddOpen(false); }}/>}
    </div>
  );
}

/* ─── Admin Table Row ───────────────────────────────────────── */
function AdminTableRow({ action: a, idx, expanded: exp, onToggle, onDelete }: {
  action: CorporateActionWithStatus; idx: number; expanded: boolean; onToggle: () => void; onDelete: () => void;
}) {
  const { t, lang } = useT();
  const isAr = lang === 'ar';
  const allPdfs = (a.pdfUrls ?? []).map((url, i) => ({ name: `Document ${i + 1}`, url }));
  const [viewingPdfIdx, setViewingPdfIdx] = useState(-1);
  const meta = ACTION_TYPES[a.type] ?? { label: a.type, color: '#767676', short: '??' };
  const company = COMPANIES[a.symbol];
  const rendered = actionRenderer(a);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '50px 80px 1fr 140px 110px 100px 110px 50px', gap: 0, padding: '14px 18px', borderBottom: `1px solid ${TK.divider}`, background: exp ? '#1A1A1A' : 'transparent', cursor: 'pointer', transition: 'background 120ms' }}
        onClick={onToggle}>
        <div style={{ fontSize: 12, color: TK.fg3, fontVariantNumeric: 'tabular-nums', alignSelf: 'center' }}>{idx + 1}</div>
        <div style={{ alignSelf: 'center' }}>
          {(() => { const cd = new Date(a.type === 'cash_dividend' ? (a.recordDate ?? a.exDate) : a.exDate); return (<>
            <div style={{ fontSize: 10, color: TK.fg3, fontWeight: 700, letterSpacing: '0.1em' }}>
              {t.monthsShort[cd.getMonth()]}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: TK.fg, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{cd.getDate()}</div>
          </>); })()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, alignSelf: 'center' }}>
          <div style={{ width: 3, height: 32, borderRadius: 4, background: meta.color, flexShrink: 0 }}/>
          <TickerTile symbol={a.symbol} size={32} radius={8}/>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TK.fg }}>{a.symbol}</div>
            <div style={{ fontSize: 12, color: TK.fg2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company?.name}</div>
          </div>
        </div>
        <div style={{ alignSelf: 'center' }}><TypeBadge type={a.type} size="sm"/></div>
        <div style={{ alignSelf: 'center' }}><StatusPill status={a.status} size="sm"/></div>
        <div style={{ alignSelf: 'center', textAlign: 'end' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TK.fg }}>{rendered.summary.primary}</div>
          <div style={{ fontSize: 11, color: TK.fg2 }}>{rendered.summary.secondary}</div>
        </div>
        <div style={{ alignSelf: 'center', textAlign: 'end', fontSize: 12, color: TK.fg2 }}>
          {a.paymentDate ? fmtDate(a.paymentDate, { short: true }) : '—'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
          {allPdfs.length > 0 && <i className="ph-fill ph-paperclip" style={{ fontSize: 13, color: '#FFFF00', opacity: 0.8 }}/>}
          <button onClick={e => { e.stopPropagation(); onDelete(); }} title="Delete" style={{ background: 'transparent', border: 0, color: '#FF4136', cursor: 'pointer', opacity: 0.6, padding: 4, fontSize: 16 }}>
            <i className="ph ph-trash"/>
          </button>
        </div>
      </div>
      {exp && (
        <div style={{ padding: '16px 20px 20px', borderBottom: `1px solid ${TK.divider}`, background: '#0A0A0A' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: TK.fg3, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 12 }}>{t.keyDatesLabel}</div>
              {rendered.keyDates.map(d => (
                <div key={d.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: TK.fg2 }}>{d.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: TK.fg, fontVariantNumeric: 'tabular-nums' }}>{d.value && !d.date ? d.value : d.date ? fmtDate(d.date, { long: true }) : '—'}</span>
                </div>
              ))}
              {rendered.sections?.map((sec, si) => (
                <div key={si} style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, color: TK.fg3, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 10, textTransform: 'uppercase' }}>{sec.label}</div>
                  {sec.keyDates?.map(kd => (
                    <div key={kd.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: TK.fg2 }}>{kd.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: TK.fg, fontVariantNumeric: 'tabular-nums' }}>{kd.value && !kd.date ? kd.value : kd.date ? fmtDate(kd.date, { long: true }) : '—'}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, color: TK.fg3, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 12 }}>{t.detailsLabel}</div>
              {rendered.terms.slice(0, 5).map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: TK.fg2 }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: TK.fg }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          {rendered.disclaimer && (
            <div style={{ marginTop: 12, fontSize: 10, color: TK.fg3, lineHeight: 1.5, fontStyle: 'italic' }}>
              {rendered.disclaimer}
            </div>
          )}
          {/* PDF attachment */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${TK.divider}` }}>
            <div style={{ fontSize: 11, color: TK.fg3, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 10, textTransform: 'uppercase' }}>{t.documents}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allPdfs.map((pdf, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px' }}>
                    <i className="ph-fill ph-file-pdf" style={{ fontSize: 16, color: '#FF4444', flexShrink: 0 }}/>
                    <span style={{ fontSize: 13, color: TK.fg, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdf.name}</span>
                  </div>
                  <button onClick={() => setViewingPdfIdx(i)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${TK.btnBorder}`, background: TK.btnBg, color: TK.fg, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    <i className="ph ph-eye" style={{ fontSize: 14 }}/> {t.view}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {viewingPdfIdx >= 0 && allPdfs[viewingPdfIdx] && <PdfViewerModal name={allPdfs[viewingPdfIdx].name} url={allPdfs[viewingPdfIdx].url} onClose={() => setViewingPdfIdx(-1)}/>}
    </div>
  );
}

/* ─── Add Modal ─────────────────────────────────────────────── */
function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (a: CorporateActionWithStatus) => void }) {
  const { t } = useT();
  const [form, setForm] = useState({
    symbol: '', type: 'cash_dividend' as ActionType, title: '',
    announceDate: '', exDate: '',
    // cash dividend fields
    cdEligibilityDate: '', cdPayoutDate: '', cdAmountPerShare: '',
    hasInstallments: 'no',
    inst1Date: '', inst1Amount: '',
    inst2Date: '', inst2Amount: '',
    inst3Date: '', inst3Amount: '',
    // capital increase fields
    eligibilityDate: '', tradingStart: '', tradingEnd: '',
    subscriptionPrice: '', subscriptionStart: '',
    subscriptionEndThndr: '', subscriptionEndBank: '',
    ratio: '', currentCapital: '', newCapital: '', amountRaised: '',
    // stock dividend fields
    sdEligibilityDate: '', sdPayoutDate: '', sdRatio: '',
    // tender offer fields
    acquirer: '', acquiree: '', offerPrice: '', targetShares: '',
    tenderStart: '', tenderEnd: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#767676', letterSpacing: '0.06em', display: 'block', marginBottom: 6 };

  const submit = () => {
    const isCashDiv = form.type === 'cash_dividend';
    const isCapInc = form.type === 'capital_increase';
    const isTender = form.type === 'tender_offer';

    const installments = form.hasInstallments === 'yes'
      ? [
          form.inst1Date || form.inst1Amount ? { date: form.inst1Date, amount: parseFloat(form.inst1Amount) || 0 } : null,
          form.inst2Date || form.inst2Amount ? { date: form.inst2Date, amount: parseFloat(form.inst2Amount) || 0 } : null,
          form.inst3Date || form.inst3Amount ? { date: form.inst3Date, amount: parseFloat(form.inst3Amount) || 0 } : null,
        ].filter(Boolean)
      : [];

    const isStockDiv = form.type === 'bonus_shares';
    const details = isCashDiv ? {
      amountPerShare: form.cdAmountPerShare ? parseFloat(form.cdAmountPerShare) : undefined,
      currency: 'EGP',
      ...(installments.length > 0 ? { installments } : {}),
    } : isCapInc ? {
      eligibilityDate: form.eligibilityDate || undefined,
      tradingStart: form.tradingStart || undefined,
      tradingEnd: form.tradingEnd || undefined,
      subscriptionPrice: form.subscriptionPrice ? parseFloat(form.subscriptionPrice) : undefined,
      subscriptionStart: form.subscriptionStart || undefined,
      subscriptionEndThndr: form.subscriptionEndThndr || undefined,
      subscriptionEndBank: form.subscriptionEndBank || undefined,
      ratio: form.ratio || undefined,
      currentCapital: form.currentCapital || undefined,
      newCapital: form.newCapital || undefined,
      amountRaised: form.amountRaised || undefined,
    } : isStockDiv ? {
      ratio: form.sdRatio || undefined,
    } : isTender ? {
      acquirer: form.acquirer || undefined,
      acquiree: form.acquiree || undefined,
      offerPrice: form.offerPrice ? parseFloat(form.offerPrice) : undefined,
      targetShares: form.targetShares || undefined,
      tenderStart: form.tenderStart || undefined,
      tenderEnd: form.tenderEnd || undefined,
    } : {};

    const base: CorporateAction = {
      id: `custom-${Date.now()}`,
      symbol: form.symbol.toUpperCase(),
      type: form.type,
      title: form.title || `${ACTION_TYPES[form.type].label}${form.symbol ? ` — ${form.symbol.toUpperCase()}` : ''}`,
      announceDate: form.announceDate,
      exDate: form.exDate || new Date().toISOString().slice(0, 10),
      recordDate: isCashDiv ? (form.cdEligibilityDate || undefined) : isStockDiv ? (form.sdEligibilityDate || undefined) : undefined,
      paymentDate: isCashDiv ? (form.cdPayoutDate || undefined) : isStockDiv ? (form.sdPayoutDate || undefined) : undefined,
      details,
    };
    onAdd({ ...base, status: 'announced' as ActionStatus });
  };

  const baseFields = [
    { label: 'Ticker Symbol', key: 'symbol', placeholder: 'e.g. COMI', type: 'text' },
    { label: 'Title', key: 'title', placeholder: 'e.g. Annual Cash Dividend FY2025', type: 'text' },
    { label: 'Announce Date', key: 'announceDate', type: 'date' },
    { label: 'Ex-Date', key: 'exDate', type: 'date' },
  ];

  const tenderOfferFields = [
    { label: 'Acquirer', key: 'acquirer', placeholder: 'e.g. GFH Financial Group', type: 'text' },
    { label: 'Acquiree', key: 'acquiree', placeholder: 'e.g. HRHO', type: 'text' },
    { label: 'Price Per Share (EGP)', key: 'offerPrice', placeholder: '0.00', type: 'number' },
    { label: 'Target Shares Amount', key: 'targetShares', placeholder: 'e.g. 51% of outstanding shares', type: 'text' },
    { label: 'Start Date', key: 'tenderStart', type: 'date' },
    { label: 'End Date', key: 'tenderEnd', type: 'date' },
  ];

  const capitalIncreaseFields = [
    { label: 'Eligibility Date', key: 'eligibilityDate', type: 'date' },
    { label: 'Trading Start', key: 'tradingStart', type: 'date' },
    { label: 'Trading End', key: 'tradingEnd', type: 'date' },
    { label: 'Subscription Price (EGP)', key: 'subscriptionPrice', placeholder: '0.00', type: 'number' },
    { label: 'Subscription Start', key: 'subscriptionStart', type: 'date' },
    { label: 'Subscription End — Through Thndr', key: 'subscriptionEndThndr', type: 'date' },
    { label: 'Subscription End — Through Bank', key: 'subscriptionEndBank', type: 'date' },
    { label: 'Ratio', key: 'ratio', placeholder: 'e.g. 1:4', type: 'text' },
    { label: 'Current Capital (EGP)', key: 'currentCapital', placeholder: '0.00', type: 'text' },
    { label: 'Capital After Increase (EGP)', key: 'newCapital', placeholder: '0.00', type: 'text' },
    { label: 'Increase Amount (EGP)', key: 'amountRaised', placeholder: '0.00', type: 'text' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#111', borderRadius: 20, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{t.addAction}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, color: '#9A9A9A', cursor: 'pointer', fontSize: 20 }}><i className="ph ph-x"/></button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>TYPE</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {Object.entries(ACTION_TYPES).map(([k, m]) => <option key={k} value={k} style={{ background: '#111', color: '#fff' }}>{m.label}</option>)}
          </select>
        </div>

        {baseFields.map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{f.label.toUpperCase()}</label>
            <input
              value={(form as Record<string, string>)[f.key]} type={f.type}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              style={inputStyle}
            />
          </div>
        ))}

        {form.type === 'cash_dividend' && (
          <div style={{ margin: '20px 0 16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#767676', letterSpacing: '0.1em', marginBottom: 16 }}>CASH DIVIDEND DETAILS</div>
            {[
              { label: 'Eligibility Date', key: 'cdEligibilityDate', type: 'date' },
              { label: 'Payout Date', key: 'cdPayoutDate', type: 'date' },
              { label: 'Amount Per Share (EGP)', key: 'cdAmountPerShare', placeholder: '0.00', type: 'number' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{f.label.toUpperCase()}</label>
                <input value={(form as Record<string, string>)[f.key]} type={f.type} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} style={inputStyle}/>
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>INSTALLMENTS</label>
              <select value={form.hasInstallments} onChange={e => set('hasInstallments', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="no" style={{ background: '#111', color: '#fff' }}>No — single payout</option>
                <option value="yes" style={{ background: '#111', color: '#fff' }}>Yes — multiple installments</option>
              </select>
            </div>

            {form.hasInstallments === 'yes' && (
              <>
                {([1, 2, 3] as const).map(n => (
                  <div key={n} style={{ marginBottom: 16, padding: '14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#767676', letterSpacing: '0.08em', marginBottom: 10 }}>INSTALLMENT {n}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={labelStyle}>DATE</label>
                        <input value={(form as Record<string, string>)[`inst${n}Date`]} type="date" onChange={e => set(`inst${n}Date`, e.target.value)} style={inputStyle}/>
                      </div>
                      <div>
                        <label style={labelStyle}>AMOUNT (EGP)</label>
                        <input value={(form as Record<string, string>)[`inst${n}Amount`]} type="number" placeholder="0.00" onChange={e => set(`inst${n}Amount`, e.target.value)} style={inputStyle}/>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {form.type === 'bonus_shares' && (
          <div style={{ margin: '20px 0 16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#767676', letterSpacing: '0.1em', marginBottom: 16 }}>STOCK DIVIDEND DETAILS</div>
            {[
              { label: 'Eligibility Date', key: 'sdEligibilityDate', type: 'date' },
              { label: 'Payout Date', key: 'sdPayoutDate', type: 'date' },
              { label: 'Ratio Per Share', key: 'sdRatio', placeholder: 'e.g. 1:5', type: 'text' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{f.label.toUpperCase()}</label>
                <input value={(form as Record<string, string>)[f.key]} type={f.type} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} style={inputStyle}/>
              </div>
            ))}
          </div>
        )}

        {form.type === 'tender_offer' && (
          <div style={{ margin: '20px 0 16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#767676', letterSpacing: '0.1em', marginBottom: 16 }}>TENDER OFFER DETAILS</div>
            {tenderOfferFields.map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{f.label.toUpperCase()}</label>
                <input
                  value={(form as Record<string, string>)[f.key]} type={f.type}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        )}

        {form.type === 'capital_increase' && (
          <>
            <div style={{ margin: '20px 0 16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#767676', letterSpacing: '0.1em', marginBottom: 16 }}>CAPITAL INCREASE DETAILS</div>
              {capitalIncreaseFields.map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>{f.label.toUpperCase()}</label>
                  <input
                    value={(form as Record<string, string>)[f.key]} type={f.type}
                    onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9A9A9A', fontWeight: 700, cursor: 'pointer' }}>{t.cancel}</button>
          <button onClick={submit} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 0, background: '#FFFF00', color: '#000', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{t.addAction}</button>
        </div>
      </div>
    </div>
  );
}

// Suppress unused import warning
void daysFromToday; void hexToRgba;
