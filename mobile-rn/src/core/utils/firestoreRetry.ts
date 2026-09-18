import firestore from '@react-native-firebase/firestore';

const TRANSIENT_FIRESTORE_CODES = new Set([
  'firestore/unavailable',
  'firestore/deadline-exceeded',
  'firestore/resource-exhausted',
  'firestore/aborted',
]);

export function isTransientFirestoreError(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? '';
  return TRANSIENT_FIRESTORE_CODES.has(code);
}

export function formatFirestoreUserMessage(error: unknown, fallback: string): string {
  const code = (error as { code?: string })?.code ?? '';
  if (code === 'firestore/unavailable' || code === 'firestore/deadline-exceeded') {
    return '서버에 일시적으로 연결할 수 없습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.';
  }
  if (code === 'firestore/permission-denied') {
    return '권한이 없습니다. 다시 로그인한 뒤 시도해 주세요.';
  }
  const message = (error as Error)?.message;
  return message && message.length > 0 ? message : fallback;
}

export async function ensureFirestoreOnline(): Promise<void> {
  try {
    await Promise.race([
      firestore().enableNetwork(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
  } catch {
    // 오프라인/타임아웃이면 쓰기 시도는 계속
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Firestore 일시 오류(unavailable 등) 시 지수 백오프 재시도 */
export async function withFirestoreRetry<T>(
  operation: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 4;
  const baseDelayMs = options?.baseDelayMs ?? 500;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      if (attempt > 0) {
        await ensureFirestoreOnline();
      }
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientFirestoreError(error) || attempt === maxAttempts - 1) {
        throw error;
      }
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }

  throw lastError;
}
