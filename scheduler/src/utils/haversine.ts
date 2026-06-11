const R = 3958.8; // Earth radius in miles

export function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimatedDriveMinutes(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const miles = distanceMiles(lat1, lng1, lat2, lng2);
  // assume 25mph average in home health territory
  return (miles / 25) * 60;
}

export function totalRouteMiles(coords: { lat: number; lng: number }[]): number {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += distanceMiles(coords[i].lat, coords[i].lng, coords[i + 1].lat, coords[i + 1].lng);
  }
  return total;
}

export function totalRouteDriveMinutes(coords: { lat: number; lng: number }[]): number {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += estimatedDriveMinutes(
      coords[i].lat,
      coords[i].lng,
      coords[i + 1].lat,
      coords[i + 1].lng
    );
  }
  return total;
}
