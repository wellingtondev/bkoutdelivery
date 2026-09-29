import { loadGoogleMaps, withAbort } from './google-maps';
export type AddressPoint = { lat: number; lng: number; label: string };

export async function searchUberaba(address: string, signal: AbortSignal): Promise<AddressPoint | null> {
  if (signal.aborted) throw new DOMException('Busca cancelada.', 'AbortError');
  const query = address.trim();
  if (query.length < 3) return null;
  // Prefer an explicit house number; do not confuse numbered street names with it.
  const requestedNumber = query.match(/(?:,\s*|\bn[º°.°]?\s*|\bn[uú]mero\s+)(\d{1,6}[a-z]?)(?=\s|,|-|$)/i)?.[1]
    ?? query.match(/^.+\D\s+(\d{1,6}[a-z]?)(?:\s*[-,].*)?$/i)?.[1];
  const maps = await withAbort(loadGoogleMaps(), signal);
  const { Geocoder } = await withAbort(maps.importLibrary('geocoding'), signal) as any;
  let response: any;
  try {
    response = await withAbort(new Geocoder().geocode({
      address: `${query}, Uberaba, Minas Gerais, Brasil`, region: 'BR',
      componentRestrictions: { country: 'BR', administrativeArea: 'MG', locality: 'Uberaba' },
    }), signal);
  } catch (error) {
    if (!signal.aborted && (error as {code?:string})?.code === 'ZERO_RESULTS') return null;
    throw error;
  }
  for (const result of response.results ?? []) {
    if (result.partial_match || !result.types?.some((type:string) => ['street_address','premise','subpremise','establishment','point_of_interest'].includes(type))) continue;
    const components = result.address_components ?? [];
    const component = (type:string) => components.find((item:any) => item.types?.includes(type));
    if(requestedNumber && String(component('street_number')?.long_name ?? '').toLowerCase() !== requestedNumber.toLowerCase()) continue;
    const city = component('locality')?.long_name ?? component('administrative_area_level_2')?.long_name;
    if (city?.toLowerCase() !== 'uberaba' || component('administrative_area_level_1')?.short_name !== 'MG' || component('country')?.short_name !== 'BR') continue;
    const lat = result.geometry?.location?.lat(), lng = result.geometry?.location?.lng();
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>90 || Math.abs(lng)>180) continue;
    return {lat,lng,label:result.formatted_address || `${query}, Uberaba – MG`};
  }
  return null;
}
