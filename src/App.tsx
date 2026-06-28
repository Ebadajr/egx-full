import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LangCtx, I18N, Lang } from './lib/i18n';
import { PdfProvider } from './lib/pdfStore';
import { WatchlistProvider } from './lib/watchlistStore';
import { SheetActionsProvider } from './data/sheetActionsContext';
import ErrorBoundary from './components/ErrorBoundary';
import AdminDashboard from './pages/AdminDashboard';
import AdminActions from './pages/AdminActions';
import AppAllActions from './pages/AppAllActions';
import AppStockActions from './pages/AppStockActions';

export default function App() {
  const [lang, setLang] = useState<Lang>('en');
  const t = I18N[lang];
  return (
    <ErrorBoundary>
    <WatchlistProvider>
    <PdfProvider>
    <SheetActionsProvider>
    <LangCtx.Provider value={{ lang, t, setLang }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AdminDashboard readOnly />} />
          <Route path="/dashboard" element={<AdminDashboard readOnly />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/actions" element={<AdminActions />} />
          <Route path="/actions" element={<AdminActions />} />
          <Route path="/app/actions" element={<AppAllActions />} />
          <Route path="/app/stock/:ticker" element={<AppStockActions />} />
        </Routes>
      </BrowserRouter>
    </LangCtx.Provider>
    </SheetActionsProvider>
    </PdfProvider>
    </WatchlistProvider>
    </ErrorBoundary>
  );
}
