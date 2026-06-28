import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ACTION_TYPES, STATUS_META, DEFINITIONS, CorporateActionWithStatus,
  fmtDate, fmtMoney, fmtBigNumber, daysFromToday, COMPANIES,
} from '../data/designData';
export type { Lang, Translations } from './i18n';
import { useT } from './i18n';

/* ─── helpers ───────────────────────────────────────────────── */
export function hexToRgba(hex: string, a: number): string {
  if (hex.startsWith('rgb')) return hex;
  const v = hex.replace('#', '');
  const r = parseInt(v.substring(0, 2), 16);
  const g = parseInt(v.substring(2, 4), 16);
  const b = parseInt(v.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function isSameDay(a: string | Date | null | undefined, b: string | Date | null | undefined): boolean {
  if (!a || !b) return false;
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

/* ─── StatusPill ────────────────────────────────────────────── */
interface StatusPillProps { status: string; size?: 'sm' | 'md'; muted?: boolean; }
export function StatusPill({ status, size = 'sm', muted = false }: StatusPillProps) {
  const { lang } = useT();
  const meta = STATUS_META[status as keyof typeof STATUS_META] || STATUS_META.upcoming;
  const colors = {
    yellow: { bg: 'rgba(243,243,3,0.14)',   fg: '#FFFF00', bgLight: '#E8E8E8', fgLight: '#111' },
    blue:   { bg: 'rgba(77,166,255,0.14)', fg: '#4DA6FF', bgLight: '#E0F0FF', fgLight: '#1F5A99' },
    green:  { bg: 'rgba(61,178,0,0.14)',   fg: '#4EEF03', bgLight: '#DDF5D0', fgLight: '#2A7800' },
    grey:   { bg: 'rgba(255,255,255,0.06)', fg: '#9A9A9A', bgLight: '#EFEFEF', fgLight: '#6A6A6A' },
    red:    { bg: 'rgba(255,65,54,0.12)',   fg: '#FF4136', bgLight: '#FFE0DE', fgLight: '#B5251D' },
    orange: { bg: 'rgba(255,160,0,0.14)',   fg: '#FFA000', bgLight: '#FFF3D0', fgLight: '#8A5500' },
  };
  const c = colors[meta.tone as keyof typeof colors];
  const bg = muted ? c.bgLight : c.bg;
  const fg = muted ? c.fgLight : c.fg;
  const sz = size === 'md' ? { padding: '5px 12px', fontSize: 12 } : { padding: '3px 9px', fontSize: 11 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      borderRadius: 999, background: bg, color: fg,
      fontWeight: 600, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.005em',
      whiteSpace: 'nowrap', ...sz,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: fg }}/>
      {lang === 'ar' ? meta.labelAr : meta.label}
    </span>
  );
}

/* ─── TypeBadge ─────────────────────────────────────────────── */
interface TypeBadgeProps { type: string; size?: 'xs' | 'sm' | 'md'; }
export function TypeBadge({ type, size = 'sm' }: TypeBadgeProps) {
  const { lang } = useT();
  const meta = ACTION_TYPES[type as keyof typeof ACTION_TYPES] || ACTION_TYPES.cash_dividend;
  const sizes = {
    xs: { padding: '2px 7px', fontSize: 10 },
    sm: { padding: '3px 9px', fontSize: 11 },
    md: { padding: '5px 12px', fontSize: 12 },
  };
  const bg = hexToRgba(meta.color, 0.18);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      borderRadius: 6, background: bg, color: meta.color,
      fontWeight: 700, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.005em',
      ...sizes[size],
    }}>
      {lang === 'ar' ? meta.labelAr : meta.label}
    </span>
  );
}

/* ─── TickerTile ─────────────────────────────────────────────── */
interface TickerTileProps { symbol: string; size?: number; radius?: number; }
export function TickerTile({ symbol, size = 36, radius = 10 }: TickerTileProps) {
  const c = COMPANIES[symbol]?.color || '#2A2A2A';
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, background: c,
      display: 'grid', placeItems: 'center',
      fontFamily: "'DM Sans', sans-serif", fontWeight: 800,
      fontSize: size * 0.36, color: '#fff', flexShrink: 0, letterSpacing: '-0.02em',
    }}>
      {symbol.slice(0, 2)}
    </div>
  );
}

/* ─── InfoDot ────────────────────────────────────────────────── */
interface InfoDotProps { defKey: string; dark?: boolean; }
export function InfoDot({ defKey, dark = true }: InfoDotProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const { lang } = useT();
  const isAr = lang === 'ar';
  const def = DEFINITIONS[defKey];
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  if (!def) return null;
  const label = isAr ? def.labelAr : def.label;
  const text  = isAr ? def.textAr  : def.text;
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          width: 14, height: 14, borderRadius: 999, border: 0,
          background: dark ? 'rgba(255,255,255,0.08)' : '#E0E0E0',
          color: dark ? '#9A9A9A' : '#666', cursor: 'pointer',
          fontSize: 9, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
          display: 'grid', placeItems: 'center', lineHeight: 1, padding: 0, marginInlineStart: 4,
        }}
      >?</button>
      {open && (
        <div style={{
          position: 'absolute', zIndex: 100,
          bottom: 'calc(100% + 8px)', right: 0,
          width: 240,
          background: dark ? '#1F1F1F' : '#fff', color: dark ? '#fff' : '#111',
          borderRadius: 12, padding: 12,
          boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.16)',
          border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #EFEFEF',
          textAlign: 'start', direction: isAr ? 'rtl' : 'ltr',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 12, lineHeight: 1.45, color: dark ? '#BEBEBE' : '#555' }}>{text}</div>
        </div>
      )}
    </span>
  );
}

/* ─── Renderer label maps ────────────────────────────────────── */
const RL = {
  en: {
    lang_: 'en' as const,
    eligibilityDate: 'Eligibility date', payout: 'Payout', dividendPerShare: 'Dividend / share',
    payoutDate: 'Payout date', perShare: '/ share', egp: 'EGP',
    cashDisclaimer: 'Cash dividends are added within 2 working days from the payout date to your Thndr wallet.',
    payment: (n: number) => `Payment ${n}`, installment: (n: number) => `Installment ${n}`,
    installments: (n: number) => `/ share · ${n} installments`,
    announce: 'Announce', exDateLbl: 'Ex-date', record: 'Record', distribution: 'Distribution',
    ratio: 'Ratio', ratioLbl: 'ratio', details: 'Details', newSharesIssued: 'New shares issued',
    sourceOfFunding: 'Source of funding', fractionalHandling: 'Fractional handling',
    effective: 'Effective', splitRatio: 'Split ratio', direction: 'Direction',
    pricePreSplit: 'Price pre-split', pricePostSplit: 'Price post-split',
    sharesPreSplit: 'Shares pre-split', sharesPostSplit: 'Shares post-split',
    reason: 'Reason', forwardSplit: 'Forward split', reverseSplit: 'Reverse split',
    fwdSplitLbl: 'forward split', revSplitLbl: 'reverse split',
    amountRaised: 'Amount raised', raisedLbl: 'raise', currentCapital: 'Current capital',
    newCapital: 'New capital', rightsRatio: 'Rights ratio', subscriptionPrice: 'Subscription price',
    newShares: 'New shares', subscriptionOpens: 'Subscription opens',
    thndrCutoff: 'Last date to participate through Thndr', thndrCutoffAt8: 'Thndr cutoff · 8AM', bankCutoff: (bank: string) => `${bank} cutoff`,
    rightsTradingStart: 'Rights trading start', rightsTradingEnd: 'Rights trading end',
    rightsTradingWindow: 'Rights trading window', method: 'Method', useOfProceeds: 'Use of proceeds',
    tenderOpens: 'Offer start', tenderEnds: 'Offer end', acquirer: 'Acquirer',
    offerPrice: 'Offer price', marketPriceAtAnnounce: 'Market price at announce',
    premium: 'Premium', minAcceptance: 'Target Shares Percentage',
    thndrAcceptanceCutoff: 'Thndr acceptance cutoff', settlement: 'Settlement',
    shareOfferedLbl: '/ share offered',
    ipoOfferPrice: 'Offer price', ipoSharesOffered: 'Shares offered',
    ipoSubscriptionOpens: 'Subscription opens', ipoSubscriptionCloses: 'Subscription closes',
    ipoThndrCutoff: 'Thndr cutoff', ipoListingDate: 'Listing date',
    ipoUseOfProceeds: 'Use of proceeds', ipoLbl: '/ share · IPO',
    ipoPublicSubStart: 'Public subscription opens', ipoPublicSubEnd: 'Public subscription closes',
    ipoPrivateSubStart: 'Private subscription opens', ipoPrivateSubEnd: 'Private subscription closes',
    ipoFirstTradingDay: 'First trading day',
    ipoStabilizationStart: 'Stabilization fund start', ipoStabilizationEnd: 'Stabilization fund end',
    ipoMinPublicQty: 'Min. public tranche order', ipoMinPrivateQty: 'Min. private tranche order',
    ipoMaxPublicQty: 'Max. public tranche order',
    ipoPublicShares: 'Public offering shares', ipoPrivateShares: 'Private offering shares',
    ipoPublicPct: 'Public offering %', ipoPrivatePct: 'Private offering %',
    tranche1Label: '1st Tranche', tranche2Label: '2nd Tranche',
    tranche1Allocation: '1st Tranche allocation', tranche2Allocation: '2nd Tranche allocation',
    remainingShares: 'Remaining shares',
    tranche2SubStart: 'Subscription opens', tranche2SubEndThndr: 'Thndr cutoff · 8AM',
    tranche2SubEndBank: (bank: string) => `${bank} cutoff`,
    tranche2TradingStart: 'Trading start · subscribed shares',
  },
  ar: {
    lang_: 'ar' as const,
    eligibilityDate: 'تاريخ الاستحقاق', payout: 'تاريخ التوزيع', dividendPerShare: 'توزيع / سهم',
    payoutDate: 'تاريخ التوزيع', perShare: 'للسهم', egp: 'جنيه',
    cashDisclaimer: 'يتم اضافة الأرباح خلال يومين عمل من تاريخ التوزيع لمحفظة ثاندر',
    payment: (n: number) => `دفعة ${n}`, installment: (n: number) => (['','الأول','الثاني','الثالث','الرابع','الخامس'][n] ? `القسط ${['','الأول','الثاني','الثالث','الرابع','الخامس'][n]}` : `القسط ${n}`),
    installments: (n: number) => n === 2 ? 'للسهم · قسطين' : `للسهم · ${n} أقساط`,
    announce: 'الإعلان', exDateLbl: 'تاريخ الاستحقاق', record: 'تاريخ التسجيل', distribution: 'التوزيع',
    ratio: 'النسبة', ratioLbl: 'نسبة', details: 'التفاصيل', newSharesIssued: 'أسهم جديدة صادرة',
    sourceOfFunding: 'مصدر التمويل', fractionalHandling: 'معالجة الكسور',
    effective: 'تاريخ التنفيذ', splitRatio: 'نسبة التجزئة', direction: 'الاتجاه',
    pricePreSplit: 'السعر قبل التجزئة', pricePostSplit: 'السعر بعد التجزئة',
    sharesPreSplit: 'الأسهم قبل التجزئة', sharesPostSplit: 'الأسهم بعد التجزئة',
    reason: 'السبب', forwardSplit: 'تجزئة', reverseSplit: 'دمج',
    fwdSplitLbl: 'تجزئة أسهم', revSplitLbl: 'دمج أسهم',
    amountRaised: 'المبلغ المجمَّع', raisedLbl: 'مبلغ زيادة رأس المال', currentCapital: 'رأس المال الحالي',
    newCapital: 'رأس المال الجديد', rightsRatio: 'نسبة الحقوق', subscriptionPrice: 'سعر الاكتتاب',
    newShares: 'أسهم جديدة', subscriptionOpens: 'بداية الاكتتاب',
    thndrCutoff: 'آخر موعد للمشاركة عبر ثاندر', thndrCutoffAt8: 'آخر موعد ثاندر · 8 صباحاً', bankCutoff: (bank: string) => `آخر موعد ${bank}`,
    rightsTradingStart: 'بداية تداول الحقوق', rightsTradingEnd: 'نهاية تداول الحقوق',
    rightsTradingWindow: 'فترة تداول الحقوق', method: 'الطريقة', useOfProceeds: 'استخدام العائدات',
    tenderOpens: 'بداية العرض', tenderEnds: 'نهاية العرض', acquirer: 'الشركة المستحوذة',
    offerPrice: 'سعر العرض', marketPriceAtAnnounce: 'سعر السوق عند الإعلان',
    premium: 'علاوة', minAcceptance: 'نسبة الأسهم المستهدفة',
    thndrAcceptanceCutoff: 'آخر موعد قبول ثندر', settlement: 'التسوية',
    shareOfferedLbl: '/ سهم مُعرَض',
    ipoOfferPrice: 'سعر الطرح', ipoSharesOffered: 'أسهم مطروحة',
    ipoSubscriptionOpens: 'بداية الاكتتاب', ipoSubscriptionCloses: 'نهاية الاكتتاب',
    ipoThndrCutoff: 'آخر موعد ثندر', ipoListingDate: 'تاريخ الإدراج',
    ipoUseOfProceeds: 'استخدام العائدات', ipoLbl: '/ سهم · طرح عام',
    ipoPublicSubStart: 'بداية اكتتاب الشريحة العامة', ipoPublicSubEnd: 'نهاية اكتتاب الشريحة العامة',
    ipoPrivateSubStart: 'بداية اكتتاب الشريحة الخاصة', ipoPrivateSubEnd: 'نهاية اكتتاب الشريحة الخاصة',
    ipoFirstTradingDay: 'أول يوم تداول',
    ipoStabilizationStart: 'بداية صندوق الاستقرار', ipoStabilizationEnd: 'نهاية صندوق الاستقرار',
    ipoMinPublicQty: 'أدنى طلب شريحة عامة', ipoMinPrivateQty: 'أدنى طلب شريحة خاصة',
    ipoMaxPublicQty: 'أقصى طلب شريحة عامة',
    ipoPublicShares: 'أسهم الشريحة العامة', ipoPrivateShares: 'أسهم الشريحة الخاصة',
    ipoPublicPct: '% الشريحة العامة', ipoPrivatePct: '% الشريحة الخاصة',
    tranche1Label: 'الشريحة الأولى', tranche2Label: 'الشريحة الثانية',
    tranche1Allocation: 'توزيع الشريحة الأولى', tranche2Allocation: 'توزيع الشريحة الثانية',
    remainingShares: 'الأسهم المتبقية',
    tranche2SubStart: 'بداية الاكتتاب', tranche2SubEndThndr: 'آخر موعد ثاندر · 8 صباحاً',
    tranche2SubEndBank: (bank: string) => `آخر موعد ${bank}`,
    tranche2TradingStart: 'بداية تداول الأسهم المكتتب بها',
  },
} as const;

/* ─── actionRenderer ─────────────────────────────────────────── */
export interface ActionSummary { primary: string; secondary: string; detail?: string; }
export interface KeyDate { key: string; date: string | undefined; label: string; emphasis?: boolean; value?: string; }
export interface TermRow { label: string; value: string; defKey?: string; emphasis?: boolean; accent?: 'positive' | 'negative'; }
export interface ActionSection { label: string; keyDates?: KeyDate[]; terms?: TermRow[]; }
export interface RenderedAction { summary: ActionSummary; keyDates: KeyDate[]; terms: TermRow[]; sections?: ActionSection[]; disclaimer?: string; }

export function actionRenderer(action: CorporateActionWithStatus, lang: Lang = 'en'): RenderedAction {
  const L = RL[lang];
  switch (action.type) {
    case 'cash_dividend':    return cashDividendDetails(action, L);
    case 'bonus_shares':     return bonusSharesDetails(action, L);
    case 'stock_split':      return stockSplitDetails(action, L);
    case 'reverse_split':    return stockSplitDetails(action, L);
    case 'capital_increase': return capitalIncreaseDetails(action, L);
    case 'tender_offer':     return tenderOfferDetails(action, L);
    case 'ipo':              return ipoDetails(action, L);
    default: return { summary: { primary: '—', secondary: '' }, keyDates: [], terms: [] };
  }
}

type LabelMap = typeof RL.en;

function cashDividendDetails(a: CorporateActionWithStatus, L: LabelMap): RenderedAction {
  const d = a.details;
  const installments: { date: string; amount: number }[] = d.installments ?? [];
  const hasInstallments = installments.length > 0;
  return {
    summary: {
      primary: `${fmtMoney(d.amountPerShare, d.currency || 'EGP')}`,
      secondary: hasInstallments ? L.installments(installments.length) : L.perShare,
    },
    keyDates: (() => {
      const _today = new Date(); _today.setHours(0, 0, 0, 0);
      const _localDate = (s: string) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
      const _dates = [
        { key: 'eligibility', date: a.recordDate, label: L.eligibilityDate },
        ...(hasInstallments
          ? installments.map((inst, i) => ({ key: `inst-${i}`, date: inst.date, label: L.installment(i + 1) }))
          : [{ key: 'payout', date: a.paymentDate, label: L.payout }]),
      ];
      const _firstKey = _dates.find(d => d.date && _localDate(d.date) >= _today)?.key;
      return _dates.map(d => ({ ...d, emphasis: d.key === _firstKey }));
    })(),
    terms: [
      { label: L.dividendPerShare, value: fmtMoney(d.amountPerShare, d.currency), emphasis: true },
      { label: L.eligibilityDate,  value: fmtDate(a.recordDate, { long: true, lang: L.lang_ }), defKey: 'recordDate' },
      ...(hasInstallments
        ? installments.map((inst, i) => ({ label: L.installment(i + 1), value: `${fmtDate(inst.date, { long: true, lang: L.lang_ })} · ${fmtMoney(inst.amount, d.currency)}` }))
        : [{ label: L.payoutDate, value: fmtDate(a.paymentDate, { long: true, lang: L.lang_ }), emphasis: true }]),
    ],
    disclaimer: L.cashDisclaimer,
  };
}

function bonusSharesDetails(a: CorporateActionWithStatus, L: LabelMap): RenderedAction {
  const d = a.details;
  return {
    summary: { primary: d.ratio, secondary: L.ratioLbl },
    keyDates: [
      { key: 'exDate',      date: a.exDate,      label: L.eligibilityDate },
      { key: 'paymentDate', date: a.paymentDate, label: L.distribution },
    ],
    terms: [
      { label: L.ratio, value: d.ratio, defKey: 'ratio' },
    ],
  };
}

function translateSplitDescription(text: string, lang: string): string {
  if (lang !== 'ar' || !text) return text;
  // "Par value adjustment from EGP0.5 to EGP0.1"  →  "تعديل القيمة الاسمية من 0.5 إلى 0.1"
  const m = text.match(/par value adjustment from\s+EGP\s*([\d.]+)\s+to\s+EGP\s*([\d.]+)/i);
  if (m) return `تعديل القيمة الاسمية من ${m[1]} إلى ${m[2]}`;
  // "Par value adjustment from X to Y" (no EGP prefix)
  const m2 = text.match(/par value adjustment from\s+([\d.]+)\s+to\s+([\d.]+)/i);
  if (m2) return `تعديل القيمة الاسمية من ${m2[1]} إلى ${m2[2]}`;
  return text;
}

function stockSplitDetails(a: CorporateActionWithStatus, L: LabelMap): RenderedAction {
  const d = a.details;
  const isReverse = d.direction === 'reverse';
  const hasRatio = !!d.ratio && /:\s*\d/.test(d.ratio);
  const primaryLabel = hasRatio ? d.ratio : (isReverse ? L.reverseSplit : L.forwardSplit);
  const secondaryLabel = hasRatio ? (isReverse ? L.revSplitLbl : L.fwdSplitLbl) : undefined;
  const description = d.ratioDescription ? translateSplitDescription(d.ratioDescription, L.lang_) : undefined;
  return {
    summary: { primary: primaryLabel, secondary: secondaryLabel, detail: description },
    keyDates: isReverse
      ? [
          { key: 'recordDate',   date: a.recordDate,   label: L.eligibilityDate },
          { key: 'paymentDate',  date: a.paymentDate,  label: L.effective },
        ]
      : [
          { key: 'announceDate', date: a.announceDate, label: L.announce },
          { key: 'exDate',       date: a.exDate,       label: L.effective },
          { key: 'recordDate',   date: a.recordDate,   label: L.record },
        ],
    terms: [
      ...(hasRatio ? [{ label: L.splitRatio, value: d.ratio, defKey: 'ratio' }] : []),
      { label: L.direction, value: isReverse ? L.reverseSplit : L.forwardSplit },
      ...(description ? [{ label: L.details, value: description }] : []),
    ],
  };
}

function rightsIssueDetails(a: CorporateActionWithStatus): RenderedAction {
  const d = a.details;
  return {
    summary: { primary: d.ratio, secondary: `at ${fmtMoney(d.subscriptionPrice)}`, detail: `${Number(d.discountPct).toFixed(1)}% below market` },
    keyDates: [
      { key: 'announceDate',      date: a.announceDate,       label: 'Announce' },
      { key: 'exDate',            date: a.exDate,             label: 'Ex-rights' },
      { key: 'recordDate',        date: a.recordDate,         label: 'Record' },
      { key: 'subscriptionStart', date: d.subscriptionStart,  label: 'Sub. opens' },
      { key: 'lastDayViaThndr',   date: d.lastDayViaThndr,   label: 'Thndr cutoff', emphasis: true },
      { key: 'lastDayViaBank',    date: d.lastDayViaBank,    label: 'Bank cutoff' },
    ],
    terms: [
      { label: 'Subscription ratio', value: d.ratio, defKey: 'ratio' },
      { label: 'Description',        value: d.ratioDescription },
      { label: 'Subscription price', value: fmtMoney(d.subscriptionPrice), defKey: 'subscriptionPrice', emphasis: true },
      { label: 'Market price at announce', value: fmtMoney(d.marketPriceAtAnnounce) },
      { label: 'Discount to market', value: `${Number(d.discountPct).toFixed(1)}%`, accent: 'positive' },
      { label: 'Last day via Bank',  value: fmtDate(d.lastDayViaBank, { long: true }) },
      { label: 'Last day via Thndr', value: fmtDate(d.lastDayViaThndr, { long: true }), emphasis: true },
    ],
  };
}

function capitalIncreaseDetails(a: CorporateActionWithStatus, L: LabelMap): RenderedAction {
  const d = a.details;
  const hasSubscription = !!d.subscriptionStart;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const localDate = (s: string) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
  const isUpcoming = (dateStr?: string) => !!dateStr && localDate(dateStr) >= today;

  // Build key dates without emphasis, then mark only the first upcoming one
  const rawDates = [
    { key: 'announceDate',  date: a.announceDate,          label: L.announce },
    { key: 'eligibility',   date: a.exDate,                label: L.eligibilityDate },
    ...(d.tradingStart ? [
      { key: 'tradingStart', date: d.tradingStart, label: L.rightsTradingStart },
      { key: 'tradingEnd',   date: d.tradingEnd,   label: L.rightsTradingEnd },
    ] : []),
    ...(d.subscriptionEndThndr ? [{ key: 'thndrCutoff', date: d.subscriptionEndThndr, label: L.thndrCutoffAt8 }] : []),
    ...(d.subscriptionEndBank  ? [{ key: 'bankCutoff',  date: d.subscriptionEndBank,  label: L.bankCutoff(d.subscriptionBank ?? 'Bank') }] : []),
  ].filter(k => k.date);

  const firstUpcomingKey = rawDates.find(k => isUpcoming(k.date))?.key;
  const keyDates = rawDates.map(k => ({ ...k, emphasis: k.key === firstUpcomingKey }));

  return {
    summary: { primary: fmtMoney(d.amountRaised), secondary: L.raisedLbl },
    terms: [
      { label: L.amountRaised,      value: fmtMoney(d.amountRaised), emphasis: true },
      { label: L.currentCapital,    value: fmtMoney(d.currentCapital) },
      { label: L.newCapital,        value: fmtMoney(d.newCapital) },
      ...(d.ratioDescription ? [{ label: L.rightsRatio, value: L.lang_ === 'ar' ? `${parseFloat(d.ratioDescription) || d.ratioDescription} حق لكل سهم` : d.ratioDescription }] : []),
      { label: L.subscriptionPrice, value: fmtMoney(d.subscriptionPrice ?? d.sharePrice) },
      ...(hasSubscription ? [{ label: L.subscriptionOpens, value: fmtDate(d.subscriptionStart, { long: true, lang: L.lang_ }) }] : []),
      ...(d.subscriptionEndThndr ? [{
        label: L.thndrCutoffAt8,
        value: fmtDate(d.subscriptionEndThndr, { long: true, lang: L.lang_ }),
        emphasis: isUpcoming(d.subscriptionEndThndr),
      }] : []),
      ...(d.subscriptionEndBank ? [{ label: L.bankCutoff(d.subscriptionBank ?? 'Bank'), value: fmtDate(d.subscriptionEndBank, { long: true, lang: L.lang_ }) }] : []),
      ...(d.tradingStart ? [{ label: L.rightsTradingWindow, value: `${fmtDate(d.tradingStart, { lang: L.lang_ })} — ${fmtDate(d.tradingEnd, { lang: L.lang_ })}` }] : []),
      ...(d.method ? [{ label: L.method, value: d.method }] : []),
    ],
    keyDates: [
      ...keyDates,
      ...(d.tranche1Allocation ? [{ key: 'tranche1Alloc', date: undefined, label: L.tranche1Allocation, value: d.tranche1Allocation }] : []),
    ],
    ...(d.tranche2SubStart ? {
      sections: [{
        label: L.tranche2Label,
        keyDates: [
          { key: 't2SubStart',    date: d.tranche2SubStart,    label: L.tranche2SubStart },
          { key: 't2ThndrCutoff', date: d.tranche2SubEndThndr, label: L.tranche2SubEndThndr, emphasis: isUpcoming(d.tranche2SubEndThndr) },
          ...(d.tranche2SubEndBank ? [{ key: 't2BankCutoff', date: d.tranche2SubEndBank, label: L.tranche2SubEndBank(d.subscriptionBank ?? 'Bank') }] : []),
          ...(d.tranche2TradingStart ? [{ key: 't2Trading', date: d.tranche2TradingStart, label: L.tranche2TradingStart }] : []),
          ...(d.remainingShares ? [{ key: 't2Remaining', date: undefined, label: L.remainingShares, value: d.remainingShares.toLocaleString('en-US') }] : []),
          ...(d.tranche2Allocation ? [{ key: 't2Alloc', date: undefined, label: L.tranche2Allocation, value: d.tranche2Allocation }] : []),
        ].filter(k => k.date || k.value),
      }],
    } : {}),
  };
}

function tenderOfferDetails(a: CorporateActionWithStatus, L: LabelMap): RenderedAction {
  const d = a.details;
  return {
    summary: { primary: d.offerPrice ? fmtMoney(d.offerPrice) : '—', secondary: L.shareOfferedLbl },
    keyDates: [
      { key: 'exDate',      date: a.exDate,              label: L.tenderOpens },
      { key: 'tenderEnd',   date: d.tenderEnd as string,  label: L.tenderEnds },
      { key: 'thndrCutoff', date: d.thndrCutoff as string, label: L.thndrCutoff, emphasis: true },
    ].filter(k => k.date),
    terms: [
      { label: L.acquirer,       value: String(L.lang_ === 'ar' ? (d.acquirerAr || d.acquirer || '—') : (d.acquirer || d.acquirerAr || '—')) },
      { label: L.offerPrice,     value: fmtMoney(d.offerPrice), emphasis: true },
      ...(d.minAcceptancePct != null ? [{ label: L.minAcceptance, value: `${d.minAcceptancePct}%` }] : []),
    ],
  };
}

function ipoDetails(a: CorporateActionWithStatus, L: LabelMap): RenderedAction {
  const d = a.details;
  return {
    summary: {
      primary: d.offerPrice ? fmtMoney(d.offerPrice) : '—',
      secondary: L.ipoLbl,
    },
    keyDates: (() => {
      const _today = new Date(); _today.setHours(0, 0, 0, 0);
      const _localDate = (s: string) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
      const _dates = [
        { key: 'announce',          date: a.announceDate,       label: L.announce },
        { key: 'publicSubStart',    date: d.publicSubStart,     label: L.ipoPublicSubStart },
        { key: 'publicSubEnd',      date: d.publicSubEnd,       label: L.ipoPublicSubEnd },
        { key: 'privateSubStart',   date: d.privateSubStart,    label: L.ipoPrivateSubStart },
        { key: 'privateSubEnd',     date: d.privateSubEnd,      label: L.ipoPrivateSubEnd },
        { key: 'thndrCutoff',       date: d.thndrCutoff,        label: L.ipoThndrCutoff },
        { key: 'firstTradingDay',   date: d.firstTradingDay,    label: L.ipoFirstTradingDay },
        { key: 'stabilizationStart',date: d.stabilizationStart, label: L.ipoStabilizationStart },
        { key: 'stabilizationEnd',  date: d.stabilizationEnd,   label: L.ipoStabilizationEnd },
        { key: 'listing',           date: d.listingDate,        label: L.ipoListingDate },
      ].filter(k => k.date);
      const _firstKey = _dates.find(k => k.date && _localDate(k.date) >= _today)?.key;
      return _dates.map(k => ({ ...k, emphasis: k.key === _firstKey }));
    })(),
    terms: [
      ...(d.offerPrice           ? [{ label: L.ipoOfferPrice,     value: fmtMoney(d.offerPrice), emphasis: true }] : []),
      ...(d.publicOfferingShares ? [{ label: L.ipoPublicShares,   value: fmtBigNumber(d.publicOfferingShares) }] : []),
      ...(d.privateOfferingShares? [{ label: L.ipoPrivateShares,  value: fmtBigNumber(d.privateOfferingShares) }] : []),
      ...(d.publicOfferingPct    ? [{ label: L.ipoPublicPct,      value: `${d.publicOfferingPct}%` }] : []),
      ...(d.privateOfferingPct   ? [{ label: L.ipoPrivatePct,     value: `${d.privateOfferingPct}%` }] : []),
      ...(d.minPublicOrderQty    ? [{ label: L.ipoMinPublicQty,   value: fmtBigNumber(d.minPublicOrderQty) }] : []),
      ...(d.minPrivateOrderQty   ? [{ label: L.ipoMinPrivateQty,  value: fmtBigNumber(d.minPrivateOrderQty) }] : []),
      ...(d.maxPublicOrderQty    ? [{ label: L.ipoMaxPublicQty,   value: fmtBigNumber(d.maxPublicOrderQty) }] : []),
      ...(d.sharesOffered        ? [{ label: L.ipoSharesOffered,  value: fmtBigNumber(d.sharesOffered) }] : []),
      ...(d.useOfProceeds        ? [{ label: L.ipoUseOfProceeds,  value: d.useOfProceeds }] : []),
    ],
  };
}

function suspensionDetails(a: CorporateActionWithStatus): RenderedAction {
  const d = a.details;
  return {
    summary: { primary: 'Halted', secondary: 'trading', detail: d.reason },
    keyDates: [
      { key: 'announceDate',  date: a.announceDate,   label: 'Announce' },
      { key: 'exDate',        date: a.exDate,         label: 'Suspension starts' },
      { key: 'expectedReturn',date: d.expectedReturn, label: 'Expected return' },
    ],
    terms: [
      { label: 'Reason',            value: d.reason },
      { label: 'Last traded price', value: fmtMoney(d.lastPrice) },
      { label: 'Expected return',   value: fmtDate(d.expectedReturn, { long: true }) },
      { label: 'Open orders',       value: d.ordersAffected, accent: 'negative' },
    ],
  };
}

function delistingDetails(a: CorporateActionWithStatus): RenderedAction {
  const d = a.details;
  return {
    summary: { primary: 'Delisting', secondary: `at ${fmtMoney(d.buyoutPrice)}`, detail: `${Number(d.premiumPct).toFixed(1)}% premium · ${d.reason}` },
    keyDates: [
      { key: 'announceDate',    date: a.announceDate,    label: 'Announce' },
      { key: 'exDate',          date: a.exDate,          label: 'Delisting date', emphasis: true },
      { key: 'finalTradingDay', date: d.finalTradingDay, label: 'Final trading day' },
      { key: 'cashOutDeadline', date: d.cashOutDeadline, label: 'Cash-out by' },
    ],
    terms: [
      { label: 'Reason',                   value: d.reason },
      { label: 'Buyout price',             value: fmtMoney(d.buyoutPrice), emphasis: true },
      { label: 'Market price at announce', value: fmtMoney(d.marketPriceAtAnnounce) },
      { label: 'Premium',                  value: `${Number(d.premiumPct).toFixed(1)}%`, defKey: 'premiumPct' },
      { label: 'Final trading day',        value: fmtDate(d.finalTradingDay, { long: true }) },
      { label: 'Cash-out deadline',        value: fmtDate(d.cashOutDeadline, { long: true }), emphasis: true },
    ],
  };
}

function drivePreviewToProxyUrl(url: string): string {
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `/api/pdf-proxy?fileId=${m[1]}` : url;
}

/* ─── PDF Viewer Modal ───────────────────────────────────────── */
export function PdfViewerModal({ name, url, onClose }: { name: string; url: string; onClose: () => void }) {
  const close = useCallback((e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); }, [onClose]);
  const [state, setState] = useState<'loading' | 'ok' | 'not_public' | 'error'>('loading');
  const proxyUrl = drivePreviewToProxyUrl(url);
  const openTab = useCallback(() => window.open(url, '_blank'), [url]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Pre-flight check: hit the proxy to see if the file is accessible before showing the iframe
  useEffect(() => {
    setState('loading');
    fetch(proxyUrl, { method: 'HEAD' })
      .then(r => {
        if (r.ok) { setState('ok'); return; }
        r.json().then(d => setState(d?.error === 'not_public' ? 'not_public' : 'error')).catch(() => setState('error'));
      })
      .catch(() => setState('error'));
  }, [proxyUrl]);

  const errorBody = (icon: string, title: string, body: string) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#0a0a0a', padding: 32 }}>
      <i className={icon} style={{ fontSize: 48, color: '#888' }}/>
      <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}>{title}</div>
      <div style={{ color: '#888', fontSize: 13, fontFamily: "'DM Sans', sans-serif", textAlign: 'center', maxWidth: 380, lineHeight: 1.7 }}>{body}</div>
      <button onClick={openTab} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, background: '#FFFF00', border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
        <i className="ph ph-arrow-square-out" style={{ fontSize: 16 }}/> Open in Google Drive
      </button>
    </div>
  );

  return createPortal(
    <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.80)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ph-fill ph-file-pdf" style={{ fontSize: 20, color: '#FF4444' }}/>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>{name}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={openTab} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            <i className="ph ph-arrow-square-out" style={{ fontSize: 15 }}/> Open in Drive
          </button>
          <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff', fontSize: 18, cursor: 'pointer' }}>
            <i className="ph ph-x"/>
          </button>
        </div>
      </div>
      {/* Body */}
      {state === 'loading' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
          <i className="ph ph-circle-notch ph-spin" style={{ fontSize: 32, color: '#888' }}/>
        </div>
      )}
      {state === 'not_public' && errorBody(
        'ph ph-lock',
        'File is not publicly accessible',
        'This Google Drive file requires sign-in to view. To fix this, open the file in Google Drive → Share → change access to "Anyone with the link" → Viewer.'
      )}
      {state === 'error' && errorBody(
        'ph ph-warning-circle',
        'Couldn\'t load document',
        'Something went wrong fetching this file. You can still open it directly in Google Drive.'
      )}
      {state === 'ok' && (
        <iframe
          src={proxyUrl}
          style={{ flex: 1, border: 0, background: '#fff', display: 'block' }}
          title={name}
        />
      )}
    </div>,
    document.body,
  );
}

