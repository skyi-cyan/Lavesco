import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  fetchGolfCourse,
  fetchCoursesUnderGolfCourse,
  fetchHolesUnderCourse,
} from '../../core/services/courseService';
import type { GolfCourse, GolfCourseCourse, GolfCourseHoleInput } from '../../core/types/course';
import { TEE_KEYS } from '../../core/types/course';
import type { CourseStackParamList } from '../../app/CourseStack';
import { normalizeExternalUrl } from '../shared/CourseWebViewScreen';

const HOLE_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const TEE_LABELS: Record<string, string> = { black: 'Black', blue: 'Blue', white: 'White', red: 'Red' };

/** 값이 0이면 공란으로 표시 */
function cellValue(n: number): string {
  return n === 0 ? '' : String(n);
}

export type CourseDetailParamList = {
  CourseDetail: { courseId: string; courseName?: string };
};

type CourseDetailRouteProp = RouteProp<CourseStackParamList, 'CourseDetail'>;
type CourseDetailNav = NativeStackNavigationProp<CourseStackParamList, 'CourseDetail'>;

type Props = {
  route: CourseDetailRouteProp;
};

export function CourseDetailScreen({ route }: Props): React.JSX.Element {
  const { courseId } = route.params;
  const navigation = useNavigation<CourseDetailNav>();
  const { t } = useTranslation();
  const [golfCourse, setGolfCourse] = useState<GolfCourse | null>(null);
  const [courses, setCourses] = useState<GolfCourseCourse[]>([]);
  const [holesByCourse, setHolesByCourse] = useState<Record<string, Record<string, GolfCourseHoleInput>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openExternalUrl = useCallback(
    (value: string, title?: string) => {
      const normalized = normalizeExternalUrl(value);
      if (!normalized) return;
      navigation.navigate('CourseWebView', {
        url: normalized,
        title: title ?? t('nav.courseView'),
      });
    },
    [navigation, t]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const gc = await fetchGolfCourse(courseId);
      if (!gc) {
        setError(t('courseDetail.notFound'));
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
      setError(e instanceof Error ? e.message : t('courseDetail.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [courseId, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a0" />
        <Text style={styles.loadingText}>{t('courseDetail.loading')}</Text>
      </View>
    );
  }

  if (error || !golfCourse) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? t('courseDetail.notFound')}</Text>
      </View>
    );
  }

  const distanceUnitLabel = golfCourse.distanceUnit === 'YARD' ? 'Yard (yd)' : 'Meter (m)';
  const unitShort = golfCourse.distanceUnit === 'YARD' ? 'yd' : 'm';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 골프장(CC) 기본 정보 — admin-web과 동일 구성 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('courseDetail.infoTitle')}</Text>
        <View style={styles.infoGrid}>
          <InfoRow label={t('courseDetail.name')} value={golfCourse.name} />
          <InfoRow label={t('courseDetail.region')} value={golfCourse.region} />
          <InfoRow
            label={t('courseDetail.status')}
            value={golfCourse.status === 'ACTIVE' ? t('courseDetail.active') : t('courseDetail.inactive')}
          />
          <InfoRow label={t('courseDetail.distanceUnit')} value={distanceUnitLabel} />
          {golfCourse.address ? (
            <InfoRow label={t('courseDetail.address')} value={golfCourse.address} />
          ) : null}
          {golfCourse.homepage ? (
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('courseDetail.homepage')}: </Text>
              <TouchableOpacity
                onPress={() => openExternalUrl(golfCourse.homepage!, t('courseDetail.homepage'))}
                style={styles.linkWrap}
              >
                <Text style={styles.link} numberOfLines={1}>{golfCourse.homepage}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {golfCourse.additionalInfo ? (
            <InfoRow label={t('courseDetail.additionalInfo')} value={golfCourse.additionalInfo} />
          ) : null}
        </View>
      </View>

      {/* 코스별 홀 (황룡, 청룡 등) */}
      <View style={styles.section}>
        {courses.length === 0 ? (
          <Text style={styles.emptyCourse}>{t('courseDetail.noCourses')}</Text>
        ) : (
          courses.map((course) => (
            <View key={course.id} style={styles.courseBlock}>
              <View style={styles.courseHeader}>
                <Text style={styles.courseName}>{course.name}</Text>
                {course.courseUrl ? (
                  <TouchableOpacity
                    onPress={() => openExternalUrl(course.courseUrl!, course.name)}
                    style={styles.courseLinkButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="open-outline" size={16} color="#0a0" />
                    <Text style={styles.courseLinkText}>{t('roundDetail.courseView')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
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
  courseHeader: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  courseLinkButton: {
    marginLeft: 8,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
  },
  courseLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0a0',
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
