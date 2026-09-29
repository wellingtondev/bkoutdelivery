import { GeoPoint } from '../../models/models';

export interface TrackingRouteResult {
  path: GeoPoint[];
  durationSeconds: number;
  distanceMeters: number;
  calculatedAt: number;
  arrivalTime: number;
}
export interface TrackingRouteInput {
  key: string;
  enabled: boolean;
  origin: GeoPoint | null;
  destination: GeoPoint | null;
  now: number;
}
export interface TrackingRouteState { result: TrackingRouteResult | null; loading: boolean; error: boolean; }

/** Owns one public tracking request. GPS snapshots never abort an unchanged leg. */
export class TrackingRouteController {
  private controller?: AbortController;
  private key = '';
  private generation = 0;
  private lastAttempt = -Infinity;
  private destroyed = false;
  private result: TrackingRouteResult | null = null;
  constructor(
    private readonly calculate: (origin: GeoPoint, destination: GeoPoint, signal: AbortSignal) => Promise<TrackingRouteResult>,
    private readonly changed: (state: TrackingRouteState) => void,
  ) {}

  update(input: TrackingRouteInput): void {
    if (this.destroyed) return;
    if (input.key !== this.key) { this.cancel(); this.key = input.key; }
    if (!input.enabled || !this.valid(input.origin) || !this.valid(input.destination)) {
      this.cancel();
      return;
    }
    if (this.controller || input.now - this.lastAttempt < 60000) return;
    this.lastAttempt = input.now;
    const controller = new AbortController();
    this.controller = controller;
    const generation = ++this.generation;
    this.changed({ result: this.result, loading: true, error: false });
    // Snapshot origin; later GPS ticks do not change or cancel the pending request.
    const origin = { ...input.origin }, destination = { ...input.destination };
    void this.calculate(origin, destination, controller.signal).then(result => {
      if (this.destroyed || generation !== this.generation || controller.signal.aborted) return;
      this.controller = undefined;
      this.result = result;
      this.changed({ result, loading: false, error: false });
    }).catch(() => {
      if (this.destroyed || generation !== this.generation || controller.signal.aborted) return;
      this.controller = undefined;
      this.result = null;
      this.changed({ result: null, loading: false, error: true });
    });
  }

  private valid(point: GeoPoint | null): point is GeoPoint {
    return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
  }
  private cancel(): void {
    this.generation++;
    this.controller?.abort();
    this.controller = undefined;
    this.result = null;
    this.changed({ result: null, loading: false, error: false });
  }
  destroy(): void { this.destroyed = true; this.cancel(); }
}

export function liveArrival(result: TrackingRouteResult | null, isLive: boolean, routePosition?: number | null): number {
  return isLive && !(typeof routePosition === 'number' && routePosition > 1) && result && Number.isFinite(result.arrivalTime) ? result.arrivalTime : 0;
}

export function remainingMinutes(arrival: number, now: number): number { return Math.max(0, Math.ceil((arrival - now) / 60000)); }
