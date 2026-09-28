import type { Delivery, Shipment } from '../../models/models';
import { deliveryDay } from '../../core/shipment-calendar';

export interface DriverDayGroup { id: string; label: string; deliveries: Delivery[]; }

/** Groups an already ordered job list without hiding overdue deliveries. */
export function driverDayGroups(deliveries: Delivery[], shipments: Shipment[]): DriverDayGroup[] {
  const groups = new Map<string, DriverDayGroup>();
  const byId = new Map(shipments.map(shipment => [shipment.id, shipment]));
  for (const delivery of deliveries) {
    const time = byId.get(delivery.shipmentId)?.time;
    const day = deliveryDay(delivery, shipments);
    const id = `${day ?? 'unknown'}/${time ?? delivery.shipmentId}`;
    let group = groups.get(id);
    if (!group) {
      const dateLabel = day ? day.split('-').reverse().join('/') : 'Data não informada';
      group = { id, label: `Remessa ${dateLabel}${time ? ' · ' + time : ''}`, deliveries: [] };
      groups.set(id, group);
    }
    group.deliveries.push(delivery);
  }
  return [...groups.values()];
}
