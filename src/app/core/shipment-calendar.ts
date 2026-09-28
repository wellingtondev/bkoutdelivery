import type { Delivery, Shipment } from '../models/models';

export function validDeliveryDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function saoPauloDay(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}

/** Retains original documents; each time is represented consistently across snapshot ordering. */
export function recurringShipments(shipments: Shipment[]): Shipment[] {
  const times = new Map<string, Shipment>();
  for (const shipment of [...shipments].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(shipment.time)) continue;
    if (!times.has(shipment.time) || shipment.id === `slot-${shipment.time.replace(':', '')}`) times.set(shipment.time, shipment);
  }
  return [...times.values()].sort((a, b) => a.time.localeCompare(b.time));
}

export function deliveryDay(delivery: Pick<Delivery, 'shipmentId' | 'deliveryDate' | 'createdAt'>, shipments: Shipment[]): string | null {
  if (validDeliveryDate(delivery.deliveryDate)) return delivery.deliveryDate;
  const value: unknown = delivery.createdAt;
  try {
    let created: Date | null = null;
    if (value instanceof Date) created = value;
    else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) created = new Date(value);
    else if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') created = value.toDate();
    else if (value && typeof value === 'object' && 'seconds' in value && typeof value.seconds === 'number') created = new Date(value.seconds * 1000);
    if (created instanceof Date && Number.isFinite(created.getTime())) return saoPauloDay(created);
  } catch { /* Fall through to legacy shipment date for malformed timestamps. */ }
  const legacy = shipments.find(shipment => shipment.id === delivery.shipmentId)?.date;
  return validDeliveryDate(legacy) ? legacy : null;
}
