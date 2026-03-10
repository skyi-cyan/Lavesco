import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

const USERS_COLLECTION = 'users';
const PROFILE_PHOTO_PATH = 'profile.jpg';

export type ProfileUpdateInput = {
  nickname?: string | null;
  handicap?: number | null;
  defaultTee?: string | null;
  photoURL?: string | null;
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
  if (input.photoURL !== undefined) data.photoURL = input.photoURL ?? null;
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

/**
 * 로컬 이미지 URI를 Storage에 업로드하고 다운로드 URL을 반환.
 * 반환된 URL을 updateUserProfile(uid, { photoURL })로 저장하면 됨.
 */
export async function uploadProfilePhoto(uid: string, localUri: string): Promise<string> {
  const ref = storage().ref(`users/${uid}/${PROFILE_PHOTO_PATH}`);
  await ref.putFile(localUri);
  const downloadUrl = await ref.getDownloadURL();
  return downloadUrl;
}

/**
 * 프로필 사진 Storage 경로 (삭제 시 사용).
 */
export function getProfilePhotoStoragePath(uid: string): string {
  return `users/${uid}/${PROFILE_PHOTO_PATH}`;
}
