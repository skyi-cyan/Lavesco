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
  /** 스코어 확정 시각. 있으면 확정 완료 상태 */
  scoreConfirmedAt: Date | null;

  // ---- HomeScreen 통계 최적화를 위한 집계값 (옵션/하위호환) ----
  // 기존 데이터(새 필드 없음)는 fetchUserConfirmedRoundStats에서 fallback으로 계산합니다.
  totalPutts?: number; // 18홀 퍼팅 합
  girHitCount?: number; // strokes-putts <= 2 인 홀 수
  girTotalCount?: number; // GIR 계산 분모(통상 18)
  firHitCount?: number; // par=4/5 홀 중 fairway=true인 홀 수
  firTotalCount?: number; // par=4/5 홀 수
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
