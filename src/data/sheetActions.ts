import { CorporateActionWithStatus, CorporateAction, statusFor } from './designData';

export interface SheetAction {
  id: string;
  symbol: string;
  type: string;
  title: string;
  nameAr: string;
  nameEn: string;
  announceDate: string;
  exDate: string;
  recordDate?: string;
  paymentDate?: string;
  details: Record<string, unknown>;
}

export async function fetchSheetActions(): Promise<CorporateActionWithStatus[]> {
  const res = await fetch('/api/sheet-actions');
  if (!res.ok) throw new Error(`Sheet API error: ${res.status}`);
  const raw: SheetAction[] = await res.json();
  return raw.map(a => ({
    ...(a as unknown as CorporateAction),
    type: a.type as CorporateAction['type'],
    status: statusFor(a as unknown as CorporateAction),
  }));
}
