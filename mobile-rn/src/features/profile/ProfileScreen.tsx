import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../core/auth/AuthContext';
import {
  fetchUserConfirmedRoundStats,
  computeFIR,
  computeGIR,
  computePPR,
} from '../../core/services/roundService';
import type { ProfileStackParamList } from '../../app/ProfileStack';

type ProfileScreenNav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

type Props = {
  navigation: ProfileScreenNav;
};

export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  const { user, profile, signOut } = useAuth();
  const [roundStats, setRoundStats] = useState<{
    totals: number[];
    scores: Record<string, import('../../core/types/round').HoleScoreData>[];
  }>({ totals: [], scores: [] });
  const [totalsLoading, setTotalsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setRoundStats({ totals: [], scores: [] });
      setTotalsLoading(false);
      return;
    }
    let cancelled = false;
    setTotalsLoading(true);
    fetchUserConfirmedRoundStats(user.uid)
      .then(({ totals, scores }) => {
        if (!cancelled) setRoundStats({ totals, scores });
      })
      .finally(() => {
        if (!cancelled) setTotalsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const { totals, scores } = roundStats;
  const avgScore =
    totals.length > 0
      ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10
      : null;
  const minScore = totals.length > 0 ? Math.min(...totals) : null;
  const fir = computeFIR(scores);
  const gir = computeGIR(scores);
  const ppr = computePPR(scores);

  const displayName =
    profile?.nickname ?? profile?.displayName ?? profile?.email ?? user?.email ?? '사용자';

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleProfileEdit = () => {
    navigation.navigate('ProfileEdit');
  };

  const handleNotificationSettings = () => {
    navigation.navigate('NotificationSettings');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 프로필 요약 */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.avatarWrapper}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={36} color="#999" />
              </View>
            )}
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryName}>{displayName}</Text>
            {user?.email ? (
              <Text style={styles.summaryEmail} numberOfLines={1}>
                {user.email}
              </Text>
            ) : null}
            {profile?.handicap != null ? (
              <Text style={styles.summaryMeta}>핸디캡 {profile.handicap}</Text>
            ) : null}
            {profile?.address ? (
              <Text style={styles.summarySub} numberOfLines={2}>
                {profile.address}
              </Text>
            ) : null}
            {profile?.dateOfBirth ? (
              <Text style={styles.summarySub}>생년월일 {profile.dateOfBirth}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* 기록: 라운드수 · 베스트 · 평균 (1카드) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>기록</Text>
        <View style={styles.statsCard}>
          {totalsLoading ? (
            <View style={styles.statsLoadingWrap}>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={styles.statsLoadingText}>기록 불러오는 중...</Text>
            </View>
          ) : (
            <>
              <View style={styles.statsRowLabels}>
                <Text style={styles.statsLabel}>라운드수</Text>
                <Text style={styles.statsLabel}>베스트</Text>
                <Text style={styles.statsLabel}>평균</Text>
              </View>
              <View style={styles.statsRowValues}>
                <Text style={[styles.statsNum, styles.statsNumRound]}>
                  {totals.length}
                </Text>
                <Text style={[styles.statsNum, styles.statsNumBest]}>
                  {minScore != null ? `${minScore}` : '-'}
                </Text>
                <Text style={[styles.statsNum, styles.statsNumAvg]}>
                  {avgScore != null ? avgScore : '-'}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* 페어웨이 안착율 · 그린 적중율 · 평균퍼팅수 (1카드) */}
        <View style={[styles.statsCard, styles.statsCardMargin]}>
          {totalsLoading ? (
            <View style={styles.statsLoadingWrap}>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={styles.statsLoadingText}>기록 불러오는 중...</Text>
            </View>
          ) : (
            <>
              <View style={styles.statsRowLabels}>
                <Text style={styles.statsLabelCompact} numberOfLines={1}>페어웨이 안착율</Text>
                <Text style={styles.statsLabelCompact}>그린 적중율</Text>
                <Text style={styles.statsLabelCompact}>평균퍼팅수</Text>
              </View>
              <View style={styles.statsRowSubLabels}>
                <Text style={styles.statsSubLabel}>(FIR)</Text>
                <Text style={styles.statsSubLabel}>(GIR)</Text>
                <Text style={styles.statsSubLabel}>(PPR)</Text>
              </View>
              <View style={styles.statsRowValues}>
                <Text style={[styles.statsNum, styles.statsNumFIR]}>
                  {fir != null ? `${fir}%` : '-'}
                </Text>
                <Text style={[styles.statsNum, styles.statsNumGIR]}>
                  {gir != null ? `${gir}%` : '-'}
                </Text>
                <Text style={[styles.statsNum, styles.statsNumPPR]}>
                  {ppr != null ? ppr : '-'}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* 메뉴: 설정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>설정</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleProfileEdit}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>프로필 수정</Text>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuRow, styles.menuRowBorder]}
            onPress={handleNotificationSettings}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>알림 설정</Text>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 메뉴: 계정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>계정</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabelDanger}>로그아웃</Text>
            <Ionicons name="chevron-forward" size={20} color="#c00" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryText: { flex: 1 },
  summaryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  summaryEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  summaryMeta: {
    fontSize: 13,
    color: '#0a0',
    fontWeight: '500',
  },
  summarySub: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuRowBorder: {
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  statsCardMargin: {
    marginTop: 12,
  },
  statsRowLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  statsLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  statsLabelCompact: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  statsRowSubLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  statsSubLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  statsRowValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statsNum: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsNumRound: {
    color: '#2563eb',
  },
  statsNumBest: {
    color: '#059669',
  },
  statsNumAvg: {
    color: '#ea580c',
  },
  statsNumFIR: {
    color: '#0891b2',
  },
  statsNumGIR: {
    color: '#7c3aed',
  },
  statsNumPPR: {
    color: '#dc2626',
  },
  statsLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  statsLoadingText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
  menuLabel: {
    fontSize: 16,
    color: '#111',
  },
  menuLabelDanger: {
    fontSize: 16,
    color: '#c00',
    fontWeight: '500',
  },
});
