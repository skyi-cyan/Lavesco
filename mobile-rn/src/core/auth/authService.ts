import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import type { UserProfile, TermsAgreement } from '../types/userProfile';
import { userProfileFromMap, userProfileToMap } from '../types/userProfile';

const USERS_COLLECTION = 'users';

/**
 * 인증 에러 메시지 변환 (Flutter _handleAuthException과 동일)
 */
function authErrorMessage(code: string, message?: string): string {
  const map: Record<string, string> = {
    'auth/user-not-found': '등록되지 않은 이메일입니다.',
    'auth/wrong-password': '비밀번호가 잘못되었습니다.',
    'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
    'auth/weak-password': '비밀번호는 최소 6자 이상이어야 합니다.',
    'auth/invalid-email': '유효하지 않은 이메일입니다.',
    'auth/user-disabled': '비활성화된 계정입니다.',
    'auth/too-many-requests':
      '너무 많은 시도가 있었습니다. 나중에 다시 시도해주세요.',
    'auth/operation-not-allowed': '이 로그인 방법은 허용되지 않습니다.',
  };
  return map[code] ?? `인증 오류: ${message ?? code}`;
}

/**
 * Google Sign-In 초기화 (앱 시작 시 한 번 호출)
 * webClientId: Firebase Console > 프로젝트 설정 > 앱 > Android OAuth 클라이언트의 웹 클라이언트 ID
 */
export function configureGoogleSignIn(webClientId?: string): void {
  if (webClientId) {
    GoogleSignin.configure({ webClientId });
  }
}

export const authService = {
  /** 이메일/비밀번호 로그인 */
  async signInWithEmail(email: string, password: string): Promise<FirebaseAuthTypes.UserCredential> {
    try {
      return await auth().signInWithEmailAndPassword(email.trim(), password);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      throw new Error(authErrorMessage(err.code ?? '', err.message));
    }
  },

  /** 이메일/비밀번호 회원가입 + 프로필 생성 */
  async signUpWithEmail(
    email: string,
    password: string,
    nickname: string,
    terms: TermsAgreement
  ): Promise<FirebaseAuthTypes.UserCredential> {
    try {
      const credential = await auth().createUserWithEmailAndPassword(
        email.trim(),
        password
      );
      const user = credential.user;
      if (user) {
        await createUserProfile(user, {
          nickname,
          provider: 'email',
          terms,
        });
      }
      return credential;
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      throw new Error(authErrorMessage(err.code ?? '', err.message));
    }
  },

  /** Google 로그인 */
  async signInWithGoogle(): Promise<FirebaseAuthTypes.UserCredential> {
    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      if (!signInResult?.data?.user) {
        throw new Error('Google 로그인이 취소되었습니다.');
      }
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) {
        throw new Error('Google 로그인 토큰을 가져올 수 없습니다.');
      }
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      if (userCredential.user) {
        await ensureUserProfile(userCredential.user, 'google');
      }
      return userCredential;
    } catch (e: unknown) {
      const err = e as Error;
      throw new Error(err.message ?? 'Google 로그인 실패');
    }
  },

  /** Apple 로그인 (iOS) */
  async signInWithApple(): Promise<FirebaseAuthTypes.UserCredential> {
    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [
          appleAuth.AppleAuthenticationScope.EMAIL,
          appleAuth.AppleAuthenticationScope.FULL_NAME,
        ],
      });
      const { identityToken, fullName } = appleAuthRequestResponse;
      if (!identityToken) {
        throw new Error('Apple 로그인이 취소되었습니다.');
      }
      const credential = auth.AppleAuthProvider.credential(identityToken);
      const userCredential = await auth().signInWithCredential(credential);
      const displayName =
        fullName?.givenName && fullName?.familyName
          ? `${fullName.givenName} ${fullName.familyName}`.trim()
          : undefined;
      if (userCredential.user) {
        await ensureUserProfile(userCredential.user, 'apple', displayName);
      }
      return userCredential;
    } catch (e: unknown) {
      const err = e as Error;
      throw new Error(err.message ?? 'Apple 로그인 실패');
    }
  },

  /** 로그아웃 */
  async signOut(): Promise<void> {
    await Promise.all([auth().signOut(), GoogleSignin.signOut()]);
  },

  /** 현재 사용자 */
  currentUser(): FirebaseAuthTypes.User | null {
    return auth().currentUser;
  },

  /** 인증 상태 변경 리스너 */
  onAuthStateChanged(
    callback: (user: FirebaseAuthTypes.User | null) => void
  ): () => void {
    return auth().onAuthStateChanged(callback);
  },
};

async function createUserProfile(
  user: FirebaseAuthTypes.User,
  options: {
    nickname?: string;
    provider: string;
    terms?: TermsAgreement;
    displayName?: string | null;
  }
): Promise<void> {
  const now = new Date();
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email ?? '',
    displayName: options.displayName ?? user.displayName ?? null,
    nickname: options.nickname ?? null,
    photoURL: user.photoURL ?? null,
    provider: options.provider,
    termsAgreement: options.terms
      ? {
          serviceTerms: options.terms.serviceTerms,
          privacyPolicy: options.terms.privacyPolicy,
          marketing: options.terms.marketing,
        }
      : null,
    createdAt: now,
    updatedAt: now,
  };
  await firestore().collection(USERS_COLLECTION).doc(user.uid).set(userProfileToMap(profile));
}

async function ensureUserProfile(
  user: FirebaseAuthTypes.User,
  provider: string,
  displayName?: string | null
): Promise<void> {
  const doc = await firestore().collection(USERS_COLLECTION).doc(user.uid).get();
  if (!doc.exists) {
    await createUserProfile(user, { provider, displayName });
  }
}
