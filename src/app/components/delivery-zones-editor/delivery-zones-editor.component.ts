import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, OnInit, Output, ViewChild, signal } from '@angular/core';
import * as L from 'leaflet';
import { DeliveryZones, validateDeliveryZones } from '../../core/delivery-zones';
import { GeoPoint } from '../../models/models';

@Component({selector:'app-delivery-zones-editor',standalone:true,templateUrl:'./delivery-zones-editor.component.html',styleUrl:'./delivery-zones-editor.component.css'})
export class DeliveryZonesEditorComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() zones: DeliveryZones | null = null;
  @Input() saving = false;
  @Input() loading = false;
  @Input() error = '';
  @Output() saveZones = new EventEmitter<DeliveryZones>();
  @Output() closed = new EventEmitter<void>();
  @ViewChild('canvas', {static:true}) canvas!: ElementRef<HTMLDivElement>;
  draft: DeliveryZones = {schemaVersion:1,green:[],yellow:[]};
  active: 'green'|'yellow' = 'green';
  readonly validationError = signal('');
  readonly tileError = signal(false);
  private map?: L.Map;
  private layers?: L.LayerGroup;
  private observer?: ResizeObserver;
  private frame?: number;
  constructor(private readonly zone: NgZone) {}
  ngOnInit(): void { this.draft = this.zones ? structuredClone(this.zones) : {schemaVersion:1,green:[],yellow:[]}; }
  ngOnChanges(): void { this.render(); }
  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.map = L.map(this.canvas.nativeElement,{scrollWheelZoom:false,doubleClickZoom:false}).setView([-19.747,-47.939],13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'})
        .on('loading',()=>this.zone.run(()=>this.tileError.set(false)))
        .on('tileerror',()=>this.zone.run(()=>this.tileError.set(true))).addTo(this.map);
      this.layers=L.layerGroup().addTo(this.map);
      this.map.on('click',(event:L.LeafletMouseEvent)=>this.zone.run(()=>this.addVertex(event.latlng.wrap())));
      this.observer=new ResizeObserver(()=>this.map?.invalidateSize({pan:false}));
      this.observer.observe(this.canvas.nativeElement);
      this.frame=requestAnimationFrame(()=>{this.map?.invalidateSize({pan:false});this.render();if(this.draft.yellow.length>=3)this.map?.fitBounds(L.latLngBounds(this.draft.yellow),{padding:[25,25],maxZoom:14});});
    });
  }
  get busy(): boolean { return this.loading || this.saving; }
  choose(zone:'green'|'yellow'): void { if(this.busy)return;this.active=zone;this.render(); }
  addVertex(point:GeoPoint): void {
    if(this.busy || !this.valid(point))return;
    this.draft[this.active].push({lat:point.lat,lng:point.lng});this.changed();
  }
  addCenter(): void { if(this.map)this.addVertex(this.map.getCenter().wrap()); }
  moveVertex(index:number,point:GeoPoint): void {
    if(this.busy || !this.draft[this.active][index] || !this.valid(point))return;
    this.draft[this.active][index]={lat:point.lat,lng:point.lng};this.changed();
  }
  undo(): void { if(this.busy)return;this.draft[this.active].pop();this.changed(); }
  clear(): void { if(this.busy)return;this.draft[this.active]=[];this.changed(); }
  save(): void {
    if(this.busy)return;
    const issue=validateDeliveryZones(this.draft);this.validationError.set(issue??'');
    if(!issue)this.saveZones.emit(structuredClone(this.draft));
  }
  close(): void { if(!this.busy)this.closed.emit(); }
  private valid(point:GeoPoint): boolean { return Number.isFinite(point.lat)&&Number.isFinite(point.lng)&&Math.abs(point.lat)<=90&&Math.abs(point.lng)<=180; }
  private changed(): void { this.validationError.set('');this.render(); }
  private render(): void {
    if(!this.layers)return;
    this.layers.eachLayer(layer=>layer.off());this.layers.clearLayers();
    for(const name of ['yellow','green'] as const){
      const points=this.draft[name],color=name==='green'?'#23c879':'#efbf35';
      if(points.length>=3)L.polygon(points,{color,weight:2,fillOpacity:.2,interactive:false}).addTo(this.layers);
      else if(points.length>=2)L.polyline(points,{color,weight:2,interactive:false}).addTo(this.layers);
      if(name!==this.active)continue;
      points.forEach((point,index)=>{
        const marker=L.marker(point,{draggable:!this.busy,title:`Ponto ${index+1}: arraste para ajustar`,alt:`Ponto ${index+1} da zona ${name==='green'?'verde':'amarela'}`,icon:L.divIcon({className:'zone-vertex',iconSize:[26,26],iconAnchor:[13,13],html:`<span style="display:grid;place-items:center;background:${color};border:2px solid white;border-radius:50%;width:24px;height:24px;color:#101014;font-size:12px;font-weight:800">${index+1}</span>`})}).addTo(this.layers!);
        marker.on('dragend',()=>this.zone.run(()=>this.moveVertex(index,marker.getLatLng().wrap())));
      });
    }
  }
  ngOnDestroy(): void { if(this.frame!==undefined)cancelAnimationFrame(this.frame);this.observer?.disconnect();this.layers?.eachLayer(layer=>layer.off());this.layers?.clearLayers();this.map?.off();this.map?.remove();this.map=undefined; }
}
