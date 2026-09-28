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
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { Round, RoundStatus, RoundParticipant, HoleScoreData } from '../types/round';
import { fetchHolesUnderCourse } from './courseService';
import type { GolfCourseHoleInput } from '../types/course';
import { callCloudFunction } from './cloudFunctions';
import { grossStrokesForHole } from './scoreSoundService';
import i18n from '../../i18n';

const ROUNDS_COLLECTION = 'rounds';
const PARTICIPANTS = 'participants';
const SCORES = 'scores';
const USERS_COLLECTION = 'users';
const ROUND_IDS = 'roundIds';
const INVITES_COLLECTION = 'invites';
/** 목록/통계용 roundIds 상한 (초과 분은 추후 페이지네이션) */
const MAX_USER_ROUND_IDS = 150;

// ---- In-memory caches (for HomeScreen stats speed-up) ----
// Firestore reads are relatively expensive in RN. HomeScreen stats may trigger multiple reads
// across roundIds (participants, scores, and round meta), so we memoize short-lived results.
const CACHE_TTL_MS = 60 * 1000; // list/home 재진입 시 캐시 히트 우선
const USER_ROUNDS_CACHE_TTL_MS = 90 * 1000;

type UserRoundsCacheEntry = { uid: string; expiresAt: number; value: Round[] };
let userRoundsCache: UserRoundsCacheEntry | null = null;
const roundCache = new Map<string, { expiresAt: number; value: Round | null }>();
const roundInFlight = new Map<string, Promise<Round | null>>();

const participantCache = new Map<string, { expiresAt: number; value: RoundParticipant | null }>();
const participantInFlight = new Map<string, Promise<RoundParticipant | null>>();

const scoreCache = new Map<string, { expiresAt: number; value: Record<string, HoleScoreData> }>();
const scoreInFlight = new Map<string, Promise<Record<string, HoleScoreData>>>();

function cacheKeyRound(roundId: string) {
  return `round:${roundId}`;
}
function cacheKeyParticipant(roundId: string, uid: string) {
  return `participant:${roundId}:${uid}`;
}
function cacheKeyScore(roundId: string, uid: string) {
  return `score:${roundId}:${uid}`;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = new Array(Math.min(concurrency, items.length)).fill(0).map(() => runWorker());
  await Promise.all(workers);
  return results;
}

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
 * 상한으로 읽기 비용을 제한합니다.
 */
export async function fetchUserRoundIds(
  uid: string,
  options?: { limit?: number }
): Promise<string[]> {
  const max = options?.limit ?? MAX_USER_ROUND_IDS;
  const snapshot = await firestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(ROUND_IDS)
    .limit(max)
    .get();
  return snapshot.docs.map((d) => d.id);
}

/**
 * 라운드 단건 조회
 */
export async function fetchRound(roundId: string): Promise<Round | null> {
  const key = cacheKeyRound(roundId);
  const cached = roundCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const inFlight = roundInFlight.get(key);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const doc = await firestore().collection(ROUNDS_COLLECTION).doc(roundId).get();
    if (!doc.exists || !doc.data()) return null;
    return roundFromDoc(doc.id, doc.data() as Record<string, unknown>);
  })();

  roundInFlight.set(key, promise);
  try {
    const value = await promise;
    roundCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    return value;
  } finally {
    roundInFlight.delete(key);
  }
}

/**
 * 라운드 번호(6자리)로 라운드 조회.
 * 1) invites/{code} 단건 get (권장)
 * 2) 구버전 폴백: rounds where roundNumber == code limit 1
 */
export async function fetchRoundByRoundNumber(roundNumber: string): Promise<Round | null> {
  const trimmed = String(roundNumber).trim();
  if (!/^\d{4,6}$/.test(trimmed)) return null;

  const inviteSnap = await firestore()
    .collection(INVITES_COLLECTION)
    .doc(trimmed)
    .get();
  // RN Firebase DocumentSnapshot.exists is boolean; some typings mark it oddly
  if (inviteSnap.exists) {
    const roundId = inviteSnap.data()?.roundId;
    if (typeof roundId === 'string' && roundId) {
      return fetchRound(roundId);
    }
  }

  // 구버전(초대 문서 없는 4자리) 폴백
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
    throw new Error(i18n.t('errors.roundAndUserRequired'));
  }

  const roundRef = db.collection(ROUNDS_COLLECTION).doc(roundId);
  const roundSnap = await roundRef.get();
  if (!roundSnap.exists || !roundSnap.data()) {
    throw new Error(i18n.t('serverErrors.roundNotFound'));
  }

  const participantRef = roundRef.collection(PARTICIPANTS).doc(uid);
  const now = new Date();
  const nowTs = firestore.Timestamp.fromDate(now);
  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  const roundIdRef = userRef.collection(ROUND_IDS).doc(roundId);
  const existingRoundId = await roundIdRef.get();
  const isNewMembership = !existingRoundId.exists;

  const participantData = {
    uid,
    nickname: nickname ?? null,
    role: 'MEMBER' as const,
    joinStatus: 'JOINED',
    holesEntered: 0,
    totalOut: 0,
    totalIn: 0,
    total: 0,
    updatedAt: nowTs,
  };

  const batch = db.batch();
  batch.set(participantRef, participantData, { merge: true });
  batch.set(roundIdRef, { roundId, createdAt: nowTs });
  await batch.commit();

  if (isNewMembership) {
    try {
      await userRef.update({
        roundCount: firestore.FieldValue.increment(1),
        updatedAt: nowTs,
      });
    } catch {
      // 프로필 없어도 참여는 성공
    }
  }

  const verifySnap = await participantRef.get({ source: 'server' });
  if (!verifySnap.exists) {
    throw new Error(i18n.t('errors.joinNotReflected'));
  }
  userRoundsCache = null;
}

/**
 * 사용자 라운드 목록: roundIds로 조회 후 rounds 병렬 조회, scheduledAt 내림차순
 */
export async function fetchUserRounds(
  uid: string,
  options?: { force?: boolean }
): Promise<Round[]> {
  if (
    !options?.force &&
    userRoundsCache &&
    userRoundsCache.uid === uid &&
    userRoundsCache.expiresAt > Date.now()
  ) {
    return userRoundsCache.value;
  }

  const roundIds = await fetchUserRoundIds(uid);
  if (roundIds.length === 0) {
    userRoundsCache = { uid, expiresAt: Date.now() + USER_ROUNDS_CACHE_TTL_MS, value: [] };
    return [];
  }
  const rounds = await Promise.all(roundIds.map((id) => fetchRound(id)));
  const list = rounds.filter((r): r is Round => r != null);
  list.sort((a, b) => {
    const at = a.scheduledAt?.getTime() ?? a.createdAt.getTime();
    const bt = b.scheduledAt?.getTime() ?? b.createdAt.getTime();
    return bt - at;
  });
  userRoundsCache = {
    uid,
    expiresAt: Date.now() + USER_ROUNDS_CACHE_TTL_MS,
    value: list,
  };
  return list;
}

export type RoundListItemMeta = {
  participant: RoundParticipant | null;
  /** 본인 홀 스코어가 1건 이상 저장됨 (확정 전 진행중 판단용) */
  hasSavedScore: boolean;
};

/**
 * 라운드 목록 카드용 메타: 내 참가자 문서만 조회 (스코어 문서 미조회).
 * 진행중 = IN_PROGRESS | holesEntered > 0 | 확정됨.
 */
export async function fetchRoundListItemMeta(
  roundId: string,
  uid: string,
  roundStatus: RoundStatus
): Promise<RoundListItemMeta> {
  const participant = await fetchRoundParticipant(roundId, uid, { source: 'default' });
  const hasSavedScore =
    !!participant?.scoreConfirmedAt ||
    roundStatus === 'IN_PROGRESS' ||
    (participant?.holesEntered ?? 0) > 0;
  return { participant, hasSavedScore };
}

function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function hasAnyHoleScore(holes: Record<string, HoleScoreData>): boolean {
  return Object.values(holes).some(
    (h) => h && typeof h.strokes === 'number' && h.strokes > 0
  );
}

/**
 * 오늘(로컬 기준) 진행 중인 라운드 조회.
 * - 당일 scheduledAt(없으면 createdAt) 라운드
 * - FINISHED 제외, 스코어 미확정
 * - IN_PROGRESS 이거나 홀 스코어가 1건 이상 입력된 경우
 */
export async function findTodayInProgressRound(
  uid: string,
  referenceDate: Date = new Date()
): Promise<Round | null> {
  const rounds = await fetchUserRounds(uid);
  for (const round of rounds) {
    if (round.status === 'FINISHED') continue;

    const roundDay = round.scheduledAt ?? round.createdAt;
    if (!isSameLocalCalendarDay(roundDay, referenceDate)) continue;

    const participant = await fetchRoundParticipant(round.id, uid);
    if (!participant || participant.scoreConfirmedAt) continue;

    if (round.status === 'IN_PROGRESS') {
      return round;
    }

    const holes = await fetchRoundScore(round.id, uid);
    if (hasAnyHoleScore(holes)) {
      return round;
    }
  }
  return null;
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

/** 6자리 라운드 번호 (100000~999999) — Cloud Function에서도 동일 규칙 */
function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

type CreateRoundCfResult = {
  id: string;
  roundNumber: string;
  createdBy: string;
  roundName: string | null;
  golfCourseId: string;
  golfCourseName: string;
  frontCourseId: string;
  frontCourseName: string;
  backCourseId: string;
  backCourseName: string;
  courseId: string;
  courseName: string;
  teeTime: string | null;
  status: RoundStatus;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * 라운드 생성 (Cloud Function + Admin SDK).
 * 클라이언트 직접 Firestore batch는 심사/권한 이슈가 있어 서버에서 생성합니다.
 */
export async function createRound(
  uid: string,
  nickname: string | null,
  input: CreateRoundInput
): Promise<Round> {
  if (!uid) {
    throw new Error(i18n.t('errors.loginRequired'));
  }

  const payload = {
    roundName: input.roundName ?? null,
    golfCourseId: input.golfCourseId ?? '',
    golfCourseName: input.golfCourseName ?? '',
    frontCourseId: input.frontCourseId ?? '',
    frontCourseName: input.frontCourseName ?? '',
    backCourseId: input.backCourseId ?? '',
    backCourseName: input.backCourseName ?? '',
    teeTime: input.teeTime ?? null,
    scheduledAt: input.scheduledAt ? input.scheduledAt.toISOString() : null,
    nickname: nickname ?? null,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await callCloudFunction<typeof payload, CreateRoundCfResult>(
        'createRound',
        payload
      );

      userRoundsCache = null;

      return {
        id: result.id,
        createdBy: result.createdBy || uid,
        roundName: result.roundName ?? null,
        roundNumber: result.roundNumber,
        golfCourseId: result.golfCourseId ?? '',
        golfCourseName: result.golfCourseName ?? '',
        frontCourseId: result.frontCourseId ?? '',
        frontCourseName: result.frontCourseName ?? '',
        backCourseId: result.backCourseId ?? '',
        backCourseName: result.backCourseName ?? '',
        courseId: result.courseId ?? result.frontCourseId ?? '',
        courseName: result.courseName ?? result.frontCourseName ?? '',
        teeTime: result.teeTime ?? null,
        status: result.status ?? 'DRAFT',
        scheduledAt: parseIsoDate(result.scheduledAt),
        createdAt: parseIsoDate(result.createdAt) ?? new Date(),
        updatedAt: parseIsoDate(result.updatedAt) ?? new Date(),
      };
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 400);
        });
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(i18n.t('serverErrors.createFailed'));
}

/**
 * HOST가 스코어 미확정 라운드 취소 (Cloud Function).
 * 준비/진행중이며 참가자 전원 미확정일 때만 가능합니다.
 */
export async function cancelRound(roundId: string): Promise<void> {
  const id = String(roundId ?? '').trim();
  if (!id) {
    throw new Error(i18n.t('errors.roundIdRequired'));
  }

  await callCloudFunction<{ roundId: string }, { ok: boolean }>('cancelRound', {
    roundId: id,
  });

  userRoundsCache = null;
  roundCache.delete(cacheKeyRound(id));
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

    // HomeScreen 통계 최적화용 집계값 (없으면 fallback 계산)
    totalPutts: data.totalPutts as number | undefined,
    girHitCount: data.girHitCount as number | undefined,
    girTotalCount: data.girTotalCount as number | undefined,
    firHitCount: data.firHitCount as number | undefined,
    firTotalCount: data.firTotalCount as number | undefined,
    statsVersion: data.statsVersion as number | undefined,
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
 * @param options.source 'server'면 네트워크 강제(확정 직후용). 목록은 기본 캐시 허용이 빠름.
 */
export async function fetchRoundParticipant(
  roundId: string,
  uid: string,
  options?: { source?: 'default' | 'server' }
): Promise<RoundParticipant | null> {
  const preferServer = options?.source === 'server';
  const key = cacheKeyParticipant(roundId, uid);
  if (!preferServer) {
    const cached = participantCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
  }
  const inFlight = participantInFlight.get(key);
  if (inFlight) return inFlight;

  const ref = firestore()
    .collection(ROUNDS_COLLECTION)
    .doc(roundId)
    .collection(PARTICIPANTS)
    .doc(uid);

  const promise = (async () => {
    let doc: FirebaseFirestoreTypes.DocumentSnapshot;
    if (preferServer) {
      try {
        doc = await ref.get({ source: 'server' });
      } catch {
        doc = await ref.get();
      }
    } else {
      doc = await ref.get();
    }
    if (!doc.exists || !doc.data()) return null;
    return participantFromDoc(doc.id, doc.data() as Record<string, unknown>);
  })();

  participantInFlight.set(key, promise);
  try {
    const value = await promise;
    participantCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    return value;
  } finally {
    participantInFlight.delete(key);
  }
}

const HOLE_NOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];

/**
 * FIR·GIR 집계 기준 버전. 기준을 바꾸면 올려야 participants·userStats에 저장된 옛 집계가 다시 계산됨.
 * 1(버전 필드 없음): GIR을 모든 홀 파4 기준(타수 − 퍼트 ≤ 2)으로 계산
 * 2: GIR을 홀별 파 기준(타수 − 퍼트 ≤ 파 − 2)으로 계산
 */
const ROUND_STATS_VERSION = 2;
const DEFAULT_PAR = 4;

type ParLookup = (holeNo: string) => number;
type HitCount = { hit: number; total: number };

/** 라운드의 전반·후반 코스 홀 정보로 홀별 파 조회 함수 생성. 코스 정보를 못 불러오면 null */
async function fetchParLookup(round: Round | null): Promise<ParLookup | null> {
  if (!round?.golfCourseId || !round.frontCourseId) return null;
  try {
    const frontMap = await fetchHolesUnderCourse(round.golfCourseId, round.frontCourseId);
    const backMap = round.backCourseId
      ? await fetchHolesUnderCourse(round.golfCourseId, round.backCourseId)
      : new Map<string, GolfCourseHoleInput>();
    return (no) => getParForHole(no, frontMap, backMap);
  } catch {
    return null;
  }
}

/** FIR: 파4·파5 홀 중 Fairway 체크한 홀 수 / 파4·파5 홀 수 */
function countFIR(holes: Record<string, HoleScoreData>, parOf: ParLookup): HitCount {
  let hit = 0;
  let total = 0;
  for (const no of HOLE_NOS) {
    const par = parOf(no);
    if (par !== 4 && par !== 5) continue;
    total += 1;
    if (holes[no]?.fairway === true) hit += 1;
  }
  return { hit, total };
}

/** GIR: 그린에 올린 타수(타수 − 퍼트)가 (파 − 2) 이하인 홀 수 / 입력된 홀 수 */
function countGIR(holes: Record<string, HoleScoreData>, parOf: ParLookup): HitCount {
  let hit = 0;
  let total = 0;
  for (const no of HOLE_NOS) {
    const h = holes[no];
    if (!h || typeof h.putts !== 'number') continue;
    const par = parOf(no);
    const strokes = grossStrokesForHole(h.strokes, par);
    total += 1;
    if (strokes - h.putts <= par - 2) hit += 1;
  }
  return { hit, total };
}

/**
 * 홈·MY 공통 FIR·GIR 집계.
 * 코스 정보가 없으면 FIR은 계산하지 않고(null), GIR은 모든 홀을 파4로 간주.
 */
function countRoundHits(
  holes: Record<string, HoleScoreData>,
  parOf: ParLookup | null
): { fir: HitCount | null; gir: HitCount } {
  return {
    fir: parOf ? countFIR(holes, parOf) : null,
    gir: countGIR(holes, parOf ?? (() => DEFAULT_PAR)),
  };
}

function toPct({ hit, total }: HitCount): number | null {
  return total > 0 ? Math.round((hit / total) * 1000) / 10 : null;
}

/**
 * 사용자 확정 스코어 타수 목록 (스코어 확정된 라운드만, 18홀 total)
 * MY 화면 평균/최저 타수 계산용
 */
export async function fetchUserConfirmedTotals(uid: string): Promise<number[]> {
  const roundIds = await fetchUserRoundIds(uid);
  if (roundIds.length === 0) return [];
  const participants = await mapWithConcurrency(roundIds, 5, (roundId) =>
    fetchRoundParticipant(roundId, uid)
  );
  return participants
    .filter((p): p is RoundParticipant => p != null && p.scoreConfirmedAt != null && p.holesEntered === 18 && p.total > 0)
    .map((p) => p.total);
}

export type UserConfirmedRoundStats = {
  roundIds: string[];
  totals: number[];
  // 아래 3개는 HomeScreen의 FIR/GIR/PPR 계산값을 바로 제공
  // (신규 스키마: participants/{uid}에 집계값이 저장되어 있으므로 holes 조회 횟수를 줄일 수 있음)
  fir: number | null; // (firHit / firTotal) * 100
  gir: number | null; // (girHit / girTotal) * 100
  ppr: number | null; // (totalPuttsSum / roundCount)
};

// HomeScreen에서 같은 통계를 짧은 시간 반복 조회하면 Firestore 읽기/연산이 누적됩니다.
// (특히 FIR 계산이 course/holes 조회를 동반)
// 간단한 메모리 캐시를 둬서 체감 로딩 시간을 줄입니다.
const USER_CONFIRMED_ROUND_STATS_CACHE_TTL_MS = 30 * 1000;
const userConfirmedRoundStatsCache = new Map<
  string,
  { expiresAt: number; value: UserConfirmedRoundStats }
>();

const USER_STATS_COLLECTION = 'userStats';
const CONFIRMED_ROUND_STATS_DOC_ID = 'confirmedRoundStats';

/**
 * 사용자 확정 라운드 통계 (roundIds, totals, 홀별 스코어 배열)
 * MY 화면 라운드수/베스트/평균 및 FIR/GIR/PPR 계산용
 */
export async function fetchUserConfirmedRoundStats(
  uid: string,
  opts?: { forceRecompute?: boolean }
): Promise<UserConfirmedRoundStats> {
  const forceRecompute = opts?.forceRecompute ?? false;
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
  const cached = userConfirmedRoundStatsCache.get(uid);
  if (!forceRecompute && cached && cached.expiresAt > Date.now()) return cached.value;

  if (!forceRecompute) {
    // HomeScreen 최적화: 누적 통계를 Materialized View처럼 저장해두고 1회 read로 끝냅니다.
    try {
      const doc = await firestore()
        .collection(USERS_COLLECTION)
        .doc(uid)
        .collection(USER_STATS_COLLECTION)
        .doc(CONFIRMED_ROUND_STATS_DOC_ID)
        .get();
      const d = doc.data() as Record<string, unknown> | undefined;
      if (!d) throw new Error('user confirmed stats doc has no data');
      if (d.statsVersion !== ROUND_STATS_VERSION) throw new Error('user confirmed stats doc is outdated');
      const roundIds = Array.isArray(d.roundIds) ? (d.roundIds.filter((x): x is string => typeof x === 'string')) : [];
      const totals = Array.isArray(d.totals) ? (d.totals.filter((x): x is number => typeof x === 'number')) : [];
      const fir = typeof d.fir === 'number' ? d.fir : null;
      const gir = typeof d.gir === 'number' ? d.gir : null;
      const ppr = typeof d.ppr === 'number' ? d.ppr : null;

      const result: UserConfirmedRoundStats = { roundIds, totals, fir, gir, ppr };
      userConfirmedRoundStatsCache.set(uid, {
        expiresAt: Date.now() + USER_CONFIRMED_ROUND_STATS_CACHE_TTL_MS,
        value: result,
      });
      if (isDev) {
        console.log('[stats] confirmedRoundStats doc hit', {
          uid,
          roundCount: roundIds.length,
          fir,
          gir,
          ppr,
        });
      }
      return result;
    } catch {
      // doc read 실패 시 기존 방식 계산으로 fallback
      if (isDev) console.log('[stats] confirmedRoundStats doc read failed, fallback', { uid });
    }
  }

  const roundIds = await fetchUserRoundIds(uid);
  if (roundIds.length === 0) {
    const empty: UserConfirmedRoundStats = { roundIds: [], totals: [], fir: null, gir: null, ppr: null };
    userConfirmedRoundStatsCache.set(uid, {
      expiresAt: Date.now() + USER_CONFIRMED_ROUND_STATS_CACHE_TTL_MS,
      value: empty,
    });
    return empty;
  }
  const participants = await mapWithConcurrency(roundIds, 5, (roundId) =>
    fetchRoundParticipant(roundId, uid)
  );

  type ConfirmedCandidate = { roundId: string; p: NonNullable<typeof participants[number]> };
  const confirmed = participants
    .map((p, i) => ({ roundId: roundIds[i], p }))
    .filter(
      (x): x is ConfirmedCandidate =>
        x.p != null && x.p.scoreConfirmedAt != null && x.p.holesEntered === 18 && x.p.total > 0
    );

  const includedRoundIds: string[] = [];
  const totals: number[] = [];

  // aggregated sums (new schema)
  let firHit = 0;
  let firTotal = 0;
  let girHit = 0;
  let girTotal = 0;
  let pprTotalPutts = 0;

  // missing aggregates -> fallback: holes 문서 조회 + 계산
  const fallbackCandidates: Array<{ roundId: string; total: number }> = [];

  for (const { roundId, p } of confirmed) {
    if (
      p.statsVersion === ROUND_STATS_VERSION &&
      typeof p.totalPutts === 'number' &&
      typeof p.girHitCount === 'number' &&
      typeof p.girTotalCount === 'number' &&
      typeof p.firHitCount === 'number' &&
      typeof p.firTotalCount === 'number'
    ) {
      includedRoundIds.push(roundId);
      totals.push(p.total);

      pprTotalPutts += p.totalPutts;
      girHit += p.girHitCount;
      girTotal += p.girTotalCount;
      firHit += p.firHitCount;
      firTotal += p.firTotalCount;
    } else {
      fallbackCandidates.push({ roundId, total: p.total });
    }
  }

  if (fallbackCandidates.length > 0) {
    if (isDev) console.log('[stats] fallbackCandidates', { uid, count: fallbackCandidates.length });
    const fallbackResults = await mapWithConcurrency(
      fallbackCandidates,
      5,
      async (cand) => {
        const holes = await fetchRoundScore(cand.roundId, uid);
        const isFull18 = HOLE_NOS.every((no) => holes[no] != null);
        if (!isFull18) return null;

        const totalPutts = HOLE_NOS.reduce((sum, no) => sum + (holes[no]?.putts ?? 0), 0);
        const round = await fetchRound(cand.roundId).catch(() => null);
        const { fir, gir } = countRoundHits(holes, await fetchParLookup(round));

        // 옛 기준 라운드를 새 기준으로 backfill: 다음 HomeScreen 로딩부터 holes 조회를 줄입니다.
        try {
          await firestore()
            .collection(ROUNDS_COLLECTION)
            .doc(cand.roundId)
            .collection(PARTICIPANTS)
            .doc(uid)
            .set(
              {
                totalPutts,
                girHitCount: gir.hit,
                girTotalCount: gir.total,
                // FIR 계산 실패해도 0으로 backfill 하면 다음 Home 로딩에서 fallback(holes 조회)을 피할 수 있습니다.
                firHitCount: fir?.hit ?? 0,
                firTotalCount: fir?.total ?? 0,
                statsVersion: ROUND_STATS_VERSION,
                updatedAt: firestore.Timestamp.now(),
              },
              { merge: true }
            );
          participantCache.delete(cacheKeyParticipant(cand.roundId, uid));
        } catch {
          // 권한/네트워크 이슈로 backfill 실패해도 사용자 체감 계산은 계속 진행합니다.
          if (isDev) console.warn('[stats] backfill participant failed', { uid, roundId: cand.roundId });
        }

        return { roundId: cand.roundId, total: cand.total, totalPutts, fir, gir };
      }
    );

    for (const r of fallbackResults) {
      if (!r) continue;
      includedRoundIds.push(r.roundId);
      totals.push(r.total);

      pprTotalPutts += r.totalPutts;
      girHit += r.gir.hit;
      girTotal += r.gir.total;
      if (r.fir) {
        firHit += r.fir.hit;
        firTotal += r.fir.total;
      }
    }
  }

  const roundCount = includedRoundIds.length;
  const fir = toPct({ hit: firHit, total: firTotal });
  const gir = toPct({ hit: girHit, total: girTotal });
  const ppr = roundCount > 0 ? Math.round((pprTotalPutts / roundCount) * 10) / 10 : null;

  const result: UserConfirmedRoundStats = {
    roundIds: includedRoundIds,
    totals,
    fir,
    gir,
    ppr,
  };

  // Materialized View: HomeScreen은 해당 doc만 1회 read해서 holes 조회를 피합니다.
  try {
    await firestore()
      .collection(USERS_COLLECTION)
      .doc(uid)
      .collection(USER_STATS_COLLECTION)
      .doc(CONFIRMED_ROUND_STATS_DOC_ID)
      .set(
        {
          roundIds: includedRoundIds,
          totals,
          fir,
          gir,
          ppr,
          statsVersion: ROUND_STATS_VERSION,
          updatedAt: firestore.Timestamp.now(),
        },
        { merge: true }
      );
    if (isDev) {
      console.log('[stats] confirmedRoundStats doc written', {
        uid,
        roundCount: includedRoundIds.length,
      });
    }
  } catch {
    // 통계 doc write 실패해도 계산 결과는 반환합니다.
    if (isDev) console.warn('[stats] confirmedRoundStats doc write failed', { uid });
  }

  userConfirmedRoundStatsCache.set(uid, {
    expiresAt: Date.now() + USER_CONFIRMED_ROUND_STATS_CACHE_TTL_MS,
    value: result,
  });

  return result;
}

/** 라운드 1회 퍼팅 합계 */
export function getPuttsForRound(holes: Record<string, HoleScoreData>): number {
  return HOLE_NOS.reduce((sum, no) => sum + (holes[no]?.putts ?? 0), 0);
}

export type RoundRecordRow = {
  dateStr: string;
  golfCourseName: string;
  total: number;
  birdies: number | null;
  pars: number | null;
  bogeys: number | null;
  fwPct: number | null;
  girPct: number | null;
  putts: number;
};

/** 홀별 par 반환 (front/back 맵: 키 "1"~"9"). 10~18홀은 back의 "1"~"9"에 대응 */
function getParForHole(
  no: string,
  frontMap: Map<string, GolfCourseHoleInput>,
  backMap: Map<string, GolfCourseHoleInput>
): number {
  const n = parseInt(no, 10);
  if (n <= 9) return frontMap.get(no)?.par ?? DEFAULT_PAR;
  return backMap.get(String(n - 9))?.par ?? DEFAULT_PAR;
}

/** 라운드별 버디(-1)/파(0)/보기(+1) 홀 수 집계 */
function getBirdieParBogeyCounts(
  holes: Record<string, HoleScoreData>,
  parOf: ParLookup
): { birdies: number; pars: number; bogeys: number } {
  let birdies = 0;
  let pars = 0;
  let bogeys = 0;
  for (const no of HOLE_NOS) {
    const h = holes[no];
    const strokes = h?.strokes ?? 0;
    if (strokes <= 0) continue;
    const par = parOf(no);
    const toPar = strokes - par;
    if (toPar === -1) birdies += 1;
    else if (toPar === 0) pars += 1;
    else if (toPar === 1) bogeys += 1;
  }
  return { birdies, pars, bogeys };
}

/**
 * 나의 기록 테이블용: 확정된 18홀 라운드 목록 (날짜, 골프장, 총타수, 버디, 파, 보기, FW%, GIR%, 퍼팅)
 * 버디/파/보기는 홀별 toPar(-1/0/+1) 합계. FW%는 페어웨이 안착율.
 */
export async function fetchUserRoundRecords(uid: string): Promise<RoundRecordRow[]> {
  const { roundIds, totals } = await fetchUserConfirmedRoundStats(uid);
  if (roundIds.length === 0) return [];
  const scores = await mapWithConcurrency(roundIds, 5, (roundId) => fetchRoundScore(roundId, uid));
  const rounds = await Promise.all(roundIds.map((id) => fetchRound(id)));
  const indices = roundIds.map((_, i) => i);
  indices.sort((a, b) => {
    const ad = rounds[a]?.scheduledAt ?? rounds[a]?.createdAt;
    const bd = rounds[b]?.scheduledAt ?? rounds[b]?.createdAt;
    return (bd?.getTime() ?? 0) - (ad?.getTime() ?? 0);
  });

  const rows: RoundRecordRow[] = await Promise.all(
    indices.map(async (i) => {
      const round = rounds[i];
      const total = totals[i] ?? 0;
      const holes = scores[i] ?? {};
      const courseName = round?.golfCourseName ?? round?.frontCourseName ?? '-';
      const d = round?.scheduledAt ?? round?.createdAt;
      const dateStr = d
        ? `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
        : '-';
      const putts = getPuttsForRound(holes);
      const parOf = await fetchParLookup(round);
      const { fir, gir } = countRoundHits(holes, parOf);
      const fwPct = fir ? toPct(fir) : null;
      const girPct = toPct(gir);
      const counts = parOf ? getBirdieParBogeyCounts(holes, parOf) : null;
      const birdies = counts?.birdies ?? null;
      const pars = counts?.pars ?? null;
      const bogeys = counts?.bogeys ?? null;

      return {
        dateStr,
        golfCourseName: courseName,
        total,
        birdies,
        pars,
        bogeys,
        fwPct,
        girPct,
        putts,
      };
    })
  );
  return rows;
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
  const key = cacheKeyScore(roundId, uid);
  const cached = scoreCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const inFlight = scoreInFlight.get(key);
  if (inFlight) return inFlight;

  const promise = (async () => {
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
  })();

  scoreInFlight.set(key, promise);
  try {
    const value = await promise;
    scoreCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    return value;
  } finally {
    scoreInFlight.delete(key);
  }
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
  const holesEntered = Object.values(holes).filter(
    (h) => h && typeof h.strokes === 'number' && h.strokes > 0
  ).length;
  const now = firestore.Timestamp.now();
  const batch = firestore().batch();
  const scoreRef = firestore()
    .collection(ROUNDS_COLLECTION)
    .doc(roundId)
    .collection(SCORES)
    .doc(uid);
  const participantRef = firestore()
    .collection(ROUNDS_COLLECTION)
    .doc(roundId)
    .collection(PARTICIPANTS)
    .doc(uid);
  batch.set(
    scoreRef,
    { holes: payload, updatedAt: now },
    { merge: true }
  );
  batch.set(
    participantRef,
    {
      holesEntered,
      updatedAt: now,
    },
    { merge: true }
  );
  // 진행중 표시를 위해 첫 입력 시 라운드 상태도 IN_PROGRESS로
  if (holesEntered > 0) {
    batch.set(
      firestore().collection(ROUNDS_COLLECTION).doc(roundId),
      { status: 'IN_PROGRESS', updatedAt: now },
      { merge: true }
    );
  }
  await batch.commit();

  scoreCache.delete(cacheKeyScore(roundId, uid));
  participantCache.delete(cacheKeyParticipant(roundId, uid));
  roundCache.delete(cacheKeyRound(roundId));
  userRoundsCache = null;
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

  const totalPutts = HOLE_NOS.reduce((sum, no) => sum + (holes[no]?.putts ?? 0), 0);
  const round = await fetchRound(roundId).catch(() => null);
  const { fir, gir } = countRoundHits(holes, await fetchParLookup(round));

  await saveRoundScore(roundId, uid, holes);

  const participantRef = db.collection(ROUNDS_COLLECTION).doc(roundId).collection(PARTICIPANTS).doc(uid);
  await participantRef.set(
    {
      holesEntered: 18,
      totalOut,
      totalIn,
      total,
      totalPutts,
      girHitCount: gir.hit,
      girTotalCount: gir.total,
      firHitCount: fir?.hit ?? 0,
      firTotalCount: fir?.total ?? 0,
      statsVersion: ROUND_STATS_VERSION,
      scoreConfirmedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  // 확정 시 participant 데이터가 바뀌므로 캐시 무효화가 필요합니다.
  participantCache.delete(cacheKeyParticipant(roundId, uid));
  roundCache.delete(cacheKeyRound(roundId));
  userConfirmedRoundStatsCache.delete(uid);

  // 확정 직후 HomeScreen 통계를 Materialized View로 갱신합니다.
  // UI 흐름을 늦추지 않기 위해 백그라운드로 수행합니다.
  void fetchUserConfirmedRoundStats(uid, { forceRecompute: true }).catch(() => {});

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
