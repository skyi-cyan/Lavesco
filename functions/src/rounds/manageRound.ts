import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

type RoundRef = admin.firestore.DocumentReference;

function requireUid(context: functions.https.CallableContext): string {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
  }
  return context.auth.uid;
}

function requireRoundId(data: { roundId?: unknown } | undefined): string {
  const roundId = String(data?.roundId ?? '').trim();
  if (!roundId) {
    throw new functions.https.HttpsError('invalid-argument', 'roundId가 필요합니다.');
  }
  return roundId;
}

async function getOpenRound(roundRef: RoundRef): Promise<admin.firestore.DocumentData> {
  const snap = await roundRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', '라운드를 찾을 수 없습니다.');
  }
  const round = snap.data() || {};
  if (round.status === 'FINISHED') {
    throw new functions.https.HttpsError('failed-precondition', '종료된 라운드입니다.');
  }
  return round;
}

/** 참가자가 1명 이상이고 전원 확정했으면 FINISHED로 변경. 변경했으면 true */
async function finishRoundIfAllConfirmed(roundRef: RoundRef): Promise<boolean> {
  const db = admin.firestore();
  return db.runTransaction(async (tx) => {
    const roundSnap = await tx.get(roundRef);
    if (!roundSnap.exists || roundSnap.data()?.status === 'FINISHED') return false;
    const participantsSnap = await tx.get(roundRef.collection('participants'));
    if (participantsSnap.empty) return false;
    const allConfirmed = participantsSnap.docs.every(
      (d) => d.data()?.scoreConfirmedAt != null
    );
    if (!allConfirmed) return false;
    const now = admin.firestore.Timestamp.now();
    tx.update(roundRef, { status: 'FINISHED', finishedAt: now, updatedAt: now });
    return true;
  });
}

/** 참가자 문서가 바뀔 때(확정·내보내기 등) 전원 확정이면 라운드 자동 종료 */
export const onRoundParticipantWrite = functions.firestore
  .document('rounds/{roundId}/participants/{uid}')
  .onWrite(async (_change, context) => {
    const roundRef = admin.firestore().collection('rounds').doc(context.params.roundId);
    try {
      const finished = await finishRoundIfAllConfirmed(roundRef);
      if (finished) {
        functions.logger.info('Round auto-finished', { roundId: context.params.roundId });
      }
    } catch (error) {
      functions.logger.error('Auto-finish check failed', {
        roundId: context.params.roundId,
        error,
      });
    }
    return null;
  });

type RemoveParticipantRequest = {
  roundId?: string;
  targetUid?: string;
};

/**
 * 라운드 나가기(본인) 또는 내보내기(HOST).
 * - 종료된 라운드, 스코어를 확정한 참가자는 불가
 * - HOST는 나갈 수 없음 (라운드 취소 사용)
 */
export const removeParticipant = functions
  .runWith({ memory: '256MB', timeoutSeconds: 60 })
  .https.onCall(async (data: RemoveParticipantRequest, context) => {
    const uid = requireUid(context);
    const roundId = requireRoundId(data);
    const targetUid = String(data?.targetUid ?? uid).trim();

    const db = admin.firestore();
    const roundRef = db.collection('rounds').doc(roundId);
    const round = await getOpenRound(roundRef);
    const isHost = round.createdBy === uid;

    if (targetUid === uid) {
      if (isHost) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          '개설자는 라운드를 나갈 수 없습니다. 라운드를 취소해 주세요.'
        );
      }
    } else {
      if (!isHost) {
        throw new functions.https.HttpsError(
          'permission-denied',
          '라운드 생성자(HOST)만 참가자를 내보낼 수 있습니다.'
        );
      }
      if (targetUid === round.createdBy) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          '개설자는 내보낼 수 없습니다.'
        );
      }
    }

    const participantRef = roundRef.collection('participants').doc(targetUid);
    const participantSnap = await participantRef.get();
    if (!participantSnap.exists) {
      throw new functions.https.HttpsError('not-found', '참가자를 찾을 수 없습니다.');
    }
    if (participantSnap.data()?.scoreConfirmedAt != null) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        '스코어를 확정한 참가자는 나가거나 내보낼 수 없습니다.'
      );
    }

    const now = admin.firestore.Timestamp.now();
    const userRef = db.collection('users').doc(targetUid);
    const roundIdRef = userRef.collection('roundIds').doc(roundId);
    const [userSnap, roundIdSnap] = await Promise.all([userRef.get(), roundIdRef.get()]);
    const batch = db.batch();
    batch.delete(participantRef);
    batch.delete(roundRef.collection('scores').doc(targetUid));
    batch.delete(roundIdRef);
    // 구버전 앱은 참여 시 roundCount를 올리지 않았으므로 0 미만으로 내려가지 않게 함
    const currentCount = Number(userSnap.data()?.roundCount ?? 0);
    if (userSnap.exists && roundIdSnap.exists && currentCount > 0) {
      batch.update(userRef, { roundCount: currentCount - 1, updatedAt: now });
    }
    await batch.commit();

    functions.logger.info('Participant removed', { roundId, by: uid, targetUid });
    return { ok: true };
  });

type FinishRoundRequest = {
  roundId?: string;
};

/** HOST가 라운드 종료. 참가자 전원이 확정한 경우에만 가능 */
export const finishRound = functions
  .runWith({ memory: '256MB', timeoutSeconds: 30 })
  .https.onCall(async (data: FinishRoundRequest, context) => {
    const uid = requireUid(context);
    const roundId = requireRoundId(data);
    const roundRef = admin.firestore().collection('rounds').doc(roundId);
    const round = await getOpenRound(roundRef);
    if (round.createdBy !== uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '라운드 생성자(HOST)만 라운드를 종료할 수 있습니다.'
      );
    }
    const finished = await finishRoundIfAllConfirmed(roundRef);
    if (!finished) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        '아직 스코어를 확정하지 않은 참가자가 있습니다.'
      );
    }
    return { ok: true };
  });

type UpdateRoundRequest = {
  roundId?: string;
  roundName?: string | null;
  teeTime?: string | null;
  /** ISO string or null */
  scheduledAt?: string | null;
  golfCourseId?: string;
  golfCourseName?: string;
  frontCourseId?: string;
  frontCourseName?: string;
  backCourseId?: string;
  backCourseName?: string;
};

const COURSE_FIELDS = [
  'golfCourseId',
  'golfCourseName',
  'frontCourseId',
  'frontCourseName',
  'backCourseId',
  'backCourseName',
] as const;

/**
 * HOST가 라운드 정보 수정.
 * - 라운드명·날짜·티타임: 확정한 참가자가 없을 때
 * - 골프장·코스: 아무도 스코어를 저장하지 않았을 때
 */
export const updateRound = functions
  .runWith({ memory: '256MB', timeoutSeconds: 30 })
  .https.onCall(async (data: UpdateRoundRequest, context) => {
    const uid = requireUid(context);
    const roundId = requireRoundId(data);
    const db = admin.firestore();
    const roundRef = db.collection('rounds').doc(roundId);
    const round = await getOpenRound(roundRef);
    if (round.createdBy !== uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '라운드 생성자(HOST)만 라운드 정보를 수정할 수 있습니다.'
      );
    }

    const participantsSnap = await roundRef.collection('participants').get();
    if (participantsSnap.docs.some((d) => d.data()?.scoreConfirmedAt != null)) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        '스코어를 확정한 참가자가 있어 라운드 정보를 수정할 수 없습니다.'
      );
    }

    const now = admin.firestore.Timestamp.now();
    const update: Record<string, unknown> = { updatedAt: now };

    if ('roundName' in data) {
      const name = String(data.roundName ?? '').trim();
      update.roundName = name || null;
    }
    if ('teeTime' in data) {
      const tee = String(data.teeTime ?? '').trim();
      update.teeTime = tee || null;
    }
    if ('scheduledAt' in data) {
      let scheduledAt: admin.firestore.Timestamp | null = null;
      if (data.scheduledAt) {
        const d = new Date(data.scheduledAt);
        if (!Number.isNaN(d.getTime())) scheduledAt = admin.firestore.Timestamp.fromDate(d);
      }
      update.scheduledAt = scheduledAt;
    }

    const courseChanged = COURSE_FIELDS.some(
      (key) => key in data && String(data[key] ?? '') !== String(round[key] ?? '')
    );
    if (courseChanged) {
      const scoresSnap = await roundRef.collection('scores').get();
      const hasSavedScore =
        scoresSnap.docs.some((d) => Object.keys(d.data()?.holes ?? {}).length > 0) ||
        participantsSnap.docs.some((d) => (d.data()?.holesEntered ?? 0) > 0);
      if (hasSavedScore) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          '이미 저장된 스코어가 있어 골프장·코스를 변경할 수 없습니다.'
        );
      }
      const golfCourseName = String(data.golfCourseName ?? round.golfCourseName ?? '').trim();
      if (!golfCourseName) {
        throw new functions.https.HttpsError('invalid-argument', '골프장 이름이 필요합니다.');
      }
      for (const key of COURSE_FIELDS) {
        if (key in data) update[key] = String(data[key] ?? '').trim();
      }
      update.golfCourseName = golfCourseName;
      update.courseId = update.frontCourseId ?? round.frontCourseId ?? '';
      update.courseName = update.frontCourseName ?? round.frontCourseName ?? '';
    }

    await roundRef.update(update);
    return { ok: true };
  });
