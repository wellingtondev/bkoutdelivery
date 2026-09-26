import { Component, OnDestroy, computed, signal } from '@angular/core';
import { searchUberaba } from '../../core/address-search';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NewDelivery, Shipment } from '../../models/models';
import { DeliveryService } from '../../core/delivery.service';
import { DeliveryMapComponent } from '../../components/delivery-map/delivery-map.component';
import { MonthlySummaryComponent } from '../../components/monthly-summary/monthly-summary.component';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DeliveryMapComponent, MonthlySummaryComponent],
  templateUrl: './store.component.html',
  styles: [`
    .store-actions{display:flex;gap:12px;flex-wrap:wrap}
    .empty-state{text-align:center;padding:36px 24px}
    .empty-state .btn{margin:20px auto 0}
    .feedback{color:#ff8b83;line-height:1.5}
    .shipment-date{margin:0 0 8px;color:#a1a1aa}
    .shipment.selected{border-color:#ff5147}
    .modal input,.modal select{min-width:0;width:100%}
    .modal .check input{width:auto}
    @media(max-width:760px){.store-actions{width:100%}}
  `]
})
export class StoreComponent implements OnDestroy {
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

  constructor(public svc: DeliveryService, public auth: AuthService) {}

  selectDestination(point: {lat:number;lng:number}): void {
    this.cancelAddressSearch();
    this.addressStatus.set('Ponto ajustado no mapa.');
    this.destination.set(point);
    this.form.lat = point.lat;
    this.form.lng = point.lng;
  }

  addressChanged(): void {
    this.cancelAddressSearch();
    this.destination.set(null);
    this.form.lat = undefined;
    this.form.lng = undefined;
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

  activeShipment = computed<Shipment | undefined>(() => this.svc.shipments().find(s => s.id === this.selected()) ?? this.svc.shipments()[0]);
  current = computed(() => this.svc.deliveries().filter(d => d.shipmentId === this.activeShipment()?.id));
  count(id: string) { return this.svc.deliveries().filter(d => d.shipmentId === id).length; }
  delivered(id: string) { return this.svc.deliveries().filter(d => d.shipmentId === id && d.status === 'DELIVERED').length; }

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
