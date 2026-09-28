import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

type CancelRoundRequest = {
  roundId?: string;
};

/**
 * HOST가 스코어 미확정 라운드를 취소(삭제)합니다.
 * - createdBy만 가능
 * - 참가자 중 한 명이라도 scoreConfirmedAt 있으면 거부
 * - rounds / participants / scores / invites / users.roundIds 정리
 */
export const cancelRound = functions
  .runWith({
    memory: '256MB',
    timeoutSeconds: 60,
  })
  .https.onCall(async (data: CancelRoundRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
    }

    const uid = context.auth.uid;
    const roundId = String(data?.roundId ?? '').trim();
    if (!roundId) {
      throw new functions.https.HttpsError('invalid-argument', 'roundId가 필요합니다.');
    }

    const db = admin.firestore();
    const roundRef = db.collection('rounds').doc(roundId);
    const roundSnap = await roundRef.get();
    if (!roundSnap.exists) {
      throw new functions.https.HttpsError('not-found', '라운드를 찾을 수 없습니다.');
    }

    const round = roundSnap.data() || {};
    if (round.createdBy !== uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '라운드 생성자(HOST)만 취소할 수 있습니다.'
      );
    }

    if (round.status === 'FINISHED') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        '종료된 라운드는 취소할 수 없습니다.'
      );
    }

    const participantsSnap = await roundRef.collection('participants').get();
    const confirmed = participantsSnap.docs.find((d) => d.data()?.scoreConfirmedAt != null);
    if (confirmed) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        '스코어가 확정된 참가자가 있어 라운드를 취소할 수 없습니다.'
      );
    }

    const participantUids = participantsSnap.docs.map((d) => d.id);
    const scoresSnap = await roundRef.collection('scores').get();
    const roundNumber =
      typeof round.roundNumber === 'string' ? round.roundNumber.trim() : '';

    const batch = db.batch();
    scoresSnap.docs.forEach((d) => batch.delete(d.ref));
    participantsSnap.docs.forEach((d) => batch.delete(d.ref));
    participantUids.forEach((participantUid) => {
      batch.delete(
        db.collection('users').doc(participantUid).collection('roundIds').doc(roundId)
      );
      batch.set(
        db.collection('users').doc(participantUid),
        {
          roundCount: admin.firestore.FieldValue.increment(-1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
    if (roundNumber) {
      batch.delete(db.collection('invites').doc(roundNumber));
    }
    batch.delete(roundRef);
    await batch.commit();

    functions.logger.info('Round cancelled', { roundId, uid, roundNumber });
    return { ok: true, roundId };
  });
