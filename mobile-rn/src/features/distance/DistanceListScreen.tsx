import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../core/auth/AuthContext';
import { GOLF_CLUBS, type GolfClubId } from '../../core/constants/golfClubs';
import {
  deleteDistanceRecord,
  fetchDistanceRecords,
} from '../../core/services/distanceRecordService';
import type { DistanceRecord } from '../../core/types/distanceRecord';
import {
  computeClubDistanceStats,
  formatAvgDistanceMeters,
  formatDistanceMeters,
} from '../../core/utils/geo';
import type { DistanceStackParamList } from '../../app/DistanceStack';

type Nav = NativeStackNavigationProp<DistanceStackParamList, 'DistanceList'>;

type Props = {
  navigation: Nav;
};

const GUIDE_MESSAGE =
  '샷 시작점과 볼 위치의 GPS로 거리를 측정합니다. 스마트폰 GPS 오차(±수 m)는 참고용으로 활용해 주세요.';

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

export function DistanceListScreen({ navigation }: Props): React.JSX.Element {
  const { user } = useAuth();
  const [records, setRecords] = useState<DistanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState<GolfClubId>('7i');
  const [queriedClubId, setQueriedClubId] = useState<GolfClubId | null>(null);
  const [clubPickerOpen, setClubPickerOpen] = useState(false);

  const selectedClub = GOLF_CLUBS.find((c) => c.id === selectedClubId) ?? GOLF_CLUBS[0];

  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showGuideToast = useCallback(() => {
    toastOpacity.stopAnimation();
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [toastOpacity]);

  const load = useCallback(async () => {
    if (!user?.uid) {
      setRecords([]);
      setLoading(false);
      return;
    }
    try {
      const list = await fetchDistanceRecords(user.uid);
      setRecords(list);
    } catch {
      setRecords([]);
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
      showGuideToast();
    });
    return unsubscribe;
  }, [navigation, load, user?.uid, showGuideToast]);

  useEffect(() => {
    showGuideToast();
  }, [showGuideToast]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const clubStats = useMemo(() => {
    if (!queriedClubId) return null;
    const distances = records
      .filter((r) => r.clubId === queriedClubId)
      .map((r) => r.distanceMeters);
    return computeClubDistanceStats(distances);
  }, [records, queriedClubId]);

  const displayedRecords = useMemo(() => {
    if (!queriedClubId) return records;
    return records.filter((r) => r.clubId === queriedClubId);
  }, [records, queriedClubId]);

  const queriedClubLabel = queriedClubId
    ? (GOLF_CLUBS.find((c) => c.id === queriedClubId)?.label ?? queriedClubId)
    : null;

  const handleQuery = () => {
    setQueriedClubId(selectedClubId);
  };

  const handleResetQuery = () => {
    setQueriedClubId(null);
  };

  const handleCreate = () => {
    navigation.navigate('DistanceRecord');
  };

  const handleDelete = (record: DistanceRecord) => {
    if (!user?.uid) return;
    Alert.alert('기록 삭제', `${record.clubLabel} ${formatDistanceMeters(record.distanceMeters)} 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDistanceRecord(user.uid, record.id);
            setRecords((prev) => prev.filter((r) => r.id !== record.id));
          } catch {
            Alert.alert('오류', '삭제에 실패했습니다.');
          }
        },
      },
    ]);
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
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={displayedRecords}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          displayedRecords.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            <View style={styles.queryBox}>
              <Text style={styles.queryLabel}>클럽 선택</Text>
              <View style={styles.queryRow}>
                <TouchableOpacity
                  style={styles.comboTrigger}
                  onPress={() => setClubPickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.comboTriggerText}>{selectedClub.label}</Text>
                  <Ionicons name="chevron-down" size={18} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.queryBtn} onPress={handleQuery} activeOpacity={0.85}>
                  <Ionicons name="search" size={18} color="#fff" />
                  <Text style={styles.queryBtnText}>조회</Text>
                </TouchableOpacity>
              </View>
              {queriedClubId ? (
                <TouchableOpacity style={styles.resetQueryBtn} onPress={handleResetQuery}>
                  <Text style={styles.resetQueryText}>전체 기록 보기</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {clubStats && queriedClubLabel ? (
              <View style={styles.statsBox}>
                <Text style={styles.statsTitle}>{queriedClubLabel} 통계</Text>
                {clubStats.count > 0 ? (
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Max</Text>
                      <Text style={[styles.statValue, styles.statValueMax]}>
                        {formatDistanceMeters(clubStats.maxMeters!)}
                      </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Min</Text>
                      <Text style={[styles.statValue, styles.statValueMin]}>
                        {formatDistanceMeters(clubStats.minMeters!)}
                      </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Avg</Text>
                      <Text style={[styles.statValue, styles.statValueAvg]}>
                        {formatAvgDistanceMeters(clubStats.avgMeters!)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.statsEmpty}>선택한 클럽의 기록이 없습니다.</Text>
                )}
                {clubStats.count > 0 ? (
                  <Text style={styles.statsCount}>총 {clubStats.count}회 측정</Text>
                ) : null}
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="locate-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {queriedClubId ? '해당 클럽의 기록이 없습니다.' : '저장된 거리 기록이 없습니다.'}
            </Text>
            <Text style={styles.emptySub}>새 기록을 눌러 측정을 시작하세요.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onLongPress={() => handleDelete(item)}
          >
            <View style={styles.cardRow}>
              <View style={styles.clubBadge}>
                <Text style={styles.clubBadgeText}>{item.clubLabel}</Text>
              </View>
              <Text style={styles.distanceText}>{formatDistanceMeters(item.distanceMeters)}</Text>
            </View>
            <Text style={styles.cardDate}>{formatDate(item.recordedAt)}</Text>
            {item.golfCourseName ? (
              <View style={styles.courseRow}>
                <Ionicons name="flag-outline" size={14} color="#059669" />
                <Text style={styles.courseText} numberOfLines={1}>
                  {item.golfCourseName}
                </Text>
              </View>
            ) : null}
            <Text style={styles.cardHint}>길게 눌러 삭제</Text>
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={clubPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setClubPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setClubPickerOpen(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>클럽 선택</Text>
            <FlatList
              data={GOLF_CLUBS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    setSelectedClubId(item.id);
                    setClubPickerOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalRowTitle}>{item.label}</Text>
                  {selectedClubId === item.id ? (
                    <Ionicons name="checkmark-circle" size={22} color="#059669" />
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Animated.View
        pointerEvents="none"
        style={[styles.toast, { opacity: toastOpacity }]}
      >
        <Ionicons name="information-circle" size={18} color="#a7f3d0" />
        <Text style={styles.toastText}>{GUIDE_MESSAGE}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.fab} onPress={handleCreate} activeOpacity={0.9}>
        <Ionicons name="add" size={28} color="#fff" />
        <Text style={styles.fabLabel}>새 기록</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  subtitle: { fontSize: 16, color: '#666' },
  listContent: { padding: 16, paddingBottom: 100 },
  listContentEmpty: { flexGrow: 1 },
  toast: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(17,24,39,0.95)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  toastText: { flex: 1, color: '#fff', fontSize: 13, lineHeight: 19 },
  queryBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  queryLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  queryRow: { flexDirection: 'row', gap: 8 },
  comboTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
  },
  comboTriggerText: { fontSize: 15, fontWeight: '600', color: '#111' },
  queryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  queryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resetQueryBtn: { marginTop: 10, alignSelf: 'flex-start' },
  resetQueryText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  statsBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#059669',
  },
  statsTitle: { color: '#065f46', fontSize: 15, marginBottom: 14, fontWeight: '800' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { color: '#374151', fontSize: 13, marginBottom: 6, fontWeight: '700' },
  statValue: { fontSize: 24, fontWeight: '900' },
  statValueMax: { color: '#dc2626' },
  statValueMin: { color: '#2563eb' },
  statValueAvg: { color: '#047857' },
  statDivider: { width: 1, height: 40, backgroundColor: '#d1d5db' },
  statsEmpty: { color: '#4b5563', fontSize: 14 },
  statsCount: { marginTop: 12, color: '#4b5563', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#666', fontWeight: '600' },
  emptySub: { marginTop: 6, fontSize: 14, color: '#999', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clubBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  clubBadgeText: { fontSize: 14, fontWeight: '700', color: '#047857' },
  distanceText: { fontSize: 24, fontWeight: '800', color: '#111' },
  cardDate: { marginTop: 8, fontSize: 13, color: '#888' },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  courseText: { flex: 1, fontSize: 13, color: '#047857', fontWeight: '600' },
  cardHint: { marginTop: 4, fontSize: 11, color: '#bbb' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginTop: 10,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  modalRowTitle: { fontSize: 16, color: '#111' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabLabel: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 6 },
});
