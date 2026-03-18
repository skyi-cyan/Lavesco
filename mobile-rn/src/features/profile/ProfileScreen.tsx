import React, { useCallback, useEffect, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../core/auth/AuthContext';
import { fetchUserRoundRecords } from '../../core/services/roundService';
import type { RoundRecordRow } from '../../core/services/roundService';
import type { ProfileStackParamList } from '../../app/ProfileStack';

type ProfileScreenNav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

type Props = {
  navigation: ProfileScreenNav;
};

const TABLE_HEADERS = ['날짜', '골프장', '총타수', '버디', '파', '보기', 'FIR', 'GIR', 'PPR'] as const;
/** 카드 너비에 맞게 분배 (골프장 열이 남는 폭 흡수) */
const COL_FLEX = [1.15, 2.35, 1, 1, 1, 1, 1, 1, 1] as const;

function formatCell(value: string | number | null | undefined): string {
  if (value == null) return '-';
  if (typeof value === 'number') return String(value);
  return value;
}

export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  const { user, profile, signOut } = useAuth();
  const [records, setRecords] = useState<RoundRecordRow[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    if (!user?.uid) {
      setRecords([]);
      setRecordsLoading(false);
      return;
    }
    setRecordsLoading(true);
    try {
      const rows = await fetchUserRoundRecords(user.uid);
      setRecords(rows);
    } finally {
      setRecordsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
      return () => {};
    }, [loadRecords])
  );

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

      {/* 나의 기록 테이블 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>나의 기록</Text>
        <View style={styles.tableCard}>
          {recordsLoading ? (
            <View style={styles.tableLoading}>
              <ActivityIndicator size="small" color="#94a3b8" />
              <Text style={styles.tableLoadingText}>불러오는 중...</Text>
            </View>
          ) : records.length === 0 ? (
            <Text style={styles.tableEmpty}>확정된 라운드가 없습니다.</Text>
          ) : (
            <View style={styles.tableFill}>
              <View style={styles.tableInner}>
                <View style={[styles.tableRow, styles.tableHeaderRow]}>
                  {TABLE_HEADERS.map((label, colIndex) => (
                    <View
                      key={`h-${colIndex}-${label}`}
                      style={[
                        styles.tableHeaderCell,
                        { flex: COL_FLEX[colIndex] ?? 1 },
                        colIndex === 1 && styles.tableHeaderCellCourse,
                      ]}
                    >
                      <Text
                        style={styles.tableHeaderText}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
                {records.map((row, rowIndex) => (
                  <View
                    key={`${row.dateStr}-${row.golfCourseName}-${rowIndex}`}
                    style={[
                      styles.tableRow,
                      rowIndex > 0 && styles.tableRowBorder,
                    ]}
                  >
                    {COL_FLEX.map((fl, colIndex) => {
                      let content: React.ReactNode = null;
                      switch (colIndex) {
                        case 0:
                          content = row.dateStr;
                          break;
                        case 1:
                          content = (
                            <Text style={styles.tableCellText} numberOfLines={1}>
                              {row.golfCourseName}
                            </Text>
                          );
                          break;
                        case 2:
                          content = row.total;
                          break;
                        case 3:
                          content = formatCell(row.birdies);
                          break;
                        case 4:
                          content = formatCell(row.pars);
                          break;
                        case 5:
                          content = formatCell(row.bogeys);
                          break;
                        case 6:
                          content = row.fwPct != null ? String(row.fwPct) : '-';
                          break;
                        case 7:
                          content = row.girPct != null ? String(row.girPct) : '-';
                          break;
                        case 8:
                          content = row.putts;
                          break;
                        default:
                          content = '-';
                      }
                      return (
                        <View
                          key={`c-${colIndex}`}
                          style={[
                            styles.tableCell,
                            { flex: fl },
                            colIndex === 1 && styles.tableCellCourse,
                          ]}
                        >
                          {typeof content === 'string' || typeof content === 'number' ? (
                            <Text style={styles.tableCellText}>{content}</Text>
                          ) : (
                            content
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
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
  menuLabel: {
    fontSize: 16,
    color: '#111',
  },
  menuLabelDanger: {
    fontSize: 16,
    color: '#c00',
    fontWeight: '500',
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    minHeight: 80,
  },
  tableLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  tableLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  tableEmpty: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 24,
  },
  tableFill: {
    width: '100%',
    alignSelf: 'stretch',
  },
  tableInner: {
    width: '100%',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'stretch',
  },
  tableRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  tableHeaderRow: {
    backgroundColor: '#2e7d32',
    overflow: 'hidden',
  },
  tableHeaderCell: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0,
  },
  tableHeaderCellCourse: {
    alignItems: 'flex-start',
    paddingLeft: 8,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  tableCell: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0,
  },
  tableCellCourse: {
    alignItems: 'flex-start',
    paddingLeft: 8,
    paddingRight: 4,
  },
  tableCellText: {
    fontSize: 11,
    color: '#111',
  },
});
