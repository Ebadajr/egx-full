import { createContext, useContext, useState, ReactNode } from 'react';

export interface PdfAttachment { name: string; url: string; size: number; }
type PdfMap = Record<string, PdfAttachment[]>;

interface PdfStoreCtx {
  pdfs: PdfMap;
  attach: (actionId: string, file: File) => void;
  detach: (actionId: string, index: number) => void;
}

export const PdfCtx = createContext<PdfStoreCtx>({ pdfs: {}, attach: () => {}, detach: () => {} });
export const usePdfs = () => useContext(PdfCtx);

export function PdfProvider({ children }: { children: ReactNode }) {
  const [pdfs, setPdfs] = useState<PdfMap>({});

  function attach(actionId: string, file: File) {
    setPdfs(prev => ({
      ...prev,
      [actionId]: [...(prev[actionId] ?? []), { name: file.name, url: URL.createObjectURL(file), size: file.size }],
    }));
  }

  function detach(actionId: string, index: number) {
    setPdfs(prev => {
      const list = prev[actionId] ?? [];
      URL.revokeObjectURL(list[index]?.url ?? '');
      const next = list.filter((_, i) => i !== index);
      if (next.length === 0) {
        const copy = { ...prev };
        delete copy[actionId];
        return copy;
      }
      return { ...prev, [actionId]: next };
    });
  }

  return <PdfCtx.Provider value={{ pdfs, attach, detach }}>{children}</PdfCtx.Provider>;
}
