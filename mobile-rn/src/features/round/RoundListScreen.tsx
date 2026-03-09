import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../core/auth/AuthContext';
import { fetchUserRounds } from '../../core/services/roundService';
import type { Round } from '../../core/types/round';
import type { RoundStackParamList } from '../../app/RoundStack';

type Nav = NativeStackNavigationProp<RoundStackParamList, 'RoundList'>;

type Props = {
  navigation: Nav;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '준비',
  IN_PROGRESS: '진행 중',
  FINISHED: '종료',
};

const BADGE_BG: Record<string, string> = {
  DRAFT: '#e0e0e0',
  IN_PROGRESS: '#c8e6c9',
  FINISHED: '#ffecb3',
};

function formatDate(d: Date | null): string {
  if (!d) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function RoundListScreen({ navigation }: Props): React.JSX.Element {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.uid) {
      setRounds([]);
      setLoading(false);
      return;
    }
    try {
      const list = await fetchUserRounds(user.uid);
      setRounds(list);
    } catch {
      setRounds([]);
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
        data={rounds}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          rounds.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>참여 중인 라운드가 없습니다.</Text>
            <Text style={styles.emptySub}>라운드 만들기 또는 참여하기를 눌러 시작하세요.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('RoundDetail', { roundId: item.id })}
          >
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.roundName || `${item.frontCourseName || item.courseName}${item.backCourseName ? ` · ${item.backCourseName}` : ''}`}
              </Text>
              {item.roundNumber ? (
                <Text style={styles.cardRoundNo}>#{item.roundNumber}</Text>
              ) : null}
              <View style={[styles.badge, { backgroundColor: BADGE_BG[item.status] ?? '#eee' }]}>
                <Text style={styles.badgeText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
              </View>
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
        )}
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
  listContent: { padding: 16, paddingBottom: 100 },
  listContentEmpty: { flexGrow: 1 },
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
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  cardGolfCourse: { fontSize: 14, color: '#1a5f2a', fontWeight: '600', flex: 1 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#333' },
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
