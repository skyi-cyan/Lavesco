import type { GolfClubId } from '../constants/golfClubs';

export type DistanceRecordMethod = 'GPS';

export interface DistanceRecordInput {
  clubId: GolfClubId;
  clubLabel: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distanceMeters: number;
  startAccuracyMeters: number | null;
  endAccuracyMeters: number | null;
  method: DistanceRecordMethod;
  roundId?: string | null;
  golfCourseName?: string | null;
  roundDate?: string | null;
}

export interface DistanceRecord extends DistanceRecordInput {
  id: string;
  recordedAt: Date;
}
