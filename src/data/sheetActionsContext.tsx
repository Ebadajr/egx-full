import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CorporateActionWithStatus } from './designData';
import { fetchSheetActions } from './sheetActions';

interface SheetActionsCtx {
  actions: CorporateActionWithStatus[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const Ctx = createContext<SheetActionsCtx>({
  actions: [],
  loading: false,
  error: null,
  refresh: () => {},
});

export function SheetActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<CorporateActionWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchSheetActions()
      .then(data => { setActions(data); setLoading(false); })
      .catch(err => { setError(String(err)); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  return <Ctx.Provider value={{ actions, loading, error, refresh: load }}>{children}</Ctx.Provider>;
}

export function useSheetActions() { return useContext(Ctx); }
