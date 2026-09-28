import type { GeoPoint } from '../models/models';
export interface DeliveryZones { schemaVersion: 1; green: GeoPoint[]; yellow: GeoPoint[]; }
export interface DeliveryFeeQuote { zone: 'GREEN' | 'YELLOW' | 'OUTSIDE'; fee: 10 | 12 | 15; }
const EPS = 1e-10;
const validPoint = (p: any): p is GeoPoint => !!p && typeof p.lat === 'number' && typeof p.lng === 'number' && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
const cross = (a: GeoPoint, b: GeoPoint, c: GeoPoint) => (b.lng-a.lng)*(c.lat-a.lat)-(b.lat-a.lat)*(c.lng-a.lng);
const same = (a: GeoPoint, b: GeoPoint) => Math.abs(a.lat-b.lat)<EPS && Math.abs(a.lng-b.lng)<EPS;
const on = (p: GeoPoint,a: GeoPoint,b: GeoPoint) => Math.abs(cross(a,b,p))<EPS && p.lng>=Math.min(a.lng,b.lng)-EPS && p.lng<=Math.max(a.lng,b.lng)+EPS && p.lat>=Math.min(a.lat,b.lat)-EPS && p.lat<=Math.max(a.lat,b.lat)+EPS;
function intersects(a: GeoPoint,b: GeoPoint,c: GeoPoint,d: GeoPoint): boolean {
  return (cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0) || on(a,c,d)||on(b,c,d)||on(c,a,b)||on(d,a,b);
}
function inside(p: GeoPoint, polygon: GeoPoint[]): boolean {
  let result=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[j],b=polygon[i];
    if(on(p,a,b)) return true;
    if((a.lat>p.lat)!==(b.lat>p.lat) && p.lng<(b.lng-a.lng)*(p.lat-a.lat)/(b.lat-a.lat)+a.lng) result=!result;
  }
  return result;
}
function simple(polygon: unknown): polygon is GeoPoint[] {
  if(!Array.isArray(polygon)||polygon.length<3||polygon.length>80||!polygon.every(validPoint)) return false;
  let area=0;
  for(let i=0;i<polygon.length;i++) {
    const a=polygon[i],b=polygon[(i+1)%polygon.length],previous=polygon[(i+polygon.length-1)%polygon.length];
    if(same(a,b)|| (Math.abs(cross(previous,a,b))<EPS && on(b,previous,a))) return false;
    area+=a.lng*b.lat-b.lng*a.lat;
    for(let j=i+1;j<polygon.length;j++) {
      if(j===i+1||(i===0&&j===polygon.length-1)) continue;
      if(intersects(a,b,polygon[j],polygon[(j+1)%polygon.length])) return false;
    }
  }
  return Math.abs(area)>EPS;
}
function contained(a: GeoPoint,b: GeoPoint,polygon: GeoPoint[]): boolean {
  if(!inside(a,polygon)||!inside(b,polygon)) return false;
  const dx=b.lng-a.lng,dy=b.lat-a.lat, ts=[0,1];
  for(let i=0;i<polygon.length;i++) {
    const c=polygon[i],d=polygon[(i+1)%polygon.length],ex=d.lng-c.lng,ey=d.lat-c.lat,den=dx*ey-dy*ex;
    if(Math.abs(den)>EPS) {
      const t=((c.lng-a.lng)*ey-(c.lat-a.lat)*ex)/den,u=((c.lng-a.lng)*dy-(c.lat-a.lat)*dx)/den;
      if(t>0&&t<1&&u>=-EPS&&u<=1+EPS) ts.push(t);
    } else {
      for(const p of [c,d]) if(on(p,a,b)) ts.push(Math.abs(dx)>Math.abs(dy)?(p.lng-a.lng)/dx:(p.lat-a.lat)/dy);
    }
  }
  ts.sort((x,y)=>x-y);
  return ts.every((t,i)=>i===0||inside({lng:a.lng+dx*(t+ts[i-1])/2,lat:a.lat+dy*(t+ts[i-1])/2},polygon));
}
export function validateDeliveryZones(value: unknown): string | null {
  const zones=value as DeliveryZones;
  if(!zones||zones.schemaVersion!==1) return 'Configuração de zonas inválida.';
  if(!simple(zones.green)||!simple(zones.yellow)) return 'Desenhe duas áreas simples, sem cruzamentos, com 3 a 80 pontos válidos.';
  if(!zones.green.every((a,i)=>contained(a,zones.green[(i+1)%zones.green.length],zones.yellow))) return 'A área verde precisa estar inteiramente dentro da área amarela.';
  return null;
}
export function deliveryFeeForPoint(point: GeoPoint,zones: DeliveryZones): DeliveryFeeQuote | null {
  if(!validPoint(point)||validateDeliveryZones(zones)) return null;
  return inside(point,zones.green)?{zone:'GREEN',fee:10}:inside(point,zones.yellow)?{zone:'YELLOW',fee:12}:{zone:'OUTSIDE',fee:15};
}
