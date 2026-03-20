'use client';

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase/db';
import type { Course, CourseInput, TeeSet, TeeSetInput, HoleInput } from './types';

const COURSES = 'courses';
const TEESETS = 'teesets';
const HOLES = 'holes';

// --- Course ---
export async function fetchCourses(): Promise<Course[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, COURSES));
  const list = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    updatedAt: d.data().updatedAt ?? null,
  })) as Course[];
  list.sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name));
  return list;
}

export async function fetchCourse(id: string): Promise<Course | null> {
  const db = getDb();
  const ref = doc(db, COURSES, id);
  const d = await getDoc(ref);
  if (!d.exists()) return null;
  return { id: d.id, ...d.data(), updatedAt: d.data().updatedAt ?? null } as Course;
}

export async function createCourse(input: CourseInput): Promise<string> {
  const db = getDb();
  const ref = await addDoc(collection(db, COURSES), {
    ...input,
    version: input.version ?? 1,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCourse(id: string, input: Partial<CourseInput>): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COURSES, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCourse(id: string): Promise<void> {
  const db = getDb();
  const courseRef = doc(db, COURSES, id);
  const batch = writeBatch(db);

  const teesetsSnap = await getDocs(collection(db, COURSES, id, TEESETS));
  teesetsSnap.docs.forEach((d) => batch.delete(d.ref));
  const holesSnap = await getDocs(collection(db, COURSES, id, HOLES));
  holesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(courseRef);
  await batch.commit();
}

// --- TeeSets ---
export async function fetchTeeSets(courseId: string): Promise<TeeSet[]> {
  const db = getDb();
  const q = query(
    collection(db, COURSES, courseId, TEESETS),
    orderBy('name')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeeSet));
}

export async function createTeeSet(courseId: string, input: TeeSetInput): Promise<string> {
  const db = getDb();
  const ref = await addDoc(collection(db, COURSES, courseId, TEESETS), input);
  return ref.id;
}

export async function updateTeeSet(
  courseId: string,
  teeId: string,
  input: Partial<TeeSetInput>
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COURSES, courseId, TEESETS, teeId), input);
}

export async function deleteTeeSet(courseId: string, teeId: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, COURSES, courseId, TEESETS, teeId));
}

// --- Holes ---
export async function fetchHoles(courseId: string): Promise<Map<string, HoleInput>> {
  const db = getDb();
  const snap = await getDocs(collection(db, COURSES, courseId, HOLES));
  const map: Map<string, HoleInput> = new Map();
  snap.docs.forEach((d) => {
    const data = d.data();
    map.set(d.id, {
      par: data.par ?? 4,
      handicapIndex: data.handicapIndex,
      order: data.order,
      distances: (data.distances as Record<string, number>) ?? {},
    });
  });
  return map;
}

export async function saveHole(
  courseId: string,
  holeNo: string,
  input: HoleInput
): Promise<void> {
  const db = getDb();
  const ref = doc(db, COURSES, courseId, HOLES, holeNo);
  await setDoc(ref, { ...input, holeNo }, { merge: true });
}

export async function saveAllHoles(
  courseId: string,
  holes: Record<string, HoleInput>
): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  for (const [holeNo, data] of Object.entries(holes)) {
    const ref = doc(db, COURSES, courseId, HOLES, holeNo);
    batch.set(ref, { ...data, holeNo }, { merge: true });
  }
  await batch.commit();
}
