import type { Delivery, Shipment } from '../../models/models';
import { completionDate, saoPauloDate } from '../monthly-summary/monthly-summary';

export interface DriverShipmentGroup { shipmentId: string; shipment?: Shipment; deliveries: Delivery[]; }
export interface DriverHistoryDay { key: string; day: number; count: number; groups: DriverShipmentGroup[]; }
export interface DriverHistory { todayCount: number; monthCount: number; missingDates: number; offset: number; days: DriverHistoryDay[]; }

export function driverHistory(deliveries: Delivery[], shipments: Shipment[], driverId: string, year: number, month: number, now: Date = new Date()): DriverHistory {
  const today = saoPauloDate(now);
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const result: DriverHistory = {
    todayCount: 0, monthCount: 0, missingDates: 0,
    offset: new Date(Date.UTC(year, month, 1)).getUTCDay(),
    days: Array.from({ length: new Date(Date.UTC(year, month + 1, 0)).getUTCDate() }, (_, index) => ({ key: `${prefix}-${String(index + 1).padStart(2, '0')}`, day: index + 1, count: 0, groups: [] }))
  };
  if (!driverId) return result;
  const shipmentById = new Map(shipments.map(shipment => [shipment.id, shipment]));
  for (const delivery of deliveries) {
    if (delivery.driverId !== driverId || delivery.status !== 'DELIVERED') continue;
    const completed = completionDate(delivery.deliveredAt);
    if (!completed) { result.missingDates++; continue; }
    const date = saoPauloDate(completed);
    if (date === today) result.todayCount++;
    if (!date.startsWith(`${prefix}-`)) continue;
    const day = result.days[Number(date.slice(-2)) - 1];
    let group = day.groups.find(item => item.shipmentId === delivery.shipmentId);
    if (!group) {
      group = { shipmentId: delivery.shipmentId, shipment: shipmentById.get(delivery.shipmentId), deliveries: [] };
      day.groups.push(group);
    }
    group.deliveries.push(delivery);
    day.count++;
    result.monthCount++;
  }
  return result;
}
