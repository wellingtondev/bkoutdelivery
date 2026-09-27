import { Component, LOCALE_ID, signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouterLink, RouterOutlet } from '@angular/router';
import { of } from 'rxjs';
import { DeliveryService } from '../../src/app/core/delivery.service';
import { AuthService } from '../../src/app/core/auth.service';
import { StoreComponent } from '../../src/app/pages/store/store.component';
import { TrackingComponent } from '../../src/app/pages/tracking/tracking.component';
import { DriverComponent } from '../../src/app/pages/driver/driver.component';
import { LocationService } from '../../src/app/core/location.service';
import { Delivery, NewDelivery, PublicTracking, Shipment } from '../../src/app/models/models';

registerLocaleData(localePt, 'pt-BR');
const now = new Date();
const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
const destination = { lat: -19.74999, lng: -47.93670 };
const base: Delivery = {
  id: 'fixture-1', trackingToken: 'demo', shipmentId: 'fixture-shipment',
  customerName: 'Cliente de demonstração', phone: '(11) 00000-0000',
  address: 'Praça Rui Barbosa, Uberaba — MG (destino público de teste)',
  product: 'Pedido de demonstração', orderValue: 120, deliveryFee: 8,
  paid: true, status: 'WAITING', ...destination,
};
const deliveries = signal<Delivery[]>([
  { ...base, id: 'fixture-1', customerName: 'Ana · demonstração', status: 'DELIVERED', deliveredAt: new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 1), 14).toISOString() },
  { ...base, id: 'fixture-2', customerName: 'Bruno · demonstração', orderValue: 85.5, deliveryFee: 12, status: 'DELIVERED', deliveredAt: now.toISOString() },
  { ...base, id: 'fixture-3', customerName: 'Diego · demonstração', paid: false },
]);
const shipments = signal<Shipment[]>([{ id: 'fixture-shipment', date: today, time: '18:00', status: 'WAITING' }]);
const service = {
  shipments, deliveries, error: signal(''), loading: signal(false),
  async createShipment(shipment: Pick<Shipment, 'date' | 'time'>): Promise<string> {
    const id = `fixture-${crypto.randomUUID()}`;
    shipments.update(items => [...items, { ...shipment, id, status: 'WAITING' }]);
    return id;
  },
  async manageDelivery(shipmentId:string,id:string,action:'paid'|'delete'){ deliveries.update(items=>action==='delete'?items.filter(d=>d.id!==id):items.map(d=>d.id===id?{...d,paid:true}:d)); },
  async add(delivery: NewDelivery): Promise<string> {
    const id = `fixture-${crypto.randomUUID()}`;
    deliveries.update(items => [...items, { ...delivery, id, trackingToken: 'demo', status: 'WAITING' }]);
    return id;
  },
  byToken(_token: string) {
    const tracking: PublicTracking = {
      trackingCode: 'demo', shipmentId: base.shipmentId, deliveryId: 'fixture-3',
      customerName: 'Diego', product: base.product, orderValue: base.orderValue, paid: true,
      estimatedArrival:new Date(Date.now()+3600000).toISOString(), routePosition:2, status: 'OUT_FOR_DELIVERY', destination, trackingActive: true,
      driverLocation: { lat: -23.5478, lng: -46.6371, accuracy: 12, updatedAt: new Date() },
    };
    return of(tracking);
  },
};

const driverDeliveries = signal<Delivery[]>([
  ...Array.from({length:10}, (_, index) => ({ ...base, id: 'driver-fixture-' + index, customerName: 'Cliente fictício ' + (index + 1), shipmentId: index < 6 ? 'fixture-shipment' : 'fixture-evening', driverId: 'fixture-driver', status: 'DELIVERED' as const, deliveredAt: now.toISOString() })),
  { ...base, id: 'other-driver', driverId: 'another-driver', status: 'DELIVERED', deliveredAt: now.toISOString() },
  { ...base, id: 'legacy-unassigned', status: 'DELIVERED', deliveredAt: now.toISOString() },
  { ...base, id: 'driver-open', customerName: 'Entrega em aberto · teste',paid:false,paymentMethod:'CREDIT',installments:3,notes:'Tocar o interfone. Cliente de teste.',phone:'34999991234' },
  { ...base, id: 'driver-open-two', customerName: 'Segunda parada · teste',paid:false,paymentMethod:'PIX',shipmentId:'fixture-evening' }
]);
const driverService = {
  ...service, deliveries: driverDeliveries,
  shipments: signal<Shipment[]>([...shipments(), {id:'fixture-evening',date:today,time:'20:00',status:'WAITING'}]),
  async saveRoute(ids:string[],estimates:Record<string,string|null>={}) { driverDeliveries.update(items=>items.map(item=>ids.includes(item.id)?{...item,driverId:'fixture-driver',routeOrder:ids.indexOf(item.id)+1,...(item.id in estimates?{estimatedArrival:estimates[item.id]}:{})}:item)); },
  async confirm(id:string) { driverDeliveries.update(items => items.map(item => item.id === id ? {...item, driverId:'fixture-driver', status:'DELIVERED', deliveredAt:new Date().toISOString()} : item)); }
};
const previewLocation = {activeDeliveryId:signal<string|null>(null),starting:signal(false),error:signal(''),lastUpdate:signal<Date|null>(null),async start(delivery:Delivery){this.activeDeliveryId.set(delivery.id);},async stop(){this.activeDeliveryId.set(null);}};

@Component({
  selector: 'app-root', standalone: true, imports: [RouterOutlet, RouterLink],
  template: `<aside class="test-banner">Prévia de teste · dados fictícios · sem gravações no Firebase <nav><a routerLink="/loja">Loja</a><a routerLink="/entregador">Entregador</a><a routerLink="/track/demo">Acompanhamento</a></nav></aside><router-outlet />`,
  styles: [`.test-banner{position:relative;z-index:10000;padding:10px 16px;background:#463b12;color:#fff1ab;font:13px/1.5 system-ui;text-align:center;border-bottom:1px solid #8c7528}.test-banner nav{display:inline-flex;gap:14px;margin-left:18px}.test-banner a{color:#fff;text-decoration:underline}`],
})
class VisualPreviewComponent {}

bootstrapApplication(VisualPreviewComponent, {
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: DeliveryService, useValue: service },
    { provide: AuthService, useValue: { user:{uid:'fixture-driver'}, logout: async () => undefined } },
    { provide: LocationService, useValue: previewLocation },
    provideRouter([
      { path: 'loja', component: StoreComponent },
      { path: 'entregador', component: DriverComponent, providers:[{provide:DeliveryService,useValue:driverService}] },
      { path: 'track/:token', component: TrackingComponent },
      { path: '', pathMatch: 'full', redirectTo: 'loja' },
      { path: '**', redirectTo: 'loja' },
    ]),
  ],
}).catch(error => console.error(error));
