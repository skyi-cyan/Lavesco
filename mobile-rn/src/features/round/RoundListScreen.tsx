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
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../core/auth/AuthContext';
import {
  fetchUserRounds,
  fetchRoundListItemMeta,
  cancelRound,
} from '../../core/services/roundService';
import type { Round } from '../../core/types/round';
import type { RoundParticipant } from '../../core/types/round';
import type { RoundStackParamList } from '../../app/RoundStack';

type Nav = NativeStackNavigationProp<RoundStackParamList, 'RoundList'>;

type Props = {
  navigation: Nav;
};

type RoundBadge = 'ready' | 'inProgress';

const BADGE_BG: Record<RoundBadge, string> = {
  ready: '#e0e0e0',
  inProgress: '#c8e6c9',
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
  const { t } = useTranslation();
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
  /** 라운드별 확정한 참가자 존재 여부 (취소 가능 판단) */
  const [anyConfirmedByRoundId, setAnyConfirmedByRoundId] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  /** 한 번이라도 상태(타수·확정 여부)를 불러온 연도 — 그 전에는 카드 대신 스피너 표시 */
  const [metaReadyYears, setMetaReadyYears] = useState<number[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
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
          fetchRoundListItemMeta(r, user.uid)
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
        setAnyConfirmedByRoundId((prev) => {
          const next = { ...prev };
          yearRounds.forEach((r, i) => {
            next[r.id] = metas[i].anyConfirmed;
          });
          return next;
        });
        metaLoadedYearsRef.current.add(year);
      } finally {
        if (seq === metaSeqRef.current) {
          setMetaLoading(false);
          setMetaReadyYears((prev) => (prev.includes(year) ? prev : [...prev, year]));
        }
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
        setMetaReadyYears([]);
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

        // 새로고침 시 기존 상태는 유지한 채 다시 불러와, 카드가 "준비" 상태로 깜빡이지 않게 함
        if (opts?.force) {
          metaLoadedYearsRef.current.clear();
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

  const handleCancelRound = useCallback(
    (item: Round) => {
      if (!user?.uid || item.createdBy !== user.uid) {
        Alert.alert(t('roundList.cannotCancel'), t('roundList.hostOnly'));
        return;
      }
      if (anyConfirmedByRoundId[item.id] || item.status === 'FINISHED') {
        Alert.alert(t('roundList.cannotCancel'), t('roundList.confirmedCannotCancel'));
        return;
      }

      const title =
        item.roundName ||
        `${item.frontCourseName || item.courseName}${
          item.backCourseName ? ` · ${item.backCourseName}` : ''
        }`;

      Alert.alert(
        t('roundList.cancelTitle'),
        t('roundList.cancelConfirm', { title }),
        [
          { text: t('common.close'), style: 'cancel' },
          {
            text: t('roundList.cancelAction'),
            style: 'destructive',
            onPress: async () => {
              setCancellingId(item.id);
              try {
                await cancelRound(item.id);
                await load({ force: true });
                Alert.alert(t('common.done'), t('roundList.cancelled'));
              } catch (e) {
                Alert.alert(
                  t('roundList.cancelFailed'),
                  (e as Error)?.message ?? t('roundList.cancelFailedMessage')
                );
              } finally {
                setCancellingId(null);
              }
            },
          },
        ]
      );
    },
    [user?.uid, anyConfirmedByRoundId, load, t]
  );

  const openYearModal = () => setYearModalVisible(true);
  const closeYearModal = () => setYearModalVisible(false);
  const selectYear = (year: number) => {
    setSelectedYear(year);
    closeYearModal();
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.subtitle}>{t('common.loginRequired')}</Text>
      </View>
    );
  }

  const waitingFirstMeta = roundsByYear.length > 0 && !metaReadyYears.includes(selectedYear);

  if (loading || waitingFirstMeta) {
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
              <Text style={styles.yearLabel}>{t('common.year', { year: selectedYear })}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {metaLoading ? (
              <View style={styles.metaLoadingRow}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.metaLoadingText}>{t('roundList.loadingStatus')}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {rounds.length === 0
                ? t('roundList.empty')
                : t('roundList.emptyYear', { year: selectedYear })}
            </Text>
            <Text style={styles.emptySub}>
              {rounds.length === 0
                ? t('roundList.emptyHint')
                : t('roundList.emptyYearHint')}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const myParticipant = myParticipantByRoundId[item.id] ?? null;
          const isConfirmed = !!myParticipant?.scoreConfirmedAt;
          const isHost = !!user?.uid && item.createdBy === user.uid;
          const canCancel =
            isHost &&
            !isConfirmed &&
            !anyConfirmedByRoundId[item.id] &&
            item.status !== 'FINISHED';
          const myTotal =
            myParticipant?.total != null && myParticipant.total > 0
              ? myParticipant.total
              : null;
          const hasAnySaved = !!hasSavedScoreByRoundId[item.id];
          const statusBadge: RoundBadge | null = isConfirmed
            ? null
            : hasAnySaved
              ? 'inProgress'
              : 'ready';
          const isCancelling = cancellingId === item.id;
          return (
            <TouchableOpacity
              style={[styles.card, isCancelling && styles.cardCancelling]}
              activeOpacity={0.7}
              disabled={isCancelling}
              onPress={() => navigation.navigate('RoundDetail', { roundId: item.id })}
              onLongPress={canCancel ? () => handleCancelRound(item) : undefined}
              delayLongPress={450}
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
                  <Text style={styles.cardTotalScore}>{myTotal}</Text>
                ) : statusBadge ? (
                  <View style={[styles.badge, { backgroundColor: BADGE_BG[statusBadge] }]}>
                    <Text style={styles.badgeText}>{t(`roundList.badge.${statusBadge}`)}</Text>
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
              {canCancel ? (
                <Text style={styles.cancelHint}>{t('roundList.longPressCancel')}</Text>
              ) : null}
              {isCancelling ? (
                <View style={styles.cancellingRow}>
                  <ActivityIndicator size="small" color="#c62828" />
                  <Text style={styles.cancellingText}>{t('roundList.cancelling')}</Text>
                </View>
              ) : null}
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
            <Text style={styles.modalTitle}>{t('roundList.selectYear')}</Text>
            {yearOptions.map((year) => (
              <TouchableOpacity
                key={year}
                style={[styles.modalYearRow, year === selectedYear && styles.modalYearRowSelected]}
                onPress={() => selectYear(year)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalYearText, year === selectedYear && styles.modalYearTextSelected]}>
                  {t('common.year', { year })}
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
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  cardCancelling: { opacity: 0.6 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111' },
  cardRoundNo: { fontSize: 12, fontWeight: '600', color: '#666' },
  cardTotalScore: { fontSize: 20, fontWeight: '800', color: '#f97316' },
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
    marginTop: 4,
    gap: 8,
  },
  cardGolfCourse: { flex: 1, fontSize: 13, fontWeight: '600', color: '#047857' },
  cardDate: { fontSize: 12, color: '#999' },
  cancelHint: {
    marginTop: 6,
    fontSize: 11,
    color: '#94a3b8',
  },
  cancellingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  cancellingText: { fontSize: 12, color: '#c62828' },
});
