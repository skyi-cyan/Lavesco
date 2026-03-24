/**
 * 이미지 구조: CC(골프장) → COURSE(황룡/청룡) → HOLE(1~9) + Black/Blue/White/Red 거리, PAR, HDCP
 */

export const TEE_KEYS = ['black', 'blue', 'white', 'red'] as const;
export type TeeKey = (typeof TEE_KEYS)[number];

/** 거리 단위 */
export const DISTANCE_UNITS = ['METER', 'YARD'] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

/** 골프장 (CC) */
export interface GolfCourse {
  id: string;
  name: string;
  region: string;
  status: string;
  /** 거리 단위: 미터(METER) / 야드(YARD) */
  distanceUnit?: DistanceUnit;
  /** 주소 (선택) */
  address?: string;
  /** 홈페이지 URL (선택) */
  homepage?: string;
  /** 추가 정보 (선택) */
  additionalInfo?: string;
  updatedAt?: unknown;
}

export interface GolfCourseInput {
  name: string;
  region: string;
  status?: string;
  distanceUnit?: DistanceUnit;
  address?: string;
  homepage?: string;
  additionalInfo?: string;
}

/** 골프장 내 코스 (황룡, 청룡 등 - 각 9홀) */
export interface GolfCourseCourse {
  id: string;
  name: string;
  courseUrl?: string;
  holeCount: number;
  order: number;
  updatedAt?: unknown;
}

export interface GolfCourseCourseInput {
  name: string;
  courseUrl?: string;
  holeCount?: number;
  order?: number;
}

/** 홀 (1~9). 거리: Black/Blue/White/Red, PAR, HDCP */
export interface GolfCourseHole {
  holeNo: string;
  par: number;
  handicapIndex: number;
  order: number;
  distances: Record<TeeKey, number>;
}

export interface GolfCourseHoleInput {
  par: number;
  handicapIndex: number;
  order: number;
  distances: Record<string, number>;
}
