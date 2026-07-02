import React, { useEffect, useMemo, useState } from 'react';
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
import { GOLF_CLUBS, type GolfClubId } from '../../core/constants/golfClubs';
import { createDistanceRecord } from '../../core/services/distanceRecordService';
import { findTodayInProgressRound } from '../../core/services/roundService';
import type { Round } from '../../core/types/round';
import {
  formatAccuracyMeters,
  formatDistanceMeters,
  haversineDistanceMeters,
} from '../../core/utils/geo';
import {
  getCurrentGpsPosition,
  promptOpenSettings,
  type GpsPoint,
} from '../../core/utils/locationService';
import type { DistanceStackParamList } from '../../app/DistanceStack';

type Props = NativeStackScreenProps<DistanceStackParamList, 'DistanceRecord'>;

function formatLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DistanceRecordScreen({ navigation }: Props): React.JSX.Element {
  const { user } = useAuth();
  const [selectedClubId, setSelectedClubId] = useState<GolfClubId>('7i');
  const [startPoint, setStartPoint] = useState<GpsPoint | null>(null);
  const [endPoint, setEndPoint] = useState<GpsPoint | null>(null);
  const [measuring, setMeasuring] = useState<'start' | 'end' | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [roundLoading, setRoundLoading] = useState(true);

  const selectedClub = GOLF_CLUBS.find((c) => c.id === selectedClubId) ?? GOLF_CLUBS[0];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.uid) {
        setActiveRound(null);
        setRoundLoading(false);
        return;
      }
      setRoundLoading(true);
      try {
        const round = await findTodayInProgressRound(user.uid);
        if (!cancelled) setActiveRound(round);
      } catch {
        if (!cancelled) setActiveRound(null);
      } finally {
        if (!cancelled) setRoundLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const distanceMeters = useMemo(() => {
    if (!startPoint || !endPoint) return null;
    return haversineDistanceMeters(
      startPoint.latitude,
      startPoint.longitude,
      endPoint.latitude,
      endPoint.longitude
    );
  }, [startPoint, endPoint]);

  const handleMeasure = async (target: 'start' | 'end') => {    setMeasuring(target);
    try {
      const point = await getCurrentGpsPosition();
      if (target === 'start') {
        setStartPoint(point);
        setEndPoint(null);
      } else {
        setEndPoint(point);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '위치를 가져오지 못했습니다.';
      if (message === 'LOCATION_PERMISSION_DENIED') {
        promptOpenSettings();
      } else {
        Alert.alert('GPS 오류', message);
      }
    } finally {
      setMeasuring(null);
    }
  };

  const handleReset = () => {
    setStartPoint(null);
    setEndPoint(null);
  };

  const handleSave = async () => {
    if (!user?.uid || !startPoint || !endPoint || distanceMeters == null) return;
    setSaving(true);
    try {
      const roundDay = activeRound?.scheduledAt ?? activeRound?.createdAt ?? new Date();
      await createDistanceRecord(user.uid, {
        clubId: selectedClub.id,
        clubLabel: selectedClub.label,
        startLat: startPoint.latitude,
        startLng: startPoint.longitude,
        endLat: endPoint.latitude,
        endLng: endPoint.longitude,
        distanceMeters,
        startAccuracyMeters: startPoint.accuracy,
        endAccuracyMeters: endPoint.accuracy,
        method: 'GPS',
        roundId: activeRound?.id ?? null,
        golfCourseName: activeRound?.golfCourseName?.trim() || null,
        roundDate: activeRound ? formatLocalDateKey(roundDay) : null,
      });
      const roundNote = activeRound?.golfCourseName
        ? `\n(${activeRound.golfCourseName} 라운드에 연결됨)`
        : '';
      Alert.alert(
        '저장 완료',
        `${selectedClub.label} ${formatDistanceMeters(distanceMeters)} 기록이 저장되었습니다.${roundNote}`,
        [{ text: '확인', onPress: () => navigation.goBack() }]
      );    } catch {
      Alert.alert('오류', '기록 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.roundBanner}>
        {roundLoading ? (
          <ActivityIndicator size="small" color="#059669" />
        ) : activeRound?.golfCourseName ? (
          <>
            <View style={styles.roundBannerHeader}>
              <Ionicons name="flag" size={18} color="#059669" />
              <Text style={styles.roundBannerTitle}>오늘 진행 중인 라운드</Text>
            </View>
            <Text style={styles.roundBannerCourse}>{activeRound.golfCourseName}</Text>
            <Text style={styles.roundBannerSub}>저장 시 이 라운드와 골프장명이 함께 기록됩니다.</Text>
          </>
        ) : (
          <>
            <View style={styles.roundBannerHeader}>
              <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
              <Text style={styles.roundBannerTitleMuted}>연결된 라운드 없음</Text>
            </View>
            <Text style={styles.roundBannerSubMuted}>
              오늘 진행 중인 라운드가 있으면 골프장명이 자동으로 기록됩니다.
            </Text>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>클럽 선택</Text>
      <View style={styles.clubGrid}>
        {GOLF_CLUBS.map((club) => {
          const active = club.id === selectedClubId;
          return (
            <TouchableOpacity
              key={club.id}
              style={[styles.clubChip, active && styles.clubChipActive]}
              onPress={() => setSelectedClubId(club.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.clubChipText, active && styles.clubChipTextActive]}>
                {club.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>GPS 측정</Text>
      <Text style={styles.helpText}>
        1) 샷을 치기 전 시작 위치에서 측정하고, 2) 볼이 멈춘 위치에서 다시 측정하세요.
      </Text>

      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <Ionicons name="flag-outline" size={20} color="#059669" />
          <Text style={styles.stepTitle}>샷 시작 지점</Text>
        </View>
        {startPoint ? (
          <Text style={styles.coordText}>
            {startPoint.latitude.toFixed(6)}, {startPoint.longitude.toFixed(6)}
          </Text>
        ) : (
          <Text style={styles.coordPlaceholder}>아직 측정하지 않았습니다.</Text>
        )}
        {startPoint ? (
          <Text style={styles.accuracyText}>{formatAccuracyMeters(startPoint.accuracy)}</Text>
        ) : null}
        <TouchableOpacity
          style={styles.measureBtn}
          onPress={() => handleMeasure('start')}
          disabled={measuring !== null}
        >
          {measuring === 'start' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="locate" size={18} color="#fff" />
              <Text style={styles.measureBtnText}>시작점 측정</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <Ionicons name="golf-outline" size={20} color="#059669" />
          <Text style={styles.stepTitle}>볼 위치</Text>
        </View>
        {endPoint ? (
          <Text style={styles.coordText}>
            {endPoint.latitude.toFixed(6)}, {endPoint.longitude.toFixed(6)}
          </Text>
        ) : (
          <Text style={styles.coordPlaceholder}>시작점 측정 후 볼 위치를 측정하세요.</Text>
        )}
        {endPoint ? (
          <Text style={styles.accuracyText}>{formatAccuracyMeters(endPoint.accuracy)}</Text>
        ) : null}
        <TouchableOpacity
          style={[styles.measureBtn, !startPoint && styles.measureBtnDisabled]}
          onPress={() => handleMeasure('end')}
          disabled={!startPoint || measuring !== null}
        >
          {measuring === 'end' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="locate" size={18} color="#fff" />
              <Text style={styles.measureBtnText}>볼 위치 측정</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.resultCard}>
        <Text style={styles.resultLabel}>측정 거리</Text>
        <Text style={styles.resultValue}>
          {distanceMeters != null ? formatDistanceMeters(distanceMeters) : '-'}
        </Text>
        {startPoint && endPoint ? (
          <Text style={styles.resultSub}>
            {formatAccuracyMeters(startPoint.accuracy)} / {formatAccuracyMeters(endPoint.accuracy)}
          </Text>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleReset} disabled={saving}>
          <Text style={styles.secondaryBtnText}>다시 측정</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, (!startPoint || !endPoint || saving) && styles.primaryBtnDisabled]}
          onPress={handleSave}
          disabled={!startPoint || !endPoint || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  roundBanner: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  roundBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  roundBannerTitle: { fontSize: 14, fontWeight: '700', color: '#047857' },
  roundBannerTitleMuted: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  roundBannerCourse: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 4 },
  roundBannerSub: { fontSize: 12, color: '#059669', lineHeight: 18 },
  roundBannerSubMuted: { fontSize: 12, color: '#9ca3af', lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 10, marginTop: 4 },
  helpText: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 12 },
  clubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  clubChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  clubChipActive: { backgroundColor: '#ecfdf5', borderColor: '#059669' },
  clubChipText: { fontSize: 13, color: '#444', fontWeight: '600' },
  clubChipTextActive: { color: '#047857' },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  coordText: { fontSize: 13, color: '#333', fontFamily: 'monospace' },
  coordPlaceholder: { fontSize: 13, color: '#999' },
  accuracyText: { marginTop: 4, fontSize: 12, color: '#666' },
  measureBtn: {
    marginTop: 12,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  measureBtnDisabled: { backgroundColor: '#9ca3af' },
  measureBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resultCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  resultLabel: { color: '#9ca3af', fontSize: 13, marginBottom: 6 },
  resultValue: { color: '#fff', fontSize: 40, fontWeight: '800' },
  resultSub: { marginTop: 8, color: '#9ca3af', fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#374151', fontSize: 15, fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: '#9ca3af' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
