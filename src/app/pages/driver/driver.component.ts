import { Component, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeliveryService } from '../../core/delivery.service';
import { LocationService } from '../../core/location.service';
import { AuthService } from '../../core/auth.service';
import { Delivery } from '../../models/models';
import { DriverHistoryComponent } from '../../components/driver-history/driver-history.component';

@Component({
  standalone: true,
  imports: [CommonModule, DriverHistoryComponent],
  template: `
    <header><b>🐺 BLACKOUT <span>DRIVER</span></b><button class="link" (click)="logout()">Sair</button></header>
    <main class="wrap narrow">
      <p class="eyebrow">ENTREGADOR</p><h1>Suas entregas</h1>
      <p class="muted">Inicie uma entrega para compartilhar seu GPS com o cliente. Mantenha esta página aberta durante o trajeto.</p>
      @if(error() || svc.error() || location.error()){<p role="alert" class="feedback">{{error() || location.error() || svc.error()}}</p>}
      @if(svc.loading()){<p class="muted" role="status">Carregando suas entregas...</p>}
        <app-driver-history [deliveries]="svc.deliveries()" [shipments]="svc.shipments()" [driverId]="auth.user?.uid ?? ''" [unavailable]="svc.loading() || !!svc.error()"></app-driver-history>
      <h2 class="open-title">Entregas em aberto</h2>
      <div class="statusbar">
        <div><b>{{location.activeDeliveryId() ? 'Compartilhando localização' : 'Localização pausada'}}</b>
        <small>{{location.lastUpdate() ? 'Último envio: ' + (location.lastUpdate() | date:'HH:mm:ss') : 'O GPS só é enviado ao iniciar uma entrega.'}}</small></div>
        @if(location.activeDeliveryId()){<button class="mini" (click)="stopGps()">Parar GPS</button>}
      </div>
      @for(d of jobs();track d.id){
        <article class="card job">
          <div class="row"><div><h3>{{d.customerName}}</h3><p>{{d.address}}</p></div><span class="pill">{{d.status === 'DELIVERED' ? 'Entregue' : d.status === 'OUT_FOR_DELIVERY' ? 'Em rota' : 'Aguardando'}}</span></div>
          <p><b>{{d.product}}</b> • R$ {{d.orderValue.toFixed(2)}} • {{d.paid ? 'Pago' : 'Receber'}}</p>
          <div class="actions">
            <a class="btn secondary" target="_blank" rel="noopener" [href]="mapUrl(d)">Abrir destino</a>
            @if(d.status !== 'DELIVERED'){
              <button class="btn secondary" [disabled]="location.starting() || location.activeDeliveryId() === d.id" (click)="location.start(d)">{{location.activeDeliveryId() === d.id ? 'GPS ativo' : 'Iniciar entrega e GPS'}}</button>
            }
            <button class="btn" [disabled]="d.status === 'DELIVERED' || pending().includes(d.id)" (click)="confirm(d.id)">{{d.status === 'DELIVERED' ? 'Entregue' : 'Confirmar entrega'}}</button>
          </div>
        </article>
      } @empty {<p class="muted">Nenhuma entrega disponível.</p>}
    </main>
  `,
  styles: [`.statusbar small{display:block;margin-top:6px}.feedback{color:#ff8b83}.job .actions{flex-wrap:wrap}.job .actions .btn{flex:1;min-width:150px}.job h3{margin-bottom:4px}.open-title{margin-top:36px;padding-top:26px;border-top:1px solid #29292e}`]
})
export class DriverComponent implements OnDestroy {
  readonly error = signal('');
  readonly pending = signal<string[]>([]);
  readonly jobs = computed(() => this.svc.deliveries().filter(delivery => delivery.status !== 'DELIVERED' && (!delivery.driverId || delivery.driverId === this.auth.user?.uid)));
  constructor(public svc: DeliveryService, public location: LocationService, public auth: AuthService) {}
  mapUrl(delivery: Delivery): string {
    const destination = Number.isFinite(delivery.lat) && Number.isFinite(delivery.lng)
      ? delivery.lat + ',' + delivery.lng : delivery.address;
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(destination);
  }
  async confirm(id: string): Promise<void> {
    if (this.pending().includes(id)) return;
    this.pending.update(ids => [...ids, id]); this.error.set('');
    try {
      if (this.location.activeDeliveryId() === id) await this.location.stop();
      await this.svc.confirm(id);
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Não foi possível confirmar a entrega.'); }
    finally { this.pending.update(ids => ids.filter(item => item !== id)); }
  }
  async stopGps(): Promise<void> {
    try { await this.location.stop(); }
    catch { this.error.set('O GPS parou, mas não foi possível atualizar o cliente. Verifique sua conexão.'); }
  }
  async logout(): Promise<void> { await this.stopGps(); await this.auth.logout(); }
  ngOnDestroy(): void { void this.location.stop().catch(() => {}); }
}
