import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, ViewChild, signal } from '@angular/core';
import * as L from 'leaflet';
import { DeliveryZones, validateDeliveryZones } from '../../core/delivery-zones';

type Point = { lat: number; lng: number };

@Component({
  selector: 'app-delivery-map',
  standalone: true,
  templateUrl: './delivery-map.component.html',
  styleUrl: './delivery-map.component.css',
})
export class DeliveryMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() destination: Point | null = null;
  @Input() driverPosition: Point | null = null;
  @Input() selectable = false;
  @Input() zones: DeliveryZones | null = null;
  @Output() destinationChange = new EventEmitter<Point>();
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLDivElement>;

  readonly tileError = signal(false);
  readonly locating = signal(false);
  readonly locationMessage = signal('');
  private map?: L.Map;
  private zoneLayers?: L.LayerGroup;
  private destinationMarker?: L.Marker;
  private driverMarker?: L.Marker;
  private resizeObserver?: ResizeObserver;
  private frame?: number;
  private destroyed = false;
  private lastPositions = '';

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.map = L.map(this.canvas.nativeElement, { scrollWheelZoom: false }).setView([-19.747, -47.939], 13);
      this.zoneLayers = L.layerGroup().addTo(this.map);
      this.syncZones();
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).on('loading', () => this.zone.run(() => this.tileError.set(false)))
        .on('tileerror', () => this.zone.run(() => this.tileError.set(true)))
        .addTo(this.map);
      this.map.on('click', (event: L.LeafletMouseEvent) => {
        if (this.selectable) this.select(event.latlng.wrap());
      });
      this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize({ pan: false }));
      this.resizeObserver.observe(this.canvas.nativeElement);
      this.frame = requestAnimationFrame(() => {
        this.map?.invalidateSize({ pan: false });
        this.syncMarkers();
      });
    });
  }

  ngOnChanges(): void { this.syncMarkers(); this.syncZones(); }

  private syncZones(): void {
    if (!this.zoneLayers) return;
    this.zoneLayers.clearLayers();
    if (!this.zones || validateDeliveryZones(this.zones)) return;
    for (const name of ['yellow', 'green'] as const) {
      L.polygon(this.zones[name], { color: name === 'green' ? '#23c879' : '#efbf35', weight: 2, fillOpacity: .18, interactive: false }).addTo(this.zoneLayers);
    }
  }

  selectCenter(): void {
    if (this.map && this.selectable) this.select(this.map.getCenter().wrap());
  }

  locate(): void {
    if (!this.selectable || this.locating()) return;
    if (!navigator.geolocation) {
      this.locationMessage.set('Este navegador não permite localizar você. Navegue pelo mapa para marcar o destino.');
      return;
    }
    this.locating.set(true);
    this.locationMessage.set('Localizando…');
    navigator.geolocation.getCurrentPosition(position => {
      if (this.destroyed) return;
      this.zone.run(() => {
        this.locating.set(false);
        this.map?.setView([position.coords.latitude, position.coords.longitude], 17);
        this.locationMessage.set('Mapa centralizado na sua localização. Marque o endereço de entrega para confirmar o destino.');
      });
    }, error => {
      if (this.destroyed) return;
      this.zone.run(() => {
        this.locating.set(false);
        this.locationMessage.set(error.code === 1
          ? 'Permissão de localização negada. Você ainda pode navegar pelo mapa e marcar o destino.'
          : 'Não foi possível obter sua localização. Navegue pelo mapa e marque o destino.');
      });
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.destinationMarker?.off();
    this.driverMarker?.off();
    this.zoneLayers?.clearLayers();
    this.map?.off();
    this.map?.remove();
    this.map = undefined;
  }

  private valid(point: Point | null): point is Point {
    return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng)
      && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
  }

  private select(point: Point): void {
    if (!this.valid(point)) return;
    this.zone.run(() => this.destinationChange.emit({ lat: point.lat, lng: point.lng }));
  }

  private icon(color: string, symbol: string): L.DivIcon {
    return L.divIcon({
      className: 'delivery-map-pin', iconSize: [36, 36], iconAnchor: [18, 18],
      html: `<span aria-hidden="true" style="display:grid;place-items:center;width:32px;height:32px;background:${color};color:white;border:2px solid white;border-radius:50%;box-shadow:0 3px 12px #0008;font-size:18px;font-weight:800">${symbol}</span>`,
    });
  }

  private syncMarkers(): void {
    const map = this.map;
    if (!map) return;
    const destination = this.valid(this.destination) ? this.destination : null;
    const driver = this.valid(this.driverPosition) ? this.driverPosition : null;
    if (destination) {
      if (!this.destinationMarker) {
        this.destinationMarker = L.marker(destination, {
          icon: this.icon('#ed3024', '●'), draggable: this.selectable,
          title: 'Destino da entrega', alt: 'Destino da entrega',
        }).bindTooltip('Destino da entrega').addTo(map);
        this.destinationMarker.on('dragend', () => {
          if (this.selectable && this.destinationMarker) this.select(this.destinationMarker.getLatLng().wrap());
        });
      } else this.destinationMarker.setLatLng(destination);
      if (this.selectable) this.destinationMarker.dragging?.enable();
      else this.destinationMarker.dragging?.disable();
    } else {
      this.destinationMarker?.off().remove();
      this.destinationMarker = undefined;
    }
    if (driver) {
      if (!this.driverMarker) this.driverMarker = L.marker(driver, {
        icon: this.icon('#156eaa', '➤'), title: 'Última localização do entregador', alt: 'Última localização do entregador',
      }).bindTooltip('Última localização do entregador').addTo(map);
      else this.driverMarker.setLatLng(driver);
    } else {
      this.driverMarker?.off().remove();
      this.driverMarker = undefined;
    }
    const positions = JSON.stringify([destination, driver]);
    if (positions !== this.lastPositions) {
      this.lastPositions = positions;
      if (destination && driver) map.fitBounds(L.latLngBounds([destination, driver]), { padding: [40, 40], maxZoom: 17, animate: false });
      else if (destination || driver) map.setView((destination || driver)!, 17, { animate: false });
    }
  }
}
