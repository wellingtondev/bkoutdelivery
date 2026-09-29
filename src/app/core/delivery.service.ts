import { Injectable, OnDestroy, signal } from '@angular/core';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Observable, Subscription } from 'rxjs';
import { Delivery, NewDelivery, PublicTracking, Shipment } from '../models/models';
import { auth, db } from './firebase';
import { normalizePayment, amountToCollect } from './payment';
import { routeEntries, routeEntry, routeKey } from './delivery-route';
import { recurringShipments, saoPauloDay, validDeliveryDate } from './shipment-calendar';
import { DeliveryZones, deliveryFeeForPoint } from './delivery-zones';

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
    if (!validDeliveryDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw new Error('Informe uma data e um horário válidos para a remessa.');
    }
    const existing = recurringShipments(this.shipments()).find(item => item.time === time);
    if (existing) return existing.id;
    const ref = doc(db, 'shipments', `slot-${time.replace(':', '')}`);
    await runTransaction(db, async transaction => {
      const current = await transaction.get(ref);
      if (!current.exists()) transaction.set(ref, { date, time, status: 'WAITING', createdAt: serverTimestamp() });
      else if (current.data()['time'] !== time) throw new Error('O identificador deste horário já está em uso.');
    });
    return ref.id;
  }

  async createDelivery(shipmentId: string, delivery: NewDelivery | Delivery): Promise<string> {
    if (!shipmentId) throw new Error('Selecione uma remessa.');
    const manual=delivery.manualEntry===true;
    const hasPoint=Number.isFinite(delivery.lat)&&Number.isFinite(delivery.lng)&&Math.abs(delivery.lat!)<=90&&Math.abs(delivery.lng!)<=180;
    const noPoint=delivery.lat==null&&delivery.lng==null;
    if (!delivery.address.trim() || (!hasPoint && !(manual&&noPoint))) {
      throw new Error('Informe o endereço e confirme o destino no mapa.');
    }
    if(![delivery.orderValue,delivery.deliveryFee].every(value=>Number.isFinite(value)&&value>=0))throw new Error('Informe valores válidos para o pedido e a taxa.');
    const payment = normalizePayment(delivery);
    const deliveryDate = delivery.deliveryDate === undefined ? saoPauloDay() : delivery.deliveryDate;
    if (!validDeliveryDate(deliveryDate)) throw new Error('Informe uma data válida para a entrega.');
    const creatingUid = auth.currentUser?.uid;
    const zoneSettings = manual ? null : await getDoc(doc(db, 'settings', 'deliveryZones'));
    if (auth.currentUser?.uid !== creatingUid) throw new Error('A sessão mudou. Entre novamente antes de cadastrar a entrega.');
    const quote = zoneSettings?.exists() ? deliveryFeeForPoint({ lat: delivery.lat!, lng: delivery.lng! }, zoneSettings.data() as DeliveryZones) : null;
    if (zoneSettings?.exists() && !quote) throw new Error('As zonas de entrega estão inválidas. Corrija a configuração antes de cadastrar.');
    const deliveryRef = doc(collection(db, 'shipments', shipmentId, 'deliveries'));
    const trackingCode = crypto.randomUUID();
    const batch = writeBatch(db);
    batch.set(deliveryRef, {
      shipmentId, deliveryDate, trackingCode, trackingToken: trackingCode,
      customerName: delivery.customerName, phone: delivery.phone, address: delivery.address,
      ...(hasPoint?{lat: delivery.lat, lng: delivery.lng}:{}), ...(manual?{manualEntry:true}:{}),
      product: delivery.product, orderValue: delivery.orderValue, deliveryFee: quote?.fee ?? delivery.deliveryFee,
      ...(quote ? { feeZone: quote.zone } : {}),
      paid: delivery.paid, ...payment, status: 'WAITING', createdAt: serverTimestamp()
    });
    batch.set(doc(db, 'tracking', trackingCode), {
      trackingCode, shipmentId, deliveryId: deliveryRef.id,
      customerName: delivery.customerName, product: delivery.product,
      orderValue: delivery.orderValue, paid: delivery.paid,
      ...(hasPoint?{destination: { lat: delivery.lat, lng: delivery.lng }}:{}), trackingActive: false,
      status: 'WAITING', createdAt: serverTimestamp()
    });
    await batch.commit();
    return deliveryRef.id;
  }

  add(delivery: NewDelivery): Promise<string> {
    if (!this.shipments().some(shipment => shipment.id === delivery.shipmentId)) return Promise.reject(new Error('Selecione uma remessa existente.'));
    return this.createDelivery(delivery.shipmentId, delivery);
  }

  async updateDelivery(shipmentId: string, deliveryId: string, input: NewDelivery): Promise<void> {
    const uid=auth.currentUser?.uid;
    if(!uid) throw new Error('Entre novamente para alterar a entrega.');
    if(input.shipmentId!==shipmentId) throw new Error('Não é possível mudar a remessa nesta edição.');
    if(![input.customerName,input.phone,input.address,input.product].every(value=>typeof value==='string' && value.trim())) throw new Error('Preencha os dados da entrega.');
    if(![input.orderValue,input.deliveryFee].every(value=>Number.isFinite(value)&&value>=0)) throw new Error('Informe valores válidos.');
    if(typeof input.paid!=='boolean') throw new Error('Informe a situação do pagamento.');
    if(!Number.isFinite(input.lat)||!Number.isFinite(input.lng)||Math.abs(input.lat!)>90||Math.abs(input.lng!)>180) throw new Error('Confirme o destino no mapa.');
    if(!input.deliveryDate||!validDeliveryDate(input.deliveryDate)) throw new Error('Informe uma data válida.');
    const payment=normalizePayment(input);
    await runTransaction(db,async transaction=>{
      const profile=await transaction.get(doc(db,'users',uid));
      if(profile.data()?.['role']!=='STORE'||profile.data()?.['active']===false) throw new Error('Somente a loja pode alterar a entrega.');
      const ref=doc(db,'shipments',shipmentId,'deliveries',deliveryId);
      const snapshot=await transaction.get(ref);
      if(!snapshot.exists()) throw new Error('A entrega não existe mais.');
      const data=snapshot.data();
      if(data['status']==='DELIVERED') throw new Error('Esta entrega foi concluída. Seus dados históricos não podem ser editados.');
      const destinationChanged=data['lat']!==input.lat||data['lng']!==input.lng;
      if(data['paid']&&!input.paid) throw new Error('O pagamento já foi confirmado. Atualize a página antes de editar.');
      const token=data['trackingToken']??data['trackingCode'];
      if(!token) throw new Error('Esta entrega não possui tracking válido.');
      const trackingRef=doc(db,'tracking',token);
      const tracking=await transaction.get(trackingRef);
      if(!tracking.exists()) throw new Error('O tracking não existe mais.');
      let deliveryFee=data['deliveryFee'];
      let feeZone=data['feeZone']??null;
      if(destinationChanged){
        const zones=await transaction.get(doc(db,'settings','deliveryZones'));
        const quote=zones.exists()?deliveryFeeForPoint({lat:input.lat!,lng:input.lng!},zones.data() as DeliveryZones):null;
        if(zones.exists()&&!quote) throw new Error('Corrija a configuração das zonas antes de alterar o destino.');
        deliveryFee=quote?.fee??input.deliveryFee;feeZone=quote?.zone??null;
      }
      const peers: {ref:ReturnType<typeof doc>;tracking:ReturnType<typeof doc>|null}[]=[];
      if(destinationChanged&&data['driverId']){
        const manifest=await transaction.get(doc(db,'driverLocations',data['driverId']));
        for(const entry of routeEntries(manifest.data()?.['routeEntries'])){
          if(entry.id===deliveryId&&entry.shipmentId===shipmentId)continue;
          const peerRef=doc(db,'shipments',entry.shipmentId,'deliveries',entry.id);
          const peer=await transaction.get(peerRef);
          if(!peer.exists()||peer.data()['driverId']!==data['driverId']||peer.data()['status']==='DELIVERED')continue;
          const peerTrackingRef=doc(db,'tracking',entry.trackingToken);
          const peerTracking=await transaction.get(peerTrackingRef);
          peers.push({ref:peerRef,tracking:peerTracking.exists()?peerTrackingRef:null});
        }
      }
      if(auth.currentUser?.uid!==uid) throw new Error('Sua sessão mudou. Entre novamente.');
      transaction.update(ref,{
        customerName:input.customerName.trim(),phone:input.phone.trim(),address:input.address.trim(),product:input.product.trim(),
        orderValue:input.orderValue,deliveryFee,feeZone,paid:input.paid,
        notes:payment.notes??'',paymentMethod:payment.paymentMethod??null,installments:payment.installments??null,
        lat:input.lat,lng:input.lng,updatedAt:serverTimestamp(),...(destinationChanged?{estimatedArrival:null}:{})
      });
      transaction.update(trackingRef,{customerName:input.customerName.trim(),product:input.product.trim(),orderValue:input.orderValue,paid:input.paid,destination:{lat:input.lat,lng:input.lng},...(destinationChanged?{estimatedArrival:null}:{})});
      for(const peer of peers){transaction.update(peer.ref,{estimatedArrival:null});if(peer.tracking)transaction.update(peer.tracking,{estimatedArrival:null});}
    });
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

  async finishDelivery(shipmentId: string, deliveryId: string, trackingCode: string, receivedAmount?: number): Promise<void> {
    const deliveryRef = doc(db, 'shipments', shipmentId, 'deliveries', deliveryId);
    const driverId = auth.currentUser?.uid;
    if (!driverId) throw new Error('Entre novamente para confirmar a entrega.');
    const manifestRef = doc(db, 'driverLocations', driverId);
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(deliveryRef);
      if (!snapshot.exists()) throw new Error('Entrega não encontrada.');
      // Retries must not move a completed delivery into another month's closing.
      if (snapshot.data()['status'] === 'DELIVERED') return;
      if (snapshot.data()['driverId'] && snapshot.data()['driverId'] !== driverId) {
        throw new Error('Esta entrega está com outro entregador.');
      }
      const received=receivedAmount!==undefined && !snapshot.data()['paid'];
      if(received && (!Number.isFinite(receivedAmount)||Math.round(receivedAmount!*100)!==Math.round(amountToCollect(snapshot.data() as Delivery)*100)))throw new Error('O valor da entrega mudou. Confira o valor atualizado e confirme o recebimento novamente.');
      const manifest = await transaction.get(manifestRef);
      const entries = routeEntries(manifest.data()?.['routeEntries']).filter(entry => entry.id !== deliveryId || entry.shipmentId !== shipmentId);
      const remaining = [];
      for (const entry of entries) {
        const ref = doc(db, 'shipments', entry.shipmentId, 'deliveries', entry.id);
        const current = await transaction.get(ref);
        if (current.exists() && current.data()['driverId'] === driverId && current.data()['status'] !== 'DELIVERED') remaining.push({ entry, ref });
      }
      if (auth.currentUser?.uid !== driverId) throw new Error('Entre novamente para confirmar a entrega.');
      const update = { status: 'DELIVERED', deliveredAt: serverTimestamp(), trackingActive: false, driverLocation: null, routePosition: null, estimatedArrival: null };
      const paymentUpdate=received?{paid:true,paidAt:serverTimestamp(),receivedBy:driverId}:{};
      transaction.update(deliveryRef, { ...update, driverId, ...paymentUpdate });
      transaction.update(doc(db, 'tracking', trackingCode), {...update,...(received?{paid:true}:{})});
      remaining.forEach(({ entry, ref }, index) => {
        transaction.update(ref, { routeOrder: index + 1 });
        transaction.update(doc(db, 'tracking', entry.trackingToken), { routePosition: index + 1 });
      });
      if (manifest.exists()) transaction.set(manifestRef, { routeEntries: remaining.map(item => item.entry) }, { merge: true });
    });
  }

  async saveRoute(deliveryIds: string[], estimates: Record<string, string | null> = {}, calculatedPoints?: Record<string, {lat?:number;lng?:number}>): Promise<void> {
    const driverId = auth.currentUser?.uid;
    if (!driverId) throw new Error('Entre novamente para organizar a rota.');
    if (!deliveryIds.length || deliveryIds.length > 100) throw new Error('Selecione entre 1 e 100 entregas.');
    if (new Set(deliveryIds).size !== deliveryIds.length) throw new Error('A rota contém entrega repetida.');
    const now = Date.now();
    for (const [id, estimate] of Object.entries(estimates)) {
      if (!deliveryIds.includes(id)) throw new Error('A previsão deve pertencer a uma entrega da rota.');
      if (estimate === null) continue;
      const parsed = typeof estimate === 'string' ? new Date(estimate) : new Date(NaN);
      if (typeof estimate !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(estimate) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().replace('.000Z', 'Z') !== estimate.replace('.000Z', 'Z') || parsed.getTime() <= now || parsed.getTime() > now + 7 * 86400000) {
        throw new Error('Informe uma previsão futura válida, com data e horário, dentro dos próximos 7 dias.');
      }
    }
    const selected = deliveryIds.map(id => {
      const delivery = this.deliveries().find(item => item.id === id);
      if (!delivery) throw new Error('Entrega não encontrada. Atualize a lista.');
      return routeEntry(delivery);
    });
    const selectedKeys = new Set(selected.map(routeKey));
    const manifestRef = doc(db, 'driverLocations', driverId);
    await runTransaction(db, async transaction => {
      const manifest = await transaction.get(manifestRef);
      const previous = routeEntries(manifest.data()?.['routeEntries']).filter(entry => !selectedKeys.has(routeKey(entry)));
      const all = [...selected, ...previous];
      if (all.length > 100) throw new Error('A rota comporta até 100 entregas.');
      const active = [];
      for (const entry of all) {
        const ref = doc(db, 'shipments', entry.shipmentId, 'deliveries', entry.id);
        const current = await transaction.get(ref);
        const data = current.data();
        const requested = selectedKeys.has(routeKey(entry));
        if (!current.exists()) { if (requested) throw new Error('Entrega não encontrada.'); else continue; }
        if (data!['status'] === 'DELIVERED') { if (requested) throw new Error('Esta entrega já foi concluída.'); else continue; }
        if (data!['driverId'] && data!['driverId'] !== driverId) { if (requested) throw new Error('Esta entrega está com outro entregador.'); else continue; }
        if (calculatedPoints && requested) {
          const point=calculatedPoints[entry.id];
          if(!point || point.lat!==data!['lat'] || point.lng!==data!['lng']) throw new Error('O destino mudou durante o cálculo. Recalcule a rota.');
        }
        active.push({ entry, ref });
      }
      if (auth.currentUser?.uid !== driverId) throw new Error('Entre novamente para organizar a rota.');
      active.forEach(({ entry, ref }, index) => {
        const estimate = Object.prototype.hasOwnProperty.call(estimates, entry.id) ? { estimatedArrival: estimates[entry.id] } : calculatedPoints ? {estimatedArrival:null} : {};
        transaction.update(ref, { driverId, routeOrder: index + 1, ...estimate });
        transaction.update(doc(db, 'tracking', entry.trackingToken), { routePosition: index + 1, ...estimate });
      });
      transaction.set(manifestRef, { routeEntries: active.map(item => item.entry) }, { merge: true });
    });
  }

  async confirm(deliveryId: string, receivedAmount?: number): Promise<void> {
    const delivery = this.deliveries().find(item => item.id === deliveryId);
    if (!delivery) throw new Error('Entrega não encontrada.');
    await this.finishDelivery(delivery.shipmentId, delivery.id, delivery.trackingToken, receivedAmount);
  }

  async manageDelivery(shipmentId: string, deliveryId: string, action: 'paid' | 'delete'): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Entre novamente para atualizar a entrega.');
    if (!['paid', 'delete'].includes(action)) throw new Error('Ação inválida.');
    await runTransaction(db, async transaction => {
      const profile = await transaction.get(doc(db, 'users', uid));
      if (profile.data()?.['role'] !== 'STORE' || profile.data()?.['active'] === false) throw new Error('Somente a loja pode alterar o pagamento ou excluir entregas.');
      const ref = doc(db, 'shipments', shipmentId, 'deliveries', deliveryId);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('A entrega não existe mais. Atualize a página.');
      const data = snapshot.data();
      const token = data['trackingToken'] ?? data['trackingCode'];
      const trackingRef = token ? doc(db, 'tracking', token) : null;
      const tracking = trackingRef ? await transaction.get(trackingRef) : null;
      const manifestRef = action === 'delete' && data['driverId'] ? doc(db, 'driverLocations', data['driverId']) : null;
      const manifest = manifestRef ? await transaction.get(manifestRef) : null;
      const remaining = [];
      if (manifest?.exists()) {
        for (const entry of routeEntries(manifest.data()?.['routeEntries'])) {
          if (entry.id === deliveryId && entry.shipmentId === shipmentId) continue;
          const peerRef = doc(db, 'shipments', entry.shipmentId, 'deliveries', entry.id);
          const peer = await transaction.get(peerRef);
          if (!peer.exists() || peer.data()['status'] === 'DELIVERED' || peer.data()['driverId'] !== data['driverId']) continue;
          const peerTrackingRef = doc(db, 'tracking', entry.trackingToken);
          const peerTracking = await transaction.get(peerTrackingRef);
          remaining.push({ entry, ref: peerRef, trackingRef: peerTracking.exists() ? peerTrackingRef : null });
        }
      }
      if (auth.currentUser?.uid !== uid) throw new Error('Sua sessão mudou. Entre novamente.');
      if (action === 'paid') {
        if (!data['paid']) transaction.update(ref, { paid: true, paidAt: serverTimestamp() });
        if (trackingRef && tracking?.exists()) transaction.update(trackingRef, { paid: true });
      } else {
        transaction.delete(ref);
        if (trackingRef) transaction.delete(trackingRef);
        remaining.forEach((peer, index) => {
          transaction.update(peer.ref, { routeOrder: index + 1, estimatedArrival: null });
          if (peer.trackingRef) transaction.update(peer.trackingRef, { routePosition: index + 1, estimatedArrival: null });
        });
        if (manifestRef && manifest?.exists()) transaction.update(manifestRef, { routeEntries: remaining.map(peer => peer.entry) });
      }
    });
  }

  private async updateStatus(shipmentId: string, deliveryId: string, trackingCode: string, update: object): Promise<void> {
    const batch = writeBatch(db);
    batch.update(doc(db, 'shipments', shipmentId, 'deliveries', deliveryId), update);
    batch.update(doc(db, 'tracking', trackingCode), update);
    await batch.commit();
  }

  ngOnDestroy(): void { this.stopAuth(); this.stopProfile?.(); this.clearStaffData(); }
}
