import { Delivery, GeoPoint } from '../models/models';
export interface CustomerLocation extends GeoPoint { name:string; deliveries:number; }
export function customerLocations(deliveries:readonly Delivery[]):CustomerLocation[] {
  const locations=new Map<string,CustomerLocation>();
  for(const delivery of deliveries){
    if(delivery.status!=='DELIVERED'||!Number.isFinite(delivery.lat)||!Number.isFinite(delivery.lng)||Math.abs(delivery.lat!)>90||Math.abs(delivery.lng!)>180)continue;
    if(typeof delivery.customerName!=='string')continue;
    const name=delivery.customerName.trim().replace(/\s+/g,' ');
    if(!name)continue;
    const key=JSON.stringify([name.normalize('NFKC').toLocaleLowerCase('pt-BR'),delivery.lat,delivery.lng]);
    const existing=locations.get(key);
    if(existing)existing.deliveries++;
    else locations.set(key,{name,lat:delivery.lat!,lng:delivery.lng!,deliveries:1});
  }
  return [...locations.values()];
}
