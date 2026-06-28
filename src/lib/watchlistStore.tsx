import { createContext, useContext, useState, ReactNode } from 'react';
import { WATCHLIST } from '../data/designData';

const LS_KEY = 'egx_watchlist';

function load(): string[] {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v ? JSON.parse(v) : [...WATCHLIST];
  } catch {
    return [...WATCHLIST];
  }
}

function save(list: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

interface WatchlistCtx {
  watchlist: string[];
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  inWatchlist: (symbol: string) => boolean;
}

const Ctx = createContext<WatchlistCtx>({
  watchlist: [],
  addToWatchlist: () => {},
  removeFromWatchlist: () => {},
  inWatchlist: () => false,
});

export const useWatchlist = () => useContext(Ctx);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<string[]>(load);

  function addToWatchlist(symbol: string) {
    setWatchlist(prev => {
      if (prev.includes(symbol)) return prev;
      const next = [...prev, symbol];
      save(next);
      return next;
    });
  }

  function removeFromWatchlist(symbol: string) {
    setWatchlist(prev => {
      const next = prev.filter(s => s !== symbol);
      save(next);
      return next;
    });
  }

  function inWatchlist(symbol: string) {
    return watchlist.includes(symbol);
  }

  return (
    <Ctx.Provider value={{ watchlist, addToWatchlist, removeFromWatchlist, inWatchlist }}>
      {children}
    </Ctx.Provider>
  );
}
