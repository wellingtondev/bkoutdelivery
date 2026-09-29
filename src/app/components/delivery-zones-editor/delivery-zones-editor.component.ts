import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, OnInit, Output, ViewChild, signal } from '@angular/core';
import { loadGoogleMaps, GOOGLE_MAP_ID } from '../../core/google-maps';
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
  private map:any; private maps:any; private Marker:any; private destroyed=false; private objects:any[]=[]; private listeners:any[]=[];
  readonly mapLoading=signal(true);
  private observer?: ResizeObserver;
  
  constructor(private readonly zone: NgZone) {}
  ngOnInit(): void { this.draft = this.zones ? structuredClone(this.zones) : {schemaVersion:1,green:[],yellow:[]}; }
  ngOnChanges(): void { this.render(); }
  async ngAfterViewInit(): Promise<void> {
    try {
      const maps=await loadGoogleMaps();
      const [{Map},{AdvancedMarkerElement}]=await Promise.all([maps.importLibrary('maps'),maps.importLibrary('marker')]);
      if(this.destroyed)return;
      this.maps=maps;this.Marker=AdvancedMarkerElement;
      this.zone.runOutsideAngular(()=>{
        this.map=new Map(this.canvas.nativeElement,{center:{lat:-19.747,lng:-47.939},zoom:13,maxZoom:19,mapId:GOOGLE_MAP_ID,gestureHandling:'cooperative',disableDoubleClickZoom:true,mapTypeControl:false,streetViewControl:false});
        this.listeners.push(this.map.addListener('click',(event:any)=>{if(event.latLng)this.zone.run(()=>this.addVertex(event.latLng.toJSON()));}));
        this.observer=new ResizeObserver(()=>this.maps.event.trigger(this.map,'resize'));this.observer.observe(this.canvas.nativeElement);
        this.render();
        if(this.draft.yellow.length>=3){const bounds=new maps.LatLngBounds();this.draft.yellow.forEach(p=>bounds.extend(p));this.map.fitBounds(bounds,25);}
      });
    }catch{if(!this.destroyed)this.zone.run(()=>this.tileError.set(true));}
    finally{if(!this.destroyed)this.zone.run(()=>this.mapLoading.set(false));}
  }  get busy(): boolean { return this.loading || this.saving; }
  choose(zone:'green'|'yellow'): void { if(this.busy)return;this.active=zone;this.render(); }
  addVertex(point:GeoPoint): void {
    if(this.busy || !this.valid(point))return;
    this.draft[this.active].push({lat:point.lat,lng:point.lng});this.changed();
  }
  addCenter(): void { if(this.map)this.addVertex(this.map.getCenter().toJSON()); }
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
  private clearObjects():void {
    this.objects.forEach(object=>{this.maps.event.clearInstanceListeners(object);if(object.setMap)object.setMap(null);else object.map=null;});this.objects=[];
  }
  private render(): void {
    if(!this.map)return;
    this.clearObjects();
    for(const name of ['yellow','green'] as const){
      const points=this.draft[name],color=name==='green'?'#23c879':'#efbf35';
      const options={map:this.map,strokeColor:color,strokeWeight:2,clickable:false,zIndex:name==='green'?2:1};
      if(points.length>=3)this.objects.push(new this.maps.Polygon({...options,paths:points,fillColor:color,fillOpacity:.2}));
      else if(points.length>=2)this.objects.push(new this.maps.Polyline({...options,path:points}));
      if(name!==this.active)continue;
      points.forEach((point,index)=>{
        const content=document.createElement('span');content.textContent=String(index+1);content.style.cssText=`display:grid;place-items:center;background:${color};border:2px solid white;border-radius:50%;width:26px;height:26px;color:#101014;font-size:12px;font-weight:800`;
        const marker=new this.Marker({map:this.map,position:point,content,gmpDraggable:!this.busy,title:`Ponto ${index+1} da zona ${name==='green'?'verde':'amarela'}: arraste para ajustar`});
        marker.addListener('dragend',(event:any)=>{if(event.latLng)this.zone.run(()=>this.moveVertex(index,event.latLng.toJSON()));});this.objects.push(marker);
      });
    }
  }
  ngOnDestroy():void{this.destroyed=true;this.observer?.disconnect();this.listeners.forEach(l=>l.remove());this.clearObjects();if(this.map)this.maps.event.clearInstanceListeners(this.map);this.map=undefined;}
}
