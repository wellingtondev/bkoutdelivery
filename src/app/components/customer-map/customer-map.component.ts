import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, ViewChild, signal } from '@angular/core';
import { Delivery } from '../../models/models';
import { customerLocations } from '../../core/customer-locations';
import { loadGoogleMaps, GOOGLE_MAP_ID } from '../../core/google-maps';

@Component({selector:'app-customer-map',standalone:true,templateUrl:'./customer-map.component.html',styleUrl:'./customer-map.component.css'})
export class CustomerMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() deliveries:readonly Delivery[]=[];
  @Input() dataLoading=false;
  @Input() dataError='';
  @Output() closed=new EventEmitter<void>();
  @ViewChild('canvas',{static:true}) canvas!:ElementRef<HTMLDivElement>;
  readonly loading=signal(true);
  readonly error=signal('');
  private maps:any;
  private map:any;
  private Marker:any;
  private markers:any[]=[];
  private observer?:ResizeObserver;
  private destroyed=false;
  constructor(private readonly zone:NgZone){}
  get locations(){return this.dataLoading||this.dataError?[]:customerLocations(this.deliveries);}
  get omittedCount():number{return this.deliveries.filter(d=>d.status==='DELIVERED'&&(!Number.isFinite(d.lat)||!Number.isFinite(d.lng)||Math.abs(d.lat!)>90||Math.abs(d.lng!)>180)).length;}
  async ngAfterViewInit():Promise<void>{
    try{
      const maps=await loadGoogleMaps();
      const [{Map},{AdvancedMarkerElement}]=await Promise.all([maps.importLibrary('maps'),maps.importLibrary('marker')]);
      if(this.destroyed)return;
      this.maps=maps;this.Marker=AdvancedMarkerElement;
      this.zone.runOutsideAngular(()=>{
        this.map=new Map(this.canvas.nativeElement,{center:{lat:-19.747,lng:-47.939},zoom:13,maxZoom:17,mapId:GOOGLE_MAP_ID,gestureHandling:'cooperative',mapTypeControl:false,streetViewControl:false});
        this.observer=new ResizeObserver(()=>{if(this.map)this.maps.event.trigger(this.map,'resize');});this.observer.observe(this.canvas.nativeElement);
        this.render();
      });
    }catch{if(!this.destroyed)this.zone.run(()=>this.error.set('Não foi possível carregar o Google Maps. Confira sua conexão e a configuração da chave.'));}
    finally{if(!this.destroyed)this.zone.run(()=>this.loading.set(false));}
  }
  ngOnChanges():void{this.render();}
  close():void{this.closed.emit();}
  private clearMarkers():void{this.markers.forEach(marker=>{this.maps.event.clearInstanceListeners(marker);marker.map=null;});this.markers=[];}
  private render():void{
    if(!this.map)return;
    this.clearMarkers();const locations=this.locations;
    const bounds=new this.maps.LatLngBounds();
    for(const point of locations){
      const content=document.createElement('span');
      content.textContent=`🐺 ${point.name}`;
      content.style.cssText='display:block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:8px 12px;background:#202126;color:#fff;border:2px solid #ff5147;border-radius:16px;box-shadow:0 3px 12px #0008;font:600 13px system-ui';
      this.markers.push(new this.Marker({map:this.map,position:{lat:point.lat,lng:point.lng},content,title:`${point.name} · ${point.deliveries} entrega(s)`}));bounds.extend(point);
    }
    if(locations.length)this.map.fitBounds(bounds,50);
  }
  ngOnDestroy():void{this.destroyed=true;this.observer?.disconnect();this.clearMarkers();if(this.map)this.maps.event.clearInstanceListeners(this.map);this.map=undefined;}
}
