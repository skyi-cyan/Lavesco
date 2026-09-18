import auth from '@react-native-firebase/auth';

const PROJECT_ID = 'scorecard-app-6f9bd';
const REGION = 'us-central1';

type CallableError = {
  error?: {
    status?: string;
    message?: string;
  };
};

/**
 * Firebase Callable HTTPS 호출 (네이티브 functions 모듈 없이 Auth 토큰으로 호출)
 */
export async function callCloudFunction<TRequest extends object, TResponse>(
  name: string,
  data: TRequest
): Promise<TResponse> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('로그인이 필요합니다. 다시 로그인한 뒤 시도해 주세요.');
  }

  const idToken = await user.getIdToken();
  const url = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${name}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ data }),
  });

  const body = (await response.json().catch(() => ({}))) as CallableError & {
    result?: TResponse;
  };

  if (!response.ok || body.error) {
    const message =
      body.error?.message ||
      `서버 오류 (${response.status}). 잠시 후 다시 시도해 주세요.`;
    throw new Error(message);
  }

  if (body.result === undefined) {
    throw new Error('서버 응답이 올바르지 않습니다.');
  }

  return body.result;
}
