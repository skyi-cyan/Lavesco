import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import {
  fetchGolfCourse,
  fetchCoursesUnderGolfCourse,
  fetchHolesUnderCourse,
} from '../../core/services/courseService';
import type { GolfCourse, GolfCourseCourse, GolfCourseHoleInput } from '../../core/types/course';
import { TEE_KEYS } from '../../core/types/course';

const HOLE_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const TEE_LABELS: Record<string, string> = { black: 'Black', blue: 'Blue', white: 'White', red: 'Red' };

/** 값이 0이면 공란으로 표시 */
function cellValue(n: number): string {
  return n === 0 ? '' : String(n);
}

export type CourseDetailParamList = {
  CourseDetail: { courseId: string; courseName?: string };
};

type CourseDetailRouteProp = RouteProp<CourseDetailParamList, 'CourseDetail'>;

type Props = {
  route: CourseDetailRouteProp;
};

export function CourseDetailScreen({ route }: Props): React.JSX.Element {
  const { courseId } = route.params;
  const [golfCourse, setGolfCourse] = useState<GolfCourse | null>(null);
  const [courses, setCourses] = useState<GolfCourseCourse[]>([]);
  const [holesByCourse, setHolesByCourse] = useState<Record<string, Record<string, GolfCourseHoleInput>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const gc = await fetchGolfCourse(courseId);
      if (!gc) {
        setError('골프장을 찾을 수 없습니다.');
        setLoading(false);
        return;
      }
      setGolfCourse(gc);
      const courseList = await fetchCoursesUnderGolfCourse(courseId);
      setCourses(courseList);
      const holesData: Record<string, Record<string, GolfCourseHoleInput>> = {};
      for (const c of courseList) {
        const holes = await fetchHolesUnderCourse(courseId, c.id);
        const obj: Record<string, GolfCourseHoleInput> = {};
        HOLE_NUMBERS.forEach((no) => {
          obj[no] = holes.get(no) ?? {
            par: 4,
            handicapIndex: 0,
            order: parseInt(no, 10),
            distances: { black: 0, blue: 0, white: 0, red: 0 },
          };
        });
        holesData[c.id] = obj;
      }
      setHolesByCourse(holesData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a0" />
        <Text style={styles.loadingText}>코스 정보 불러오는 중...</Text>
      </View>
    );
  }

  if (error || !golfCourse) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? '골프장을 찾을 수 없습니다.'}</Text>
      </View>
    );
  }

  const distanceUnitLabel = golfCourse.distanceUnit === 'YARD' ? 'Yard (yd)' : 'Meter (m)';
  const unitShort = golfCourse.distanceUnit === 'YARD' ? 'yd' : 'm';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 골프장(CC) 기본 정보 — admin-web과 동일 구성 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>골프장(CC) 정보</Text>
        <View style={styles.infoGrid}>
          <InfoRow label="골프장명" value={golfCourse.name} />
          <InfoRow label="지역" value={golfCourse.region} />
          <InfoRow label="상태" value={golfCourse.status === 'ACTIVE' ? '활성' : '비활성'} />
          <InfoRow label="거리 단위" value={distanceUnitLabel} />
          {golfCourse.address ? <InfoRow label="주소" value={golfCourse.address} /> : null}
          {golfCourse.homepage ? (
            <View style={styles.infoRow}>
              <Text style={styles.label}>홈페이지: </Text>
              <TouchableOpacity onPress={() => Linking.openURL(golfCourse.homepage!)} style={styles.linkWrap}>
                <Text style={styles.link} numberOfLines={1}>{golfCourse.homepage}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {golfCourse.additionalInfo ? (
            <InfoRow label="추가 정보" value={golfCourse.additionalInfo} />
          ) : null}
        </View>
      </View>

      {/* 코스별 홀 (황룡, 청룡 등) */}
      <View style={styles.section}>
        {courses.length === 0 ? (
          <Text style={styles.emptyCourse}>등록된 코스가 없습니다.</Text>
        ) : (
          courses.map((course) => (
            <View key={course.id} style={styles.courseBlock}>
              <Text style={styles.courseName}>{course.name}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeaderRow]}>
                    <Text style={[styles.tableCell, styles.tableHeader, styles.cellHole]} numberOfLines={2}>HOLE</Text>
                    {TEE_KEYS.map((k) => (
                      <Text key={k} style={[styles.tableCell, styles.tableHeader, styles.cellDist]} numberOfLines={2}>
                        {TEE_LABELS[k]} ({unitShort})
                      </Text>
                    ))}
                    <Text style={[styles.tableCell, styles.tableHeader, styles.cellPar]} numberOfLines={2}>PAR</Text>
                    <Text style={[styles.tableCell, styles.tableHeader, styles.cellHdcp]} numberOfLines={2}>HDCP</Text>
                  </View>
                  {HOLE_NUMBERS.map((no, index) => {
                    const hole = holesByCourse[course.id]?.[no];
                    if (!hole) return null;
                    const isEven = index % 2 === 0;
                    return (
                      <View
                        key={no}
                        style={[styles.tableRow, isEven ? styles.tableRowEven : styles.tableRowOdd]}
                      >
                        <Text style={[styles.tableCell, styles.cellHole, styles.cellHoleBody]}>{no}</Text>
                        {TEE_KEYS.map((k) => (
                          <Text key={k} style={[styles.tableCell, styles.cellDist, styles.cellDistBody]}>
                            {cellValue(hole.distances[k] ?? 0)}
                          </Text>
                        ))}
                        <Text style={[styles.tableCell, styles.cellPar, styles.cellParBody]}>
                          {cellValue(hole.par)}
                        </Text>
                        <Text style={[styles.tableCell, styles.cellHdcp, styles.cellHdcpBody]}>
                          {cellValue(hole.handicapIndex)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}: </Text>
      <Text style={styles.value} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  errorText: { fontSize: 14, color: '#c00', textAlign: 'center' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
  },
  infoGrid: { gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 14, color: '#666', flexShrink: 0 },
  value: { fontSize: 14, color: '#111', flex: 1 },
  linkWrap: { flex: 1 },
  link: { fontSize: 14, color: '#0a0', textDecorationLine: 'underline' },
  emptyCourse: { fontSize: 14, color: '#666' },
  courseBlock: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  courseName: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  tableScroll: { maxWidth: '100%' },
  table: { borderTopWidth: 1, borderColor: '#e5e5e5', minWidth: 280 },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
  },
  tableRowEven: { backgroundColor: '#f8fafc' },
  tableRowOdd: { backgroundColor: '#fff' },
  tableCell: { paddingVertical: 10, paddingHorizontal: 8, fontSize: 13 },
  tableHeaderRow: { backgroundColor: '#1e293b' },
  tableHeader: {
    fontWeight: '700',
    color: '#f1f5f9',
    fontSize: 11,
  },
  cellHole: { width: 40, textAlign: 'left' },
  cellDist: { width: 42, textAlign: 'right' },
  cellPar: { width: 36, textAlign: 'center' },
  cellHdcp: { width: 40, textAlign: 'center' },
  cellHoleBody: { color: '#1e293b', fontWeight: '600' },
  cellDistBody: { color: '#475569' },
  cellParBody: { color: '#166534', fontWeight: '600' },
  cellHdcpBody: { color: '#1e40af', fontWeight: '500' },
});
