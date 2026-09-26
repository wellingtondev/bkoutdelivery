export type AddressPoint = { lat: number; lng: number; label: string };

// The public Photon endpoint permits moderate search-as-you-type usage.
export async function searchUberaba(address: string, signal: AbortSignal): Promise<AddressPoint | null> {
  const query = address.trim();
  const params = new URLSearchParams({ q: `${query}, Uberaba, Minas Gerais, Brasil`, limit: '5', lat: '-19.747', lon: '-47.939' });
  const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal });
  if (!response.ok) throw new Error('Busca de endereço indisponível');
  const data = await response.json();
  for (const feature of data.features ?? []) {
    const p = feature.properties ?? {};
    const [lng, lat] = feature.geometry?.coordinates ?? [];
    if (String(p.city ?? '').toLowerCase() !== 'uberaba' || p.countrycode?.toUpperCase() !== 'BR') continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    // Ignore city/region centroids: a street or a named destination is required.
    if (!p.street && !['street', 'house'].includes(p.type) && p.osm_key !== 'amenity') continue;
    return { lat, lng, label: [p.street || p.name, p.housenumber, p.district, 'Uberaba – MG'].filter(Boolean).join(', ') };
  }
  return null;
}
