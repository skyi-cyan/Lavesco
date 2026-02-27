import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// 초대 코드 생성
export const generateInviteCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      '인증이 필요합니다.'
    );
  }

  const { roundId } = data;
  if (!roundId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'roundId가 필요합니다.'
    );
  }

  // 고유 코드 생성 (6자리 영숫자)
  const code = generateUniqueCode();

  // Firestore에 저장
  await admin.firestore().collection('invites').doc(code).set({
    roundId,
    createdBy: context.auth.uid,
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간
    ),
    maxUses: 8,
    useCount: 0,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { code };
});

// 고유 코드 생성 함수
function generateUniqueCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 스코어 집계 (onWrite 트리거)
export const aggregateScores = functions.firestore
  .document('rounds/{roundId}/scores/{uid}')
  .onWrite(async (change, context) => {
    const roundId = context.params.roundId;
    const uid = context.params.uid;
    const scores = change.after.data();

    if (!scores || !scores.holes) {
      return null;
    }

    // 집계 계산
    const { totalOut, totalIn, total, holesEntered } = calculateAggregates(
      scores.holes
    );

    // participants 문서 업데이트
    await admin
      .firestore()
      .collection('rounds')
      .doc(roundId)
      .collection('participants')
      .doc(uid)
      .update({
        totalOut,
        totalIn,
        total,
        holesEntered,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return null;
  });

// 집계 계산 함수
function calculateAggregates(holes: Record<string, any>) {
  let totalOut = 0;
  let totalIn = 0;
  let total = 0;
  let holesEntered = 0;

  for (const [holeNo, holeData] of Object.entries(holes)) {
    const holeNum = parseInt(holeNo);
    const strokes = holeData?.strokes || 0;

    if (strokes > 0) {
      holesEntered++;
      total += strokes;

      if (holeNum <= 9) {
        totalOut += strokes;
      } else {
        totalIn += strokes;
      }
    }
  }

  return { totalOut, totalIn, total, holesEntered };
}
