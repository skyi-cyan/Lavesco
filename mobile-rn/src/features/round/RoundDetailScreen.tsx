import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../core/auth/AuthContext';
import { fetchRound, fetchRoundParticipants, fetchRoundScore, saveRoundScore, confirmRoundScore } from '../../core/services/roundService';
import { fetchHolesUnderCourse } from '../../core/services/courseService';
import type { Round } from '../../core/types/round';
import type { RoundParticipant } from '../../core/types/round';
import type { HoleScoreData } from '../../core/types/round';
import type { GolfCourseHoleInput } from '../../core/types/course';
import type { RoundStackParamList } from '../../app/RoundStack';

const HOLE_NUMBERS_FRONT = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const HOLE_NUMBERS_BACK = ['10', '11', '12', '13', '14', '15', '16', '17', '18'];
const ALL_HOLE_NUMBERS = [...HOLE_NUMBERS_FRONT, ...HOLE_NUMBERS_BACK];
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const DEFAULT_TEE = 'white';

type ViewNine = 'front' | 'back';

type Props = NativeStackScreenProps<RoundStackParamList, 'RoundDetail'>;

export function RoundDetailScreen({ route }: Props): React.JSX.Element {
  const { roundId } = route.params;
  const { user } = useAuth();
  const [round, setRound] = useState<Round | null>(null);
  const [participants, setParticipants] = useState<RoundParticipant[]>([]);
  const [scoresByUid, setScoresByUid] = useState<Record<string, Record<string, HoleScoreData>>>({});
  const [frontHoleInfo, setFrontHoleInfo] = useState<Record<string, GolfCourseHoleInput>>({});
  const [backHoleInfo, setBackHoleInfo] = useState<Record<string, GolfCourseHoleInput>>({});
  const [viewNine, setViewNine] = useState<ViewNine>('front');
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  /** 현재 홀 입력 중인 값(미저장). 저장 버튼을 눌러야만 scoresByUid에 반영됨 */
  const [draftHoleScore, setDraftHoleScore] = useState<HoleScoreData>({ strokes: 0, putts: 0 });
  const [savingHole, setSavingHole] = useState(false);
  /** 12시간 경과 후 자동 확정은 한 번만 수행하기 위한 ref */
  const autoConfirmedRoundIdRef = useRef<string | null>(null);

  const holeNumbers = viewNine === 'front' ? HOLE_NUMBERS_FRONT : HOLE_NUMBERS_BACK;
  const currentHoleNo = holeNumbers[currentHoleIndex];
  const holeInfoKey = viewNine === 'front' ? currentHoleNo : String(currentHoleIndex + 1);
  const holeInfo = viewNine === 'front' ? frontHoleInfo : backHoleInfo;
  const holePar = holeInfo[holeInfoKey]?.par ?? 4;
  const holeDistance = holeInfo[holeInfoKey]?.distances?.[DEFAULT_TEE] ?? 0;
  const courseNameForHole =
    viewNine === 'front'
      ? (round?.frontCourseName || round?.golfCourseName || '-')
      : (round?.backCourseName || round?.golfCourseName || '-');
  const hasBackCourse = !!(round?.backCourseId && (round?.backCourseName || round?.golfCourseName));

  /** 현재 홀 변경 시 draft를 저장된 값(또는 기본값)으로 동기화 */
  useEffect(() => {
    const saved = user?.uid ? scoresByUid[user.uid]?.[currentHoleNo] : undefined;
    const initial: HoleScoreData =
      saved != null
        ? {
            strokes: saved.strokes ?? 0,
            putts: saved.putts ?? 0,
            fairway: saved.fairway,
            rough: saved.rough,
            penalty: saved.penalty,
            ob: saved.ob,
          }
        : { strokes: 0, putts: 0 };
    setDraftHoleScore(initial);
  }, [currentHoleNo, user?.uid, scoresByUid]);

  const load = useCallback(async () => {
    if (!roundId) return;
    setLoading(true);
    try {
      const [roundData, participantsList] = await Promise.all([
        fetchRound(roundId),
        fetchRoundParticipants(roundId),
      ]);
      setRound(roundData ?? null);
      setParticipants(participantsList);

      if (roundData?.golfCourseId && roundData?.frontCourseId) {
        const frontMap = await fetchHolesUnderCourse(
          roundData.golfCourseId,
          roundData.frontCourseId
        );
        const frontObj: Record<string, GolfCourseHoleInput> = {};
        frontMap.forEach((v, k) => {
          frontObj[k] = v;
        });
        setFrontHoleInfo(frontObj);
      } else {
        setFrontHoleInfo({});
      }
      if (roundData?.golfCourseId && roundData?.backCourseId) {
        const backMap = await fetchHolesUnderCourse(
          roundData.golfCourseId,
          roundData.backCourseId
        );
        const backObj: Record<string, GolfCourseHoleInput> = {};
        backMap.forEach((v, k) => {
          backObj[k] = v;
        });
        setBackHoleInfo(backObj);
      } else {
        setBackHoleInfo({});
      }

      const scoreMap: Record<string, Record<string, HoleScoreData>> = {};
      await Promise.all(
        participantsList.map(async (p) => {
          const holes = await fetchRoundScore(roundId, p.uid);
          scoreMap[p.uid] = holes;
        })
      );
      setScoresByUid(scoreMap);
    } catch {
      setRound(null);
      setParticipants([]);
      setScoresByUid({});
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    load();
  }, [load]);

  /** 현재 홀 draft만 수정 (저장 버튼을 눌러야 반영됨) */
  const updateDraft = useCallback((updater: (prev: HoleScoreData) => HoleScoreData) => {
    setDraftHoleScore((prev) => updater(prev));
  }, []);

  const setStrokes = (delta: number) => {
    updateDraft((h) => ({ ...h, strokes: (h.strokes ?? 0) + delta }));
  };
  const setPutts = (delta: number) => {
    updateDraft((h) => ({ ...h, putts: Math.max(0, (h.putts ?? 0) + delta) }));
  };
  const toggleFairway = () => {
    updateDraft((h) => ({ ...h, fairway: h.fairway ? false : true }));
  };
  const toggleRough = () => {
    updateDraft((h) => ({ ...h, rough: h.rough ? false : true }));
  };
  const togglePenalty = () => {
    updateDraft((h) => ({ ...h, penalty: h.penalty ? false : true }));
  };
  const toggleOb = () => {
    updateDraft((h) => ({ ...h, ob: h.ob ? 0 : 1 }));
  };

  /** 현재 홀 저장: Firestore 저장 성공 시에만 scoresByUid 반영 */
  const handleSaveCurrentHole = useCallback(async () => {
    if (!user?.uid || !roundId) return;
    setSavingHole(true);
    const nextHoles = { ...(scoresByUid[user.uid] ?? {}), [currentHoleNo]: draftHoleScore };
    try {
      await saveRoundScore(roundId, user.uid, nextHoles);
      setScoresByUid((s) => ({ ...s, [user.uid]: nextHoles }));
    } catch {
      // 저장 실패 시 상태 유지
    } finally {
      setSavingHole(false);
    }
  }, [roundId, user?.uid, currentHoleNo, draftHoleScore, scoresByUid]);

  const getOutTotal = (uid: string): number => {
    const holes = scoresByUid[uid] ?? {};
    return HOLE_NUMBERS_FRONT.reduce((sum, no) => sum + (holes[no]?.strokes ?? 0), 0);
  };

  const getInTotal = (uid: string): number => {
    const holes = scoresByUid[uid] ?? {};
    return HOLE_NUMBERS_BACK.reduce((sum, no) => sum + (holes[no]?.strokes ?? 0), 0);
  };

  const getTotal = (uid: string): number => getOutTotal(uid) + getInTotal(uid);

  /** 홀 번호(1~18)에 해당하는 par. 전반은 frontHoleInfo, 후반은 backHoleInfo 키 1~9 */
  const getParForHoleNo = useCallback(
    (no: string): number => {
      const n = parseInt(no, 10);
      if (n <= 9) return frontHoleInfo[no]?.par ?? 4;
      return backHoleInfo[String(n - 9)]?.par ?? 4;
    },
    [frontHoleInfo, backHoleInfo]
  );

  /** 전반 9홀 par 합계 */
  const parOut = HOLE_NUMBERS_FRONT.reduce((sum, no) => sum + getParForHoleNo(no), 0);
  /** 후반 9홀 par 합계 */
  const parIn = HOLE_NUMBERS_BACK.reduce((sum, no) => sum + getParForHoleNo(no), 0);

  /** 스코어 vs par에 따른 폰트 색상: 언더 파 녹색, 파 검정, 오버 파 빨강 */
  const getScoreColor = useCallback(
    (strokes: number, par: number): string => {
      if (strokes <= 0) return '#333333';
      if (strokes < par) return '#1b5e20';
      if (strokes > par) return '#c62828';
      return '#333333';
    },
    []
  );

  /** 스코어보드 셀 표시: 파면 'ㅇ', 아니면 타수(0 포함). 저장된 홀에서만 호출 */
  const getScoreCellText = useCallback((strokes: number, par: number): string => {
    if (strokes === par) return 'ㅇ';
    return String(strokes);
  }, []);

  const toggleViewNine = () => {
    if (hasBackCourse) setViewNine((v) => (v === 'front' ? 'back' : 'front'));
  };

  const displayName = (p: RoundParticipant) =>
    p.nickname || p.uid.slice(0, 6) || '-';

  const myParticipant = user?.uid ? participants.find((p) => p.uid === user.uid) : null;
  const isScoreConfirmed = !!myParticipant?.scoreConfirmedAt;

  /** 18홀 모두 저장된 경우에만 스코어 확정 버튼 활성화 */
  const all18HolesSaved =
    !!user?.uid &&
    ALL_HOLE_NUMBERS.every((no) => scoresByUid[user.uid]?.[no] !== undefined);

  /** 확정 전 12시간 경과 시 자동 확정(한 번만) */
  useEffect(() => {
    if (!round?.createdAt || !user?.uid || !roundId || isScoreConfirmed) return;
    if (autoConfirmedRoundIdRef.current === roundId) return;
    const createdAtMs = round.createdAt.getTime();
    if (Date.now() - createdAtMs < TWELVE_HOURS_MS) return;

    autoConfirmedRoundIdRef.current = roundId;
    const holes = scoresByUid[user.uid] ?? {};
    confirmRoundScore(roundId, user.uid, holes)
      .then(() => load())
      .catch(() => {
        autoConfirmedRoundIdRef.current = null;
      });
  }, [round?.createdAt, roundId, user?.uid, isScoreConfirmed, scoresByUid, load]);

  const handleConfirmScore = useCallback(async () => {
    if (!user?.uid || !roundId || confirming || isScoreConfirmed || !all18HolesSaved) return;
    const holes = scoresByUid[user.uid] ?? {};
    setConfirming(true);
    try {
      await confirmRoundScore(roundId, user.uid, holes);
      await load();
      Alert.alert('스코어 확정', '스코어가 확정되었습니다.');
    } catch (e) {
      const message = (e as Error)?.message ?? '스코어 확정에 실패했습니다.';
      Alert.alert('확정 실패', message);
    } finally {
      setConfirming(false);
    }
  }, [roundId, user?.uid, scoresByUid, confirming, isScoreConfirmed, all18HolesSaved, load]);

  if (loading || !round) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a0" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 홀 네비게이션 */}
      <View style={styles.holeNav}>
        <TouchableOpacity
          style={styles.holeNavSide}
          onPress={() => setCurrentHoleIndex((i) => Math.max(0, i - 1))}
          disabled={currentHoleIndex === 0}
        >
          <Ionicons name="chevron-back" size={20} color={currentHoleIndex === 0 ? '#ccc' : '#333'} />
          <Text style={styles.holeNavLabel}>
            {currentHoleIndex > 0 ? `${holeNumbers[currentHoleIndex - 1]} Hole` : ''}
          </Text>
        </TouchableOpacity>
        <View style={styles.holeCircle}>
          <Text style={styles.holeCircleText}>{currentHoleNo}</Text>
        </View>
        <TouchableOpacity
          style={styles.holeNavSide}
          onPress={() => setCurrentHoleIndex((i) => Math.min(holeNumbers.length - 1, i + 1))}
          disabled={currentHoleIndex === holeNumbers.length - 1}
        >
          <Text style={styles.holeNavLabel}>
            {currentHoleIndex < holeNumbers.length - 1 ? `${holeNumbers[currentHoleIndex + 1]} Hole` : ''}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={currentHoleIndex === holeNumbers.length - 1 ? '#ccc' : '#333'}
          />
        </TouchableOpacity>
      </View>

      {/* 코스명(탭 시 전반/후반 전환) · Par · 거리 (한 줄) */}
      <View style={styles.holeInfoLine}>
        <TouchableOpacity
          style={styles.holeInfoCourseWrap}
          onPress={toggleViewNine}
          disabled={!hasBackCourse}
          activeOpacity={hasBackCourse ? 0.7 : 1}
        >
          <Text style={[styles.holeInfoCourse, !hasBackCourse && styles.holeInfoCourseDisabled]} numberOfLines={1}>
            {courseNameForHole}
          </Text>
          {hasBackCourse ? (
            <Text style={styles.holeInfoCourseHint}>
              (탭하여 {viewNine === 'front' ? '후반' : '전반'} 코스로 전환)
            </Text>
          ) : null}
        </TouchableOpacity>
        <Text style={styles.holeInfoPar}>Par {holePar}</Text>
        <Text style={styles.holeInfoDistance}>{holeDistance > 0 ? `${holeDistance}m` : '-'}</Text>
      </View>

      {/* SCORE / PUTT (확정 시 읽기 전용) */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreBlockLabel}>SCORE</Text>
          <View style={styles.scoreControl}>
            {!isScoreConfirmed && (
              <TouchableOpacity style={styles.scoreBtn} onPress={() => setStrokes(-1)}>
                <Ionicons name="remove" size={24} color="#333" />
              </TouchableOpacity>
            )}
            <Text style={styles.scoreValue}>{draftHoleScore.strokes}</Text>
            {!isScoreConfirmed && (
              <TouchableOpacity style={styles.scoreBtn} onPress={() => setStrokes(1)}>
                <Ionicons name="add" size={24} color="#333" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreBlockLabel}>PUTT</Text>
          <View style={styles.scoreControl}>
            {!isScoreConfirmed && (
              <TouchableOpacity style={styles.scoreBtn} onPress={() => setPutts(-1)}>
                <Ionicons name="remove" size={24} color="#333" />
              </TouchableOpacity>
            )}
            <Text style={styles.scoreValue}>{draftHoleScore.putts}</Text>
            {!isScoreConfirmed && (
              <TouchableOpacity style={styles.scoreBtn} onPress={() => setPutts(1)}>
                <Ionicons name="add" size={24} color="#333" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Fairway, Rough, Penalty, OB (확정 시 읽기 전용) */}
      <View style={styles.checkRow}>
        {isScoreConfirmed ? (
          <>
            <View style={styles.checkItem}>
              <View style={[styles.checkbox, draftHoleScore.fairway && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Fairway</Text>
            </View>
            <View style={styles.checkItem}>
              <View style={[styles.checkbox, draftHoleScore.rough && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Rough</Text>
            </View>
            <View style={styles.checkItem}>
              <View style={[styles.checkbox, draftHoleScore.penalty && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Penalty</Text>
            </View>
            <View style={styles.checkItem}>
              <View style={[styles.checkbox, (draftHoleScore.ob ?? 0) > 0 && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>OB</Text>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.checkItem} onPress={toggleFairway}>
              <View style={[styles.checkbox, draftHoleScore.fairway && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Fairway</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkItem} onPress={toggleRough}>
              <View style={[styles.checkbox, draftHoleScore.rough && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Rough</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkItem} onPress={togglePenalty}>
              <View style={[styles.checkbox, draftHoleScore.penalty && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Penalty</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkItem} onPress={toggleOb}>
              <View style={[styles.checkbox, (draftHoleScore.ob ?? 0) > 0 && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>OB</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Out / In / Total 합계 */}
      {user?.uid && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Out</Text>
            <Text style={styles.summaryValue}>{getOutTotal(user.uid) || '-'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>In</Text>
            <Text style={styles.summaryValue}>{getInTotal(user.uid) || '-'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{getTotal(user.uid) || '-'}</Text>
          </View>
        </View>
      )}

      {/* 홀 저장 + 스코어 확정 (한 줄, 확정 시 뱃지만 표시) */}
      {user?.uid && (
        <View style={styles.confirmSection}>
          {isScoreConfirmed ? (
            <View style={styles.confirmBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#0a0" />
              <Text style={styles.confirmBadgeText}>스코어 확정됨 (수정 불가)</Text>
            </View>
          ) : (
            <>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.saveHoleButton, savingHole && styles.saveHoleButtonDisabled]}
                  onPress={handleSaveCurrentHole}
                  disabled={savingHole}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveHoleButtonText}>
                    {savingHole ? '저장 중...' : `${currentHoleNo}홀 저장`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (confirming || !all18HolesSaved) && styles.confirmButtonDisabled,
                  ]}
                  onPress={handleConfirmScore}
                  disabled={confirming || !all18HolesSaved}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmButtonText}>
                    {confirming ? '확정 중...' : '스코어 확정'}
                  </Text>
                </TouchableOpacity>
              </View>
              {!all18HolesSaved && (
                <Text style={styles.confirmHint}>18홀 모두 저장한 후 확정할 수 있습니다.</Text>
              )}
            </>
          )}
        </View>
      )}

      {/* 스코어카드 테이블 */}
      <View style={styles.tableWrap}>
        <View style={styles.tableHeader}>
          <View style={[styles.tableCell, styles.tableCellName]}><Text style={styles.tableHeaderText} /></View>
          {holeNumbers.map((no) => (
            <View key={no} style={styles.tableCell}>
              <Text style={styles.tableHeaderText}>{no}</Text>
            </View>
          ))}
          <View style={styles.tableCell}>
            <Text style={styles.tableHeaderText}>{viewNine === 'front' ? 'Out' : 'In'}</Text>
          </View>
        </View>
        {participants.map((p) => {
          const outTotal = getOutTotal(p.uid);
          const inTotal = getInTotal(p.uid);
          const sumForView = viewNine === 'front' ? outTotal : inTotal;
          const parForView = viewNine === 'front' ? parOut : parIn;
          return (
            <View key={p.uid} style={styles.tableRow}>
              <View style={[styles.tableCell, styles.tableCellName]}>
                <Text style={styles.tableNameText} numberOfLines={1}>{displayName(p)}</Text>
              </View>
              {holeNumbers.map((no) => {
                const saved = scoresByUid[p.uid]?.[no];
                const strokes = saved?.strokes ?? 0;
                const par = getParForHoleNo(no);
                const isSaved = saved !== undefined;
                const cellColor = isSaved ? getScoreColor(strokes, par) : '#333333';
                return (
                  <View key={no} style={styles.tableCell}>
                    <Text style={[styles.tableCellText, { color: cellColor }]}>
                      {isSaved ? getScoreCellText(strokes, par) : '－'}
                    </Text>
                  </View>
                );
              })}
              <View style={styles.tableCell}>
                <Text
                  style={[
                    styles.tableCellText,
                    {
                      color:
                        sumForView > 0
                          ? getScoreColor(sumForView, parForView)
                          : '#333333',
                    },
                  ]}
                >
                  {sumForView > 0
                    ? sumForView === parForView
                      ? 'ㅇ'
                      : String(sumForView)
                    : '－'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  holeNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  holeNavSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  holeNavLabel: { fontSize: 14, color: '#666' },
  holeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0a0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holeCircleText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  holeInfoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#2196f3',
    paddingBottom: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  holeInfoCourseWrap: { flex: 1 },
  holeInfoCourse: { fontSize: 18, fontWeight: '600', color: '#1a5f2a' },
  holeInfoCourseDisabled: { color: '#888' },
  holeInfoCourseHint: { fontSize: 11, color: '#888', marginTop: 2 },
  holeInfoPar: { fontSize: 28, fontWeight: '800', color: '#c00', textAlign: 'center', marginHorizontal: 12 },
  holeInfoDistance: { fontSize: 18, fontWeight: '600', color: '#1565c0', textAlign: 'right', flex: 1 },
  scoreRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 20,
    marginBottom: 16,
  },
  scoreBlock: { flex: 1, alignItems: 'center' },
  scoreBlockLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 },
  scoreControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: { fontSize: 28, fontWeight: '700', color: '#111', minWidth: 36, textAlign: 'center' },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  checkItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#888',
    borderRadius: 4,
  },
  checkboxChecked: { backgroundColor: '#0a0', borderColor: '#0a0' },
  checkLabel: { fontSize: 14, color: '#333' },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#1b5e20' },
  summaryDivider: { width: 1, height: 24, backgroundColor: '#ddd' },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveHoleButton: {
    flex: 1,
    backgroundColor: '#1565c0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveHoleButtonDisabled: { opacity: 0.6 },
  saveHoleButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  confirmSection: { marginBottom: 16 },
  confirmButton: {
    flex: 1,
    backgroundColor: '#0a0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  confirmHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  confirmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    alignSelf: 'center',
  },
  confirmBadgeText: { fontSize: 14, fontWeight: '600', color: '#1b5e20' },
  tableWrap: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2e7d32',
    borderBottomWidth: 1,
    borderColor: '#1b5e20',
  },
  tableHeaderText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  tableCell: {
    width: 28,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellName: {
    width: 48,
    minWidth: 48,
    alignItems: 'flex-start',
    paddingLeft: 8,
  },
  tableNameText: { fontSize: 13, color: '#111' },
  tableCellText: { fontSize: 13, color: '#333' },
});
