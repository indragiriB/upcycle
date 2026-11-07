import { formatNumber } from '@/lib/utils';

export const DEFAULT_CENTER: [number, number] = [-6.2441, 106.8002];

export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
) {
  const radius = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * radius * Math.asin(Math.sqrt(a));
}

export function formatDistance(distanceKm: number) {
  if (!Number.isFinite(distanceKm)) return '';
  if (distanceKm < 1) return `${Math.max(10, Math.round(distanceKm * 1000))} m`;
  return `${formatNumber(distanceKm, 1)} km`;
}
