import type { Delivery } from '../models/models';

export interface RouteEntry { id: string; shipmentId: string; trackingToken: string; }
export function routeEntry(delivery: Pick<Delivery, 'id' | 'shipmentId' | 'trackingToken'>): RouteEntry {
  return { id: delivery.id, shipmentId: delivery.shipmentId, trackingToken: delivery.trackingToken };
}
export function routeEntries(value: unknown): RouteEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is RouteEntry => !!entry && ['id', 'shipmentId', 'trackingToken'].every(key => typeof entry[key] === 'string' && entry[key].length > 0 && !entry[key].includes('/')));
}
export function routeKey(entry: RouteEntry): string { return `${entry.shipmentId}/${entry.id}`; }
