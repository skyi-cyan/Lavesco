import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../core/auth/AuthContext';
import { fetchRound } from '../../core/services/roundService';
import { fetchRoundParticipants } from '../../core/services/roundService';
import { fetchRoundScore, saveRoundScore } from '../../core/services/roundService';
import { fetchHolesUnderCourse } from '../../core/services/courseService';
import type { Round } from '../../core/types/round';
import type { RoundParticipant } from '../../core/types/round';
import type { HoleScoreData } from '../../core/types/round';
import type { GolfCourseHoleInput } from '../../core/types/course';
import type { RoundStackParamList } from '../../app/RoundStack';

const HOLE_NUMBERS_FRONT = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const HOLE_NUMBERS_BACK = ['10', '11', '12', '13', '14', '15', '16', '17', '18'];
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

  const myScore: HoleScoreData = user?.uid && scoresByUid[user.uid]
    ? scoresByUid[user.uid][currentHoleNo] ?? { strokes: 0, putts: 0 }
    : { strokes: 0, putts: 0 };

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

  const updateMyHole = useCallback(
    (updater: (prev: HoleScoreData) => HoleScoreData) => {
      if (!user?.uid) return;
      const prev = scoresByUid[user.uid] ?? {};
      const next = { ...prev, [currentHoleNo]: updater(prev[currentHoleNo] ?? { strokes: 0, putts: 0 }) };
      setScoresByUid((s) => ({ ...s, [user.uid]: next }));
    },
    [user?.uid, currentHoleNo, scoresByUid]
  );

  const saveMyScore = useCallback(async () => {
    if (!user?.uid || !roundId) return;
    const holes = scoresByUid[user.uid] ?? {};
    try {
      await saveRoundScore(roundId, user.uid, holes);
    } catch {
      // 저장 실패 시 무음 처리 (필요 시 토스트 등 추가 가능)
    }
  }, [roundId, user?.uid, scoresByUid]);

  useEffect(() => {
    if (!user?.uid) return;
    const t = setTimeout(saveMyScore, 1000);
    return () => clearTimeout(t);
  }, [scoresByUid, user?.uid, saveMyScore]);

  const setStrokes = (delta: number) => {
    updateMyHole((h) => ({
      ...h,
      strokes: (h.strokes ?? 0) + delta,
    }));
  };

  const setPutts = (delta: number) => {
    updateMyHole((h) => ({
      ...h,
      putts: Math.max(0, (h.putts ?? 0) + delta),
    }));
  };

  const toggleFairway = () => {
    updateMyHole((h) => ({ ...h, fairway: h.fairway ? false : true }));
  };
  const toggleRough = () => {
    updateMyHole((h) => ({ ...h, rough: h.rough ? false : true }));
  };
  const togglePenalty = () => {
    updateMyHole((h) => ({ ...h, penalty: h.penalty ? false : true }));
  };
  const toggleOb = () => {
    updateMyHole((h) => ({
      ...h,
      ob: h.ob ? 0 : 1,
    }));
  };

  const getOutTotal = (uid: string): number => {
    const holes = scoresByUid[uid] ?? {};
    return HOLE_NUMBERS_FRONT.reduce((sum, no) => sum + (holes[no]?.strokes ?? 0), 0);
  };

  const getInTotal = (uid: string): number => {
    const holes = scoresByUid[uid] ?? {};
    return HOLE_NUMBERS_BACK.reduce((sum, no) => sum + (holes[no]?.strokes ?? 0), 0);
  };

  const getTotal = (uid: string): number => getOutTotal(uid) + getInTotal(uid);

  const toggleViewNine = () => {
    if (hasBackCourse) setViewNine((v) => (v === 'front' ? 'back' : 'front'));
  };

  const displayName = (p: RoundParticipant) =>
    p.nickname || p.uid.slice(0, 6) || '-';

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

      {/* SCORE / PUTT */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreBlockLabel}>SCORE</Text>
          <View style={styles.scoreControl}>
            <TouchableOpacity style={styles.scoreBtn} onPress={() => setStrokes(-1)}>
              <Ionicons name="remove" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.scoreValue}>{myScore.strokes}</Text>
            <TouchableOpacity style={styles.scoreBtn} onPress={() => setStrokes(1)}>
              <Ionicons name="add" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreBlockLabel}>PUTT</Text>
          <View style={styles.scoreControl}>
            <TouchableOpacity style={styles.scoreBtn} onPress={() => setPutts(-1)}>
              <Ionicons name="remove" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.scoreValue}>{myScore.putts}</Text>
            <TouchableOpacity style={styles.scoreBtn} onPress={() => setPutts(1)}>
              <Ionicons name="add" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Fairway, Rough, Penalty, OB */}
      <View style={styles.checkRow}>
        <TouchableOpacity style={styles.checkItem} onPress={toggleFairway}>
          <View style={[styles.checkbox, myScore.fairway && styles.checkboxChecked]} />
          <Text style={styles.checkLabel}>Fairway</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkItem} onPress={toggleRough}>
          <View style={[styles.checkbox, myScore.rough && styles.checkboxChecked]} />
          <Text style={styles.checkLabel}>Rough</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkItem} onPress={togglePenalty}>
          <View style={[styles.checkbox, myScore.penalty && styles.checkboxChecked]} />
          <Text style={styles.checkLabel}>Penalty</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkItem} onPress={toggleOb}>
          <View style={[styles.checkbox, (myScore.ob ?? 0) > 0 && styles.checkboxChecked]} />
          <Text style={styles.checkLabel}>OB</Text>
        </TouchableOpacity>
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
        {participants.map((p) => (
          <View key={p.uid} style={styles.tableRow}>
            <View style={[styles.tableCell, styles.tableCellName]}>
              <Text style={styles.tableNameText} numberOfLines={1}>{displayName(p)}</Text>
            </View>
            {holeNumbers.map((no) => (
              <View key={no} style={styles.tableCell}>
                <Text style={styles.tableCellText}>
                  {(scoresByUid[p.uid]?.[no]?.strokes ?? 0) || ''}
                </Text>
              </View>
            ))}
            <View style={styles.tableCell}>
              <Text style={styles.tableCellText}>
                {(viewNine === 'front' ? getOutTotal(p.uid) : getInTotal(p.uid)) || ''}
              </Text>
            </View>
          </View>
        ))}
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
