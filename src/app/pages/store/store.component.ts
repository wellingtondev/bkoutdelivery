import { Component, OnDestroy, computed, effect, signal } from '@angular/core';
import { DeliveryZonesService } from '../../core/delivery-zones.service';
import { DeliveryZones, deliveryFeeForPoint } from '../../core/delivery-zones';
import { DeliveryZonesEditorComponent } from '../../components/delivery-zones-editor/delivery-zones-editor.component';
import { recurringShipments, deliveryDay, saoPauloDay } from '../../core/shipment-calendar';
import { searchUberaba } from '../../core/address-search';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Delivery, NewDelivery, Shipment } from '../../models/models';
import { DeliveryService } from '../../core/delivery.service';
import { DeliveryMapComponent } from '../../components/delivery-map/delivery-map.component';
import { MonthlySummaryComponent } from '../../components/monthly-summary/monthly-summary.component';
import { AuthService } from '../../core/auth.service';
import { amountToCollect, paymentLabel } from '../../core/payment';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DeliveryMapComponent, MonthlySummaryComponent, DeliveryZonesEditorComponent],
  templateUrl: './store.component.html',
  styles: [`
    .delivery-actions{display:flex;gap:8px;flex-wrap:wrap}.danger{color:#ff8b83}.delivery{flex-wrap:wrap}.store-actions{display:flex;gap:12px;flex-wrap:wrap}
    .empty-state{text-align:center;padding:36px 24px}
    .empty-state .btn{margin:20px auto 0}
    .feedback{color:#ff8b83;line-height:1.5}
    .shipment-date{margin:0 0 8px;color:#a1a1aa}
    .shipment.selected{border-color:#ff5147}
    .modal input,.modal select,.modal textarea{min-width:0;width:100%;box-sizing:border-box}
    .modal textarea{resize:vertical;min-height:90px;background:#09090b;border:1px solid #3f3f46;border-radius:10px;color:#fafafa;padding:12px;font:inherit}
    .collection-total{padding:14px;border:1px solid #ff5147;border-radius:12px;background:#ff514710}.collection-total strong{display:block;font-size:1.4rem;margin-top:4px}
    .modal .check input{width:auto}
    .zone-summary{margin:0 0 24px;line-height:1.6}.zone-summary p{margin:6px 0}.fee-note{line-height:1.5}.fee-note strong{color:#fafafa}.modal input[readonly]{background:#232327;color:#fff;border-color:#565662}
    @media(max-width:760px){.store-actions{width:100%}}
  `]
})
export class StoreComponent implements OnDestroy {
  readonly deliveryAction = signal<{delivery:Delivery;action:'paid'|'delete'}|null>(null);
  readonly actionPending = signal(false);
  readonly actionError = signal('');
  readonly actionMessage = signal('');
  askAction(delivery:Delivery,action:'paid'|'delete'):void {
    this.actionError.set(''); this.actionMessage.set(''); this.deliveryAction.set({delivery,action});
  }
  async confirmAction():Promise<void> {
    const selected=this.deliveryAction();
    if (!selected || this.actionPending()) return;
    this.actionPending.set(true);this.actionError.set('');
    try {
      await this.svc.manageDelivery(selected.delivery.shipmentId,selected.delivery.id,selected.action);
      this.deliveryAction.set(null);
      this.actionMessage.set(selected.action==='paid'?'Entrega marcada como paga. O entregador receberá a atualização.':'Entrega excluída e link de acompanhamento removido.');
    } catch(error) { this.actionError.set(error instanceof Error?error.message:'Não foi possível atualizar a entrega.'); }
    finally { this.actionPending.set(false); }
  }
  readonly amountToCollect = amountToCollect;
  readonly paymentLabel = paymentLabel;
  paymentChanged(): void {
    if (this.form.paid) { this.form.paymentMethod = undefined; this.form.installments = undefined; }
    else if (this.form.paymentMethod !== 'CREDIT') this.form.installments = undefined;
  }
  addressStatus = signal('');
  private addressTimer?: ReturnType<typeof setTimeout>;
  private addressRequest?: AbortController;
  private addressVersion = 0;
  show = signal(false);
  showShipment = signal(false);
  selected = signal('');
  saving = signal(false);
  savingShipment = signal(false);
  error = signal('');
  shipmentError = signal('');
  form: NewDelivery = this.emptyForm();
  shipmentForm = { date: this.today(), time: '' };
  destination = signal<{lat:number;lng:number} | null>(null);

  readonly showZones = signal(false);
  readonly savingZones = signal(false);
  readonly zonesSaveError = signal('');
  readonly zonesMessage = signal('');
  readonly feeQuote = computed(() => {
    const point = this.destination();
    const zones = this.zonesService.config();
    return point && zones ? deliveryFeeForPoint(point, zones) : null;
  });
  readonly feeReady = computed(() => !this.zonesService.loading() && !this.zonesService.error()
    && (!this.zonesService.config() || !!this.feeQuote()));
  readonly feeZoneLabel = computed(() => {
    switch (this.feeQuote()?.zone) {
      case 'GREEN': return 'Zona verde';
      case 'YELLOW': return 'Zona amarela';
      case 'OUTSIDE': return 'Fora da zona amarela';
      default: return 'Marque o destino para calcular';
    }
  });

  constructor(public svc: DeliveryService, public auth: AuthService, public zonesService: DeliveryZonesService) {
    effect(() => this.refreshDeliveryFee());
  }

  refreshDeliveryFee(): void {
    if (this.zonesService.loading() || this.zonesService.error()) this.form.deliveryFee = 0;
    else if (this.zonesService.config()) this.form.deliveryFee = this.feeQuote()?.fee ?? 0;
  }

  openZones(): void { this.zonesSaveError.set(''); this.zonesMessage.set(''); this.showZones.set(true); }
  async saveZones(zones: DeliveryZones): Promise<void> {
    if (this.savingZones()) return;
    this.savingZones.set(true); this.zonesSaveError.set('');
    try {
      await this.zonesService.save(zones);
      this.showZones.set(false);
      this.zonesMessage.set('Zonas salvas. As novas entregas terão a taxa calculada pelo destino.');
      this.refreshDeliveryFee();
    } catch (error) {
      this.zonesSaveError.set(error instanceof Error ? error.message : 'Não foi possível salvar as zonas.');
    } finally { this.savingZones.set(false); }
  }

  selectDestination(point: {lat:number;lng:number}): void {
    this.cancelAddressSearch();
    this.addressStatus.set('Ponto ajustado no mapa.');
    this.destination.set(point);
    this.form.lat = point.lat;
    this.form.lng = point.lng;
    this.refreshDeliveryFee();
  }

  addressChanged(): void {
    this.cancelAddressSearch();
    this.destination.set(null);
    this.form.lat = undefined;
    this.form.lng = undefined;
    this.refreshDeliveryFee();
    const address = this.form.address.trim();
    this.addressStatus.set(address.length < 6 ? 'Digite a rua e o número em Uberaba.' : 'Buscando endereço em Uberaba…');
    if (address.length < 6) return;
    const version = this.addressVersion;
    this.addressTimer = setTimeout(async () => {
      const request = new AbortController();
      this.addressRequest = request;
      const timeout = setTimeout(() => request.abort(), 10000);
      try {
        const result = await searchUberaba(address, request.signal);
        if (version !== this.addressVersion) return;
        if (result) {
          this.destination.set({ lat: result.lat, lng: result.lng });
          this.form.lat = result.lat; this.form.lng = result.lng;
          this.refreshDeliveryFee();
          this.addressStatus.set(`Local encontrado: ${result.label}. Confira a entrada e ajuste o marcador: a posição pode ser aproximada.`);
        } else this.addressStatus.set('Endereço não encontrado em Uberaba. Marque a entrada no mapa.');
      } catch {
        if (version === this.addressVersion) this.addressStatus.set('Busca indisponível. Você pode marcar a entrada no mapa.');
      } finally { clearTimeout(timeout); }
    }, 1200);
  }

  private cancelAddressSearch(): void {
    this.addressVersion++;
    clearTimeout(this.addressTimer);
    this.addressRequest?.abort();
  }
  closeDelivery(): void { this.cancelAddressSearch(); this.show.set(false); }
  ngOnDestroy(): void { this.cancelAddressSearch(); }

  readonly selectedDate = signal(saoPauloDay(new Date()));
  readonly shipmentSlots = computed(()=>recurringShipments(this.svc.shipments()));
  readonly dailyDeliveries = computed(()=>this.svc.deliveries().filter(d=>deliveryDay(d,this.svc.shipments())===this.selectedDate()));
  readonly deliveryCounts = computed(()=>{
    const counts:Record<string,number>={};
    for(const d of this.svc.deliveries()){const day=deliveryDay(d,this.svc.shipments());if(day)counts[day]=(counts[day]||0)+1;}
    return counts;
  });
  selectDate(day:string):void { this.selectedDate.set(day); }
  private inSlot(delivery:Delivery,id:string):boolean {
    const time=this.svc.shipments().find(s=>s.id===id)?.time;
    return !!time && this.svc.shipments().some(s=>s.id===delivery.shipmentId && s.time===time);
  }
  activeShipment = computed<Shipment | undefined>(() => this.shipmentSlots().find(s => s.id === this.selected()) ?? this.shipmentSlots()[0]);
  current = computed(() => this.dailyDeliveries().filter(d => this.inSlot(d,this.activeShipment()?.id ?? '')));
  count(id: string) { return this.dailyDeliveries().filter(d => this.inSlot(d,id)).length; }
  delivered(id: string) { return this.dailyDeliveries().filter(d => this.inSlot(d,id) && d.status === 'DELIVERED').length; }

  private today(): string {
    const date = new Date();
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  private emptyForm(): NewDelivery {
    return { shipmentId: '', customerName: '', phone: '', address: '', product: '', orderValue: 0, deliveryFee: 0, paid: false };
  }

  open(): void {
    if (!this.activeShipment()) { this.openShipment(); return; }
    this.error.set('');
    this.form.shipmentId = this.activeShipment()!.id;
    this.form.deliveryDate = this.selectedDate();
    this.show.set(true);
  }

  openShipment(): void {
    this.shipmentError.set('');
    this.shipmentForm = { date: this.today(), time: '' };
    this.showShipment.set(true);
  }

  async saveShipment(): Promise<void> {
    if (this.savingShipment()) return;
    this.savingShipment.set(true);
    this.shipmentError.set('');
    try {
      const id = await this.svc.createShipment({ ...this.shipmentForm });
      this.selected.set(id);
      this.showShipment.set(false);
    } catch (error) {
      this.shipmentError.set(error instanceof Error ? error.message : 'Não foi possível criar a remessa.');
    } finally {
      this.savingShipment.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    this.refreshDeliveryFee();
    if (!this.feeReady()) {
      this.error.set(this.zonesService.error()
        ? 'Não foi possível verificar as zonas de entrega. Confira as permissões do Firestore e recarregue a página.'
        : this.zonesService.loading() ? 'Aguarde o carregamento das zonas de entrega.' : 'Confirme o destino no mapa para calcular a taxa pelas zonas.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const delivery = { ...this.form };
    try {
      await this.svc.add(delivery);
      this.selected.set(delivery.shipmentId);
      this.cancelAddressSearch();
      this.addressStatus.set('');
      this.show.set(false);
      this.form = this.emptyForm();
      this.destination.set(null);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível salvar a entrega.');
    } finally {
      this.saving.set(false);
    }
  }
}
