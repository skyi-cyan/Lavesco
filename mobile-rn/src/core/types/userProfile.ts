import firestore, {
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

/**
 * 사용자 프로필 (Firestore users/{uid})
 * Flutter UserProfile와 동일 구조
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  nickname: string | null;
  photoURL: string | null;
  provider: string | null; // 'email' | 'google' | 'apple'
  handicap?: number;
  defaultTee?: string | null;
  termsAgreement?: Record<string, boolean> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TermsAgreement {
  serviceTerms: boolean;
  privacyPolicy: boolean;
  marketing: boolean;
  agreedAt: Date;
}

export function userProfileFromMap(
  map: Record<string, unknown>
): UserProfile {
  const toDate = (v: unknown): Date => {
    if (v && typeof (v as FirebaseFirestoreTypes.Timestamp).toDate === 'function') {
      return (v as FirebaseFirestoreTypes.Timestamp).toDate();
    }
    if (v instanceof Date) return v;
    return new Date();
  };
  return {
    uid: (map.uid as string) ?? '',
    email: (map.email as string) ?? '',
    displayName: (map.displayName as string | null) ?? null,
    nickname: (map.nickname as string | null) ?? null,
    photoURL: (map.photoURL as string | null) ?? null,
    provider: (map.provider as string | null) ?? null,
    handicap: map.handicap as number | undefined,
    defaultTee: (map.defaultTee as string | null) ?? null,
    termsAgreement: map.termsAgreement as Record<string, boolean> | null | undefined,
    createdAt: toDate(map.createdAt),
    updatedAt: toDate(map.updatedAt),
  };
}

export function userProfileToMap(profile: UserProfile): Record<string, unknown> {
  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    nickname: profile.nickname,
    photoURL: profile.photoURL,
    provider: profile.provider,
    handicap: profile.handicap,
    defaultTee: profile.defaultTee,
    termsAgreement: profile.termsAgreement,
    createdAt: firestore.Timestamp.fromDate(profile.createdAt),
    updatedAt: firestore.Timestamp.fromDate(profile.updatedAt),
  } as Record<string, unknown>;
}
