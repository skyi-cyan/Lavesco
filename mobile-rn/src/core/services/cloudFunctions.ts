import auth from '@react-native-firebase/auth';
import i18n from '../../i18n';
import { ko } from '../../i18n/locales/ko';

const PROJECT_ID = 'scorecard-app-6f9bd';
const REGION = 'us-central1';

type CallableError = {
  error?: {
    status?: string;
    message?: string;
  };
};

type ServerErrorKey = keyof typeof ko.serverErrors;

/** Cloud Functions가 한국어 메시지로 응답하므로, 문구를 키로 역매핑해 현재 언어로 바꿔 보여줌 */
const SERVER_MESSAGE_TO_KEY = new Map<string, ServerErrorKey>(
  (Object.entries(ko.serverErrors) as [ServerErrorKey, string][]).map(([key, message]) => [
    message,
    key,
  ])
);

function translateServerMessage(message: string | undefined, httpStatus: number): string {
  const key = message ? SERVER_MESSAGE_TO_KEY.get(message) : undefined;
  if (key) return i18n.t(`serverErrors.${key}`);
  if (message && i18n.language === 'ko') return message;
  return i18n.t('errors.serverError', { status: httpStatus });
}

/**
 * Firebase Callable HTTPS 호출 (네이티브 functions 모듈 없이 Auth 토큰으로 호출)
 */
export async function callCloudFunction<TRequest extends object, TResponse>(
  name: string,
  data: TRequest
): Promise<TResponse> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error(i18n.t('errors.loginRequired'));
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
    throw new Error(translateServerMessage(body.error?.message, response.status));
  }

  if (body.result === undefined) {
    throw new Error(i18n.t('errors.invalidResponse'));
  }

  return body.result;
}
