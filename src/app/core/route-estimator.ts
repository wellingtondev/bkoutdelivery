import { Injectable } from '@angular/core';
import type { Delivery } from '../models/models';

// Public map listing for number 621 (Residencial Parque Umuarama), verified 2026-09-26.
export const ROUTE_ORIGIN = { lat: -19.7424531, lng: -47.9483885 };
export const ROUTE_ORIGIN_ADDRESS = 'Rua Cândida Mendonça Bilharinho, 621 — Mercês, Uberaba/MG';
export const STOP_SECONDS = 180;

export function arrivalEstimates(ids: string[], legs: {duration:number}[], departure: number): Record<string,string> {
  if (legs.length !== ids.length || !Number.isFinite(departure)) throw new Error('Resposta de rota incompleta.');
  let elapsed = 0;
  const estimates: Record<string,string> = {};
  ids.forEach((id,index) => {
    const duration = legs[index].duration;
    if (!Number.isFinite(duration) || duration < 0) throw new Error('Duração de rota inválida.');
    elapsed += duration + (index > 0 ? STOP_SECONDS : 0);
    estimates[id] = new Date(departure + Math.max(60,elapsed) * 1000).toISOString();
  });
  return estimates;
}

@Injectable({providedIn:'root'})
export class RouteEstimator {
  private lastRequest = 0;
  async calculate(deliveries: Delivery[], signal: AbortSignal): Promise<Record<string,string>> {
    if (!deliveries.length || deliveries.length > 99) throw new Error('O cálculo aceita de 1 a 99 paradas.');
    if (deliveries.some(d => !Number.isFinite(d.lat) || !Number.isFinite(d.lng) || Math.abs(d.lat!) > 90 || Math.abs(d.lng!) > 180)) {
      throw new Error('Há entrega sem destino válido no mapa. Peça à loja para corrigir o endereço.');
    }
    if (Date.now() - this.lastRequest < 1100) throw new Error('Aguarde um instante antes de recalcular.');
    this.lastRequest = Date.now();
    const coordinates = [ROUTE_ORIGIN,...deliveries.map(d=>({lat:d.lat!,lng:d.lng!}))].map(p=>`${p.lng},${p.lat}`).join(';');
    const response = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordinates}?overview=false&steps=false&alternatives=false&radiuses=${[ROUTE_ORIGIN,...deliveries].map(()=>100).join(';')}`, {signal});
    if (!response.ok) throw new Error('Serviço de rotas indisponível.');
    const data = await response.json();
    if (data.code !== 'Ok' || !Array.isArray(data.routes?.[0]?.legs)) throw new Error('Não foi possível encontrar um trajeto pelos destinos marcados.');
    return arrivalEstimates(deliveries.map(d=>d.id), data.routes[0].legs, Date.now());
  }
}
