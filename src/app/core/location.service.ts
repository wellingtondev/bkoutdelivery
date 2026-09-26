import { Injectable, OnDestroy, signal } from '@angular/core';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Delivery } from '../models/models';

@Injectable({ providedIn: 'root' })
export class LocationService implements OnDestroy {
  readonly activeDeliveryId = signal<string | null>(null);
  readonly starting = signal(false);
  readonly error = signal('');
  readonly lastUpdate = signal<Date | null>(null);
  private watchId?: number;
  private generation = 0;
  private delivery?: Delivery;
  private ownerUid?: string;
  private pending: Promise<void> = Promise.resolve();
  private lastSent = 0;
  private stopAuth = onAuthStateChanged(auth, user => {
    if (this.ownerUid && user?.uid !== this.ownerUid) {
      this.cancelWatch();
      this.delivery = undefined;
      this.ownerUid = undefined;
    }
  });

  async start(delivery: Delivery): Promise<void> {
    if (this.starting()) return;
    this.error.set('');
    if (!navigator.geolocation) { this.error.set('Este navegador não oferece localização.'); return; }
    if (!auth.currentUser) { this.error.set('Entre novamente para compartilhar sua localização.'); return; }
    this.starting.set(true);
    try {
      await this.stop();
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Entre novamente para compartilhar sua localização.');
      const generation = ++this.generation;
      this.ownerUid = uid;
      const privateRef = doc(db, 'shipments', delivery.shipmentId, 'deliveries', delivery.id);
      const publicRef = doc(db, 'tracking', delivery.trackingToken);
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(privateRef);
        if (generation !== this.generation || auth.currentUser?.uid !== uid) throw new Error('Início da entrega cancelado.');
        const current = snapshot.data();
        if (!current || current['status'] === 'DELIVERED') throw new Error('Esta entrega já foi concluída ou não existe.');
        if (current['driverId'] && current['driverId'] !== uid) throw new Error('Esta entrega está com outro entregador.');
        transaction.update(privateRef, { status: 'OUT_FOR_DELIVERY', driverId: uid, startedAt: serverTimestamp() });
        transaction.update(publicRef, { status: 'OUT_FOR_DELIVERY', trackingActive: false, driverLocation: null, startedAt: serverTimestamp() });
      });
      if (generation !== this.generation || auth.currentUser?.uid !== uid) return;
      this.delivery = delivery;
      this.ownerUid = uid;
      this.activeDeliveryId.set(delivery.id);
      this.lastSent = 0;
      this.watchId = navigator.geolocation.watchPosition(position => {
        if (generation !== this.generation) return;
        if (Date.now() - this.lastSent < 5000) return;
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        if (![lat, lng, accuracy].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
        this.lastSent = Date.now();
        this.pending = this.pending.then(async () => {
          if (generation !== this.generation) return;
          await runTransaction(db, async transaction => {
            const snapshot = await transaction.get(privateRef);
            const current = snapshot.data();
            if (!current || current['status'] !== 'OUT_FOR_DELIVERY' || current['driverId'] !== uid) throw new Error('O compartilhamento foi encerrado para esta entrega.');
            transaction.update(publicRef, {
              trackingActive: true,
              driverLocation: { lat, lng, accuracy, updatedAt: serverTimestamp() }
            });
          });
          if (generation === this.generation) { this.lastUpdate.set(new Date()); this.error.set(''); }
        }).catch(error => {
          if (generation === this.generation) this.error.set(error instanceof Error ? error.message : 'Não foi possível atualizar a localização.');
        });
      }, error => {
        if (generation !== this.generation) return;
        this.error.set(error.code === 1 ? 'Permita o GPS no navegador para compartilhar a localização.' : 'Sinal de GPS indisponível. Tente novamente em local aberto.');
        void this.stop().catch(() => this.error.set('GPS interrompido. Não foi possível avisar o cliente; a posição será marcada como desatualizada.'));
      }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível iniciar a entrega.');
    } finally {
      this.starting.set(false);
    }
  }

  private cancelWatch(): void {
    ++this.generation;
    if (this.watchId !== undefined) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = undefined;
    this.activeDeliveryId.set(null);
    this.lastUpdate.set(null);
  }

  async stop(): Promise<void> {
    const delivery = this.delivery;
    const uid = this.ownerUid;
    this.cancelWatch();
    await this.pending;
    if (delivery && uid && auth.currentUser?.uid === uid) {
      const privateRef = doc(db, 'shipments', delivery.shipmentId, 'deliveries', delivery.id);
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(privateRef);
        if (snapshot.data()?.['driverId'] === uid) {
          transaction.update(doc(db, 'tracking', delivery.trackingToken), { trackingActive: false, driverLocation: null });
        }
      });
    }
    this.delivery = undefined;
    this.ownerUid = undefined;
  }

  ngOnDestroy(): void { this.stopAuth(); this.cancelWatch(); }
}
