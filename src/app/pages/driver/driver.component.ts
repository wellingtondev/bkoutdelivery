import { Component, OnDestroy, computed, signal } from '@angular/core';
import { RouteEstimator, ROUTE_ORIGIN_ADDRESS } from '../../core/route-estimator';
import { CommonModule } from '@angular/common';
import { DeliveryService } from '../../core/delivery.service';
import { LocationService } from '../../core/location.service';
import { AuthService } from '../../core/auth.service';
import { arrivalWhatsApp } from '../../core/driver-actions';
import { amountToCollect, paymentLabel } from '../../core/payment';
import { Delivery } from '../../models/models';
import { DriverHistoryComponent } from '../../components/driver-history/driver-history.component';
import { driverDayGroups } from './driver-groups';

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
      <div class="actions"><button class="mini" (click)="expandGroup(jobs(),true)">Expandir todas as entregas</button><button class="mini" (click)="expandGroup(jobs(),false)">Recolher todas as entregas</button></div>
      <div class="statusbar">
        <div><b>{{location.activeDeliveryId() ? 'Compartilhando localização' : 'Localização pausada'}}</b>
        <small>{{location.lastUpdate() ? 'Último envio: ' + (location.lastUpdate() | date:'HH:mm:ss') : 'O GPS só é enviado ao iniciar uma entrega.'}}</small></div>
        @if(location.activeDeliveryId()){<button class="mini" (click)="stopGps()">Parar GPS</button>}
      </div>


      <section class="card route-planner">
        <h2>Ordem da sua rota</h2>
        <p class="muted">Use as setas para organizar as paradas entre as remessas. Salvar vincula essas entregas a você e atualiza a posição no link do cliente.</p>
        <p class="muted"><b>Saída:</b> {{originAddress}}</p><p class="muted">Ao salvar: saída agora, trajeto pelas ruas e 3 minutos entre paradas. O Google considera o trânsito na consulta. Salve novamente para recalcular.</p>
        @for(d of orderedJobs();track d.id;let index=$index){
          <div class="route-stop"><span>{{index+1}}. {{d.customerName}}</span><div><button class="mini" [disabled]="index===0 || routeSaving()" (click)="move(d.id,-1)" [attr.aria-label]="'Subir entrega de '+d.customerName">↑</button><button class="mini" [disabled]="index===orderedJobs().length-1 || routeSaving()" (click)="move(d.id,1)" [attr.aria-label]="'Descer entrega de '+d.customerName">↓</button></div></div>
          <p class="muted">{{d.address}}</p>
          @if(d.estimatedArrival){<p class="muted">Última previsão salva: {{d.estimatedArrival | date:'dd/MM HH:mm':'-0300'}} (Brasília)</p>}
        }
        <button class="btn" [disabled]="routeSaving() || !orderedJobs().length" (click)="saveRoute()">{{routeSaving() ? 'Calculando e salvando…' : 'Salvar ordem e calcular horários'}}</button>
        <p role="status">{{routeMessage()}}</p><small>Rotas e estimativas: Google Maps · Sujeitas ao trânsito e às paradas.</small>
      </section>
      @for(group of groups(); track group.id){
        <section class="shipment-group">
          <div class="row"><h2>{{group.label}}</h2><span>{{group.deliveries.length}} entregas</span></div>
          <div class="actions"><button class="mini" (click)="expandGroup(group.deliveries,true)">Expandir todas</button><button class="mini" (click)="expandGroup(group.deliveries,false)">Recolher todas</button></div>
          @for(d of group.deliveries;track d.id){
            <article class="card job">
              <button type="button" class="delivery-toggle" [attr.aria-expanded]="!collapsed().includes(d.id)" (click)="toggle(d.id)"><strong>{{d.customerName}}</strong><span>{{collapsed().includes(d.id) ? '＋' : '−'}}</span></button>
              <p>{{d.address}}</p>
              <div class="collection" [class.paid]="d.paid"><span>{{d.paid ? 'Pedido pago' : 'A RECEBER DO CLIENTE'}}</span><strong>{{amount(d) | currency:'BRL':'symbol':'1.2-2':'pt-BR'}}</strong><b>{{payment(d)}}</b></div>
              @if(!collapsed().includes(d.id)){
                <p><b class="product-lines">{{d.product}}</b> · {{d.status === 'OUT_FOR_DELIVERY' ? 'Em rota' : 'Aguardando'}}</p>
                @if(d.notes){<div class="delivery-note"><b>📝 Observação da loja</b><p>{{d.notes}}</p></div>}
                <div class="actions">
                  <a class="btn secondary" target="_blank" rel="noopener" [href]="mapUrl(d)">Abrir destino</a>
                  <button class="btn secondary" [disabled]="location.starting() || location.activeDeliveryId() === d.id" (click)="location.start(d)">{{location.activeDeliveryId() === d.id ? 'GPS ativo' : 'Iniciar entrega e GPS'}}</button>
                  @if(whatsapp(d); as url){<a class="btn whatsapp" [href]="url" target="_blank" rel="noopener noreferrer">🛵 Cheguei · WhatsApp</a>}
                  @else{<small>WhatsApp indisponível: peça à loja um telefone com DDD válido.</small>}
                  <button class="btn" [disabled]="pending().includes(d.id)" (click)="confirm(d.id)">{{pending().includes(d.id) ? 'Confirmando…' : 'Confirmar entrega'}}</button>
                </div>
                <small class="muted">“Cheguei” abre a mensagem pronta. Confirme o envio no WhatsApp.</small>
              }
            </article>
          }
        </section>
      } @empty {<p class="muted">Nenhuma entrega disponível.</p>}
    </main>
  `,
  styles: [`.route-planner{margin-top:20px}.route-stop{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #333}.route-stop>div{display:flex;gap:8px}.route-stop span{overflow-wrap:anywhere}.shipment-group{margin-top:28px}.delivery-toggle{display:flex;justify-content:space-between;width:100%;background:none;border:0;color:inherit;font-size:20px;text-align:left;cursor:pointer}.collection{display:grid;gap:6px;border:1px solid #f3b34c;background:#352513;padding:16px;border-radius:12px;color:#ffe0a3}.collection strong{font-size:28px}.collection.paid{border-color:#285d40;background:#142b20;color:#9ee0b8}.delivery-note{padding:14px;background:#242429;border-left:3px solid #ed3024;margin:16px 0;white-space:pre-wrap;overflow-wrap:anywhere}.whatsapp{background:#176d42}.statusbar small{display:block;margin-top:6px}.feedback{color:#ff8b83}.job .actions{flex-wrap:wrap}.job .actions .btn{flex:1;min-width:150px}.job h3{margin-bottom:4px}.open-title{margin-top:36px;padding-top:26px;border-top:1px solid #29292e}`]
})
export class DriverComponent implements OnDestroy {
  readonly originAddress = ROUTE_ORIGIN_ADDRESS;
  private routeRequest?: AbortController;
  readonly routeIds = signal<string[]>([]);
  readonly routeSaving = signal(false);
  readonly routeMessage = signal('');
  readonly orderedJobs = computed(()=>{
    const jobs=[...this.jobs()].sort((a,b)=>(a.routeOrder ?? Number.MAX_SAFE_INTEGER)-(b.routeOrder ?? Number.MAX_SAFE_INTEGER)||a.id.localeCompare(b.id));
    const ids=this.routeIds();
    return [...ids.map(id=>jobs.find(d=>d.id===id)).filter((d):d is Delivery=>!!d),...jobs.filter(d=>!ids.includes(d.id))];
  });
  move(id:string,delta:number):void {
    const ids=this.orderedJobs().map(d=>d.id), index=ids.indexOf(id), target=index+delta;
    if(index<0 || target<0 || target>=ids.length)return;
    [ids[index],ids[target]]=[ids[target],ids[index]];
    this.routeIds.set(ids); this.routeMessage.set('Ordem alterada. Salve para atualizar os clientes.');
  }
  async saveRoute():Promise<void>{
    if(this.routeSaving())return;
    this.routeSaving.set(true); this.error.set('');
    const jobs=this.orderedJobs().map(d=>({...d}));
    const uid=this.auth.user?.uid;
    const request=new AbortController();
    this.routeRequest=request;
    const timeout=setTimeout(()=>request.abort(),20000);
    try {
      let estimates:Record<string,string|null>;
      let warning='';
      try { estimates=await this.estimator.calculate(jobs,request.signal); }
      catch(error){
        if(request.signal.aborted)throw new Error('Cálculo interrompido ou demorou demais. Tente novamente.');
        warning=error instanceof Error?error.message:'Não foi possível calcular os horários.';
        estimates=Object.fromEntries(jobs.map(d=>[d.id,null]));
      }
      if(request.signal.aborted || uid!==this.auth.user?.uid)throw new Error('Sessão alterada. Entre novamente.');
      const current=this.orderedJobs();
      if(JSON.stringify(jobs.map(d=>[d.id,d.lat,d.lng]))!==JSON.stringify(current.map(d=>[d.id,d.lat,d.lng])))throw new Error('As entregas mudaram durante o cálculo. Confira e salve novamente.');
      await this.svc.saveRoute(jobs.map(d=>d.id),estimates,Object.fromEntries(jobs.map(d=>[d.id,{lat:d.lat,lng:d.lng}])));
      this.routeIds.set([]);
      this.routeMessage.set(warning ? 'Ordem salva, sem previsão de horário. '+warning : 'Ordem e horários calculados salvos nos links dos clientes.');
    }
    catch(error){this.error.set(error instanceof Error?error.message:'Não foi possível salvar a rota.');}
    finally{clearTimeout(timeout);this.routeSaving.set(false);}
  }
  readonly collapsed = signal<string[]>([]);
  readonly amount = amountToCollect;
  readonly payment = paymentLabel;
  readonly whatsapp = arrivalWhatsApp;
  readonly groups = computed(() => driverDayGroups(this.orderedJobs(), this.svc.shipments()));
  toggle(id:string):void { this.collapsed.update(ids=>ids.includes(id)?ids.filter(v=>v!==id):[...ids,id]); }
  expandGroup(deliveries:Delivery[],expand:boolean):void {
    const ids=new Set(deliveries.map(d=>d.id));
    this.collapsed.update(current=>expand?current.filter(id=>!ids.has(id)):[...new Set([...current,...ids])]);
  }
  readonly error = signal('');
  readonly pending = signal<string[]>([]);
  readonly jobs = computed(() => this.svc.deliveries().filter(delivery => delivery.status !== 'DELIVERED' && (!delivery.driverId || delivery.driverId === this.auth.user?.uid)));
  constructor(public svc: DeliveryService, public location: LocationService, public auth: AuthService, private estimator: RouteEstimator) {}
  mapUrl(delivery: Delivery): string {
    const destination = Number.isFinite(delivery.lat) && Number.isFinite(delivery.lng)
      ? delivery.lat + ',' + delivery.lng : delivery.address;
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(destination);
  }
  async confirm(id: string): Promise<void> {
    if (this.pending().includes(id)) return;
    const delivery=this.jobs().find(item=>item.id===id);
    if(!delivery)return;
    if(!delivery.paid){
      const total=this.amount(delivery).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
      if(!window.confirm(`Confirmar recebimento\n\nCliente: ${delivery.customerName}\nValor a receber: ${total}\nPagamento: ${this.payment(delivery)}\n\nVocê recebeu o valor do cliente?\nConfirme somente após receber para concluir a entrega.`))return;
    }
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
  ngOnDestroy(): void { this.routeRequest?.abort(); void this.location.stop().catch(() => {}); }
}

