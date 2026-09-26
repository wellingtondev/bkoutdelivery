import type { Delivery } from '../../models/models';

export const CLOSING_TIME_ZONE = 'America/Sao_Paulo';
const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: CLOSING_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

export function completionDate(value: unknown): Date | null {
  try {
    let date: Date;
    if (value instanceof Date) date = value;
    else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) date = new Date(value);
    else if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') date = value.toDate();
    else if (value && typeof value === 'object' && 'seconds' in value && typeof value.seconds === 'number') date = new Date(value.seconds * 1000);
    else return null;
    return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
  } catch { return null; }
}

export function saoPauloDate(date: Date): string {
  const parts = dateFormatter.formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function cents(value: number): number {
  return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 100) : 0;
}

export interface ClosingTotals { count: number; orderCents: number; feeCents: number; }
export interface ClosingDay extends ClosingTotals { key: string; day: number; deliveries: Delivery[]; }
export interface MonthlyClosing extends ClosingTotals { days: ClosingDay[]; offset: number; missingDates: number; }

export function monthlyClosing(deliveries: Delivery[], year: number, month: number): MonthlyClosing {
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const days: ClosingDay[] = Array.from({ length: new Date(Date.UTC(year, month + 1, 0)).getUTCDate() }, (_, index) => ({
    key: `${monthKey}-${String(index + 1).padStart(2, '0')}`, day: index + 1, count: 0, orderCents: 0, feeCents: 0, deliveries: []
  }));
  const result: MonthlyClosing = { days, offset: new Date(Date.UTC(year, month, 1)).getUTCDay(), count: 0, orderCents: 0, feeCents: 0, missingDates: 0 };
  for (const delivery of deliveries) {
    if (delivery.status !== 'DELIVERED') continue;
    const completed = completionDate(delivery.deliveredAt);
    if (!completed) { result.missingDates++; continue; }
    const key = saoPauloDate(completed);
    if (!key.startsWith(`${monthKey}-`)) continue;
    const day = days[Number(key.slice(-2)) - 1];
    day.deliveries.push(delivery);
    day.count++;
    day.orderCents += cents(delivery.orderValue);
    day.feeCents += cents(delivery.deliveryFee);
    result.count++;
    result.orderCents += cents(delivery.orderValue);
    result.feeCents += cents(delivery.deliveryFee);
  }
  return result;
}
