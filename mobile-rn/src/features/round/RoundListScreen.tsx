import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../core/auth/AuthContext';
import {
  fetchUserRounds,
  fetchRoundListItemMeta,
} from '../../core/services/roundService';
import type { Round } from '../../core/types/round';
import type { RoundParticipant } from '../../core/types/round';
import type { RoundStackParamList } from '../../app/RoundStack';

type Nav = NativeStackNavigationProp<RoundStackParamList, 'RoundList'>;

type Props = {
  navigation: Nav;
};

const BADGE_BG: Record<string, string> = {
  준비: '#e0e0e0',
  진행중: '#c8e6c9',
};

function formatDate(d: Date | null): string {
  if (!d) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const YEAR_START = 2026;
const META_CONCURRENCY = 10;
/** 탭 재진입 시 이 시간 안이면 전체 재조회 생략 */
const FOCUS_RELOAD_MS = 60_000;

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function runWorker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await worker(items[current]);
    }
  }
  const n = Math.min(concurrency, Math.max(items.length, 1));
  await Promise.all(new Array(n).fill(0).map(() => runWorker()));
  return results;
}

function getRoundYear(r: Round): number {
  const d = r.scheduledAt ?? r.createdAt;
  return d ? d.getFullYear() : new Date().getFullYear();
}

export function RoundListScreen({ navigation }: Props): React.JSX.Element {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const defaultYear = currentYear >= YEAR_START ? currentYear : YEAR_START;
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [yearModalVisible, setYearModalVisible] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  /** 라운드별 내 참가자 정보 */
  const [myParticipantByRoundId, setMyParticipantByRoundId] = useState<
    Record<string, RoundParticipant | null>
  >({});
  /** 라운드별 본인 스코어 저장 여부 (진행중 뱃지) */
  const [hasSavedScoreByRoundId, setHasSavedScoreByRoundId] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const loadSeqRef = useRef(0);
  const metaSeqRef = useRef(0);
  const hasRoundsRef = useRef(false);
  const lastLoadAtRef = useRef(0);
  const metaLoadedYearsRef = useRef<Set<number>>(new Set());
  const selectedYearRef = useRef(selectedYear);
  selectedYearRef.current = selectedYear;

  const yearOptions = useMemo(() => {
    const end = currentYear >= YEAR_START ? currentYear : YEAR_START;
    return Array.from({ length: end - YEAR_START + 1 }, (_, i) => end - i);
  }, [currentYear]);

  const roundsByYear = useMemo(
    () => rounds.filter((r) => getRoundYear(r) === selectedYear),
    [rounds, selectedYear]
  );

  const loadMetaForYear = useCallback(
    async (list: Round[], year: number) => {
      if (!user?.uid) return;
      const yearRounds = list.filter((r) => getRoundYear(r) === year);
      const seq = ++metaSeqRef.current;
      if (yearRounds.length === 0) {
        if (seq === metaSeqRef.current) setMetaLoading(false);
        return;
      }
      setMetaLoading(true);
      try {
        const metas = await mapWithConcurrency(yearRounds, META_CONCURRENCY, (r) =>
          fetchRoundListItemMeta(r.id, user.uid, r.status)
        );
        if (seq !== metaSeqRef.current) return;
        setMyParticipantByRoundId((prev) => {
          const next = { ...prev };
          yearRounds.forEach((r, i) => {
            next[r.id] = metas[i].participant;
          });
          return next;
        });
        setHasSavedScoreByRoundId((prev) => {
          const next = { ...prev };
          yearRounds.forEach((r, i) => {
            next[r.id] = metas[i].hasSavedScore;
          });
          return next;
        });
        metaLoadedYearsRef.current.add(year);
      } finally {
        if (seq === metaSeqRef.current) setMetaLoading(false);
      }
    },
    [user?.uid]
  );

  const load = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!user?.uid) {
        hasRoundsRef.current = false;
        setRounds([]);
        setMyParticipantByRoundId({});
        setHasSavedScoreByRoundId({});
        setLoading(false);
        setMetaLoading(false);
        setRefreshing(false);
        return;
      }

      const seq = ++loadSeqRef.current;
      const showFullSpinner = !hasRoundsRef.current;
      if (showFullSpinner) setLoading(true);

      try {
        const list = await fetchUserRounds(user.uid, { force: !!opts?.force });
        if (seq !== loadSeqRef.current) return;
        hasRoundsRef.current = list.length > 0;
        lastLoadAtRef.current = Date.now();
        setRounds(list);
        setLoading(false);

        if (opts?.force) {
          metaLoadedYearsRef.current.clear();
          setMyParticipantByRoundId({});
          setHasSavedScoreByRoundId({});
        }

        if (list.length === 0) {
          setMyParticipantByRoundId({});
          setHasSavedScoreByRoundId({});
          return;
        }

        await loadMetaForYear(list, selectedYearRef.current);
      } catch {
        if (seq !== loadSeqRef.current) return;
        hasRoundsRef.current = false;
        setRounds([]);
        setMyParticipantByRoundId({});
        setHasSavedScoreByRoundId({});
      } finally {
        if (seq === loadSeqRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [user?.uid, loadMetaForYear]
  );

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (hasRoundsRef.current && now - lastLoadAtRef.current < FOCUS_RELOAD_MS) {
        return;
      }
      load();
    }, [load])
  );

  useEffect(() => {
    if (!user?.uid || rounds.length === 0) return;
    if (metaLoadedYearsRef.current.has(selectedYear)) return;
    loadMetaForYear(rounds, selectedYear);
  }, [selectedYear, rounds, user?.uid, loadMetaForYear]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load({ force: true });
  }, [load]);

  const openYearModal = () => setYearModalVisible(true);
  const closeYearModal = () => setYearModalVisible(false);
  const selectYear = (year: number) => {
    setSelectedYear(year);
    closeYearModal();
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.subtitle}>로그인이 필요합니다.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={roundsByYear}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          roundsByYear.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            <TouchableOpacity style={styles.yearRow} onPress={openYearModal} activeOpacity={0.7}>
              <Text style={styles.yearLabel}>{selectedYear}년</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {metaLoading ? (
              <View style={styles.metaLoadingRow}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.metaLoadingText}>상태 불러오는 중…</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {rounds.length === 0
                ? '참여 중인 라운드가 없습니다.'
                : `${selectedYear}년 라운드가 없습니다.`}
            </Text>
            <Text style={styles.emptySub}>
              {rounds.length === 0
                ? '홈에서 라운드 만들기 또는 참여하기로 시작하세요.'
                : '다른 연도를 선택해 보세요.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const myParticipant = myParticipantByRoundId[item.id] ?? null;
          const isConfirmed = !!myParticipant?.scoreConfirmedAt;
          const myTotal =
            myParticipant?.total != null && myParticipant.total > 0
              ? myParticipant.total
              : null;
          const hasAnySaved = !!hasSavedScoreByRoundId[item.id];
          const statusLabel = isConfirmed ? null : hasAnySaved ? '진행중' : '준비';
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('RoundDetail', { roundId: item.id })}
            >
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.roundName ||
                    `${item.frontCourseName || item.courseName}${
                      item.backCourseName ? ` · ${item.backCourseName}` : ''
                    }`}
                </Text>
                {!isConfirmed && item.roundNumber ? (
                  <Text style={styles.cardRoundNo}>#{item.roundNumber}</Text>
                ) : null}
                {isConfirmed && myTotal != null ? (
                  <Text style={styles.cardTotalScore}>{myTotal}타</Text>
                ) : statusLabel ? (
                  <View style={[styles.badge, { backgroundColor: BADGE_BG[statusLabel] ?? '#eee' }]}>
                    <Text style={styles.badgeText}>{statusLabel}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.cardMetaRow}>
                {item.golfCourseName ? (
                  <Text style={styles.cardGolfCourse} numberOfLines={1}>
                    {item.golfCourseName}
                  </Text>
                ) : null}
                <Text style={styles.cardDate}>
                  {formatDate(item.scheduledAt ?? item.createdAt)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        visible={yearModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeYearModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeYearModal}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>연도 선택</Text>
            {yearOptions.map((year) => (
              <TouchableOpacity
                key={year}
                style={[styles.modalYearRow, year === selectedYear && styles.modalYearRowSelected]}
                onPress={() => selectYear(year)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalYearText, year === selectedYear && styles.modalYearTextSelected]}>
                  {year}년
                </Text>
                {year === selectedYear ? (
                  <Ionicons name="checkmark" size={20} color="#0a0" />
                ) : null}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  subtitle: { fontSize: 14, color: '#666' },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  yearLabel: { fontSize: 17, fontWeight: '700', color: '#111' },
  metaLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  metaLoadingText: { fontSize: 12, color: '#64748b' },
  listContent: { padding: 16, paddingBottom: 24 },
  listContentEmpty: { flexGrow: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalYearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalYearRowSelected: { backgroundColor: '#f0fdf4' },
  modalYearText: { fontSize: 16, color: '#333' },
  modalYearTextSelected: { fontWeight: '700', color: '#0a0' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: { marginTop: 12, fontSize: 16, fontWeight: '600', color: '#666' },
  emptySub: { marginTop: 6, fontSize: 13, color: '#999', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111' },
  cardRoundNo: { fontSize: 13, fontWeight: '600', color: '#666' },
  cardTotalScore: { fontSize: 15, fontWeight: '800', color: '#059669' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#333' },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  cardGolfCourse: { flex: 1, fontSize: 13, color: '#666' },
  cardDate: { fontSize: 12, color: '#999' },
});
