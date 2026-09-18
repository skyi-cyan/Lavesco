import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../core/auth/AuthContext';
import { DEFAULT_GOLF_CLUB_ID, GOLF_CLUBS, type GolfClubId } from '../../core/constants/golfClubs';
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
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const stepGap = 10;
  const contentPad = 16;
  const stepCardWidth = (windowWidth - contentPad * 2 - stepGap) / 2;
  const modalBottomPad = Math.max(insets.bottom, 12) + 20;
  const [selectedClubId, setSelectedClubId] = useState<GolfClubId>(DEFAULT_GOLF_CLUB_ID);
  const [clubPickerOpen, setClubPickerOpen] = useState(false);
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

  const handleMeasure = async (target: 'start' | 'end') => {
    setMeasuring(target);
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
      );
    } catch {
      Alert.alert('오류', '기록 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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
        <TouchableOpacity
          style={styles.comboTrigger}
          onPress={() => setClubPickerOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.comboTriggerText}>{selectedClub.label}</Text>
          <Ionicons name="chevron-down" size={18} color="#666" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>GPS 측정</Text>

        <View style={[styles.stepRow, { gap: stepGap }]}>
          <View style={[styles.stepCard, { width: stepCardWidth }]}>
            <View style={styles.stepHeader}>
              <Ionicons name="flag-outline" size={18} color="#059669" />
              <Text style={styles.stepTitle} numberOfLines={1}>
                샷 시작 지점
              </Text>
            </View>
            {startPoint ? (
              <>
                <Text style={styles.coordText} numberOfLines={2}>
                  {startPoint.latitude.toFixed(5)},{'\n'}
                  {startPoint.longitude.toFixed(5)}
                </Text>
                <Text style={styles.accuracyText}>{formatAccuracyMeters(startPoint.accuracy)}</Text>
              </>
            ) : (
              <Text style={styles.coordPlaceholder}>아직 측정하지 않았습니다.</Text>
            )}
            <TouchableOpacity
              style={styles.measureBtn}
              onPress={() => handleMeasure('start')}
              disabled={measuring !== null}
            >
              {measuring === 'start' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="locate" size={16} color="#fff" />
                  <Text style={styles.measureBtnText}>시작점</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.stepCard, { width: stepCardWidth }]}>
            <View style={styles.stepHeader}>
              <Ionicons name="golf-outline" size={18} color="#059669" />
              <Text style={styles.stepTitle} numberOfLines={1}>
                볼 위치
              </Text>
            </View>
            {endPoint ? (
              <>
                <Text style={styles.coordText} numberOfLines={2}>
                  {endPoint.latitude.toFixed(5)},{'\n'}
                  {endPoint.longitude.toFixed(5)}
                </Text>
                <Text style={styles.accuracyText}>{formatAccuracyMeters(endPoint.accuracy)}</Text>
              </>
            ) : (
              <Text style={styles.coordPlaceholder}>시작점 측정 후 측정하세요.</Text>
            )}
            <TouchableOpacity
              style={[styles.measureBtn, !startPoint && styles.measureBtnDisabled]}
              onPress={() => handleMeasure('end')}
              disabled={!startPoint || measuring !== null}
            >
              {measuring === 'end' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="locate" size={16} color="#fff" />
                  <Text style={styles.measureBtnText}>볼 위치</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
          <View
            style={[styles.modalContent, { paddingBottom: modalBottomPad }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>클럽 선택</Text>
            <FlatList
              data={GOLF_CLUBS}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalListContent}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },
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
  comboTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  comboTriggerText: { fontSize: 16, fontWeight: '600', color: '#111' },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 12,
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    minHeight: 168,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  stepTitle: { flexShrink: 1, fontSize: 13, fontWeight: '700', color: '#111' },
  coordText: { fontSize: 11, color: '#333', fontFamily: 'monospace', lineHeight: 16 },
  coordPlaceholder: { fontSize: 12, color: '#999', lineHeight: 18 },
  accuracyText: { marginTop: 4, fontSize: 11, color: '#666' },
  measureBtn: {
    marginTop: 12,
    alignSelf: 'stretch',
    backgroundColor: '#f97316',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  measureBtnDisabled: { backgroundColor: '#fdba74' },
  measureBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  resultCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  resultLabel: { color: '#047857', fontSize: 13, marginBottom: 4, fontWeight: '600' },
  resultValue: { color: '#065f46', fontSize: 32, fontWeight: '800' },
  resultSub: { marginTop: 4, color: '#059669', fontSize: 12 },
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
  },
  modalListContent: { paddingBottom: 8 },
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
});
