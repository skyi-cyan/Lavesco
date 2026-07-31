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
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase/db';
import type { AdminUser, AdminUserUpdateInput } from './types';

const USERS = 'users';
export const ADMIN_USERS_PAGE_SIZE = 50;

function mapAdminUser(d: QueryDocumentSnapshot<DocumentData>): AdminUser {
  const data = d.data();
  return {
    id: d.id,
    uid: data.uid ?? d.id,
    email: data.email ?? '',
    displayName: data.displayName ?? null,
    nickname: data.nickname ?? null,
    role: data.role ?? null,
    status: data.status ?? 'ACTIVE',
    provider: data.provider ?? null,
    defaultTee: data.defaultTee ?? null,
    customerName: data.customerName ?? null,
    roundCount: typeof data.roundCount === 'number' ? data.roundCount : 0,
    lastLoginAt: data.lastLoginAt ?? null,
    updatedAt: data.updatedAt ?? null,
    createdAt: data.createdAt ?? null,
  };
}

export type AdminUsersPageResult = {
  users: AdminUser[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  totalCount: number | null;
};

/**
 * 사용자 목록 페이지 (roundCount 필드는 앱에서 비정규화 유지).
 * getCountFromServer는 컬렉션 전체 1회만 사용.
 */
export async function fetchAdminUsersPage(options?: {
  pageSize?: number;
  startAfterDoc?: QueryDocumentSnapshot<DocumentData> | null;
  includeTotal?: boolean;
}): Promise<AdminUsersPageResult> {
  const db = getDb();
  const pageSize = options?.pageSize ?? ADMIN_USERS_PAGE_SIZE;
  const constraints = [orderBy('updatedAt', 'desc')];
  if (options?.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc));
  }
  constraints.push(limit(pageSize));
  const q = query(collection(db, USERS), ...constraints);
  const snap = await getDocs(q);
  const users = snap.docs.map(mapAdminUser);
  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

  let totalCount: number | null = null;
  if (options?.includeTotal) {
    try {
      const countSnap = await getCountFromServer(collection(db, USERS));
      totalCount = countSnap.data().count;
    } catch {
      totalCount = null;
    }
  }

  return {
    users,
    lastDoc,
    hasMore: snap.docs.length >= pageSize,
    totalCount,
  };
}

/** @deprecated 페이지네이션 사용 — 호환용으로 첫 페이지만 반환 */
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const page = await fetchAdminUsersPage({ includeTotal: false });
  return page.users;
}

export async function updateAdminUser(id: string, input: AdminUserUpdateInput): Promise<void> {
  const db = getDb();
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (input.role !== undefined) payload.role = input.role.trim();
  if (input.status !== undefined) payload.status = input.status;
  if (input.defaultTee !== undefined) payload.defaultTee = input.defaultTee.trim().toLowerCase();
  if (input.customerName !== undefined) payload.customerName = input.customerName.trim();
  await updateDoc(doc(db, USERS, id), payload);
}
