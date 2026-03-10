/**
 * 라운드 스코어 저장 로직 정리
 * ---------------------------------
 *
 * [ Firestore 구조 ]
 * - rounds/{roundId}                    : 라운드 메타(골프장, 코스, 티타임, status 등)
 * - rounds/{roundId}/participants/{uid}  : 참가자 정보(닉네임, role, holesEntered, totalOut, totalIn, total)
 * - rounds/{roundId}/scores/{uid}       : 해당 유저의 홀별 스코어 { holes: { "1": {...}, "2": {...}, ... }, updatedAt }
 * - users/{uid}/roundIds/{roundId}      : 사용자가 참여 중인 라운드 ID 등록
 *
 * [ 라운드 생성 시 (createRound) ]
 * 1. rounds 문서 생성 (status: DRAFT)
 * 2. participants/{uid} 에 HOST 참가자 추가 (holesEntered/totalOut/totalIn/total = 0)
 * 3. users/{uid}/roundIds/{roundId} 등록
 *
 * [ 스코어 등록·저장 흐름 ]
 * 1. RoundDetailScreen 에서 사용자가 홀별 스코어(타수, 퍼트, 페어웨이 등) 입력
 * 2. 상태: scoresByUid[user.uid][holeNo] 로 로컬 업데이트 (updateMyHole)
 * 3. 저장 트리거: scoresByUid 변경 시 1초 디바운스 후 saveMyScore() 호출
 * 4. saveRoundScore(roundId, uid, holes) 호출
 *    - rounds/{roundId}/scores/{uid} 에 { holes: { "1": { strokes, putts, fairway?, ... }, ... }, updatedAt } 를 set(merge: true)
 * 5. 참가자 문서(participants)의 totalOut/totalIn/total/holesEntered 는 스코어 확정 시 갱신됨.
 *    - 화면의 Out/In/Total 합계는 RoundDetailScreen 에서 scoresByUid 기반으로 클라이언트 계산하여 표시
 *
 * [ 스코어 확정 (confirmRoundScore) ]
 * 1. 사용자가 "스코어 확정" 버튼 탭
 * 2. 현재 홀별 스코어를 scores/{uid} 에 저장 (merge)
 * 3. 전반(1~9홀)/후반(10~18홀) 합계 계산 후 participants/{uid} 에 totalOut, totalIn, total, holesEntered(18), scoreConfirmedAt 갱신
 * 4. 라운드가 DRAFT 이면 status 를 IN_PROGRESS 로 변경
 */
import firestore from '@react-native-firebase/firestore';
import type { Round, RoundStatus, RoundParticipant, HoleScoreData } from '../types/round';

const ROUNDS_COLLECTION = 'rounds';
const PARTICIPANTS = 'participants';
const SCORES = 'scores';
const USERS_COLLECTION = 'users';
const ROUND_IDS = 'roundIds';

function toDate(v: unknown): Date {
  if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (v instanceof Date) return v;
  return new Date();
}

function roundFromDoc(id: string, data: Record<string, unknown>): Round {
  return {
    id,
    createdBy: (data.createdBy as string) ?? '',
    roundName: (data.roundName as string | null) ?? null,
    roundNumber: (data.roundNumber as string | null) ?? null,
    golfCourseId: (data.golfCourseId as string) ?? '',
    golfCourseName: (data.golfCourseName as string) ?? '',
    frontCourseId: (data.frontCourseId as string) ?? '',
    frontCourseName: (data.frontCourseName as string) ?? '',
    backCourseId: (data.backCourseId as string) ?? '',
    backCourseName: (data.backCourseName as string) ?? '',
    courseId: (data.frontCourseId as string) ?? (data.courseId as string) ?? '',
    courseName: (data.frontCourseName as string) ?? (data.courseName as string) ?? '',
    teeTime: (data.teeTime as string | null) ?? null,
    status: (data.status as RoundStatus) ?? 'DRAFT',
    scheduledAt: data.scheduledAt ? toDate(data.scheduledAt) : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/**
 * 사용자가 참여 중인 라운드 ID 목록 조회 (users/{uid}/roundIds)
 */
export async function fetchUserRoundIds(uid: string): Promise<string[]> {
  const snapshot = await firestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(ROUND_IDS)
    .get();
  return snapshot.docs.map((d) => d.id);
}

/**
 * 라운드 단건 조회
 */
export async function fetchRound(roundId: string): Promise<Round | null> {
  const doc = await firestore().collection(ROUNDS_COLLECTION).doc(roundId).get();
  if (!doc.exists || !doc.data()) return null;
  return roundFromDoc(doc.id, doc.data() as Record<string, unknown>);
}

/**
 * 라운드 번호(4자리)로 라운드 조회. 동일 번호 중복 시 첫 번째 결과 반환.
 */
export async function fetchRoundByRoundNumber(roundNumber: string): Promise<Round | null> {
  const trimmed = String(roundNumber).trim();
  if (trimmed.length !== 4) return null;
  const snapshot = await firestore()
    .collection(ROUNDS_COLLECTION)
    .where('roundNumber', '==', trimmed)
    .limit(1)
    .get();
  if (snapshot.empty || !snapshot.docs[0]?.data()) return null;
  const doc = snapshot.docs[0];
  return roundFromDoc(doc.id, doc.data() as Record<string, unknown>);
}

/**
 * 라운드 참여: participants에 MEMBER 추가, users/{uid}/roundIds 등록.
 * 참여 시 항상 참가자 문서를 생성/갱신한 뒤 검증합니다.
 */
export async function joinRound(
  roundId: string,
  uid: string,
  nickname: string | null
): Promise<void> {
  const db = firestore();
  if (!roundId || !uid) {
    throw new Error('라운드 ID와 사용자 ID가 필요합니다.');
  }

  const roundRef = db.collection(ROUNDS_COLLECTION).doc(roundId);
  const roundSnap = await roundRef.get();
  if (!roundSnap.exists || !roundSnap.data()) {
    throw new Error('라운드를 찾을 수 없습니다.');
  }

  const participantRef = roundRef.collection(PARTICIPANTS).doc(uid);
  const now = new Date();

  const participantData = {
    uid,
    nickname: nickname ?? null,
    role: 'MEMBER' as const,
    joinStatus: 'JOINED',
    holesEntered: 0,
    totalOut: 0,
    totalIn: 0,
    total: 0,
    updatedAt: firestore.Timestamp.fromDate(now),
  };

  await participantRef.set(participantData, { merge: true });

  await db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(ROUND_IDS)
    .doc(roundId)
    .set({ roundId });

  const verifySnap = await participantRef.get({ source: 'server' });
  if (!verifySnap.exists) {
    throw new Error('참가자 등록이 반영되지 않았습니다. 다시 시도해 주세요.');
  }
}

/**
 * 사용자 라운드 목록: roundIds로 조회 후 rounds 병렬 조회, scheduledAt 내림차순
 */
export async function fetchUserRounds(uid: string): Promise<Round[]> {
  const roundIds = await fetchUserRoundIds(uid);
  if (roundIds.length === 0) return [];
  const rounds = await Promise.all(
    roundIds.map((id) => fetchRound(id))
  );
  const list = rounds.filter((r): r is Round => r != null);
  list.sort((a, b) => {
    const at = a.scheduledAt?.getTime() ?? a.createdAt.getTime();
    const bt = b.scheduledAt?.getTime() ?? b.createdAt.getTime();
    return bt - at;
  });
  return list;
}

export type CreateRoundInput = {
  roundName: string | null;
  golfCourseId: string;
  golfCourseName: string;
  frontCourseId: string;
  frontCourseName: string;
  backCourseId: string;
  backCourseName: string;
  teeTime: string | null;
  scheduledAt?: Date | null;
};

/** 4자리 라운드 번호 생성 (1000~9999) */
function generateRoundNumber(): string {
  const n = Math.floor(Math.random() * 9000) + 1000;
  return String(n);
}

/**
 * 라운드 생성: rounds 문서 생성, 참가자(HOST) 추가, users/{uid}/roundIds 등록, 4자리 라운드 번호 부여
 */
export async function createRound(
  uid: string,
  nickname: string | null,
  input: CreateRoundInput
): Promise<Round> {
  const db = firestore();
  const now = new Date();
  const roundRef = db.collection(ROUNDS_COLLECTION).doc();
  const roundNumber = generateRoundNumber();

  const roundData = {
    createdBy: uid,
    roundName: input.roundName ?? null,
    roundNumber,
    golfCourseId: input.golfCourseId ?? '',
    golfCourseName: input.golfCourseName ?? '',
    frontCourseId: input.frontCourseId ?? '',
    frontCourseName: input.frontCourseName ?? '',
    backCourseId: input.backCourseId ?? '',
    backCourseName: input.backCourseName ?? '',
    courseId: input.frontCourseId ?? '',
    courseName: input.frontCourseName ?? '',
    teeTime: input.teeTime ?? null,
    status: 'DRAFT' as const,
    scheduledAt: input.scheduledAt
      ? firestore.Timestamp.fromDate(input.scheduledAt)
      : null,
    createdAt: firestore.Timestamp.fromDate(now),
    updatedAt: firestore.Timestamp.fromDate(now),
  };

  await roundRef.set(roundData);

  const participantData = {
    uid,
    nickname: nickname ?? null,
    role: 'HOST',
    joinStatus: 'JOINED',
    holesEntered: 0,
    totalOut: 0,
    totalIn: 0,
    total: 0,
    updatedAt: firestore.Timestamp.fromDate(now),
  };
  await roundRef.collection(PARTICIPANTS).doc(uid).set(participantData);

  await db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(ROUND_IDS)
    .doc(roundRef.id)
    .set({ roundId: roundRef.id });

  return roundFromDoc(roundRef.id, {
    ...roundData,
    scheduledAt: roundData.scheduledAt,
    createdAt: roundData.createdAt,
    updatedAt: roundData.updatedAt,
  } as Record<string, unknown>) as Round;
}

function participantFromDoc(id: string, data: Record<string, unknown>): RoundParticipant {
  return {
    uid: id,
    nickname: (data.nickname as string | null) ?? null,
    role: (data.role as 'HOST' | 'MEMBER') ?? 'MEMBER',
    joinStatus: (data.joinStatus as string) ?? '',
    holesEntered: (data.holesEntered as number) ?? 0,
    totalOut: (data.totalOut as number) ?? 0,
    totalIn: (data.totalIn as number) ?? 0,
    total: (data.total as number) ?? 0,
    updatedAt: toDate(data.updatedAt),
    scoreConfirmedAt: data.scoreConfirmedAt ? toDate(data.scoreConfirmedAt) : null,
  };
}

/**
 * 라운드 참가자 목록 조회 (rounds/{roundId}/participants)
 */
export async function fetchRoundParticipants(roundId: string): Promise<RoundParticipant[]> {
  const snapshot = await firestore()
    .collection(ROUNDS_COLLECTION)
    .doc(roundId)
    .collection(PARTICIPANTS)
    .get();
  return snapshot.docs.map((d) =>
    participantFromDoc(d.id, d.data() as Record<string, unknown>)
  );
}

/**
 * 라운드 참가자 단건 조회 (rounds/{roundId}/participants/{uid})
 */
export async function fetchRoundParticipant(
  roundId: string,
  uid: string
): Promise<RoundParticipant | null> {
  const doc = await firestore()
    .collection(ROUNDS_COLLECTION)
    .doc(roundId)
    .collection(PARTICIPANTS)
    .doc(uid)
    .get();
  if (!doc.exists || !doc.data()) return null;
  return participantFromDoc(doc.id, doc.data() as Record<string, unknown>);
}

const HOLE_NOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];

/**
 * 사용자 확정 스코어 타수 목록 (스코어 확정된 라운드만, 18홀 total)
 * MY 화면 평균/최저 타수 계산용
 */
export async function fetchUserConfirmedTotals(uid: string): Promise<number[]> {
  const roundIds = await fetchUserRoundIds(uid);
  if (roundIds.length === 0) return [];
  const participants = await Promise.all(
    roundIds.map((roundId) => fetchRoundParticipant(roundId, uid))
  );
  return participants
    .filter((p): p is RoundParticipant => p != null && p.scoreConfirmedAt != null && p.holesEntered === 18 && p.total > 0)
    .map((p) => p.total);
}

export type UserConfirmedRoundStats = {
  roundIds: string[];
  totals: number[];
  scores: Record<string, HoleScoreData>[];
};

/**
 * 사용자 확정 라운드 통계 (roundIds, totals, 홀별 스코어 배열)
 * MY 화면 라운드수/베스트/평균 및 FIR/GIR/PPR 계산용
 */
export async function fetchUserConfirmedRoundStats(uid: string): Promise<UserConfirmedRoundStats> {
  const roundIds = await fetchUserRoundIds(uid);
  if (roundIds.length === 0) return { roundIds: [], totals: [], scores: [] };
  const participants = await Promise.all(
    roundIds.map((roundId) => fetchRoundParticipant(roundId, uid))
  );
  const confirmedIndices: number[] = [];
  const totals: number[] = [];
  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    if (p != null && p.scoreConfirmedAt != null && p.holesEntered === 18 && p.total > 0) {
      confirmedIndices.push(i);
      totals.push(p.total);
    }
  }
  const confirmedRoundIds = confirmedIndices.map((i) => roundIds[i]);
  const scores = await Promise.all(
    confirmedRoundIds.map((roundId) => fetchRoundScore(roundId, uid))
  );
  return { roundIds: confirmedRoundIds, totals, scores };
}

/** FIR(페어웨이 안착율) 계산: fairway true인 홀 수 / fairway 입력된 홀 수, 백분율. 데이터 없으면 null */
export function computeFIR(scores: Record<string, HoleScoreData>[]): number | null {
  let hit = 0;
  let total = 0;
  for (const holes of scores) {
    for (const no of HOLE_NOS) {
      const h = holes[no];
      if (h && h.fairway != null) {
        total += 1;
        if (h.fairway) hit += 1;
      }
    }
  }
  if (total === 0) return null;
  return Math.round((hit / total) * 1000) / 10;
}

/**
 * GIR(그린 적중율) 계산: 퍼팅수·스코어만 사용.
 * 그린 도달 타수 = strokes - putts. par 없으므로 par4 기준으로 2타 이내 도달 시 GIR.
 * 즉 (strokes - putts) <= 2 인 홀 비율을 백분율로 반환. 데이터 없으면 null.
 */
export function computeGIR(scores: Record<string, HoleScoreData>[]): number | null {
  let hit = 0;
  let total = 0;
  for (const holes of scores) {
    for (const no of HOLE_NOS) {
      const h = holes[no];
      if (h && typeof h.strokes === 'number' && typeof h.putts === 'number' && h.strokes > 0) {
        total += 1;
        const shotsToGreen = h.strokes - h.putts;
        if (shotsToGreen <= 2) hit += 1;
      }
    }
  }
  if (total === 0) return null;
  return Math.round((hit / total) * 1000) / 10;
}

/** 라운드당 퍼트 수 평균(PPR). 데이터 없으면 null */
export function computePPR(scores: Record<string, HoleScoreData>[]): number | null {
  if (scores.length === 0) return null;
  const puttsPerRound = scores.map((holes) =>
    HOLE_NOS.reduce((sum, no) => sum + (holes[no]?.putts ?? 0), 0)
  );
  const sum = puttsPerRound.reduce((a, b) => a + b, 0);
  return Math.round((sum / scores.length) * 10) / 10;
}

function parseHoleScore(data: unknown): HoleScoreData {
  const o = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    strokes: typeof o.strokes === 'number' ? o.strokes : 0,
    putts: typeof o.putts === 'number' ? o.putts : 0,
    fairway: o.fairway == null ? undefined : !!o.fairway,
    rough: o.rough == null ? undefined : !!o.rough,
    penalty: o.penalty == null ? undefined : !!o.penalty,
    ob: o.ob == null ? undefined : (typeof o.ob === 'number' ? o.ob : 0),
  };
}

/**
 * 라운드 스코어 조회 (rounds/{roundId}/scores/{uid})
 */
export async function fetchRoundScore(
  roundId: string,
  uid: string
): Promise<Record<string, HoleScoreData>> {
  const doc = await firestore()
    .collection(ROUNDS_COLLECTION)
    .doc(roundId)
    .collection(SCORES)
    .doc(uid)
    .get();
  if (!doc.exists || !doc.data()?.holes) return {};
  const holes = doc.data()!.holes as Record<string, unknown>;
  const result: Record<string, HoleScoreData> = {};
  Object.entries(holes).forEach(([no, val]) => {
    result[no] = parseHoleScore(val);
  });
  return result;
}

/**
 * 라운드 스코어 저장 (rounds/{roundId}/scores/{uid}) — holes 맵 전체 병합
 */
export async function saveRoundScore(
  roundId: string,
  uid: string,
  holes: Record<string, HoleScoreData>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  Object.entries(holes).forEach(([no, h]) => {
    payload[no] = {
      strokes: h.strokes,
      putts: h.putts,
      ...(h.fairway != null && { fairway: h.fairway }),
      ...(h.rough != null && { rough: h.rough }),
      ...(h.penalty != null && { penalty: h.penalty }),
      ...(h.ob != null && { ob: h.ob }),
    };
  });
  await firestore()
    .collection(ROUNDS_COLLECTION)
    .doc(roundId)
    .collection(SCORES)
    .doc(uid)
    .set(
      { holes: payload, updatedAt: firestore.Timestamp.now() },
      { merge: true }
    );
}

const HOLE_NOS_FRONT = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const HOLE_NOS_BACK = ['10', '11', '12', '13', '14', '15', '16', '17', '18'];

function computeTotals(holes: Record<string, HoleScoreData>): { totalOut: number; totalIn: number; total: number } {
  const totalOut = HOLE_NOS_FRONT.reduce((sum, no) => sum + (holes[no]?.strokes ?? 0), 0);
  const totalIn = HOLE_NOS_BACK.reduce((sum, no) => sum + (holes[no]?.strokes ?? 0), 0);
  return { totalOut, totalIn, total: totalOut + totalIn };
}

/**
 * 스코어 확정: 최종 스코어 저장 후 참가자 합계·확정 시각 갱신, 라운드가 DRAFT면 IN_PROGRESS로 변경
 */
export async function confirmRoundScore(
  roundId: string,
  uid: string,
  holes: Record<string, HoleScoreData>
): Promise<void> {
  const db = firestore();
  const now = firestore.Timestamp.now();
  const { totalOut, totalIn, total } = computeTotals(holes);

  await saveRoundScore(roundId, uid, holes);

  const participantRef = db.collection(ROUNDS_COLLECTION).doc(roundId).collection(PARTICIPANTS).doc(uid);
  await participantRef.set(
    {
      holesEntered: 18,
      totalOut,
      totalIn,
      total,
      scoreConfirmedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  const roundRef = db.collection(ROUNDS_COLLECTION).doc(roundId);
  const roundSnap = await roundRef.get();
  const status = roundSnap.data()?.status as RoundStatus | undefined;
  if (status === 'DRAFT') {
    await roundRef.update({
      status: 'IN_PROGRESS',
      updatedAt: now,
    });
  }
}
