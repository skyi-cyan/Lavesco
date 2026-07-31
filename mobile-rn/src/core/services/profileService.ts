import firestore from '@react-native-firebase/firestore';

const USERS_COLLECTION = 'users';

export type ProfileUpdateInput = {
  nickname?: string | null;
  handicap?: number | null;
  defaultTee?: string | null;
  address?: string | null;
  dateOfBirth?: string | null; // YYYY-MM-DD
};

/**
 * 사용자 프로필 일부 필드 업데이트 (Firestore users/{uid})
 * Android: set(merge: true)만 사용. getIdToken 강제 갱신 제거(getIdToken 실패 시 저장 멈춤 방지).
 */
export async function updateUserProfile(
  uid: string,
  input: ProfileUpdateInput
): Promise<void> {
  const data: Record<string, unknown> = {};
  if (input.nickname !== undefined) data.nickname = input.nickname ?? null;
  if (input.handicap !== undefined) data.handicap = input.handicap ?? null;
  if (input.defaultTee !== undefined) data.defaultTee = input.defaultTee ?? null;
  if (input.address !== undefined) data.address = input.address ?? null;
  if (input.dateOfBirth !== undefined) data.dateOfBirth = input.dateOfBirth ?? null;

  if (Object.keys(data).length === 0) return;

  const db = firestore();
  try {
    await Promise.race([
      db.enableNetwork(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
  } catch {
    // 오프라인/타임아웃이면 무시하고 쓰기 시도
  }
  const ref = db.collection(USERS_COLLECTION).doc(uid);
  await ref.set(data, { merge: true });
}
