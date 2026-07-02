/** 두 GPS 좌표 간 직선 거리 (미터) */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadiusM = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusM * c;
}

export function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '-';
  return `${Math.round(meters)}m`;
}

export function formatAccuracyMeters(accuracy: number | null | undefined): string {
  if (accuracy == null || !Number.isFinite(accuracy)) return '정확도 알 수 없음';
  return `±${Math.round(accuracy)}m`;
}

export interface ClubDistanceStats {
  count: number;
  maxMeters: number | null;
  minMeters: number | null;
  avgMeters: number | null;
}

export function computeClubDistanceStats(distances: number[]): ClubDistanceStats {
  if (distances.length === 0) {
    return { count: 0, maxMeters: null, minMeters: null, avgMeters: null };
  }
  const sum = distances.reduce((acc, d) => acc + d, 0);
  return {
    count: distances.length,
    maxMeters: Math.max(...distances),
    minMeters: Math.min(...distances),
    avgMeters: sum / distances.length,
  };
}

export function formatAvgDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '-';
  return `${Math.round(meters)}m`;
}
