import { Timestamp } from 'firebase/firestore';

export interface Course {
  id: string;
  name: string;
  region: string;
  holesCount: number;
  status: string;
  version: number;
  updatedAt?: Timestamp | null;
}

export interface CourseInput {
  name: string;
  region: string;
  holesCount: number;
  status: string;
  version?: number;
}

export interface TeeSet {
  id: string;
  name: string;
  gender?: string | null;
  rating?: number | null;
  slope?: number | null;
}

export interface TeeSetInput {
  name: string;
  gender?: string;
  rating?: number;
  slope?: number;
}

export interface HoleData {
  holeNo: string;
  par: number;
  handicapIndex?: number | null;
  order?: number | null;
  distances: Record<string, number>;
}

export interface HoleInput {
  par: number;
  handicapIndex?: number;
  order?: number;
  distances: Record<string, number>;
}
