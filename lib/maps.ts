/*
  Lightweight Google Maps helpers for Expo.
  Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env before using.
*/

export type LatLng = { latitude: number; longitude: number };

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
  return key;
}

export type PlaceSuggestion = {
  place_id: string;
  description: string;
  structured?: { main_text: string; secondary_text: string };
};

export async function fetchPlacesAutocomplete(query: string, options?: { location?: LatLng; radiusMeters?: number }): Promise<PlaceSuggestion[]> {
  const key = getApiKey();
  const params = new URLSearchParams({
    key,
    input: query,
    types: 'geocode',
  });
  if (options?.location) {
    params.set('location', `${options.location.latitude},${options.location.longitude}`);
    params.set('radius', String(options.radiusMeters ?? 20000));
  }
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Places autocomplete failed');
  const data = await res.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') throw new Error(`Places error: ${data.status}`);
  return (data.predictions ?? []).map((p: any) => ({
    place_id: p.place_id,
    description: p.description,
    structured: p.structured_formatting ? { main_text: p.structured_formatting.main_text, secondary_text: p.structured_formatting.secondary_text } : undefined,
  }));
}

export async function fetchPlaceDetails(placeId: string): Promise<LatLng | null> {
  const key = getApiKey();
  const params = new URLSearchParams({ key, place_id: placeId, fields: 'geometry' });
  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Place details failed');
  const data = await res.json();
  if (data.status !== 'OK') return null;
  const loc = data.result?.geometry?.location;
  if (!loc) return null;
  return { latitude: loc.lat, longitude: loc.lng };
}

export type DirectionsStep = {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
};

export type DirectionsResult = {
  polyline: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  steps: DirectionsStep[];
};

export async function fetchDirections(origin: LatLng, destination: LatLng): Promise<DirectionsResult | null> {
  const key = getApiKey();
  const params = new URLSearchParams({
    key,
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    mode: 'driving',
  });
  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Directions fetch failed');
  const data = await res.json();
  const route = data.routes?.[0];
  const leg = route?.legs?.[0];
  const encoded = route?.overview_polyline?.points;
  if (!route || !leg || !encoded) return null;
  return {
    polyline: decodePolyline(encoded),
    distanceMeters: leg.distance?.value ?? 0,
    durationSeconds: leg.duration?.value ?? 0,
    steps: (leg.steps ?? []).map((s: any) => ({
      instruction: stripHtml(String(s.html_instructions ?? '')),
      distanceMeters: s.distance?.value ?? 0,
      durationSeconds: s.duration?.value ?? 0,
    })),
  };
}

// Minimal polyline decoder (Google Encoded Polyline Algorithm Format)
function decodePolyline(encoded: string): LatLng[] {
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const path: LatLng[] = [];

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    path.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return path;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}


