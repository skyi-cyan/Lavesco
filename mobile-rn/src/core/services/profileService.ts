import { getApp } from '@react-native-firebase/app';
import { getAuth, getIdToken } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
  type FirebaseStorageTypes,
  StringFormat,
} from '@react-native-firebase/storage';

const USERS_COLLECTION = 'users';

function extensionFromMime(mimeType: string | null | undefined): 'jpg' | 'png' | 'webp' {
  const m = mimeType?.toLowerCase() ?? '';
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  return 'jpg';
}

/** data URL 접두사·공백 제거 (picker/브리지 이슈 완화) */
function normalizeBase64(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  let s = input.trim();
  const marker = 'base64,';
  const idx = s.indexOf(marker);
  if (s.startsWith('data:') && idx >= 0) {
    s = s.slice(idx + marker.length);
  }
  s = s.replace(/\s/g, '');
  return s.length > 0 ? s : null;
}

function isLikelyLocalFileUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('/');
}

function getStorageErrorCode(e: unknown): string | undefined {
  const x = e as { code?: string; nativeErrorCode?: string };
  return x?.code ?? x?.nativeErrorCode;
}

function isStorageObjectNotFound(e: unknown): boolean {
  return getStorageErrorCode(e) === 'storage/object-not-found';
}

/** Storage 규칙·토큰 문제 시 Storage가 업로드 없이 URL만 조회하면 object-not-found 로 보일 수 있음 */
async function ensureAuthTokenForStorage(): Promise<void> {
  const user = getAuth().currentUser;
  if (user) {
    await getIdToken(user, true);
  }
}

/**
 * putFile 대신 fetch → Blob → put(blob) (data_url 경로). 일부 기기에서 putFile만 실패할 때 보조.
 */
async function tryUploadViaFetchBlob(
  ref: FirebaseStorageTypes.Reference,
  localUri: string,
  contentType: string
): Promise<boolean> {
  try {
    const res = await fetch(localUri);
    if (!res.ok) return false;
    const blob = await res.blob();
    if (!blob || blob.size === 0) return false;
    await ref.put(blob, { contentType });
    return true;
  } catch {
    return false;
  }
}

function storageErrorToMessage(e: unknown): string {
  const code = getStorageErrorCode(e);
  const raw = (e as Error)?.message ?? String(e);
  if (code === 'storage/unauthorized' || raw.toLowerCase().includes('unauthorized')) {
    return '스토리지 권한이 없습니다. 로그아웃 후 다시 로그인해 주세요.';
  }
  if (code === 'storage/canceled') {
    return '업로드가 취소되었습니다.';
  }
  if (isStorageObjectNotFound(e) || raw.includes('storage/object-not-found')) {
    return '스토리지에 파일이 생성되지 않았습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.';
  }
  return raw;
}

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

/** 업로드 직후 전파 지연 시 object-not-found 완화 (getMetadata는 생략하고 URL만 재시도) */
async function getDownloadURLWithRetry(
  ref: FirebaseStorageTypes.Reference,
  maxAttempts = 10
): Promise<string> {
  const delaysMs = [0, 80, 200, 400, 700, 1200, 2000, 3000, 4000, 5500];
  let lastErr: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    const wait = delaysMs[Math.min(i, delaysMs.length - 1)] ?? 0;
    if (wait > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), wait);
      });
    }
    try {
      return await ref.getDownloadURL();
    } catch (e) {
      lastErr = e;
      if (!isStorageObjectNotFound(e) || i === maxAttempts - 1) {
        throw e;
      }
    }
  }
  throw lastErr;
}

/**
 * 기본 앱 설정의 Storage 인스턴스만 사용 (google-services / GoogleService-Info 의 storageBucket).
 * 버킷 별칭을 여러 번 바꿔 시도하면 원인 분석이 어려워져, 문제 지속 시 콘솔·규칙·네트워크를 먼저 점검하는 편이 안전합니다.
 * @see docs/TROUBLESHOOTING_PROFILE_PHOTO_STORAGE.md
 */
function storageInstancesToTry(): FirebaseStorageTypes.Module[] {
  return [getApp().storage()];
}

export type UploadProfilePhotoInput = {
  /** 갤러리/카메라 URI (file:// 또는 content://) */
  localUri: string;
  /** putFile 실패·object-not-found 시 재업로드용 (선택) */
  base64?: string | null;
  /** 예: image/jpeg — base64 업로드 시 Storage contentType */
  mimeType?: string | null;
};

/**
 * 프로필 사진을 Storage에 올리고 다운로드 URL을 반환.
 * - 업로드 전 Auth ID 토큰 갱신(Storage 규칙 연동).
 * - fetch→Blob→put(blob) 시도 후 putFile, object-not-found 시 base64 재시도.
 * - Storage는 `getApp().storage()` 단일 인스턴스 사용.
 */
export async function uploadProfilePhoto(
  uid: string,
  input: string | UploadProfilePhotoInput
): Promise<string> {
  await ensureAuthTokenForStorage();

  const { localUri, base64, mimeType } =
    typeof input === 'string' ? { localUri: input, base64: null, mimeType: null } : input;

  const ext = extensionFromMime(mimeType ?? undefined);
  const objectName = `avatar_${Date.now()}.${ext}`;
  const storagePath = `users/${uid}/${objectName}`;
  const contentType =
    mimeType && mimeType.startsWith('image/')
      ? mimeType
      : ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

  const b64Available = normalizeBase64(base64) != null;

  const uploadWithBase64 = async (ref: FirebaseStorageTypes.Reference): Promise<void> => {
    const b = normalizeBase64(base64);
    if (!b) {
      throw new Error('이미지 데이터를 읽을 수 없습니다. 다시 선택해 주세요.');
    }
    await ref.putString(b, StringFormat.BASE64, { contentType });
  };

  const uploadBytesToServer = async (ref: FirebaseStorageTypes.Reference): Promise<void> => {
    if (await tryUploadViaFetchBlob(ref, localUri, contentType)) {
      return;
    }
    if (isLikelyLocalFileUri(localUri)) {
      try {
        await ref.putFile(localUri);
      } catch (e) {
        if (b64Available) await uploadWithBase64(ref);
        else throw e;
      }
      return;
    }
    if (b64Available) await uploadWithBase64(ref);
    else await ref.putFile(localUri);
  };

  const tryResolveUrl = async (ref: FirebaseStorageTypes.Reference): Promise<string> => {
    try {
      return await getDownloadURLWithRetry(ref);
    } catch (e) {
      if (isStorageObjectNotFound(e) && b64Available) {
        await uploadWithBase64(ref);
        return await getDownloadURLWithRetry(ref);
      }
      throw e;
    }
  };

  const instances = storageInstancesToTry();
  for (let i = 0; i < instances.length; i++) {
    const st = instances[i];
    const ref = st.ref(storagePath);
    try {
      await uploadBytesToServer(ref);
      const url = await tryResolveUrl(ref);
      if (__DEV__) {
        const b = getApp().options.storageBucket;
        // eslint-disable-next-line no-console
        console.log('[profileService] profile photo uploaded', { storageBucket: b, path: storagePath });
      }
      return url;
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[profileService] upload attempt failed', getStorageErrorCode(e), (e as Error)?.message);
      }
      if (i < instances.length - 1) continue;
      throw new Error(storageErrorToMessage(e));
    }
  }
  throw new Error('프로필 사진 업로드에 실패했습니다.');
}

/**
 * 프로필 사진 Storage 경로 prefix (실제 객체는 `avatar_<timestamp>.<ext>` 형태).
 */
export function getProfilePhotoStoragePath(uid: string): string {
  return `users/${uid}`;
}
