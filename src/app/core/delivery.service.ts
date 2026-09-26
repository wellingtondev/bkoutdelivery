import { Injectable, OnDestroy, signal } from '@angular/core';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, onSnapshot, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Observable, Subscription } from 'rxjs';
import { Delivery, NewDelivery, PublicTracking, Shipment } from '../models/models';
import { auth, db } from './firebase';

@Injectable({ providedIn: 'root' })
export class DeliveryService implements OnDestroy {
  readonly shipments = signal<Shipment[]>([]);
  readonly deliveries = signal<Delivery[]>([]);
  readonly error = signal('');
  readonly loading = signal(true);
  private shipmentSubscription?: Subscription;
  private stopProfile?: () => void;
  private deliverySubscriptions = new Map<string, Subscription>();
  private deliveryGroups = new Map<string, Delivery[]>();
  private stopAuth = onAuthStateChanged(auth, user => {
    this.stopProfile?.();
    this.clearStaffData();
    if (!user) { this.loading.set(false); return; }
    this.stopProfile = onSnapshot(doc(db, 'users', user.uid), profile => {
      this.clearStaffData();
      const data = profile.data();
      if (data && data['active'] !== false && ['STORE', 'DRIVER'].includes(data['role'])) this.listenStaffData();
      else this.loading.set(false);
    }, () => { this.clearStaffData(); this.loading.set(false); this.error.set('Não foi possível carregar o perfil.'); });
  });

  private clearStaffData(): void {
    this.shipmentSubscription?.unsubscribe();
    this.deliverySubscriptions.forEach(subscription => subscription.unsubscribe());
    this.deliverySubscriptions.clear();
    this.deliveryGroups.clear();
    this.shipments.set([]);
    this.deliveries.set([]);
    this.error.set('');
    this.loading.set(true);
  }

  private listenStaffData(): void {
    this.shipmentSubscription = this.getShipments().subscribe({
      next: shipments => {
        this.shipments.set(shipments);
        this.loading.set(shipments.length > 0);
        const ids = new Set(shipments.map(shipment => shipment.id));
        for (const [id, subscription] of this.deliverySubscriptions) {
          if (!ids.has(id)) { subscription.unsubscribe(); this.deliverySubscriptions.delete(id); this.deliveryGroups.delete(id); }
        }
        for (const shipment of shipments) {
          if (this.deliverySubscriptions.has(shipment.id)) continue;
          this.deliverySubscriptions.set(shipment.id, this.getDeliveries(shipment.id).subscribe({
            next: deliveries => {
              this.deliveryGroups.set(shipment.id, deliveries);
              this.deliveries.set([...this.deliveryGroups.values()].flat());
              this.loading.set(this.deliveryGroups.size < this.shipments().length);
            },
            error: () => { this.loading.set(false); this.error.set('Não foi possível carregar as entregas.'); }
          }));
        }
        this.deliveries.set([...this.deliveryGroups.values()].flat());
        this.loading.set(this.deliveryGroups.size < shipments.length);
      },
      error: () => { this.loading.set(false); this.error.set('Não foi possível carregar as remessas.'); }
    });
  }

  getShipments(): Observable<Shipment[]> {
    return new Observable(subscriber => onSnapshot(collection(db, 'shipments'), snapshot => {
      subscriber.next(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Shipment)));
    }, error => subscriber.error(error)));
  }

  getDeliveries(shipmentId: string): Observable<Delivery[]> {
    return new Observable(subscriber => onSnapshot(collection(db, 'shipments', shipmentId, 'deliveries'), snapshot => {
      subscriber.next(snapshot.docs.map(item => {
        const data = item.data();
        return { ...data, id: item.id, shipmentId, trackingToken: data['trackingToken'] ?? data['trackingCode'] } as Delivery;
      }));
    }, error => subscriber.error(error)));
  }

  async createShipment(shipment: Pick<Shipment, 'date' | 'time'>): Promise<string> {
    const { date, time } = shipment;
    const parsedDate = new Date(`${date}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw new Error('Informe uma data e um horário válidos para a remessa.');
    }
    const result = await addDoc(collection(db, 'shipments'), { date, time, status: 'WAITING', createdAt: serverTimestamp() });
    return result.id;
  }

  async createDelivery(shipmentId: string, delivery: NewDelivery | Delivery): Promise<string> {
    if (!shipmentId) throw new Error('Selecione uma remessa.');
    if (!delivery.address.trim() || !Number.isFinite(delivery.lat) || !Number.isFinite(delivery.lng) || Math.abs(delivery.lat!) > 90 || Math.abs(delivery.lng!) > 180) {
      throw new Error('Informe o endereço e confirme o destino no mapa.');
    }
    const deliveryRef = doc(collection(db, 'shipments', shipmentId, 'deliveries'));
    const trackingCode = crypto.randomUUID();
    const batch = writeBatch(db);
    batch.set(deliveryRef, {
      shipmentId, trackingCode, trackingToken: trackingCode,
      customerName: delivery.customerName, phone: delivery.phone, address: delivery.address,
      lat: delivery.lat, lng: delivery.lng,
      product: delivery.product, orderValue: delivery.orderValue, deliveryFee: delivery.deliveryFee,
      paid: delivery.paid, status: 'WAITING', createdAt: serverTimestamp()
    });
    batch.set(doc(db, 'tracking', trackingCode), {
      trackingCode, shipmentId, deliveryId: deliveryRef.id,
      customerName: delivery.customerName, product: delivery.product,
      orderValue: delivery.orderValue, paid: delivery.paid,
      destination: { lat: delivery.lat, lng: delivery.lng }, trackingActive: false,
      status: 'WAITING', createdAt: serverTimestamp()
    });
    await batch.commit();
    return deliveryRef.id;
  }

  add(delivery: NewDelivery): Promise<string> {
    if (!this.shipments().some(shipment => shipment.id === delivery.shipmentId)) return Promise.reject(new Error('Selecione uma remessa existente.'));
    return this.createDelivery(delivery.shipmentId, delivery);
  }

  getTracking(trackingCode: string): Observable<PublicTracking | undefined> {
    return new Observable(subscriber => {
      if (!trackingCode || trackingCode.includes('/')) { subscriber.next(undefined); subscriber.complete(); return; }
      return onSnapshot(doc(db, 'tracking', trackingCode), snapshot => {
        const data = snapshot.data();
        subscriber.next(data ? { ...data, orderValue: data['orderValue'] ?? 0, paid: data['paid'] ?? false } as PublicTracking : undefined);
      }, error => subscriber.error(error));
    });
  }

  byToken(token: string): Observable<PublicTracking | undefined> { return this.getTracking(token); }

  async startDelivery(shipmentId: string, deliveryId: string, trackingCode: string): Promise<void> {
    await this.updateStatus(shipmentId, deliveryId, trackingCode, { status: 'OUT_FOR_DELIVERY', startedAt: serverTimestamp() });
  }

  async finishDelivery(shipmentId: string, deliveryId: string, trackingCode: string): Promise<void> {
    const deliveryRef = doc(db, 'shipments', shipmentId, 'deliveries', deliveryId);
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(deliveryRef);
      if (!snapshot.exists()) throw new Error('Entrega não encontrada.');
      // Retries must not move a completed delivery into another month's closing.
      if (snapshot.data()['status'] === 'DELIVERED') return;
      const driverId = auth.currentUser?.uid;
      if (!driverId) throw new Error('Entre novamente para confirmar a entrega.');
      if (snapshot.data()['driverId'] && snapshot.data()['driverId'] !== driverId) {
        throw new Error('Esta entrega está com outro entregador.');
      }
      const update = { status: 'DELIVERED', deliveredAt: serverTimestamp(), trackingActive: false, driverLocation: null };
      transaction.update(deliveryRef, { ...update, driverId });
      transaction.update(doc(db, 'tracking', trackingCode), update);
    });
  }

  async confirm(deliveryId: string): Promise<void> {
    const delivery = this.deliveries().find(item => item.id === deliveryId);
    if (!delivery) throw new Error('Entrega não encontrada.');
    await this.finishDelivery(delivery.shipmentId, delivery.id, delivery.trackingToken);
  }

  private async updateStatus(shipmentId: string, deliveryId: string, trackingCode: string, update: object): Promise<void> {
    const batch = writeBatch(db);
    batch.update(doc(db, 'shipments', shipmentId, 'deliveries', deliveryId), update);
    batch.update(doc(db, 'tracking', trackingCode), update);
    await batch.commit();
  }

  ngOnDestroy(): void { this.stopAuth(); this.stopProfile?.(); this.clearStaffData(); }
}
