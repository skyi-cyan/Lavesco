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

const ROUNDS_COLLECTION = 'rounds';
const PARTICIPANTS = 'participants';
const SCORES = 'scores';
const USERS_COLLECTION = 'users';
const ROUND_IDS = 'roundIds';

// ---- In-memory caches (for HomeScreen stats speed-up) ----
// Firestore reads are relatively expensive in RN. HomeScreen stats may trigger multiple reads
// across roundIds (participants, scores, and round meta), so we memoize short-lived results.
const CACHE_TTL_MS = 15 * 1000; // keep small to avoid showing stale stats for long
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

    // HomeScreen 통계 최적화용 집계값 (없으면 fallback 계산)
    totalPutts: data.totalPutts as number | undefined,
    girHitCount: data.girHitCount as number | undefined,
    girTotalCount: data.girTotalCount as number | undefined,
    firHitCount: data.firHitCount as number | undefined,
    firTotalCount: data.firTotalCount as number | undefined,
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
  const key = cacheKeyParticipant(roundId, uid);
  const cached = participantCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const inFlight = participantInFlight.get(key);
  if (inFlight) return inFlight;

  const ref = firestore()
    .collection(ROUNDS_COLLECTION)
    .doc(roundId)
    .collection(PARTICIPANTS)
    .doc(uid);

  // 스코어 확정 직후에는 캐시가 최신이 아닐 수 있어 서버 우선으로 조회합니다.
  // 오프라인 등으로 서버 조회가 실패하면 캐시 조회로 폴백합니다.
  let doc: FirebaseFirestoreTypes.DocumentSnapshot;
  const promise = (async () => {
    try {
      doc = await ref.get({ source: 'server' });
    } catch {
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

        // GIR / PPR
        const totalPutts = HOLE_NOS.reduce((sum, no) => sum + (holes[no]?.putts ?? 0), 0);
        let localGirHit = 0;
        let localGirTotal = 0;
        for (const no of HOLE_NOS) {
          const h = holes[no];
          if (h && typeof h.strokes === 'number' && typeof h.putts === 'number' && h.strokes > 0) {
            localGirTotal += 1;
            if (h.strokes - h.putts <= 2) localGirHit += 1;
          }
        }

        // FIR (par4/5 + fairway=true)
        let localFirHit = 0;
        let localFirTotal = 0;
        let firComputed = false;
        try {
          const round = await fetchRound(cand.roundId);
          if (round?.golfCourseId && round.frontCourseId) {
            const frontMap = await fetchHolesUnderCourse(round.golfCourseId, round.frontCourseId);
            const backMap = round.backCourseId
              ? await fetchHolesUnderCourse(round.golfCourseId, round.backCourseId)
              : new Map<string, GolfCourseHoleInput>();
            for (const no of HOLE_NOS) {
              const par = getParForHole(no, frontMap, backMap);
              if (par !== 4 && par !== 5) continue;
              localFirTotal += 1;
              if (holes[no]?.fairway === true) localFirHit += 1;
            }
              firComputed = true;
          }
        } catch {
          // 코스/par 조회 실패 시 FIR은 제외
        }

          // 기존 라운드에 대해 backfill: 다음 HomeScreen 로딩부터 holes 조회를 줄입니다.
          try {
            const participantRef = firestore()
              .collection(ROUNDS_COLLECTION)
              .doc(cand.roundId)
              .collection(PARTICIPANTS)
              .doc(uid);

            await participantRef.set(
              {
                totalPutts,
                girHitCount: localGirHit,
                girTotalCount: localGirTotal,
                // FIR 계산 실패해도 0으로 backfill 하면 다음 Home 로딩에서 fallback(holes 조회)을 피할 수 있습니다.
                firHitCount: localFirHit,
                firTotalCount: localFirTotal,
                updatedAt: firestore.Timestamp.now(),
              },
              { merge: true }
            );

            participantCache.delete(cacheKeyParticipant(cand.roundId, uid));
          } catch {
            // 권한/네트워크 이슈로 backfill 실패해도 사용자 체감 계산은 계속 진행합니다.
            if (isDev) console.warn('[stats] backfill participant failed', { uid, roundId: cand.roundId });
          }

        return {
          roundId: cand.roundId,
          total: cand.total,
          totalPutts,
          girHit: localGirHit,
          girTotal: localGirTotal,
          firHit: localFirHit,
          firTotal: localFirTotal,
          firComputed,
        };
      }
    );

    for (const r of fallbackResults) {
      if (!r) continue;
      includedRoundIds.push(r.roundId);
      totals.push(r.total);

      pprTotalPutts += r.totalPutts;
      girHit += r.girHit;
      girTotal += r.girTotal;
      if (r.firComputed) {
        firHit += r.firHit;
        firTotal += r.firTotal;
      }
    }
  }

  const roundCount = includedRoundIds.length;
  const fir = firTotal > 0 ? Math.round((firHit / firTotal) * 1000) / 10 : null;
  const gir = girTotal > 0 ? Math.round((girHit / girTotal) * 1000) / 10 : null;
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

/**
 * FIR(레거시): fairway true인 홀 수 / fairway 입력된 홀 수, 백분율.
 * 최신 기준(FIR=파4/5 분모)은 fetchUserConfirmedRoundStats().fir 및 getFIRPctForRoundByPar45를 사용하세요.
 */
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

/** 라운드 1회 퍼팅 합계 */
export function getPuttsForRound(holes: Record<string, HoleScoreData>): number {
  return HOLE_NOS.reduce((sum, no) => sum + (holes[no]?.putts ?? 0), 0);
}

/** 라운드 1회 FIR(레거시): fairway true인 홀 수 / fairway 입력된 홀 수 */
export function getFIRPctForRound(holes: Record<string, HoleScoreData>): number | null {
  let hit = 0;
  let total = 0;
  for (const no of HOLE_NOS) {
    const h = holes[no];
    if (h && h.fairway != null) {
      total += 1;
      if (h.fairway) hit += 1;
    }
  }
  if (total === 0) return null;
  return Math.round((hit / total) * 1000) / 10;
}

/** 라운드 1회 FIR: 파4/파5 홀에서 FW 체크된 홀 수 / (파4+파5 홀 수) */
export function getFIRPctForRoundByPar45(
  holes: Record<string, HoleScoreData>,
  frontMap: Map<string, GolfCourseHoleInput>,
  backMap: Map<string, GolfCourseHoleInput>
): number | null {
  let hit = 0;
  let total = 0;
  for (const no of HOLE_NOS) {
    const par = getParForHole(no, frontMap, backMap);
    if (par !== 4 && par !== 5) continue;
    total += 1;
    if (holes[no]?.fairway === true) hit += 1;
  }
  if (total === 0) return null;
  return Math.round((hit / total) * 1000) / 10;
}

/** 라운드 1회 GIR%(par4 기준 2타 이내 도달). 데이터 없으면 null */
export function getGIRPctForRound(holes: Record<string, HoleScoreData>): number | null {
  let hit = 0;
  let total = 0;
  for (const no of HOLE_NOS) {
    const h = holes[no];
    if (h && typeof h.strokes === 'number' && typeof h.putts === 'number' && h.strokes > 0) {
      total += 1;
      if (h.strokes - h.putts <= 2) hit += 1;
    }
  }
  if (total === 0) return null;
  return Math.round((hit / total) * 1000) / 10;
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
  if (n <= 9) return frontMap.get(no)?.par ?? 4;
  return backMap.get(String(n - 9))?.par ?? 4;
}

/** 라운드별 버디(-1)/파(0)/보기(+1) 홀 수 집계. par 정보 없으면 null 반환 */
function getBirdieParBogeyCounts(
  holes: Record<string, HoleScoreData>,
  frontMap: Map<string, GolfCourseHoleInput>,
  backMap: Map<string, GolfCourseHoleInput>
): { birdies: number; pars: number; bogeys: number } | null {
  let birdies = 0;
  let pars = 0;
  let bogeys = 0;
  for (const no of HOLE_NOS) {
    const h = holes[no];
    const strokes = h?.strokes ?? 0;
    if (strokes <= 0) continue;
    const par = getParForHole(no, frontMap, backMap);
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
      let fwPct = getFIRPctForRound(holes);
      const girPct = getGIRPctForRound(holes);
      const putts = getPuttsForRound(holes);

      let birdies: number | null = null;
      let pars: number | null = null;
      let bogeys: number | null = null;
      if (round?.golfCourseId && round?.frontCourseId) {
        try {
          const frontMap = await fetchHolesUnderCourse(round.golfCourseId, round.frontCourseId);
          const backMap = round.backCourseId
            ? await fetchHolesUnderCourse(round.golfCourseId, round.backCourseId)
            : new Map<string, GolfCourseHoleInput>();
          fwPct = getFIRPctForRoundByPar45(holes, frontMap, backMap);
          const counts = getBirdieParBogeyCounts(holes, frontMap, backMap);
          if (counts) {
            birdies = counts.birdies;
            pars = counts.pars;
            bogeys = counts.bogeys;
          }
        } catch {
          // par 조회 실패 시 null 유지
        }
      }

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
  await firestore()
    .collection(ROUNDS_COLLECTION)
    .doc(roundId)
    .collection(SCORES)
    .doc(uid)
    .set(
      { holes: payload, updatedAt: firestore.Timestamp.now() },
      { merge: true }
    );

  // Score 데이터가 갱신되므로 캐시를 즉시 무효화합니다.
  scoreCache.delete(cacheKeyScore(roundId, uid));
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

  // GIR / PPR: strokes & putts만으로 계산 가능
  const totalPutts = HOLE_NOS.reduce((sum, no) => sum + (holes[no]?.putts ?? 0), 0);
  let girHitCount = 0;
  let girTotalCount = 0;
  for (const no of HOLE_NOS) {
    const h = holes[no];
    if (h && typeof h.strokes === 'number' && typeof h.putts === 'number' && h.strokes > 0) {
      girTotalCount += 1;
      if (h.strokes - h.putts <= 2) girHitCount += 1;
    }
  }

  // FIR: par 4/5 + fairway=true
  let firHitCount = 0;
  let firTotalCount = 0;
  try {
    const round = await fetchRound(roundId);
    if (round?.golfCourseId && round.frontCourseId) {
      const frontMap = await fetchHolesUnderCourse(round.golfCourseId, round.frontCourseId);
      const backMap = round.backCourseId
        ? await fetchHolesUnderCourse(round.golfCourseId, round.backCourseId)
        : new Map<string, GolfCourseHoleInput>();
      let localFirHit = 0;
      let localFirTotal = 0;
      for (const no of HOLE_NOS) {
        const par = getParForHole(no, frontMap, backMap);
        if (par !== 4 && par !== 5) continue;
        localFirTotal += 1;
        if (holes[no]?.fairway === true) localFirHit += 1;
      }
      firHitCount = localFirHit;
      firTotalCount = localFirTotal;
    }
  } catch {
    // FIR 집계 실패 시 HomeScreen에서 fallback(기존 holes 계산)로 처리
  }

  await saveRoundScore(roundId, uid, holes);

  const participantRef = db.collection(ROUNDS_COLLECTION).doc(roundId).collection(PARTICIPANTS).doc(uid);
  await participantRef.set(
    {
      holesEntered: 18,
      totalOut,
      totalIn,
      total,
      totalPutts,
      girHitCount,
      girTotalCount,
      firHitCount,
      firTotalCount,
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
