import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../core/auth/AuthContext';
import { fetchUserRounds, fetchRoundParticipants, fetchRoundScore } from '../../core/services/roundService';
import type { Round } from '../../core/types/round';
import type { RoundParticipant } from '../../core/types/round';
import type { HoleScoreData } from '../../core/types/round';
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

/** 홀 스코어가 하나라도 저장되었는지 (실제 입력된 타수: strokes > 0) */
function hasAnyHoleScore(holes: Record<string, HoleScoreData>): boolean {
  return Object.keys(holes).some((no) => {
    const h = holes[no];
    return h && typeof h.strokes === 'number' && h.strokes > 0;
  });
}

const YEAR_START = 2026;

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
  /** 라운드별 참가자 목록 (내 참가자 정보·진행중 판단용) */
  const [participantsByRoundId, setParticipantsByRoundId] = useState<Record<string, RoundParticipant[]>>({});
  /** 라운드별 uid별 스코어 (나 + 동반 참가자 포함, 진행중 판단용) */
  const [scoreByRoundId, setScoreByRoundId] = useState<Record<string, Record<string, Record<string, HoleScoreData>>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const yearOptions = useMemo(() => {
    const end = currentYear >= YEAR_START ? currentYear : YEAR_START;
    return Array.from({ length: end - YEAR_START + 1 }, (_, i) => end - i);
  }, [currentYear]);

  const roundsByYear = useMemo(
    () => rounds.filter((r) => getRoundYear(r) === selectedYear),
    [rounds, selectedYear]
  );

  const load = useCallback(async () => {
    if (!user?.uid) {
      setRounds([]);
      setParticipantsByRoundId({});
      setScoreByRoundId({});
      setLoading(false);
      return;
    }
    try {
      const list = await fetchUserRounds(user.uid);
      setRounds(list);
      const participantsById: Record<string, RoundParticipant[]> = {};
      const scoreById: Record<string, Record<string, Record<string, HoleScoreData>>> = {};
      await Promise.all(
        list.map(async (r) => {
          const participants = await fetchRoundParticipants(r.id);
          participantsById[r.id] = participants;
          const scoresForRound: Record<string, Record<string, HoleScoreData>> = {};
          await Promise.all(
            participants.map(async (p) => {
              const holes = await fetchRoundScore(r.id, p.uid);
              scoresForRound[p.uid] = holes ?? {};
            })
          );
          scoreById[r.id] = scoresForRound;
        })
      );
      setParticipantsByRoundId(participantsById);
      setScoreByRoundId(scoreById);
    } catch {
      setRounds([]);
      setParticipantsByRoundId({});
      setScoreByRoundId({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.uid) load();
    });
    return unsubscribe;
  }, [navigation, load, user?.uid]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleCreate = () => {
    navigation.navigate('RoundCreate');
  };

  const handleJoin = () => {
    navigation.navigate('RoundJoin');
  };

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
          <TouchableOpacity style={styles.yearRow} onPress={openYearModal} activeOpacity={0.7}>
            <Text style={styles.yearLabel}>{selectedYear}년</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
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
                ? '라운드 만들기 또는 참여하기를 눌러 시작하세요.'
                : '다른 연도를 선택해 보세요.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const participants = participantsByRoundId[item.id] ?? [];
          const myParticipant = participants.find((p) => p.uid === user?.uid) ?? null;
          const scoresForRound = scoreByRoundId[item.id] ?? {};
          const isConfirmed = !!myParticipant?.scoreConfirmedAt;
          const myTotal = myParticipant?.total != null && myParticipant.total > 0 ? myParticipant.total : null;
          const hasAnySaved = participants.length > 0 && Object.values(scoresForRound).some((holes) => hasAnyHoleScore(holes));
          const statusLabel = isConfirmed ? null : hasAnySaved ? '진행중' : '준비';
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('RoundDetail', { roundId: item.id })}
            >
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.roundName || `${item.frontCourseName || item.courseName}${item.backCourseName ? ` · ${item.backCourseName}` : ''}`}
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
      <View style={styles.fabRow}>
        <TouchableOpacity
          style={[styles.fab, styles.fabJoin]}
          onPress={handleJoin}
          activeOpacity={0.9}
        >
          <Ionicons name="person-add" size={22} color="#fff" />
          <Text style={styles.fabLabel}>참여하기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreate}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#fff" />
          <Text style={styles.fabLabel}>라운드 만들기</Text>
        </TouchableOpacity>
      </View>

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
  listContent: { padding: 16, paddingBottom: 100 },
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
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalYearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalYearRowSelected: {
    backgroundColor: '#e8f5e9',
  },
  modalYearText: {
    fontSize: 16,
    color: '#333',
  },
  modalYearTextSelected: {
    fontWeight: '700',
    color: '#0a0',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: { fontSize: 16, color: '#666', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#999', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111', flex: 1 },
  cardRoundNo: { fontSize: 13, color: '#0a0', fontWeight: '600' },
  cardTotalScore: { fontSize: 15, color: '#0a0', fontWeight: '700' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#333' },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  cardGolfCourse: { fontSize: 14, color: '#1a5f2a', fontWeight: '600', flex: 1 },
  cardDate: { fontSize: 13, color: '#666' },
  fabRow: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  fab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  fabJoin: {
    backgroundColor: '#1565c0',
  },
  fabLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
