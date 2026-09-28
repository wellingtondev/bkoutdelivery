export type DeliveryStatus='WAITING'|'OUT_FOR_DELIVERY'|'DELIVERED';
export type DeliveryTimestamp = {seconds:number;nanoseconds?:number} | Date | string;
export interface GeoPoint {lat:number;lng:number;}
export interface DriverPosition extends GeoPoint {accuracy:number;updatedAt:DeliveryTimestamp;}
export type PaymentMethod = 'CREDIT' | 'DEBIT' | 'PIX' | 'CASH';
export interface Delivery {id:string;trackingToken:string;shipmentId:string;deliveryDate?:string;createdAt?:DeliveryTimestamp;customerName:string;phone:string;address:string;product:string;orderValue:number;deliveryFee:number;paid:boolean;paymentMethod?:PaymentMethod;installments?:1|2|3;notes?:string;status:DeliveryStatus;lat?:number;lng?:number;deliveredAt?:DeliveryTimestamp;driverId?:string;routeOrder?:number;estimatedArrival?:string|null;}
export interface Shipment {id:string;time:string;date:string;status:'WAITING'|'IN_PROGRESS'|'FINISHED';}
export type NewDelivery = Omit<Delivery, 'id' | 'trackingToken' | 'status'>;
export type PublicTracking = Pick<Delivery, 'shipmentId' | 'customerName' | 'product' | 'orderValue' | 'paid' | 'status'> & {trackingCode:string;deliveryId:string;routePosition?:number|null;estimatedArrival?:string|null;destination?:GeoPoint;driverLocation?:DriverPosition|null;trackingActive?:boolean;deliveredAt?:DeliveryTimestamp};



