export const COURSE_ADD_REQUEST_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
] as const;

export type CourseAddRequestStatus = (typeof COURSE_ADD_REQUEST_STATUSES)[number];

export interface CourseAddRequest {
  id: string;
  userId: string;
  userEmail?: string;
  userNickname?: string;
  golfCourseName: string;
  region?: string;
  details?: string;
  status: CourseAddRequestStatus;
  adminReply?: string;
  /** 관리자가 등록한 골프장 문서 ID (선택) */
  createdGolfCourseId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  repliedAt?: unknown;
}

export interface CourseAddRequestAdminUpdate {
  status?: CourseAddRequestStatus;
  adminReply?: string;
  createdGolfCourseId?: string;
}
