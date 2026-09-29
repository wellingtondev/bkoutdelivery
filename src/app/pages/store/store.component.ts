import { Component, OnDestroy, computed, effect, signal } from '@angular/core';
import { DeliveryZonesService } from '../../core/delivery-zones.service';
import { DeliveryZones, deliveryFeeForPoint } from '../../core/delivery-zones';
import { DeliveryZonesEditorComponent } from '../../components/delivery-zones-editor/delivery-zones-editor.component';
import { recurringShipments, deliveryDay, saoPauloDay } from '../../core/shipment-calendar';
import { AddressAutocomplete, AddressSuggestion, addressSearchError } from '../../core/address-autocomplete';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Delivery, NewDelivery, Shipment } from '../../models/models';
import { DeliveryService } from '../../core/delivery.service';
import { DeliveryMapComponent } from '../../components/delivery-map/delivery-map.component';
import { CustomerMapComponent } from '../../components/customer-map/customer-map.component';
import { MonthlySummaryComponent } from '../../components/monthly-summary/monthly-summary.component';
import { AuthService } from '../../core/auth.service';
import { amountToCollect, paymentLabel } from '../../core/payment';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DeliveryMapComponent, MonthlySummaryComponent, DeliveryZonesEditorComponent, CustomerMapComponent],
  templateUrl: './store.component.html',
  styles: [`
    .delivery{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:start}.delivery-details{min-width:0;overflow-wrap:anywhere}.delivery>.delivery-actions{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;flex-direction:row}.delivery-action{min-height:44px;display:flex;align-items:center;justify-content:center;text-align:center;border:1px solid #45454f;border-radius:10px;background:#25252d;color:#fafafa;padding:10px 14px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none}.delivery-action:hover{background:#34343e}.delivery-action:focus-visible{outline:2px solid #ff776e;outline-offset:3px}.delivery-action:disabled{opacity:.45;cursor:not-allowed}.delivery-action.danger{color:#ffaca5;border-color:#69362f;background:#351e1d}.delivery-action.danger:hover{background:#512622}.store-actions{display:flex;gap:12px;flex-wrap:wrap}
    .address-suggestions{display:grid;gap:6px;margin:8px 0 18px;padding:10px;border:1px solid #464650;border-radius:12px;background:#18181e}.address-suggestions button{min-height:44px;padding:12px;text-align:left;background:#26262e;color:#fafafa;border:1px solid #3b3b46;border-radius:8px;cursor:pointer;overflow-wrap:anywhere}.address-suggestions button:focus-visible{outline:2px solid #ff776e}.address-suggestions small{text-align:right;padding:4px;color:#bdbdc8}.empty-state{text-align:center;padding:36px 24px}
    .empty-state .btn{margin:20px auto 0}
    .feedback{color:#ff8b83;line-height:1.5}
    .shipment-date{margin:0 0 8px;color:#a1a1aa}
    .shipment.selected{border-color:#ff5147}
    .modal input,.modal select,.modal textarea{min-width:0;width:100%;box-sizing:border-box}
    .modal textarea{resize:vertical;min-height:90px;background:#09090b;border:1px solid #3f3f46;border-radius:10px;color:#fafafa;padding:12px;font:inherit}
    .collection-total{padding:14px;border:1px solid #ff5147;border-radius:12px;background:#ff514710}.collection-total strong{display:block;font-size:1.4rem;margin-top:4px}
    .modal .check input{width:auto}
    .zone-summary{margin:0 0 24px;line-height:1.6}.zone-summary p{margin:6px 0}.fee-note{line-height:1.5}.fee-note strong{color:#fafafa}.modal input[readonly]{background:#232327;color:#fff;border-color:#565662}
    @media(max-width:760px){.store-actions{width:100%}.delivery{grid-template-columns:minmax(0,1fr)}.delivery>.delivery-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.delivery-action{padding:10px 8px}}
  `]
})
export class StoreComponent implements OnDestroy {
  readonly showCustomers = signal(false);
  readonly editing = signal<Delivery|null>(null);
  readonly destinationChanged = signal(false);
  readonly preserveFee = computed(()=>!!this.editing() && !this.destinationChanged());
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
  readonly addressSuggestions = signal<AddressSuggestion[]>([]);
  readonly selectingAddress = signal(false);
  private readonly autocomplete = new AddressAutocomplete();
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
  readonly feeReady = computed(() => this.preserveFee() || (!this.zonesService.loading() && !this.zonesService.error()
    && (!this.zonesService.config() || !!this.feeQuote())));
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
    if(this.preserveFee()){this.form.deliveryFee=this.editing()!.deliveryFee;return;}
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
    const original=this.editing();
    this.destinationChanged.set(!original || point.lat!==original.lat || point.lng!==original.lng);
    this.cancelAddressSearch();
    this.addressStatus.set('Ponto ajustado no mapa.');
    this.destination.set(point);
    this.form.lat = point.lat;
    this.form.lng = point.lng;
    this.refreshDeliveryFee();
  }

  addressChanged(): void {
    this.destinationChanged.set(true);
    this.cancelAddressSearch(false);
    this.destination.set(null);
    this.form.lat = undefined;
    this.form.lng = undefined;
    this.refreshDeliveryFee();
    const address = this.form.address.trim();
    this.addressStatus.set(address.length < 3 ? 'Digite a rua e o número para ver sugestões em Uberaba.' : 'Buscando sugestões…');
    if (address.length < 3) return;
    const version = this.addressVersion;
    this.addressTimer = setTimeout(async () => {
      const request = new AbortController();
      this.addressRequest = request;
      const timeout = setTimeout(() => request.abort(), 10000);
      try {
        const suggestions = await this.autocomplete.suggest(address, request.signal);
        if (version !== this.addressVersion || request.signal.aborted) return;
        this.addressSuggestions.set(suggestions);
        this.addressStatus.set(suggestions.length ? 'Selecione um endereço abaixo e confira o número e a entrada no mapa.' : 'Nenhuma sugestão encontrada. Confira o endereço ou marque a entrada no mapa.');
      } catch(error) {
        if (version === this.addressVersion) this.addressStatus.set(addressSearchError(error));
      } finally { clearTimeout(timeout); }
    }, 600);
  }

  async selectAddress(suggestion:AddressSuggestion):Promise<void> {
    this.cancelAddressSearch(false);
    const version=this.addressVersion;
    const request=new AbortController();this.addressRequest=request;
    this.selectingAddress.set(true);this.addressStatus.set('Localizando o endereço selecionado…');
    const timeout=setTimeout(()=>request.abort(),10000);
    try {
      const result=await this.autocomplete.select(suggestion,request.signal);
      if(version!==this.addressVersion||request.signal.aborted)return;
      const original=this.editing();
      this.destinationChanged.set(!original||result.lat!==original.lat||result.lng!==original.lng);
      this.form.address=result.label;this.form.lat=result.lat;this.form.lng=result.lng;
      this.destination.set({lat:result.lat,lng:result.lng});this.refreshDeliveryFee();
      this.addressStatus.set('Endereço selecionado. Confira o número e ajuste o marcador na entrada, se necessário.');
    }catch(error){if(version===this.addressVersion)this.addressStatus.set(addressSearchError(error));}
    finally{clearTimeout(timeout);if(version===this.addressVersion)this.selectingAddress.set(false);}
  }
  private cancelAddressSearch(resetSession=true): void {
    this.addressVersion++;
    clearTimeout(this.addressTimer);
    this.addressRequest?.abort();
    this.addressSuggestions.set([]);this.selectingAddress.set(false);
    if(resetSession)this.autocomplete.reset();
  }
  closeDelivery(): void {
    if(this.saving())return;
    this.cancelAddressSearch(); this.show.set(false);this.editing.set(null);this.destinationChanged.set(false);
    this.form=this.emptyForm();this.destination.set(null);this.addressStatus.set('');
  }
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
    this.cancelAddressSearch();this.editing.set(null);this.destinationChanged.set(false);
    this.form=this.emptyForm();this.destination.set(null);this.addressStatus.set('');
    this.error.set('');
    this.form.shipmentId = this.activeShipment()!.id;
    this.form.deliveryDate = this.selectedDate();
    this.show.set(true);
  }

  edit(delivery:Delivery):void {
    if(delivery.status==='DELIVERED' || this.saving() || this.actionPending())return;
    this.cancelAddressSearch();this.error.set('');this.actionMessage.set('');
    this.editing.set({...delivery});this.destinationChanged.set(false);
    this.form={shipmentId:delivery.shipmentId,deliveryDate:delivery.deliveryDate ?? deliveryDay(delivery,this.svc.shipments()) ?? undefined,
      customerName:delivery.customerName,phone:delivery.phone,address:delivery.address,product:delivery.product,
      orderValue:delivery.orderValue,deliveryFee:delivery.deliveryFee,paid:delivery.paid,paymentMethod:delivery.paymentMethod,
      installments:delivery.installments,notes:delivery.notes,lat:delivery.lat,lng:delivery.lng};
    this.destination.set(Number.isFinite(delivery.lat)&&Number.isFinite(delivery.lng)?{lat:delivery.lat!,lng:delivery.lng!}:null);
    this.addressStatus.set('Endereço cadastrado. Altere somente se o destino da entrega mudou.');this.show.set(true);
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
    const original=this.editing();
    const delivery = { ...this.form, ...(original?{shipmentId:original.shipmentId,deliveryDate:original.deliveryDate ?? deliveryDay(original,this.svc.shipments()) ?? undefined}:{}) };
    try {
      if(original)await this.svc.updateDelivery(original.shipmentId,original.id,delivery);
      else await this.svc.add(delivery);
      this.selected.set(delivery.shipmentId);
      this.cancelAddressSearch();
      this.addressStatus.set('');
      this.show.set(false);
      this.form = this.emptyForm();
      this.destination.set(null);
      this.editing.set(null);this.destinationChanged.set(false);
      this.actionMessage.set(original?'Entrega atualizada. O acompanhamento e o entregador receberão as alterações.':'Entrega criada.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível salvar a entrega.');
    } finally {
      this.saving.set(false);
    }
  }
}






