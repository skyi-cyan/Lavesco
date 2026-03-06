/**
 * 라운드 문서 (Firestore rounds/{roundId})
 * 규칙: createdBy로 HOST 판별, status로 종료 여부 판별
 */
export type RoundStatus = 'DRAFT' | 'IN_PROGRESS' | 'FINISHED';

export interface Round {
  id: string;
  createdBy: string;
  roundName: string | null;
  roundNumber: string | null; // 4자리
  golfCourseId: string;
  golfCourseName: string;
  frontCourseId: string;
  frontCourseName: string;
  backCourseId: string;
  backCourseName: string;
  courseId: string; // 하위 호환: 전반 코스
  courseName: string;
  teeTime: string | null;
  status: RoundStatus;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 라운드 참가자 (rounds/{roundId}/participants/{uid})
 */
export interface RoundParticipant {
  uid: string;
  nickname: string | null;
  role: 'HOST' | 'MEMBER';
  joinStatus: string;
  holesEntered: number;
  totalOut: number;
  totalIn: number;
  total: number;
  updatedAt: Date;
}

/** 홀별 스코어 (rounds/{roundId}/scores/{uid} holes.{n}) */
export interface HoleScoreData {
  strokes: number;
  putts: number;
  fairway?: boolean | null;
  rough?: boolean | null;
  penalty?: boolean | null;
  ob?: number | null;
}
