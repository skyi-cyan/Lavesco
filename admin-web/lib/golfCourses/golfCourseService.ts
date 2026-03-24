'use client';

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase/db';
import type {
  GolfCourse,
  GolfCourseInput,
  GolfCourseCourse,
  GolfCourseCourseInput,
  GolfCourseHoleInput,
  TeeKey,
} from './types';
import { TEE_KEYS } from './types';

const GOLF_COURSES = 'golfCourses';
const COURSES = 'courses';
const HOLES = 'holes';

const defaultDistances: Record<TeeKey, number> = { black: 0, blue: 0, white: 0, red: 0 };

// --- Golf Course (골프장/CC) ---
export async function fetchGolfCourses(): Promise<GolfCourse[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, GOLF_COURSES));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GolfCourse));
  list.sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name));
  return list;
}

export async function fetchGolfCourse(id: string): Promise<GolfCourse | null> {
  const db = getDb();
  const d = await getDoc(doc(db, GOLF_COURSES, id));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() } as GolfCourse;
}

export async function createGolfCourse(input: GolfCourseInput): Promise<string> {
  const db = getDb();
  const ref = await addDoc(collection(db, GOLF_COURSES), {
    name: input.name.trim(),
    region: input.region.trim(),
    status: input.status ?? 'ACTIVE',
    distanceUnit: input.distanceUnit ?? 'METER',
    address: input.address?.trim() ?? '',
    homepage: input.homepage?.trim() ?? '',
    additionalInfo: input.additionalInfo?.trim() ?? '',
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateGolfCourse(id: string, input: Partial<GolfCourseInput>): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, GOLF_COURSES, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGolfCourse(id: string): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  const gcRef = doc(db, GOLF_COURSES, id);
  const coursesSnap = await getDocs(collection(db, GOLF_COURSES, id, COURSES));
  for (const cDoc of coursesSnap.docs) {
    const holesSnap = await getDocs(
      collection(db, GOLF_COURSES, id, COURSES, cDoc.id, HOLES)
    );
    holesSnap.docs.forEach((h) => batch.delete(h.ref));
    batch.delete(cDoc.ref);
  }
  batch.delete(gcRef);
  await batch.commit();
}

// --- Course (황룡, 청룡 등) ---
export async function fetchCoursesUnderGolfCourse(
  golfCourseId: string
): Promise<GolfCourseCourse[]> {
  const db = getDb();
  const q = query(
    collection(db, GOLF_COURSES, golfCourseId, COURSES),
    orderBy('order')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GolfCourseCourse));
}

export async function createCourseUnderGolfCourse(
  golfCourseId: string,
  input: GolfCourseCourseInput
): Promise<string> {
  const db = getDb();
  const coursesRef = collection(db, GOLF_COURSES, golfCourseId, COURSES);
  const snap = await getDocs(coursesRef);
  const order = (input.order ?? snap.size) + 1;
  const ref = await addDoc(coursesRef, {
    name: input.name.trim(),
    courseUrl: input.courseUrl?.trim() ?? '',
    holeCount: input.holeCount ?? 9,
    order,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCourseUnderGolfCourse(
  golfCourseId: string,
  courseId: string,
  input: Partial<GolfCourseCourseInput>
): Promise<void> {
  const db = getDb();
  const nextInput: Partial<GolfCourseCourseInput> = { ...input };
  if (typeof nextInput.courseUrl === 'string') {
    nextInput.courseUrl = nextInput.courseUrl.trim();
  }
  await updateDoc(doc(db, GOLF_COURSES, golfCourseId, COURSES, courseId), {
    ...nextInput,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCourseUnderGolfCourse(
  golfCourseId: string,
  courseId: string
): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  const holesSnap = await getDocs(
    collection(db, GOLF_COURSES, golfCourseId, COURSES, courseId, HOLES)
  );
  holesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, GOLF_COURSES, golfCourseId, COURSES, courseId));
  await batch.commit();
}

// --- Holes (1~9 per course). Black, Blue, White, Red, PAR, HDCP ---
export async function fetchHolesUnderCourse(
  golfCourseId: string,
  courseId: string
): Promise<Map<string, GolfCourseHoleInput>> {
  const db = getDb();
  const snap = await getDocs(
    collection(db, GOLF_COURSES, golfCourseId, COURSES, courseId, HOLES)
  );
  const map = new Map<string, GolfCourseHoleInput>();
  snap.docs.forEach((d) => {
    const data = d.data();
    const dist: Record<string, number> = { ...defaultDistances };
    TEE_KEYS.forEach((k) => {
      if (data.distances && typeof data.distances[k] === 'number') dist[k] = data.distances[k];
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

export async function saveAllHolesUnderCourse(
  golfCourseId: string,
  courseId: string,
  holes: Record<string, GolfCourseHoleInput>
): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  for (const [holeNo, data] of Object.entries(holes)) {
    const ref = doc(db, GOLF_COURSES, golfCourseId, COURSES, courseId, HOLES, holeNo);
    const distances = { ...defaultDistances };
    TEE_KEYS.forEach((k) => {
      if (data.distances[k] != null) distances[k] = Number(data.distances[k]);
    });
    batch.set(ref, { holeNo, ...data, distances }, { merge: true });
  }
  await batch.commit();
}
