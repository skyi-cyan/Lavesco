'use client';

import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase/db';
import type { CourseAddRequest, CourseAddRequestAdminUpdate } from './types';

const COLLECTION = 'courseAddRequests';
export const COURSE_ADD_REQUESTS_PAGE_SIZE = 30;

export type CourseAddRequestsPageResult = {
  items: CourseAddRequest[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  totalCount: number | null;
};

export async function fetchCourseAddRequestsPage(options?: {
  pageSize?: number;
  startAfterDoc?: QueryDocumentSnapshot<DocumentData> | null;
  includeTotal?: boolean;
}): Promise<CourseAddRequestsPageResult> {
  const db = getDb();
  const pageSize = options?.pageSize ?? COURSE_ADD_REQUESTS_PAGE_SIZE;
  const constraints = [orderBy('createdAt', 'desc')];
  if (options?.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc));
  }
  constraints.push(limit(pageSize));
  const q = query(collection(db, COLLECTION), ...constraints);
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CourseAddRequest));
  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

  let totalCount: number | null = null;
  if (options?.includeTotal) {
    try {
      const countSnap = await getCountFromServer(collection(db, COLLECTION));
      totalCount = countSnap.data().count;
    } catch {
      totalCount = null;
    }
  }

  return {
    items,
    lastDoc,
    hasMore: snap.docs.length >= pageSize,
    totalCount,
  };
}

/** @deprecated 페이지네이션 사용 */
export async function fetchCourseAddRequests(): Promise<CourseAddRequest[]> {
  const page = await fetchCourseAddRequestsPage({ includeTotal: false });
  return page.items;
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
