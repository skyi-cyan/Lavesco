'use client';

import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase/db';
import type { AdminUser, AdminUserUpdateInput } from './types';

const USERS = 'users';

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const db = getDb();
  const q = query(collection(db, USERS), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  const users = await Promise.all(snap.docs.map(async (d) => {
    const data = d.data();
    let roundCount = 0;
    try {
      const roundIdsRef = collection(db, USERS, d.id, 'roundIds');
      const roundIdsCountSnap = await getCountFromServer(roundIdsRef);
      roundCount = roundIdsCountSnap.data().count;
    } catch {
      // 집계 실패 시 목록은 계속 보여준다.
      roundCount = 0;
    }
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
      roundCount,
      lastLoginAt: data.lastLoginAt ?? null,
      updatedAt: data.updatedAt ?? null,
      createdAt: data.createdAt ?? null,
    } as AdminUser;
  }));
  return users;
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
