export type GolfClubId =
  | 'driver'
  | '3w'
  | '5w'
  | '4h'
  | '5h'
  | '4i'
  | '5i'
  | '6i'
  | '7i'
  | '8i'
  | '9i'
  | 'pw'
  | 'sw'
  | 'lw'
  | 'putter';

export interface GolfClubOption {
  id: GolfClubId;
  label: string;
}

export const GOLF_CLUBS: GolfClubOption[] = [
  { id: 'driver', label: 'Driver' },
  { id: '3w', label: '3W' },
  { id: '5w', label: '5W' },
  { id: '4h', label: '4H' },
  { id: '5h', label: '5H' },
  { id: '4i', label: '4I' },
  { id: '5i', label: '5I' },
  { id: '6i', label: '6I' },
  { id: '7i', label: '7I' },
  { id: '8i', label: '8I' },
  { id: '9i', label: '9I' },
  { id: 'pw', label: 'PW' },
  { id: 'sw', label: 'SW' },
  { id: 'lw', label: 'LW' },
  { id: 'putter', label: 'Putter' },
];

export function getGolfClubLabel(clubId: string): string {
  return GOLF_CLUBS.find((c) => c.id === clubId)?.label ?? clubId;
}
