import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, ViewChild, signal } from '@angular/core';
import { loadGoogleMaps, GOOGLE_MAP_ID } from '../../core/google-maps';
import { DeliveryZones, validateDeliveryZones } from '../../core/delivery-zones';
type Point = {lat:number;lng:number};
@Component({selector:'app-delivery-map',standalone:true,templateUrl:'./delivery-map.component.html',styleUrl:'./delivery-map.component.css'})
export class DeliveryMapComponent implements AfterViewInit,OnChanges,OnDestroy {
 @Input() destination:Point|null=null;
 @Input() driverPosition:Point|null=null;
 @Input() selectable=false;
 @Input() zones:DeliveryZones|null=null;
 @Input() routePath:Point[]=[];
 @Output() destinationChange=new EventEmitter<Point>();
 @ViewChild('canvas',{static:true}) canvas!:ElementRef<HTMLDivElement>;
 readonly tileError=signal(false);
 readonly loading=signal(true);
 readonly locating=signal(false);
 readonly locationMessage=signal('');
 private maps:any; private map:any; private Marker:any;
 private destinationMarker:any; private driverMarker:any;
 private polygons:any[]=[]; private listeners:any[]=[];
 private routeLine:any;
 private observer?:ResizeObserver; private destroyed=false; private lastPositions='';
 constructor(private readonly zone:NgZone){}
 async ngAfterViewInit():Promise<void>{
  try {
   const maps=await loadGoogleMaps();
   const [{Map},{AdvancedMarkerElement}]=await Promise.all([maps.importLibrary('maps'),maps.importLibrary('marker')]);
   if(this.destroyed)return;
   this.maps=maps;this.Marker=AdvancedMarkerElement;
   this.zone.runOutsideAngular(()=>{
    this.map=new Map(this.canvas.nativeElement,{center:{lat:-19.747,lng:-47.939},zoom:13,maxZoom:19,mapId:GOOGLE_MAP_ID,gestureHandling:'cooperative',mapTypeControl:false,streetViewControl:false});
    this.listeners.push(this.map.addListener('click',(event:any)=>{if(this.selectable&&event.latLng)this.select(event.latLng.toJSON());}));
    this.observer=new ResizeObserver(()=>this.maps.event.trigger(this.map,'resize'));this.observer.observe(this.canvas.nativeElement);
    this.syncZones();this.syncMarkers();this.syncRoute();
   });
  }catch {if(!this.destroyed)this.zone.run(()=>this.tileError.set(true));}
  finally {if(!this.destroyed)this.zone.run(()=>this.loading.set(false));}
 }
 ngOnChanges():void{this.syncZones();this.syncMarkers();this.syncRoute();}
 private syncRoute():void{
  if(!this.map)return;
  const path=this.routePath;
  if(path.length<2||!path.every(point=>this.valid(point))){this.routeLine?.setMap(null);this.routeLine=undefined;return;}
  if(this.routeLine)this.routeLine.setPath(path);
  else this.routeLine=new this.maps.Polyline({map:this.map,path,strokeColor:'#ef4338',strokeOpacity:.95,strokeWeight:5,clickable:false,zIndex:4});
 }
 private syncZones():void{
  if(!this.map)return;
  this.polygons.forEach(p=>p.setMap(null));this.polygons=[];
  if(!this.zones||validateDeliveryZones(this.zones))return;
  for(const name of ['yellow','green'] as const){const color=name==='green'?'#23c879':'#efbf35';this.polygons.push(new this.maps.Polygon({map:this.map,paths:this.zones[name],strokeColor:color,strokeWeight:2,fillColor:color,fillOpacity:.18,clickable:false,zIndex:name==='green'?2:1}));}
 }
 private icon(symbol:string,color:string):HTMLElement{const node=document.createElement('span');node.textContent=symbol;node.setAttribute('aria-hidden','true');node.style.cssText=`display:grid;place-items:center;width:40px;height:40px;border:2px solid white;border-radius:50%;background:${color};color:white;box-shadow:0 3px 12px #0008;font-size:26px`;return node;}
 private removeMarker(marker:any):void{if(marker){this.maps.event.clearInstanceListeners(marker);marker.map=null;}}
 private syncMarkers():void{
  if(!this.map)return;
  const destination=this.valid(this.destination)?this.destination:null,driver=this.valid(this.driverPosition)?this.driverPosition:null;
  if(destination){
   if(!this.destinationMarker){this.destinationMarker=new this.Marker({map:this.map,position:destination,content:this.icon('●','#ed3024'),title:'Destino da entrega',gmpDraggable:this.selectable});this.destinationMarker.addListener('dragend',(event:any)=>{if(this.selectable&&event.latLng)this.select(event.latLng.toJSON());});}
   this.destinationMarker.position=destination;this.destinationMarker.gmpDraggable=this.selectable;
  }else{this.removeMarker(this.destinationMarker);this.destinationMarker=undefined;}
  if(driver){if(!this.driverMarker)this.driverMarker=new this.Marker({map:this.map,position:driver,content:this.icon('🐺','#202126'),title:'Última localização do entregador Blackout'});else this.driverMarker.position=driver;}
  else{this.removeMarker(this.driverMarker);this.driverMarker=undefined;}
  const positions=JSON.stringify([destination,driver]);if(positions===this.lastPositions)return;this.lastPositions=positions;
  if(destination&&driver){const bounds=new this.maps.LatLngBounds();bounds.extend(destination);bounds.extend(driver);this.map.fitBounds(bounds,40);}
  else if(destination||driver){this.map.setCenter(destination||driver);this.map.setZoom(17);}
 }
 selectCenter():void{if(this.map&&this.selectable)this.select(this.map.getCenter().toJSON());}
 locate():void{
  if(!this.selectable||this.locating())return;
  if(!navigator.geolocation){this.locationMessage.set('Este navegador não permite localizar você. Marque o destino no mapa.');return;}
  this.locating.set(true);this.locationMessage.set('Localizando…');
  navigator.geolocation.getCurrentPosition(position=>{if(this.destroyed)return;this.zone.run(()=>{this.locating.set(false);this.map?.setCenter({lat:position.coords.latitude,lng:position.coords.longitude});this.map?.setZoom(17);this.locationMessage.set('Mapa centralizado na sua localização. Marque o endereço de entrega para confirmar o destino.');});},error=>{if(this.destroyed)return;this.zone.run(()=>{this.locating.set(false);this.locationMessage.set(error.code===1?'Permissão de localização negada. Marque o destino no mapa.':'Não foi possível obter sua localização. Marque o destino no mapa.');});},{enableHighAccuracy:true,timeout:15000,maximumAge:30000});
 }
 private valid(point:Point|null):point is Point{return !!point&&Number.isFinite(point.lat)&&Number.isFinite(point.lng)&&Math.abs(point.lat)<=90&&Math.abs(point.lng)<=180;}
 private select(point:Point):void{if(this.valid(point))this.zone.run(()=>this.destinationChange.emit({lat:point.lat,lng:point.lng}));}
 ngOnDestroy():void{this.destroyed=true;this.observer?.disconnect();this.listeners.forEach(l=>l.remove());this.removeMarker(this.destinationMarker);this.removeMarker(this.driverMarker);this.polygons.forEach(p=>p.setMap(null));this.routeLine?.setMap(null);if(this.map)this.maps.event.clearInstanceListeners(this.map);this.map=undefined;}
}
