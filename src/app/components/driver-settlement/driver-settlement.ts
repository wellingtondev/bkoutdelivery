import { Delivery } from '../../models/models';
import { cents, completionDate, saoPauloDate } from '../monthly-summary/monthly-summary';
import { validDeliveryDate } from '../../core/shipment-calendar';
export interface SettlementDay {key:string;count:number;feeCents:number;deliveries:Delivery[];}
export interface SettlementGroup {driverId:string|null;count:number;feeCents:number;days:SettlementDay[];}
export interface Settlement {count:number;feeCents:number;groups:SettlementGroup[];missingDates:number;invalidFees:number;error:string;}
export function settlementWeek(now=new Date(),offset=0):{start:string;end:string}{
  const date=new Date(`${saoPauloDate(now)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7)+offset*7);
  const start=date.toISOString().slice(0,10);date.setUTCDate(date.getUTCDate()+6);
  return {start,end:date.toISOString().slice(0,10)};
}
export function driverSettlement(deliveries:readonly Delivery[],start:string,end:string):Settlement {
  const result:Settlement={count:0,feeCents:0,groups:[],missingDates:0,invalidFees:0,error:''};
  if(!validDeliveryDate(start)||!validDeliveryDate(end)||start>end){result.error='Informe uma data inicial e uma data final válidas, em ordem.';return result;}
  const groups=new Map<string|null,SettlementGroup>();
  for(const delivery of deliveries){
    if(delivery.status!=='DELIVERED')continue;
    const date=completionDate(delivery.deliveredAt);
    if(!date){result.missingDates++;continue;}
    const key=saoPauloDate(date);if(key<start||key>end)continue;
    if(!Number.isFinite(delivery.deliveryFee)||delivery.deliveryFee<0){result.invalidFees++;continue;}
    const driverId=typeof delivery.driverId==='string'&&delivery.driverId.trim()?delivery.driverId:null;
    let group=groups.get(driverId);if(!group){group={driverId,count:0,feeCents:0,days:[]};groups.set(driverId,group);}
    let day=group.days.find(day=>day.key===key);if(!day){day={key,count:0,feeCents:0,deliveries:[]};group.days.push(day);}
    const fee=cents(delivery.deliveryFee);day.deliveries.push(delivery);day.count++;day.feeCents+=fee;group.count++;group.feeCents+=fee;result.count++;result.feeCents+=fee;
  }
  result.groups=[...groups.values()].sort((a,b)=>a.driverId===null?1:b.driverId===null?-1:a.driverId.localeCompare(b.driverId));
  result.groups.forEach(group=>group.days.sort((a,b)=>a.key.localeCompare(b.key)));return result;
}
