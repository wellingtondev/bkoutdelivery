import { Component, OnDestroy, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { catchError, interval, map, of, startWith, switchMap } from 'rxjs';
import { DeliveryService } from '../../core/delivery.service';
import { DeliveryMapComponent } from '../../components/delivery-map/delivery-map.component';
import { PublicTracking } from '../../models/models';
import { LiveRouteService } from '../../core/live-route.service';
import { TrackingRouteController, TrackingRouteState, liveArrival, remainingMinutes } from './tracking-route';

interface TrackingState { loading:boolean; delivery:PublicTracking|undefined; error:boolean; }

@Component({
  standalone: true,
  imports: [CommonModule, DeliveryMapComponent],
  templateUrl: './tracking.component.html',
  styleUrl: './tracking.component.css'
})
export class TrackingComponent implements OnDestroy {
  readonly liveRoute = signal<TrackingRouteState>({result:null,loading:false,error:false});
  private readonly routeController = new TrackingRouteController((origin,destination,signal)=>this.liveRoutes.calculate(origin,destination,signal), state=>this.liveRoute.set(state));
  readonly now = toSignal(interval(5000).pipe(map(() => Date.now())), { initialValue: Date.now() });
  readonly state = toSignal(this.route.paramMap.pipe(switchMap(params =>
    this.svc.byToken(params.get('token') ?? '').pipe(
      map(delivery => ({ loading: false, delivery, error: false } as TrackingState)),
      startWith({ loading: true, delivery: undefined, error: false } as TrackingState),
      catchError(() => of({ loading: false, delivery: undefined, error: true } as TrackingState))
    )
  )));
  readonly delivery = computed(() => this.state()?.delivery);
  readonly estimatedTime = computed(() => {
    const value=this.delivery()?.estimatedArrival;
    const time=value?new Date(value).getTime():0;
    return Number.isFinite(time)?time:0;
  });
  readonly estimateLate = computed(()=>this.estimatedTime()>0 && this.estimatedTime()<this.now());
  readonly positionTime = computed(() => {
    const value = this.delivery()?.driverLocation?.updatedAt;
    if (!value) return 0;
    if (typeof value === 'string') return new Date(value).getTime();
    if (value instanceof Date) return value.getTime();
    return value.seconds * 1000;
  });
  readonly isLive = computed(() => {
    const delivery = this.delivery();
    const age = this.now() - this.positionTime();
    return delivery?.status === 'OUT_FOR_DELIVERY' && delivery.trackingActive === true &&
      !!delivery.driverLocation && Number.isFinite(age) && age >= -10000 && age < 45000;
  });
  readonly position = computed(() => this.isLive() ? this.delivery()?.driverLocation ?? null : null);
  readonly routePath = computed(() => this.isLive() ? this.liveRoute().result?.path ?? [] : []);
  readonly liveArrivalTime = computed(() => liveArrival(this.liveRoute().result,this.isLive(),this.delivery()?.routePosition));
  readonly liveMinutes = computed(() => remainingMinutes(this.liveArrivalTime(),this.now()));
  readonly laterStop = computed(() => (this.delivery()?.routePosition ?? 1)>1);
  readonly progress = computed(() => this.delivery()?.status === 'DELIVERED' ? 3 : this.delivery()?.status === 'OUT_FOR_DELIVERY' ? 2 : 1);
  readonly title = computed(() => this.progress() === 3 ? 'Entrega concluída.' : this.progress() === 2 ? 'Seu pedido está a caminho.' : 'Estamos preparando seu pedido.');
  readonly subtitle = computed(() => this.progress() === 3 ? 'Obrigado por escolher a Blackout. Até a próxima!' : this.progress() === 2 ? 'Acompanhe o trajeto enquanto o entregador compartilha a localização.' : 'Assim que o entregador sair, você poderá acompanhar por aqui.');
  constructor(private route: ActivatedRoute, public svc: DeliveryService, private liveRoutes:LiveRouteService) {
    effect(()=>{
      const delivery=this.delivery();
      this.routeController.update({
        key:JSON.stringify([delivery?.trackingCode,delivery?.deliveryId,delivery?.destination,delivery?.status,delivery?.routePosition]),
        enabled:this.isLive(),origin:this.position(),destination:delivery?.destination??null,now:this.now(),
      });
    });
  }
  ngOnDestroy():void{this.routeController.destroy();}
}
