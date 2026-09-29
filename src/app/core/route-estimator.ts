import { Injectable } from '@angular/core';
import type { Delivery } from '../models/models';
import { loadGoogleMaps, withAbort } from './google-maps';

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
    if (signal.aborted) throw new DOMException('Cálculo cancelado.', 'AbortError');
    if (!deliveries.length || deliveries.length > 99) throw new Error('O cálculo aceita de 1 a 99 paradas.');
    if (deliveries.some(d => !Number.isFinite(d.lat) || !Number.isFinite(d.lng) || Math.abs(d.lat!) > 90 || Math.abs(d.lng!) > 180)) {
      throw new Error('Há entrega sem destino válido no mapa. Peça à loja para corrigir o endereço.');
    }
    if (Date.now() - this.lastRequest < 1100) throw new Error('Aguarde um instante antes de recalcular.');
    this.lastRequest = Date.now();
    const maps = await withAbort(loadGoogleMaps(), signal);
    const { Route } = await withAbort(maps.importLibrary('routes') as Promise<any>, signal);
    const departure = Date.now();
    const legs: {duration:number}[] = [];
    let origin = { ...ROUTE_ORIGIN };
    for (let offset = 0; offset < deliveries.length; offset += 26) {
      if (signal.aborted) throw new DOMException('Cálculo cancelado.', 'AbortError');
      const stops = deliveries.slice(offset, offset + 26).map(d => ({ lat:d.lat!, lng:d.lng! }));
      // Twenty-five intermediate waypoints plus the destination. Preserve driver ordering.
      const request: any = {
        origin, destination: stops[stops.length - 1],
        intermediates: stops.slice(0, -1).map(location => ({ location })),
        travelMode: 'DRIVING', routingPreference: 'TRAFFIC_AWARE',
        optimizeWaypointOrder: false, computeAlternativeRoutes: false,
        fields: ['legs.durationMillis']
      };
      // The first departure defaults to request time, avoiding an already-past timestamp.
      // Later batches start after driving and customer stops from preceding batches.
      if (offset > 0) {
        const elapsed = legs.reduce((total,leg) => total + leg.duration, 0) + offset * STOP_SECONDS;
        request.departureTime = new Date(Math.max(Date.now() + 1000, departure + elapsed * 1000));
      }
      const response = await withAbort(Route.computeRoutes(request) as Promise<any>, signal);
      const batchLegs = response.routes?.[0]?.legs;
      if (!Array.isArray(batchLegs) || batchLegs.length !== stops.length) throw new Error('Resposta de rota incompleta.');
      for (const leg of batchLegs) {
        if (!Number.isFinite(leg.durationMillis) || leg.durationMillis < 0) throw new Error('Duração de rota inválida.');
        legs.push({ duration: leg.durationMillis / 1000 });
      }
      origin = stops[stops.length - 1];
    }
    if (signal.aborted) throw new DOMException('Cálculo cancelado.', 'AbortError');
    return arrivalEstimates(deliveries.map(d=>d.id), legs, departure);
  }
}
