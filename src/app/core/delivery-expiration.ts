import type { Delivery, Shipment } from '../models/models';
import { deliveryDay, saoPauloDay } from './shipment-calendar';

export function isDeliveryExpired(delivery: Delivery, shipments: Shipment[], now: Date = new Date()): boolean {
  if (!['WAITING', 'OUT_FOR_DELIVERY'].includes(delivery.status) || !Number.isFinite(now.getTime())) return false;
  const scheduledDay = deliveryDay(delivery, shipments);
  if (!scheduledDay) return false;
  const today = saoPauloDay(now);
  if (scheduledDay !== today) return scheduledDay < today;
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' }).format(now));
  return hour >= 22;
}
