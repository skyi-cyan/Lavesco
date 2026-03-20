/**
 * 골프장(CC) 모델 — admin-web golfCourses 컬렉션과 동일
 */
export interface GolfCourse {
  id: string;
  name: string;
  region: string;
  status: string;
  distanceUnit?: 'METER' | 'YARD';
  address?: string;
  homepage?: string;
  additionalInfo?: string;
  updatedAt?: unknown;
}

/** 티 색상 키 (admin-web types와 동일) */
export const TEE_KEYS = ['black', 'blue', 'white', 'red'] as const;
export type TeeKey = (typeof TEE_KEYS)[number];

/** 골프장 내 코스 (황룡, 청룡 등, 각 9홀) — admin-web과 동일 */
export interface GolfCourseCourse {
  id: string;
  name: string;
  courseUrl?: string;
  holeCount: number;
  order: number;
  updatedAt?: unknown;
}

/** 홀 정보 (1~9). 거리 Black/Blue/White/Red, PAR, HDCP — admin-web과 동일 */
export interface GolfCourseHoleInput {
  par: number;
  handicapIndex: number;
  order: number;
  distances: Record<string, number>;
}
