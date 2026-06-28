// Google Sheets integration via @replit/connectors-sdk
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { ReplitConnectors } from '@replit/connectors-sdk';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());

// Proxy /api/news/* → FastAPI news backend on port 8000
app.use('/api/news', createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: { '^/api/news': '' },
  on: {
    error: (err, req, res) => {
      res.status(502).json({ error: 'News backend unavailable', detail: err.message });
    },
  },
}));

// In production, serve the Vite build output
if (isProd) {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true,
    immutable: true,
  }));
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
if (!SPREADSHEET_ID) {
  console.error('[FATAL] SPREADSHEET_ID environment variable is not set. Add it to Replit Secrets.');
  process.exit(1);
}

function parseDate(raw) {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().split('T')[0];
}

function parseNumber(raw) {
  if (!raw) return 0;
  return parseFloat(String(raw).replace(/,/g, '')) || 0;
}

function parseDriveUrls(raw) {
  if (!raw) return [];
  return String(raw).split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(url => {
      const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
      return url;
    });
}

function rowToAction(row, index) {
  const [
    eventType, ticker, nameAr, nameEn, details, dividendPerShare, ,
    eligibilityDate, payoutDate,
    capSubscriptionPrice, capSubscriptionStart, capSubscriptionEndThndr,
    capSubscriptionEndBank, capBank,
    capTradingStart, capTradingEnd,
    capCurrentCapital, capNewCapital, capIncreaseAmount,
    capTranche1Allocation, capTranche2SubStart, capTranche2SubEndThndr,
    capTranche2SubEndBank, capRemainingShares, capTranche2Allocation, capTranche2TradingStart,
    pdfUrlsRaw, pdfUrlsRaw2, pdfUrlsRaw3,
    ipoPublicSubStart, ipoPublicSubEnd,              // AD, AE
    ipoPrivateSubStart, ipoPrivateSubEnd,            // AF, AG
    ipoMinPublicQty, ipoMinPrivateQty, ipoMaxPublicQty,
    ipoPublicShares, ipoPrivateShares,
    ipoPublicPct, ipoPrivatePct,
    ipoFirstTradingDay, ipoStabilizationStart, ipoStabilizationEnd,
    acquirerName,                                // AR (col 44) — acquiring company EN
    acquirerNameAr,                              // AS (col 45) — acquiring company AR
    ,                                            // AT (col 46) — reserved
    minAcceptancePct,                            // AU (col 47) — minimum acceptance %
  ] = row;
  if (!ticker || !eventType) return null;

  const symbol = ticker.trim().toUpperCase();
  const paymentDate = parseDate(payoutDate);

  let earlyType = 'cash_dividend';
  if (eventType === 'Stock Dividends') earlyType = 'bonus_shares';
  else if (eventType === 'Stock Split') earlyType = 'stock_split';
  else if (eventType === 'Reverse Split') earlyType = 'reverse_split';
  else if (eventType === 'IPO') earlyType = 'ipo';
  else if (eventType === 'Capital Increase') earlyType = 'capital_increase';
  else if (eventType === 'Tender Offer') earlyType = 'tender_offer';

  let exDate = parseDate(eligibilityDate);
  if (!exDate && earlyType === 'ipo') {
    exDate = parseDate(ipoFirstTradingDay) ?? parseDate(capTradingStart) ?? parseDate(capSubscriptionEndBank) ?? paymentDate;
  }
  if (!exDate && earlyType === 'tender_offer') {
    exDate = parseDate(capTradingStart);
  }
  if (!exDate) return null;

  let type = 'cash_dividend';
  if (eventType === 'Stock Dividends') type = 'bonus_shares';
  else if (eventType === 'Stock Split') type = 'stock_split';
  else if (eventType === 'Reverse Split') type = 'reverse_split';
  else if (eventType === 'IPO') type = 'ipo';
  else if (eventType === 'Capital Increase') type = 'capital_increase';
  else if (eventType === 'Tender Offer') type = 'tender_offer';

  const amountPerShare = parseFloat(dividendPerShare) || 0;

  return {
    id: `sheet-${symbol}-${index}`,
    symbol,
    type,
    title: nameEn || symbol,
    nameAr: nameAr || '',
    nameEn: nameEn || symbol,
    announceDate: exDate,
    exDate,
    recordDate: exDate,
    paymentDate,
    details: type === 'cash_dividend'
      ? { amountPerShare, grossPerShare: amountPerShare, netPerShare: amountPerShare, currency: /USD/i.test(details || '') ? 'USD' : 'EGP', taxWithholding: 0, yieldPct: 0 }
      : type === 'bonus_shares'
      ? { ratio: details || '1:1', ratioDescription: details || '', newSharesIssued: 0, sourceOfFunding: '', fractionalHandling: '' }
      : type === 'ipo'
      ? {
          offerPrice:           parseNumber(capSubscriptionPrice) || amountPerShare || undefined,
          useOfProceeds:        details || undefined,
          thndrCutoff:          paymentDate,
          publicSubStart:       parseDate(ipoPublicSubStart),
          publicSubEnd:         parseDate(ipoPublicSubEnd),
          privateSubStart:      parseDate(ipoPrivateSubStart),
          privateSubEnd:        parseDate(ipoPrivateSubEnd),
          minPublicOrderQty:    parseNumber(ipoMinPublicQty) || undefined,
          minPrivateOrderQty:   parseNumber(ipoMinPrivateQty) || undefined,
          maxPublicOrderQty:    parseNumber(ipoMaxPublicQty) || undefined,
          publicOfferingShares: parseNumber(ipoPublicShares) || undefined,
          privateOfferingShares:parseNumber(ipoPrivateShares) || undefined,
          publicOfferingPct:    ipoPublicPct ? String(ipoPublicPct) : undefined,
          privateOfferingPct:   ipoPrivatePct ? String(ipoPrivatePct) : undefined,
          firstTradingDay:      parseDate(ipoFirstTradingDay),
          stabilizationStart:   parseDate(ipoStabilizationStart),
          stabilizationEnd:     parseDate(ipoStabilizationEnd),
        }
      : type === 'capital_increase'
      ? {
          amountRaised:        parseNumber(capIncreaseAmount),
          currentCapital:      parseNumber(capCurrentCapital),
          newCapital:          parseNumber(capNewCapital),
          subscriptionPrice:   parseNumber(capSubscriptionPrice) || amountPerShare,
          subscriptionStart:   parseDate(capSubscriptionStart),
          subscriptionEndThndr: parseDate(capSubscriptionEndThndr),
          subscriptionEndBank: parseDate(capSubscriptionEndBank),
          subscriptionBank:    capBank || undefined,
          tradingStart:        parseDate(capTradingStart),
          tradingEnd:          parseDate(capTradingEnd),
          ratioDescription:        details || '',
          useOfProceeds:           details || '',
          tranche1Allocation:      capTranche1Allocation || undefined,
          tranche2SubStart:        parseDate(capTranche2SubStart),
          tranche2SubEndThndr:     parseDate(capTranche2SubEndThndr),
          tranche2SubEndBank:      parseDate(capTranche2SubEndBank),
          remainingShares:         parseNumber(capRemainingShares) || undefined,
          tranche2Allocation:      capTranche2Allocation || undefined,
          tranche2TradingStart:    parseDate(capTranche2TradingStart),
        }
      : type === 'tender_offer'
      ? { acquirer: acquirerName || '', acquirerAr: acquirerNameAr || '', offerPrice: parseNumber(capSubscriptionPrice), thndrCutoff: parseDate(capSubscriptionEndThndr), tenderEnd: parseDate(capTradingEnd), minAcceptancePct: parseNumber(minAcceptancePct) || undefined }
      : type === 'reverse_split'
      ? { ratio: /:\s*\d/.test(dividendPerShare || '') ? dividendPerShare.trim() : '', direction: 'reverse', ratioDescription: details || '', pricePreSplit: 0, pricePostSplit: 0, sharesPreSplit: 0, sharesPostSplit: 0 }
      : { ratio: /:\s*\d/.test(dividendPerShare || '') ? dividendPerShare.trim() : (details || ''), direction: 'forward', ratioDescription: details || '', pricePreSplit: 0, pricePostSplit: 0, sharesPreSplit: 0, sharesPostSplit: 0 },
    pdfUrls: [
      ...parseDriveUrls(pdfUrlsRaw),
      ...parseDriveUrls(pdfUrlsRaw2),
      ...parseDriveUrls(pdfUrlsRaw3),
    ],
  };
}

function mergeInstallments(actions) {
  const groups = new Map();
  const nonGroupable = [];

  for (const a of actions) {
    if (a.type !== 'cash_dividend') { nonGroupable.push(a); continue; }
    const key = `${a.symbol}::${a.exDate}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }

  const merged = [];
  for (const [, group] of groups) {
    if (group.length === 1) { merged.push(group[0]); continue; }

    const base = group[0];
    const installments = group
      .filter(a => a.paymentDate)
      .map(a => ({ date: a.paymentDate, amount: a.details.amountPerShare || 0 }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const seen = new Set();
    const uniqueInstallments = installments.filter(i => {
      if (seen.has(i.date)) return false;
      seen.add(i.date);
      return true;
    });

    if (uniqueInstallments.length <= 1) { merged.push(base); continue; }

    const totalAmount = uniqueInstallments.reduce((s, i) => s + i.amount, 0);
    const lastPayment = uniqueInstallments[uniqueInstallments.length - 1].date;

    merged.push({
      ...base,
      paymentDate: lastPayment,
      details: {
        ...base.details,
        amountPerShare: totalAmount,
        grossPerShare: totalAmount,
        netPerShare: totalAmount,
        installments: uniqueInstallments,
      },
    });
  }

  return [...merged, ...nonGroupable];
}

app.get('/api/pdf-proxy', async (req, res) => {
  const { fileId } = req.query;
  if (!fileId || typeof fileId !== 'string') return res.status(400).json({ error: 'Missing fileId' });
  try {
    const baseUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0`;
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

    const upstream = await fetch(baseUrl, { headers, redirect: 'manual' });
    const location = upstream.headers.get('location') || '';

    if (location.includes('accounts.google.com') || location.includes('ServiceLogin')) {
      return res.status(403).json({ error: 'not_public', message: 'This file requires Google sign-in. Set sharing to "Anyone with the link" in Google Drive.' });
    }

    let final = upstream;
    if (upstream.status >= 300 && upstream.status < 400 && location) {
      final = await fetch(location, { headers, redirect: 'follow' });
    }

    if (!final.ok) return res.status(final.status).json({ error: `Drive returned ${final.status}` });

    const contentType = final.headers.get('content-type') || 'application/pdf';
    if (contentType.includes('text/html')) {
      return res.status(403).json({ error: 'not_public', message: 'This file requires Google sign-in. Set sharing to "Anyone with the link" in Google Drive.' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    const buffer = await final.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('PDF proxy error:', err);
    res.status(500).json({ error: String(err) });
  }
});

const CACHE_TTL_MS = 5 * 60_000; // 5 minutes
let cachedActions = null;
let cacheExpiresAt = 0;
let inflight = null;

async function fetchTab(connectors, tabName) {
  const range = encodeURIComponent(`'${tabName}'!A1:AU2000`);
  const response = await connectors.proxy(
    'google-sheet',
    `/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
    { method: 'GET' }
  );
  const data = await response.json();
  return (data.values || []).slice(1);
}

async function fetchFromSheet() {
  const connectors = new ReplitConnectors();
  const [dividendRows, actionRows] = await Promise.all([
    fetchTab(connectors, 'Dividends / Splits'),
    fetchTab(connectors, 'Actions'),
  ]);
  const allRows = [...dividendRows, ...actionRows];
  const actions = allRows.map((row, i) => rowToAction(row, i)).filter(Boolean);
  return mergeInstallments(actions);
}

async function getActions() {
  if (cachedActions && Date.now() < cacheExpiresAt) return cachedActions;
  if (inflight) return inflight;
  inflight = fetchFromSheet().then(actions => {
    cachedActions = actions;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    inflight = null;
    return actions;
  }).catch(err => {
    inflight = null;
    throw err;
  });
  return inflight;
}

app.get('/api/sheet-actions', async (req, res) => {
  try {
    const actions = await getActions();
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.json(actions);
  } catch (err) {
    console.error('Sheet fetch error:', err);
    if (cachedActions) {
      console.log('Serving stale cache after error');
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.json(cachedActions);
    } else {
      res.status(500).json({ error: String(err) });
    }
  }
});

app.post('/api/sheet-actions/refresh', async (req, res) => {
  cachedActions = null;
  cacheExpiresAt = 0;
  try {
    res.json(await getActions());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    cached: !!cachedActions,
    cacheExpiresIn: cachedActions ? Math.max(0, Math.floor((cacheExpiresAt - Date.now()) / 1000)) : 0,
    ts: new Date().toISOString(),
  });
});

app.use(express.json());
app.post('/api/log-error', (req, res) => {
  const { message, stack, url, userAgent } = req.body || {};
  console.error(JSON.stringify({
    level: 'FRONTEND_ERROR',
    message,
    stack,
    url,
    userAgent,
    ts: new Date().toISOString(),
  }));
  res.json({ ok: true });
});

// SPA fallback — must come after all API routes
if (isProd) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = isProd ? (process.env.PORT || 5000) : 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sheet API server running on port ${PORT}`);
  getActions().then(() => console.log('Cache warmed')).catch(() => {});
});
