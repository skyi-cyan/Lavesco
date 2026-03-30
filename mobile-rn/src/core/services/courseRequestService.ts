import firestore from '@react-native-firebase/firestore';

const COLLECTION = 'courseAddRequests';

export type CourseAddRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

export interface CourseAddRequest {
  id: string;
  userId: string;
  userEmail: string;
  userNickname: string;
  golfCourseName: string;
  region: string;
  details: string;
  status: CourseAddRequestStatus;
  adminReply?: string;
  createdGolfCourseId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  repliedAt?: unknown;
}

/** Firestore 규칙(hasOnly)과 동일한 필드만 전송 */
export async function submitCourseAddRequest(params: {
  userId: string;
  userEmail: string;
  userNickname: string;
  golfCourseName: string;
  region: string;
  details: string;
}): Promise<void> {
  const now = firestore.FieldValue.serverTimestamp();
  await firestore().collection(COLLECTION).add({
    userId: params.userId,
    userEmail: params.userEmail,
    userNickname: params.userNickname,
    golfCourseName: params.golfCourseName.trim(),
    region: params.region.trim(),
    details: params.details.trim(),
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  });
}

export async function fetchMyCourseAddRequests(userId: string, limitCount = 15): Promise<CourseAddRequest[]> {
  const snap = await firestore()
    .collection(COLLECTION)
    .where('userId', '==', userId)
    // admin-web에서 막 생성한 요청이 바로 보이도록 서버 소스 우선 조회
    .get({ source: 'server' });

  const items: CourseAddRequest[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId ?? '',
      userEmail: data.userEmail ?? '',
      userNickname: data.userNickname ?? '',
      golfCourseName: data.golfCourseName ?? '',
      region: data.region ?? '',
      details: data.details ?? '',
      status: (data.status ?? 'PENDING') as CourseAddRequestStatus,
      adminReply: data.adminReply,
      createdGolfCourseId: data.createdGolfCourseId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      repliedAt: data.repliedAt,
    };
  });

  // createdAt 기준 정렬(서버 timestamp가 늦게 채워지는 타이밍 이슈를 완화)
  items.sort((a, b) => {
    const toMs = (v: unknown) => {
      if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
        return (v as { toDate: () => Date }).toDate().getTime();
      }
      if (v instanceof Date) return v.getTime();
      return 0;
    };
    return toMs(b.createdAt) - toMs(a.createdAt);
  });

  return items.slice(0, limitCount);
}
