import firestore from '@react-native-firebase/firestore';
import type {
  GolfCourse,
  GolfCourseCourse,
  GolfCourseHoleInput,
} from '../types/course';
import { TEE_KEYS } from '../types/course';

const GOLF_COURSES_COLLECTION = 'golfCourses';
const COURSES = 'courses';
const HOLES = 'holes';

const defaultDistances: Record<string, number> = { black: 0, blue: 0, white: 0, red: 0 };

/**
 * admin-web에서 등록한 골프장 목록 조회 (로그인 사용자만 읽기 가능)
 * 지역·이름 순 정렬
 */
export async function fetchGolfCourses(): Promise<GolfCourse[]> {
  const snapshot = await firestore().collection(GOLF_COURSES_COLLECTION).get();
  const list: GolfCourse[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name ?? '',
      region: data.region ?? '',
      status: data.status ?? 'ACTIVE',
      distanceUnit: data.distanceUnit ?? undefined,
      address: data.address ?? undefined,
      homepage: data.homepage ?? undefined,
      additionalInfo: data.additionalInfo ?? undefined,
      updatedAt: data.updatedAt,
    };
  });
  list.sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name));
  return list;
}

/** 골프장 단건 조회 — admin-web과 동일 구조 */
export async function fetchGolfCourse(id: string): Promise<GolfCourse | null> {
  const docSnap = await firestore().collection(GOLF_COURSES_COLLECTION).doc(id).get();
  if (!docSnap.exists) return null;
  const data = docSnap.data();
  if (!data) return null;
  return {
    id: docSnap.id,
    name: data.name ?? '',
    region: data.region ?? '',
    status: data.status ?? 'ACTIVE',
    distanceUnit: data.distanceUnit ?? undefined,
    address: data.address ?? undefined,
    homepage: data.homepage ?? undefined,
    additionalInfo: data.additionalInfo ?? undefined,
    updatedAt: data.updatedAt,
  };
}

/** 골프장 하위 코스 목록 (황룡, 청룡 등) — admin-web과 동일 */
export async function fetchCoursesUnderGolfCourse(
  golfCourseId: string
): Promise<GolfCourseCourse[]> {
  const snapshot = await firestore()
    .collection(GOLF_COURSES_COLLECTION)
    .doc(golfCourseId)
    .collection(COURSES)
    .orderBy('order')
    .get();
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name ?? '',
      holeCount: data.holeCount ?? 9,
      order: data.order ?? 0,
      updatedAt: data.updatedAt,
    };
  });
}

/** 코스별 홀 정보 (1~9, Black/Blue/White/Red, PAR, HDCP) — admin-web과 동일 */
export async function fetchHolesUnderCourse(
  golfCourseId: string,
  courseId: string
): Promise<Map<string, GolfCourseHoleInput>> {
  const snapshot = await firestore()
    .collection(GOLF_COURSES_COLLECTION)
    .doc(golfCourseId)
    .collection(COURSES)
    .doc(courseId)
    .collection(HOLES)
    .get();
  const map = new Map<string, GolfCourseHoleInput>();
  snapshot.docs.forEach((d) => {
    const data = d.data();
    const dist = { ...defaultDistances };
    TEE_KEYS.forEach((k) => {
      if (typeof data.distances?.[k] === 'number') dist[k] = data.distances[k];
    });
    map.set(d.id, {
      par: data.par ?? 4,
      handicapIndex: data.handicapIndex ?? 0,
      order: data.order ?? parseInt(d.id, 10),
      distances: data.distances ?? dist,
    });
  });
  return map;
}
