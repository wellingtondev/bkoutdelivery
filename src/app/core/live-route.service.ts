import { Injectable } from '@angular/core';
import type { GeoPoint } from '../models/models';
import { loadGoogleMaps, withAbort } from './google-maps';

export interface LiveRouteResult {
  path: GeoPoint[];
  durationSeconds: number;
  distanceMeters: number;
  calculatedAt: number;
  arrivalTime: number;
}

function validPoint(point: GeoPoint | null | undefined): point is GeoPoint {
  return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng)
    && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
}

@Injectable({ providedIn: 'root' })
export class LiveRouteService {
  async calculate(origin: GeoPoint, destination: GeoPoint, signal: AbortSignal): Promise<LiveRouteResult> {
    if (signal.aborted) throw new DOMException('Cálculo cancelado.', 'AbortError');
    if (!validPoint(origin) || !validPoint(destination)) throw new Error('As coordenadas da entrega são inválidas.');
    // Copy only coordinates before awaiting SDK: no private order data or mutable caller state.
    const start = { lat: origin.lat, lng: origin.lng };
    const end = { lat: destination.lat, lng: destination.lng };
    const maps = await withAbort(loadGoogleMaps(), signal);
    const { Route } = await withAbort(maps.importLibrary('routes') as Promise<any>, signal);
    const response = await withAbort(Route.computeRoutes({
      origin: start, destination: end, travelMode: 'DRIVING', routingPreference: 'TRAFFIC_AWARE',
      fields: ['path', 'durationMillis', 'distanceMeters']
    }) as Promise<any>, signal);
    if (signal.aborted) throw new DOMException('Cálculo cancelado.', 'AbortError');
    const route = response?.routes?.[0];
    if (!route || !Array.isArray(route.path) || route.path.length < 2 || !route.path.every(validPoint)
      || !Number.isFinite(route.durationMillis) || route.durationMillis < 0
      || !Number.isFinite(route.distanceMeters) || route.distanceMeters < 0) {
      throw new Error('O Google não retornou uma rota válida para esta entrega.');
    }
    // Route.path consists of LatLngAltitude objects with numeric lat/lng properties.
    const path: GeoPoint[] = route.path.map((point: GeoPoint) => ({ lat: point.lat, lng: point.lng }));
    const calculatedAt = Date.now();
    const arrivalTime = calculatedAt + route.durationMillis;
    if (!Number.isFinite(new Date(arrivalTime).getTime())) throw new Error('A duração da rota é inválida.');
    return { path, durationSeconds: route.durationMillis / 1000, distanceMeters: route.distanceMeters, calculatedAt, arrivalTime };
  }
}
