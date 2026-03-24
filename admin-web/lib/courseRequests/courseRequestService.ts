'use client';

import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase/db';
import type { CourseAddRequest, CourseAddRequestAdminUpdate } from './types';

const COLLECTION = 'courseAddRequests';

export async function fetchCourseAddRequests(): Promise<CourseAddRequest[]> {
  const db = getDb();
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CourseAddRequest));
}

export async function updateCourseAddRequest(
  id: string,
  input: CourseAddRequestAdminUpdate
): Promise<void> {
  const db = getDb();
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (input.status !== undefined) payload.status = input.status;
  if (input.adminReply !== undefined) {
    const reply = input.adminReply.trim();
    payload.adminReply = reply;
    if (reply.length > 0) {
      payload.repliedAt = serverTimestamp();
    }
  }
  if (input.createdGolfCourseId !== undefined) {
    const gid = input.createdGolfCourseId.trim();
    payload.createdGolfCourseId = gid.length > 0 ? gid : null;
  }
  await updateDoc(doc(db, COLLECTION, id), payload);
}
