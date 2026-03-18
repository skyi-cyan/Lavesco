import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../core/auth/AuthContext';
import {
  fetchUserConfirmedRoundStats,
  computeFIR,
  computeGIR,
  computePPR,
} from '../../core/services/roundService';
import type { MainTabParamList } from '../../app/MainTabs';
import type { RoundStackParamList } from '../../app/RoundStack';

const HERO_IMAGE = require('../../assets/images/hero.png');

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RoundStackParamList>
>;

export function HomeScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HomeNav>();
  const { profile, user } = useAuth();
  const displayName =
    profile?.nickname ?? profile?.displayName ?? user?.email ?? '사용자';

  const [roundStats, setRoundStats] = useState<{
    totals: number[];
    scores: Record<string, import('../../core/types/round').HoleScoreData>[];
    fir: number | null;
  }>({ totals: [], scores: [], fir: null });
  const [totalsLoading, setTotalsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!user?.uid) {
      setRoundStats({ totals: [], scores: [] });
      setTotalsLoading(false);
      return;
    }
    setTotalsLoading(true);
    try {
      const { totals, scores, fir } = await fetchUserConfirmedRoundStats(user.uid);
      setRoundStats({ totals, scores, fir });
    } finally {
      setTotalsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
      return () => {};
    }, [loadStats])
  );

  const { totals, scores, fir } = roundStats;
  const avgScore =
    totals.length > 0
      ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10
      : null;
  const minScore = totals.length > 0 ? Math.min(...totals) : null;
  const gir = computeGIR(scores);
  const ppr = computePPR(scores);

  const goCreate = () => navigation.navigate('Round', { screen: 'RoundCreate' });
  const goJoin = () => navigation.navigate('Round', { screen: 'RoundJoin' });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <ImageBackground
            source={HERO_IMAGE}
            style={styles.heroImage}
            resizeMode="cover"
          >
            <View style={styles.heroOverlay}>
              <Text style={styles.heroSub}>{displayName}님의 기록</Text>
            </View>
          </ImageBackground>
        </View>
        {/* 기록 카드: 라운드수 · 베스트 · 평균 / FIR · GIR · PPR */}
        <View style={styles.section}>
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
          {/* 페어웨이 안착율 · 그린 적중율 · 평균퍼팅수 */}
          <View style={[styles.statsCard, styles.statsCardMargin]}>
            {totalsLoading ? (
              <View style={styles.statsLoadingWrap}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.statsLoadingText}>기록 불러오는 중...</Text>
              </View>
            ) : (
              <>
                <View style={styles.statsRowLabels}>
                  <Text style={styles.statsLabelCompact} numberOfLines={1}>FW 안착율</Text>
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
      </ScrollView>
      {/* 고정 바로가기: 스크롤해도 항상 표시 */}
      <View style={[styles.shortcutsFixed, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.shortcuts}>
          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={goCreate}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, styles.shortcutIconCreate]}>
              <Ionicons name="add-circle" size={22} color="#fff" />
            </View>
            <Text style={styles.shortcutLabel}>라운드 만들기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={goJoin}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, styles.shortcutIconJoin]}>
              <Ionicons name="people" size={22} color="#fff" />
            </View>
            <Text style={styles.shortcutLabel}>참여하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f7f2',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 16,
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statsCardMargin: {
    marginTop: 8,
  },
  statsRowLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  statsLabel: {
    flex: 1,
    fontSize: 11,
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
    marginTop: 2,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  statsSubLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  statsRowValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  statsNum: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsNumRound: { color: '#2563eb' },
  statsNumBest: { color: '#059669' },
  statsNumAvg: { color: '#ea580c' },
  statsNumFIR: { color: '#0891b2' },
  statsNumGIR: { color: '#7c3aed' },
  statsNumPPR: { color: '#dc2626' },
  statsLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  statsLoadingText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  shortcutsFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(240,247,242,0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(226,232,240,0.8)',
  },
  heroWrap: {
    height: 220,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  heroImage: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
  },
  shortcuts: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  shortcutBtn: {
    alignItems: 'center',
    minWidth: 100,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  shortcutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shortcutIconCreate: {
    backgroundColor: '#059669',
  },
  shortcutIconJoin: {
    backgroundColor: '#2563eb',
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
});
