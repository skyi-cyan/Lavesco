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
