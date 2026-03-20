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
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get();

  return snap.docs.map((d) => {
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
}
