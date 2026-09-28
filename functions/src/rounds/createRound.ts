import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

type CreateRoundRequest = {
  roundName?: string | null;
  golfCourseId?: string;
  golfCourseName?: string;
  frontCourseId?: string;
  frontCourseName?: string;
  backCourseId?: string;
  backCourseName?: string;
  teeTime?: string | null;
  /** ISO string or null */
  scheduledAt?: string | null;
  nickname?: string | null;
};

function randomRoundNumber(): string {
  const n = Math.floor(Math.random() * 900000) + 100000;
  return String(n);
}

/**
 * Admin SDK로 라운드 원자적 생성.
 * minInstances=1: 콜드스타트(수십 초) 방지 — 심사·실사용 체감 속도용
 */
export const createRound = functions
  .runWith({
    memory: '256MB',
    timeoutSeconds: 30,
    minInstances: 1,
  })
  .https.onCall(async (data: CreateRoundRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
    }

    const uid = context.auth.uid;
    const golfCourseName = String(data?.golfCourseName ?? '').trim();
    if (!golfCourseName) {
      throw new functions.https.HttpsError('invalid-argument', '골프장 이름이 필요합니다.');
    }

    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    let scheduledAt: admin.firestore.Timestamp | null = null;
    if (data.scheduledAt) {
      const d = new Date(data.scheduledAt);
      if (!Number.isNaN(d.getTime())) {
        scheduledAt = admin.firestore.Timestamp.fromDate(d);
      }
    }

    const roundPayload = {
      createdBy: uid,
      roundName: data.roundName ?? null,
      golfCourseId: data.golfCourseId ?? '',
      golfCourseName,
      frontCourseId: data.frontCourseId ?? '',
      frontCourseName: data.frontCourseName ?? '',
      backCourseId: data.backCourseId ?? '',
      backCourseName: data.backCourseName ?? '',
      courseId: data.frontCourseId ?? '',
      courseName: data.frontCourseName ?? '',
      teeTime: data.teeTime ?? null,
      status: 'DRAFT' as const,
      scheduledAt,
      createdAt: now,
      updatedAt: now,
    };

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const roundRef = db.collection('rounds').doc();
      const roundNumber = randomRoundNumber();
      const inviteRef = db.collection('invites').doc(roundNumber);

      try {
        const inviteSnap = await inviteRef.get();
        if (inviteSnap.exists) {
          continue;
        }

        // transaction 대신 batch — Admin SDK에서는 충분하고 더 빠름
        const batch = db.batch();
        batch.set(roundRef, { ...roundPayload, roundNumber });
        batch.set(roundRef.collection('participants').doc(uid), {
          uid,
          nickname: data.nickname ?? null,
          role: 'HOST',
          joinStatus: 'JOINED',
          holesEntered: 0,
          totalOut: 0,
          totalIn: 0,
          total: 0,
          updatedAt: now,
        });
        batch.set(db.collection('users').doc(uid).collection('roundIds').doc(roundRef.id), {
          roundId: roundRef.id,
          createdAt: now,
        });
        batch.set(inviteRef, {
          roundId: roundRef.id,
          createdBy: uid,
          createdAt: now,
        });
        batch.set(
          db.collection('users').doc(uid),
          {
            roundCount: admin.firestore.FieldValue.increment(1),
            updatedAt: now,
          },
          { merge: true }
        );
        await batch.commit();

        return {
          id: roundRef.id,
          roundNumber,
          createdBy: roundPayload.createdBy,
          roundName: roundPayload.roundName,
          golfCourseId: roundPayload.golfCourseId,
          golfCourseName: roundPayload.golfCourseName,
          frontCourseId: roundPayload.frontCourseId,
          frontCourseName: roundPayload.frontCourseName,
          backCourseId: roundPayload.backCourseId,
          backCourseName: roundPayload.backCourseName,
          courseId: roundPayload.courseId,
          courseName: roundPayload.courseName,
          teeTime: roundPayload.teeTime,
          status: roundPayload.status,
          scheduledAt: scheduledAt ? scheduledAt.toDate().toISOString() : null,
          createdAt: now.toDate().toISOString(),
          updatedAt: now.toDate().toISOString(),
        };
      } catch (error) {
        functions.logger.error('createRound attempt failed', {
          attempt,
          roundNumber,
          error,
        });
        // 번호 경합 등 — 다음 번호로 재시도
        if (attempt < 11) {
          continue;
        }
        throw new functions.https.HttpsError(
          'internal',
          '라운드 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.'
        );
      }
    }

    throw new functions.https.HttpsError(
      'resource-exhausted',
      '라운드 번호 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.'
    );
  });
